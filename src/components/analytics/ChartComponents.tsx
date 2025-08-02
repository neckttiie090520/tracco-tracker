import React from 'react'
import {
  LineChart,
  Line,
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
  ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316']

interface RegistrationTrendChartProps {
  data: Array<{ date: string; count: number }>
}

export function RegistrationTrendChart({ data }: RegistrationTrendChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    formattedDate: format(parseISO(item.date), 'MMM dd')
  }))

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="formattedDate" 
            stroke="#6B7280"
            fontSize={12}
          />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#3B82F6" 
            strokeWidth={3}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface CompletionRateChartProps {
  data: Array<{ workshop: string; rate: number }>
}

export function CompletionRateChart({ data }: CompletionRateChartProps) {
  const sortedData = [...data].sort((a, b) => b.rate - a.rate).slice(0, 8)

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Completion Rates</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sortedData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            type="number" 
            domain={[0, 100]}
            stroke="#6B7280"
            fontSize={12}
          />
          <YAxis 
            type="category" 
            dataKey="workshop" 
            width={120}
            stroke="#6B7280"
            fontSize={11}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            formatter={(value: any) => [`${value}%`, 'Completion Rate']}
          />
          <Bar 
            dataKey="rate" 
            fill="#10B981"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface WorkshopPopularityChartProps {
  data: Array<{ title: string; registrations: number }>
}

export function WorkshopPopularityChart({ data }: WorkshopPopularityChartProps) {
  const topWorkshops = data.slice(0, 6)

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Popular Workshops</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={topWorkshops}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ title, percent }) => `${title}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="registrations"
          >
            {topWorkshops.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

interface SubmissionTimelineChartProps {
  data: Array<{ date: string; submissions: number }>
}

export function SubmissionTimelineChart({ data }: SubmissionTimelineChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    formattedDate: format(parseISO(item.date), 'MMM dd')
  }))

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Submission Timeline</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="formattedDate" 
            stroke="#6B7280"
            fontSize={12}
          />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Bar 
            dataKey="submissions" 
            fill="#8B5CF6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface MetricsCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon?: React.ReactNode
}

export function MetricsCard({ title, value, subtitle, trend, icon }: MetricsCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center">
        {icon && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
        <div className={icon ? 'ml-4' : ''}>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center mt-1 text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <svg 
                className={`w-4 h-4 mr-1 ${trend.isPositive ? 'rotate-0' : 'rotate-180'}`}
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface InstructorMetricsChartProps {
  data: Array<{
    instructor: string
    workshops: number
    totalParticipants: number
  }>
}

export function InstructorMetricsChart({ data }: InstructorMetricsChartProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructor Performance</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="instructor" 
            stroke="#6B7280"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar 
            dataKey="workshops" 
            fill="#3B82F6" 
            name="Workshops"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="totalParticipants" 
            fill="#10B981" 
            name="Total Participants"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}