import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MaterialService } from '../../services/materials';
import { WorkshopMaterialDisplay } from '../materials/WorkshopMaterialDisplay';
import { detectMaterialType, convertToEmbedUrl, canEmbed, getDefaultDimensions, getFaviconUrl } from '../../utils/materialUtils';
import { fetchUrlMetadata } from '../../services/materialMetadata';
import type { SessionMaterial, CreateSessionMaterialRequest, DisplayMode } from '../../types/materials';

interface SessionMaterialsManagerProps {
  sessionId: string;
  sessionTitle: string;
}

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (material: CreateSessionMaterialRequest) => void;
  isLoading: boolean;
}

function AddMaterialModal({ isOpen, onClose, onAdd, isLoading }: AddMaterialModalProps) {
  const [url, setUrl] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('title');
  const [customTitle, setCustomTitle] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    canEmbed: boolean;
    suggestedTitle: string;
    materialType?: string;
  } | null>(null);

  const validateUrl = useCallback(async (inputUrl: string) => {
    if (!inputUrl.trim()) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    try {
      const metadata = await fetchUrlMetadata(inputUrl);
      const materialType = detectMaterialType(inputUrl);
      
      setValidationResult({
        valid: true,
        canEmbed: metadata.canEmbed,
        suggestedTitle: metadata.title,
        materialType
      });

      // Auto-select embed mode if available and no mode is selected yet
      if (metadata.canEmbed && displayMode === 'title') {
        setDisplayMode('embed');
      }
    } catch (error) {
      console.error('URL validation error:', error);
      setValidationResult({
        valid: false,
        canEmbed: false,
        suggestedTitle: '',
      });
    } finally {
      setIsValidating(false);
    }
  }, []);

  useEffect(() => {
    if (!url.trim()) {
      setValidationResult(null);
      return;
    }

    const timeoutId = setTimeout(() => validateUrl(url), 500);
    return () => clearTimeout(timeoutId);
  }, [url]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleSubmit = () => {
    if (!url.trim()) {
      alert('Please enter a URL');
      return;
    }

    // Allow submission even if validation is pending, but prefer validated title
    const finalTitle = customTitle.trim() || validationResult?.suggestedTitle || 'Untitled Material';

    onAdd({
      session_id: '', // Will be set by parent component
      url: url.trim(),
      title: finalTitle,
      display_mode: displayMode,
    });
  };

  const handleClose = () => {
    setUrl('');
    setDisplayMode('title');
    setCustomTitle('');
    setValidationResult(null);
    onClose();
  };

  const getPreviewMaterial = (): SessionMaterial | null => {
    if (!validationResult?.valid) return null;

    return {
      id: 'preview',
      session_id: '',
      title: customTitle.trim() || validationResult.suggestedTitle,
      type: detectMaterialType(url),
      url: url,
      embed_url: canEmbed(detectMaterialType(url)) ? convertToEmbedUrl(url, detectMaterialType(url)) : undefined,
      display_mode: displayMode,
      dimensions: getDefaultDimensions(detectMaterialType(url)),
      metadata: {
        title: validationResult.suggestedTitle,
        favicon: getFaviconUrl(url),
      },
      order_index: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Add Session Material</h2>
          
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material URL *
              </label>
              <input
                type="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://docs.google.com/... or https://canva.com/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              {isValidating && (
                <p className="mt-1 text-xs text-blue-600">Validating URL...</p>
              )}
              {validationResult?.valid === false && (
                <p className="mt-1 text-xs text-red-600">Unable to fetch this URL</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Supports Google Docs/Slides, Canva, YouTube, and other embeddable content
              </p>
            </div>

            {/* Custom Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Title (optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={validationResult?.suggestedTitle || 'Enter custom title...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {validationResult?.suggestedTitle && (
                <p className="mt-1 text-xs text-gray-500">
                  Suggested: {validationResult.suggestedTitle}
                </p>
              )}
            </div>

            {/* Display Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Display Mode *
              </label>
              <div className="space-y-3">
                <label className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="display-mode"
                    value="title"
                    checked={displayMode === 'title'}
                    onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Title</div>
                    <div className="text-xs text-gray-500">
                      Show favicon and title as styled card
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="display-mode"
                    value="link"
                    checked={displayMode === 'link'}
                    onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Link</div>
                    <div className="text-xs text-gray-500">
                      Show full URL with styled card
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="display-mode"
                    value="embed"
                    checked={displayMode === 'embed'}
                    onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
                    disabled={!validationResult?.canEmbed}
                    className="mt-1"
                  />
                  <div>
                    <div className={`font-medium ${!validationResult?.canEmbed ? 'text-gray-400' : ''}`}>
                      Embed
                    </div>
                    <div className="text-xs text-gray-500">
                      Show interactive preview (iframe)
                      {!validationResult?.canEmbed && ' - Not available for this URL'}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Preview */}
            {getPreviewMaterial() && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Preview - {displayMode.charAt(0).toUpperCase() + displayMode.slice(1)} Mode
                </label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <WorkshopMaterialDisplay material={getPreviewMaterial()!} />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This is how the material will appear to participants
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!url.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Adding...' : 'Add Material'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export function SessionMaterialsManager({ sessionId, sessionTitle }: SessionMaterialsManagerProps) {
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, [sessionId]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await MaterialService.getSessionMaterials(sessionId);
      setMaterials(data);
    } catch (error) {
      console.error('Error fetching session materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (materialRequest: CreateSessionMaterialRequest) => {
    setIsLoading(true);
    try {
      const request = {
        ...materialRequest,
        session_id: sessionId,
      };

      await MaterialService.createSessionMaterial(request);
      await fetchMaterials();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding session material:', error);
      // Handle error (show toast notification, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMaterial = (materialId: string) => {
    MaterialService.deleteSessionMaterial(materialId).then(() => {
      fetchMaterials();
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newMaterials = [...materials];
    [newMaterials[index - 1], newMaterials[index]] = [newMaterials[index], newMaterials[index - 1]];
    
    // Update order in backend
    const materialIds = newMaterials.map(m => m.id);
    MaterialService.reorderSessionMaterials(sessionId, materialIds).then(() => {
      fetchMaterials();
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === materials.length - 1) return;
    const newMaterials = [...materials];
    [newMaterials[index], newMaterials[index + 1]] = [newMaterials[index + 1], newMaterials[index]];
    
    // Update order in backend
    const materialIds = newMaterials.map(m => m.id);
    MaterialService.reorderSessionMaterials(sessionId, materialIds).then(() => {
      fetchMaterials();
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Session Materials</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Material
        </button>
      </div>

      {materials.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No materials added</h3>
          <p className="text-gray-600 mb-4">Add learning materials like Google Docs, Canva designs, or YouTube videos.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Add First Material
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {materials.map((material, index) => (
            <div key={material.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{material.title}</h4>
                  <p className="text-sm text-gray-500 break-all">{material.url}</p>
                  <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                    {material.display_mode} mode
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    title="Move up"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === materials.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    title="Move down"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => handleDeleteMaterial(material.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                    title="Delete material"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Preview */}
              <div className="border border-gray-100 rounded p-2 bg-gray-50">
                <WorkshopMaterialDisplay material={material} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Material Modal */}
      <AddMaterialModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddMaterial}
        isLoading={isLoading}
      />
    </div>
  );
}