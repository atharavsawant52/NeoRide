import React, { useState, useContext } from 'react'
import axios from 'axios'
import { SocketContext } from '../context/SocketContext'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

/**
 * Enhanced PaymentCard
 * - Supports Cash (hand-to-captain) and Online via Razorpay (test mode)
 * - Online flow: create Razorpay order on backend, open checkout, verify on backend
 *
 * Props:
 * - ride (object) required
 * - apiBase (optional) default: VITE_BASE_URL or http://localhost:3000
 * - onSuccess(paymentInfo) optional callback
 */
const PaymentCard = ({ ride, apiBase, onSuccess }) => {
  const { socket } = useContext(SocketContext)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('choose') // 'choose'
  const [amountVisible] = useState(Number((ride?.fare?.total ?? ride?.fare ?? 0)) || 0)

  const API_BASE =
    apiBase ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BASE_URL) ||
    'http://localhost:3000'

  // helper to call backend dummy payment (kept for cash acknowledge dev flow)
  const callDummyPayment = async ({ method = 'cash' } = {}) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token') || ''
      const payload = {
        rideId: ride._id,
        amount: amountVisible,
        method: method // 'cash' or 'online'
      }

      const res = await axios.post(
        `${API_BASE.replace(/\/$/, '')}/api/payment/dummy`,
        payload,
        { headers: { Authorization: token ? `Bearer ${token}` : '' }, timeout: 10000 }
      )

      if (res.data?.success) {
        const paymentInfo = {
          paymentId: res.data.paymentId,
          amount: amountVisible,
          method,
          timestamp: new Date().toISOString()
        }

        toast.success('Payment successful ✅', { autoClose: 2500 })
        onSuccess?.(res.data)

        return { ok: true, paymentInfo, ride: res.data.ride }
      } else {
        toast.error('Payment failed: ' + (res.data?.message || 'Unknown'))
        return { ok: false }
      }
    } catch (err) {
      console.error('callDummyPayment error', err)
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        toast.error('Network Error: Could not reach backend', { autoClose: 4000 })
      } else {
        toast.error('Payment error: ' + (err?.response?.data?.message || err.message || 'Unknown'))
      }
      return { ok: false }
    } finally {
      setLoading(false)
    }
  }

  // CASH flow: passenger hands cash to captain physically
  const handlePayCash = async () => {
    // Confirm with user
    const ok = window.confirm(`Confirm: You gave ₹${amountVisible} cash to the captain?`)
    if (!ok) return

    const r = await callDummyPayment({ method: 'cash' })
    if (r.ok) {
      // optionally change UI / close modal
    }
  }

  // Load Razorpay script
  const loadRazorpay = () => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.Razorpay) return resolve(true)
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => reject(new Error('Failed to load Razorpay'))
      document.body.appendChild(script)
    })
  }

  // Online via Razorpay
  const handlePayOnline = async () => {
    try {
      setLoading(true)
      await loadRazorpay()

      const token = localStorage.getItem('token') || ''
      // Create order on backend
      const orderRes = await axios.post(
        `${API_BASE.replace(/\/$/, '')}/api/payment/order`,
        { rideId: ride._id, currency: 'INR' },
        { headers: { Authorization: token ? `Bearer ${token}` : '' }, timeout: 10000 }
      )
      if (!orderRes.data?.success) throw new Error(orderRes.data?.message || 'Could not create order')

      const { key, order } = orderRes.data
      const options = {
        key,
        amount: order.amount, // in paise
        currency: order.currency,
        name: 'NeoRide',
        description: `Ride Payment #${ride._id}`,
        order_id: order.id,
        theme: { color: '#0ea5e9' },
        handler: async function (response) {
          try {
            const verifyRes = await axios.post(
              `${API_BASE.replace(/\/$/, '')}/api/payment/verify`,
              {
                rideId: ride._id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              },
              { headers: { Authorization: token ? `Bearer ${token}` : '' }, timeout: 10000 }
            )
            if (verifyRes.data?.success) {
              toast.success('Payment successful ✅', { autoClose: 2500 })
              onSuccess?.(verifyRes.data)
            } else {
              toast.error('Verification failed: ' + (verifyRes.data?.message || 'Unknown'))
            }
          } catch (e) {
            console.error('verify error', e)
            toast.error('Payment verification failed')
          }
        },
        modal: {
          ondismiss: function () {
            toast.info('Payment cancelled')
          }
        },
        prefill: {},
        notes: { rideId: String(ride._id) },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error('handlePayOnline error', err)
      toast.error(err?.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  // UI pieces
  const renderChoose = () => (
    <div>
      <h3 className="text-lg font-semibold mb-3">Payment</h3>
      <div className="mb-3">
        <div className="text-sm text-gray-600">Amount</div>
        <div className="text-2xl font-bold">₹{amountVisible}</div>
      </div>

      <div className="flex gap-2">
        <button
          className="flex-1 bg-green-600 text-white p-2 rounded"
          onClick={handlePayCash}
          disabled={loading}
        >
          {loading ? 'Processing…' : 'I Gave Cash to Captain'}
        </button>

        <button
          className="flex-1 bg-blue-600 text-white p-2 rounded"
          onClick={handlePayOnline}
          disabled={loading}
        >
          {loading ? 'Processing…' : 'Pay Online'}
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Cash: hand cash to captain and confirm. Online: UPI / Card / QR simulated flows.
      </div>
    </div>
  )

  const renderOnlineButton = () => (
    <div>
      <h3 className="text-lg font-semibold mb-3">Pay Online</h3>
      <button className="w-full bg-blue-600 text-white p-2 rounded" onClick={handlePayOnline} disabled={loading}>
        {loading ? 'Processing…' : `Pay ₹${amountVisible}`}
      </button>
      <button className="text-xs text-gray-500 underline mt-2" onClick={() => setMode('choose')}>← Back</button>
    </div>
  )

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      {mode === 'choose' && renderChoose()}
      {mode === 'online' && renderOnlineButton()}
    </div>
  )
}

export default PaymentCard
