import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CaptainDataContext } from '../context/CapatainContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const CaptainSignup = () => {

  const navigate = useNavigate()

  const [ email, setEmail ] = useState('')
  const [ password, setPassword ] = useState('')
  const [ firstName, setFirstName ] = useState('')
  const [ lastName, setLastName ] = useState('')

  const [ vehicleColor, setVehicleColor ] = useState('')
  const [ vehiclePlate, setVehiclePlate ] = useState('')
  const [ vehicleCapacity, setVehicleCapacity ] = useState('')
  const [ vehicleType, setVehicleType ] = useState('')
  const [ carName, setCarName ] = useState('')


  const [ profilePic, setProfilePic ] = useState(null)
  const [ driverLicense, setDriverLicense ] = useState(null)
  const [ aadhar, setAadhar ] = useState(null)

  const { captain, setCaptain } = React.useContext(CaptainDataContext)


  // auto-capacity mapping
  useEffect(() => {
    const map = { motorcycle: 1, car: 4, carxl: 6, auto: 3, taxi: 3 }
    if (vehicleType) {
      setVehicleCapacity(String(map[vehicleType] ?? ''))
    } else {
      setVehicleCapacity('')
    }
  }, [vehicleType])

  const submitHandler = async (e) => {
    e.preventDefault()

    const formdata = new FormData()
    formdata.append('fullname[firstname]', firstName)
    formdata.append('fullname[lastname]', lastName)
    formdata.append('email', email)
    formdata.append('password', password)
    formdata.append('vehicle[color]', vehicleColor)
    formdata.append('vehicle[plate]', vehiclePlate)
    if (vehicleCapacity) formdata.append('vehicle[capacity]', parseInt(vehicleCapacity))
    formdata.append('vehicle[vehicleType]', vehicleType)
    if (carName) formdata.append('vehicle[name]', carName)
    formdata.append('profilePic', profilePic)
    if (driverLicense) formdata.append('driverLicense', driverLicense)
    if (aadhar) formdata.append('aadhar', aadhar)

    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/register`, formdata, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.status === 201) {
        const data = response.data
        setCaptain(data.captain)
        localStorage.setItem('token', data.token)
        navigate('/captain-home')
      }
    } catch (error) {
      console.error("Registration error:", error.response.data);
    }

    setEmail('')
    setFirstName('')
    setLastName('')
    setPassword('')
    setVehicleColor('')
    setVehiclePlate('')
    setVehicleCapacity('')
    setVehicleType('')
    setCarName('')
    setProfilePic(null)
    setDriverLicense(null)
    setAadhar(null)

  }
  return (
    <div className='py-5 px-5 h-screen flex flex-col justify-between'>
      <div>
        <img className='w-20 mb-3' src="https://ik.imagekit.io/v88ozoebq/NeoRide/logo.png?updatedAt=1759382071512" alt="" />

        <form onSubmit={(e) => {
          submitHandler(e)
        }}>

          <h3 className='text-lg w-full  font-medium mb-2'>What's our Captain's name</h3>
          <div className='flex gap-4 mb-7'>
            <input
              required
              className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-2 border  text-lg placeholder:text-base'
              type="text"
              placeholder='First name'
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value)
              }}
            />
            <input
              required
              className='bg-[#eeeeee] w-1/2  rounded-lg px-4 py-2 border  text-lg placeholder:text-base'
              type="text"
              placeholder='Last name'
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value)
              }}
            />
          </div>

          <h3 className='text-lg font-medium mb-2'>What's our Captain's email</h3>
          <input
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
            }}
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
            type="email"
            placeholder='email@example.com'
          />

          <h3 className='text-lg font-medium mb-2'>Enter Password</h3>

          <input
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
            }}
            required type="password"
            placeholder='password'
          />

          <h3 className='text-lg font-medium mb-2'>Vehicle Information</h3>
          <div className='flex gap-4 mb-7'>
            <input
              required
              className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-2 border text-lg placeholder:text-base'
              type="text"
              placeholder='Vehicle Color'
              value={vehicleColor}
              onChange={(e) => {
                setVehicleColor(e.target.value)
              }}
            />
            <input
              required
              className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-2 border text-lg placeholder:text-base'
              type="text"
              placeholder='Vehicle Plate'
              value={vehiclePlate}
              onChange={(e) => {
                setVehiclePlate(e.target.value)
              }}
            />
          </div>
          <div className='flex gap-4 mb-7'>
            <input
              className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-2 border text-lg placeholder:text-base'
              type="text"
              placeholder='Car Name (e.g., Swift, Innova)'
              value={carName}
              onChange={(e) => setCarName(e.target.value)}
            />
            <input
              required
              className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-2 border text-lg placeholder:text-base disabled:opacity-70'
              type="number"
              placeholder='Vehicle Capacity'
              value={vehicleCapacity}
              onChange={(e) => {
                setVehicleCapacity(e.target.value)
              }}
              readOnly
            />
          </div>
          <div className='flex gap-4 mb-7'>
            <select
              required
              className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-2 border text-lg placeholder:text-base'
              value={vehicleType}
              onChange={(e) => {
                setVehicleType(e.target.value)
              }}
            >
              <option value="" disabled>Select Vehicle Type</option>
              <option value="motorcycle">Bike</option>
              <option value="car">Car</option>
              <option value="carxl">UberXL</option>
              <option value="auto">Auto</option>
              <option value="taxi">Taxi</option>
            </select>
          </div>

          <h3 className='text-lg font-medium mb-2'>Profile Picture</h3>
          <input
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
            type="file"
            onChange={(e) => {
              setProfilePic(e.target.files[ 0 ])
            }}
          />

          <h3 className='text-lg font-medium mb-2'>Driver License</h3>
          <input
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
            type="file"
            onChange={(e) => setDriverLicense(e.target.files?.[0] ?? null)}
          />

          <h3 className='text-lg font-medium mb-2'>Aadhar Card</h3>
          <input
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
            type="file"
            onChange={(e) => setAadhar(e.target.files?.[0] ?? null)}
          />

          <button
            className='bg-[#111] text-white font-semibold mb-3 rounded-lg px-4 py-2 w-full text-lg placeholder:text-base'
          >Create Captain Account</button>

        </form>
        <p className='text-center'>Already have a account? <Link to='/captain-login' className='text-blue-600'>Login here</Link></p>
      </div>
      <div>
        <p className='text-[10px] mt-6 leading-tight'>This site is protected by reCAPTCHA and the <span className='underline'>Google Privacy
          Policy</span> and <span className='underline'>Terms of Service apply</span>.</p>
      </div>
    </div>
  )
}

export default CaptainSignup