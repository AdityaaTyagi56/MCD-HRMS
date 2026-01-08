import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  MessageSquare,
  User,
  Loader2,
  Languages,
  Mic,
  Tag,
  Calendar,
  ChevronRight,
  Briefcase,
  AlertCircle,
  Wrench,
  Users,
  FileText,
  Building,
  X,
  TrendingUp
} from 'lucide-react';
import { Grievance } from '../types';

// Category icons mapping
const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'Salary': <Briefcase size={20} />,
    'Payroll and Salary Issue': <Briefcase size={20} />,
    'Harassment': <AlertCircle size={20} />,
    'Workplace Harassment': <AlertCircle size={20} />,
    'Equipment': <Wrench size={20} />,
    'Sanitation Equipment Shortage': <Wrench size={20} />,
    'Leave': <Calendar size={20} />,
    'Transfer': <Users size={20} />,
    'Leave and Transfer Request': <FileText size={20} />,
    'Infrastructure Problem': <Building size={20} />,
    'General Complaint': <MessageSquare size={20} />,
    'General': <MessageSquare size={20} />,
  };
  return iconMap[category] || <MessageSquare size={20} />;
};

// Category colors mapping (Refined for premium look)
const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    'Salary': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Payroll and Salary Issue': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Harassment': 'bg-rose-50 text-rose-700 border-rose-100',
    'Workplace Harassment': 'bg-rose-50 text-rose-700 border-rose-100',
    'Equipment': 'bg-violet-50 text-violet-700 border-violet-100',
    'Sanitation Equipment Shortage': 'bg-violet-50 text-violet-700 border-violet-100',
    'Leave': 'bg-blue-50 text-blue-700 border-blue-100',
    'Transfer': 'bg-cyan-50 text-cyan-700 border-cyan-100',
    'Leave and Transfer Request': 'bg-cyan-50 text-cyan-700 border-cyan-100',
    'Infrastructure Problem': 'bg-amber-50 text-amber-700 border-amber-100',
    'General Complaint': 'bg-slate-50 text-slate-700 border-slate-100',
    'General': 'bg-slate-50 text-slate-700 border-slate-100',
  };
  return colorMap[category] || 'bg-slate-50 text-slate-700 border-slate-100';
};

const ML_API_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8002';

const GrievanceManagement: React.FC = () => {
  const { grievances, currentRole, resolveGrievance, t } = useApp();
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Resolved'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [translations, setTranslations] = useState<Record<number, { english: string; loading: boolean }>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<'assign' | 'resolve' | 'escalate' | ''>('');
  const [bulkDepartment, setBulkDepartment] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Comment System State
  const [comments, setComments] = useState<Record<number, Array<{ user: string; text: string; timestamp: string }>>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [showCommentModal, setShowCommentModal] = useState<number | null>(null);

  // Mock current user ID for employee view
  const currentUserId = 1;

  // Detect if text contains Hindi (Devanagari script)
  const isHindiText = (text: string) => {
    return /[\u0900-\u097F]/.test(text);
  };

  // Translate Hindi to English using AI
  const translateToEnglish = useCallback(async (grievanceId: number, hindiText: string) => {
    setTranslations(prev => ({
      ...prev,
      [grievanceId]: { english: '', loading: true }
    }));

    try {
      const response = await fetch(`${ML_API_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: hindiText, target_language: 'en' })
      });

      if (response.ok) {
        const data = await response.json();
        setTranslations(prev => ({
          ...prev,
          [grievanceId]: { english: data.translated_text || data.translation || hindiText, loading: false }
        }));
      } else {
        // Fallback: Use a simple keyword-based translation for common phrases
        const fallbackTranslation = getFallbackTranslation(hindiText);
        setTranslations(prev => ({
          ...prev,
          [grievanceId]: { english: fallbackTranslation, loading: false }
        }));
      }
    } catch (error) {
      console.error('Translation error:', error);
      // Fallback translation
      const fallbackTranslation = getFallbackTranslation(hindiText);
      setTranslations(prev => ({
        ...prev,
        [grievanceId]: { english: fallbackTranslation, loading: false }
      }));
    }
  }, []);

  // Simple fallback translation for common Hindi phrases
  const getFallbackTranslation = (text: string): string => {
    const dictionary: Record<string, string> = {
      'वेतन कम है': 'Salary is less / insufficient',
      'वेतन प्राप्त नहीं हुआ है': 'Salary has not been received',
      'वेतन नहीं मिला': 'Did not receive salary',
      'छुट्टी चाहिए': 'Need leave',
      'तबादला चाहिए': 'Need transfer',
      'उपकरण नहीं है': 'Equipment not available',
      'झाड़ू नहीं है': 'Broom not available',
      'परेशानी हो रही है': 'Facing problems',
      'समस्या है': 'There is a problem',
      'मदद चाहिए': 'Need help',
    };

    // Check for exact match
    if (dictionary[text]) return dictionary[text];

    // Check for partial matches
    for (const [hindi, english] of Object.entries(dictionary)) {
      if (text.includes(hindi)) {
        return english;
      }
    }

    // Return a generic translation note
    return `[Hindi text: ${text}] - Click to view original`;
  };

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    try {
      await resolveGrievance(id);
      // Audit log
      logAction('resolve', 'Admin', id, 'Grievance resolved by admin');
    } finally {
      setResolvingId(null);
    }
  };

  // Bulk Action Handlers
  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredGrievances.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredGrievances.map(g => g.id)));
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0 || !bulkAction) return;

    try {
      const idsArray = Array.from(selectedIds);

      if (bulkAction === 'resolve') {
        for (const id of idsArray) {
          await resolveGrievance(id);
          logAction('bulk-resolve', 'Admin', id, `Bulk resolved ${idsArray.length} grievances`);
        }
      } else if (bulkAction === 'assign' && bulkDepartment) {
        logAction('bulk-assign', 'Admin', idsArray[0], `Assigned ${idsArray.length} grievances to ${bulkDepartment}`);
      } else if (bulkAction === 'escalate') {
        logAction('bulk-escalate', 'Admin', idsArray[0], `Escalated ${idsArray.length} grievances`);
      }

      setSelectedIds(new Set());
      setBulkAction('');
      setBulkDepartment('');
      setShowBulkModal(false);
      alert(`Successfully processed ${idsArray.length} grievance(s)`);
    } catch (error) {
      alert('Bulk action failed. Please try again.');
    }
  };

  // Comment System
  const addComment = (grievanceId: number) => {
    const commentText = newComment[grievanceId];
    if (!commentText?.trim()) return;

    const comment = {
      user: 'Admin',
      text: commentText,
      timestamp: new Date().toISOString()
    };

    setComments(prev => ({
      ...prev,
      [grievanceId]: [...(prev[grievanceId] || []), comment]
    }));

    setNewComment(prev => ({ ...prev, [grievanceId]: '' }));
    logAction('comment', 'Admin', grievanceId, `Added comment: ${commentText.substring(0, 50)}...`);
  };

  // Audit Logging
  const logAction = (action: string, user: string, grievanceId: number, details: string) => {
    const logEntry = {
      action,
      user,
      grievanceId,
      details,
      timestamp: new Date().toISOString()
    };

    // In real app, this would persist to server
    console.log('📝 Audit Log:', logEntry);

    // Store in localStorage for demo
    const existingLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
    existingLogs.push(logEntry);
    localStorage.setItem('audit_logs', JSON.stringify(existingLogs));
  };

  const filteredGrievances = grievances.filter(g => {
    const matchesFilter = filter === 'All' || g.status === filter;
    const matchesSearch = g.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = currentRole === 'admin' ? true : g.userId === currentUserId;
    return matchesFilter && matchesSearch && matchesRole;
  });

  // Count stats
  const stats = {
    total: grievances.length,
    pending: grievances.filter(g => g.status === 'Pending' || g.status === 'Under Review').length,
    highPriority: grievances.filter(g => g.priority === 'High').length,
    resolved: grievances.filter(g => g.status === 'Resolved').length
  };

  return (
    <div className="space-y-8 animate-enter">
      {/* Header */}
      <div className="glass-header rounded-3xl p-8 border border-white/20 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-amber-500/15 transition-all duration-700"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-4 rounded-2xl shadow-sm border border-amber-200/50">
              <MessageSquare className="text-amber-600" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                {currentRole === 'admin' ? 'Employee Grievances' : 'My Grievances'}
              </h1>
              <p className="text-slate-500 font-medium mt-1 text-lg">
                AI-powered complaint analysis & routing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-full text-sm font-bold text-emerald-700 border border-emerald-100 shadow-sm">
              <Mic size={16} className="text-emerald-500 animate-pulse" />
              Voice NLP Enabled
            </span>
            <div className="flex bg-slate-100/50 backdrop-blur-sm border border-slate-200 rounded-xl p-1.5 shadow-inner">
              {(['All', 'Pending', 'Resolved'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${filter === f
                    ? 'bg-white text-slate-900 shadow-md transform scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
                >
                  {f} {f === 'All' ? '' : f === 'Pending' ? ` (${stats.pending})` : ` (${stats.resolved})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {currentRole === 'admin' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
              <div className="text-4xl font-bold text-slate-900 mb-1">{stats.total}</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total</div>
            </div>
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
              <div className="text-4xl font-bold text-amber-600 mb-1">{stats.pending}</div>
              <div className="text-sm font-bold text-amber-800/60 uppercase tracking-wider">Pending</div>
            </div>
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
              <div className="text-4xl font-bold text-rose-600 mb-1">{stats.highPriority}</div>
              <div className="text-sm font-bold text-rose-800/60 uppercase tracking-wider">High Priority</div>
            </div>
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
              <div className="text-4xl font-bold text-emerald-600 mb-1">{stats.resolved}</div>
              <div className="text-sm font-bold text-emerald-800/60 uppercase tracking-wider">Resolved</div>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Search by description, category, or employee name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-300 outline-none shadow-sm transition-all text-slate-700 font-medium placeholder:text-slate-400"
        />
      </div>

      {/* Bulk Actions Bar */}
      {currentRole === 'admin' && selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl animate-fade-in-up border border-slate-800">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredGrievances.length}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded border-slate-600 text-primary-500 focus:ring-primary-500 bg-slate-700"
              />
              <span className="font-bold text-slate-200">{selectedIds.size} selected</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setBulkAction('resolve'); setShowBulkModal(true); }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center gap-2"
              >
                <CheckCircle size={18} /> Mark Resolved
              </button>
              <button
                onClick={() => { setBulkAction('assign'); setShowBulkModal(true); }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center gap-2"
              >
                <Users size={18} /> Assign Dept
              </button>
              <button
                onClick={() => { setBulkAction('escalate'); setShowBulkModal(true); }}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20 active:scale-95 flex items-center gap-2"
              >
                <TrendingUp size={18} /> Escalate
              </button>
            </div>
          </div>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-slate-400 hover:text-white font-bold px-4 py-2 hover:bg-slate-800 rounded-xl transition-all"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Grievance List */}
      <div className="space-y-5">
        {filteredGrievances.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center">
            <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-iner border border-slate-100">
              <MessageSquare className="text-slate-300" size={48} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No grievances found</h3>
            <p className="text-slate-500 mt-2 font-medium">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredGrievances.map((g) => {
            const isHindi = isHindiText(g.description);
            const hasTranslation = translations[g.id]?.english;
            const isTranslating = translations[g.id]?.loading;
            const isExpanded = expandedId === g.id;

            return (
              <div
                key={g.id}
                className={`glass-card bg-white rounded-2xl border transition-all duration-300 overflow-hidden group ${g.priority === 'High' ? 'border-l-[6px] border-l-rose-500 border-slate-200' :
                  g.priority === 'Medium' ? 'border-l-[6px] border-l-amber-500 border-slate-200' :
                    'border-l-[6px] border-l-blue-500 border-slate-200'
                  } ${isExpanded ? 'shadow-xl ring-1 ring-slate-200' : 'shadow-sm hover:shadow-md'}`}
              >
                <div className="p-6">
                  {/* Top Row: Checkbox + Tags */}
                  <div className="flex items-start gap-4 mb-4">
                    {currentRole === 'admin' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(g.id)}
                        onChange={() => toggleSelection(g.id)}
                        className="w-5 h-5 mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    )}

                    <div className="flex flex-wrap items-center gap-2.5 flex-1">
                      {/* Priority Badge */}
                      <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wide ${g.priority === 'High' ? 'bg-rose-100 text-rose-700' :
                        g.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                        {g.priority}
                      </span>

                      {/* Category Badge */}
                      <span className={`text-xs px-3 py-1.5 rounded-full font-bold border flex items-center gap-1.5 ${getCategoryColor(g.category)}`}>
                        {getCategoryIcon(g.category)}
                        {g.category}
                      </span>

                      {/* Status Badge */}
                      <span className={`text-xs px-3 py-1.5 rounded-full font-bold border flex items-center gap-1.5 ${g.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        g.status === 'Under Review' ? 'bg-violet-50 text-violet-700 border-violet-100' :
                          'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                        {g.status === 'Resolved' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {g.status}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <p className="text-slate-800 text-lg leading-relaxed font-medium">
                      {g.description}
                    </p>

                    {/* Translation Section */}
                    {currentRole === 'admin' && isHindi && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 relative overflow-hidden">
                        {!hasTranslation && !isTranslating && (
                          <button
                            onClick={() => translateToEnglish(g.id, g.description)}
                            className="flex items-center gap-2 text-primary-700 hover:text-primary-800 font-bold text-sm bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 hover:-translate-y-0.5 transition-all"
                          >
                            <Languages size={18} />
                            Translate to English
                          </button>
                        )}
                        {isTranslating && (
                          <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                            <Loader2 size={18} className="animate-spin text-primary-600" />
                            Translating content...
                          </div>
                        )}
                        {hasTranslation && !isTranslating && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-primary-600 font-bold uppercase tracking-wider">
                              <Languages size={14} />
                              English Translation
                            </div>
                            <p className="text-slate-700 text-base italic">
                              "{translations[g.id].english}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Row */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-5 text-sm font-medium text-slate-500">
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <Calendar size={16} className="text-slate-400" />
                        <span>{g.date}</span>
                      </div>
                      {currentRole === 'admin' && (
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          <User size={16} className="text-slate-400" />
                          <span>{g.user} (#{g.userId})</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      {currentRole === 'admin' && (
                        <>
                          <button
                            onClick={() => setShowCommentModal(g.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                          >
                            <MessageSquare size={16} />
                            Comment {comments[g.id]?.length > 0 && <span className="bg-slate-200 px-1.5 py-0.5 rounded-md text-slate-800 text-xs ml-1">{comments[g.id].length}</span>}
                          </button>
                          {g.status !== 'Resolved' && (
                            <button
                              onClick={() => handleResolve(g.id)}
                              disabled={resolvingId === g.id}
                              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all shadow-lg shadow-emerald-500/20"
                              aria-label={`Mark grievance ${g.id} as resolved`}
                            >
                              {resolvingId === g.id ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  Resolving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle size={16} />
                                  Resolve
                                </>
                              )}
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : g.id)}
                        className={`p-2.5 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200 ${isExpanded ? 'bg-slate-100' : ''}`}
                      >
                        <ChevronRight
                          size={20}
                          className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {comments[g.id] && comments[g.id].length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-100 animate-slide-up">
                      <div className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <MessageSquare size={16} className="text-slate-400" /> Comments History
                      </div>
                      <div className="space-y-3 pl-4 border-l-2 border-slate-100">
                        {comments[g.id].map((comment, idx) => (
                          <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative group hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-2.5 mb-2">
                              <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">{comment.user}</span>
                              <span className="text-xs text-slate-400 font-medium">{new Date(comment.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed font-medium">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm animate-slide-up bg-slate-50/50 -m-6 p-6 mt-6">
                      <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">Grievance ID</span>
                        <span className="font-bold text-slate-900 text-lg">#{g.id}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">Escalation Level</span>
                        <span className="font-bold text-slate-900">
                          {g.escalationLevel === 0 ? 'Zonal' : g.escalationLevel === 1 ? 'Deputy Commissioner' : 'Commissioner'}
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">SLA Status</span>
                        <span className={`font-bold flex items-center gap-2 ${g.slaBreach ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {g.slaBreach ? (
                            <><AlertCircle size={16} /> Breached</>
                          ) : (
                            <><CheckCircle size={16} /> Within SLA</>
                          )}
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">Language</span>
                        <span className="font-bold text-slate-900">{isHindi ? 'Hindi (हिंदी)' : 'English'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bulk Action Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl scale-100 animate-scale-in">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              {bulkAction === 'resolve' && 'Mark as Resolved'}
              {bulkAction === 'assign' && 'Assign to Department'}
              {bulkAction === 'escalate' && 'Escalate Grievances'}
            </h3>

            <p className="text-slate-600 mb-6 font-medium">
              This action will apply to <span className="font-bold text-slate-900">{selectedIds.size}</span> selected grievance(s).
            </p>

            {bulkAction === 'assign' && (
              <div className="mb-6">
                <label className="text-sm font-bold text-slate-700 mb-2 block">Select Target Department</label>
                <select
                  value={bulkDepartment}
                  onChange={(e) => setBulkDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-700"
                >
                  <option value="">Select Department</option>
                  <option value="Sanitation">Sanitation</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Administration">Administration</option>
                  <option value="Health">Health</option>
                </select>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => { setShowBulkModal(false); setBulkAction(''); setBulkDepartment(''); }}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAction}
                disabled={bulkAction === 'assign' && !bulkDepartment}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/25"
              >
                Confirm Region
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl scale-100 animate-scale-in">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="text-primary-500" />
                Add Comment
              </h3>
              <button
                onClick={() => setShowCommentModal(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={newComment[showCommentModal] || ''}
              onChange={(e) => setNewComment(prev => ({ ...prev, [showCommentModal]: e.target.value }))}
              placeholder="Type your official comment or response here..."
              className="w-full h-40 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:ring-2 focus:ring-primary-500 outline-none mb-6 font-medium text-slate-700 placeholder:text-slate-400"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowCommentModal(null)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { addComment(showCommentModal); setShowCommentModal(null); }}
                disabled={!newComment[showCommentModal]?.trim()}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/25"
              >
                Post Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrievanceManagement;