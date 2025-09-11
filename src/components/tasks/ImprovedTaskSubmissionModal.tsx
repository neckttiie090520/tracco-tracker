import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { UrlSubmissionDisplay } from './UrlSubmissionDisplay'
import { StatusBadge } from '../ui/StatusBadge'

interface TaskSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  submission: any
  formData: any
  setFormData: (data: any) => void
  onSubmit: (e: React.FormEvent) => void
  uploading: boolean
  onFileChange: (file: File | null) => void
  taskTitle?: string
}

export function ImprovedTaskSubmissionModal({ 
  isOpen, 
  onClose, 
  submission, 
  formData, 
  setFormData, 
  onSubmit, 
  uploading,
  onFileChange,
  taskTitle = 'งานที่กำหนด'
}: TaskSubmissionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    onFileChange(file)
  }

  const handleSubmitWithAnimation = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(e)
    
    // Show success animation after submission
    if (!submission) { // Only for new submissions
      setShowSuccessAnimation(true)
      setTimeout(() => {
        setShowSuccessAnimation(false)
        onClose()
      }, 2000)
    }
  }

  // Handle escape key and focus management
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) {
        onClose()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && e.target === modalRef.current && !uploading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    
    // Focus first input when modal opens
    const firstInput = modalRef.current?.querySelector('textarea') as HTMLTextAreaElement
    if (firstInput) {
      firstInput.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, uploading, onClose])

  if (!isOpen) return null

  const modalContent = (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm animate-fadeIn"
    >
      {showSuccessAnimation && (
        <div className="absolute inset-0 flex items-center justify-center z-[10000] pointer-events-none">
          <div className="bg-white rounded-3xl p-8 text-center animate-bounce shadow-2xl">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900">ส่งงานสำเร็จ!</h3>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 animate-slideIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-2xl">{submission ? '✏️' : '📤'}</span>
              </div>

              {/* Additional links (optional) */}
              <div className="mt-2 space-y-2">
                {(formData.links || []).slice(1).map((u: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="url"
                      value={u}
                      onChange={(e) => {
                        const val = e.target.value
                        setFormData((p: any) => {
                          const links = [...(p.links || [])]
                          links[i + 1] = val
                          return { ...p, links }
                        })
                      }}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder={`ลิงก์ที่ ${i + 2}`}
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((p: any) => ({ ...p, links: (p.links || []).filter((_: any, idx: number) => idx !== i + 1) }))}
                      className="px-2 py-1 text-xs border rounded text-gray-700 hover:bg-gray-50"
                    >ลบ</button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData((p: any) => ({ ...p, links: [...(p.links || [p.submission_url || '']), ''] }))}
                  className="text-xs text-blue-700 hover:underline"
                >+ เพิ่มลิงก์</button>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {submission ? 'แก้ไขงานที่ส่ง' : 'ส่งงาน'}
                </h2>
                <p className="text-blue-100">
                  {taskTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              disabled={uploading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
          <form onSubmit={handleSubmitWithAnimation} className="space-y-6">
            {/* Progress Indicator */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">ความคืบหน้าการกรอกข้อมูล</span>
                <span className="text-sm font-bold text-gray-900">
                  {[formData.notes.trim(), formData.submission_url.trim(), formData.file].filter(Boolean).length}/3
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${([formData.notes.trim(), formData.submission_url.trim(), formData.file].filter(Boolean).length / 3) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Notes Field */}
            <div className="group">
              <label htmlFor="notes" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <span className="text-xl mr-2">📝</span>
                <span>หมายเหตุ</span>
                <span className="ml-2 text-xs text-gray-500 font-normal">(ไม่บังคับ)</span>
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                placeholder="เพิ่มหมายเหตุเกี่ยวกับงานที่ส่ง เช่น ปัญหาที่พบ สิ่งที่เรียนรู้ หรือข้อสังเกต..."
                disabled={uploading}
              />
              <p className="text-xs text-gray-500 mt-2 text-right">
                {formData.notes.length}/500 ตัวอักษร
              </p>
            </div>

            {/* URL Field - Enhanced for multiple links */}
            <div className="group">
              <label htmlFor="submission_url" className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-3">
                <div className="flex items-center">
                  <span className="text-xl mr-2">🔗</span>
                  <span>URL ส่งงาน</span>
                  <span className="ml-2 text-xs text-gray-500 font-normal">(สามารถส่งได้หลายลิงก์)</span>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  รองรับหลาย URL
                </span>
              </label>
              
              {/* Primary URL Input */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="url"
                    id="submission_url"
                    value={formData.submission_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, submission_url: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="https://drive.google.com/... หรือ https://docs.google.com/..."
                    disabled={uploading}
                  />
                  {formData.submission_url && (
                    <div className="absolute right-3 top-3">
                      <StatusBadge status="completed" size="sm" showIcon={false} />
                    </div>
                  )}
                </div>

                {/* Additional URLs */}
                {(formData.additionalUrls || []).map((url: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 animate-slideIn">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...(formData.additionalUrls || [])]
                        newUrls[index] = e.target.value
                        setFormData(prev => ({ ...prev, additionalUrls: newUrls }))
                      }}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder={`ลิงก์เพิ่มเติม ${index + 2} (ไม่บังคับ)`}
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newUrls = (formData.additionalUrls || []).filter((_: any, i: number) => i !== index)
                        setFormData(prev => ({ ...prev, additionalUrls: newUrls }))
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="ลบลิงก์นี้"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Add More Links Button - Always visible */}
                <button
                  type="button"
                  onClick={() => {
                    const currentUrls = formData.additionalUrls || []
                    setFormData(prev => ({ ...prev, additionalUrls: [...currentUrls, ''] }))
                  }}
                  className="w-full py-3 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  เพิ่มลิงก์อื่นๆ (Google Drive, Canva, GitHub, etc.)
                </button>

                {/* Helper Text */}
                <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs text-blue-700">
                    <p className="font-semibold mb-1">💡 คุณสามารถส่งลิงก์ได้หลายลิงก์</p>
                    <p>เหมาะสำหรับงานที่มีหลายส่วน เช่น:</p>
                    <ul className="mt-1 space-y-0.5 ml-3">
                      <li>• Presentation + Source Code</li>
                      <li>• Design File + Documentation</li>
                      <li>• Main Project + Supporting Materials</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* URL Preview - Updated to show all URLs */}
              {(formData.submission_url || (formData.additionalUrls && formData.additionalUrls.length > 0)) && (
                <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200">
                  <p className="text-sm text-orange-700 mb-3 font-semibold flex items-center">
                    <span className="text-lg mr-2">👀</span>
                    ตัวอย่างลิงก์ที่จะส่ง ({1 + (formData.additionalUrls?.filter((u: string) => u).length || 0)} ลิงก์)
                  </p>
                  <div className="space-y-2">
                    {formData.submission_url && formData.submission_url.startsWith('http') && (
                      <div className="p-2 bg-white rounded-lg border border-orange-200">
                        <UrlSubmissionDisplay url={formData.submission_url} isSubmitted={false} />
                      </div>
                    )}
                    {(formData.additionalUrls || []).filter((u: string) => u && u.startsWith('http')).map((url: string, i: number) => (
                      <div key={i} className="p-2 bg-white rounded-lg border border-orange-200">
                        <UrlSubmissionDisplay url={url} isSubmitted={false} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* File Upload Field */}
            <div className="group">
              <label htmlFor="file-upload" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <span className="text-xl mr-2">📎</span>
                <span>อัปโหลดไฟล์</span>
                <span className="ml-2 text-xs text-gray-500 font-normal">(ไม่บังคับ, สูงสุด 10MB)</span>
              </label>
              
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="file-upload"
                  className={`block w-full p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                    formData.file 
                      ? 'border-green-400 bg-green-50' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  {formData.file ? (
                    <div className="space-y-2">
                      <div className="text-4xl">✅</div>
                      <p className="font-semibold text-green-800">{formData.file.name}</p>
                      <p className="text-sm text-green-600">{formatFileSize(formData.file.size)}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onFileChange(null)
                        }}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        ลบไฟล์
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-4xl text-gray-400">📤</div>
                      <p className="text-gray-600">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                      <p className="text-xs text-gray-500">รองรับไฟล์ทุกประเภท (สูงสุด 10MB)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Submission Summary */}
            {(formData.notes.trim() || formData.submission_url.trim() || (formData.additionalUrls && formData.additionalUrls.some((u: string) => u.trim())) || formData.file) && (
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-blue-900 flex items-center">
                  <span className="text-lg mr-2">📋</span>
                  สรุปงานที่จะส่ง
                </p>
                {formData.notes.trim() && (
                  <p className="text-sm text-blue-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>มีหมายเหตุแนบ</span>
                  </p>
                )}
                {(formData.submission_url.trim() || (formData.additionalUrls && formData.additionalUrls.some((u: string) => u.trim()))) && (
                  <p className="text-sm text-blue-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      มี URL งาน ({
                        (formData.submission_url.trim() ? 1 : 0) + 
                        (formData.additionalUrls?.filter((u: string) => u.trim()).length || 0)
                      } ลิงก์)
                    </span>
                  </p>
                )}
                {formData.file && (
                  <p className="text-sm text-blue-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>มีไฟล์แนบ ({formatFileSize(formData.file.size)})</span>
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-all disabled:opacity-50 hover-lift"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={uploading || (!formData.notes.trim() && !formData.submission_url.trim() && !formData.file)}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover-lift"
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังส่ง...</span>
                  </>
                ) : (
                  <>
                    <span>{submission ? 'อัปเดตงาน' : 'ส่งงาน'}</span>
                    <span className="text-lg">→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
