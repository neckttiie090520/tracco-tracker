// Enhanced Loading Button Component
// Provides consistent loading states for all submission operations

import React from 'react'

interface LoadingButtonProps {
  loading: boolean
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loadingText?: string
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
  loadingIcon?: React.ReactNode
}

export function LoadingButton({
  loading,
  disabled = false,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loadingText,
  children,
  className = '',
  icon,
  loadingIcon
}: LoadingButtonProps) {
  
  // Base styles
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4'
  
  // Variant styles
  const variantStyles = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl focus:ring-blue-500/20',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 focus:ring-gray-500/20',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl focus:ring-red-500/20',
    success: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl focus:ring-green-500/20'
  }
  
  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-3'
  }
  
  // Loading spinner component
  const LoadingSpinner = ({ size: spinnerSize }: { size: 'sm' | 'md' | 'lg' }) => {
    const spinnerSizes = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4', 
      lg: 'w-5 h-5'
    }
    
    return (
      <div className={`${spinnerSizes[spinnerSize]} border-2 border-current border-t-transparent rounded-full animate-spin`} />
    )
  }

  const isDisabled = loading || disabled

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${loading ? 'cursor-wait' : ''}
        ${className}
      `}
    >
      {loading ? (
        <>
          {loadingIcon || <LoadingSpinner size={size} />}
          <span>{loadingText || 'กำลังโหลด...'}</span>
        </>
      ) : (
        <>
          {icon && <span>{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  )
}

// Pre-configured buttons for common submission operations
export function SubmitButton({ loading, ...props }: Omit<LoadingButtonProps, 'variant' | 'loadingText'>) {
  return (
    <LoadingButton
      variant="primary"
      loadingText="กำลังส่ง..."
      loading={loading}
      {...props}
    />
  )
}

export function UpdateButton({ loading, ...props }: Omit<LoadingButtonProps, 'variant' | 'loadingText'>) {
  return (
    <LoadingButton
      variant="primary"
      loadingText="กำลังอัปเดต..."
      loading={loading}
      {...props}
    />
  )
}

export function DeleteButton({ loading, ...props }: Omit<LoadingButtonProps, 'variant' | 'loadingText'>) {
  return (
    <LoadingButton
      variant="danger"
      loadingText="กำลังลบ..."
      loading={loading}
      {...props}
    />
  )
}

export function CreateGroupButton({ loading, ...props }: Omit<LoadingButtonProps, 'variant' | 'loadingText'>) {
  return (
    <LoadingButton
      variant="success"
      loadingText="กำลังสร้างกลุ่ม..."
      loading={loading}
      {...props}
    />
  )
}

export function JoinGroupButton({ loading, ...props }: Omit<LoadingButtonProps, 'variant' | 'loadingText'>) {
  return (
    <LoadingButton
      variant="secondary"
      loadingText="กำลังเข้าร่วม..."
      loading={loading}
      {...props}
    />
  )
}

// Upload button with file upload icon
export function UploadButton({ loading, ...props }: Omit<LoadingButtonProps, 'variant' | 'loadingText' | 'icon'>) {
  return (
    <LoadingButton
      variant="primary"
      loadingText="กำลังอัปโหลด..."
      loading={loading}
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      }
      {...props}
    />
  )
}

// Loading overlay component for form sections
export function LoadingOverlay({ loading, children, message = 'กำลังโหลด...' }: {
  loading: boolean
  children: React.ReactNode
  message?: string
}) {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-10">
          <div className="flex items-center gap-3 bg-white shadow-lg rounded-full px-4 py-2 border">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-700 font-medium">{message}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Progress indicator for multi-step operations
export function OperationProgress({ 
  steps, 
  currentStep, 
  loading 
}: { 
  steps: string[]
  currentStep: number
  loading: boolean 
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">ขั้นตอนการดำเนินการ</span>
        <span className="text-gray-500">{currentStep + 1}/{steps.length}</span>
      </div>
      
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${index < currentStep ? 'bg-green-500 text-white' : 
                index === currentStep ? 'bg-blue-500 text-white' : 
                'bg-gray-200 text-gray-500'}
            `}>
              {index < currentStep ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.536a1 1 0 111.414-1.414l3.222 3.222 6.657-6.657a1 1 0 011.414 0z"/>
                </svg>
              ) : index === currentStep && loading ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                index + 1
              )}
            </div>
            <span className={`
              text-sm
              ${index < currentStep ? 'text-green-700 font-medium' : 
                index === currentStep ? 'text-blue-700 font-medium' : 
                'text-gray-500'}
            `}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}