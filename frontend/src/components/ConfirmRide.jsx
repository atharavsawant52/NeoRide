// src/components/ConfirmRide.jsx
import React, { useState } from 'react';
import axios from 'axios';

const ConfirmRide = (props) => {
  const [loading, setLoading] = useState(false);
  const API_BASE = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BASE_URL ?? '').replace(/\/$/, '');

  const handleDummyPayment = async (method = 'cash') => {
    if (!props?.ride?._id) {
      alert('Ride not found. Please confirm ride first.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // set header for this request; also set global if you want
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // compute amount safely: if fare is an object, prefer fare.total else fallback index
      let amount = null;
      if (props?.fare == null) {
        amount = 0;
      } else if (typeof props.fare === 'object') {
        // if vehicleType key exists on fare object, use that; else try total
        amount = props.vehicleType ? props.fare[props.vehicleType] ?? props.fare.total : props.fare.total ?? 0;
      } else {
        amount = props.fare;
      }

      const response = await axios.post(
        `${API_BASE}/payment/dummy`,
        {
          rideId: props.ride._id,
          amount,
          method,
        },
        { headers }
      );

      if (response?.data?.success) {
        alert(`Payment successful! ID: ${response.data.paymentId}`);
      } else {
        console.warn('Dummy payment response:', response?.data);
        alert(response?.data?.message || 'Payment response received, check console.');
      }
    } catch (err) {
      console.error('Dummy payment error:', err.response ?? err);
      alert('Payment failed. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Render safe fare string
  const renderFare = () => {
    if (!props?.fare && props?.ride?.fare == null) return '—';
    const f = props.fare ?? props.ride?.fare;
    if (typeof f === 'object') {
      // prefer vehicle-specific or total
      const val = props.vehicleType ? f[props.vehicleType] ?? f.total : f.total ?? Object.values(f)[0];
      return val ?? '—';
    }
    return f;
  };

  return (
    <div>
      <h5
        className="p-1 text-center w-[93%] absolute top-0"
        onClick={() => {
          props.setConfirmRidePanel?.(false);
        }}
      >
        <i className="text-3xl text-gray-400 ri-arrow-down-wide-line"></i>
      </h5>

      <h3 className="text-2xl font-semibold mb-5">Confirm your Ride</h3>

      <div className="flex gap-2 justify-between flex-col items-center">
        <img
          className="h-20"
          src={
            props.vehicleType === 'car'
              ? 'https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg'
              : props.vehicleType === 'motorcycle'
              ? 'https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_638,w_956/v1649231091/assets/2c/7fa194-c954-49b2-9c6d-a3b8601370f5/original/Uber_Moto_Orange_312x208_pixels_Mobile.png'
              : props.vehicleType === 'auto'
              ? 'https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,h_368,w_552/v1648431773/assets/1d/db8c56-0204-4ce4-81ce-56a11a07fe98/original/Uber_Auto_558x372_pixels_Desktop.png'
              : props.vehicleType === 'taxi'
              ? 'https://d1a3f4spazzrp4.cloudfront.net/car-types/haloProductImages/v1.1/Taxi_v1.png'
              : props.vehicleType === 'carxl'
              ? 'https://d1a3f4spazzrp4.cloudfront.net/car-types/haloProductImages/UberXL_Premium.png'
              : 'https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg' // Default to car if vehicleType is unknown
          }
          alt="vehicle"
        />

        <div className="w-full mt-5">
          <div className="flex items-center gap-5 p-3 border-b-2">
            <i className="ri-map-pin-user-fill"></i>
            <div>
              <h3 className="text-lg font-medium">Pickup</h3>
              <p className="text-sm -mt-1 text-gray-600">{props.pickup ?? props.ride?.pickup ?? '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-5 p-3 border-b-2">
            <i className="text-lg ri-map-pin-2-fill"></i>
            <div>
              <h3 className="text-lg font-medium">Destination</h3>
              <p className="text-sm -mt-1 text-gray-600">{props.destination ?? props.ride?.destination ?? '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-5 p-3">
            <i className="ri-currency-line"></i>
            <div>
              <h3 className="text-lg font-medium">₹{renderFare()}</h3>
              <p className="text-sm -mt-1 text-gray-600">{props.paymentMethod ?? 'Cash'}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            props.setVehicleFound?.(true);
            props.setConfirmRidePanel?.(false);
            props.createRide?.();
          }}
          className="w-full mt-5 bg-green-600 text-white font-semibold p-2 rounded-lg"
        >
          Confirm Ride
        </button>

        <button
          disabled={loading}
          onClick={() => handleDummyPayment('cash')}
          className="w-full mt-3 bg-gray-800 text-white font-semibold p-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Pay with Cash (Dummy)'}
        </button>

        <button
          disabled={loading}
          onClick={() => handleDummyPayment('online')}
          className="w-full mt-2 bg-blue-600 text-white font-semibold p-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Pay Online (Dummy)'}
        </button>
      </div>
    </div>
  );
};

export default ConfirmRide;
