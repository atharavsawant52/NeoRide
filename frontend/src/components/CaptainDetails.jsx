import React, { useContext, useEffect, useState } from 'react'
import { CaptainDataContext } from '../context/CapatainContext'
import axios from 'axios'

const CaptainDetails = () => {
  const { captain } = useContext(CaptainDataContext)

  const [stats, setStats] = useState({
    earnings: 0,
    ridesCount: 0,
    hoursWorked: 0,
    rating: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log("🌍 API URL:", import.meta.env.VITE_BACKEND_URL)

        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/captains/stats`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        )

        console.log("📊 /captains/stats API Response:", res.data)

        // ✅ Handle both: { stats: {...} } or direct { earnings, ridesCount... }
        const statsData = res.data.stats ? res.data.stats : res.data

        console.log("✅ Final Stats Used in Component:", statsData)

        setStats(statsData || {})
      } catch (err) {
        console.error('❌ Error fetching stats:', err)
        setError('Failed to load stats')
      } finally {
        setLoading(false)
      }
    }

    if (captain) fetchStats()
  }, [captain])

  if (!captain) {
    return <p className="text-center text-gray-500">No captain data available</p>
  }

  return (
    <div>
      {/* Top Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-start gap-3">
          <img
            className="h-10 w-10 rounded-full object-cover"
            src={captain.profilePic}
            alt="Captain"
          />
          <h4 className="text-lg font-medium capitalize">
            {captain.fullname.firstname + ' ' + captain.fullname.lastname}
          </h4>
        </div>
        <div>
          <h4 className="text-xl font-semibold">
            ₹
            {loading
              ? '...'
              : (Number(stats.earnings) || 0).toFixed(2)}
          </h4>
          <p className="text-sm text-gray-600">Earned</p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="flex p-3 mt-8 bg-gray-100 rounded-xl justify-center gap-5 items-start">
        <div className="text-center">
          <i className="text-3xl mb-2 font-thin ri-timer-2-line"></i>
          <h5 className="text-lg font-medium">
            {loading ? '...' : (Number(stats.hoursWorked) || 0).toFixed(1)}
          </h5>
          <p className="text-sm text-gray-600">Hours Online</p>
        </div>

        <div className="text-center">
          <i className="text-3xl mb-2 font-thin ri-speed-up-line"></i>
          <h5 className="text-lg font-medium">
            {loading ? '...' : (Number(stats.ridesCount) || 0)}
          </h5>
          <p className="text-sm text-gray-600">Total Rides</p>
        </div>

        <div className="text-center">
          <i className="text-3xl mb-2 font-thin ri-star-line"></i>
          <h5 className="text-lg font-medium">
            {loading ? '...' : stats.rating ?? 'N/A'}
          </h5>
          <p className="text-sm text-gray-600">Rating</p>
        </div>
      </div>

      {error && <p className="text-red-500 text-center mt-4">{error}</p>}
    </div>
  )
}

export default CaptainDetails
