import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { WorkshopMaterial, CreateMaterialRequest, DisplayMode } from '../../types/materials';
import { detectMaterialType, convertToEmbedUrl, canEmbed, getDefaultDimensions, getFaviconUrl } from '../../utils/materialUtils';
import { fetchUrlMetadata } from '../../services/materialMetadata';
import { WorkshopMaterialDisplay } from '../materials/WorkshopMaterialDisplay';
import RichTextMaterialModal from './RichTextMaterialModal';

interface MaterialManagerProps {
  workshopId: string;
  materials: WorkshopMaterial[];
  onMaterialsChange: (materials: WorkshopMaterial[]) => void;
  className?: string;
}

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (material: CreateMaterialRequest) => void;
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
    } catch (error) {
      setValidationResult({
        valid: false,
        canEmbed: false,
        suggestedTitle: 'Invalid URL'
      });
    }
    setIsValidating(false);
  }, []);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    validateUrl(newUrl);
  };

  // Create preview material based on current form state
  const getPreviewMaterial = useCallback(() => {
    if (!validationResult?.valid || !url.trim()) return null;

    return {
      id: 'preview',
      workshop_id: 'preview',
      title: customTitle.trim() || validationResult.suggestedTitle,
      type: detectMaterialType(url),
      url: url.trim(),
      embed_url: validationResult.canEmbed ? convertToEmbedUrl(url.trim(), detectMaterialType(url)) : undefined,
      display_mode: displayMode,
      dimensions: getDefaultDimensions(detectMaterialType(url)),
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        title: validationResult.suggestedTitle,
        favicon: getFaviconUrl(url)
      }
    };
  }, [url, customTitle, validationResult, displayMode]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() || !validationResult?.valid) return;

    const materialType = detectMaterialType(url);
    const embedUrl = canEmbed(materialType) ? convertToEmbedUrl(url, materialType) : undefined;
    const dimensions = getDefaultDimensions(materialType);

    onAdd({
      workshop_id: '',
      url: url.trim(),
      display_mode: displayMode,
      title: customTitle.trim() || validationResult.suggestedTitle,
      dimensions
    });
  };

  const resetForm = () => {
    setUrl('');
    setCustomTitle('');
    setDisplayMode('title');
    setValidationResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Add Workshop Material</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL Input */}
            <div>
              <label htmlFor="material-url" className="block text-sm font-medium text-gray-700 mb-2">
                Material URL *
              </label>
              <input
                id="material-url"
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://docs.google.com/document/d/... or https://www.canva.com/design/.../view"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              
              {/* URL Validation Status */}
              {isValidating && (
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Checking URL...
                </div>
              )}
              
              {validationResult && !isValidating && (
                <div className={`mt-2 text-sm ${validationResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {validationResult.valid ? (
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Valid URL detected
                      </div>
                      {validationResult.materialType && (
                        <div className="text-xs text-gray-500">
                          Type: {validationResult.materialType.replace('_', ' ')}
                        </div>
                      )}
                      {!validationResult.canEmbed && (
                        <div className="text-xs text-yellow-600">
                          ⚠️ This URL cannot be embedded. Only Title and Link modes available.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Invalid or unsupported URL
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom Title */}
            <div>
              <label htmlFor="material-title" className="block text-sm font-medium text-gray-700 mb-2">
                Custom Title (optional)
              </label>
              <input
                id="material-title"
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
                disabled={!url.trim() || !validationResult?.valid || isLoading}
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

export function MaterialManager({ workshopId, materials, onMaterialsChange, className = '' }: MaterialManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRichTextModal, setShowRichTextModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<WorkshopMaterial | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddMaterial = async (materialRequest: CreateMaterialRequest) => {
    setIsLoading(true);
    try {
      // In production, this would call an API to create the material
      const newMaterial: WorkshopMaterial = {
        id: `temp-${Date.now()}`,
        workshop_id: workshopId,
        title: materialRequest.title || '',
        type: detectMaterialType(materialRequest.url),
        url: materialRequest.url,
        embed_url: canEmbed(detectMaterialType(materialRequest.url)) 
          ? convertToEmbedUrl(materialRequest.url, detectMaterialType(materialRequest.url))
          : undefined,
        display_mode: materialRequest.display_mode,
        dimensions: materialRequest.dimensions,
        order_index: materials.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onMaterialsChange([...materials, newMaterial]);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding material:', error);
      // Handle error (show toast notification, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRichTextMaterial = async (materialData: {
    title: string;
    content_type: 'rich_text';
    rich_content: any;
    description?: string;
    display_mode: DisplayMode;
  }) => {
    setIsLoading(true);
    try {
      if (editingMaterial) {
        // Update existing material
        const updatedMaterial: WorkshopMaterial = {
          ...editingMaterial,
          title: materialData.title,
          type: 'rich_text',
          content_type: 'rich_text',
          rich_content: materialData.rich_content,
          description: materialData.description,
          display_mode: materialData.display_mode,
          url: '', // Rich text materials don't have URLs
          updated_at: new Date().toISOString()
        };

        onMaterialsChange(materials.map(m => m.id === editingMaterial.id ? updatedMaterial : m));
        setEditingMaterial(null);
      } else {
        // Create new rich text material
        const newMaterial: WorkshopMaterial = {
          id: `temp-${Date.now()}`,
          workshop_id: workshopId,
          title: materialData.title,
          type: 'rich_text',
          url: '', // Rich text materials don't have URLs
          content_type: 'rich_text',
          rich_content: materialData.rich_content,
          description: materialData.description,
          display_mode: materialData.display_mode,
          order_index: materials.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        onMaterialsChange([...materials, newMaterial]);
      }
      
      setShowRichTextModal(false);
    } catch (error) {
      console.error('Error saving rich text material:', error);
      // Handle error (show toast notification, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMaterial = (material: WorkshopMaterial) => {
    if (material.type === 'rich_text' || material.content_type === 'rich_text') {
      setEditingMaterial(material);
      setShowRichTextModal(true);
    } else {
      // For URL-based materials, you could open a different edit modal
      console.log('Editing URL-based material:', material);
    }
  };

  const handleDeleteMaterial = (materialId: string) => {
    onMaterialsChange(materials.filter(m => m.id !== materialId));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newMaterials = [...materials];
    [newMaterials[index - 1], newMaterials[index]] = [newMaterials[index], newMaterials[index - 1]];
    onMaterialsChange(newMaterials);
  };

  const handleMoveDown = (index: number) => {
    if (index === materials.length - 1) return;
    const newMaterials = [...materials];
    [newMaterials[index], newMaterials[index + 1]] = [newMaterials[index + 1], newMaterials[index]];
    onMaterialsChange(newMaterials);
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Workshop Materials</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRichTextModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            สร้างเอกสาร
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            เพิ่มลิงก์
          </button>
        </div>
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
                    onClick={() => handleEditMaterial(material)}
                    className="p-1 text-indigo-400 hover:text-indigo-600"
                    title="Edit material"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

      <AddMaterialModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddMaterial}
        isLoading={isLoading}
      />

      <RichTextMaterialModal
        isOpen={showRichTextModal}
        onClose={() => {
          setShowRichTextModal(false);
          setEditingMaterial(null);
        }}
        onSave={handleSaveRichTextMaterial}
        existingMaterial={editingMaterial}
        loading={isLoading}
      />
    </div>
  );
}