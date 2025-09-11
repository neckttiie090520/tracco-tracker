import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface AlertOptions {
  title?: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm'
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => Promise<boolean>
  showSuccess: (message: string, title?: string) => void
  showError: (message: string, title?: string) => void
  showWarning: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
  showConfirm: (message: string, title?: string) => Promise<boolean>
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider')
  }
  return context
}

interface AlertProviderProps {
  children: ReactNode
}

interface AlertState {
  isOpen: boolean
  options: AlertOptions | null
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    options: null
  })
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null)

  const showAlert = (options: AlertOptions): Promise<boolean> => {
    return new Promise((resolvePromise) => {
      setAlertState({
        isOpen: true,
        options
      })
      setResolve(() => resolvePromise)
    })
  }

  const hideAlert = () => {
    setAlertState({
      isOpen: false,
      options: null
    })
    setResolve(null)
  }

  const handleConfirm = async () => {
    const confirmed = true
    
    if (alertState.options?.onConfirm) {
      await alertState.options.onConfirm()
    }
    
    hideAlert()
    if (resolve) resolve(confirmed)
  }

  const handleCancel = () => {
    const confirmed = false
    
    if (alertState.options?.onCancel) {
      alertState.options.onCancel()
    }
    
    hideAlert()
    if (resolve) resolve(confirmed)
  }

  const showSuccess = (message: string, title?: string) => {
    showAlert({
      type: 'success',
      title: title || 'สำเร็จ',
      message,
      confirmText: 'ตกลง'
    })
  }

  const showError = (message: string, title?: string) => {
    showAlert({
      type: 'error',
      title: title || 'เกิดข้อผิดพลาด',
      message,
      confirmText: 'ตกลง'
    })
  }

  const showWarning = (message: string, title?: string) => {
    showAlert({
      type: 'warning',
      title: title || 'คำเตือน',
      message,
      confirmText: 'ตกลง'
    })
  }

  const showInfo = (message: string, title?: string) => {
    showAlert({
      type: 'info',
      title: title || 'ข้อมูล',
      message,
      confirmText: 'ตกลง'
    })
  }

  const showConfirm = (message: string, title?: string): Promise<boolean> => {
    return showAlert({
      type: 'confirm',
      title: title || 'ยืนยัน',
      message,
      confirmText: 'ตกลง',
      cancelText: 'ยกเลิก'
    })
  }

  const value: AlertContextType = {
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm
  }

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertModal
        isOpen={alertState.isOpen}
        options={alertState.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </AlertContext.Provider>
  )
}

interface AlertModalProps {
  isOpen: boolean
  options: AlertOptions | null
  onConfirm: () => void
  onCancel: () => void
}

function AlertModal({ isOpen, options, onConfirm, onCancel }: AlertModalProps) {
  if (!isOpen || !options) return null

  const getIcon = () => {
    switch (options.type) {
      case 'success':
        return (
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
      case 'warning':
        return (
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        )
      case 'info':
        return (
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'confirm':
        return (
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  const getButtonStyle = (type: 'confirm' | 'cancel') => {
    if (type === 'cancel') {
      return 'px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors'
    }
    
    switch (options.type) {
      case 'success':
        return 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
      case 'error':
        return 'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'
      case 'warning':
        return 'px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors'
      case 'info':
        return 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
      case 'confirm':
        return 'px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors'
      default:
        return 'px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors'
    }
  }

  const isConfirmDialog = options.type === 'confirm'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-200 scale-100 opacity-100">
        <div className="p-6 text-center">
          {getIcon()}
          
          {options.title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {options.title}
            </h3>
          )}
          
          <p className="text-gray-600 mb-6 whitespace-pre-line">
            {options.message}
          </p>
          
          <div className={`flex gap-3 ${isConfirmDialog ? 'justify-center' : 'justify-center'}`}>
            {isConfirmDialog && (
              <button
                onClick={onCancel}
                className={getButtonStyle('cancel')}
              >
                {options.cancelText || 'ยกเลิก'}
              </button>
            )}
            
            <button
              onClick={onConfirm}
              className={getButtonStyle('confirm')}
            >
              {options.confirmText || 'ตกลง'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}