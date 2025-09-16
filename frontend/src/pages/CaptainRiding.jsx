import React, { useRef, useState, useEffect, useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import FinishRide from '../components/FinishRide'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import LiveTracking from '../components/LiveTracking'
import { SocketContext } from '../context/SocketContext'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const CaptainRiding = () => {
  const [ finishRidePanel, setFinishRidePanel ] = useState(false)
  const [ paymentInfo, setPaymentInfo ] = useState(null) // new: store payment details
  const finishRidePanelRef = useRef(null)
  const location = useLocation()
  const rideData = location.state?.ride ?? null
  console.log("CaptainRiding rideData:", rideData);
  const { socket } = useContext(SocketContext)

  useGSAP(function () {
    if (finishRidePanel) {
      gsap.to(finishRidePanelRef.current, { transform: 'translateY(0)' })
    } else {
      gsap.to(finishRidePanelRef.current, { transform: 'translateY(100%)' })
    }
  }, [ finishRidePanel ])

  // Listen to ride-paid event from server
  useEffect(() => {
    if (!socket) return;

    const onRidePaid = (payload) => {
      // payload example: { rideId, paymentId, amount, method, passengerMessage, timestamp }
      console.log('ride-paid received:', payload)
      // show toast notification to captain
      toast.info(
        `Payment received: ₹${payload.amount || '—'} (${payload.method || '—'})\nPaymentID: ${payload.paymentId || '—'}`,
        { autoClose: 5000 }
      )

      // optional: open finish panel so captain can finalize ride
      setPaymentInfo(payload)
      setFinishRidePanel(true)

      // optionally you can also update local ride state if you maintain one here
      // and pass updated ride to FinishRide component
    }

    socket.on('ride-paid', onRidePaid)

    return () => {
      socket.off('ride-paid', onRidePaid)
    }
  }, [socket])

  // If user clicks top area open finish panel
  const handleOpenFinish = () => setFinishRidePanel(true)

  return (
    <div className='h-screen relative flex flex-col justify-end'>
      {/* Toasts */}
      <ToastContainer />

      <div className='fixed p-6 top-0 flex items-center justify-between w-screen'>
        <img className='w-16' src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" alt="" />
        <Link to='/captain-home' className=' h-10 w-10 bg-white flex items-center justify-center rounded-full'>
          <i className="text-lg font-medium ri-logout-box-r-line"></i>
        </Link>
      </div>

      <div
        className='h-1/5 p-6 flex items-center justify-between relative bg-yellow-400 pt-10'
        onClick={handleOpenFinish}
      >
        <h5 className='p-1 text-center w-[90%] absolute top-0'><i className="text-3xl text-gray-800 ri-arrow-up-wide-line"></i></h5>
        <h4 className='text-xl font-semibold'>{'4 KM away'}</h4>
        <button
          onClick={() => setFinishRidePanel(true)}
          className=' bg-green-600 text-white font-semibold p-3 px-10 rounded-lg'
        >
          Complete Ride
        </button>
      </div>

      <div ref={finishRidePanelRef} className='fixed w-full z-[500] bottom-0 translate-y-full bg-white px-3 py-10 pt-12'>
        {/* Pass paymentInfo to FinishRide so it can show payment success if needed */}
        <FinishRide
          ride={rideData}
          setFinishRidePanel={setFinishRidePanel}
          paymentInfo={paymentInfo}    // new prop (optional: handle in FinishRide)
        />
      </div>

      <div className='h-screen fixed w-screen top-0 z-[-1]'>
        <LiveTracking />
      </div>
    </div>
  )
}

export default CaptainRiding
