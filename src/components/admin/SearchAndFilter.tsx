import React from 'react'

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface DateRangeFilter {
  startDate: string
  endDate: string
}

interface SearchAndFilterProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  searchPlaceholder?: string
  
  // Status Filter
  statusFilter?: string
  onStatusFilterChange?: (status: string) => void
  statusOptions?: FilterOption[]
  
  // Published Filter (for sessions)
  publishedFilter?: string
  onPublishedFilterChange?: (published: string) => void
  
  // Session/Workshop Filter
  sessionFilter?: string
  onSessionFilterChange?: (sessionId: string) => void
  sessionOptions?: FilterOption[]
  
  workshopFilter?: string
  onWorkshopFilterChange?: (workshopId: string) => void
  workshopOptions?: FilterOption[]
  
  // Date Range Filter
  dateRange?: DateRangeFilter
  onDateRangeChange?: (range: DateRangeFilter) => void
  
  // Additional filters
  instructorFilter?: string
  onInstructorFilterChange?: (instructor: string) => void
  instructorOptions?: FilterOption[]
  
  // Clear filters
  onClearFilters?: () => void
  hasActiveFilters?: boolean
}

export function SearchAndFilter({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  
  statusFilter,
  onStatusFilterChange,
  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ],
  
  publishedFilter,
  onPublishedFilterChange,
  
  sessionFilter,
  onSessionFilterChange,
  sessionOptions = [],
  
  workshopFilter,
  onWorkshopFilterChange,
  workshopOptions = [],
  
  dateRange,
  onDateRangeChange,
  
  instructorFilter,
  onInstructorFilterChange,
  instructorOptions = [],
  
  onClearFilters,
  hasActiveFilters = false
}: SearchAndFilterProps) {
  
  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    if (onDateRangeChange && dateRange) {
      onDateRangeChange({
        ...dateRange,
        [field]: value
      })
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder={searchPlaceholder}
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Status Filter */}
          {onStatusFilterChange && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} {option.count !== undefined && `(${option.count})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Published Filter */}
          {onPublishedFilterChange && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Published
              </label>
              <select
                value={publishedFilter}
                onChange={(e) => onPublishedFilterChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
              </select>
            </div>
          )}

          {/* Session Filter */}
          {onSessionFilterChange && sessionOptions.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Session
              </label>
              <select
                value={sessionFilter}
                onChange={(e) => onSessionFilterChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Sessions</option>
                {sessionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} {option.count !== undefined && `(${option.count})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Workshop Filter */}
          {onWorkshopFilterChange && workshopOptions.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Workshop
              </label>
              <select
                value={workshopFilter}
                onChange={(e) => onWorkshopFilterChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Workshops</option>
                {workshopOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} {option.count !== undefined && `(${option.count})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Instructor Filter */}
          {onInstructorFilterChange && instructorOptions.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Instructor
              </label>
              <select
                value={instructorFilter}
                onChange={(e) => onInstructorFilterChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Instructors</option>
                {instructorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} {option.count !== undefined && `(${option.count})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Filter */}
          {onDateRangeChange && dateRange && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Clear Filters Button */}
        {onClearFilters && hasActiveFilters && (
          <div className="flex justify-end">
            <button
              onClick={onClearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}