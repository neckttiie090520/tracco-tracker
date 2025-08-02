import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { UrlSubmissionDisplay } from './UrlSubmissionDisplay'

interface TaskSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  submission: any
  formData: any
  setFormData: (data: any) => void
  onSubmit: (e: React.FormEvent) => void
  uploading: boolean
  onFileChange: (file: File | null) => void
}

export function TaskSubmissionModal({ 
  isOpen, 
  onClose, 
  submission, 
  formData, 
  setFormData, 
  onSubmit, 
  uploading,
  onFileChange 
}: TaskSubmissionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-200 scale-100 opacity-100">
        <div className="p-6">
          {/* Modal Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={submission ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 19l9 2-9-18-9 18 9-2zm0 0v-8"} />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {submission ? 'แก้ไขงานที่ส่ง' : 'ส่งงาน'}
                </h2>
                <p className="text-sm text-gray-600">
                  {submission ? 'แก้ไขหรือเพิ่มเติมงานที่ส่งแล้ว' : 'กรอกข้อมูลเพื่อส่งงาน'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={uploading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Notes Field */}
            <div>
              <label htmlFor="notes" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                หมายเหตุ (ไม่บังคับ)
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="เพิ่มหมายเหตุเกี่ยวกับงานที่ส่ง เช่น ปัญหาที่พบ สิ่งที่เรียนรู้ หรือข้อสังเกต..."
                disabled={uploading}
              />
            </div>

            {/* URL Field */}
            <div>
              <label htmlFor="submission_url" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                URL ส่งงาน (ไม่บังคับ)
              </label>
              <input
                type="url"
                id="submission_url"
                value={formData.submission_url}
                onChange={(e) => setFormData(prev => ({ ...prev, submission_url: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="https://www.canva.com/design/ or https://docs.google.com/..., etc."
                disabled={uploading}
              />
              
              {/* URL Preview */}
              {formData.submission_url && formData.submission_url.startsWith('http') && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <p className="text-sm text-orange-700 mb-3 font-semibold flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    ตัวอย่างงานที่จะส่ง
                  </p>
                  <UrlSubmissionDisplay url={formData.submission_url} isSubmitted={false} />
                </div>
              )}
            </div>

            {/* File Upload Field */}
            <div>
              <label htmlFor="file-upload" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                อัปโหลดไฟล์ (ไม่บังคับ)
              </label>
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={uploading}
              />
              {formData.file && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">เลือกไฟล์แล้ว:</span> 
                    <span className="ml-1">{formData.file.name}</span>
                    <span className="ml-2 text-green-600">({formatFileSize(formData.file.size)})</span>
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={uploading || (!formData.notes.trim() && !formData.submission_url.trim() && !formData.file)}
                className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {uploading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                )}
                {uploading ? 'กำลังส่ง...' : (submission ? 'อัปเดตงาน' : 'ส่งงาน')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}