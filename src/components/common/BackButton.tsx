import React from 'react'
import { useNavigate } from 'react-router-dom'

interface BackButtonProps {
  to?: string
  label?: string
  className?: string
}

export function BackButton({ to, label = "กลับ", className = "" }: BackButtonProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (to) {
      navigate(to)
    } else {
      navigate(-1) // Go back in history
    }
  }

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors font-medium ${className}`}
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  )
}