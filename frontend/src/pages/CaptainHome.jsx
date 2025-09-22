// src/pages/CaptainHome.jsx
import React, { useEffect, useRef, useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import CaptainDetails from '../components/CaptainDetails'
import RidePopUp from '../components/RidePopUp'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ConfirmRidePopUp from '../components/ConfirmRidePopUp'
import { SocketContext } from '../context/SocketContext'
import { CaptainDataContext } from '../context/CapatainContext'
import axios from 'axios'
import LogoutButton from '../components/LogoutButton'

const CaptainHome = () => {
  const [ ridePopupPanel, setRidePopupPanel ] = useState(false)
  const [ confirmRidePopupPanel, setConfirmRidePopupPanel ] = useState(false)

  const ridePopupPanelRef = useRef(null)
  const confirmRidePopupPanelRef = useRef(null)
  const [ ride, setRide ] = useState(null)

  const { socket } = useContext(SocketContext)
  const { captain } = useContext(CaptainDataContext)

  const API_BASE = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || ''

  // join socket, handle new-ride and manage location updates
  useEffect(() => {
    if (!captain || !captain._id) {
      // if captain not loaded yet (rehydration pending), do nothing
      return
    }

    // ensure token exists
    const token = localStorage.getItem('token')
    if (!token) {
      // redirect or let app handle routing
      return
    }

    // join room as captain
    try {
      socket.emit('join', {
        userId: captain._id,
        userType: 'captain'
      })
    } catch (err) {
      console.warn('Socket join error (captain):', err)
    }

    // new ride handler
    const onNewRide = (data) => {
      setRide(data)
      setRidePopupPanel(true)
    }

    socket.on('new-ride', onNewRide)

    // location updater
    let locationInterval = null
    const updateLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
          try {
            socket.emit('update-location-captain', {
              userId: captain._id,
              location: {
                ltd: position.coords.latitude,
                lng: position.coords.longitude
              }
            })
          } catch (err) {
            console.warn('Socket emit location error', err)
          }
        }, (err) => {
          // ignore permission errors silently
        })
      }
    }

    // start immediately and then interval
    updateLocation()
    locationInterval = setInterval(updateLocation, 10000)

    // cleanup
    return () => {
      socket.off('new-ride', onNewRide)
      if (locationInterval) clearInterval(locationInterval)
    }
  }, [captain, socket])

  // confirm ride action (captain accepts)
  async function confirmRide() {
    if (!ride || !ride._id) {
      alert('No ride to confirm.')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const resp = await axios.post(`${API_BASE}/rides/confirm`, {
        rideId: ride._id,
        captainId: captain?._id
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      // server will emit events; update local UI
      setRidePopupPanel(false)
      if (resp?.data) {
        setRide(resp.data)
      }
      setConfirmRidePopupPanel(true)
    } catch (err) {
      console.error('confirmRide error', err?.response ?? err)
      alert('Unable to confirm ride. Check console.')
    }
  }

  

  useGSAP(function () {
    if (confirmRidePopupPanel) {
      gsap.to(confirmRidePopupPanelRef.current, {
        transform: 'translateY(0)'
      })
    } else {
      gsap.to(confirmRidePopupPanelRef.current, {
        transform: 'translateY(100%)'
      })
    }
  }, [ confirmRidePopupPanel ])

  return (
    <div className='h-screen'>
      <div className='fixed p-6 top-0 flex items-center justify-between w-screen z-40'>
        <img className='w-16' src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" alt="" />
        <div className='flex items-center gap-3'>
          <div className='mr-2'>
            <LogoutButton role="captain" />
          </div>
          <Link to='/captain-info' className=' h-10 w-10 bg-white flex items-center justify-center rounded-full'>
            <i className="text-lg font-medium ri-user-2-line"></i>
          </Link>
        </div>
      </div>

      <div className='h-3/5'>
        <img className='h-full w-full object-cover' src="https://miro.medium.com/v2/resize:fit:1400/0*gwMx05pqII5hbfmX.gif" alt="" />
      </div>

      <div className='h-2/5 p-6'>
        <CaptainDetails />
      </div>

      <div ref={ridePopupPanelRef} className={`fixed w-full z-10 bottom-0 bg-white px-3 py-10 pt-12 ${ridePopupPanel ? 'translate-y-0' : 'translate-y-full'}`}>
        <RidePopUp
          ride={ride}
          setRidePopupPanel={setRidePopupPanel}
          setConfirmRidePopupPanel={setConfirmRidePopupPanel}
          confirmRide={confirmRide}
        />
      </div>

      <div ref={confirmRidePopupPanelRef} className='fixed w-full h-screen z-10 bottom-0 translate-y-full bg-white px-3 py-10 pt-12'>
        <ConfirmRidePopUp
          ride={ride}
          setConfirmRidePopupPanel={setConfirmRidePopupPanel}
          setRidePopupPanel={setRidePopupPanel}
        />
      </div>
    </div>
  )
}

export default CaptainHome
