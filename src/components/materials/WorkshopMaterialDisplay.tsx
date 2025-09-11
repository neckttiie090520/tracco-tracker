import React, { useState } from 'react';
import type { WorkshopMaterial } from '../../types/materials';
import { getDomainName, getFaviconUrl } from '../../utils/materialUtils';
import QuillViewer from '../editor/QuillViewer';

interface WorkshopMaterialDisplayProps {
  material: WorkshopMaterial;
  className?: string;
}

export function WorkshopMaterialDisplay({ material, className = '' }: WorkshopMaterialDisplayProps) {
  const [embedError, setEmbedError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setEmbedError(true);
    setIsLoading(false);
  };

  const renderTitle = () => {
    // Handle rich text materials differently
    if (material.type === 'rich_text') {
      return (
        <div className={`inline-flex items-center space-x-3 p-3 border rounded-lg bg-indigo-50 border-indigo-200 text-indigo-700 ${className}`}>
          <div className="flex items-center space-x-2 flex-1">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{material.title}</div>
              <div className="text-xs opacity-75">เอกสารเนื้อหา</div>
            </div>
          </div>
        </div>
      );
    }

    const favicon = material.metadata?.favicon || getFaviconUrl(material.url);
    const title = material.title || material.metadata?.title || getDomainName(material.url);
    const domain = getDomainName(material.url);

    // Get colors based on material type
    const getTypeColors = () => {
      switch (material.type) {
        case 'google_doc':
          return 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100';
        case 'google_slide':
          return 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100';
        case 'google_sheet':
          return 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100';
        case 'drive_file':
          return 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100';
        case 'canva_embed':
        case 'canva_link':
          return 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100';
        case 'youtube':
          return 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100';
        case 'rich_text':
          return 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100';
        default:
          return 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100';
      }
    };

    return (
      <a
        href={material.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center space-x-3 p-3 border rounded-lg transition-all duration-200 group ${getTypeColors()} ${className}`}
      >
        <div className="flex items-center space-x-2 flex-1">
          <img
            src={favicon}
            alt=""
            className="w-5 h-5 flex-shrink-0"
            onError={(e) => {
              e.currentTarget.src = '/default-favicon.ico';
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{title}</div>
            <div className="text-xs opacity-75">{domain}</div>
          </div>
        </div>
        <svg
          className="w-4 h-4 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    );
  };

  const renderLink = () => {
    const favicon = material.metadata?.favicon || getFaviconUrl(material.url);
    const title = material.title || material.metadata?.title || getDomainName(material.url);

    // Get colors based on material type (same as title mode)
    const getTypeColors = () => {
      switch (material.type) {
        case 'google_doc':
          return 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100';
        case 'google_slide':
          return 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100';
        case 'google_sheet':
          return 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100';
        case 'drive_file':
          return 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100';
        case 'canva_embed':
        case 'canva_link':
          return 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100';
        case 'youtube':
          return 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100';
        default:
          return 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100';
      }
    };

    return (
      <a
        href={material.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block p-4 border rounded-lg transition-all duration-200 group ${getTypeColors()} ${className}`}
      >
        <div className="flex items-start space-x-3">
          <img
            src={favicon}
            alt=""
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            onError={(e) => {
              e.currentTarget.src = '/default-favicon.ico';
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-1">{title}</div>
            <div className="text-xs opacity-75 break-all font-mono bg-white bg-opacity-50 px-2 py-1 rounded">
              {material.url}
            </div>
          </div>
          <svg
            className="w-4 h-4 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </div>
      </a>
    );
  };

  const renderEmbed = () => {
    const embedUrl = material.embed_url || material.url;
    const width = material.dimensions?.width || '100%';
    const height = material.dimensions?.height || '400px';

    // If embed failed or material doesn't support embedding, fall back to title display
    if (embedError || !material.embed_url) {
      return (
        <div className={`border border-gray-200 rounded-lg p-6 text-center bg-gray-50 ${className}`}>
          <div className="mb-4">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {material.title || 'External Link'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This content cannot be embedded. Click the link below to view it in a new tab.
            </p>
          </div>
          {renderTitle()}
        </div>
      );
    }

    return (
      <div className={`relative ${className}`} style={{ width, height }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading content...</p>
            </div>
          </div>
        )}
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
          className="rounded-lg border border-gray-200"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
          title={material.title || 'Workshop Material'}
        />
      </div>
    );
  };

  const renderContent = () => {
    if (material.type !== 'rich_text' || !material.rich_content) {
      return (
        <div className="text-gray-500 italic p-4 text-center">
          ไม่มีเนื้อหาที่จะแสดง
        </div>
      );
    }

    return (
      <div className={`rich-text-material ${className}`}>
        {material.title && (
          <div className="mb-4 pb-2 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{material.title}</h3>
            {material.description && (
              <p className="text-sm text-gray-600 mt-1">{material.description}</p>
            )}
          </div>
        )}
        <QuillViewer 
          content={material.rich_content}
          className="rich-text-content"
        />
      </div>
    );
  };

  // Handle rich text materials
  if (material.type === 'rich_text') {
    switch (material.display_mode) {
      case 'title':
        return (
          <div className={`rich-text-title-mode ${className}`}>
            <div className="inline-flex items-center space-x-3 p-3 border rounded-lg bg-indigo-50 border-indigo-200 text-indigo-700">
              <div className="flex items-center space-x-2 flex-1">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{material.title}</div>
                  <div className="text-xs opacity-75">เอกสารเนื้อหา</div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'content':
      default:
        return renderContent();
    }
  }

  // Handle URL-based materials
  switch (material.display_mode) {
    case 'title':
      return renderTitle();
    case 'link':
      return renderLink();
    case 'embed':
      return renderEmbed();
    default:
      return renderTitle();
  }
}

// Component for displaying a list of materials
interface WorkshopMaterialsListProps {
  materials: WorkshopMaterial[];
  className?: string;
}

export function WorkshopMaterialsList({ materials, className = '' }: WorkshopMaterialsListProps) {
  if (materials.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <svg
          className="w-12 h-12 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No materials available</h3>
        <p className="text-gray-600">Workshop materials will appear here when added.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {materials.map((material) => (
        <div key={material.id} className="group">
          {/* Material Title (always shown for context) */}
          {material.display_mode !== 'title' && (
            <div className="mb-2">
              <h4 className="text-sm font-medium text-gray-700">
                {material.title || getDomainName(material.url)}
              </h4>
            </div>
          )}
          
          {/* Material Content */}
          <WorkshopMaterialDisplay material={material} />
          
          {/* Optional metadata display */}
          {material.metadata?.description && material.display_mode === 'embed' && (
            <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{material.metadata.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}