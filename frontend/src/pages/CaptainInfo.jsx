import React from 'react'
import { Link } from 'react-router-dom'
import CaptainDetails from '../components/CaptainDetails'

const CaptainInfo = () => {
  return (
    <div className='min-h-screen bg-white'>
      <div className='fixed p-6 top-0 flex items-center justify-between w-screen z-40'>
        <img className='w-16' src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" alt="" />
        <div className='flex items-center gap-3'>
          <Link to='/captain-home' className=' h-10 px-4 bg-black text-white flex items-center justify-center rounded-full'>
            Back
          </Link>
        </div>
      </div>

      <div className='pt-24 p-6'>
        <h2 className='text-2xl font-semibold mb-4'>Captain Info</h2>
        <CaptainDetails />
      </div>
    </div>
  )
}

export default CaptainInfo
