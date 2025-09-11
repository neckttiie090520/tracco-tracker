import React from 'react'

interface SimpleTextViewerProps {
  content?: string
  className?: string
  style?: React.CSSProperties
}

export default function SimpleTextViewer({ content, className = '', style }: SimpleTextViewerProps) {
  if (!content) {
    return (
      <div className={`simple-text-viewer ${className} text-gray-500 italic`} style={style}>
        ไม่มีเนื้อหาที่จะแสดง
      </div>
    )
  }

  // Convert line breaks to <br> tags for display
  const htmlContent = content.replace(/\n/g, '<br>')

  const viewerStyles = `
    .simple-text-viewer {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #374151;
      white-space: pre-wrap;
    }
    
    .simple-text-viewer p {
      margin: 0 0 1em 0;
    }
  `

  return (
    <>
      <style jsx>{viewerStyles}</style>
      <div 
        className={`simple-text-viewer ${className}`}
        style={style}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </>
  )
}