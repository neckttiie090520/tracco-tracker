import React, { useState } from 'react'
import { AdminNavigation } from '../../components/admin/AdminNavigation'
import { useAnalytics } from '../../hooks/useAnalytics'
import {
  RegistrationTrendChart,
  CompletionRateChart,
  WorkshopPopularityChart,
  SubmissionTimelineChart,
  MetricsCard,
  InstructorMetricsChart
} from '../../components/analytics/ChartComponents'

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | undefined>()
  const { data, loading, error, refetch, exportData } = useAnalytics(dateRange)

  const handleDateRangeChange = (start: string, end: string) => {
    if (start && end) {
      setDateRange({ start, end })
    } else {
      setDateRange(undefined)
    }
  }

  const handleExport = () => {
    const filename = dateRange 
      ? `analytics-${dateRange.start}-to-${dateRange.end}`
      : 'analytics-all-time'
    exportData(filename)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h2>
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
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Data
              </button>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center space-x-4">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="start-date"
                  onChange={(e) => {
                    const endDate = (document.getElementById('end-date') as HTMLInputElement)?.value
                    handleDateRangeChange(e.target.value, endDate)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  id="end-date"
                  onChange={(e) => {
                    const startDate = (document.getElementById('start-date') as HTMLInputElement)?.value
                    handleDateRangeChange(startDate, e.target.value)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    const startInput = document.getElementById('start-date') as HTMLInputElement
                    const endInput = document.getElementById('end-date') as HTMLInputElement
                    startInput.value = ''
                    endInput.value = ''
                    setDateRange(undefined)
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear Filter
                </button>
              </div>
            </div>
          </div>

          {data && (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricsCard
                  title="Total Registrations"
                  value={data.engagementMetrics.totalRegistrations.toLocaleString()}
                  icon={
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                />
                
                <MetricsCard
                  title="Average Tasks per Workshop"
                  value={data.engagementMetrics.averageTasksPerWorkshop}
                  icon={
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  }
                />
                
                <MetricsCard
                  title="Overall Completion Rate"
                  value={`${data.engagementMetrics.completionRate}%`}
                  icon={
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                
                <MetricsCard
                  title="Active Users"
                  value={data.engagementMetrics.activeUsers.toLocaleString()}
                  icon={
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <RegistrationTrendChart data={data.registrationTrends} />
                <SubmissionTimelineChart data={data.submissionTimeline} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <CompletionRateChart data={data.completionRates} />
                <WorkshopPopularityChart data={data.workshopPopularity} />
              </div>

              {/* Instructor Metrics */}
              {data.instructorMetrics.length > 0 && (
                <div className="mb-8">
                  <InstructorMetricsChart data={data.instructorMetrics} />
                </div>
              )}

              {/* Data Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Workshops Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Top Workshops by Registration</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Workshop
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Registrations
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.workshopPopularity.slice(0, 5).map((workshop, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {workshop.title}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {workshop.registrations}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Completion Rates Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Completion Rates by Workshop</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Workshop
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completion Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.completionRates.slice(0, 5).map((workshop, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {workshop.workshop}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                workshop.rate >= 80 ? 'bg-green-100 text-green-800' :
                                workshop.rate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {workshop.rate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}