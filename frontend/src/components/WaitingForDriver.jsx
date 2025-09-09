// src/components/WaitingForDriver.jsx
import React from 'react'

const WaitingForDriver = (props) => {
  const ride = props.ride ?? {}

  // Safe getters with fallbacks for different backend shapes
  const captain = ride.captain ?? {}
  const fullnameObj = captain.fullname ?? captain.name ?? {}
  const captainName = typeof fullnameObj === 'object'
    ? `${fullnameObj.firstname ?? fullnameObj.firstName ?? ''} ${fullnameObj.lastname ?? fullnameObj.lastName ?? ''}`.trim()
    : String(fullnameObj || 'Captain')

  const vehiclePlate = captain?.vehicle?.plate ?? captain?.vehiclePlate ?? 'N/A'
  const vehicleModel = captain?.vehicle?.model ?? 'Vehicle'
  const otp = ride?.otp ?? ride?.otpCode ?? '—'
  const fareVal = (() => {
    if (!ride?.fare) return '—'
    if (typeof ride.fare === 'object') return ride.fare.total ?? ride.fare.amount ?? JSON.stringify(ride.fare)
    return ride.fare
  })()
  const paymentMethod = ride?.paymentMethod ?? ride?.payment ?? 'Cash'

  const pickup = ride?.pickup ?? 'Unknown pickup'
  const destination = ride?.destination ?? 'Unknown destination'

  return (
    <div className="p-3">
      <h5 className='p-1 text-center w-[93%] absolute top-0' onClick={() => {
        // fix: call the setter passed from parent
        if (typeof props.setWaitingForDriver === 'function') props.setWaitingForDriver(false)
      }}>
        <i className="text-3xl text-gray-400 ri-arrow-down-wide-line"></i>
      </h5>

      <div className='flex items-center justify-between gap-4 mt-8'>
        <img
          className='h-16 w-16 rounded-md object-cover'
          src={captain?.avatar ?? captain?.photoUrl ?? 'https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg'}
          alt={captainName}
        />
        <div className='flex-1 text-left'>
          <h2 className='text-lg font-medium capitalize'>{captainName || 'Captain'}</h2>
          <h4 className='text-sm font-semibold -mt-1 -mb-1'>{vehiclePlate}</h4>
          <p className='text-sm text-gray-600'>{vehicleModel}</p>
        </div>

        <div className='text-center'>
          <h1 className='text-xl font-semibold'>{otp}</h1>
          <p className='text-xs text-gray-500'>OTP</p>
        </div>
      </div>

      <div className='flex gap-2 justify-between flex-col items-center mt-6'>
        <div className='w-full'>
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
              <p className='text-sm -mt-1 text-gray-600'>{paymentMethod}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WaitingForDriver
