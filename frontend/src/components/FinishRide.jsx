import React from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const FinishRide = (props) => {
  const navigate = useNavigate()
  const ride = props?.ride ?? null

  // Safe helper to format fare
  const formatFare = (f) => {
    if (f == null) return '—'
    if (typeof f === 'object') return f.total ?? Object.values(f)[0] ?? '—'
    return f
  }

  async function endRide() {
    if (!ride?._id) {
      alert('Ride not available')
      return
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/rides/end-ride`,
        { rideId: ride._id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )

      if (response.status === 200) {
        props.setFinishRidePanel?.(false)
        navigate('/captain-home')
      } else {
        console.warn('endRide unexpected response', response)
        alert('Could not finish ride — check console')
      }
    } catch (err) {
      console.error('endRide error:', err.response ?? err)
      alert(err.response?.data?.message || 'Finish ride failed — see console')
    }
  }

  // If ride isn't ready, show safe placeholder
  if (!ride) {
    return (
      <div>
        <h5 className='p-1 text-center w-[93%] absolute top-0' onClick={() => props.setFinishRidePanel?.(false)}>
          <i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i>
        </h5>
        <h3 className='text-2xl font-semibold mb-5'>Finish this Ride</h3>
        <div className='p-6'>
          <p>Ride data not loaded yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h5 className='p-1 text-center w-[93%] absolute top-0' onClick={() => { props.setFinishRidePanel?.(false) }}>
        <i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i>
      </h5>

      <h3 className='text-2xl font-semibold mb-5'>Finish this Ride</h3>

      <div className='flex items-center justify-between p-4 border-2 border-yellow-400 rounded-lg mt-4'>
        <div className='flex items-center gap-3 '>
          <img className='h-12 rounded-full object-cover w-12' src={ride?.user?.avatar ?? "https://i.pinimg.com/236x/af/26/28/af26280b0ca305be47df0b799ed1b12b.jpg"} alt="" />
          <h2 className='text-lg font-medium'>{ride?.user?.fullname?.firstname ?? ride?.user?.fullname ?? 'Rider'}</h2>
        </div>
        <h5 className='text-lg font-semibold'>2.2 KM</h5>
      </div>

      <div className='flex gap-2 justify-between flex-col items-center'>
        <div className='w-full mt-5'>
          <div className='flex items-center gap-5 p-3 border-b-2'>
            <i className="ri-map-pin-user-fill"></i>
            <div>
              <h3 className='text-lg font-medium'>Pickup</h3>
              <p className='text-sm -mt-1 text-gray-600'>{ride?.pickup ?? '—'}</p>
            </div>
          </div>

          <div className='flex items-center gap-5 p-3 border-b-2'>
            <i className="text-lg ri-map-pin-2-fill"></i>
            <div>
              <h3 className='text-lg font-medium'>Destination</h3>
              <p className='text-sm -mt-1 text-gray-600'>{ride?.destination ?? '—'}</p>
            </div>
          </div>

          <div className='flex items-center gap-5 p-3'>
            <i className="ri-currency-line"></i>
            <div>
              <h3 className='text-lg font-medium'>₹{formatFare(ride?.fare)}</h3>
              <p className='text-sm -mt-1 text-gray-600'>Cash</p>
            </div>
          </div>
        </div>

        <div className='mt-10 w-full'>
          <button
            onClick={endRide}
            className='w-full mt-5 flex text-lg justify-center bg-green-600 text-white font-semibold p-3 rounded-lg'
          >
            Finish Ride
          </button>
        </div>
      </div>
    </div>
  )
}

export default FinishRide
