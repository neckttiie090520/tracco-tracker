import React, { useState, useEffect } from 'react';
import { AdminNavigation } from '../../components/admin/AdminNavigation';
import {
  AdvancedMetricsCard,
  DemographicsChart,
  EngagementMetrics,
  PerformanceAnalysis,
  TrendAnalysis,
  PredictiveAnalysis
} from '../../components/analytics/AdvancedCharts';
import { advancedAnalyticsService, AdvancedAnalyticsData, FilterOptions } from '../../services/advancedAnalytics';
import {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  DollarSign,
  BarChart3,
  Download,
  Filter,
  Calendar,
  User,
  Building
} from 'lucide-react';

export function AdvancedAnalyticsDashboard() {
  const [data, setData] = useState<AdvancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'demographics' | 'performance' | 'trends' | 'predictions'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const analyticsData = await advancedAnalyticsService.getAdvancedAnalytics(filters);
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const exportData = () => {
    if (data) {
      const filename = `advanced-analytics-${new Date().toISOString().split('T')[0]}`;
      advancedAnalyticsService.exportAdvancedAnalytics(data, filename);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading advanced analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <BarChart3 className="w-16 h-16 mx-auto mb-4" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics Unavailable</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadAnalytics}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'demographics', label: 'Demographics', icon: Users },
    { id: 'performance', label: 'Performance', icon: Award },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'predictions', label: 'Predictions', icon: BookOpen },
  ] as const;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
              <p className="text-gray-600 mt-1">Deep insights and predictive analysis</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
              <button
                onClick={exportData}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Instructor
                  </label>
                  <select
                    value={filters.instructor || ''}
                    onChange={(e) => handleFilterChange('instructor', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Instructors</option>
                    {/* Add instructor options dynamically */}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building className="w-4 h-4 inline mr-1" />
                    Faculty
                  </label>
                  <select
                    value={filters.faculty || ''}
                    onChange={(e) => handleFilterChange('faculty', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Faculties</option>
                    {data.demographics.byFaculty.map(faculty => (
                      <option key={faculty.faculty} value={faculty.faculty}>
                        {faculty.faculty}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content based on active tab */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <>
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <AdvancedMetricsCard
                    title="Total Workshops"
                    value={data.overview.totalWorkshops}
                    icon={<BookOpen className="h-5 w-5" style={{ color: '#3B82F6' }} />}
                    color="#3B82F6"
                    change={data.overview.growthRate}
                    changeType={data.overview.growthRate >= 0 ? 'increase' : 'decrease'}
                  />
                  <AdvancedMetricsCard
                    title="Total Registrations"
                    value={data.overview.totalRegistrations.toLocaleString()}
                    icon={<Users className="h-5 w-5" style={{ color: '#10B981' }} />}
                    color="#10B981"
                  />
                  <AdvancedMetricsCard
                    title="Completions"
                    value={data.overview.totalCompletions.toLocaleString()}
                    icon={<Award className="h-5 w-5" style={{ color: '#F59E0B' }} />}
                    color="#F59E0B"
                  />
                  <AdvancedMetricsCard
                    title="Average Rating"
                    value={`${data.overview.averageRating}/5`}
                    icon={<TrendingUp className="h-5 w-5" style={{ color: '#8B5CF6' }} />}
                    color="#8B5CF6"
                  />
                  <AdvancedMetricsCard
                    title="Revenue"
                    value={`$${data.overview.revenue.toLocaleString()}`}
                    icon={<DollarSign className="h-5 w-5" style={{ color: '#EF4444' }} />}
                    color="#EF4444"
                  />
                  <AdvancedMetricsCard
                    title="Growth Rate"
                    value={`${data.overview.growthRate}%`}
                    icon={<BarChart3 className="h-5 w-5" style={{ color: '#06B6D4' }} />}
                    color="#06B6D4"
                    change={data.overview.growthRate}
                    changeType={data.overview.growthRate >= 0 ? 'increase' : 'decrease'}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <EngagementMetrics data={data.engagement} />
                  <PredictiveAnalysis data={data.predictions} />
                </div>
              </>
            )}

            {activeTab === 'demographics' && (
              <DemographicsChart data={data.demographics} />
            )}

            {activeTab === 'performance' && (
              <PerformanceAnalysis data={data.performance} />
            )}

            {activeTab === 'trends' && (
              <TrendAnalysis data={data.trends} />
            )}

            {activeTab === 'predictions' && (
              <div className="space-y-6">
                <PredictiveAnalysis data={data.predictions} />
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Forecast Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">Next Month Predictions</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• Expected {data.predictions.nextMonthRegistrations} new registrations</li>
                        <li>• Projected revenue of ${data.predictions.predictedRevenue}</li>
                        <li>• Capacity utilization at {data.predictions.capacityUtilization}%</li>
                        <li>• Overall trend direction: {data.predictions.trendDirection}</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">Recommendations</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• {data.predictions.capacityUtilization > 80 ? 'Consider expanding workshop capacity' : 'Focus on marketing to increase enrollment'}</li>
                        <li>• {data.predictions.trendDirection === 'up' ? 'Prepare for increased demand' : 'Review and improve workshop quality'}</li>
                        <li>• Monitor performance metrics closely</li>
                        <li>• Continue collecting user feedback</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}