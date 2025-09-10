import React, { useState } from 'react'

interface BulkActionBarProps {
  selectedItems: string[]
  totalItems: number
  itemType: string
  onSelectAll: () => void
  onDeselectAll: () => void
  onBulkHide?: () => void
  onBulkShow?: () => void
  onBulkDelete?: () => void
  onBulkArchive?: () => void
  loading?: boolean
}

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  isDangerous?: boolean
}

function ConfirmationModal({ 
  isOpen, 
  title, 
  message, 
  confirmText, 
  onConfirm, 
  onCancel, 
  loading = false,
  isDangerous = false 
}: ConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-start mb-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            isDangerous ? 'bg-red-100' : 'bg-yellow-100'
          }`}>
            {isDangerous ? (
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 ${
              isDangerous 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function BulkActionBar({
  selectedItems,
  totalItems,
  itemType,
  onSelectAll,
  onDeselectAll,
  onBulkHide,
  onBulkShow,
  onBulkDelete,
  onBulkArchive,
  loading = false
}: BulkActionBarProps) {
  const [showHideConfirm, setShowHideConfirm] = useState(false)
  const [showShowConfirm, setShowShowConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

  const isAllSelected = selectedItems.length === totalItems && totalItems > 0
  const isSomeSelected = selectedItems.length > 0

  const handleBulkHide = () => {
    setShowHideConfirm(false)
    onBulkHide?.()
  }

  const handleBulkShow = () => {
    setShowShowConfirm(false)
    onBulkShow?.()
  }

  const handleBulkDelete = () => {
    setShowDeleteConfirm(false)
    onBulkDelete?.()
  }

  const handleBulkArchive = () => {
    setShowArchiveConfirm(false)
    onBulkArchive?.()
  }

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Select All Checkbox */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={isAllSelected ? onDeselectAll : onSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </span>
            </label>

            {/* Selected Count */}
            {isSomeSelected && (
              <span className="text-sm text-gray-600">
                {selectedItems.length} of {totalItems} {itemType}{totalItems !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          {/* Bulk Actions */}
          {isSomeSelected && (
            <div className="flex items-center space-x-2">
              {onBulkShow && (
                <button
                  onClick={() => setShowShowConfirm(true)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                  Show All ({selectedItems.length})
                </button>
              )}

              {onBulkHide && (
                <button
                  onClick={() => setShowHideConfirm(true)}
                  disabled={loading}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                  </svg>
                  Hide All ({selectedItems.length})
                </button>
              )}

              {onBulkArchive && (
                <button
                  onClick={() => setShowArchiveConfirm(true)}
                  disabled={loading}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
                  </svg>
                  Archive All ({selectedItems.length})
                </button>
              )}

              {onBulkDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete All ({selectedItems.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showHideConfirm}
        title="Hide Selected Items"
        message={`Are you sure you want to hide ${selectedItems.length} selected ${itemType}${selectedItems.length !== 1 ? 's' : ''}? This will make them inactive and not visible to users.`}
        confirmText="Hide All"
        onConfirm={handleBulkHide}
        onCancel={() => setShowHideConfirm(false)}
        loading={loading}
      />

      <ConfirmationModal
        isOpen={showShowConfirm}
        title="Show Selected Items"
        message={`Are you sure you want to show ${selectedItems.length} selected ${itemType}${selectedItems.length !== 1 ? 's' : ''}? This will make them active and visible to users.`}
        confirmText="Show All"
        onConfirm={handleBulkShow}
        onCancel={() => setShowShowConfirm(false)}
        loading={loading}
      />

      <ConfirmationModal
        isOpen={showArchiveConfirm}
        title="Archive Selected Items"
        message={`Are you sure you want to archive ${selectedItems.length} selected ${itemType}${selectedItems.length !== 1 ? 's' : ''}? This will move them to the archived state and hide them from active listings.`}
        confirmText="Archive All"
        onConfirm={handleBulkArchive}
        onCancel={() => setShowArchiveConfirm(false)}
        loading={loading}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Selected Items"
        message={`Are you sure you want to permanently delete ${selectedItems.length} selected ${itemType}${selectedItems.length !== 1 ? 's' : ''}? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete All"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={loading}
        isDangerous={true}
      />
    </>
  )
}