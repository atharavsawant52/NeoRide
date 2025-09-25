import React, { useState, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { SocketContext } from '../context/SocketContext'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import dayjs from 'dayjs' // optional - install if you want nicer formatting

const FinishRide = (props) => {
  const navigate = useNavigate()
  const { socket } = useContext(SocketContext)
  const ride = props?.ride ?? null
  const paymentInfo = props?.paymentInfo ?? null

  const [acknowledged, setAcknowledged] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ackLoading, setAckLoading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(paymentInfo ? 'paid' : 'pending')
  const [paymentMethod, setPaymentMethod] = useState(paymentInfo?.method || ride?.paymentMethod || 'cash')

  // Safe API base (Vite or default)
  const API_BASE =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BASE_URL) ||
    (typeof window !== 'undefined' && window.__API_BASE__) ||
    'http://localhost:3000'

  // Safe helper to format fare
  const formatFare = (f) => {
    if (f == null) return '—'
    if (typeof f === 'object') return f.total ?? Object.values(f)[0] ?? '—'
    return f
  }

  // Format timestamp nicely
  const formatTime = (ts) => {
    try {
      if (!ts) return ''
      return dayjs ? dayjs(ts).format('DD MMM, HH:mm') : new Date(ts).toLocaleString()
    } catch {
      return ts
    }
  }

  // Listen for real-time payment status changes
  useEffect(() => {
    if (!socket) return
    const handler = (data) => {
      if (!data || !data.rideId || String(data.rideId) !== String(ride?._id)) return
      setPaymentStatus(data.status || 'pending')
      if (data.method) setPaymentMethod(data.method)
      // If it's online and server says paid, no need for acknowledge
      if (data.method !== 'cash' && data.status === 'paid') {
        setAcknowledged(true)
      }
    }
    socket.on('payment-status-changed', handler)
    return () => socket.off('payment-status-changed', handler)
  }, [socket, ride?._id])

  // If parent provided paymentInfo (e.g., ride-paid), reflect it locally
  useEffect(() => {
    if (paymentInfo) {
      setPaymentStatus('paid')
      if (paymentInfo.method) setPaymentMethod(paymentInfo.method)
      if (paymentInfo.method !== 'cash') setAcknowledged(true)
    }
  }, [paymentInfo])

  // Fetch ride on mount to avoid missing earlier events
  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        if (!ride?._id) return
        const token = localStorage.getItem('token') || ''
        const res = await axios.get(
          `${API_BASE.replace(/\/$/, '')}/rides/${ride._id}`,
          { headers: { Authorization: token ? `Bearer ${token}` : '' }, timeout: 8000 }
        )
        const r = res?.data
        if (!r || cancel) return
        if (r.paymentStatus) setPaymentStatus(r.paymentStatus)
        if (r.paymentMethod) setPaymentMethod(r.paymentMethod)
        // If already paid online, auto-ack
        if (r.paymentStatus === 'paid' && r.paymentMethod !== 'cash') setAcknowledged(true)
        // If paid cash and event log shows cash_acknowledged, mark acknowledged
        if (Array.isArray(r.paymentEvents)) {
          const cashAck = r.paymentEvents.find(e => e?.type === 'cash_acknowledged')
          if (cashAck) setAcknowledged(true)
        }
      } catch (e) {
        // silently ignore; UI will rely on socket or manual flow
      }
    })()
    return () => { cancel = true }
  }, [ride?._id])

  // Acknowledge payment: emit socket + optional server call
  const acknowledgePayment = async () => {
    if (!paymentInfo) return
    try {
      setAckLoading(true)
      // 1) emit socket event so server (and maybe passenger) knows captain acknowledged
      if (socket) {
        socket.emit('payment-acknowledged', {
          rideId: ride?._id,
          paymentId: paymentInfo.paymentId,
          captainSocketId: socket.id
        })
      }

      // 2) optional: inform backend to persist ack (endpoint: POST /rides/ack-payment)
      // If you don't have this endpoint, the try/catch will fail silently and we still proceed.
      try {
        const token = localStorage.getItem('token') || ''
        await axios.post(
          `${API_BASE.replace(/\/$/, '')}/rides/ack-payment`,
          {
            rideId: ride?._id,
            paymentId: paymentInfo.paymentId
          },
          {
            headers: { Authorization: token ? `Bearer ${token}` : '' },
            timeout: 8000
          }
        )
      } catch (err) {
        // it's optional; log but don't block ack UX
        console.warn('ack persist API failed (optional):', err?.response?.data || err.message)
      }

      setAcknowledged(true)
      toast.success('Payment acknowledged', { autoClose: 2500 })
      setPaymentStatus('paid')
    } catch (err) {
      console.error('acknowledgePayment error', err)
      toast.error('Could not acknowledge payment', { autoClose: 3500 })
    } finally {
      setAckLoading(false)
    }
  }

  const canFinish = paymentStatus === 'paid' && (paymentMethod !== 'cash' ? true : acknowledged)

  async function endRide() {
    if (!ride?._id) {
      toast.error('Ride not available')
      return
    }

    if (!canFinish) {
      toast.error('Payment not completed yet')
      return
    }

    try {
      setLoading(true)

      // prepare body; include paymentInfo if present so backend can store it or verify
      const body = { rideId: ride._id }
      if (paymentInfo) {
        body.payment = {
          paymentId: paymentInfo.paymentId,
          amount: paymentInfo.amount,
          method: paymentInfo.method,
          timestamp: paymentInfo.timestamp || new Date().toISOString()
        }
      }

      const token = localStorage.getItem('token') || ''
      const response = await axios.post(
        `${API_BASE.replace(/\/$/, '')}/rides/end-ride`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeout: 10000
        }
      )

      if (response.status === 200) {
        props.setFinishRidePanel?.(false)
        toast.success('Ride finished', { autoClose: 1200 })
        navigate('/captain-home')
      } else {
        console.warn('endRide unexpected response', response)
        toast.error('Could not finish ride — check console')
      }
    } catch (err) {
      console.error('endRide error:', err.response ?? err)
      toast.error(err.response?.data?.message || 'Finish ride failed — see console', { autoClose: 4000 })
    } finally {
      setLoading(false)
    }
  }

  // If ride isn't ready, show safe placeholder
  if (!ride) {
    return (
      <div>
        <ToastContainer />
        <h5 className='p-1 text-center w-[93%] absolute top-0' onClick={() => props.setFinishRidePanel?.(false)}>
          <i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i>
        </h5>
        <h3 className='text-2xl font-semibold mb-5'>Finish this Ride</h3>
        <div className='p-6'>
          <p>Ride data not loaded yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ToastContainer />
      <h5 className='p-1 text-center w-[93%] absolute top-0' onClick={() => { props.setFinishRidePanel?.(false) }}>
        <i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i>
      </h5>

      <h3 className='text-2xl font-semibold mb-5'>Finish this Ride</h3>

      {/* --- PAYMENT INFO BANNER (if any) --- */}
      {(paymentInfo || paymentStatus === 'paid') && (
        <div className='mb-4 p-4 rounded-lg border border-green-200 bg-green-50'>
          <div className='flex items-start justify-between'>
            <div>
              <h4 className='font-semibold text-green-800'>Payment received</h4>
              <p className='text-sm text-gray-700 mt-1'>
                Amount: <span className='font-medium'>₹{paymentInfo?.amount ?? ride?.fare?.total ?? '—'}</span>
                {' '} • Method: <span className='font-medium'>{(paymentInfo?.method || paymentMethod || '—')}</span>
              </p>
              <p className='text-xs text-gray-500 mt-1'>
                Payment ID: <span className='font-mono text-xs'>{paymentInfo?.paymentId ?? ride?.paymentID ?? '—'}</span>
              </p>
              {(paymentInfo?.timestamp || ride?.paymentConfirmedAt) && (
                <p className='text-xs text-gray-400 mt-1'>At {formatTime(paymentInfo?.timestamp || ride?.paymentConfirmedAt)}</p>
              )}
            </div>

            <div className='flex flex-col items-end gap-2'>
              {paymentMethod === 'cash' && !acknowledged ? (
                <button
                  onClick={acknowledgePayment}
                  disabled={ackLoading}
                  className='px-3 py-1 bg-green-600 text-white rounded-md text-sm'
                >
                  {ackLoading ? 'Acknowledging…' : 'Acknowledge'}
                </button>
              ) : (
                <span className='text-sm text-green-700 font-medium'>Acknowledged</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className='flex items-center justify-between p-4 border-2 border-yellow-400 rounded-lg mt-4'>
        <div className='flex items-center gap-3 '>
          <img className='h-12 rounded-full object-cover w-12' src={ride?.user?.profilePic ?? "https://i.pinimg.com/236x/af/26/28/af26280b0ca305be47df0b799ed1b12b.jpg"} alt="" />
          <h2 className='text-lg font-medium'>{ride?.user?.fullname?.firstname ?? ride?.user?.fullname ?? 'Rider'}</h2>
        </div>
        <h5 className='text-lg font-semibold'>2.2 KM</h5>
      </div>

      <div className='flex gap-2 justify-between flex-col items-center'>
        <div className='w-full mt-5'>
          <div className='flex items-center gap-5 p-3 border-b-2'>
            <i className="ri-map-pin-user-fill"></i>
            <div>
              <h3 className='text-lg font-medium'>Pickup</h3>
              <p className='text-sm -mt-1 text-gray-600'>{ride?.pickup ?? '—'}</p>
            </div>
          </div>

          <div className='flex items-center gap-5 p-3 border-b-2'>
            <i className="text-lg ri-map-pin-2-fill"></i>
            <div>
              <h3 className='text-lg font-medium'>Destination</h3>
              <p className='text-sm -mt-1 text-gray-600'>{ride?.destination ?? '—'}</p>
            </div>
          </div>

          <div className='flex items-center gap-5 p-3'>
            <i className="ri-currency-line"></i>
            <div>
              <h3 className='text-lg font-medium'>₹{formatFare(ride?.fare)}</h3>
              <p className='text-sm -mt-1 text-gray-600'>{ride?.paymentMethod ?? 'Cash'}</p>
            </div>
          </div>
        </div>

        <div className='mt-10 w-full'>
          <button
            onClick={endRide}
            disabled={loading || !canFinish}
            className={`w-full mt-5 flex text-lg justify-center ${canFinish ? 'bg-green-600' : 'bg-black opacity-60 cursor-not-allowed'} text-white font-semibold p-3 rounded-lg`}
          >
            {loading ? 'Finishing…' : (canFinish ? 'Finish Ride' : 'Waiting for Payment')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FinishRide
