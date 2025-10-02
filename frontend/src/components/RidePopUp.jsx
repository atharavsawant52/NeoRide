// src/components/RidePopUp.jsx
import React from 'react';

const RidePopUp = (props) => {
  const ride = props.ride ?? {};
  const user = ride.user ?? {};
  console.log("RidePopUp user profilePic:", user.profilePic);
  const fullnameObj = user.fullname ?? user.name ?? {};
  const userName = typeof fullnameObj === 'object'
    ? `${fullnameObj.firstname ?? fullnameObj.firstName ?? ''} ${fullnameObj.lastname ?? fullnameObj.lastName ?? ''}`.trim()
    : String(fullnameObj || user.email || 'Passenger');

  // fare could be number or object { breakdown, total }
  const fareVal = (() => {
    if (!ride.fare) return '—';
    if (typeof ride.fare === 'number' || typeof ride.fare === 'string') return ride.fare;
    if (typeof ride.fare === 'object') return ride.fare.total ?? ride.fare.amount ?? JSON.stringify(ride.fare);
    return '—';
  })();

  const pickup = ride.pickup ?? 'Unknown pickup';
  const destination = ride.destination ?? 'Unknown destination';
  const distance = ride.distance ? `${(ride.distance / 1000).toFixed(2)} KM` : (ride.estimatedDistance ? ride.estimatedDistance : '—');

  const handleAccept = () => {
    // call confirmRide passed from parent (should handle API and UI)
    try {
      if (typeof props.confirmRide === 'function') props.confirmRide();
      // Parent will toggle confirm popup based on ride.status
    } catch (err) {
      console.error('accept error', err);
    }
  };

  return (
    <div className="p-3">
      <h5 className='p-1 text-center w-[93%] absolute top-0' onClick={() => {
        if (typeof props.setRidePopupPanel === 'function') props.setRidePopupPanel(false)
      }}>
        <i className="text-3xl text-gray-400 ri-arrow-down-wide-line"></i>
      </h5>

      <h3 className='text-2xl font-semibold mb-5 mt-8'>New Ride Available!</h3>

      <div className='flex items-center justify-between p-3 bg-yellow-400 rounded-lg mt-2'>
        <div className='flex items-center gap-3'>
          <img
            className='h-12 w-12 rounded-full object-cover'
            src={user.profilePic || user.photoUrl || 'https://i.pinimg.com/236x/af/26/28/af26280b0ca305be47df0b799ed1b12b.jpg'}
            alt={userName}
          />
          <h2 className='text-lg font-medium'>{userName}</h2>
        </div>
        <h5 className='text-lg font-semibold'>{distance}</h5>
      </div>

      <div className='flex gap-2 justify-between flex-col items-center mt-4'>
        <div className='w-full mt-2'>
          <div className='flex items-center gap-5 p-3 border-b-2'>
            <i className="ri-map-pin-user-fill text-xl"></i>
            <div>
              <h3 className='text-lg font-medium truncate'>{pickup}</h3>
              <p className='text-sm -mt-1 text-gray-600 truncate'>{pickup}</p>
            </div>
          </div>

          <div className='flex items-center gap-5 p-3 border-b-2'>
            <i className="text-lg ri-map-pin-2-fill"></i>
            <div>
              <h3 className='text-lg font-medium truncate'>{destination}</h3>
              <p className='text-sm -mt-1 text-gray-600 truncate'>{destination}</p>
            </div>
          </div>

          <div className='flex items-center gap-5 p-3'>
            <i className="ri-currency-line text-xl"></i>
            <div>
              <h3 className='text-lg font-medium'>₹{fareVal}</h3>
              <p className='text-sm -mt-1 text-gray-600'>{ride.paymentMethod ?? 'Cash'}</p>
            </div>
          </div>
        </div>

        <div className='mt-5 w-full'>
          <button
            onClick={handleAccept}
            className='bg-green-600 w-full text-white font-semibold p-2 px-10 rounded-lg'
          >
            Accept
          </button>

          <button
            onClick={() => {
              if (typeof props.setRidePopupPanel === 'function') props.setRidePopupPanel(false)
            }}
            className='mt-2 w-full bg-gray-300 text-gray-700 font-semibold p-2 px-10 rounded-lg'
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  )
}

export default RidePopUp;
