// src/components/ConfirmRidePopUp.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ConfirmRidePopUp = (props) => {
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const navigate = useNavigate();
  const API_BASE = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BASE_URL ?? '').replace(/\/$/, '');

  // Debug: log ride object so you can inspect phone, fare, etc.
  useEffect(() => {
    console.log('ConfirmRidePopUp props.ride:', props.ride);

    // Sync OTP from incoming ride to local state (helps autopopulate)
    const incomingOtp = props?.ride?.otp ?? props?.ride?.otpCode ?? '';
    if (incomingOtp) {
      setOtp(String(incomingOtp));
    }
  }, [props.ride]);

  const submitHander = async (e) => {
    e.preventDefault();
    if (!props?.ride?._id) {
      alert('Ride missing');
      return;
    }
    setStartLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/rides/start-ride`, {
        params: {
          rideId: props.ride._id,
          otp: otp,
        },
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });

      // successful start
      if (response?.status === 200 && (response.data ?? false)) {
        setMessage('Ride started successfully');

        // If backend returns the updated ride object, prefer that for navigation/state
        const returnedRide = response.data;

        props.setConfirmRidePopupPanel?.(false);
        props.setRidePopupPanel?.(false);

        // If parent has a setRide function, update it with returnedRide
        if (typeof props.setRide === 'function') {
          props.setRide(returnedRide);
        }

        // navigate with the updated ride if available
        navigate('/captain-riding', { state: { ride: returnedRide ?? props.ride } });
      } else {
        setMessage(response?.data?.message || 'Could not start ride — check OTP');
      }
    } catch (err) {
      console.error('Start ride error:', err.response ?? err);
      setMessage(err.response?.data?.message || 'Failed to start ride (see console)');
    } finally {
      setStartLoading(false);
    }
  };

  // Resend OTP handler — backend needs to expose an endpoint to trigger/send OTP
  const resendOtp = async () => {
    if (!props?.ride?._id) {
      alert('Ride missing');
      return;
    }
    setResendLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      // Adjust path if your backend uses a different route, e.g. /rides/send-otp or /rides/generate-otp
      const res = await axios.post(
        `${API_BASE}/rides/send-otp`,
        { rideId: props.ride._id },
        {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        }
      );

      console.log('Resend OTP response:', res?.data);
      if (res?.data) {
        setMessage(res.data.message ?? 'OTP requested — check phone');

        // show OTP in dev mode only (safer for local testing)
        if (import.meta.env.DEV && res.data?.otp) {
          setMessage((prev) => `${prev} (dev OTP: ${res.data.otp})`);
          setOtp(res.data.otp);
        }
      } else {
        setMessage('OTP request sent — check server logs if not received');
      }
    } catch (err) {
      console.error('Resend OTP error:', err.response ?? err);
      setMessage(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const riderName = props.ride?.user?.fullname?.firstname ?? 'Rider';
  const safeFare = (() => {
    const f = props.ride?.fare ?? props.fare;
    if (f == null) return '—';
    return typeof f === 'object' ? (f.total ?? JSON.stringify(f)) : f;
  })();

  return (
    <div>
      <h5 className="p-1 text-center w-[93%] absolute top-0" onClick={() => props.setRidePopupPanel?.(false)}>
        <i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i>
      </h5>

      <h3 className="text-2xl font-semibold mb-5">Confirm this ride to Start</h3>

      <div className="flex items-center justify-between p-3 border-2 border-yellow-400 rounded-lg mt-4">
        <div className="flex items-center gap-3 ">
          <img
            className="h-12 rounded-full object-cover w-12"
            src={props.ride?.user?.profilePic ?? 'https://i.pinimg.com/236x/af/26/28/af26280b0ca305be47df0b799ed1b12b.jpg'}
            alt=""
          />
          <h2 className="text-lg font-medium capitalize">{riderName}</h2>
        </div>
        <h5 className="text-lg font-semibold">2.2 KM</h5>
      </div>

      <div className="flex gap-2 justify-between flex-col items-center">
        <div className="w-full mt-5">
          <div className="flex items-center gap-5 p-3 border-b-2">
            <i className="ri-map-pin-user-fill"></i>
            <div>
              <h3 className="text-lg font-medium">Pickup</h3>
              <p className="text-sm -mt-1 text-gray-600">{props.ride?.pickup ?? '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-5 p-3 border-b-2">
            <i className="text-lg ri-map-pin-2-fill"></i>
            <div>
              <h3 className="text-lg font-medium">Destination</h3>
              <p className="text-sm -mt-1 text-gray-600">{props.ride?.destination ?? '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-5 p-3">
            <i className="ri-currency-line"></i>
            <div>
              <h3 className="text-lg font-medium">₹{safeFare}</h3>
              <p className="text-sm -mt-1 text-gray-600">Cash</p>
            </div>
          </div>
        </div>

        <div className="mt-6 w-full">
          <form onSubmit={submitHander}>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              type="text"
              className="bg-[#eee] px-6 py-4 font-mono text-lg rounded-lg w-full mt-3"
              placeholder="Enter OTP"
            />

            <button
              type="submit"
              className="w-full mt-5 text-lg flex justify-center bg-green-600 text-white font-semibold p-3 rounded-lg"
              disabled={startLoading}
            >
              {startLoading ? 'Starting...' : 'Confirm'}
            </button>

            <button
              type="button"
              onClick={() => {
                props.setConfirmRidePopupPanel?.(false);
                props.setRidePopupPanel?.(false);
              }}
              className="w-full mt-2 bg-red-600 text-lg text-white font-semibold p-3 rounded-lg"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={resendOtp}
              className="w-full mt-2 bg-yellow-500 text-lg text-black font-semibold p-3 rounded-lg"
              disabled={resendLoading}
            >
              {resendLoading ? 'Resending...' : 'Resend OTP'}
            </button>

            {message && (
              <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfirmRidePopUp;
