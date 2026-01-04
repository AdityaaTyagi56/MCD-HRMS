import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, CheckCircle, Clock, Filter, Search, MessageSquare, User, Loader2 } from 'lucide-react';

const GrievanceManagement: React.FC = () => {
  const { grievances, currentRole, resolveGrievance } = useApp();
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Resolved'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // Mock current user ID for employee view
  const currentUserId = 1; 

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
                          g.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = currentRole === 'admin' ? true : g.userId === currentUserId;
    return matchesFilter && matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentRole === 'admin' ? 'Grievance Redressal' : 'My Grievances'}
          </h1>
          <p className="text-gray-500">
            {currentRole === 'admin' 
              ? 'Manage and resolve employee complaints' 
              : 'Track the status of your reported issues'}
          </p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search grievances..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex bg-white border border-gray-200 rounded-xl p-1">
            {(['All', 'Pending', 'Resolved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filter === f 
                    ? 'bg-blue-50 text-mcd-blue shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredGrievances.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No grievances found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredGrievances.map((g) => (
            <div key={g.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    g.priority === 'High' ? 'bg-red-50 text-red-600' : 
                    g.priority === 'Medium' ? 'bg-orange-50 text-orange-600' : 
                    'bg-blue-50 text-mcd-blue'
                  }`}>
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{g.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        g.priority === 'High' ? 'bg-red-50 text-red-700 border-red-100' : 
                        g.priority === 'Medium' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                        'bg-blue-50 text-mcd-blue border-blue-100'
                      }`}>
                        {g.priority} Priority
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{g.description}</p>
                    
                    {currentRole === 'admin' && (
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                        <User size={14} />
                        <span>Employee ID: {g.userId}</span>
                        <span>•</span>
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                    g.status === 'Resolved' 
                      ? 'bg-green-50 text-green-700 border border-green-100' 
                      : 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                  }`}>
                    {g.status === 'Resolved' ? <CheckCircle size={14} /> : <Clock size={14} />}
                    {g.status}
                  </span>
                  
                  {currentRole === 'admin' && g.status === 'Pending' && (
                    <button 
                      onClick={() => handleResolve(g.id)}
                      disabled={resolvingId === g.id}
                      className="text-sm text-mcd-blue font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      aria-label={`Mark grievance ${g.id} as resolved`}
                    >
                      {resolvingId === g.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Resolving...
                        </>
                      ) : (
                        'Mark as Resolved'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GrievanceManagement;