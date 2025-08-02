import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUserProfile } from '../../hooks/useUserProfile'
import { Avatar, AvatarSelector } from '../common/Avatar'
import { userService } from '../../services/users'
import { profileEvents } from '../../utils/profileEvents'
import cmuFacultiesData from '../../data/CmuFaculties.json'
import cmuOrganizationsData from '../../data/CMUOrganizations.json'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user } = useAuth()
  const { profile, refetch } = useUserProfile(user)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    faculty: '',
    department: '',
    organization: '',
    bio: '',
    avatar_seed: '',
    avatar_saturation: 95,
    avatar_lightness: 45
  })

  const [isCustomFaculty, setIsCustomFaculty] = useState(false)
  const [isCustomOrganization, setIsCustomOrganization] = useState(false)
  const [customFaculty, setCustomFaculty] = useState('')
  const [customOrganization, setCustomOrganization] = useState('')

  // Check if form has unsaved changes
  const hasUnsavedChanges = profile ? (
    formData.name !== (profile.name || '') ||
    formData.faculty !== (profile.faculty || '') ||
    formData.department !== (profile.department || '') ||
    formData.organization !== (profile.organization || '') ||
    formData.bio !== (profile.bio || '') ||
    formData.avatar_seed !== (profile.avatar_seed || '') ||
    formData.avatar_saturation !== (profile.avatar_saturation || 95) ||
    formData.avatar_lightness !== (profile.avatar_lightness || 45)
  ) : false

  // Initialize form with user data
  useEffect(() => {
    if (profile && isOpen) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        faculty: profile.faculty || '',
        department: profile.department || '',
        organization: profile.organization || '',
        bio: profile.bio || '',
        avatar_seed: profile.avatar_seed || '',
        avatar_saturation: profile.avatar_saturation || 95,
        avatar_lightness: profile.avatar_lightness || 45
      })
      
      // Check if faculty/organization are custom values
      const isFacultyInList = cmuFacultiesData.faculties.some(f => f.th === profile.faculty || f.en === profile.faculty)
      const isOrgInList = cmuOrganizationsData.organizations.some(o => o.th === profile.organization || o.en === profile.organization)
      
      if (profile.faculty && !isFacultyInList) {
        setIsCustomFaculty(true)
        setCustomFaculty(profile.faculty)
      }
      
      if (profile.organization && !isOrgInList) {
        setIsCustomOrganization(true)
        setCustomOrganization(profile.organization)
      }
    }
  }, [profile, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Handle custom faculty selection
    if (name === 'faculty') {
      if (value === 'custom') {
        setIsCustomFaculty(true)
      } else {
        setIsCustomFaculty(false)
        setCustomFaculty('')
      }
    }
    
    // Handle custom organization selection
    if (name === 'organization') {
      if (value === 'custom') {
        setIsCustomOrganization(true)
      } else {
        setIsCustomOrganization(false)
        setCustomOrganization('')
      }
    }
  }

  const handleCustomFacultyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomFaculty(e.target.value)
    setFormData(prev => ({
      ...prev,
      faculty: e.target.value
    }))
  }

  const handleCustomOrganizationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomOrganization(e.target.value)
    setFormData(prev => ({
      ...prev,
      organization: e.target.value
    }))
  }

  const handleAvatarChange = (saturation: number, lightness: number, avatarSeed?: string) => {
    setFormData(prev => ({
      ...prev,
      avatar_seed: avatarSeed || '',
      avatar_saturation: saturation,
      avatar_lightness: lightness
    }))
    
    // No auto-save here - just update local form state for preview
    // User must explicitly click "Save Changes" to actually save to database
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      // Update profile via userService
      await userService.updateProfile(user.id, {
        name: formData.name,
        faculty: formData.faculty,
        department: formData.department,
        organization: formData.organization,
        bio: formData.bio,
        avatar_seed: formData.avatar_seed,
        avatar_saturation: formData.avatar_saturation,
        avatar_lightness: formData.avatar_lightness
      })

      // Refresh profile data to get latest from server
      await refetch()
      
      // Notify all components that profile has been updated
      profileEvents.notify()
      
      setSuccess(true)
      
      // Show success briefly then close
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  // Get faculty and organization options from CMU data
  const facultyOptions = cmuFacultiesData.faculties.map(f => ({ value: f.th, label: `${f.th} / ${f.en}` }))
  const organizationOptions = cmuOrganizationsData.organizations.map(o => ({ value: o.th, label: `${o.th} / ${o.en}` }))

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Profile updated successfully! ✨
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Avatar</h3>
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="text-center">
                    <Avatar
                      username={user?.email}
                      name={formData.name}
                      avatarSeed={formData.avatar_seed}
                      size={80}
                      saturation={formData.avatar_saturation}
                      lightness={formData.avatar_lightness}
                    />
                    <p className="text-xs text-gray-500 mt-2">Current Avatar</p>
                  </div>
                </div>
                <div className="flex-1">
                  <AvatarSelector
                    username={user?.email}
                    name={formData.name}
                    selectedSaturation={formData.avatar_saturation}
                    selectedLightness={formData.avatar_lightness}
                    selectedAvatarSeed={formData.avatar_seed}
                    onSelect={handleAvatarChange}
                  />
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label htmlFor="faculty" className="block text-sm font-medium text-gray-700 mb-1">
                    Faculty / คณะ
                  </label>
                  {!isCustomFaculty ? (
                    <select
                      id="faculty"
                      name="faculty"
                      value={formData.faculty}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    >
                      <option value="">Select Faculty / เลือกคณะ</option>
                      {facultyOptions.map(faculty => (
                        <option key={faculty.value} value={faculty.value}>{faculty.label}</option>
                      ))}
                      <option value="custom">กรอกเอง / Custom Input</option>
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={customFaculty}
                        onChange={handleCustomFacultyChange}
                        placeholder="Enter custom faculty / กรอกคณะของคุณ"
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomFaculty(false)
                          setCustomFaculty('')
                          setFormData(prev => ({ ...prev, faculty: '' }))
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Back to dropdown / กลับไปเลือกจากรายการ
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                    Organization / หน่วยงาน (Optional)
                  </label>
                  {!isCustomOrganization ? (
                    <select
                      id="organization"
                      name="organization"
                      value={formData.organization}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    >
                      <option value="">Select Organization / เลือกหน่วยงาน</option>
                      {organizationOptions.map(org => (
                        <option key={org.value} value={org.value}>{org.label}</option>
                      ))}
                      <option value="custom">กรอกเอง / Custom Input</option>
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={customOrganization}
                        onChange={handleCustomOrganizationChange}
                        placeholder="Enter custom organization / กรอกหน่วยงานของคุณ"
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomOrganization(false)
                          setCustomOrganization('')
                          setFormData(prev => ({ ...prev, organization: '' }))
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Back to dropdown / กลับไปเลือกจากรายการ
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="e.g., Computer Science"
                  />
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Bio (Optional)
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                disabled={loading}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                placeholder="Tell us a bit about yourself..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim() || !hasUnsavedChanges}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${
                  hasUnsavedChanges && !loading
                    ? 'text-white bg-blue-600 hover:bg-blue-700'
                    : 'text-gray-500 bg-gray-200 cursor-not-allowed'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                )}
                {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}