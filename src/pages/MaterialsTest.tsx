import React, { useState } from 'react';
import { WorkshopMaterialDisplay, WorkshopMaterialsList } from '../components/materials/WorkshopMaterialDisplay';
import { MaterialManager } from '../components/admin/MaterialManager';
import type { WorkshopMaterial } from '../types/materials';

export function MaterialsTest() {
  const [materials, setMaterials] = useState<WorkshopMaterial[]>([
    {
      id: '1',
      workshop_id: 'test-workshop',
      title: 'React Documentation',
      type: 'generic',
      url: 'https://reactjs.org/docs/getting-started.html',
      display_mode: 'title',
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        title: 'React Documentation',
        favicon: 'https://reactjs.org/favicon.ico'
      }
    },
    {
      id: '2',
      workshop_id: 'test-workshop',
      title: 'YouTube Tutorial',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=dGcsHMXbSOA',
      embed_url: 'https://www.youtube.com/embed/dGcsHMXbSOA',
      display_mode: 'embed',
      dimensions: { width: '100%', height: '315px' },
      order_index: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        title: 'React Tutorial for Beginners',
        thumbnail: 'https://img.youtube.com/vi/dGcsHMXbSOA/maxresdefault.jpg'
      }
    },
    {
      id: '3',
      workshop_id: 'test-workshop',
      title: 'Google Doc Example',
      type: 'generic',
      url: 'https://docs.google.com/document/d/1234567890/edit',
      display_mode: 'link',
      order_index: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '4',
      workshop_id: 'test-workshop',
      title: 'Canva Presentation',
      type: 'canva_embed',
      url: 'https://www.canva.com/design/DAGup4dHDmI/4_To2tiY0acGc6yqdbli1A/view',
      embed_url: 'https://www.canva.com/design/DAGup4dHDmI/4_To2tiY0acGc6yqdbli1A/view?embed',
      display_mode: 'embed',
      dimensions: { width: '100%', height: '500px' },
      order_index: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        title: 'Canva Presentation',
        favicon: 'https://www.canva.com/favicon.ico'
      }
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Workshop Materials Test</h1>
          <p className="text-gray-600">Testing different display modes and material types</p>
        </div>

        {/* Display Mode Examples */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">🎨 Styled Display Modes</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">📋 Title Mode</h3>
              <p className="text-sm text-gray-500 mb-4">
                Compact card with favicon, title, and domain name
              </p>
              <WorkshopMaterialDisplay material={materials[0]} />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">🔗 Link Mode</h3>
              <p className="text-sm text-gray-500 mb-4">
                Full URL display with styled card and monospace font
              </p>
              <WorkshopMaterialDisplay material={materials[2]} />
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-lg font-medium text-gray-700 mb-3">📺 Embed Mode (YouTube)</h3>
              <p className="text-sm text-gray-500 mb-4">
                Interactive video player embedded directly
              </p>
              <WorkshopMaterialDisplay material={materials[1]} />
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-lg font-medium text-gray-700 mb-3">🎨 Embed Mode (Canva Presentation)</h3>
              <p className="text-sm text-gray-500 mb-4">
                Interactive Canva presentation with full functionality
              </p>
              <WorkshopMaterialDisplay material={materials[3]} />
            </div>
          </div>
        </div>

        {/* Color Guide */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">🌈 Color-Coded Material Types</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div>
                <div className="text-sm font-medium text-blue-700">Google Docs</div>
                <div className="text-xs text-blue-600">Documents</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <div>
                <div className="text-sm font-medium text-orange-700">Google Slides</div>
                <div className="text-xs text-orange-600">Presentations</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <div className="text-sm font-medium text-green-700">Google Sheets</div>
                <div className="text-xs text-green-600">Spreadsheets</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <div>
                <div className="text-sm font-medium text-purple-700">Canva</div>
                <div className="text-xs text-purple-600">Designs</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div>
                <div className="text-sm font-medium text-red-700">YouTube</div>
                <div className="text-xs text-red-600">Videos</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <div>
                <div className="text-sm font-medium text-gray-700">Generic</div>
                <div className="text-xs text-gray-600">Other links</div>
              </div>
            </div>
          </div>
        </div>

        {/* Materials List */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Materials List View</h2>
          <WorkshopMaterialsList materials={materials} />
        </div>

        {/* Material Manager */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">🛠️ Material Manager (Admin)</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Try adding your Canva presentation!</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Paste this URL: <code className="bg-white px-2 py-1 rounded text-xs">https://www.canva.com/design/DAGup4dHDmI/4_To2tiY0acGc6yqdbli1A/view</code>
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    📋 The system will automatically detect it as embeddable Canva content<br/>
                    🎨 You'll see a live preview before adding it<br/>
                    ✨ Choose between Title, Link, or Embed display modes
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <MaterialManager
            workshopId="test-workshop"
            materials={materials}
            onMaterialsChange={setMaterials}
          />
        </div>
      </div>
    </div>
  );
}