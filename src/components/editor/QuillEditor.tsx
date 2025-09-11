import React, { useEffect, useRef, forwardRef, useImperativeHandle, Suspense, lazy } from 'react'

// Dynamically import ReactQuill using React.lazy
const ReactQuill = lazy(() => import('react-quill'))

// Import Quill CSS
import 'react-quill/dist/quill.snow.css'

export interface QuillEditorRef {
  getContent: () => any
  setContent: (content: any) => void
  getHTML: () => string
  focus: () => void
}

interface QuillEditorProps {
  value?: any // Quill Delta or HTML
  onChange?: (content: any, delta: any, source: string, editor: any) => void
  placeholder?: string
  readOnly?: boolean
  theme?: 'snow' | 'bubble'
  className?: string
  height?: string
  onReady?: (editor: any) => void
}

// Enhanced toolbar configuration with all essential formatting options
const toolbarConfig = [
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  [{ 'font': [] }],
  [{ 'size': ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ 'color': [] }, { 'background': [] }],
  [{ 'script': 'sub' }, { 'script': 'super' }],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],
  [{ 'align': [] }],
  ['blockquote', 'code-block'],
  ['link', 'image', 'video'],
  ['clean']
]

const QuillEditor = forwardRef<QuillEditorRef, QuillEditorProps>(({
  value,
  onChange,
  placeholder = 'เขียนเนื้อหาของคุณที่นี่...',
  readOnly = false,
  theme = 'snow',
  className = '',
  height = '300px',
  onReady
}, ref) => {
  const quillRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    getContent: () => {
      if (quillRef.current) {
        const quill = quillRef.current.getEditor()
        return quill.getContents()
      }
      return null
    },
    setContent: (content: any) => {
      if (quillRef.current) {
        const quill = quillRef.current.getEditor()
        if (typeof content === 'string') {
          quill.clipboard.dangerouslyPasteHTML(content)
        } else {
          quill.setContents(content)
        }
      }
    },
    getHTML: () => {
      if (quillRef.current) {
        const quill = quillRef.current.getEditor()
        return quill.root.innerHTML
      }
      return ''
    },
    focus: () => {
      if (quillRef.current) {
        const quill = quillRef.current.getEditor()
        quill.focus()
      }
    }
  }))

  const modules = {
    toolbar: readOnly ? false : toolbarConfig,
    clipboard: {
      // Toggle to add extra line breaks when pasting HTML:
      matchVisual: false,
    }
  }

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ]

  useEffect(() => {
    // Custom image handler for better UX
    if (quillRef.current && !readOnly) {
      const quill = quillRef.current.getEditor()
      
      // Custom image upload handler
      const toolbar = quill.getModule('toolbar')
      toolbar.addHandler('image', () => {
        const input = document.createElement('input')
        input.setAttribute('type', 'file')
        input.setAttribute('accept', 'image/*')
        input.click()

        input.onchange = async () => {
          const file = input.files?.[0]
          if (file) {
            // For now, we'll use URL.createObjectURL for local preview
            // In production, you'd want to upload to your storage service
            const imageUrl = URL.createObjectURL(file)
            const range = quill.getSelection()
            quill.insertEmbed(range?.index || 0, 'image', imageUrl)
          }
        }
      })

      // Notify parent when editor is ready
      if (onReady) {
        onReady(quill)
      }
    }
  }, [readOnly, onReady])

  // Custom styles for the editor
  const editorStyles = `
    .quill-editor-container .ql-editor {
      min-height: ${height};
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .quill-editor-container .ql-editor h1 {
      font-size: 2em;
      font-weight: 600;
      margin: 1em 0 0.5em 0;
    }
    
    .quill-editor-container .ql-editor h2 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 0.83em 0 0.5em 0;
    }
    
    .quill-editor-container .ql-editor h3 {
      font-size: 1.17em;
      font-weight: 600;
      margin: 1em 0 0.5em 0;
    }
    
    .quill-editor-container .ql-editor p {
      margin: 0 0 1em 0;
    }
    
    .quill-editor-container .ql-editor ul, 
    .quill-editor-container .ql-editor ol {
      padding-left: 1.5em;
      margin: 1em 0;
    }
    
    .quill-editor-container .ql-editor blockquote {
      border-left: 4px solid #ddd;
      margin: 1em 0;
      padding: 0.5em 1em;
      background: #f9f9f9;
    }
    
    .quill-editor-container .ql-editor img {
      max-width: 100%;
      height: auto;
    }
    
    ${readOnly ? `
      .quill-editor-container .ql-container {
        border: none;
      }
      .quill-editor-container .ql-editor {
        padding: 0;
      }
    ` : ''}
  `

  return (
    <>
      <style jsx>{editorStyles}</style>
      <div className={`quill-editor-container ${className}`}>
        <Suspense fallback={<p>Loading editor...</p>}>
          <ReactQuill
            ref={quillRef}
            theme={theme}
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            placeholder={placeholder}
            modules={modules}
            formats={formats}
            style={{
              backgroundColor: readOnly ? 'transparent' : 'white'
            }}
          />
        </Suspense>
      </div>
    </>
  )
})

QuillEditor.displayName = 'QuillEditor'

export default QuillEditor