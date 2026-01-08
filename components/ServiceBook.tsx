import React from 'react';
import { useApp } from '../context/AppContext';
import { Book, Calendar, Award, AlertCircle, ShieldCheck, Clock } from 'lucide-react';

const ServiceBook: React.FC = () => {
    const { employees } = useApp();
    // Mock viewing the first employee (Ramesh)
    const employee = employees.find(e => e.id === 1);

    if (!employee) return <div>Employee not found</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Digital Service Book</h1>
                    <p className="text-gray-600">Immutable Blockchain-verified Career Timeline</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100 text-xs font-mono">
                    <ShieldCheck size={14} />
                    <span>Blockchain Verified Ledger</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-gray-400">
                            {employee.name.charAt(0)}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{employee.name}</h2>
                        <p className="text-gray-600">{employee.role}</p>
                        <div className="mt-4 flex justify-center gap-2">
                            <span className="px-3 py-1 bg-blue-50 text-mcd-blue rounded-full text-xs font-medium">{employee.department}</span>
                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">Active</span>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-200 text-left space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Joining Date</p>
                                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    <Calendar size={14} /> {employee.joiningDate}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Retirement Date</p>
                                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    <Clock size={14} /> {employee.retirementDate}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Book size={20} className="text-mcd-blue" />
                            Career Timeline
                        </h3>

                        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pb-4">
                            {employee.serviceBook.map((record, idx) => (
                                <div key={record.id} className="relative pl-8">
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${record.type === 'Hiring' ? 'bg-green-500' :
                                            record.type === 'Award' ? 'bg-yellow-500' :
                                                record.type === 'Punishment' ? 'bg-red-500' : 'bg-blue-500'
                                        }`}></div>

                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                        <div>
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mb-1 ${record.type === 'Hiring' ? 'bg-green-100 text-green-700' :
                                                    record.type === 'Award' ? 'bg-yellow-100 text-yellow-700' :
                                                        record.type === 'Punishment' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-mcd-blue'
                                                }`}>
                                                {record.type}
                                            </span>
                                            <h4 className="text-base font-semibold text-gray-900">{record.description}</h4>
                                            <p className="text-sm text-gray-600 mt-1">Authorized by: {record.authority}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900">{record.date}</p>
                                            <p className="text-[10px] font-mono text-gray-500 mt-1 truncate w-24" title={record.hash}>
                                                Hash: {record.hash}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Future Placeholder */}
                            <div className="relative pl-8 opacity-50">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-200 border-2 border-white"></div>
                                <p className="text-sm text-gray-400 italic">Future events will be logged here...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceBook;