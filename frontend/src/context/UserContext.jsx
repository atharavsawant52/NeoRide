// src/context/UserContext.jsx
import React, { createContext, useEffect, useState } from 'react';
import axios from 'axios';

export const UserDataContext = createContext();

const UserContext = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }

      // set global axios header so all requests send token
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      try {
        const base = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BASE_URL;
        if (!base) throw new Error('VITE_API_URL (or VITE_BASE_URL) is not set');

        // try user profile endpoint
        const res = await axios.get(`${base.replace(/\/$/, '')}/users/profile`);
        const profile = res.data.user ?? res.data;
        setUser({ ...profile, type: 'user' });
      } catch (err) {
        try {
          const base = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BASE_URL;
          const res2 = await axios.get(`${base.replace(/\/$/, '')}/captains/profile`);
          const profile2 = res2.data.captain ?? res2.data;
          setUser({ ...profile2, type: 'captain' });
        } catch (err2) {
          console.warn('Auth token invalid or expired. Clearing local token.');
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        }
      }
    };

    initAuth();
  }, []);

  return (
    <UserDataContext.Provider value={{ user, setUser }}>
      {children}
    </UserDataContext.Provider>
  );
};

export default UserContext;
