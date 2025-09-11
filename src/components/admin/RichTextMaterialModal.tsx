import React, { useState, useRef, useEffect } from 'react'
import QuillEditor, { QuillEditorRef } from '../editor/QuillEditor'
import type { WorkshopMaterial, TaskMaterial, SessionMaterial, DisplayMode } from '../../types/materials'

interface RichTextMaterialModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (materialData: {
    title: string
    content_type: 'rich_text'
    rich_content: any
    description?: string
    display_mode: DisplayMode
  }) => Promise<void>
  existingMaterial?: WorkshopMaterial | TaskMaterial | SessionMaterial | null
  title?: string
  loading?: boolean
}

export default function RichTextMaterialModal({
  isOpen,
  onClose,
  onSave,
  existingMaterial,
  title = 'สร้างเอกสารเนื้อหาใหม่',
  loading = false
}: RichTextMaterialModalProps) {
  const editorRef = useRef<QuillEditorRef>(null)
  const [materialTitle, setMaterialTitle] = useState('')
  const [description, setDescription] = useState('')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('content')
  const [editorContent, setEditorContent] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // Reset form when modal opens/closes or when existing material changes
  useEffect(() => {
    if (isOpen) {
      if (existingMaterial) {
        setMaterialTitle(existingMaterial.title || '')
        setDescription(existingMaterial.description || '')
        setDisplayMode(existingMaterial.display_mode || 'content')
        
        if (existingMaterial.rich_content) {
          setEditorContent(existingMaterial.rich_content)
          // Set content in editor after a brief delay to ensure it's mounted
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.setContent(existingMaterial.rich_content)
            }
          }, 100)
        }
      } else {
        // Reset for new material
        setMaterialTitle('')
        setDescription('')
        setDisplayMode('content')
        setEditorContent(null)
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.setContent('')
          }
        }, 100)
      }
      setError('')
    }
  }, [isOpen, existingMaterial])

  const handleSave = async () => {
    if (!materialTitle.trim()) {
      setError('กรุณาใส่ชื่อเอกสาร')
      return
    }

    if (!editorRef.current) {
      setError('ไม่สามารถเข้าถึง Editor ได้')
      return
    }

    const content = editorRef.current.getContent()
    if (!content || (content.ops && content.ops.length === 1 && !content.ops[0].insert.trim())) {
      setError('กรุณาเพิ่มเนื้อหา')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      await onSave({
        title: materialTitle.trim(),
        content_type: 'rich_text',
        rich_content: content,
        description: description.trim() || undefined,
        display_mode: displayMode
      })
      onClose()
    } catch (err) {
      console.error('Error saving rich text material:', err)
      setError('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditorChange = (content: any, delta: any, source: string, editor: any) => {
    setEditorContent(content)
    if (error) setError('') // Clear error when user starts typing
  }

  const handleEditorReady = (editor: any) => {
    // Focus editor after it's ready for better UX
    setTimeout(() => {
      if (!existingMaterial) {
        editor.focus()
      }
    }, 100)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {existingMaterial ? 'แก้ไขเอกสาร' : title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              สร้างเอกสารด้วย Rich Text Editor พร้อมการจัดรูปแบบขั้นสูง
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="material-title" className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อเอกสาร <span className="text-red-500">*</span>
                </label>
                <input
                  id="material-title"
                  type="text"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder="เช่น 'คู่มือการใช้งาน React'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="display-mode" className="block text-sm font-medium text-gray-700 mb-1">
                  รูปแบบการแสดงผล
                </label>
                <select
                  id="display-mode"
                  value={displayMode}
                  onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isSaving}
                >
                  <option value="content">แสดงเนื้อหา</option>
                  <option value="title">แสดงเฉพาะชื่อ</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="material-description" className="block text-sm font-medium text-gray-700 mb-1">
                คำอธิบาย (ไม่บังคับ)
              </label>
              <input
                id="material-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="คำอธิบายสั้นๆ เกี่ยวกับเอกสารนี้"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isSaving}
              />
            </div>

            {/* Rich Text Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เนื้อหาเอกสาร <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <QuillEditor
                  ref={editorRef}
                  value={editorContent}
                  onChange={handleEditorChange}
                  placeholder="เขียนเนื้อหาของเอกสารที่นี่... สามารถใช้เครื่องมือจัดรูปแบบข้างต้นได้"
                  height="400px"
                  onReady={handleEditorReady}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 เคล็ดลับ: สามารถแทรกรูปภาพ, วิดีโอ, ลิงก์ และจัดรูปแบบข้อความได้อย่างอิสระ
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving || loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                กำลังบันทึก...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {existingMaterial ? 'บันทึกการแก้ไข' : 'สร้างเอกสาร'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}