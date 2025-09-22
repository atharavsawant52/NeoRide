import React, { useEffect, useContext, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SocketContext } from '../context/SocketContext'
import LiveTracking from '../components/LiveTracking'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import PaymentCard from '../components/PaymentCard' // new component
import RatingModal from '../components/RatingModal'

const Riding = () => {
  const location = useLocation()
  const ride = location.state?.ride ?? null
  const { socket } = useContext(SocketContext)
  const navigate = useNavigate()
  const [localRide, setLocalRide] = useState(ride)

  useEffect(() => {
    if (!socket) return;
    const handleRideEnded = (rideData) => {
      // open rating modal, store latest ride
      if (rideData) setLocalRide(rideData)
      setRatingOpen(true)
    }
    socket.on('ride-ended', handleRideEnded)

    // optional: listen for server ack of payment
    const onPaymentAck = (ack) => {
      if (ack?.ok) {
        toast.success('Server acknowledged payment', { autoClose: 2000 })
      } else if (ack) {
        toast.error('Payment ack failed: ' + (ack.message || 'Unknown'))
      }
    }
    socket.on('payment-ack', onPaymentAck)

    return () => {
      socket.off('ride-ended', handleRideEnded)
      socket.off('payment-ack', onPaymentAck)
    }
  }, [socket, navigate])

  // safeFare helper (same as before)
  const safeFare = (f) => {
    if (f == null) return '—';
    if (typeof f === 'object') {
      if (f.total != null) return f.total;
      if (f.breakdown && typeof f.breakdown === 'object') {
        const val = Object.values(f.breakdown).find(v => typeof v === 'number' || typeof v === 'string');
        if (val != null) return val;
      }
      const firstVal = Object.values(f).find(v => typeof v === 'number' || typeof v === 'string');
      if (firstVal != null) return firstVal;
      return '—';
    }
    return f;
  };

  if (!ride) {
    return (
      <div className='h-screen flex flex-col items-center justify-center'>
        <p className='text-gray-600'>Ride data loading…</p>
        <Link to='/home' className='mt-4 text-blue-600 underline'>Back to Home</Link>
      </div>
    )
  }

  const captainFirstName = localRide?.captain?.fullname?.firstname ?? localRide?.captain?.fullname ?? 'Captain'
  const vehiclePlate = localRide?.captain?.vehicle?.plate ?? localRide?.captain?.vehiclePlate ?? 'N/A'

  // onSuccess callback from PaymentCard
  const handlePaymentSuccess = (data) => {
    // data could be { success, paymentId, ride } from dummy route
    if (data?.ride) setLocalRide(data.ride)
    toast.success('Payment successful', { autoClose: 2000 })
    // optionally navigate away: navigate('/home')
  }

  // Rating modal state
  const [ratingOpen, setRatingOpen] = useState(false)
  const handleRatingSubmitted = () => {
    setRatingOpen(false)
    navigate('/home')
  }

  return (
    <div className='h-screen'>
      <ToastContainer />

      <Link to='/home' className='fixed right-2 top-2 h-10 w-10 bg-white flex items-center justify-center rounded-full'>
        <i className="text-lg font-medium ri-home-5-line"></i>
      </Link>

      <div className='h-1/2'>
        <LiveTracking />
      </div>

      <div className='h-1/2 p-4'>
        <div className='flex items-center justify-between'>
          <img className='h-12' src={localRide?.captain?.avatar ?? "https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg"} alt="" />
          <div className='text-right'>
            <h2 className='text-lg font-medium capitalize'>{captainFirstName}</h2>
            <h4 className='text-xl font-semibold -mt-1 -mb-1'>{vehiclePlate}</h4>
            <p className='text-sm text-gray-600'>{localRide?.captain?.vehicle?.model ?? 'Vehicle'}</p>
          </div>
        </div>

        <div className='flex gap-2 justify-between flex-col items-center'>
          <div className='w-full mt-5'>
            <div className='flex items-center gap-5 p-3 border-b-2'>
              <i className="text-lg ri-map-pin-2-fill"></i>
              <div>
                <h3 className='text-lg font-medium'>Destination</h3>
                <p className='text-sm -mt-1 text-gray-600'>{localRide?.destination ?? '—'}</p>
              </div>
            </div>

            <div className='flex items-center gap-5 p-3'>
              <i className="ri-currency-line"></i>
              <div>
                <h3 className='text-lg font-medium'>₹{safeFare(localRide?.fare ?? ride?.fare)}</h3>
                <p className='text-sm -mt-1 text-gray-600'>{localRide?.paymentMethod ?? 'Cash'}</p>
              </div>
            </div>
          </div>

          {/* PaymentCard component */}
          <div className='w-full mt-6'>
            <PaymentCard
              ride={localRide ?? ride}
              preferGateway='dummy' // switch to 'razorpay' if you want real gateway flow
              onSuccess={handlePaymentSuccess}
            />
          </div>

        </div>
      </div>
      {/* Rating Modal */}
      <RatingModal
        rideId={(localRide ?? ride)?._id}
        open={ratingOpen}
        onClose={() => { setRatingOpen(false); navigate('/home') }}
        onSubmitted={handleRatingSubmitted}
      />
    </div>
  )
}

export default Riding
