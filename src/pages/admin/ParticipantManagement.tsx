import React, { useState } from 'react'
import { useParticipants } from '../../hooks/useAdminData'
import { AdminNavigation } from '../../components/admin/AdminNavigation'
import { Avatar } from '../../components/common/Avatar'
import { adminService } from '../../services/admin'

export function ParticipantManagement() {
  const { participants, loading, error, exportCSV, getRandomParticipant, refetch } = useParticipants()
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [facultyFilter, setFacultyFilter] = useState<string>('')
  const [randomParticipant, setRandomParticipant] = useState<any>(null)
  const [showRandomModal, setShowRandomModal] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Get unique workshops and faculties from participants
  const workshops = participants.reduce((acc: any[], participant) => {
    const workshop = participant.workshop
    if (workshop && !acc.find(w => w.id === workshop.id)) {
      acc.push(workshop)
    }
    return acc
  }, [])

  const faculties = participants.reduce((acc: string[], participant) => {
    const faculty = participant.user?.faculty
    if (faculty && !acc.includes(faculty)) {
      acc.push(faculty)
    }
    return acc
  }, [])

  // Apply all filters
  const filteredParticipants = participants.filter(participant => {
    // Workshop filter
    if (selectedWorkshop && participant.workshop?.id !== selectedWorkshop) {
      return false
    }
    
    // Faculty filter
    if (facultyFilter && participant.user?.faculty !== facultyFilter) {
      return false
    }
    
    // Search filter (name, email)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const name = participant.user?.name?.toLowerCase() || ''
      const email = participant.user?.email?.toLowerCase() || ''
      if (!name.includes(searchLower) && !email.includes(searchLower)) {
        return false
      }
    }
    
    return true
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedParticipants = filteredParticipants.slice(startIndex, endIndex)

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [selectedWorkshop, searchTerm, facultyFilter])

  const handleRandomPick = () => {
    const selectedParticipants = filteredParticipants
    if (selectedParticipants.length === 0) {
      alert('No participants available for selection')
      return
    }

    const random = getRandomParticipant(selectedParticipants)
    setRandomParticipant(random)
    setShowRandomModal(true)
  }

  const handleExport = () => {
    if (filteredParticipants.length === 0) {
      alert('No participants to export')
      return
    }
    // Pass filtered participants to export function
    adminService.exportParticipantsCSV(filteredParticipants)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading participants...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Participants</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={refetch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Traco Participant Management</h1>
              <p className="text-gray-600 mt-1">View and manage workshop participants</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRandomPick}
                disabled={filteredParticipants.length === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Random Pick
              </button>
              <button
                onClick={handleExport}
                disabled={filteredParticipants.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Participants
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="search"
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="workshop-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Workshop
                </label>
                <select
                  id="workshop-filter"
                  value={selectedWorkshop}
                  onChange={(e) => setSelectedWorkshop(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Users</option>
                  {workshops.map((workshop) => (
                    <option key={workshop.id} value={workshop.id}>
                      {workshop.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="faculty-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Faculty
                </label>
                <select
                  id="faculty-filter"
                  value={facultyFilter}
                  onChange={(e) => setFacultyFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Faculties</option>
                  {faculties.map((faculty) => (
                    <option key={faculty} value={faculty}>
                      {faculty}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <div className="w-full">
                  <div className="text-sm font-medium text-gray-700 mb-2">Items per page</div>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            {(searchTerm || selectedWorkshop || facultyFilter) && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedWorkshop('')
                    setFacultyFilter('')
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredParticipants.length)} of {filteredParticipants.length} participants
              {filteredParticipants.length !== participants.length && (
                <span className="text-gray-500"> (filtered from {participants.length} total)</span>
              )}
            </div>
          </div>

          {/* Participants Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Participants Found</h3>
                <p className="text-gray-600">
                  {(searchTerm || selectedWorkshop || facultyFilter) 
                    ? 'No participants match your current filters. Try adjusting your search criteria.' 
                    : 'No participants have registered yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workshop
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Faculty/Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registration Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedParticipants.map((participant) => (
                      <tr key={participant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <Avatar
                              username={participant.user?.email}
                              name={participant.user?.name}
                              avatarSeed={participant.user?.avatar_seed}
                              size={40}
                              saturation={participant.user?.avatar_saturation}
                              lightness={participant.user?.avatar_lightness}
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {participant.user?.name || 'Unknown User'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {participant.user?.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {participant.workshop?.title || (
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                  </svg>
                                  Registered User
                                </span>
                                {participant.user?.role === 'admin' && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    👑 Admin
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {participant.user?.faculty || 'Not specified'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {participant.user?.department || 'Not specified'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {!participant.workshop ? (
                            <span className="text-gray-400 italic">
                              User created: {new Date(participant.registered_at).toLocaleDateString()}
                            </span>
                          ) : (
                            new Date(participant.registered_at).toLocaleDateString()
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredParticipants.length > 0 && totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, filteredParticipants.length)}</span> of{' '}
                    <span className="font-medium">{filteredParticipants.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Random Participant Modal */}
      {showRandomModal && randomParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 mb-4">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                🎉 Random Selection Result
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-4 mb-3">
                  <Avatar
                    username={randomParticipant.user.email}
                    name={randomParticipant.user.name}
                    avatarSeed={randomParticipant.user?.avatar_seed}
                    size={60}
                    saturation={randomParticipant.user?.avatar_saturation}
                    lightness={randomParticipant.user?.avatar_lightness}
                  />
                  <div>
                    <p className="text-xl font-semibold text-gray-900">
                      {randomParticipant.user.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {randomParticipant.user.email}
                    </p>
                  </div>
                </div>
                {randomParticipant.workshop && (
                  <p className="text-sm text-gray-500">
                    Workshop: {randomParticipant.workshop.title}
                  </p>
                )}
              </div>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleRandomPick}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Pick Again
                </button>
                <button
                  onClick={() => setShowRandomModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}