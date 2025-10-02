// src/pages/Captainlogin.jsx
import React, { useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { CaptainDataContext } from '../context/CapatainContext'

const Captainlogin = () => {
  const [ email, setEmail ] = useState('')
  const [ password, setPassword ] = useState('')

  const { captain, setCaptain } = useContext(CaptainDataContext)
  const navigate = useNavigate()

  const API_BASE = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || ''

  const [ awaitingOtp, setAwaitingOtp ] = useState(false)
  const [ otp, setOtp ] = useState('')
  const [ pendingCaptainId, setPendingCaptainId ] = useState(null)

  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      const payload = { email, password };
      const response = await axios.post(`${API_BASE}/captains/login`, payload);

      if (response.status === 200) {
        const data = response.data;
        // 2FA flow
        if (data?.twoFactorRequired && data?.captainId) {
          setPendingCaptainId(data.captainId)
          setAwaitingOtp(true)
          return
        }
        
        const token = data.token ?? data?.data?.token ?? null;
        if (token) {
          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        const respCaptain = data.captain ?? data?.data?.captain ?? data;
        setCaptain({ ...respCaptain, type: 'captain' });

        navigate('/captain-home');
      } else {
        console.error('Captain login failed', response);
        alert('Login failed — check credentials');
      }
    } catch (err) {
      console.error('Captain login error:', err?.response ?? err);
      if (err?.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert('Login failed. Check console for details.');
      }
    } finally {
      setEmail('');
      setPassword('');
    }
  }

  const submitOtp = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post(`${API_BASE}/captains/2fa/verify`, { captainId: pendingCaptainId, otp })
      const data = res.data
      const token = data.token
      if (token) {
        localStorage.setItem('token', token)
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      }
      const respCaptain = data.captain ?? data?.data?.captain ?? data
      setCaptain({ ...respCaptain, type: 'captain' })
      navigate('/captain-home')
    } catch (err) {
      console.error('OTP verify error (captain):', err?.response ?? err)
      alert(err?.response?.data?.message || 'OTP verification failed')
    }
  }

  return (
    <div className='p-7 h-screen flex flex-col justify-between'>
      <div>
        <img className='w-20 mb-3' src="https://ik.imagekit.io/v88ozoebq/NeoRide/logo.png?updatedAt=1759382071512" alt="" />
        {!awaitingOtp ? (
        <form onSubmit={submitHandler}>
          <h3 className='text-lg font-medium mb-2'>What's your email</h3>
          <input
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
            type="email"
            placeholder='email@example.com'
          />

          <h3 className='text-lg font-medium mb-2'>Enter Password</h3>

          <input
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            placeholder='password'
          />

          <button
            type="submit"
            className='bg-[#111] text-white font-semibold mb-3 rounded-lg px-4 py-2 w-full text-lg placeholder:text-base'
          >
            Login
          </button>
        </form>
        ) : (
        <form onSubmit={submitOtp}>
          <h3 className='text-lg font-medium mb-2'>Enter OTP</h3>
          <input
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
            type="text"
            placeholder='6-digit OTP'
          />
          <button type='submit' className='bg-[#111] text-white font-semibold mb-3 rounded-lg px-4 py-2 w-full text-lg'>Verify OTP</button>
        </form>
        )}
        <p className='text-center'>Join a fleet? <Link to='/captain-signup' className='text-blue-600'>Register as a Captain</Link></p>
      </div>
      <div>
        <Link
          to='/login'
          className='bg-[#d5622d] flex items-center justify-center text-white font-semibold mb-5 rounded-lg px-4 py-2 w-full text-lg placeholder:text-base'
        >Sign in as User</Link>
      </div>
    </div>
  )
}

export default Captainlogin
