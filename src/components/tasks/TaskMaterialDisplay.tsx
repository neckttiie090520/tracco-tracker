import React from 'react';
import type { TaskMaterial } from '../../types/materials';
import { WorkshopMaterialDisplay } from '../materials/WorkshopMaterialDisplay';

interface TaskMaterialDisplayProps {
  materials: TaskMaterial[];
  className?: string;
}

export function TaskMaterialDisplay({ materials, className = '' }: TaskMaterialDisplayProps) {
  if (!materials || materials.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center mb-4">
        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h4 className="text-md font-semibold text-gray-900">เอกสารประกอบ</h4>
        <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
          {materials.length}
        </span>
      </div>
      
      <div className="grid gap-3">
        {materials
          .sort((a, b) => a.order_index - b.order_index)
          .map((material) => (
            <div key={material.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              {/* Convert TaskMaterial to WorkshopMaterial format for display */}
              <WorkshopMaterialDisplay 
                material={{
                  ...material,
                  workshop_id: 'task-material' // WorkshopMaterialDisplay expects this field
                }} 
              />
            </div>
          ))}
      </div>
    </div>
  );
}

export default TaskMaterialDisplay
