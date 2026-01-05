import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Check, X, Clock, FileText, Plus, Filter, Search, ChevronDown, AlertCircle, History, User, Award } from 'lucide-react';
import { LeaveRequest } from '../types';

const LeaveManagement: React.FC = () => {
  const { currentRole, leaves, applyForLeave, updateLeaveStatus } = useApp();
  const currentUserId = 1; // Mock: Ramesh Gupta
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  // Employee Form State
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    type: 'Medical',
    reason: ''
  });

  // Get today's date in YYYY-MM-DD format for min date validation
  const today = new Date().toISOString().split('T')[0];

  // Mock leave balances
  const leaveBalances = {
    casual: { total: 12, used: 4, remaining: 8 },
    medical: { total: 15, used: 3, remaining: 12 },
    privilege: { total: 20, used: 5, remaining: 15 }
  };

  const validateForm = (): string | null => {
    if (!form.startDate || !form.endDate) {
      return 'Please select both start and end dates';
    }
    if (new Date(form.startDate) < new Date(today)) {
      return 'Start date cannot be in the past';
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      return 'End date must be after start date';
    }
    if (form.reason.trim().length < 5) {
      return 'Please provide a reason (at least 5 characters)';
    }
    return null;
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    
    setIsSubmitting(true);
    try {
      await applyForLeave({
        userId: currentUserId,
        startDate: form.startDate,
        endDate: form.endDate,
        type: form.type as any,
        reason: form.reason
      });
      setForm({ startDate: '', endDate: '', type: 'Medical', reason: '' });
      alert("Leave Request Submitted Successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit leave';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      'Pending': 'status-pending',
      'Approved': 'status-approved', 
      'Rejected': 'status-rejected'
    };
    
    const icons = {
        'Pending': <Clock size={12} />,
        'Approved': <Check size={12} />,
        'Rejected': <X size={12} />
    };

    return (
      <span className={`status-badge ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status}
      </span>
    );
  };

  const filteredLeaves = leaves.filter(leave => {
    const matchesStatus = filterStatus === 'All' || leave.status === filterStatus;
    const matchesRole = currentRole === 'admin' ? true : leave.userId === currentUserId;
    return matchesStatus && matchesRole;
  });

  if (currentRole === 'employee') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Leave Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(leaveBalances).map(([type, balance]) => (
            <div key={type} className="bg-white rounded-2xl p-6 shadow-soft border border-neutral-200/50 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${
                  type === 'casual' ? 'bg-primary-100 text-primary-600' :
                  type === 'medical' ? 'bg-success-100 text-success-600' :
                  'bg-secondary-100 text-secondary-600'
                }`}>
                  <Calendar size={24} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-neutral-900">{balance.remaining}</p>
                  <p className="text-sm text-neutral-500">remaining</p>
                </div>
              </div>
              <h3 className="font-bold text-lg text-neutral-900 capitalize mb-2">{type} Leave</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Total</span>
                  <span className="font-medium">{balance.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Used</span>
                  <span className="font-medium">{balance.used}</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      type === 'casual' ? 'bg-primary-500' :
                      type === 'medical' ? 'bg-success-500' :
                      'bg-secondary-500'
                    }`}
                    style={{ width: `${(balance.used / balance.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Leave Application Form */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-neutral-200/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Plus className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Apply for Leave</h2>
              <p className="text-sm text-neutral-500">Submit your leave application</p>
            </div>
          </div>

          <form onSubmit={handleApply} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Leave Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="input-field"
                >
                  <option value="Medical">Medical Leave</option>
                  <option value="Casual">Casual Leave</option>
                  <option value="Privilege">Privilege Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Duration</label>
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Calendar size={16} />
                  <span>
                    {form.startDate && form.endDate 
                      ? `${Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days`
                      : 'Select dates'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  min={today}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  min={form.startDate || today}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Please provide a detailed reason for your leave..."
                rows={4}
                className="input-field resize-none"
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-4 bg-error-50 border border-error-200 rounded-xl text-error-700">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full md:w-auto"
            >
              {isSubmitting ? (
                <>
                  <div className="spinner" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText size={18} />
                  Submit Application
                </>
              )}
            </button>
          </form>
        </div>

        {/* Leave History */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-neutral-200/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary-100 rounded-xl flex items-center justify-center">
                <History className="text-secondary-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Leave History</h2>
                <p className="text-sm text-neutral-500">Your recent leave applications</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredLeaves.slice(0, 5).map((leave) => (
              <div key={leave.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200/50 hover:bg-neutral-100 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`p-2 rounded-lg ${
                    leave.type === 'Medical' ? 'bg-success-100 text-success-600' :
                    leave.type === 'Casual' ? 'bg-primary-100 text-primary-600' :
                    'bg-secondary-100 text-secondary-600'
                  }`}>
                    <Calendar size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900 truncate">{leave.type} Leave</p>
                    <p className="text-sm text-neutral-500 truncate">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <StatusBadge status={leave.status} />
                  <p className="text-xs text-neutral-500 mt-1">
                    Applied on {new Date(leave.requestDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Admin View
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Leave Management</h1>
          <p className="text-neutral-500">Review and manage employee leave requests</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text" 
              placeholder="Search requests..." 
              className="pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none w-64"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Total Requests', value: leaves.length, color: 'primary', icon: FileText },
          { title: 'Pending Review', value: leaves.filter(l => l.status === 'Pending').length, color: 'warning', icon: Clock },
          { title: 'Approved', value: leaves.filter(l => l.status === 'Approved').length, color: 'success', icon: Check },
          { title: 'This Month', value: leaves.filter(l => new Date(l.requestDate).getMonth() === new Date().getMonth()).length, color: 'secondary', icon: Calendar }
        ].map((stat, index) => (
          <div key={stat.title} className="bg-white rounded-2xl p-6 shadow-soft border border-neutral-200/50">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${
                stat.color === 'primary' ? 'bg-primary-100 text-primary-600' :
                stat.color === 'warning' ? 'bg-warning-100 text-warning-600' :
                stat.color === 'success' ? 'bg-success-100 text-success-600' :
                'bg-secondary-100 text-secondary-600'
              }`}>
                <stat.icon size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-1">{stat.value}</h3>
            <p className="text-sm text-neutral-500">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-2xl shadow-soft border border-neutral-200/50 overflow-hidden">
        <div className="p-6 border-b border-neutral-200/50">
          <h2 className="text-lg font-bold text-neutral-900">Leave Requests</h2>
          <p className="text-sm text-neutral-500">Manage employee leave applications</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-neutral-600 text-sm">Employee</th>
                <th className="text-left py-4 px-6 font-medium text-neutral-600 text-sm">Leave Type</th>
                <th className="text-left py-4 px-6 font-medium text-neutral-600 text-sm">Duration</th>
                <th className="text-left py-4 px-6 font-medium text-neutral-600 text-sm">Reason</th>
                <th className="text-left py-4 px-6 font-medium text-neutral-600 text-sm">Status</th>
                <th className="text-left py-4 px-6 font-medium text-neutral-600 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((leave) => (
                <tr key={leave.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-primary-50 rounded-lg flex items-center justify-center text-primary-600 font-bold text-sm">
                        {leave.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 text-sm">{leave.userName}</p>
                        <p className="text-xs text-neutral-500">ID: {leave.userId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      leave.type === 'Medical' ? 'bg-success-100 text-success-700' :
                      leave.type === 'Casual' ? 'bg-primary-100 text-primary-700' :
                      'bg-secondary-100 text-secondary-700'
                    }`}>
                      <Calendar size={12} />
                      {leave.type}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm text-neutral-700 max-w-xs truncate" title={leave.reason}>
                      {leave.reason}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge status={leave.status} />
                  </td>
                  <td className="py-4 px-6">
                    {leave.status === 'Pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateLeaveStatus(leave.id, 'Approved')}
                          className="p-2 text-success-600 hover:bg-success-50 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => updateLeaveStatus(leave.id, 'Rejected')}
                          className="p-2 text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
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

export default LeaveManagement;