import React, { useState, useEffect } from 'react'

interface UrlSubmissionDisplayProps {
  url: string
  className?: string
  isSubmitted?: boolean // ระบุว่าเป็นการแสดงงานที่ส่งแล้วหรือ preview
}

interface UrlMetadata {
  title: string
  favicon: string | null
  error?: boolean
}

export function UrlSubmissionDisplay({ url, className = '', isSubmitted = false }: UrlSubmissionDisplayProps) {
  const [metadata, setMetadata] = useState<UrlMetadata>({
    title: url,
    favicon: null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true)
        
        // Extract domain for favicon
        const urlObj = new URL(url)
        const domain = urlObj.hostname
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
        
        // Smart title generation based on popular services
        let title = domain
        
        if (domain.includes('github.com')) {
          const pathSegments = urlObj.pathname.split('/').filter(segment => segment)
          if (pathSegments.length >= 2) {
            title = `${pathSegments[0]}/${pathSegments[1]} - GitHub`
          } else {
            title = 'GitHub Repository'
          }
        } else if (domain.includes('drive.google.com')) {
          title = 'Google Drive Document'
        } else if (domain.includes('docs.google.com')) {
          title = 'Google Docs'
        } else if (domain.includes('sheets.google.com')) {
          title = 'Google Sheets'
        } else if (domain.includes('slides.google.com')) {
          title = 'Google Slides'
        } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
          title = 'YouTube Video'
        } else if (domain.includes('figma.com')) {
          title = 'Figma Design'
        } else if (domain.includes('canva.com')) {
          title = 'Canva Design'
        } else if (domain.includes('codepen.io')) {
          const pathSegments = urlObj.pathname.split('/').filter(segment => segment)
          if (pathSegments.length >= 2) {
            title = `CodePen by ${pathSegments[0]}`
          } else {
            title = 'CodePen'
          }
        } else if (domain.includes('codesandbox.io')) {
          title = 'CodeSandbox'
        } else if (domain.includes('replit.com')) {
          title = 'Replit Project'
        } else {
          // Generic title generation from path
          if (urlObj.pathname && urlObj.pathname !== '/') {
            const pathSegments = urlObj.pathname.split('/').filter(segment => segment)
            if (pathSegments.length > 0) {
              const lastSegment = pathSegments[pathSegments.length - 1]
              // Convert dash/underscore to spaces and capitalize
              title = lastSegment
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase())
                .substring(0, 50) // Limit length
            }
          }
        }
        
        setMetadata({
          title: title || domain,
          favicon: faviconUrl
        })
      } catch (error) {
        // Fallback for invalid URL
        setMetadata({
          title: url,
          favicon: null,
          error: true
        })
      } finally {
        setLoading(false)
      }
    }

    if (url) {
      fetchMetadata()
    }
  }, [url])

  const handleImageError = () => {
    setMetadata(prev => ({ ...prev, favicon: null }))
  }

  if (loading) {
    return (
      <div className={`border border-gray-200 rounded-lg p-4 bg-gray-50 ${className}`}>
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-gray-300 rounded animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`border-2 border-blue-300 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-200 shadow-sm hover:shadow-md ${className}`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center space-x-4 group"
      >
        {/* Favicon */}
        <div className="flex-shrink-0">
          {metadata.favicon && !metadata.error ? (
            <img
              src={metadata.favicon}
              alt="Favicon"
              className="w-8 h-8 rounded"
              onError={handleImageError}
            />
          ) : (
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          )}
        </div>

        {/* Title and URL */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h4 className="text-sm font-semibold text-blue-900 group-hover:text-blue-700 truncate">
              {metadata.title}
            </h4>
            <svg className="w-4 h-4 ml-2 text-blue-600 group-hover:text-blue-800 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
          <p className="text-xs text-blue-700 truncate mt-1">
            {url}
          </p>
        </div>

        {/* Submission indicator */}
        <div className="flex-shrink-0">
          {isSubmitted ? (
            <div className="bg-gradient-to-r from-green-100 to-green-200 border border-green-400 rounded-full px-3 py-1.5 shadow-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs font-semibold text-green-800"></span>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-orange-100 to-orange-200 border border-orange-400 rounded-full px-3 py-1.5 shadow-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-orange-800">กำลังรอส่ง</span>
              </div>
            </div>
          )}
        </div>
      </a>
    </div>
  )
}