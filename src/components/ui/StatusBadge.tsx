import React from 'react'
import { BiTime, BiCheckCircle, BiAlarmExclamation, BiTask, BiUpload } from 'react-icons/bi'
import { FaSpinner, FaCheck } from 'react-icons/fa'

interface StatusBadgeProps {
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'submitted' | 'reviewed'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  animate?: boolean
}

const statusConfig = {
  pending: {
    label: 'รอดำเนินการ',
    icon: <BiTime className="w-3 h-3" />,
    className: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  in_progress: {
    label: 'กำลังทำ',
    icon: <FaSpinner className="w-3 h-3 animate-spin" />,
    className: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  completed: {
    label: 'เสร็จสิ้น',
    icon: <BiCheckCircle className="w-3 h-3" />,
    className: 'bg-green-100 text-green-800 border-green-300'
  },
  overdue: {
    label: 'เลยกำหนด',
    icon: <BiAlarmExclamation className="w-3 h-3" />,
    className: 'bg-red-100 text-red-800 border-red-300'
  },
  submitted: {
    label: 'ส่งแล้ว',
    icon: <BiUpload className="w-3 h-3" />,
    className: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  reviewed: {
    label: 'ตรวจแล้ว',
    icon: <FaCheck className="w-3 h-3" />,
    className: 'bg-teal-100 text-teal-800 border-teal-300'
  }
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base'
}

export function StatusBadge({ 
  status, 
  size = 'md', 
  showIcon = true,
  animate = false 
}: StatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <span className={`
      inline-flex items-center gap-1 
      font-semibold rounded-full 
      border ${config.className} 
      ${sizeClasses[size]}
      ${animate ? 'animate-pulse' : ''}
      transition-all duration-200
    `}>
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  )
}