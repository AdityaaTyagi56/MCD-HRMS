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
  Building
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

// Category colors mapping
const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    'Salary': 'bg-green-100 text-green-700 border-green-200',
    'Payroll and Salary Issue': 'bg-green-100 text-green-700 border-green-200',
    'Harassment': 'bg-red-100 text-red-700 border-red-200',
    'Workplace Harassment': 'bg-red-100 text-red-700 border-red-200',
    'Equipment': 'bg-purple-100 text-purple-700 border-purple-200',
    'Sanitation Equipment Shortage': 'bg-purple-100 text-purple-700 border-purple-200',
    'Leave': 'bg-blue-100 text-blue-700 border-blue-200',
    'Transfer': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'Leave and Transfer Request': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'Infrastructure Problem': 'bg-amber-100 text-amber-700 border-amber-200',
    'General Complaint': 'bg-gray-100 text-gray-700 border-gray-200',
    'General': 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return colorMap[category] || 'bg-gray-100 text-gray-700 border-gray-200';
};

const ML_API_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8002';

const GrievanceManagement: React.FC = () => {
  const { grievances, currentRole, resolveGrievance, t } = useApp();
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Resolved'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [translations, setTranslations] = useState<Record<number, { english: string; loading: boolean }>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
    } finally {
      setResolvingId(null);
    }
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm">
              <MessageSquare className="text-amber-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentRole === 'admin' ? 'Employee Grievances' : 'My Grievances'}
              </h1>
              <p className="text-gray-600">
                AI-powered complaint analysis & routing
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm font-medium text-gray-700 border border-gray-200">
              <Mic size={14} className="text-green-500" />
              Voice NLP Enabled
            </span>
            <div className="flex bg-white border border-gray-200 rounded-xl p-1">
              {(['All', 'Pending', 'Resolved'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    filter === f 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f} {f === 'All' && `(${stats.total})`}
                  {f === 'Pending' && `(${stats.pending})`}
                  {f === 'Resolved' && `(${stats.resolved})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {currentRole === 'admin' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-white/50">
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-white/50">
              <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-white/50">
              <div className="text-3xl font-bold text-red-600">{stats.highPriority}</div>
              <div className="text-sm text-gray-500">High Priority</div>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-white/50">
              <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
              <div className="text-sm text-gray-500">Resolved</div>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search by description, category, or employee name..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
        />
      </div>

      {/* Grievance List */}
      <div className="space-y-4">
        {filteredGrievances.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No grievances found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
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
                className={`bg-white rounded-xl border shadow-sm transition-all duration-300 overflow-hidden ${
                  g.priority === 'High' ? 'border-l-4 border-l-red-500 border-gray-200' :
                  g.priority === 'Medium' ? 'border-l-4 border-l-orange-500 border-gray-200' :
                  'border-l-4 border-l-blue-500 border-gray-200'
                } ${isExpanded ? 'shadow-lg' : 'hover:shadow-md'}`}
              >
                <div className="p-5">
                  {/* Top Row: Tags */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {/* Priority Badge */}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      g.priority === 'High' ? 'bg-red-100 text-red-700' : 
                      g.priority === 'Medium' ? 'bg-orange-100 text-orange-700' : 
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {g.priority}
                    </span>
                    
                    {/* Category Badge */}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1 ${getCategoryColor(g.category)}`}>
                      {getCategoryIcon(g.category)}
                      {g.category}
                    </span>

                    {/* Status Badge */}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      g.status === 'Resolved' ? 'bg-green-100 text-green-700' : 
                      g.status === 'Under Review' ? 'bg-purple-100 text-purple-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {g.status}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <p className="text-gray-800 text-base leading-relaxed font-medium">
                      {g.description}
                    </p>

                    {/* Translation Section */}
                    {currentRole === 'admin' && isHindi && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        {!hasTranslation && !isTranslating && (
                          <button
                            onClick={() => translateToEnglish(g.id, g.description)}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                          >
                            <Languages size={16} />
                            Translate to English
                          </button>
                        )}
                        {isTranslating && (
                          <div className="flex items-center gap-2 text-blue-600 text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Translating...
                          </div>
                        )}
                        {hasTranslation && !isTranslating && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                              <Languages size={14} />
                              English Translation:
                            </div>
                            <p className="text-gray-700 text-sm">
                              {translations[g.id].english}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Row */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span>{g.date}</span>
                      </div>
                      {currentRole === 'admin' && (
                        <div className="flex items-center gap-1.5">
                          <User size={14} />
                          <span>{g.user} (#{g.userId})</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {currentRole === 'admin' && g.status !== 'Resolved' && (
                        <button 
                          onClick={() => handleResolve(g.id)}
                          disabled={resolvingId === g.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label={`Mark grievance ${g.id} as resolved`}
                        >
                          {resolvingId === g.id ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Resolving...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} />
                              Resolve
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : g.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronRight 
                          size={18} 
                          className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm animate-in slide-in-from-top-2">
                      <div>
                        <span className="text-gray-500 block mb-1">Grievance ID</span>
                        <span className="font-medium">#{g.id}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">Escalation Level</span>
                        <span className="font-medium">
                          {g.escalationLevel === 0 ? 'Zonal' : g.escalationLevel === 1 ? 'Deputy Commissioner' : 'Commissioner'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">SLA Status</span>
                        <span className={`font-medium ${g.slaBreach ? 'text-red-600' : 'text-green-600'}`}>
                          {g.slaBreach ? 'Breached' : 'Within SLA'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">Language</span>
                        <span className="font-medium">{isHindi ? 'Hindi (हिंदी)' : 'English'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GrievanceManagement;