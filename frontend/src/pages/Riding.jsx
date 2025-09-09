import React, { useEffect, useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SocketContext } from '../context/SocketContext'
import LiveTracking from '../components/LiveTracking'

const Riding = () => {
  const location = useLocation()
  const ride = location.state?.ride ?? null
  const { socket } = useContext(SocketContext)
  const navigate = useNavigate()

  // 👇 yaha inline helper banaya
  const safeFare = (f) => {
    if (f == null) return '—';
    if (typeof f === 'object') {
      if (f.total != null) return f.total;
      if (f.breakdown && typeof f.breakdown === 'object') {
        const val = Object.values(f.breakdown).find(
          v => typeof v === 'number' || typeof v === 'string'
        );
        if (val != null) return val;
      }
      const firstVal = Object.values(f).find(
        v => typeof v === 'number' || typeof v === 'string'
      );
      if (firstVal != null) return firstVal;
      return '—';
    }
    return f;
  };

  useEffect(() => {
    if (!socket) return;
    const handleRideEnded = () => {
      navigate('/home')
    }
    socket.on('ride-ended', handleRideEnded)
    return () => {
      socket.off('ride-ended', handleRideEnded)
    }
  }, [socket, navigate])

  if (!ride) {
    return (
      <div className='h-screen flex flex-col items-center justify-center'>
        <p className='text-gray-600'>Ride data loading…</p>
        <Link to='/home' className='mt-4 text-blue-600 underline'>Back to Home</Link>
      </div>
    )
  }

  const captainFirstName = ride?.captain?.fullname?.firstname ?? ride?.captain?.fullname ?? 'Captain'
  const vehiclePlate = ride?.captain?.vehicle?.plate ?? ride?.captain?.vehiclePlate ?? 'N/A'

  return (
    <div className='h-screen'>
      <Link to='/home' className='fixed right-2 top-2 h-10 w-10 bg-white flex items-center justify-center rounded-full'>
        <i className="text-lg font-medium ri-home-5-line"></i>
      </Link>

      <div className='h-1/2'>
        <LiveTracking />
      </div>

      <div className='h-1/2 p-4'>
        <div className='flex items-center justify-between'>
          <img className='h-12' src={ride?.captain?.avatar ?? "https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg"} alt="" />
          <div className='text-right'>
            <h2 className='text-lg font-medium capitalize'>{captainFirstName}</h2>
            <h4 className='text-xl font-semibold -mt-1 -mb-1'>{vehiclePlate}</h4>
            <p className='text-sm text-gray-600'>{ride?.captain?.vehicle?.model ?? 'Vehicle'}</p>
          </div>
        </div>

        <div className='flex gap-2 justify-between flex-col items-center'>
          <div className='w-full mt-5'>
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
                {/* 👇 yaha inline safeFare use kiya */}
                <h3 className='text-lg font-medium'>₹{safeFare(ride?.fare)}</h3>
                <p className='text-sm -mt-1 text-gray-600'>Cash</p>
              </div>
            </div>
          </div>
        </div>

        <button className='w-full mt-5 bg-green-600 text-white font-semibold p-2 rounded-lg'>Make a Payment</button>
      </div>
    </div>
  )
}

export default Riding
