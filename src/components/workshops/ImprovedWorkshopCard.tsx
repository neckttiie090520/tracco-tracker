import React from 'react'
import { Link } from 'react-router-dom'
import { Workshop } from '../../types/workshop'
import { useWorkshopRegistration } from '../../hooks/useWorkshopRegistration'
import { StatusBadge } from '../ui/StatusBadge'
import { ProgressRing } from '../ui/ProgressRing'
import { formatDateShort } from '../../utils/date'

interface ImprovedWorkshopCardProps {
  workshop: Workshop
}

export function ImprovedWorkshopCard({ workshop }: ImprovedWorkshopCardProps) {
  const { registration, isRegistered, loading } = useWorkshopRegistration(workshop.id)

  return (
    <div className={`
      group relative bg-white rounded-xl overflow-hidden
      shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1
      ${isRegistered ? 'ring-2 ring-indigo-400' : ''}
    `}>
      {/* Compact Header */}
      <div className="relative h-20 bg-indigo-600 p-4">
        <div className="relative z-10 flex justify-between items-center h-full">
          <div className="text-white">
            <p className="text-sm font-medium opacity-90">
              {workshop.start_time ? formatDateShort(workshop.start_time, 'CE') : 'Workshop'}
            </p>
          </div>
          {isRegistered && (
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-white text-xs font-medium">ลงทะเบียนแล้ว</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title & Description */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {workshop.title}
        </h3>
        
        {workshop.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {workshop.description}
          </p>
        )}

        {/* Instructor */}
        {(workshop.instructor_user?.name || workshop.instructor) && (
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm text-gray-700">
              <span className="text-gray-500">วิทยากร:</span>{' '}
              <span className="font-medium">{workshop.instructor_user?.name || workshop.instructor}</span>
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{workshop.max_participants} ที่นั่ง</span>
          </div>
        </div>

        {/* Date & Time */}
        {workshop.start_time && (
          <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDateShort(workshop.start_time, 'CE')}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {new Date(workshop.start_time).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        )}

        {/* Status */}
        {!isRegistered && (
          <div className="mb-3">
            <StatusBadge 
              status="pending"
              size="sm"
              showIcon={true}
            />
          </div>
        )}

        {/* Action Button */}
        <Link
          to={`/workshops/${workshop.id}`}
          className="btn btn-primary block w-full text-center py-2 text-sm hover:shadow-md hover:scale-[1.01]"
        >
          ดูรายละเอียด
        </Link>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  )
}
