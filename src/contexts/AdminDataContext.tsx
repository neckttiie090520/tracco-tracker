import React, { createContext, useContext, useReducer, ReactNode } from 'react'

interface AdminDataState {
  participantData: any
  loading: boolean
  error: string | null
  lastFetch: number
}

interface AdminDataAction {
  type: 'LOADING' | 'SUCCESS' | 'ERROR' | 'RESET'
  payload?: any
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const initialState: AdminDataState = {
  participantData: null,
  loading: false,
  error: null,
  lastFetch: 0
}

const adminDataReducer = (state: AdminDataState, action: AdminDataAction): AdminDataState => {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null }
    case 'SUCCESS':
      return {
        ...state,
        loading: false,
        error: null,
        participantData: action.payload,
        lastFetch: Date.now()
      }
    case 'ERROR':
      return { ...state, loading: false, error: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const AdminDataContext = createContext<{
  state: AdminDataState
  dispatch: React.Dispatch<AdminDataAction>
  isCacheValid: () => boolean
} | undefined>(undefined)

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(adminDataReducer, initialState)

  const isCacheValid = () => {
    return state.lastFetch > 0 && (Date.now() - state.lastFetch) < CACHE_DURATION
  }

  return (
    <AdminDataContext.Provider value={{ state, dispatch, isCacheValid }}>
      {children}
    </AdminDataContext.Provider>
  )
}

export function useAdminDataContext() {
  const context = useContext(AdminDataContext)
  if (context === undefined) {
    throw new Error('useAdminDataContext must be used within an AdminDataProvider')
  }
  return context
}