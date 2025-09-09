// src/pages/UserLogout.jsx
import React, { useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const UserLogout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const logout = async () => {
      const token = localStorage.getItem('token');
      try {
        await axios.get(`${import.meta.env.VITE_API_URL}/users/logout`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        try {
          await axios.get(`${import.meta.env.VITE_API_URL}/captains/logout`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch {}
      }
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      navigate('/login');
    };

    logout();
  }, [navigate]);

  return <div>Logging out...</div>;
};

export default UserLogout;
