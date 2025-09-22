import React, { useEffect, useRef, useState, useContext } from 'react'
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';
import 'remixicon/fonts/remixicon.css'
import LocationSearchPanel from '../components/LocationSearchPanel';
import VehiclePanel from '../components/VehiclePanel';
import ConfirmRide from '../components/ConfirmRide';
import LookingForDriver from '../components/LookingForDriver';
import WaitingForDriver from '../components/WaitingForDriver';
import { SocketContext } from '../context/SocketContext';
import { UserDataContext } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import LiveTracking from '../components/LiveTracking';
import LogoutButton from '../components/LogoutButton';


const Home = () => {
  const [ pickup, setPickup ] = useState('')
  const [ destination, setDestination ] = useState('')
  const [ panelOpen, setPanelOpen ] = useState(false)
  const vehiclePanelRef = useRef(null)
  const confirmRidePanelRef = useRef(null)
  const vehicleFoundRef = useRef(null)
  const waitingForDriverRef = useRef(null)
  const panelRef = useRef(null)
  const panelCloseRef = useRef(null)
  const [ vehiclePanel, setVehiclePanel ] = useState(false)
  const [ confirmRidePanel, setConfirmRidePanel ] = useState(false)
  const [ vehicleFound, setVehicleFound ] = useState(false)
  const [ waitingForDriver, setWaitingForDriver ] = useState(false)
  const [ pickupSuggestions, setPickupSuggestions ] = useState([])
  const [ destinationSuggestions, setDestinationSuggestions ] = useState([])
  const [ activeField, setActiveField ] = useState(null)
  const [ fare, setFare ] = useState({})
  const [ vehicleType, setVehicleType ] = useState(null)
  const [ ride, setRide ] = useState(null)

  const navigate = useNavigate()

  const { socket } = useContext(SocketContext)
  const { user } = useContext(UserDataContext)

  const API_BASE = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || ''

  // join room and register socket listeners when user is available
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    if (!user) {
      // token present but user not rehydrated yet -> wait
      return
    }

    try {
      socket.emit("join", { userType: "user", userId: user._id })
    } catch (err) {
      console.warn('Socket join error', err)
    }

    const onRideConfirmed = (rideData) => {
      console.log('socket -> ride-confirmed payload:', rideData);
      setVehicleFound(false)
      setWaitingForDriver(true)

      // if payload doesn't contain otp, warn (server should send otp)
      if (!rideData?.otp) {
        console.warn('ride-confirmed missing otp in payload. Server might not be sending otp with event.');
      }

      // prefer server payload (it usually contains populated data incl otp)
      setRide(rideData)
    }

    const onRideStarted = (rideData) => {
      console.log('socket -> ride-started payload:', rideData);
      setWaitingForDriver(false)
      // use returned rideData for navigation (safer than stale state)
      navigate('/riding', { state: { ride: rideData } })
    }

    socket.on('ride-confirmed', onRideConfirmed)
    socket.on('ride-started', onRideStarted)

    return () => {
      socket.off('ride-confirmed', onRideConfirmed)
      socket.off('ride-started', onRideStarted)
    }
  }, [user, socket, navigate])

  // debug: log ride state whenever it changes
  useEffect(() => {
    console.log('Local ride state updated:', ride);
  }, [ride]);

  const handlePickupChange = async (e) => {
    setPickup(e.target.value)
    try {
      const response = await axios.get(`${API_BASE}/maps/get-suggestions`, {
        params: { input: e.target.value },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setPickupSuggestions(response.data)
    } catch (err) {
      console.error('pickup suggestions error', err)
    }
  }

  const handleDestinationChange = async (e) => {
    setDestination(e.target.value)
    try {
      const response = await axios.get(`${API_BASE}/maps/get-suggestions`, {
        params: { input: e.target.value },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setDestinationSuggestions(response.data)
    } catch (err) {
      console.error('destination suggestions error', err)
    }
  }

  const submitHandler = (e) => {
    e.preventDefault()
  }

  useGSAP(function () {
    if (panelOpen) {
      gsap.to(panelRef.current, { height: '70%', padding: 24 })
      gsap.to(panelCloseRef.current, { opacity: 1 })
    } else {
      gsap.to(panelRef.current, { height: '0%', padding: 0 })
      gsap.to(panelCloseRef.current, { opacity: 0 })
    }
  }, [ panelOpen ])

  useGSAP(function () {
    if (vehiclePanel) {
      gsap.to(vehiclePanelRef.current, { transform: 'translateY(0)' })
    } else {
      gsap.to(vehiclePanelRef.current, { transform: 'translateY(100%)' })
    }
  }, [ vehiclePanel ])

  useGSAP(function () {
    if (confirmRidePanel) {
      gsap.to(confirmRidePanelRef.current, { transform: 'translateY(0)' })
    } else {
      gsap.to(confirmRidePanelRef.current, { transform: 'translateY(100%)' })
    }
  }, [ confirmRidePanel ])

  useGSAP(function () {
    if (vehicleFound) {
      gsap.to(vehicleFoundRef.current, { transform: 'translateY(0)' })
    } else {
      gsap.to(vehicleFoundRef.current, { transform: 'translateY(100%)' })
    }
  }, [ vehicleFound ])

  useGSAP(function () {
    if (waitingForDriver) {
      gsap.to(waitingForDriverRef.current, { transform: 'translateY(0)' })
    } else {
      gsap.to(waitingForDriverRef.current, { transform: 'translateY(100%)' })
    }
  }, [ waitingForDriver ])


  async function findTrip() {
    setVehiclePanel(true)
    setPanelOpen(false)

    try {
      const response = await axios.get(`${API_BASE}/rides/get-fare`, {
        params: { pickup, destination },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })

      setFare(response.data)
    } catch (err) {
      console.error('get fare error', err)
    }
  }

  async function createRide() {
    try {
      const response = await axios.post(`${API_BASE}/rides/create`, {
        pickup,
        destination,
        vehicleType
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })

      // Debug: log raw server response
      console.log('/rides/create response:', response?.status, response?.data);

      // server will emit socket events for ride assignment — no local handling required here
      // but store the created ride locally so ConfirmRide's dummy payment can use ride._id
      if (response && response.data) {
        // If server returned otp in create response, it will be present here
        if (!response.data.otp) {
          // log helpful warning so you can check server behavior
          console.warn('createRide: response does not contain otp. Server may be omitting otp from create response.');
        } else {
          console.log('createRide: OTP is present in server response (dev mode):', response.data.otp);
        }

        setRide(response.data)
        // open waiting panel only if server indicates accepted OR you wait for socket
        // but keep confirm panel closed since create was successful
        setConfirmRidePanel(false)
        return response.data
      }
    } catch (err) {
      console.error('create ride error', err)
    }
  }

  return (
    <div className='h-screen relative overflow-hidden'>
      <div className='absolute left-5 top-5'>
        <img className='w-16' src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" alt="" />
      </div>
      {/* Header right: stack Profile + Logout vertically */}
      <div className="absolute right-4 top-4 z-50 flex flex-col items-end gap-2">
        {/* Profile button navigates to /profile */}
        <button onClick={() => navigate('/profile')} className='h-10 w-10 bg-white rounded-full shadow flex items-center justify-center'>
          <i className="ri-user-2-line"></i>
        </button>
        <LogoutButton role="user" />
      </div>

      <div className='h-screen w-screen'>
        {/* image for temporary use  */}
        <LiveTracking />
      </div>

      <div className='flex flex-col justify-end h-screen absolute top-0 w-full'>
        <div className='h-[30%] p-6 bg-white relative'>
          <h5 ref={panelCloseRef} onClick={() => setPanelOpen(false)} className='absolute opacity-0 right-6 top-6 text-2xl'>
            <i className="ri-arrow-down-wide-line"></i>
          </h5>

          <h4 className='text-2xl font-semibold'>Find a trip</h4>
          <form className='relative py-3' onSubmit={submitHandler}>
            <div className="line absolute h-16 w-1 top-[50%] -translate-y-1/2 left-5 bg-gray-700 rounded-full"></div>
            <input
              onClick={() => { setPanelOpen(true); setActiveField('pickup') }}
              value={pickup}
              onChange={handlePickupChange}
              className='bg-[#eee] px-12 py-2 text-lg rounded-lg w-full'
              type="text"
              placeholder='Add a pick-up location'
            />
            <input
              onClick={() => { setPanelOpen(true); setActiveField('destination') }}
              value={destination}
              onChange={handleDestinationChange}
              className='bg-[#eee] px-12 py-2 text-lg rounded-lg w-full mt-3'
              type="text"
              placeholder='Enter your destination'
            />
          </form>

          <button onClick={findTrip} className='bg-black text-white px-4 py-2 rounded-lg mt-3 w-full'>
            Find Trip
          </button>
        </div>

        <div ref={panelRef} className='bg-white h-0'>
          <LocationSearchPanel
            suggestions={activeField === 'pickup' ? pickupSuggestions : destinationSuggestions}
            setPanelOpen={setPanelOpen}
            setVehiclePanel={setVehiclePanel}
            setPickup={setPickup}
            setDestination={setDestination}
            activeField={activeField}
          />
        </div>
      </div>

      <div ref={vehiclePanelRef} className='fixed w-full z-10 bottom-0 translate-y-full bg-white px-3 py-10 pt-12'>
        <VehiclePanel
          selectVehicle={setVehicleType}
          fare={fare}
          setConfirmRidePanel={setConfirmRidePanel}
          setVehiclePanel={setVehiclePanel}
        />
      </div>

      <div ref={confirmRidePanelRef} className='fixed w-full z-10 bottom-0 translate-y-full bg-white px-3 py-6 pt-12'>
        <ConfirmRide
          createRide={createRide}
          pickup={pickup}
          destination={destination}
          fare={fare}
          vehicleType={vehicleType}
          ride={ride}
          setConfirmRidePanel={setConfirmRidePanel}
          setVehicleFound={setVehicleFound}
          setRide={setRide} // pass setter so child can update ride if needed
        />
      </div>

      <div ref={vehicleFoundRef} className='fixed w-full z-10 bottom-0 translate-y-full bg-white px-3 py-6 pt-12'>
        <LookingForDriver
          createRide={createRide}
          pickup={pickup}
          destination={destination}
          fare={fare}
          vehicleType={vehicleType}
          setVehicleFound={setVehicleFound}
          vehicleImage={
            vehicleType === 'car'
              ? 'https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg'
              : vehicleType === 'motorcycle'
              ? 'https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_638,w_956/v1649231091/assets/2c/7fa194-c954-49b2-9c6d-a3b8601370f5/original/Uber_Moto_Orange_312x208_pixels_Mobile.png'
              : vehicleType === 'auto'
              ? 'https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_368,w_552/v1648431773/assets/1d/db8c56-0204-4ce4-81ce-56a11a07fe98/original/Uber_Auto_558x372_pixels_Desktop.png'
              : 'https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg' // Default to car if vehicleType is unknown
          }
        />
      </div>

      <div ref={waitingForDriverRef} className='fixed w-full z-10 bottom-0 bg-white px-3 py-6 pt-12'>
        <WaitingForDriver
          ride={ride}
          setVehicleFound={setVehicleFound}
          setWaitingForDriver={setWaitingForDriver}
          waitingForDriver={waitingForDriver}
        />
      </div>
    </div>
  )
}

export default Home
