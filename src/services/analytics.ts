import { supabase } from './supabase'

export interface AnalyticsData {
  registrationTrends: Array<{ date: string; count: number }>
  completionRates: Array<{ workshop: string; rate: number }>
  engagementMetrics: {
    totalRegistrations: number
    averageTasksPerWorkshop: number
    completionRate: number
    activeUsers: number
  }
  workshopPopularity: Array<{ title: string; registrations: number }>
  submissionTimeline: Array<{ date: string; submissions: number }>
  instructorMetrics: Array<{
    instructor: string
    workshops: number
    avgRating: number
    totalParticipants: number
  }>
}

export const analyticsService = {
  // Get comprehensive analytics data
  async getAnalytics(dateRange?: { start: string; end: string }): Promise<AnalyticsData> {
    const [
      registrationTrends,
      completionRates,
      engagementMetrics,
      workshopPopularity,
      submissionTimeline,
      instructorMetrics
    ] = await Promise.all([
      this.getRegistrationTrends(dateRange),
      this.getCompletionRates(dateRange),
      this.getEngagementMetrics(dateRange),
      this.getWorkshopPopularity(dateRange),
      this.getSubmissionTimeline(dateRange),
      this.getInstructorMetrics(dateRange)
    ])

    return {
      registrationTrends,
      completionRates,
      engagementMetrics,
      workshopPopularity,
      submissionTimeline,
      instructorMetrics
    }
  },

  // Registration trends over time
  async getRegistrationTrends(dateRange?: { start: string; end: string }) {
    let query = supabase
      .from('workshop_registrations')
      .select('registered_at')

    if (dateRange) {
      query = query
        .gte('registered_at', dateRange.start)
        .lte('registered_at', dateRange.end)
    }

    const { data, error } = await query.order('registered_at', { ascending: true })

    if (error) throw error

    // Group by date
    const trends = (data || []).reduce((acc: any, registration) => {
      const date = new Date(registration.registered_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    return Object.entries(trends).map(([date, count]) => ({
      date,
      count: count as number
    }))
  },

  // Task completion rates by workshop
  async getCompletionRates(dateRange?: { start: string; end: string }) {
    const { data: workshops, error } = await supabase
      .from('workshops')
      .select(`
        id,
        title,
        tasks!inner(
          id,
          submissions(status)
        ),
        registrations:workshop_registrations(count)
      `)
      .eq('is_active', true)

    if (error) throw error

    return (workshops || []).map(workshop => {
      const totalTasks = workshop.tasks.length
      const totalParticipants = workshop.registrations[0]?.count || 0
      
      if (totalTasks === 0 || totalParticipants === 0) {
        return { workshop: workshop.title, rate: 0 }
      }

      const completedSubmissions = workshop.tasks.reduce((sum: number, task: any) => {
        return sum + (task.submissions?.filter((s: any) => s.status === 'submitted').length || 0)
      }, 0)

      const expectedSubmissions = totalTasks * totalParticipants
      const rate = expectedSubmissions > 0 ? (completedSubmissions / expectedSubmissions) * 100 : 0

      return {
        workshop: workshop.title,
        rate: Math.round(rate * 100) / 100
      }
    })
  },

  // Overall engagement metrics
  async getEngagementMetrics(dateRange?: { start: string; end: string }) {
    const [
      { count: totalRegistrations },
      { data: workshopsData },
      { data: submissionsData },
      { count: activeUsers }
    ] = await Promise.all([
      supabase
        .from('workshop_registrations')
        .select('*', { count: 'exact', head: true })
        .then(result => ({ count: result.count || 0 })),
      
      supabase
        .from('workshops')
        .select(`
          id,
          tasks(count)
        `)
        .eq('is_active', true),

      supabase
        .from('submissions')
        .select('status')
        .eq('status', 'submitted'),

      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .then(result => ({ count: result.count || 0 }))
    ])

    const totalTasks = (workshopsData || []).reduce((sum, workshop) => {
      return sum + (workshop.tasks[0]?.count || 0)
    }, 0)

    const avgTasksPerWorkshop = workshopsData?.length > 0 
      ? Math.round((totalTasks / workshopsData.length) * 100) / 100 
      : 0

    const completionRate = totalTasks > 0 
      ? Math.round(((submissionsData?.length || 0) / totalTasks) * 10000) / 100 
      : 0

    return {
      totalRegistrations,
      averageTasksPerWorkshop: avgTasksPerWorkshop,
      completionRate,
      activeUsers
    }
  },

  // Workshop popularity ranking
  async getWorkshopPopularity(dateRange?: { start: string; end: string }) {
    const { data, error } = await supabase
      .from('workshops')
      .select(`
        title,
        registrations:workshop_registrations(count)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || [])
      .map(workshop => ({
        title: workshop.title,
        registrations: workshop.registrations[0]?.count || 0
      }))
      .sort((a, b) => b.registrations - a.registrations)
      .slice(0, 10) // Top 10 workshops
  },

  // Submission timeline analysis
  async getSubmissionTimeline(dateRange?: { start: string; end: string }) {
    let query = supabase
      .from('submissions')
      .select('submitted_at')
      .eq('status', 'submitted')

    if (dateRange) {
      query = query
        .gte('submitted_at', dateRange.start)
        .lte('submitted_at', dateRange.end)
    }

    const { data, error } = await query.order('submitted_at', { ascending: true })

    if (error) throw error

    // Group by date
    const timeline = (data || []).reduce((acc: any, submission) => {
      const date = new Date(submission.submitted_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    return Object.entries(timeline).map(([date, submissions]) => ({
      date,
      submissions: submissions as number
    }))
  },

  // Instructor performance metrics
  async getInstructorMetrics(dateRange?: { start: string; end: string }) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        workshops_as_instructor:workshops!workshops_instructor_fkey(
          id,
          title,
          registrations:workshop_registrations(count)
        )
      `)
      .eq('role', 'admin') // Assuming instructors are admins

    if (error) throw error

    return (data || [])
      .filter(user => user.workshops_as_instructor.length > 0)
      .map(instructor => {
        const workshops = instructor.workshops_as_instructor
        const totalParticipants = workshops.reduce((sum: number, workshop: any) => {
          return sum + (workshop.registrations[0]?.count || 0)
        }, 0)

        return {
          instructor: instructor.name,
          workshops: workshops.length,
          avgRating: 0, // Placeholder - would need rating system
          totalParticipants
        }
      })
      .sort((a, b) => b.totalParticipants - a.totalParticipants)
  },

  // Export analytics data to CSV
  exportAnalyticsCSV(data: AnalyticsData, filename: string = 'workshop-analytics') {
    const csvRows = [
      // Registration trends
      'Registration Trends',
      'Date,Registrations',
      ...data.registrationTrends.map(item => `${item.date},${item.count}`),
      '',
      
      // Completion rates
      'Completion Rates by Workshop',
      'Workshop,Completion Rate (%)',
      ...data.completionRates.map(item => `"${item.workshop}",${item.rate}`),
      '',
      
      // Workshop popularity
      'Workshop Popularity',
      'Workshop,Registrations',
      ...data.workshopPopularity.map(item => `"${item.title}",${item.registrations}`),
      '',
      
      // Instructor metrics
      'Instructor Performance',
      'Instructor,Workshops,Total Participants',
      ...data.instructorMetrics.map(item => `"${item.instructor}",${item.workshops},${item.totalParticipants}`)
    ]

    const csvContent = csvRows.join('\\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  },

  // Get real-time analytics updates
  subscribeToAnalyticsUpdates(callback: (data: Partial<AnalyticsData>) => void) {
    // Subscribe to registration changes
    const registrationSubscription = supabase
      .channel('workshop_registrations')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'workshop_registrations' },
        () => {
          this.getRegistrationTrends().then(registrationTrends => {
            callback({ registrationTrends })
          })
        }
      )
      .subscribe()

    // Subscribe to submission changes
    const submissionSubscription = supabase
      .channel('submissions')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        () => {
          this.getSubmissionTimeline().then(submissionTimeline => {
            callback({ submissionTimeline })
          })
        }
      )
      .subscribe()

    return () => {
      registrationSubscription.unsubscribe()
      submissionSubscription.unsubscribe()
    }
  }
}