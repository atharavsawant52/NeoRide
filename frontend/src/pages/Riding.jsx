import React, { useEffect, useContext, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SocketContext } from '../context/SocketContext'
import LiveTracking from '../components/LiveTracking'
import axios from 'axios'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const Riding = () => {
  const location = useLocation()
  const ride = location.state?.ride ?? null
  const { socket } = useContext(SocketContext)
  const navigate = useNavigate()
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [localRide, setLocalRide] = useState(ride)

  useEffect(() => {
    if (!socket) return;
    const handleRideEnded = () => navigate('/home')
    socket.on('ride-ended', handleRideEnded)
    return () => socket.off('ride-ended', handleRideEnded)
  }, [socket, navigate])

  // ---------- SAFE API BASE ----------
  // Prefers Vite env var VITE_BASE_URL, else fallback to localhost:3000 (your server)
  const API_BASE =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BASE_URL) ||
    (typeof window !== 'undefined' && window.__API_BASE__) || // optional global override
    'http://localhost:3000'

  // ---------- safeFare helper ----------
  const safeFare = (f) => {
    if (f == null) return '—';
    if (typeof f === 'object') {
      if (f.total != null) return f.total;
      if (f.breakdown && typeof f.breakdown === 'object') {
        const val = Object.values(f.breakdown).find(v => typeof v === 'number' || typeof v === 'string');
        if (val != null) return val;
      }
      const firstVal = Object.values(f).find(v => typeof v === 'number' || typeof v === 'string');
      if (firstVal != null) return firstVal;
      return '—';
    }
    return f;
  };

  if (!ride) {
    return (
      <div className='h-screen flex flex-col items-center justify-center'>
        <p className='text-gray-600'>Ride data loading…</p>
        <Link to='/home' className='mt-4 text-blue-600 underline'>Back to Home</Link>
      </div>
    )
  }

  // ---------- Payment handler (direct axios) ----------
  const handleDummyPayment = async (method = 'cash') => {
    try {
      setLoadingPayment(true)

      const amountVal = Number(safeFare(localRide?.fare ?? ride?.fare)) || 0
      const token = localStorage.getItem('token') // adapt if auth stored elsewhere

      // build url: use API_BASE (no trailing slash) + route
      const url = `${API_BASE.replace(/\/$/, '')}/api/payment/dummy`

      console.log('Calling dummy payment url:', url, { rideId: localRide?._id ?? ride._id, amountVal, method })

      const { data } = await axios.post(
        url,
        {
          rideId: localRide?._id ?? ride._id,
          amount: amountVal,
          method
        },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : ''
          },
          timeout: 10000
        }
      )

      if (data?.success) {
        setLocalRide(data.ride)
        toast.success(`Payment successful — ${data.paymentId}`, { position: 'top-right', autoClose: 3000 })

        // emit socket so server can forward to captain
        if (socket) {
          socket.emit('payment-made', {
            rideId: data.ride._id,
            paymentId: data.paymentId,
            amount: amountVal,
            method
          })
        }

        // optional: navigate away after small delay
        // setTimeout(() => navigate('/home'), 1200)
      } else {
        toast.error('Payment failed: ' + (data?.message || 'Unknown'))
      }
    } catch (err) {
      console.error('dummy payment error', err)
      // Network error (server down / wrong port / CORS blocked)
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        toast.error('Network Error: Could not reach backend. Is server running on port 3000?', { autoClose: 5000 })
      } else if (err.response) {
        // backend responded with an error (401/400/500)
        const msg = err.response.data?.message || `${err.response.status} ${err.response.statusText}`
        toast.error('Server error: ' + msg, { autoClose: 5000 })
      } else {
        toast.error('Error: ' + (err.message || 'Unknown'), { autoClose: 5000 })
      }
    } finally {
      setLoadingPayment(false)
    }
  }

  const captainFirstName = localRide?.captain?.fullname?.firstname ?? localRide?.captain?.fullname ?? 'Captain'
  const vehiclePlate = localRide?.captain?.vehicle?.plate ?? localRide?.captain?.vehiclePlate ?? 'N/A'

  return (
    <div className='h-screen'>
      <ToastContainer />

      <Link to='/home' className='fixed right-2 top-2 h-10 w-10 bg-white flex items-center justify-center rounded-full'>
        <i className="text-lg font-medium ri-home-5-line"></i>
      </Link>

      <div className='h-1/2'>
        <LiveTracking />
      </div>

      <div className='h-1/2 p-4'>
        <div className='flex items-center justify-between'>
          <img className='h-12' src={localRide?.captain?.avatar ?? "https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg"} alt="" />
          <div className='text-right'>
            <h2 className='text-lg font-medium capitalize'>{captainFirstName}</h2>
            <h4 className='text-xl font-semibold -mt-1 -mb-1'>{vehiclePlate}</h4>
            <p className='text-sm text-gray-600'>{localRide?.captain?.vehicle?.model ?? 'Vehicle'}</p>
          </div>
        </div>

        <div className='flex gap-2 justify-between flex-col items-center'>
          <div className='w-full mt-5'>
            <div className='flex items-center gap-5 p-3 border-b-2'>
              <i className="text-lg ri-map-pin-2-fill"></i>
              <div>
                <h3 className='text-lg font-medium'>Destination</h3>
                <p className='text-sm -mt-1 text-gray-600'>{localRide?.destination ?? '—'}</p>
              </div>
            </div>

            <div className='flex items-center gap-5 p-3'>
              <i className="ri-currency-line"></i>
              <div>
                <h3 className='text-lg font-medium'>₹{safeFare(localRide?.fare ?? ride?.fare)}</h3>
                <p className='text-sm -mt-1 text-gray-600'>{localRide?.paymentMethod ?? 'Cash'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className='flex gap-2 mt-4'>
          <button
            onClick={() => handleDummyPayment('cash')}
            disabled={loadingPayment}
            className='flex-1 bg-green-600 text-white font-semibold p-2 rounded-lg'
          >
            {loadingPayment ? 'Processing…' : 'Pay by Cash (Dummy)'}
          </button>

          <button
            onClick={() => handleDummyPayment('online')}
            disabled={loadingPayment}
            className='flex-1 bg-blue-600 text-white font-semibold p-2 rounded-lg'
          >
            {loadingPayment ? 'Processing…' : 'Pay Online (Dummy)'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Riding
