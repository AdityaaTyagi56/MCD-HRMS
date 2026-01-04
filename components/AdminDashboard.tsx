import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { 
  Users, 
  UserCheck, 
  AlertCircle, 
  ArrowUpRight, 
  MapPin, 
  Search, 
  TrendingUp, 
  Database, 
  Activity, 
  ShieldCheck,
  Siren,
  Radio,
  Brain,
  Sparkles,
  Bot,
  Send,
  Loader2,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  MessageCircle,
  IndianRupee,
  Calendar,
  Clock,
  Zap,
  Eye,
  Filter,
  MoreVertical,
  Star,
  Award,
  Target,
  Cpu,
  FileSearch,
  UserX,
  TrendingDown,
  RefreshCw,
  MessageSquare,
  Mic,
  ChevronRight,
  FileText
} from 'lucide-react';
import aiService from '../services/ai';
import WhatsAppPanel from './WhatsAppPanel';
import { api } from '../services/api';
import { fetchDelhiWeather, pickHighestRiskWard, WeatherSnapshot } from '../services/weather';
import { Ward } from '../types';

const AdminDashboard: React.FC = () => {
  const { employees, grievances, resolveGrievance } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [tickerIndex, setTickerIndex] = useState(0);
  const [showWhatsAppPanel, setShowWhatsAppPanel] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [grievanceFilter, setGrievanceFilter] = useState<'all' | 'Pending' | 'Resolved'>('all');
  const [selectedGrievance, setSelectedGrievance] = useState<any>(null);
  
  // AI State
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const fallbackAlerts = useMemo(() => [
    "🚨 CRITICAL: Heavy rain forecast in Zone 4 - Deployment increased",
    "⚠️ ALERT: 3 Grievances escalated to Level 2 in Sanitation Dept",
    "ℹ️ INFO: Biometric Server Maintenance scheduled for 2 AM",
    "📢 NOTICE: New Transfer Policy effective from next month",
    "✅ SUCCESS: Monthly payroll processed for all departments"
  ], []);
  const [alerts, setAlerts] = useState<string[]>(fallbackAlerts);
  
  // ML Service State
  const [mlServiceStatus, setMlServiceStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [mlAnalysisResult, setMlAnalysisResult] = useState<any>(null);
  const [mlAnalysisLoading, setMlAnalysisLoading] = useState(false);
  
  const ML_API_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8002';

  // Filter grievances
  const filteredGrievances = grievances.filter(g => 
    grievanceFilter === 'all' ? true : g.status === grievanceFilter
  ).sort((a, b) => {
    // Sort by priority (High first) then by date
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
  });

  // Calculate Enhanced Metrics
  const totalEmployees = employees.length;
  const presentToday = employees.filter(e => e.status === 'Present').length;
  const onLeave = employees.filter(e => e.status === 'On Leave').length;
  const absent = employees.filter(e => e.status === 'Absent').length;
  const pendingGrievances = grievances.filter(g => g.status === 'Pending').length;
  const attendancePercentage = Math.round((presentToday / totalEmployees) * 100);
  
  // Enhanced calculations
  const avgPerformanceScore = Math.round(
    employees.reduce((sum, emp) => sum + emp.performance.attendanceScore, 0) / employees.length
  );
  const criticalAlerts = grievances.filter(g => g.priority === 'High' && g.status === 'Pending').length;
  const monthlySavings = absent * 500; // ₹500 per absent employee

  // Filter Employees Logic
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Enhanced Chart Data
  const attendanceTrendData = [
    { day: 'Mon', present: 85, target: 90 },
    { day: 'Tue', present: 88, target: 90 },
    { day: 'Wed', present: 82, target: 90 },
    { day: 'Thu', present: 90, target: 90 },
    { day: 'Fri', present: attendancePercentage, target: 90 },
    { day: 'Sat', present: 45, target: 50 },
    { day: 'Sun', present: 20, target: 25 },
  ];

  const departmentData = [
    { name: 'Sanitation', value: employees.filter(e => e.department === 'Sanitation').length, color: '#0ea5e9', performance: 85 },
    { name: 'Administration', value: employees.filter(e => e.department === 'Administration').length, color: '#d97706', performance: 92 },
    { name: 'Engineering', value: employees.filter(e => e.department === 'Engineering').length, color: '#22c55e', performance: 78 },
    { name: 'Health', value: employees.filter(e => e.department === 'Health').length, color: '#8b5cf6', performance: 88 },
  ];

  const performanceDistribution = [
    { grade: 'A+', count: employees.filter(e => e.performance.overallGrade === 'A+').length, color: '#22c55e' },
    { grade: 'A', count: employees.filter(e => e.performance.overallGrade === 'A').length, color: '#84cc16' },
    { grade: 'B', count: employees.filter(e => e.performance.overallGrade === 'B').length, color: '#f59e0b' },
    { grade: 'C', count: employees.filter(e => e.performance.overallGrade === 'C').length, color: '#f97316' },
    { grade: 'D', count: employees.filter(e => e.performance.overallGrade === 'D').length, color: '#ef4444' },
  ];

  const riskScore = (level: Ward['riskLevel']) => {
    switch (level) {
      case 'Critical':
        return 4;
      case 'High':
        return 3;
      case 'Medium':
        return 2;
      default:
        return 1;
    }
  };

  const buildAlerts = (wx: WeatherSnapshot | null, wardList: Ward[]) => {
    if (!wx || !wardList.length) return fallbackAlerts;
    const topWard = pickHighestRiskWard(wardList);
    const zoneLabel = topWard ? `${topWard.zone}` : 'Zone';
    const wardName = topWard ? `${topWard.name}` : 'Priority ward';

    const derived: string[] = [];
    if (wx.condition === 'heavy_rain') {
      derived.push(`🚨 CRITICAL: Heavy rain forecast in ${zoneLabel} - Deployment increased`);
    } else if (wx.condition === 'light_rain') {
      derived.push(`⚠️ ALERT: Moderate rain expected near ${zoneLabel} - Cover assets`);
    } else if (wx.condition === 'windy') {
      derived.push(`⚠️ WIND: Gusty winds in ${zoneLabel} - Secure equipment`);
    } else {
      derived.push(`ℹ️ INFO: Weather stable in Delhi (${wx.temperatureC.toFixed(0)}°C)`);
    }

    derived.push(`🌧️ Precip: ${wx.precipitationMm.toFixed(1)} mm | 💨 Wind: ${wx.windKph.toFixed(1)} km/h`);

    if (topWard) {
      const scoreLabel = ['Low', 'Medium', 'High', 'Critical'][riskScore(topWard.riskLevel) - 1] || 'Monitoring';
      derived.push(`📍 Ward watch: ${wardName} (${zoneLabel}) - ${scoreLabel} risk`);
    }

    return derived.length ? derived : fallbackAlerts;
  };

  // Fetch weather + wards and build alerts
  useEffect(() => {
    const load = async () => {
      try {
        const [wx, wardData] = await Promise.all([fetchDelhiWeather(), api.listWards()]);
        setWeather(wx);
        setWards(wardData);
        setAlerts(buildAlerts(wx, wardData));
      } catch (err) {
        console.warn('Alert sources unavailable, using fallback', err);
        setAlerts(fallbackAlerts);
      }
    };
    load();
  }, [fallbackAlerts]);

  // Ticker Animation
  useEffect(() => {
    if (!alerts.length) return;
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % alerts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [alerts]);

  // Check ML Service Status
  useEffect(() => {
    const checkMLService = async () => {
      try {
        const response = await fetch(`${ML_API_URL}/health`);
        if (response.ok) {
          setMlServiceStatus('online');
        } else {
          setMlServiceStatus('offline');
        }
      } catch {
        setMlServiceStatus('offline');
      }
    };
    checkMLService();
    const interval = setInterval(checkMLService, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // ML Payroll Scan
  const runPayrollScan = async () => {
    setMlAnalysisLoading(true);
    try {
      const response = await fetch(`${ML_API_URL}/integrity/payroll-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: employees.map(emp => ({
            id: emp.id,
            name: emp.name,
            bank_account: emp.bankAccount || 'MOCK-XXXX',
            mobile_number: emp.mobile || '9999999999',
            department: emp.department,
            role: emp.role,
            salary: emp.salary || 25000,
            status: emp.status,
            attendance_score: emp.performance?.attendanceScore || 0,
            days_present: Math.round((emp.performance?.attendanceScore || 0) * 30 / 100)
          }))
        })
      });
      const data = await response.json();
      setMlAnalysisResult({ type: 'payroll', data });
    } catch (error) {
      setMlAnalysisResult({ type: 'error', message: 'ML Service unavailable' });
    } finally {
      setMlAnalysisLoading(false);
    }
  };

  // ML Ghost Employee Detection
  const runGhostDetection = async () => {
    setMlAnalysisLoading(true);
    try {
      const response = await fetch(`${ML_API_URL}/integrity/ghost-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: employees.map(emp => ({
            id: emp.id,
            name: emp.name,
            bank_account: emp.bankAccount || 'MOCK-XXXX',
            mobile_number: emp.mobile || '9999999999',
            department: emp.department,
            role: emp.role,
            salary: emp.salary || 25000,
            status: emp.status,
            attendance_score: emp.performance?.attendanceScore || 0,
            days_present: Math.round((emp.performance?.attendanceScore || 0) * 30 / 100)
          }))
        })
      });
      const data = await response.json();
      setMlAnalysisResult({ type: 'ghost', data });
    } catch (error) {
      setMlAnalysisResult({ type: 'error', message: 'ML Service unavailable for ghost detection' });
    } finally {
      setMlAnalysisLoading(false);
    }
  };

  // AI Query Handler - Uses ML Service chat endpoint
  const handleAIQuery = async () => {
    if (!aiQuery.trim()) return;
    
    setAiLoading(true);
    console.log('🤖 AI Query:', aiQuery);
    
    try {
      // Try ML Service chat endpoint first (more reliable)
      const mlResponse = await fetch(`${ML_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: aiQuery,
          context: {
            totalEmployees: employees.length,
            presentToday,
            pendingGrievances,
            departments: [...new Set(employees.map(e => e.department))]
          }
        })
      });
      
      if (mlResponse.ok) {
        const data = await mlResponse.json();
        console.log('✅ ML Chat response:', data);
        if (data.success && data.response) {
          setAiResponse(data.response);
          return;
        }
      }
      
      // Fallback to aiService
      console.log('⚠️ ML Chat failed, trying aiService...');
      const response = await aiService.askAIAssistant(aiQuery, {
        totalEmployees: employees.length,
        presentToday,
        pendingGrievances,
        departments: [...new Set(employees.map(e => e.department))]
      });
      setAiResponse(response.data?.answer || 'Analysis completed successfully.');
    } catch (error) {
      console.error('❌ AI Error:', error);
      setAiResponse('AI service temporarily unavailable. Please try again later.');
    } finally {
      setAiLoading(false);
    }
  };

  // Stats Cards Data
  const statsCards = [
    {
      title: 'Total Workforce',
      value: totalEmployees.toString(),
      change: '+2.5%',
      trend: 'up',
      icon: Users,
      bgStyle: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 50%, #4338ca 100%)',
    },
    {
      title: 'Present Today',
      value: `${presentToday}/${totalEmployees}`,
      change: `${attendancePercentage}%`,
      trend: attendancePercentage >= 85 ? 'up' : 'down',
      icon: UserCheck,
      bgStyle: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
    },
    {
      title: 'Pending Issues',
      value: pendingGrievances.toString(),
      change: criticalAlerts > 0 ? `${criticalAlerts} critical` : 'All resolved',
      trend: criticalAlerts > 0 ? 'down' : 'up',
      icon: AlertCircle,
      bgStyle: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #dc2626 100%)',
    },
    {
      title: 'Monthly Savings',
      value: `₹${(monthlySavings / 1000).toFixed(0)}K`,
      change: 'Biometric tracking',
      trend: 'up',
      icon: IndianRupee,
      bgStyle: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6366f1 100%)',
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Alert Ticker */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 rounded-2xl shadow-soft-lg overflow-hidden relative">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Siren className="animate-pulse" size={20} />
            <span className="font-bold text-sm">LIVE ALERTS</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div 
              className="animate-slide-up transition-all duration-500"
              key={tickerIndex}
            >
              <p className="text-sm font-medium">{alerts[tickerIndex]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary-200">
            <Radio size={16} className="animate-pulse" />
            <span className="text-xs">LIVE</span>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <div key={card.title} className="group card-hover">
            <div 
              className="rounded-2xl p-6 shadow-lg relative overflow-hidden min-h-[160px] flex flex-col justify-between"
              style={{ background: card.bgStyle }}
            >
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" style={{ background: 'rgba(255,255,255,0.1)' }}></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" style={{ background: 'rgba(0,0,0,0.1)' }}></div>
              
              {/* Floating circles pattern */}
              <div className="absolute top-4 right-4 w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }}></div>
              <div className="absolute top-8 right-8 w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}></div>
              <div className="absolute bottom-8 left-8 w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }}></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl shadow-lg" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <card.icon style={{ color: '#ffffff' }} size={24} />
                  </div>
                  <div 
                    className="flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full"
                    style={{ background: card.trend === 'up' ? 'rgba(255,255,255,0.2)' : 'rgba(239,68,68,0.3)' }}
                  >
                    <ArrowUpRight style={{ color: '#ffffff' }} size={14} className={card.trend === 'down' ? 'rotate-90' : ''} />
                    <span style={{ color: '#ffffff' }}>{card.change}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-3xl font-bold mb-1" style={{ color: '#ffffff' }}>{card.value}</h3>
                  <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>{card.title}</p>
                </div>
              </div>
              
              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)' }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions - WhatsApp & AI Integration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp Messaging Card */}
        <div 
          className="rounded-2xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
          style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
          onClick={() => setShowWhatsAppPanel(true)}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" style={{ background: 'rgba(255,255,255,0.15)' }}></div>
          
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <MessageCircle size={28} style={{ color: '#ffffff' }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: '#ffffff' }}>WhatsApp Notifications</h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>Send bulk messages to employees</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                  📅 Attendance Reminders
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                  💰 Salary Alerts
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                  🚨 Emergency Broadcast
                </span>
              </div>
              
              <button 
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all group-hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.95)', color: '#128C7E' }}
              >
                <Send size={16} />
                Open WhatsApp Panel
              </button>
            </div>
            
            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>{employees.length}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Employees</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Assistant Card */}
        <div 
          className="rounded-2xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          onClick={() => setShowAIPanel(true)}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" style={{ background: 'rgba(255,255,255,0.15)' }}></div>
          
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Brain size={28} style={{ color: '#ffffff' }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: '#ffffff' }}>AI Assistant</h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>Intelligent workforce analytics</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                  🔍 Fraud Detection
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                  📊 Performance Insights
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                  🤖 Smart Analysis
                </span>
              </div>
              
              <button 
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all group-hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.95)', color: '#764ba2' }}
              >
                <Sparkles size={16} />
                Ask AI Assistant
              </button>
            </div>
            
            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${mlServiceStatus === 'online' ? 'bg-green-400' : mlServiceStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400'} animate-pulse`}></div>
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  ML: {mlServiceStatus === 'online' ? 'Online' : mlServiceStatus === 'offline' ? 'Offline' : 'Checking...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-soft border border-neutral-200/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-black">Attendance Trends</h3>
              <p className="text-sm text-neutral-600">Weekly performance overview</p>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrendData}>
                <defs>
                  <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="present" 
                  stroke="#0ea5e9" 
                  strokeWidth={3}
                  fill="url(#attendanceGradient)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-neutral-200/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-black">Department Wise</h3>
              <p className="text-sm text-neutral-600">Workforce distribution</p>
            </div>
            <MoreVertical size={20} className="text-neutral-400" />
          </div>
          
          <div className="h-64 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-3">
            {departmentData.map((dept, index) => (
              <div key={dept.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: dept.color }}
                  ></div>
                  <span className="text-sm font-medium text-neutral-800">{dept.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-black">{dept.value}</span>
                  <div className="text-xs text-neutral-600">{dept.performance}% avg</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance & Employee Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Performance Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-neutral-200/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-black">Performance</h3>
              <p className="text-sm text-neutral-600">Grade distribution</p>
            </div>
            <Award size={20} className="text-warning-500" />
          </div>
          
          <div className="space-y-4">
            {performanceDistribution.map((grade) => (
              <div key={grade.grade} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: grade.color }}
                  >
                    {grade.grade}
                  </div>
                  <span className="text-sm font-medium text-neutral-800">Grade {grade.grade}</span>
                </div>
                <span className="text-sm font-bold text-black">{grade.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Table */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-soft border border-neutral-200/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-black">Live Employee Status</h3>
              <p className="text-sm text-neutral-600">Real-time attendance tracking</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search employees..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none w-64"
                />
              </div>
              <button className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                <Filter size={18} className="text-neutral-600" />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 font-medium text-neutral-600 text-sm">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600 text-sm">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600 text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600 text-sm">Check-in</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600 text-sm">Performance</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.slice(0, 8).map((emp) => (
                  <tr key={emp.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-primary-50 rounded-lg flex items-center justify-center text-primary-600 font-bold text-sm">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-black text-sm">{emp.name}</p>
                          <p className="text-xs text-neutral-600">{emp.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-neutral-800">{emp.department}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`status-badge ${
                        emp.status === 'Present' ? 'status-present' : 
                        emp.status === 'On Leave' ? 'status-leave' : 'status-absent'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          emp.status === 'Present' ? 'bg-success-500' : 
                          emp.status === 'On Leave' ? 'bg-warning-500' : 'bg-error-500'
                        }`}></span>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-neutral-800">
                        {emp.attendanceTime || '--'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-2 bg-neutral-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-success-500 to-success-400 rounded-full transition-all"
                            style={{ width: `${emp.performance.attendanceScore}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-neutral-700">
                          {emp.performance.attendanceScore}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* NLP Grievances Section */}
      <div className="bg-white rounded-2xl shadow-soft border border-neutral-200/50 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-neutral-100" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.2)' }}>
                <MessageSquare size={28} style={{ color: '#d97706' }} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-900">Employee Grievances</h3>
                <p className="text-sm text-amber-700">AI-powered complaint analysis & routing</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80">
                <Mic size={14} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-800">Voice NLP Enabled</span>
              </div>
              <div className="flex bg-white/80 rounded-lg p-1">
                {(['all', 'Pending', 'Resolved'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setGrievanceFilter(filter)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      grievanceFilter === filter 
                        ? 'bg-amber-500 text-white shadow-sm' 
                        : 'text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {filter === 'all' ? 'All' : filter} ({filter === 'all' ? grievances.length : grievances.filter(g => g.status === filter).length})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Grievance Stats */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-neutral-50 border-b border-neutral-100">
          <div className="text-center p-3 bg-white rounded-xl">
            <p className="text-2xl font-bold text-neutral-800">{grievances.length}</p>
            <p className="text-xs text-neutral-500">Total</p>
          </div>
          <div className="text-center p-3 bg-white rounded-xl">
            <p className="text-2xl font-bold text-amber-600">{grievances.filter(g => g.status === 'Pending').length}</p>
            <p className="text-xs text-neutral-500">Pending</p>
          </div>
          <div className="text-center p-3 bg-white rounded-xl">
            <p className="text-2xl font-bold text-red-600">{grievances.filter(g => g.priority === 'High').length}</p>
            <p className="text-xs text-neutral-500">High Priority</p>
          </div>
          <div className="text-center p-3 bg-white rounded-xl">
            <p className="text-2xl font-bold text-green-600">{grievances.filter(g => g.status === 'Resolved').length}</p>
            <p className="text-xs text-neutral-500">Resolved</p>
          </div>
        </div>

        {/* Grievance List */}
        <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
          {filteredGrievances.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare size={48} className="mx-auto text-neutral-300 mb-4" />
              <p className="text-neutral-500">No grievances found</p>
            </div>
          ) : (
            filteredGrievances.map((grievance) => (
              <div 
                key={grievance.id} 
                className="p-4 hover:bg-neutral-50 transition-colors cursor-pointer"
                onClick={() => setSelectedGrievance(grievance)}
              >
                <div className="flex items-start gap-4">
                  {/* Priority Indicator */}
                  <div className={`w-1 h-full min-h-[60px] rounded-full ${
                    grievance.priority === 'High' ? 'bg-red-500' : 
                    grievance.priority === 'Medium' ? 'bg-amber-500' : 'bg-green-500'
                  }`}></div>
                  
                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        grievance.priority === 'High' ? 'bg-red-100 text-red-700' : 
                        grievance.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {grievance.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {grievance.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        grievance.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {grievance.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-neutral-800 line-clamp-2 mb-2">{grievance.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {grievance.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText size={12} />
                        #{grievance.id}
                      </span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {grievance.status === 'Pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveGrievance(grievance.id);
                        }}
                        className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle size={12} />
                        Resolve
                      </button>
                    )}
                    <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
                      <ChevronRight size={16} className="text-neutral-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Grievance Detail Modal */}
      {selectedGrievance && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className={`p-4 ${
              selectedGrievance.priority === 'High' ? 'bg-gradient-to-r from-red-500 to-red-600' : 
              selectedGrievance.priority === 'Medium' ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 
              'bg-gradient-to-r from-green-500 to-green-600'
            }`}>
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <MessageSquare size={24} />
                  <div>
                    <h3 className="font-bold">Grievance #{selectedGrievance.id}</h3>
                    <p className="text-sm opacity-90">{selectedGrievance.category}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedGrievance(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Status & Priority */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedGrievance.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                }`}>
                  {selectedGrievance.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedGrievance.priority === 'High' ? 'bg-red-100 text-red-700' : 
                  selectedGrievance.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                }`}>
                  {selectedGrievance.priority} Priority
                </span>
              </div>
              
              {/* Description */}
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Description</label>
                <p className="mt-1 text-neutral-800 bg-neutral-50 p-4 rounded-xl">{selectedGrievance.description}</p>
              </div>
              
              {/* NLP Analysis Badge */}
              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                <Brain size={18} className="text-purple-600" />
                <div>
                  <p className="text-xs font-medium text-purple-800">AI-Analyzed Complaint</p>
                  <p className="text-xs text-purple-600">Category and priority auto-detected by NLP</p>
                </div>
              </div>
              
              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Submitted</label>
                  <p className="mt-1 text-sm text-neutral-800">{selectedGrievance.date}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Department</label>
                  <p className="mt-1 text-sm text-neutral-800">
                    {selectedGrievance.category.includes('Harassment') ? 'HR' : 'Admin'}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-neutral-100">
                {selectedGrievance.status === 'Pending' ? (
                  <>
                    <button
                      onClick={() => {
                        resolveGrievance(selectedGrievance.id);
                        setSelectedGrievance(null);
                      }}
                      className="flex-1 py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Mark as Resolved
                    </button>
                    <button
                      onClick={() => setSelectedGrievance(null)}
                      className="px-6 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl hover:bg-neutral-200 transition-colors"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setSelectedGrievance(null)}
                    className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl hover:bg-neutral-200 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        {/* WhatsApp Panel Button */}
        <button
          onClick={() => setShowWhatsAppPanel(true)}
          className="w-14 h-14 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-full shadow-soft-lg hover:shadow-soft-lg hover:scale-105 transition-all duration-200 flex items-center justify-center group"
        >
          <MessageCircle size={24} className="group-hover:scale-110 transition-transform" />
        </button>

        {/* AI Assistant Button */}
        <button
          onClick={() => setShowAIPanel(true)}
          className="w-14 h-14 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full shadow-soft-lg hover:shadow-soft-lg hover:scale-105 transition-all duration-200 flex items-center justify-center group"
        >
          <Brain size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* WhatsApp Panel */}
      <WhatsAppPanel isOpen={showWhatsAppPanel} onClose={() => setShowWhatsAppPanel(false)} />

      {/* AI Assistant Panel */}
      {showAIPanel && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <Brain size={24} />
                <div>
                  <h2 className="font-bold text-lg">AI Assistant & ML Analytics</h2>
                  <p className="text-purple-100 text-sm">Intelligent workforce analytics powered by AI</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <div className={`w-2 h-2 rounded-full ${mlServiceStatus === 'online' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                  <span className="text-xs">ML: {mlServiceStatus === 'online' ? 'Online' : 'Offline'}</span>
                </div>
                <button onClick={() => setShowAIPanel(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* AI Chat Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Bot size={18} className="text-purple-600" />
                  Ask AI Assistant
                </h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder="Ask about workforce analytics, attendance patterns, or performance insights..."
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800"
                    onKeyPress={(e) => e.key === 'Enter' && handleAIQuery()}
                  />
                  <button
                    onClick={handleAIQuery}
                    disabled={aiLoading || !aiQuery.trim()}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {aiLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    {aiLoading ? 'Analyzing...' : 'Ask'}
                  </button>
                </div>

                {aiResponse && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                        <Bot size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 leading-relaxed">{aiResponse}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setAiQuery("Analyze attendance patterns for fraud detection")}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors border border-gray-200"
                  >
                    <p className="font-medium text-sm text-gray-900">🔍 Fraud Detection</p>
                    <p className="text-xs text-gray-500">Analyze attendance anomalies</p>
                  </button>
                  <button 
                    onClick={() => setAiQuery("Generate performance insights report")}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors border border-gray-200"
                  >
                    <p className="font-medium text-sm text-gray-900">📊 Performance Report</p>
                    <p className="text-xs text-gray-500">Department-wise analysis</p>
                  </button>
                </div>
              </div>

              {/* ML Service Section */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Cpu size={18} className="text-indigo-600" />
                  ML Security Services
                  {mlServiceStatus === 'online' && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Connected</span>
                  )}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Payroll Scan */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileSearch size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Payroll Integrity Scan</h4>
                        <p className="text-xs text-gray-500">Detect anomalies in payroll data</p>
                      </div>
                    </div>
                    <button
                      onClick={runPayrollScan}
                      disabled={mlServiceStatus !== 'online' || mlAnalysisLoading}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      {mlAnalysisLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Shield size={16} />
                          Run Payroll Scan
                        </>
                      )}
                    </button>
                  </div>

                  {/* Ghost Employee Detection */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <UserX size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Ghost Employee Check</h4>
                        <p className="text-xs text-gray-500">AI-powered fake employee detection</p>
                      </div>
                    </div>
                    <button
                      onClick={runGhostDetection}
                      disabled={mlServiceStatus !== 'online' || mlAnalysisLoading}
                      className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      {mlAnalysisLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={16} />
                          Detect Ghost Employees
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* ML Analysis Results */}
                {mlAnalysisResult && (
                  <div className={`rounded-xl p-4 border ${
                    mlAnalysisResult.type === 'error' 
                      ? 'bg-red-50 border-red-200' 
                      : mlAnalysisResult.data?.risk_level === 'HIGH' 
                        ? 'bg-red-50 border-red-200'
                        : mlAnalysisResult.data?.risk_level === 'MEDIUM'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-green-50 border-green-200'
                  }`}>
                    {mlAnalysisResult.type === 'error' ? (
                      <div className="flex items-center gap-3 text-red-700">
                        <AlertCircle size={20} />
                        <span>{mlAnalysisResult.message}</span>
                      </div>
                    ) : mlAnalysisResult.type === 'ghost' ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                            <UserX size={18} className={
                              mlAnalysisResult.data.risk_level === 'LOW' ? 'text-green-600' :
                              mlAnalysisResult.data.risk_level === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'
                            } />
                            Ghost Employee Detection Results
                            {mlAnalysisResult.data.ai_powered && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">AI Powered</span>
                            )}
                          </h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            mlAnalysisResult.data.risk_level === 'LOW' ? 'bg-green-100 text-green-700' :
                            mlAnalysisResult.data.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {mlAnalysisResult.data.risk_level} RISK
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-gray-800">{mlAnalysisResult.data.total_analyzed}</p>
                            <p className="text-xs text-gray-500">Employees Analyzed</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-orange-600">{mlAnalysisResult.data.ghost_probability}%</p>
                            <p className="text-xs text-gray-500">Ghost Probability</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-red-600">₹{(mlAnalysisResult.data.estimated_monthly_fraud / 1000).toFixed(0)}K</p>
                            <p className="text-xs text-gray-500">Est. Monthly Fraud</p>
                          </div>
                        </div>
                        {mlAnalysisResult.data.patterns_detected?.length > 0 && (
                          <div className="mt-3 p-3 bg-white/50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-2">🔍 Patterns Detected:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {mlAnalysisResult.data.patterns_detected.map((pattern: string, idx: number) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                                  {pattern}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {mlAnalysisResult.data.suspicious_employees?.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium text-gray-700">⚠️ Suspicious Employees:</p>
                            {mlAnalysisResult.data.suspicious_employees.slice(0, 5).map((emp: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-sm bg-white/50 rounded-lg p-2">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle size={14} className="text-orange-500" />
                                  <span className="font-medium text-gray-800">{emp.name}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-gray-600">{emp.reason}</span>
                                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                                    emp.risk_score > 0.7 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {Math.round(emp.risk_score * 100)}% risk
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {mlAnalysisResult.data.summary && (
                          <p className="text-sm text-gray-600 mt-3 p-3 bg-white/50 rounded-lg">
                            <strong>Summary:</strong> {mlAnalysisResult.data.summary}
                          </p>
                        )}
                      </div>
                    ) : mlAnalysisResult.type === 'payroll' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                            <CheckCircle size={18} className={
                              mlAnalysisResult.data.risk_level === 'LOW' ? 'text-green-600' :
                              mlAnalysisResult.data.risk_level === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'
                            } />
                            Payroll Scan Results
                            {mlAnalysisResult.data.ai_powered && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">AI Powered</span>
                            )}
                          </h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            mlAnalysisResult.data.risk_level === 'LOW' ? 'bg-green-100 text-green-700' :
                            mlAnalysisResult.data.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {mlAnalysisResult.data.risk_level} RISK
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-gray-800">{mlAnalysisResult.data.total_scanned}</p>
                            <p className="text-xs text-gray-500">Employees Scanned</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-orange-600">{mlAnalysisResult.data.anomalies_found}</p>
                            <p className="text-xs text-gray-500">Anomalies Found</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-600">{mlAnalysisResult.data.total_scanned - mlAnalysisResult.data.anomalies_found}</p>
                            <p className="text-xs text-gray-500">Clean Records</p>
                          </div>
                        </div>
                        {mlAnalysisResult.data.anomalies?.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium text-gray-700">Detected Issues:</p>
                            {mlAnalysisResult.data.anomalies.slice(0, 3).map((anomaly: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-sm bg-white/50 rounded-lg p-2">
                                <AlertTriangle size={14} className="text-orange-500" />
                                <span className="text-gray-700">{anomaly.name}: {anomaly.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {mlAnalysisResult.data.summary && (
                          <p className="text-sm text-gray-600 mt-3 p-3 bg-white/50 rounded-lg">
                            <strong>Summary:</strong> {mlAnalysisResult.data.summary}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;