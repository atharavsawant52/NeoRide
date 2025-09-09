import React, { useState, useContext } from 'react'
import axios from 'axios'
import { SocketContext } from '../context/SocketContext'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

/**
 * Enhanced PaymentCard
 * - Supports Cash (hand-to-captain) and Online (UPI / Card / QR) simulated flows
 * - Emits socket 'payment-made' with extra details (submethod)
 * - Calls backend dummy route: POST /api/payment/dummy
 *
 * Props:
 * - ride (object) required
 * - apiBase (optional) default: VITE_BASE_URL or http://localhost:3000
 * - onSuccess(paymentInfo) optional callback
 */
const PaymentCard = ({ ride, apiBase, onSuccess }) => {
  const { socket } = useContext(SocketContext)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('choose') // 'choose' | 'online-options' | 'card-form' | 'qr-view' | 'upi-view'
  const [onlineSubmethod, setOnlineSubmethod] = useState(null) // 'upi'|'card'|'qr'
  const [cardData, setCardData] = useState({ number: '', name: '', exp: '', cvv: '' })
  const [amountVisible] = useState(Number((ride?.fare?.total ?? ride?.fare ?? 0)) || 0)

  const API_BASE =
    apiBase ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BASE_URL) ||
    'http://localhost:3000'

  // helper to call backend dummy payment
  const callDummyPayment = async ({ method = 'cash', submethod = '', extra = {} } = {}) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token') || ''
      const payload = {
        rideId: ride._id,
        amount: amountVisible,
        method: method // 'cash' or 'online' (backend validation allows these)
      }
      // pass extra metadata as paymentDetails (backend may ignore but useful)
      if (submethod || Object.keys(extra).length) {
        payload.paymentDetails = { submethod, ...extra }
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
          submethod,
          timestamp: new Date().toISOString()
        }

        toast.success('Payment successful ✅', { autoClose: 2500 })
        onSuccess?.(res.data)

        // emit socket event for server to forward to captain
        socket?.emit('payment-made', {
          rideId: res.data.ride._id,
          paymentId: res.data.paymentId,
          amount: amountVisible,
          method,
          submethod,
          note:
            method === 'cash' && submethod === 'handed-to-captain'
              ? 'Passenger handed cash to captain'
              : `Paid via ${submethod || method}`
        })

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

    const r = await callDummyPayment({ method: 'cash', submethod: 'handed-to-captain' })
    if (r.ok) {
      // optionally change UI / close modal
    }
  }

  // ONLINE flows

  // UPI / QR generator helper (we'll use a public QR API that returns an image)
  const makeUpiString = (amount) => {
    // Mock merchant UPI id — change to your merchant or receiver
    const payeeVPA = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_UPI_ID) || 'merchant@upi'
    const payeeName = 'DemoMerchant'
    const tn = `RidePayment-${ride?._id ?? 'ride'}`
    // UPI deep link format (simple)
    return `upi://pay?pa=${encodeURIComponent(payeeVPA)}&pn=${encodeURIComponent(payeeName)}&tn=${encodeURIComponent(tn)}&am=${encodeURIComponent(amount)}&cu=INR`
  }

  const makeQrImageUrl = (data) => {
    // using public QR generator (qrserver)
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(data)}`
  }

  const handleChooseUPI = () => {
    setOnlineSubmethod('upi')
    setMode('upi-view')
  }

  const handleChooseQR = () => {
    setOnlineSubmethod('qr')
    setMode('qr-view')
  }

  const handleChooseCard = () => {
    setOnlineSubmethod('card')
    setMode('card-form')
  }

  // when user confirms they paid via UPI/QR after scanning
  const handleConfirmPaidViaQRorUPI = async () => {
    // In real world you'd verify on backend via gateway / webhook; here we simulate
    const submethod = onlineSubmethod === 'upi' ? 'upi' : 'qr'
    const r = await callDummyPayment({ method: 'online', submethod })
    if (r.ok) {
      // reset mode or show receipt
      setMode('choose')
    }
  }

  // Simulate card payment (simple confirm)
  const handleConfirmCardPayment = async () => {
    // Basic validation
    if (!cardData.number || !cardData.name) {
      alert('Enter card details (this is simulated).')
      return
    }
    // simulate processing
    const r = await callDummyPayment({ method: 'online', submethod: 'card', extra: { cardLast4: cardData.number.slice(-4) } })
    if (r.ok) setMode('choose')
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
          onClick={() => setMode('online-options')}
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

  const renderOnlineOptions = () => (
    <div>
      <h3 className="text-lg font-semibold mb-3">Pay Online — Choose method</h3>
      <div className="flex gap-2 mb-3">
        <button className="flex-1 bg-indigo-600 text-white p-2 rounded" onClick={handleChooseUPI}>UPI (QR)</button>
        <button className="flex-1 bg-sky-600 text-white p-2 rounded" onClick={handleChooseCard}>Card</button>
        <button className="flex-1 bg-purple-600 text-white p-2 rounded" onClick={handleChooseQR}>QR Link</button>
      </div>
      <button className="text-xs text-gray-500 underline" onClick={() => setMode('choose')}>← Back</button>
    </div>
  )

  const renderUpiView = () => {
    const upi = makeUpiString(amountVisible)
    const qrUrl = makeQrImageUrl(upi)
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3">UPI — Scan to pay</h3>
        <div className="mb-3">
          <img src={qrUrl} alt="UPI QR" className="mx-auto" />
        </div>
        <p className="text-sm text-gray-600 mb-2">Scan with your UPI app (Google Pay / PhonePe / BHIM). After paying, press "I Paid".</p>
        <div className="flex gap-2">
          <button className="flex-1 bg-green-600 text-white p-2 rounded" onClick={handleConfirmPaidViaQRorUPI} disabled={loading}>
            {loading ? 'Confirming…' : 'I Paid'}
          </button>
          <button className="flex-1 bg-gray-200 text-gray-800 p-2 rounded" onClick={() => setMode('online-options')}>Cancel</button>
        </div>
      </div>
    )
  }

  const renderQrView = () => {
    // QR could be a payment link (we reuse UPI string or a payment URL)
    const paymentLink = `https://pay.example.com/pay?ride=${ride._id}&amount=${amountVisible}` // mock
    const qrUrl = makeQrImageUrl(paymentLink)
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3">Scan QR to pay</h3>
        <div className="mb-3">
          <img src={qrUrl} alt="Payment QR" className="mx-auto" />
        </div>
        <p className="text-sm text-gray-600 mb-2">Scan QR with any app that supports links. After paying, tap "I Paid".</p>
        <div className="flex gap-2">
          <button className="flex-1 bg-green-600 text-white p-2 rounded" onClick={handleConfirmPaidViaQRorUPI} disabled={loading}>
            {loading ? 'Confirming…' : 'I Paid'}
          </button>
          <button className="flex-1 bg-gray-200 text-gray-800 p-2 rounded" onClick={() => setMode('online-options')}>Cancel</button>
        </div>
      </div>
    )
  }

  const renderCardForm = () => (
    <div>
      <h3 className="text-lg font-semibold mb-3">Card Payment (simulated)</h3>
      <div className="space-y-2 mb-3">
        <input
          className="w-full p-2 border rounded"
          placeholder="Card number (enter any digits)"
          value={cardData.number}
          onChange={(e) => setCardData(prev => ({ ...prev, number: e.target.value }))}
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="Name on card"
          value={cardData.name}
          onChange={(e) => setCardData(prev => ({ ...prev, name: e.target.value }))}
        />
        <div className="flex gap-2">
          <input
            className="flex-1 p-2 border rounded"
            placeholder="MM/YY"
            value={cardData.exp}
            onChange={(e) => setCardData(prev => ({ ...prev, exp: e.target.value }))}
          />
          <input
            className="w-24 p-2 border rounded"
            placeholder="CVV"
            value={cardData.cvv}
            onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 bg-green-600 text-white p-2 rounded" onClick={handleConfirmCardPayment} disabled={loading}>
          {loading ? 'Processing…' : 'Pay ₹' + amountVisible}
        </button>
        <button className="flex-1 bg-gray-200 text-gray-800 p-2 rounded" onClick={() => setMode('online-options')}>Cancel</button>
      </div>
    </div>
  )

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      {mode === 'choose' && renderChoose()}
      {mode === 'online-options' && renderOnlineOptions()}
      {mode === 'upi-view' && renderUpiView()}
      {mode === 'qr-view' && renderQrView()}
      {mode === 'card-form' && renderCardForm()}
    </div>
  )
}

export default PaymentCard
