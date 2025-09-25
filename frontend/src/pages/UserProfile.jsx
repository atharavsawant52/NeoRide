import React, { useContext, useState } from 'react'
import axios from 'axios'
import { UserDataContext } from '../context/UserContext'
import { useNavigate, Link } from 'react-router-dom'

const UserProfile = () => {
  const { user, setUser } = useContext(UserDataContext)
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstname: user?.fullname?.firstname || '',
    lastname: user?.fullname?.lastname || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profilePic: null,
  })
  const [saving, setSaving] = useState(false)
  const [twoFA, setTwoFA] = useState(Boolean(user?.twoFactorEnabled))

  const API_BASE = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_BASE_URL ?? '').replace(/\/$/, '')

  const onChange = (e) => {
    const { name, value, files } = e.target
    if (name === 'profilePic') {
      setForm((f) => ({ ...f, profilePic: files?.[0] || null }))
    } else {
      setForm((f) => ({ ...f, [name]: value }))
    }
  }

  const toggle2FA = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/users/2fa/toggle`,
        { enabled: !twoFA },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      )
      const enabled = Boolean(res?.data?.twoFactorEnabled)
      setTwoFA(enabled)
      // reflect in context
      setUser({ ...(user || {}), twoFactorEnabled: enabled })
    } catch (err) {
      console.error('toggle 2FA (user) error:', err?.response ?? err)
      alert(err?.response?.data?.message || 'Failed to toggle 2FA')
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

      const res = await axios.patch(`${API_BASE}/users/profile`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const updated = res.data.user ?? res.data
      // update context so changes reflect across app
      setUser({ ...updated, type: 'user' })
      navigate('/home')
    } catch (err) {
      console.error('Update user profile error:', err?.response ?? err)
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
          <Link to='/home' className=' h-10 px-4 bg-black text-white flex items-center justify-center rounded-full'>Back</Link>
        </div>
      </div>

      <div className='pt-24 p-6 max-w-md mx-auto'>
        <h2 className='text-2xl font-semibold mb-4'>Edit Profile</h2>
        <div className='flex items-center justify-between p-3 mb-4 border rounded'>
          <div>
            <h4 className='font-medium'>Two-Step Authentication</h4>
            <p className='text-xs text-gray-600'>When turned on, we will email an OTP on each login.</p>
          </div>
          <button type='button' onClick={toggle2FA} className={`px-3 py-1 rounded ${twoFA ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
            {twoFA ? 'On' : 'Off'}
          </button>
        </div>
        <form onSubmit={onSubmit} className='space-y-4'>
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

export default UserProfile
