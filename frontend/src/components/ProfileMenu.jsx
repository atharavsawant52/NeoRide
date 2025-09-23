// src/components/ProfileMenu.jsx
import React, { useContext, useEffect, useRef, useState } from 'react';
import { UserDataContext } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LogoutButton from './LogoutButton';

const ProfileMenu = ({ role = 'user', className = '' }) => {
  const { user, setUser } = useContext(UserDataContext);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const goToProfile = () => {
    setOpen(false);
    if (role === 'captain') navigate('/captain-profile');
    else navigate('/profile');
  };

  if (!user) {
    return (
      <div className={`relative ${className}`}>
        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
          <i className="ri-user-2-line"></i>
        </div>
      </div>
    );
  }

  const displayName = user.name ?? `${user.fullname?.firstname ?? ''} ${user.fullname?.lastname ?? ''}`.trim() ?? user.email;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="h-10 w-10 bg-white rounded-full shadow-sm flex items-center justify-center overflow-hidden"
        title={displayName}
        aria-label="User profile"
      >
        {user.profilePic ? (
          <img src={user.profilePic} alt="avatar" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <i className="ri-user-2-line text-lg"></i>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg z-50 p-4">
          <div className="flex items-center gap-3">
            {user.profilePic ? (
              <img src={user.profilePic} alt="avatar" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                <i className="ri-user-2-line"></i>
              </div>
            )}
            <div>
              <div className="font-semibold text-sm">{displayName}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
          </div>

          <div className="mt-3 border-t pt-3 text-sm text-gray-700 space-y-1">
            <div><strong>Type:</strong> {user.type ?? role}</div>
            {user.phone && <div><strong>Phone:</strong> {user.phone}</div>}
            {user.vehicle && <div><strong>Vehicle:</strong> {user.vehicle}</div>}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <button onClick={goToProfile} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm">View Profile</button>
            <button onClick={() => { setOpen(false); navigate('/help'); }} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm">Help & Support</button>
            <button onClick={() => { setOpen(false); navigate('/history'); }} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm">History</button>
            <div className="pt-2">
              <LogoutButton role={role} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
