// src/pages/UserLogin.jsx
import React, { useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { UserDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const UserLogin = () => {
  const [ email, setEmail ] = useState('')
  const [ password, setPassword ] = useState('')
  const { user, setUser } = useContext(UserDataContext)
  const navigate = useNavigate()

  const API_BASE = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || '' // fallback

  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      const payload = { email, password };

      const response = await axios.post(`${API_BASE}/users/login`, payload);

      if (response.status === 200) {
        const data = response.data;

        // token might be at data.token or data?.data?.token depending on backend shape
        const token = data.token ?? data?.data?.token ?? null;

        if (token) {
          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        // pick user object from response safely
        const respUser = data.user ?? data?.data?.user ?? data;

        // Set user in context and mark type
        setUser({ ...respUser, type: 'user' });

        // Redirect to home (adjust route if yours is different)
        navigate('/home');
      } else {
        // non-200, show console (you can add UI toast here)
        console.error('Login failed', response);
        alert('Login failed — check credentials');
      }
    } catch (err) {
      console.error('Login error:', err?.response ?? err);
      // simple user feedback — replace with toast if you have one
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

  return (
    <div className='p-7 h-screen flex flex-col justify-between'>
      <div>
        <img className='w-16 mb-10' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYQy-OIkA6In0fTvVwZADPmFFibjmszu2A0g&s" alt="" />

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
        <p className='text-center'>New here? <Link to='/signup' className='text-blue-600'>Create new Account</Link></p>
      </div>
      <div>
        <Link
          to='/captain-login'
          className='bg-[#10b461] flex items-center justify-center text-white font-semibold mb-5 rounded-lg px-4 py-2 w-full text-lg placeholder:text-base'
        >Sign in as Captain</Link>
      </div>
    </div>
  )
}

export default UserLogin
