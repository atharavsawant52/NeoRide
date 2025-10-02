// src/pages/CaptainHistory.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const CaptainHistory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_BASE_URL ?? '').replace(/\/$/, '');

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        // Attempt a few likely endpoints; gracefully fallback if not available
        const tryEndpoints = [
          `${API_BASE}/rides/captain/history?status=completed`,
          `${API_BASE}/captains/history?status=completed`,
          `${API_BASE}/rides?scope=captain&status=completed`,
        ];
        let data = [];
        for (const url of tryEndpoints) {
          try {
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
            if (res?.data) { data = res.data.rides ?? res.data; break; }
          } catch (e) {
            // try next
          }
        }
        // ensure only completed rides shown, even if backend ignored filter
        const onlyCompleted = Array.isArray(data) ? data.filter(r => r?.status === 'completed') : [];
        if (!cancel) setItems(onlyCompleted);
      } catch (e) {
        if (!cancel) setError('Unable to load history');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [API_BASE]);

  return (
    <div className="min-h-screen bg-white">
      <div className='fixed p-6 top-0 flex items-center justify-between w-screen z-40'>
        <img className='w-16' src="https://ik.imagekit.io/v88ozoebq/NeoRide/logo.png?updatedAt=1759382071512" alt="" />
        <div className='flex items-center gap-3'>
          <Link to='/captain-home' className=' h-10 px-4 bg-black text-white flex items-center justify-center rounded-full'>Back</Link>
        </div>
      </div>

      <div className='pt-24 p-6 max-w-2xl mx-auto'>
        <h2 className='text-2xl font-semibold mb-4'>Completed rides</h2>
        {loading && <div className='text-gray-600'>Loading…</div>}
        {error && <div className='text-red-600'>{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className='text-gray-600'>No rides yet.</div>
        )}
        <div className='space-y-3'>
          {items.map((ride) => (
            <div key={ride._id} className='border rounded-lg p-3 flex items-center justify-between'>
              <div>
                <div className='font-medium'>{ride?.pickup} → {ride?.destination}</div>
                <div className='text-xs text-gray-600'>
                  {ride?.status || 'completed'} • {ride?.vehicleType || ride?.vehicle?.vehicleType || '—'}
                </div>
              </div>
              <div className='text-right'>
                <div className='text-sm font-semibold'>
                  {ride?.fare?.total != null ? `₹${ride.fare.total}` : '—'}
                </div>
                {ride?.rating != null && (
                  <div className='text-xs text-gray-600'>Rating: {ride.rating}/5</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CaptainHistory;
