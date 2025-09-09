// src/context/CapatainContext.jsx
import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const CaptainDataContext = createContext();

const CaptainContext = ({ children }) => {
  const [captain, setCaptain] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token'); // ✅ use same key as user
      if (!token) {
        setIsLoading(false);
        setCaptain(null);
        return;
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/captains/profile`);
        const profile = res.data.captain ?? res.data;
        setCaptain({ ...profile, type: 'captain' });
      } catch (err) {
        console.warn('Captain token invalid, clearing.', err);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setCaptain(null);
        setError(err.response?.data?.message ?? 'Invalid token');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const value = {
    captain,
    setCaptain,
    isLoading,
    setIsLoading,
    error,
    setError,
  };

  return (
    <CaptainDataContext.Provider value={value}>
      {children}
    </CaptainDataContext.Provider>
  );
};

export default CaptainContext;
