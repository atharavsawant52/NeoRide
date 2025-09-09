// src/pages/CaptainLogout.jsx
import React, { useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CaptainLogout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const logout = async () => {
      const token = localStorage.getItem('token'); // ✅ use same key as user for consistency

      try {
        await axios.get(`${import.meta.env.VITE_API_URL}/captains/logout`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Captain logout API failed, clearing token anyway', err);
      }

      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      navigate('/captain-login');
    };

    logout();
  }, [navigate]);

  return <div>Logging out...</div>;
};

export default CaptainLogout;
