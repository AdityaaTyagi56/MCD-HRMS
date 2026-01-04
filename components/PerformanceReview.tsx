import React from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, CheckCircle, AlertTriangle, Star, TrendingUp } from 'lucide-react';

const PerformanceReview: React.FC = () => {
  const { employees } = useApp();

  // Sort by overall grade (mock logic)
  const sortedEmployees = [...employees].sort((a, b) => b.performance.attendanceScore - a.performance.attendanceScore);

  // Calculate real stats from employee data
  const topPerformers = employees.filter(e => e.performance.overallGrade === 'A+' || e.performance.overallGrade === 'A').length;
  const avgAttendance = employees.length > 0 
    ? Math.round(employees.reduce((sum, e) => sum + e.performance.attendanceScore, 0) / employees.length) 
    : 0;
  const criticalReviewCount = employees.filter(e => e.performance.overallGrade === 'D').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">360° Performance Review (ACR)</h1>
          <p className="text-gray-500">KPI-driven automatic grading based on Attendance, Grievances & Tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary Cards */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-emerald-100 font-medium mb-1">Top Performers (A/A+)</p>
                    <h3 className="text-4xl font-bold">{topPerformers}</h3>
                </div>
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <Star size={24} className="text-yellow-300 fill-yellow-300" />
                </div>
            </div>
            <div className="mt-4 h-1 bg-emerald-800/30 rounded-full overflow-hidden">
                <div className="h-full bg-white/50" style={{ width: `${employees.length > 0 ? (topPerformers / employees.length) * 100 : 0}%` }}></div>
            </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 font-medium mb-1">Avg Attendance Score</p>
                    <h3 className="text-4xl font-bold text-gray-900">{avgAttendance}%</h3>
                </div>
                <div className="bg-blue-50 p-2 rounded-lg">
                    <CheckCircle size={24} className="text-mcd-blue" />
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
                Based on {employees.length} employees
            </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 font-medium mb-1">Critical Review Needed</p>
                    <h3 className="text-4xl font-bold text-gray-900">{criticalReviewCount}</h3>
                </div>
                <div className="bg-red-50 p-2 rounded-lg">
                    <AlertTriangle size={24} className="text-red-600" />
                </div>
            </div>
            <p className="text-xs text-red-500 mt-4">
                Employees with grade D
            </p>
        </div>
      </div>

      {/* Detailed Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">Employee Performance Matrix</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    <tr className="border-b border-gray-200">
                        <th className="px-6 py-4 whitespace-nowrap min-w-[220px]">Employee</th>
                        <th className="px-6 py-4 whitespace-nowrap min-w-[180px]">Attendance Score</th>
                        <th className="px-6 py-4 whitespace-nowrap min-w-[180px]">Citizen Grievances</th>
                        <th className="px-6 py-4 whitespace-nowrap min-w-[160px]">Task Completion</th>
                        <th className="px-6 py-4 whitespace-nowrap min-w-[120px]">Auto-Grade</th>
                        <th className="px-6 py-4 whitespace-nowrap min-w-[120px]">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {sortedEmployees.map(emp => (
                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 align-middle">
                                <div className="font-medium text-gray-900">{emp.name}</div>
                                <div className="text-xs text-gray-500">{emp.role}</div>
                            </td>
                            <td className="px-6 py-4 align-middle">
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${
                                            emp.performance.attendanceScore > 80 ? 'bg-green-500' : 
                                            emp.performance.attendanceScore > 60 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`} style={{ width: `${emp.performance.attendanceScore}%` }}></div>
                                    </div>
                                    <span className="text-sm font-medium">{emp.performance.attendanceScore}%</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 align-middle">
                                <span className={`text-sm font-medium ${emp.performance.grievanceScore < 70 ? 'text-red-600' : 'text-gray-600'}`}>
                                    {100 - emp.performance.grievanceScore}% Negative
                                </span>
                            </td>
                            <td className="px-6 py-4 align-middle">
                                <span className="text-sm text-gray-600">{emp.performance.taskCompletion}%</span>
                            </td>
                            <td className="px-6 py-4 align-middle">
                                <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm ${
                                    emp.performance.overallGrade === 'A+' || emp.performance.overallGrade === 'A' ? 'bg-green-100 text-green-700' :
                                    emp.performance.overallGrade === 'B' ? 'bg-blue-100 text-mcd-blue' :
                                    emp.performance.overallGrade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                    {emp.performance.overallGrade}
                                </span>
                            </td>
                            <td className="px-6 py-4 align-middle">
                                <button className="text-mcd-blue hover:underline text-sm font-medium">View Report</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceReview;