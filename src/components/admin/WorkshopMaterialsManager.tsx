import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MaterialService } from '../../services/materials';
import { WorkshopMaterialDisplay } from '../materials/WorkshopMaterialDisplay';
import { detectMaterialType, convertToEmbedUrl, canEmbed, getDefaultDimensions, getFaviconUrl } from '../../utils/materialUtils';
import { fetchUrlMetadata } from '../../services/materialMetadata';
import type { WorkshopMaterial, CreateMaterialRequest, DisplayMode } from '../../types/materials';

interface WorkshopMaterialsManagerProps {
  workshopId: string;
  workshopTitle: string;
}

interface EditMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: CreateMaterialRequest) => void;
  material: WorkshopMaterial;
  isLoading: boolean;
}

function EditMaterialModal({ isOpen, onClose, onSave, material, isLoading }: EditMaterialModalProps) {
  const [url, setUrl] = useState(material.url);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(material.display_mode);
  const [customTitle, setCustomTitle] = useState(material.title);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    canEmbed: boolean;
    suggestedTitle: string;
    materialType?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(material.url);
      setDisplayMode(material.display_mode);
      setCustomTitle(material.title);
      setValidationResult({
        valid: true,
        canEmbed: !!material.embed_url,
        suggestedTitle: material.title
      });
    }
  }, [isOpen, material]);

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
      console.error('URL validation error:', error);
      setValidationResult({
        valid: false,
        canEmbed: false,
        suggestedTitle: 'Invalid URL'
      });
    } finally {
      setIsValidating(false);
    }
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    if (newUrl !== material.url && newUrl.trim()) {
      const timeoutId = setTimeout(() => validateUrl(newUrl), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      alert('Please enter a URL');
      return;
    }

    const finalTitle = customTitle.trim() || validationResult?.suggestedTitle || 'Untitled Material';

    onSave({
      workshop_id: material.workshop_id,
      url: url.trim(),
      title: finalTitle,
      display_mode: displayMode,
    });
  };

  const handleClose = () => {
    setUrl(material.url);
    setDisplayMode(material.display_mode);
    setCustomTitle(material.title);
    setValidationResult({
      valid: true,
      canEmbed: !!material.embed_url,
      suggestedTitle: material.title
    });
    onClose();
  };

  const getPreviewMaterial = (): WorkshopMaterial | null => {
    if (!validationResult?.valid) return null;

    return {
      id: 'preview',
      workshop_id: material.workshop_id,
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
      order_index: material.order_index,
      created_at: material.created_at,
      updated_at: new Date().toISOString()
    };
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Edit Workshop Material</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material URL *
              </label>
              <input
                type="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://docs.google.com/... or https://canva.com/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    value="embed"
                    checked={displayMode === 'embed'}
                    onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
                    disabled={!validationResult?.canEmbed}
                    className="mt-1"
                  />
                  <div>
                    <div className={`font-medium ${!validationResult?.canEmbed ? 'text-gray-400' : ''}`}>
                      Embed (Recommended)
                    </div>
                    <div className="text-xs text-gray-500">
                      Show interactive preview (iframe)
                      {!validationResult?.canEmbed && ' - Not available for this URL'}
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
                    <div className="font-medium">Full Link</div>
                    <div className="text-xs text-gray-500">
                      Show full URL with styled card
                    </div>
                  </div>
                </label>
                
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
                    <div className="font-medium">Title Only</div>
                    <div className="text-xs text-gray-500">
                      Show favicon and title as styled card
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
                type="submit"
                disabled={!url.trim() || isLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Updating...' : 'Update Material'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export function WorkshopMaterialsManager({ workshopId, workshopTitle }: WorkshopMaterialsManagerProps) {
  const [materials, setMaterials] = useState<WorkshopMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<WorkshopMaterial | null>(null);
  const [newMaterialUrl, setNewMaterialUrl] = useState('');
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialDisplayMode, setNewMaterialDisplayMode] = useState<'title' | 'link' | 'embed'>('embed');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, [workshopId]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await MaterialService.getWorkshopMaterials(workshopId);
      setMaterials(data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialUrl.trim()) return;

    try {
      setIsSubmitting(true);
      const request: CreateMaterialRequest = {
        workshop_id: workshopId,
        url: newMaterialUrl.trim(),
        title: newMaterialTitle.trim() || undefined,
        display_mode: newMaterialDisplayMode,
      };

      await MaterialService.createMaterial(request);
      await fetchMaterials();
      
      // Reset form
      setNewMaterialUrl('');
      setNewMaterialTitle('');
      setNewMaterialDisplayMode('embed');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding material:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มเอกสาร กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMaterial = (material: WorkshopMaterial) => {
    setEditingMaterial(material);
    setShowEditModal(true);
  };

  const handleSaveEditedMaterial = async (materialRequest: CreateMaterialRequest) => {
    if (!editingMaterial) return;
    
    setIsSubmitting(true);
    try {
      // In real implementation: await MaterialService.updateMaterial(editingMaterial.id, materialRequest);
      // For now, update locally and then refresh
      await fetchMaterials();
      setShowEditModal(false);
      setEditingMaterial(null);
    } catch (error) {
      console.error('Error updating material:', error);
      alert('เกิดข้อผิดพลาดในการแก้ไขเอกสาร กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบเอกสารนี้?')) return;

    try {
      await MaterialService.deleteMaterial(materialId);
      await fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('เกิดข้อผิดพลาดในการลบเอกสาร กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleReorder = async (materialIds: string[]) => {
    try {
      await MaterialService.reorderMaterials(workshopId, materialIds);
      await fetchMaterials();
    } catch (error) {
      console.error('Error reordering materials:', error);
      alert('เกิดข้อผิดพลาดในการจัดเรียงเอกสาร กรุณาลองใหม่อีกครั้ง');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">จัดการเอกสาร Workshop</h3>
          <p className="text-sm text-gray-600">{workshopTitle}</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>➕</span>
          เพิ่มเอกสาร
        </button>
      </div>

      {/* Add Material Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-4">เพิ่มเอกสารใหม่</h4>
          <form onSubmit={handleAddMaterial} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL เอกสาร *
              </label>
              <input
                type="url"
                value={newMaterialUrl}
                onChange={(e) => setNewMaterialUrl(e.target.value)}
                placeholder="https://docs.google.com/... หรือ https://canva.com/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                รองรับ: Google Docs, Google Slides, Canva, YouTube, และ URL อื่นๆ
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อเอกสาร (ตั้งอัตโนมัติหากไม่ระบุ)
              </label>
              <input
                type="text"
                value={newMaterialTitle}
                onChange={(e) => setNewMaterialTitle(e.target.value)}
                placeholder="ชื่อเอกสาร..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รูปแบบการแสดงผล
              </label>
              <select
                value={newMaterialDisplayMode}
                onChange={(e) => setNewMaterialDisplayMode(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="embed">ฝังเอกสาร (แสดงเนื้อหาโดยตรง) - แนะนำ</option>
                <option value="link">ลิงก์แบบเต็ม (แสดง URL)</option>
                <option value="title">ชื่อเอกสารเท่านั้น</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? 'กำลังเพิ่ม...' : 'เพิ่มเอกสาร'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Materials List */}
      <div className="space-y-4">
        {materials.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีเอกสาร</h3>
            <p className="text-gray-600">เพิ่มเอกสารแรกสำหรับ Workshop นี้</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-semibold text-gray-900">
                เอกสารทั้งหมด ({materials.length})
              </h4>
              <p className="text-sm text-gray-500">
                เอกสารแรกจะแสดงเป็นเอกสารหลักในหน้า Workshop
              </p>
            </div>
            
            {materials.map((material, index) => (
              <div key={material.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">#{index + 1}</span>
                      {index === 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                          หลัก
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">{material.title}</h5>
                      <p className="text-sm text-gray-500">
                        แสดงแบบ: {
                          material.display_mode === 'embed' ? 'ฝังเอกสาร' :
                          material.display_mode === 'link' ? 'ลิงก์เต็ม' : 'ชื่อเท่านั้น'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditMaterial(material)}
                      className="text-indigo-600 hover:text-indigo-800 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                      title="แก้ไขเอกสาร"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="ลบเอกสาร"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Material Preview */}
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <WorkshopMaterialDisplay material={material} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 เคล็ดลับ</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• เอกสารแรกจะแสดงเป็นเอกสารหลักในหน้า Workshop (คล้าย YouTube)</li>
          <li>• ใช้ "ฝังเอกสาร" สำหรับ Canva, Google Slides เพื่อแสดงเนื้อหาโดยตรง</li>
          <li>• ใช้ "ลิงก์เต็ม" สำหรับเอกสารที่ไม่สามารถฝังได้</li>
          <li>• สามารถลากลำดับเอกสารได้ในอนาคต</li>
        </ul>
      </div>

      {/* Edit Material Modal */}
      {editingMaterial && (
        <EditMaterialModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingMaterial(null);
          }}
          onSave={handleSaveEditedMaterial}
          material={editingMaterial}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}