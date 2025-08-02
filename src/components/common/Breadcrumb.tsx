import React from 'react'
import { Link, useLocation } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  path?: string
  icon?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const location = useLocation()

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <Link 
        to="/dashboard" 
        className="flex items-center hover:text-blue-600 transition-colors"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Home
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          
          {item.path && index !== items.length - 1 ? (
            <Link 
              to={item.path} 
              className="flex items-center hover:text-blue-600 transition-colors"
            >
              {item.icon && <span className="mr-1">{item.icon}</span>}
              {item.label}
            </Link>
          ) : (
            <span className={`flex items-center ${index === items.length - 1 ? 'text-gray-900 font-medium' : ''}`}>
              {item.icon && <span className="mr-1">{item.icon}</span>}
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}