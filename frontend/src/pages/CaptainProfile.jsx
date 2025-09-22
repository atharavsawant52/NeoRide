import React, { useContext, useState } from 'react'
import axios from 'axios'
import { CaptainDataContext } from '../context/CapatainContext'
import { useNavigate, Link } from 'react-router-dom'

const CaptainProfile = () => {
  const { captain, setCaptain } = useContext(CaptainDataContext)
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstname: captain?.fullname?.firstname || '',
    lastname: captain?.fullname?.lastname || '',
    email: captain?.email || '',
    phone: captain?.phone || '',
    profilePic: null,
    vehicleColor: captain?.vehicle?.color || '',
    vehiclePlate: captain?.vehicle?.plate || '',
    vehicleCapacity: captain?.vehicle?.capacity ?? '',
    vehicleType: captain?.vehicle?.vehicleType || 'car',
  })
  const [saving, setSaving] = useState(false)

  const API_BASE = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_BASE_URL ?? '').replace(/\/$/, '')

  const onChange = (e) => {
    const { name, value, files } = e.target
    if (name === 'profilePic') {
      setForm((f) => ({ ...f, profilePic: files?.[0] || null }))
    } else {
      setForm((f) => ({ ...f, [name]: value }))
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('fullname[firstname]', form.firstname)
      fd.append('fullname[lastname]', form.lastname)
      fd.append('email', form.email)
      if (form.phone) fd.append('phone', form.phone)
      if (form.profilePic) fd.append('profilePic', form.profilePic)

      // nested vehicle fields
      if (form.vehicleColor) fd.append('vehicle[color]', form.vehicleColor)
      if (form.vehiclePlate) fd.append('vehicle[plate]', form.vehiclePlate)
      if (form.vehicleCapacity !== '') fd.append('vehicle[capacity]', String(form.vehicleCapacity))
      if (form.vehicleType) fd.append('vehicle[vehicleType]', form.vehicleType)

      const res = await axios.patch(`${API_BASE}/captains/profile`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const updated = res.data.captain ?? res.data
      setCaptain({ ...updated, type: 'captain' })
      navigate('/captain-home')
    } catch (err) {
      console.error('Update captain profile error:', err?.response ?? err)
      alert(err?.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='min-h-screen bg-white'>
      <div className='fixed p-6 top-0 flex items-center justify-between w-screen z-40'>
        <img className='w-16' src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" alt="" />
        <div className='flex items-center gap-3'>
          <Link to='/captain-home' className=' h-10 px-4 bg-black text-white flex items-center justify-center rounded-full'>Back</Link>
        </div>
      </div>

      <div className='pt-24 p-6 max-w-md mx-auto'>
        <h2 className='text-2xl font-semibold mb-4'>Edit Profile</h2>
        <form onSubmit={onSubmit} className='space-y-4'>
          {captain?.profilePic && (
            <div className='flex items-center gap-3'>
              <img src={captain.profilePic} alt='current avatar' className='h-12 w-12 rounded-full object-cover' />
              <span className='text-sm text-gray-600'>Current photo</span>
            </div>
          )}
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-sm mb-1'>First name</label>
              <input name='firstname' value={form.firstname} onChange={onChange} className='w-full border rounded px-3 py-2' />
            </div>
            <div>
              <label className='block text-sm mb-1'>Last name</label>
              <input name='lastname' value={form.lastname} onChange={onChange} className='w-full border rounded px-3 py-2' />
            </div>
          </div>
          <div>
            <label className='block text-sm mb-1'>Email</label>
            <input name='email' type='email' value={form.email} onChange={onChange} className='w-full border rounded px-3 py-2' />
          </div>
          <div>
            <label className='block text-sm mb-1'>Phone</label>
            <input name='phone' value={form.phone} onChange={onChange} className='w-full border rounded px-3 py-2' />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-sm mb-1'>Vehicle color</label>
              <input name='vehicleColor' value={form.vehicleColor} onChange={onChange} className='w-full border rounded px-3 py-2' />
            </div>
            <div>
              <label className='block text-sm mb-1'>Vehicle plate</label>
              <input name='vehiclePlate' value={form.vehiclePlate} onChange={onChange} className='w-full border rounded px-3 py-2' />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-sm mb-1'>Capacity</label>
              <input name='vehicleCapacity' type='number' min='1' value={form.vehicleCapacity} onChange={onChange} className='w-full border rounded px-3 py-2' />
            </div>
            <div>
              <label className='block text-sm mb-1'>Vehicle type</label>
              <select name='vehicleType' value={form.vehicleType} onChange={onChange} className='w-full border rounded px-3 py-2'>
                <option value='car'>Car</option>
                <option value='motorcycle'>Motorcycle</option>
                <option value='auto'>Auto</option>
              </select>
            </div>
          </div>
          <div>
            <label className='block text-sm mb-1'>Profile picture</label>
            <input name='profilePic' type='file' accept='image/*' onChange={onChange} className='w-full' />
          </div>

          <button disabled={saving} type='submit' className='px-4 py-2 bg-black text-white rounded'>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CaptainProfile
