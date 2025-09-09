// src/components/LookingForDriver.jsx
import React from 'react'

const LookingForDriver = (props) => {
  const pickup = props.pickup ?? 'Unknown pickup'
  const destination = props.destination ?? 'Unknown destination'
  const vehicleType = props.vehicleType ?? 'default'

  // Fare can be number, object with keys, or nested { total: X } etc.
  const fareVal = (() => {
    if (!props.fare) return '—'
    if (typeof props.fare === 'number' || typeof props.fare === 'string') return props.fare
    // if it's an object, try common shapes
    if (typeof props.fare === 'object') {
      // case: fare = { small: 100, sedan: 150 }
      if (vehicleType && props.fare[vehicleType] != null) return props.fare[vehicleType]
      // case: fare = { total: 120 } or { amount: 120 }
      if (props.fare.total != null) return props.fare.total
      if (props.fare.amount != null) return props.fare.amount
      // last resort: stringify (unlikely)
      return JSON.stringify(props.fare)
    }
    return '—'
  })()

  return (
    <div className="p-3">
      <h5 className='p-1 text-center w-[93%] absolute top-0' onClick={() => {
        if (typeof props.setVehicleFound === 'function') props.setVehicleFound(false)
      }}>
        <i className="text-3xl text-gray-400 ri-arrow-down-wide-line"></i>
      </h5>

      <h3 className='text-2xl font-semibold mb-3 mt-8'>Looking for a Driver</h3>

      <div className='flex gap-2 justify-between flex-col items-center'>
        <img
          className='h-24 w-48 object-cover rounded-md'
          src={props.vehicleImage ?? 'https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg'}
          alt="searching vehicle"
        />

        <div className='w-full mt-4'>
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
              <p className='text-sm -mt-1 text-gray-600'>Searching for drivers — ETA: finding...</p>
            </div>
          </div>
        </div>

        <div className="w-full mt-4 flex gap-3">
          <button
            onClick={() => {
              if (typeof props.createRide === 'function') {
                // optionally call createRide again (retry)
                props.createRide()
              }
            }}
            className="flex-1 bg-black text-white px-4 py-2 rounded-lg"
          >
            Retry search
          </button>

          <button
            onClick={() => {
              if (typeof props.setVehicleFound === 'function') props.setVehicleFound(false)
            }}
            className="flex-1 border border-gray-300 px-4 py-2 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default LookingForDriver
