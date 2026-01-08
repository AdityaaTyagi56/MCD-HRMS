import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, UserPlus, MoreVertical, Mail, Phone, MapPin, Briefcase } from 'lucide-react';

const EmployeeManagement: React.FC = () => {
  const { employees } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Directory</h1>
          <p className="text-gray-600">Manage workforce and view profiles</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 bg-mcd-blue text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-900 transition-colors shadow-sm shadow-blue-200">
            <UserPlus size={18} />
            <span className="hidden md:inline">Add Employee</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div key={employee.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-mcd-blue font-bold text-lg border-2 border-white shadow-sm">
                    {employee.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-mcd-blue transition-colors">{employee.name}</h3>
                    <p className="text-xs text-gray-600">ID: MCD-{employee.id.toString().padStart(4, '0')}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50">
                  <MoreVertical size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Briefcase size={16} className="text-gray-500" />
                  <span>{employee.role}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <MapPin size={16} className="text-gray-500" />
                  <span>{employee.department}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Mail size={16} className="text-gray-500" />
                  <span className="truncate">employee.{employee.id}@mcd.gov.in</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center rounded-b-2xl">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${employee.status === 'Present'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : employee.status === 'On Leave'
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${employee.status === 'Present' ? 'bg-emerald-500' : employee.status === 'On Leave' ? 'bg-yellow-500' : 'bg-gray-400'}`}></span>
                {employee.status}
              </span>
              <button className="text-sm font-medium text-mcd-blue hover:underline">View Profile</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmployeeManagement;