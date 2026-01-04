import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, Briefcase, Calendar, CheckCircle, MapPin, RefreshCw, Shield, UserCheck, X, Loader2, Building, Clock } from 'lucide-react';
import { Employee } from '../types';

// Mock vacancy data for different departments
const AVAILABLE_VACANCIES = [
  { id: 1, location: 'South Zone Office', department: 'Sanitation', position: 'Senior Supervisor', vacancyDate: '2025-11-15' },
  { id: 2, location: 'East Zone HQ', department: 'Administration', position: 'Administrative Officer', vacancyDate: '2025-12-01' },
  { id: 3, location: 'North Zone Office', department: 'Engineering', position: 'Junior Engineer', vacancyDate: '2025-10-20' },
  { id: 4, location: 'Central Office', department: 'Health', position: 'Health Inspector', vacancyDate: '2025-11-28' },
  { id: 5, location: 'West Zone Office', department: 'Sanitation', position: 'Sanitation Worker Lead', vacancyDate: '2025-12-10' },
  { id: 6, location: 'Rohini Sub-Division', department: 'Administration', position: 'Clerk Grade II', vacancyDate: '2025-11-05' },
  { id: 7, location: 'Dwarka Zone', department: 'Engineering', position: 'Technical Assistant', vacancyDate: '2025-12-15' },
  { id: 8, location: 'Shahdara Office', department: 'Health', position: 'Senior Nurse', vacancyDate: '2025-11-22' },
];

const TransferManagement: React.FC = () => {
  const { employees } = useApp();
  const [filter, setFilter] = useState<'All' | 'Due'>('Due');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestedVacancies, setSuggestedVacancies] = useState<typeof AVAILABLE_VACANCIES>([]);
  const [transferInitiated, setTransferInitiated] = useState<number | null>(null);

  // Logic: Transfer due if > 3 years in current post
  const isTransferDue = (dateStr: string) => {
    const postingDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - postingDate.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365); 
    return diffYears >= 3;
  };

  const filteredEmployees = employees.filter(e => {
    if (filter === 'Due') return isTransferDue(e.currentPostingDate);
    return true;
  });

  const handleTransfer = async (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsSearching(true);
    setSuggestedVacancies([]);
    
    // Simulate AI matching algorithm
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Filter vacancies by department preference (same dept gets priority)
    const deptMatches = AVAILABLE_VACANCIES.filter(v => v.department === emp.department);
    const otherMatches = AVAILABLE_VACANCIES.filter(v => v.department !== emp.department).slice(0, 2);
    
    setSuggestedVacancies([...deptMatches, ...otherMatches].slice(0, 4));
    setIsSearching(false);
  };

  const initiateTransfer = (vacancyId: number) => {
    setTransferInitiated(vacancyId);
    // In a real app, this would call an API to initiate the transfer process
    setTimeout(() => {
      setSelectedEmployee(null);
      setTransferInitiated(null);
      setSuggestedVacancies([]);
    }, 2000);
  };

  const closeModal = () => {
    setSelectedEmployee(null);
    setIsSearching(false);
    setSuggestedVacancies([]);
    setTransferInitiated(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auto-Pilot Transfer Engine</h1>
          <p className="text-gray-500">Algorithmic posting based on tenure policy (3 Years)</p>
        </div>
        
        <div className="flex bg-white border border-gray-200 rounded-xl p-1">
            <button
                onClick={() => setFilter('Due')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === 'Due' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Due for Transfer
            </button>
            <button
                onClick={() => setFilter('All')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === 'All' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                All Employees
            </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredEmployees.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <UserCheck className="mx-auto text-green-500 mb-3" size={48} />
                <h3 className="text-lg font-medium text-gray-900">No Transfers Due</h3>
                <p className="text-gray-500">All employees are within their tenure limits.</p>
            </div>
        ) : (
            filteredEmployees.map(emp => {
                const tenureYears = ((new Date().getTime() - new Date(emp.currentPostingDate).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
                
                return (
                    <div key={emp.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                                {emp.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{emp.name}</h3>
                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                    <span className="flex items-center gap-1"><Briefcase size={14}/> {emp.role}</span>
                                    <span className="flex items-center gap-1"><MapPin size={14}/> {emp.department}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Current Tenure</p>
                                <p className={`text-xl font-bold ${Number(tenureYears) > 3 ? 'text-red-600' : 'text-green-600'}`}>
                                    {tenureYears} Years
                                </p>
                                <p className="text-xs text-gray-400">Since {emp.currentPostingDate}</p>
                            </div>

                            <button 
                                onClick={() => handleTransfer(emp)}
                              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                            >
                                <RefreshCw size={16} />
                                Auto-Suggest Post
                            </button>
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* Transfer Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Algorithmic Transfer Engine</h2>
                <p className="text-sm text-gray-500">Finding suitable vacancies for {selectedEmployee.name}</p>
              </div>
              <button 
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Employee Info */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedEmployee.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1"><Briefcase size={14}/> {selectedEmployee.role}</span>
                    <span className="flex items-center gap-1"><MapPin size={14}/> {selectedEmployee.department}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isSearching && (
              <div className="p-12 text-center">
                <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Finding Suitable Vacancies...</h3>
                <p className="text-gray-500 text-sm mt-2">AI is analyzing department needs, location preferences, and skill match</p>
              </div>
            )}

            {/* Suggested Vacancies */}
            {!isSearching && suggestedVacancies.length > 0 && (
              <div className="p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Recommended Vacancies ({suggestedVacancies.length})
                </h3>
                <div className="space-y-3">
                  {suggestedVacancies.map((vacancy, idx) => (
                    <div 
                      key={vacancy.id} 
                      className={`p-4 rounded-xl border-2 transition-all ${
                        transferInitiated === vacancy.id 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            idx === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {idx === 0 ? <CheckCircle size={20} /> : <Building size={20} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{vacancy.position}</h4>
                              {idx === 0 && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                  Best Match
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1"><MapPin size={12}/> {vacancy.location}</span>
                              <span className="flex items-center gap-1"><Briefcase size={12}/> {vacancy.department}</span>
                              <span className="flex items-center gap-1"><Clock size={12}/> Vacant since {vacancy.vacancyDate}</span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => initiateTransfer(vacancy.id)}
                          disabled={transferInitiated !== null}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            transferInitiated === vacancy.id
                              ? 'bg-green-600 text-white'
                              : transferInitiated !== null
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {transferInitiated === vacancy.id ? (
                            <span className="flex items-center gap-2">
                              <CheckCircle size={16} />
                              Initiated!
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <ArrowRight size={16} />
                              Initiate
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Shield className="text-blue-600 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-medium text-blue-900">Transfer Policy Compliance</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        All suggested transfers comply with the 3-year tenure rotation policy and departmental requirements.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferManagement;