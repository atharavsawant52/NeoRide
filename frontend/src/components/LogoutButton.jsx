// src/components/LogoutButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const LogoutButton = ({ role = "user" }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    try {
      if (role === "captain") {
        await axios.get(`${import.meta.env.VITE_API_URL}/captains/logout`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // clear & redirect
        localStorage.removeItem("token");
        delete axios.defaults.headers.common["Authorization"];
        navigate("/captain-login");
        return;
      }

      // default: user logout
      await axios.get(`${import.meta.env.VITE_API_URL}/users/logout`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      // still clear token and redirect safely
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
      navigate(role === "captain" ? "/captain-login" : "/login");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-medium shadow hover:bg-red-600"
    >
      Logout
    </button>
  );
};

export default LogoutButton;
