import React, { useState, useEffect } from 'react';
import { MaterialService } from '../../services/materials';
import { WorkshopMaterialDisplay } from '../materials/WorkshopMaterialDisplay';
import type { WorkshopMaterial, CreateMaterialRequest } from '../../types/materials';

interface WorkshopMaterialsManagerProps {
  workshopId: string;
  workshopTitle: string;
}

export function WorkshopMaterialsManager({ workshopId, workshopTitle }: WorkshopMaterialsManagerProps) {
  const [materials, setMaterials] = useState<WorkshopMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
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
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="ลบเอกสาร"
                    >
                      🗑️
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
    </div>
  );
}