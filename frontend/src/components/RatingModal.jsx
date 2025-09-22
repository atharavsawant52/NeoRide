import React, { useState } from 'react'
import axios from 'axios'

const RatingModal = ({ rideId, open, onClose, onSubmitted }) => {
  const [rating, setRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const API_BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || ''

  if (!open) return null

  const submit = async () => {
    if (!rideId) return onClose?.()
    try {
      setSubmitting(true)
      await axios.post(
        `${API_BASE}/rides/rate`,
        { rideId, rating: Number(rating) },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      )
      onSubmitted?.(Number(rating))
    } catch (e) {
      console.error('submit rating error', e?.response ?? e)
      alert('Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='bg-white rounded-xl p-6 w-80'>
        <h3 className='text-lg font-semibold mb-4'>Rate your captain</h3>
        <div className='flex items-center justify-between mb-4'>
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className={`text-2xl ${n <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
              aria-label={`Rate ${n}`}
            >
              ★
            </button>
          ))}
        </div>
        <div className='flex gap-3 justify-end'>
          <button className='px-3 py-2 rounded-md bg-gray-200' onClick={onClose} disabled={submitting}>Later</button>
          <button className='px-3 py-2 rounded-md bg-black text-white' onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
        </div>
      </div>
    </div>
  )
}

export default RatingModal
