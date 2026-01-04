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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Advanced Analytics
          </h2>
          <p className="text-gray-500 mt-1">Comprehensive insights and trends</p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                timeRange === range
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          icon={<Users className="w-6 h-6" />}
          title="Total Employees"
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
        <ChartCard title="Attendance Trend" icon={<Calendar />}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.attendanceTrend}>
              <defs>
                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="present" stroke="#10b981" fillOpacity={1} fill="url(#colorPresent)" name="Present" />
              <Area type="monotone" dataKey="absent" stroke="#ef4444" fillOpacity={1} fill="url(#colorAbsent)" name="Absent" />
              <Area type="monotone" dataKey="late" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Late" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Department Distribution */}
        <ChartCard title="Department Distribution" icon={<PieChart />}>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={data.departmentDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.departmentDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Grievance Resolution */}
        <ChartCard title="Grievance Resolution" icon={<BarChart3 />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.grievanceStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Total" />
              <Bar dataKey="resolved" fill="#10b981" name="Resolved" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Performance Trend */}
        <ChartCard title="Performance Trend" icon={<TrendingUp />}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.performanceMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} name="Performance Score" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Leave Analysis */}
        <ChartCard title="Leave Analysis" icon={<Calendar />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.leaveAnalysis} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="type" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Hourly Attendance Pattern */}
        <ChartCard title="Hourly Attendance Pattern" icon={<Clock />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.hourlyAttendance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-600" />
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard
            title="Attendance Improving"
            description="94.3% avg attendance, up 2.1% from last month"
            type="positive"
          />
          <InsightCard
            title="Equipment Grievances"
            description="High volume in equipment category - needs attention"
            type="warning"
          />
          <InsightCard
            title="Peak Hours"
            description="Most attendance marked between 9-10 AM"
            type="info"
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value, change, changeType, color }: any) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <div className={`inline-flex p-3 rounded-lg ${colors[color]} mb-3`}>{icon}</div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      <p className={`text-sm mt-2 ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
        {change} from last period
      </p>
    </div>
  );
}

function ChartCard({ title, icon, children }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function InsightCard({ title, description, type }: any) {
  const styles = {
    positive: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={`p-4 rounded-lg border ${styles[type]}`}>
      <h4 className="font-bold mb-1">{title}</h4>
      <p className="text-sm opacity-90">{description}</p>
    </div>
  );
}
