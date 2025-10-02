// src/pages/CaptainProfileView.jsx
import React, { useContext } from 'react';
import { CaptainDataContext } from '../context/CapatainContext';
import { Link, useNavigate } from 'react-router-dom';

const InfoRow = ({ label, value }) => (
  <div className='flex items-center justify-between py-2 border-b'>
    <div className='text-gray-600 text-sm'>{label}</div>
    <div className='text-sm font-medium'>{value ?? '—'}</div>
  </div>
);

const CaptainProfileView = () => {
  const { captain } = useContext(CaptainDataContext);
  const navigate = useNavigate();

  if (!captain) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-gray-600'>Loading profile…</div>
      </div>
    );
  }

  const name = `${captain?.fullname?.firstname ?? ''} ${captain?.fullname?.lastname ?? ''}`.trim() || captain?.email;
  const vehicle = captain?.vehicle ?? {};

  return (
    <div className='min-h-screen bg-white'>
      <div className='fixed p-6 top-0 flex items-center justify-between w-screen z-40'>
        <img className='w-16' src='https://ik.imagekit.io/v88ozoebq/NeoRide/logo.png?updatedAt=1759382071512' alt='' />
        <div className='flex items-center gap-3'>
          <Link to='/captain-home' className=' h-10 px-4 bg-black text-white flex items-center justify-center rounded-full'>Back</Link>
        </div>
      </div>

      <div className='pt-24 p-6 max-w-xl mx-auto'>
        <div className='flex items-center gap-4'>
          {captain?.profilePic ? (
            <img src={captain.profilePic} alt='avatar' className='h-16 w-16 rounded-full object-cover' />
          ) : (
            <div className='h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl'>
              <i className='ri-user-2-line'></i>
            </div>
          )}
          <div>
            <div className='text-lg font-semibold'>{name}</div>
            <div className='text-xs text-gray-500'>{captain?.email}</div>
          </div>
        </div>

        <div className='mt-6 border rounded-lg p-4'>
          <div className='text-sm text-gray-800 font-semibold mb-2'>Personal</div>
          <InfoRow label='Phone' value={captain?.phone} />
        </div>

        <div className='mt-4 border rounded-lg p-4'>
          <div className='text-sm text-gray-800 font-semibold mb-2'>Vehicle</div>
          <InfoRow label='Type' value={vehicle?.vehicleType} />
          <InfoRow label='Color' value={vehicle?.color} />
          <InfoRow label='Plate' value={vehicle?.plate} />
          <InfoRow label='Capacity' value={vehicle?.capacity != null ? String(vehicle.capacity) : undefined} />
        </div>

        <div className='mt-6'>
          <button
            onClick={() => navigate('/captain-profile')}
            className='px-4 py-2 bg-black text-white rounded-lg'
          >
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaptainProfileView;
