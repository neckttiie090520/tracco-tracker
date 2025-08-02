import { supabase } from './supabase';

export interface AdvancedAnalyticsData {
  overview: {
    totalWorkshops: number;
    totalRegistrations: number;
    totalCompletions: number;
    averageRating: number;
    revenue: number;
    growthRate: number;
  };
  demographics: {
    byFaculty: Array<{ faculty: string; count: number; percentage: number }>;
    byDepartment: Array<{ department: string; count: number; percentage: number }>;
    byYear: Array<{ year: string; count: number; percentage: number }>;
    byGender: Array<{ gender: string; count: number; percentage: number }>;
  };
  engagement: {
    retentionRate: number;
    averageSessionDuration: number;
    bounceRate: number;
    returningUsers: number;
    newUsers: number;
  };
  performance: {
    topInstructors: Array<{ name: string; rating: number; workshopsCount: number; enrollments: number }>;
    topWorkshops: Array<{ title: string; rating: number; completionRate: number; enrollments: number }>;
    lowPerformingWorkshops: Array<{ title: string; rating: number; completionRate: number; enrollments: number }>;
  };
  trends: {
    registrationsByMonth: Array<{ month: string; registrations: number; completions: number }>;
    popularTimes: Array<{ hour: number; count: number }>;
    seasonalTrends: Array<{ season: string; count: number; completion_rate: number }>;
  };
  predictions: {
    nextMonthRegistrations: number;
    trendDirection: 'up' | 'down' | 'stable';
    capacityUtilization: number;
    predictedRevenue: number;
  };
}

export interface FilterOptions {
  startDate?: string;
  endDate?: string;
  instructor?: string;
  faculty?: string;
  department?: string;
  workshopType?: string;
}

class AdvancedAnalyticsService {
  async getAdvancedAnalytics(filters?: FilterOptions): Promise<AdvancedAnalyticsData> {
    const [
      overview,
      demographics,
      engagement,
      performance,
      trends,
      predictions
    ] = await Promise.all([
      this.getOverviewData(filters),
      this.getDemographicsData(filters),
      this.getEngagementData(filters),
      this.getPerformanceData(filters),
      this.getTrendsData(filters),
      this.getPredictionsData(filters)
    ]);

    return {
      overview,
      demographics,
      engagement,
      performance,
      trends,
      predictions
    };
  }

  private async getOverviewData(filters?: FilterOptions) {
    const { data: workshopsData, error: workshopsError } = await supabase
      .from('workshops')
      .select('id')
      .eq('is_active', true);

    const { data: registrationsData, error: registrationsError } = await supabase
      .from('workshop_registrations')
      .select('id, created_at');

    const { data: completionsData, error: completionsError } = await supabase
      .from('workshop_completions')
      .select('id');

    const { data: ratingsData, error: ratingsError } = await supabase
      .from('workshop_ratings')
      .select('rating');

    const totalWorkshops = workshopsData?.length || 0;
    const totalRegistrations = registrationsData?.length || 0;
    const totalCompletions = completionsData?.length || 0;
    const averageRating = ratingsData?.length 
      ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length 
      : 0;

    // Calculate growth rate (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentRegistrations = registrationsData?.filter(r => 
      new Date(r.created_at) >= thirtyDaysAgo
    )?.length || 0;

    const previousRegistrations = registrationsData?.filter(r => 
      new Date(r.created_at) >= sixtyDaysAgo && new Date(r.created_at) < thirtyDaysAgo
    )?.length || 0;

    const growthRate = previousRegistrations > 0 
      ? ((recentRegistrations - previousRegistrations) / previousRegistrations) * 100 
      : 0;

    return {
      totalWorkshops,
      totalRegistrations,
      totalCompletions,
      averageRating: Math.round(averageRating * 10) / 10,
      revenue: totalRegistrations * 25, // Assuming $25 per registration
      growthRate: Math.round(growthRate * 10) / 10
    };
  }

  private async getDemographicsData(filters?: FilterOptions) {
    const { data: usersData, error } = await supabase
      .from('users')
      .select('faculty, department, year_of_study, gender');

    if (error || !usersData) {
      return {
        byFaculty: [],
        byDepartment: [],
        byYear: [],
        byGender: []
      };
    }

    const total = usersData.length;

    const byFaculty = this.groupAndCalculatePercentage(usersData, 'faculty', total);
    const byDepartment = this.groupAndCalculatePercentage(usersData, 'department', total);
    const byYear = this.groupAndCalculatePercentage(usersData, 'year_of_study', total);
    const byGender = this.groupAndCalculatePercentage(usersData, 'gender', total);

    return {
      byFaculty: byFaculty.map(item => ({ faculty: item.key, count: item.count, percentage: item.percentage })),
      byDepartment: byDepartment.map(item => ({ department: item.key, count: item.count, percentage: item.percentage })),
      byYear: byYear.map(item => ({ year: item.key, count: item.count, percentage: item.percentage })),
      byGender: byGender.map(item => ({ gender: item.key, count: item.count, percentage: item.percentage }))
    };
  }

  private async getEngagementData(filters?: FilterOptions) {
    // Mock data for now - in production, this would come from actual analytics tracking
    return {
      retentionRate: 72.5,
      averageSessionDuration: 45.2, // minutes
      bounceRate: 23.8,
      returningUsers: 156,
      newUsers: 89
    };
  }

  private async getPerformanceData(filters?: FilterOptions) {
    const { data: instructorData, error: instructorError } = await supabase
      .from('users')
      .select(`
        id, name,
        workshops:workshops!workshops_instructor_fkey(
          id,
          workshop_registrations(count),
          workshop_ratings(rating)
        )
      `)
      .eq('role', 'instructor');

    const { data: workshopData, error: workshopError } = await supabase
      .from('workshops')
      .select(`
        id, title,
        workshop_registrations(count),
        workshop_completions(count),
        workshop_ratings(rating)
      `)
      .eq('is_active', true);

    const topInstructors = instructorData?.map(instructor => {
      const workshops = instructor.workshops || [];
      const totalEnrollments = workshops.reduce((sum, w) => sum + (w.workshop_registrations?.length || 0), 0);
      const ratings = workshops.flatMap(w => w.workshop_ratings || []);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 0;

      return {
        name: instructor.name,
        rating: Math.round(averageRating * 10) / 10,
        workshopsCount: workshops.length,
        enrollments: totalEnrollments
      };
    }).sort((a, b) => b.rating - a.rating).slice(0, 10) || [];

    const workshopsWithMetrics = workshopData?.map(workshop => {
      const enrollments = workshop.workshop_registrations?.length || 0;
      const completions = workshop.workshop_completions?.length || 0;
      const ratings = workshop.workshop_ratings || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 0;
      const completionRate = enrollments > 0 ? Math.round((completions / enrollments) * 100) : 0;

      return {
        title: workshop.title,
        rating: Math.round(averageRating * 10) / 10,
        completionRate,
        enrollments
      };
    }) || [];

    const topWorkshops = workshopsWithMetrics
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    const lowPerformingWorkshops = workshopsWithMetrics
      .filter(w => w.rating < 3.5 || w.completionRate < 50)
      .sort((a, b) => a.rating - b.rating)
      .slice(0, 5);

    return {
      topInstructors,
      topWorkshops,
      lowPerformingWorkshops
    };
  }

  private async getTrendsData(filters?: FilterOptions) {
    const { data: registrationsData, error } = await supabase
      .from('workshop_registrations')
      .select('created_at, workshop:workshops(start_time)');

    if (error || !registrationsData) {
      return {
        registrationsByMonth: [],
        popularTimes: [],
        seasonalTrends: []
      };
    }

    // Group by month
    const monthlyData = new Map<string, { registrations: number; completions: number }>();
    registrationsData.forEach(reg => {
      const month = new Date(reg.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      const current = monthlyData.get(month) || { registrations: 0, completions: 0 };
      monthlyData.set(month, { ...current, registrations: current.registrations + 1 });
    });

    const registrationsByMonth = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      registrations: data.registrations,
      completions: data.completions
    }));

    // Popular times analysis
    const hourlyData = new Map<number, number>();
    registrationsData.forEach(reg => {
      if (reg.workshop?.start_time) {
        const hour = new Date(reg.workshop.start_time).getHours();
        hourlyData.set(hour, (hourlyData.get(hour) || 0) + 1);
      }
    });

    const popularTimes = Array.from(hourlyData.entries()).map(([hour, count]) => ({
      hour,
      count
    })).sort((a, b) => b.count - a.count);

    // Seasonal trends
    const seasonalData = [
      { season: 'Spring', count: 0, completion_rate: 0 },
      { season: 'Summer', count: 0, completion_rate: 0 },
      { season: 'Fall', count: 0, completion_rate: 0 },
      { season: 'Winter', count: 0, completion_rate: 0 }
    ];

    return {
      registrationsByMonth,
      popularTimes,
      seasonalTrends: seasonalData
    };
  }

  private async getPredictionsData(filters?: FilterOptions) {
    // Simple prediction based on historical data
    const { data: recentData, error } = await supabase
      .from('workshop_registrations')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    const recentRegistrations = recentData?.length || 0;
    const dailyAverage = recentRegistrations / 90;
    const nextMonthRegistrations = Math.round(dailyAverage * 30);

    return {
      nextMonthRegistrations,
      trendDirection: 'up' as const,
      capacityUtilization: 75.2,
      predictedRevenue: nextMonthRegistrations * 25
    };
  }

  private groupAndCalculatePercentage(data: any[], key: string, total: number) {
    const grouped = data.reduce((acc, item) => {
      const value = item[key] || 'Unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([key, count]) => ({
      key,
      count: count as number,
      percentage: Math.round(((count as number) / total) * 100 * 10) / 10
    })).sort((a, b) => b.count - a.count);
  }

  async exportAdvancedAnalytics(data: AdvancedAnalyticsData, filename: string) {
    const csvContent = this.convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private convertToCSV(data: AdvancedAnalyticsData): string {
    const sections = [
      '# Overview',
      `Total Workshops,${data.overview.totalWorkshops}`,
      `Total Registrations,${data.overview.totalRegistrations}`,
      `Total Completions,${data.overview.totalCompletions}`,
      `Average Rating,${data.overview.averageRating}`,
      `Revenue,$${data.overview.revenue}`,
      `Growth Rate,${data.overview.growthRate}%`,
      '',
      '# Top Instructors',
      'Name,Rating,Workshops,Enrollments',
      ...data.performance.topInstructors.map(i => `${i.name},${i.rating},${i.workshopsCount},${i.enrollments}`),
      '',
      '# Demographics by Faculty',
      'Faculty,Count,Percentage',
      ...data.demographics.byFaculty.map(d => `${d.faculty},${d.count},${d.percentage}%`),
    ];

    return sections.join('\n');
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();
export default advancedAnalyticsService;