// src/components/CaptainProfileMenu.jsx
import React, { useContext, useEffect, useRef, useState } from 'react';
import { CaptainDataContext } from '../context/CapatainContext';
import axios from 'axios';
import LogoutButton from './LogoutButton';
import { useNavigate } from 'react-router-dom';

const CaptainProfileMenu = ({ className = '' }) => {
  const { captain, setCaptain } = useContext(CaptainDataContext);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const ref = useRef(null);
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/captains/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.warn('captain stats fetch failed', err);
      }
    })();
  }, [open, API_BASE]);

  if (!captain) return null;

  const displayName = `${captain.fullname?.firstname ?? ''} ${captain.fullname?.lastname ?? ''}`.trim() || captain.email;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="h-10 w-10 bg-white rounded-full shadow-sm flex items-center justify-center overflow-hidden"
        aria-label="Captain profile"
      >
        {captain.profilePic ? (
          <img src={captain.profilePic} alt="avatar" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
            <i className="ri-user-2-line"></i>
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg z-50 p-4">
          <div className="flex items-center gap-3">
            {captain.profilePic ? (
              <img src={captain.profilePic} alt="avatar" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                <i className="ri-user-2-line"></i>
              </div>
            )}
            <div>
              <div className="font-semibold text-sm">{displayName}</div>
              <div className="text-xs text-gray-500">{captain.email}</div>
            </div>
          </div>

          <div className="mt-3 border-t pt-3 text-sm text-gray-700 space-y-1">
            <div><strong>Earnings:</strong> {stats?.earnings ? `₹${stats.earnings}` : '—'}</div>
            <div><strong>Hours:</strong> {stats?.hoursWorked ? `${stats.hoursWorked} hrs` : '—'}</div>
            <div><strong>Rides:</strong> {typeof stats?.ridesCount === 'number' ? stats.ridesCount : '—'}</div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={() => { setOpen(false); navigate('/captain-home'); }}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
            >
              Open Dashboard
            </button>

            <button
              onClick={() => { setOpen(false); navigate('/captain-profile-view'); }}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
            >
              View Profile
            </button>

            <button
              onClick={() => { setOpen(false); navigate('/captain-history'); }}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
            >
              History
            </button>

            <div className="pt-2">
              <LogoutButton role="captain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptainProfileMenu;
