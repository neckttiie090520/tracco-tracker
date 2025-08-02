import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Award, Clock, Target } from 'lucide-react';
import { AdvancedAnalyticsData } from '../../services/advancedAnalytics';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];

interface AdvancedMetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon: React.ReactNode;
  color: string;
}

export function AdvancedMetricsCard({ title, value, change, changeType, icon, color }: AdvancedMetricsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeType === 'increase' ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface DemographicsChartProps {
  data: AdvancedAnalyticsData['demographics'];
}

export function DemographicsChart({ data }: DemographicsChartProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Demographics Overview</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">By Faculty</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.byFaculty}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                label={({ faculty, percentage }) => `${faculty}: ${percentage}%`}
              >
                {data.byFaculty.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">By Department</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.byDepartment.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

interface EngagementMetricsProps {
  data: AdvancedAnalyticsData['engagement'];
}

export function EngagementMetrics({ data }: EngagementMetricsProps) {
  const engagementData = [
    { name: 'Retention Rate', value: data.retentionRate, fill: '#10B981' },
    { name: 'Bounce Rate', value: data.bounceRate, fill: '#EF4444' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Engagement Metrics</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={engagementData}>
              <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Average Session Duration</span>
            <span className="text-lg font-bold text-blue-600">{data.averageSessionDuration} min</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Returning Users</span>
            <span className="text-lg font-bold text-green-600">{data.returningUsers}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">New Users</span>
            <span className="text-lg font-bold text-purple-600">{data.newUsers}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PerformanceAnalysisProps {
  data: AdvancedAnalyticsData['performance'];
}

export function PerformanceAnalysis({ data }: PerformanceAnalysisProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Analysis</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Top Instructors</h4>
          <div className="space-y-3">
            {data.topInstructors.slice(0, 5).map((instructor, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{instructor.name}</p>
                  <p className="text-sm text-gray-600">{instructor.workshopsCount} workshops • {instructor.enrollments} enrollments</p>
                </div>
                <div className="flex items-center space-x-1">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span className="font-bold text-yellow-600">{instructor.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Workshop Performance</h4>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart data={data.topWorkshops.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="enrollments" name="Enrollments" />
              <YAxis dataKey="rating" name="Rating" domain={[0, 5]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter dataKey="completionRate" fill="#3B82F6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.lowPerformingWorkshops.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3 text-red-600">Workshops Needing Attention</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.lowPerformingWorkshops.map((workshop, index) => (
              <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-900 text-sm">{workshop.title}</p>
                <div className="flex justify-between mt-2 text-xs text-red-700">
                  <span>Rating: {workshop.rating}</span>
                  <span>Completion: {workshop.completionRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TrendAnalysisProps {
  data: AdvancedAnalyticsData['trends'];
}

export function TrendAnalysis({ data }: TrendAnalysisProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Trend Analysis</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Registration Trends</h4>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.registrationsByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="registrations" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="completions" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Popular Workshop Times</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.popularTimes.slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
                <YAxis />
                <Tooltip labelFormatter={(hour) => `${hour}:00`} />
                <Bar dataKey="count" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Seasonal Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.seasonalTrends}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ season, count }) => `${season}: ${count}`}
                >
                  {data.seasonalTrends.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PredictiveAnalysisProps {
  data: AdvancedAnalyticsData['predictions'];
}

export function PredictiveAnalysis({ data }: PredictiveAnalysisProps) {
  const trendIcon = data.trendDirection === 'up' ? (
    <TrendingUp className="h-5 w-5 text-green-500" />
  ) : data.trendDirection === 'down' ? (
    <TrendingDown className="h-5 w-5 text-red-500" />
  ) : (
    <Target className="h-5 w-5 text-gray-500" />
  );

  const trendColor = data.trendDirection === 'up' ? 'text-green-600' : 
                    data.trendDirection === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Predictive Analysis</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className={`text-sm font-medium ${trendColor}`}>Next Month</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{data.nextMonthRegistrations}</p>
          <p className="text-sm text-blue-700">Predicted Registrations</p>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">{data.capacityUtilization}%</span>
          </div>
          <p className="text-2xl font-bold text-green-900">Capacity</p>
          <p className="text-sm text-green-700">Utilization Rate</p>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-purple-600" />
            {trendIcon}
          </div>
          <p className="text-2xl font-bold text-purple-900 capitalize">{data.trendDirection}</p>
          <p className="text-sm text-purple-700">Trend Direction</p>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Award className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-600">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">${data.predictedRevenue}</p>
          <p className="text-sm text-yellow-700">Predicted Revenue</p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">AI Insights & Recommendations</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Registration trends show {data.trendDirection === 'up' ? 'positive growth' : data.trendDirection === 'down' ? 'declining interest' : 'stable demand'}</li>
          <li>• Current capacity utilization at {data.capacityUtilization}% suggests {data.capacityUtilization > 80 ? 'high demand - consider adding more workshops' : 'room for growth'}</li>
          <li>• Predicted revenue of ${data.predictedRevenue} for next month</li>
        </ul>
      </div>
    </div>
  );
}