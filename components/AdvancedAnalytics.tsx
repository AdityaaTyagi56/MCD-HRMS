import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Calendar,
  Activity,
  PieChart,
  Map,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
// Use premium colors for charts
const CHART_COLORS = {
  primary: '#2563eb',   // primary-600
  success: '#10b981',   // emerald-500
  warning: '#f59e0b',   // amber-500
  error: '#ef4444',     // rose-500
  purple: '#7c3aed',    // violet-600
  cyan: '#0891b2',      // cyan-600
  slate: '#64748b'      // slate-500
};

interface AnalyticsData {
  attendanceTrend: Array<{ date: string; present: number; absent: number; late: number }>;
  departmentDistribution: Array<{ name: string; value: number }>;
  grievanceStats: Array<{ category: string; count: number; resolved: number }>;
  performanceMetrics: Array<{ month: string; score: number }>;
  leaveAnalysis: Array<{ type: string; count: number }>;
  hourlyAttendance: Array<{ hour: string; count: number }>;
}

export default function AdvancedAnalytics() {
  const [data, setData] = useState<AnalyticsData>({
    attendanceTrend: [],
    departmentDistribution: [],
    grievanceStats: [],
    performanceMetrics: [],
    leaveAnalysis: [],
    hourlyAttendance: [],
  });
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    // Generate mock analytics data
    generateAnalyticsData();
  }, [timeRange]);

  const generateAnalyticsData = () => {
    // Attendance trend
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const attendanceTrend = Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        present: Math.floor(Math.random() * 50) + 150,
        absent: Math.floor(Math.random() * 20) + 5,
        late: Math.floor(Math.random() * 15) + 3,
      };
    });

    // Department distribution
    const departments = ['Sanitation', 'Engineering', 'Administration', 'Healthcare', 'Security', 'Maintenance'];
    const departmentDistribution = departments.map((name) => ({
      name,
      value: Math.floor(Math.random() * 100) + 50,
    }));

    // Grievance stats
    const categories = ['Equipment', 'Safety', 'Payment', 'Leave', 'Transfer', 'Other'];
    const grievanceStats = categories.map((category) => {
      const count = Math.floor(Math.random() * 50) + 10;
      return {
        category,
        count,
        resolved: Math.floor(count * (0.7 + Math.random() * 0.25)),
      };
    });

    // Performance metrics
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const performanceMetrics = months.slice(0, 6).map((month) => ({
      month,
      score: Math.floor(Math.random() * 20) + 75,
    }));

    // Leave analysis
    const leaveTypes = ['Sick Leave', 'Casual Leave', 'Earned Leave', 'LWP'];
    const leaveAnalysis = leaveTypes.map((type) => ({
      type,
      count: Math.floor(Math.random() * 100) + 30,
    }));

    // Hourly attendance
    const hours = ['7AM', '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM'];
    const hourlyAttendance = hours.map((hour) => ({
      hour,
      count: Math.floor(Math.random() * 50) + 120,
    }));

    setData({
      attendanceTrend,
      departmentDistribution,
      grievanceStats,
      performanceMetrics,
      leaveAnalysis,
      hourlyAttendance,
    });
  };

  return (
    <div className="space-y-6 animate-enter">
      {/* Header */}
      <div className="glass-header rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-10 border border-slate-200/60 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 rounded-xl text-primary-600 shadow-sm border border-primary-100">
              <BarChart3 className="w-6 h-6" />
            </div>
            Advanced Analytics
          </h2>
          <p className="text-slate-500 mt-1 font-medium ml-1">Comprehensive workforce insights</p>
        </div>
        <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${timeRange === range
                ? 'bg-white text-primary-600 shadow-sm border border-slate-200/60 scale-100'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? 'Quarter' : 'Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users className="w-6 h-6" />}
          title="Total Workforce"
          value="1,247"
          change="+5.2%"
          changeType="positive"
          color="blue"
        />
        <MetricCard
          icon={<Activity className="w-6 h-6" />}
          title="Avg Attendance"
          value="94.3%"
          change="+2.1%"
          changeType="positive"
          color="green"
        />
        <MetricCard
          icon={<Clock className="w-6 h-6" />}
          title="Avg Check-in"
          value="9:12 AM"
          change="-5 mins"
          changeType="positive"
          color="orange"
        />
        <MetricCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Performance"
          value="87.5"
          change="+3.8%"
          changeType="positive"
          color="purple"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <ChartCard title="Attendance Trend" icon={<Calendar className="text-slate-400" />}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.attendanceTrend}>
              <defs>
                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.error} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.error} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ fontSize: '12px', fontWeight: '600' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Area type="monotone" dataKey="present" stroke={CHART_COLORS.success} strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" name="Present" />
              <Area type="monotone" dataKey="absent" stroke={CHART_COLORS.error} strokeWidth={3} fillOpacity={1} fill="url(#colorAbsent)" name="Absent" />
              <Area type="monotone" dataKey="late" stroke={CHART_COLORS.warning} strokeWidth={2} fill="transparent" strokeDasharray="5 5" name="Late" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Department Distribution */}
        <ChartCard title="Department Distribution" icon={<PieChart className="text-slate-400" />}>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={data.departmentDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {data.departmentDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}
              />
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}
              />
            </RePieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Grievance Resolution */}
        <ChartCard title="Grievance Analytics" icon={<BarChart3 className="text-slate-400" />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.grievanceStats} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval={0} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="count" fill={CHART_COLORS.primary} name="Total Reports" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" fill={CHART_COLORS.success} name="Resolved" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Performance Trend */}
        <ChartCard title="Performance Velocity" icon={<TrendingUp className="text-slate-400" />}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.performanceMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis domain={[60, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Line
                type="monotone"
                dataKey="score"
                stroke={CHART_COLORS.purple}
                strokeWidth={4}
                dot={{ stroke: '#fff', strokeWidth: 2, r: 4, fill: CHART_COLORS.purple }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                name="Avg Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Leave Analysis */}
        <ChartCard title="Leave Distribution" icon={<Calendar className="text-slate-400" />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.leaveAnalysis} layout="vertical" barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="type" type="category" width={110} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} fontWeight={500} />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Bar dataKey="count" fill={CHART_COLORS.cyan} radius={[0, 4, 4, 0]}>
                {
                  data.leaveAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? CHART_COLORS.cyan : '#22d3ee'} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Hourly Attendance Pattern */}
        <ChartCard title="Peak Hours Activity" icon={<Clock className="text-slate-400" />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.hourlyAttendance} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Bar dataKey="count" fill={CHART_COLORS.warning} radius={[6, 6, 0, 0]} opacity={0.9} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
            <Map className="w-5 h-5" />
          </div>
          AI-Generated Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard
            title="Attendance Improving"
            description="94.3% avg attendance, up 2.1% from last month."
            type="positive"
          />
          <InsightCard
            title="Equipment Grievances"
            description="High volume in equipment category - requires maintenance review."
            type="warning"
          />
          <InsightCard
            title="Peak Check-in Time"
            description="Staff arrival peaks between 9:00 AM - 10:00 AM."
            type="info"
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value, change, changeType, color }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    orange: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-violet-50 text-violet-600 border-violet-100',
  };

  return (
    <div className="glass-card hover:bg-white/80 p-6 rounded-2xl border border-slate-200/60 shadow-sm transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl border ${colors[color]} group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${changeType === 'positive' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          } flex items-center gap-1`}>
          {changeType === 'positive' ? '↑' : '↓'} {change}
        </span>
      </div>
      <div>
        <h3 className="text-slate-500 text-sm font-semibold tracking-wide uppercase">{title}</h3>
        <p className="text-3xl font-bold text-slate-800 mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, icon, children }: any) {
  return (
    <div className="glass-card bg-white/50 p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          {title}
        </h3>
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
          {icon}
        </div>
      </div>
      <div className="min-h-[300px]">
        {children}
      </div>
    </div>
  );
}

function InsightCard({ title, description, type }: any) {
  const styles: Record<string, string> = {
    positive: 'bg-emerald-50/50 border-emerald-100 text-emerald-900',
    warning: 'bg-amber-50/50 border-amber-100 text-amber-900',
    info: 'bg-blue-50/50 border-blue-100 text-blue-900',
  };

  const icons: Record<string, string> = {
    positive: '✅',
    warning: '⚠️',
    info: '💡'
  }

  return (
    <div className={`p-5 rounded-2xl border ${styles[type]} backdrop-blur-sm cursor-default hover:scale-[1.02] transition-transform`}>
      <h4 className="font-bold mb-2 text-sm flex items-center gap-2">
        <span>{icons[type]}</span>
        {title}
      </h4>
      <p className="text-sm opacity-80 leading-relaxed font-medium">{description}</p>
    </div>
  );
}
