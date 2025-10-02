// src/pages/UserSignup.jsx
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserDataContext } from '../context/UserContext';

const UserSignup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user, setUser } = useContext(UserDataContext);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (loading) return;

    const formdata = new FormData();
    formdata.append('fullname[firstname]', firstName);
    formdata.append('fullname[lastname]', lastName);
    formdata.append('email', email);
    formdata.append('password', password);
    formdata.append('profilePic', profilePic);

    setLoading(true);

    try {
      // Prefer a single env var across the app. Keep VITE_API_URL in .env
      const base = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BASE_URL;
      if (!base) throw new Error('VITE_API_URL (or VITE_BASE_URL) is not set');

      const url = `${base.replace(/\/$/, '')}/users/register`;
      const response = await axios.post(url, formdata, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Accept both 200 and 201 just in case backend differs
      if (response.status === 201 || response.status === 200) {
        const data = response.data;
        // store token if returned and set default axios header for subsequent calls
        if (data?.token) {
          localStorage.setItem('token', data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        }

        // adapt to backend shape: prefer data.user else data
        const userFromResponse = data.user ?? data;
        setUser(userFromResponse);

        navigate('/home');
      } else {
        console.warn('Unexpected signup response', response.status, response.data);
        alert(response.data?.message || 'Signup failed — unexpected server response.');
      }
    } catch (err) {
      console.error('Signup error:', err);

      if (err.response) {
        // server returned 4xx/5xx
        console.error('Status:', err.response.status);
        console.error('Response data:', err.response.data);
        alert(err.response.data?.message || `Signup failed: ${err.response.status}`);
      } else if (err.request) {
        // request was made but no response
        console.error('No response:', err.request);
        alert('No response from server. Check network or server logs.');
      } else {
        console.error('Error message:', err.message);
        alert('Error: ' + err.message);
      }
    } finally {
      // reset form and loading state
      setLoading(false);
      setEmail('');
      setFirstName('');
      setLastName('');
      setPassword('');
      setProfilePic(null);
    }
  };

  return (
    <div>
      <div className="p-7 h-screen flex flex-col justify-between">
        <div>
          <img
            className="w-16 mb-10"
            src="https://ik.imagekit.io/v88ozoebq/NeoRide/logo.png?updatedAt=1759382071512"
            alt="logo"
          />

          <form onSubmit={submitHandler}>
            <h3 className="text-lg w-1/2 font-medium mb-2">What's your name</h3>
            <div className="flex gap-4 mb-7">
              <input
                required
                className="bg-[#eeeeee] w-1/2 rounded-lg px-4 py-2 border text-lg placeholder:text-base"
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                required
                className="bg-[#eeeeee] w-1/2 rounded-lg px-4 py-2 border text-lg placeholder:text-base"
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <h3 className="text-lg font-medium mb-2">What's your email</h3>
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base"
              type="email"
              placeholder="email@example.com"
            />

            <h3 className="text-lg font-medium mb-2">Enter Password</h3>
            <input
              className="bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              placeholder="password"
            />

            <h3 className="text-lg font-medium mb-2">Profile Picture</h3>
            <input
              className="bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base"
              type="file"
              onChange={(e) => {
                setProfilePic(e.target.files[0]);
              }}
            />

            <button
              type="submit"
              disabled={loading}
              className={`bg-[#111] text-white font-semibold mb-3 rounded-lg px-4 py-2 w-full text-lg placeholder:text-base ${
                loading ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center">
            Already have an account? <Link to="/login" className="text-blue-600">Login here</Link>
          </p>
        </div>

        <div>
          <p className="text-[10px] leading-tight">
            This site is protected by reCAPTCHA and the <span className="underline">Google Privacy Policy</span> and <span className="underline">Terms of Service apply</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserSignup;
