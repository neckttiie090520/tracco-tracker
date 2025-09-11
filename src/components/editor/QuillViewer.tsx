import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import DOMPurify from 'dompurify'

// Dynamically import ReactQuill to prevent SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  )
})

// Import Quill CSS
import 'react-quill/dist/quill.snow.css'

interface QuillViewerProps {
  content?: any // Quill Delta format
  html?: string // HTML content
  className?: string
  style?: React.CSSProperties
}

export default function QuillViewer({ content, html, className = '', style }: QuillViewerProps) {
  const [sanitizedHTML, setSanitizedHTML] = useState<string>('')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    let htmlToSanitize = ''

    if (html) {
      htmlToSanitize = html
    } else if (content) {
      // Convert Quill Delta to HTML
      if (typeof window !== 'undefined') {
        const Quill = require('quill')
        const tempDiv = document.createElement('div')
        const tempQuill = new Quill(tempDiv)
        tempQuill.setContents(content)
        htmlToSanitize = tempQuill.root.innerHTML
      }
    }

    if (htmlToSanitize) {
      // Sanitize HTML to prevent XSS
      const clean = DOMPurify.sanitize(htmlToSanitize, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 's', 'sub', 'sup',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li',
          'blockquote', 'pre', 'code',
          'a', 'img',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'div', 'span'
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'width', 'height',
          'class', 'style', 'target', 'rel'
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
      })
      setSanitizedHTML(clean)
    }
  }, [content, html, isClient])

  if (!isClient) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    )
  }

  const viewerStyles = `
    .quill-viewer {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #374151;
    }
    
    .quill-viewer h1 {
      font-size: 2em;
      font-weight: 600;
      margin: 1.5em 0 0.75em 0;
      color: #1f2937;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0.25em;
    }
    
    .quill-viewer h2 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 1.25em 0 0.5em 0;
      color: #1f2937;
    }
    
    .quill-viewer h3 {
      font-size: 1.25em;
      font-weight: 600;
      margin: 1em 0 0.5em 0;
      color: #374151;
    }
    
    .quill-viewer h4 {
      font-size: 1.1em;
      font-weight: 600;
      margin: 1em 0 0.5em 0;
      color: #374151;
    }
    
    .quill-viewer h5, .quill-viewer h6 {
      font-size: 1em;
      font-weight: 600;
      margin: 1em 0 0.5em 0;
      color: #4b5563;
    }
    
    .quill-viewer p {
      margin: 0 0 1em 0;
    }
    
    .quill-viewer ul, 
    .quill-viewer ol {
      padding-left: 1.5em;
      margin: 1em 0;
    }
    
    .quill-viewer li {
      margin: 0.25em 0;
    }
    
    .quill-viewer blockquote {
      border-left: 4px solid #6366f1;
      margin: 1.5em 0;
      padding: 1em 1.5em;
      background: #f8fafc;
      border-radius: 0 8px 8px 0;
      font-style: italic;
    }
    
    .quill-viewer pre {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1em;
      overflow-x: auto;
      font-family: 'Menlo', 'Monaco', 'Cascadia Code', 'Segoe UI Mono', monospace;
      font-size: 13px;
      line-height: 1.4;
    }
    
    .quill-viewer code {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 0.125em 0.25em;
      font-family: 'Menlo', 'Monaco', 'Cascadia Code', 'Segoe UI Mono', monospace;
      font-size: 0.875em;
    }
    
    .quill-viewer pre code {
      background: none;
      border: none;
      padding: 0;
    }
    
    .quill-viewer img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      margin: 1em 0;
    }
    
    .quill-viewer a {
      color: #6366f1;
      text-decoration: underline;
      text-decoration-color: rgba(99, 102, 241, 0.3);
      text-underline-offset: 2px;
      transition: all 0.2s ease;
    }
    
    .quill-viewer a:hover {
      color: #4f46e5;
      text-decoration-color: #4f46e5;
    }
    
    .quill-viewer strong {
      font-weight: 600;
      color: #1f2937;
    }
    
    .quill-viewer em {
      font-style: italic;
    }
    
    .quill-viewer u {
      text-decoration: underline;
    }
    
    .quill-viewer s {
      text-decoration: line-through;
    }
    
    .quill-viewer sub {
      font-size: 0.75em;
      vertical-align: sub;
    }
    
    .quill-viewer sup {
      font-size: 0.75em;
      vertical-align: super;
    }
    
    .quill-viewer table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .quill-viewer th,
    .quill-viewer td {
      border: 1px solid #e5e7eb;
      padding: 0.75em;
      text-align: left;
    }
    
    .quill-viewer th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    
    .quill-viewer tr:nth-child(even) td {
      background: #f9fafb;
    }
  `

  // If we have content but no HTML yet, show the QuillEditor in read-only mode
  if (content && !html && !sanitizedHTML) {
    return (
      <>
        <style jsx>{viewerStyles}</style>
        <div className={`quill-viewer ${className}`} style={style}>
          <ReactQuill
            value={content}
            readOnly={true}
            theme="snow"
            modules={{ toolbar: false }}
          />
        </div>
      </>
    )
  }

  // Render sanitized HTML
  if (sanitizedHTML) {
    return (
      <>
        <style jsx>{viewerStyles}</style>
        <div 
          className={`quill-viewer ${className}`}
          style={style}
          dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
        />
      </>
    )
  }

  // Empty state
  return (
    <div className={`quill-viewer ${className} text-gray-500 italic`} style={style}>
      ไม่มีเนื้อหาที่จะแสดง
    </div>
  )
}