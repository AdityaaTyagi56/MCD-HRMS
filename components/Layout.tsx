import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AppView } from '../types';
import {
  LayoutDashboard,
  Users,
  Calendar,
  IndianRupee,
  ArrowRightLeft,
  TrendingUp,
  BookOpen,
  Settings,
  Menu,
  X,
  Home,
  History,
  User,
  Languages,
  Bell,
  Search,
  Shield,
  Sparkles,
  LogOut,
  ChevronDown
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentRole, switchRole, currentView, setCurrentView, language, toggleLanguage } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminMenuItems = [
    { id: 'dashboard', label: language === 'hi' ? 'डैशबोर्ड' : 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: language === 'hi' ? 'कर्मचारी' : 'Employees', icon: Users },
    { id: 'leave', label: language === 'hi' ? 'छुट्टी प्रबंधन' : 'Leave Management', icon: Calendar },
    { id: 'payroll', label: language === 'hi' ? 'वेतन' : 'Payroll', icon: IndianRupee },
    { id: 'transfers', label: language === 'hi' ? 'स्थानांतरण' : 'Transfers', icon: ArrowRightLeft },
    { id: 'performance', label: language === 'hi' ? 'प्रदर्शन' : 'Performance', icon: TrendingUp },
    { id: 'service-book', label: language === 'hi' ? 'सेवा पुस्तिका' : 'Service Book', icon: BookOpen },
    { id: 'settings', label: language === 'hi' ? 'सेटिंग्स' : 'Settings', icon: Settings },
  ];

  const employeeMenuItems = [
    { id: 'dashboard', label: language === 'hi' ? 'होम' : 'Home', icon: Home },
    { id: 'history', label: language === 'hi' ? 'इतिहास' : 'History', icon: History },
    { id: 'profile', label: language === 'hi' ? 'प्रोफाइल' : 'Profile', icon: User },
  ];

  const handleMenuClick = (viewId: string) => {
    setCurrentView(viewId as AppView);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-primary-100 selection:text-primary-900 overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-gradient-mesh opacity-[0.03] pointer-events-none z-0" />

      {currentRole === 'admin' ? (
        <div className="flex h-screen relative z-10">
          {/* Floating Sidebar (Desktop) */}
          <aside className="hidden lg:flex flex-col w-72 fixed inset-y-4 left-4 glass-panel rounded-2xl z-50 overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 text-white">
                  <Shield size={20} className="fill-current opacity-90" />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-slate-800 tracking-tight leading-tight">MCD HRMS</h1>
                  <p className="text-xs text-slate-500 font-medium">Admin Portal</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
              {adminMenuItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
                      ${isActive
                        ? 'text-primary-700 bg-primary-50/80 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
                      }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-full" />
                    )}
                    <item.icon
                      size={20}
                      className={`transition-colors duration-200 ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-50/50">
              <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                  OP
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">Om Prakash</p>
                  <p className="text-xs text-secondary-600 truncate font-medium">System Admin</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={toggleLanguage}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all text-xs font-medium text-slate-600"
                >
                  <Languages size={14} />
                  {language === 'hi' ? 'EN' : 'हिंदी'}
                </button>
                <button
                  onClick={() => switchRole('employee')}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all text-xs font-medium shadow-lg shadow-slate-800/20"
                >
                  <User size={14} />
                  Employee
                </button>
              </div>
            </div>
          </aside>

          {/* Mobile Sidebar Overlay */}
          <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />

          {/* Mobile Sidebar */}
          <aside className={`fixed inset-y-0 left-0 w-72 bg-white z-50 transform transition-transform duration-300 lg:hidden shadow-2xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-600/20">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg text-slate-900">MCD HRMS</h1>
                    <p className="text-xs text-slate-500">Admin Portal</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {adminMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${currentView === item.id ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <item.icon size={20} className={currentView === item.id ? 'text-primary-600' : 'text-slate-400'} />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 lg:pl-[20rem] transition-all duration-300">
            {/* Glass Header */}
            <header className="glass-header h-16 px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 transition-all duration-300">
              <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg text-slate-600">
                  <Menu size={20} />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                    {adminMenuItems.find(item => item.id === currentView)?.label || 'Dashboard'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden md:flex relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    className="block w-64 pl-10 pr-4 py-2 bg-slate-100/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all placeholder:text-slate-400 text-slate-700"
                  />
                </div>

                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                  <button className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-700">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full ring-2 ring-white"></span>
                  </button>
                  <button className="p-1 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200">
                    <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      OP
                    </div>
                  </button>
                </div>
              </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-8 scroll-smooth">
              <div className="max-w-7xl mx-auto animate-enter">
                {children}
              </div>
              <div className="h-6" /> {/* Bottom spacer */}
            </main>
          </div>
        </div>
      ) : (
        <div className="min-h-screen pb-24 lg:pb-0 bg-slate-50">
          {/* Employee Header */}
          <header className="glass-header px-4 py-3 sticky top-0 z-40 bg-white/90">
            <div className="max-w-md mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-600/20">
                  <Shield size={18} />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-slate-900 leading-none">MCD HRMS</h1>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-primary-600">Employee Portal</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="relative p-2 bg-slate-50 rounded-full text-slate-600">
                  <Bell size={20} />
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-error-500 rounded-full border-2 border-white"></span>
                </button>
                <div className="w-9 h-9 bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
                  <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white text-xs font-bold">EM</div>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="max-w-md mx-auto p-4 animate-enter">
            {children}
          </main>

          {/* Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-50 pb-safe">
            <div className="max-w-md mx-auto grid grid-cols-4 gap-1 p-2">
              {employeeMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 
                    ${currentView === item.id ? 'text-primary-600 bg-primary-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                  <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => switchRole('admin')}
                className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200"
              >
                <Shield size={22} />
                <span className="text-[10px] font-medium">{language === 'hi' ? 'एडमिन' : 'Admin'}</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

export default Layout;