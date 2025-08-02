import React from 'react'
import { Link } from 'react-router-dom'

interface Workshop {
  id: string
  title: string
  description: string
  instructor: {
    name: string
    email: string
  }
  max_participants: number
  registrations: { count: number }[]
}

interface WorkshopCardProps {
  workshop: Workshop
}

export function WorkshopCard({ workshop }: WorkshopCardProps) {
  const participantCount = workshop.registrations?.[0]?.count || 0

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-gray-900 line-clamp-2">
            {workshop.title}
          </h3>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3 whitespace-pre-line">
          {workshop.description}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {workshop.instructor.name}
          </div>


          <div className="flex items-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {participantCount}/{workshop.max_participants} participants
          </div>
        </div>

        <Link
          to={`/workshops/${workshop.id}`}
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center px-4 py-2 rounded-md font-medium transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}