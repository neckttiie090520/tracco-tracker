import React, { useState, forwardRef, useImperativeHandle } from 'react'

export interface SimpleTextEditorRef {
  getContent: () => string
  setContent: (content: string) => void
  getHTML: () => string
  focus: () => void
}

interface SimpleTextEditorProps {
  value?: string
  onChange?: (content: string) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
  height?: string
}

const SimpleTextEditor = forwardRef<SimpleTextEditorRef, SimpleTextEditorProps>(({
  value = '',
  onChange,
  placeholder = 'เขียนเนื้อหาของคุณที่นี่...',
  readOnly = false,
  className = '',
  height = '300px'
}, ref) => {
  const [content, setContent] = useState(value)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    getContent: () => content,
    setContent: (newContent: string) => {
      setContent(newContent)
      if (textareaRef.current) {
        textareaRef.current.value = newContent
      }
    },
    getHTML: () => content.replace(/\n/g, '<br>'),
    focus: () => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }))

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    if (onChange) {
      onChange(newContent)
    }
  }

  return (
    <div className={`simple-text-editor ${className}`}>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-sans"
        style={{ height, minHeight: height }}
      />
    </div>
  )
})

SimpleTextEditor.displayName = 'SimpleTextEditor'

export default SimpleTextEditor