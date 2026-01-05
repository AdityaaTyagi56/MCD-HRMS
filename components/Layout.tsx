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
  Sparkles
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentRole, switchRole, currentView, setCurrentView, language, toggleLanguage, t } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminMenuItems = [
    { id: 'dashboard', label: language === 'hi' ? 'डैशबोर्ड' : 'Dashboard', icon: LayoutDashboard, color: 'text-primary-600', bgColor: 'bg-primary-50' },
    { id: 'employees', label: language === 'hi' ? 'कर्मचारी' : 'Employees', icon: Users, color: 'text-secondary-600', bgColor: 'bg-secondary-50' },
    { id: 'leave', label: language === 'hi' ? 'छुट्टी प्रबंधन' : 'Leave Management', icon: Calendar, color: 'text-success-600', bgColor: 'bg-success-50' },
    { id: 'payroll', label: language === 'hi' ? 'वेतन' : 'Payroll', icon: IndianRupee, color: 'text-warning-600', bgColor: 'bg-warning-50' },
    { id: 'transfers', label: language === 'hi' ? 'स्थानांतरण' : 'Transfers', icon: ArrowRightLeft, color: 'text-error-600', bgColor: 'bg-error-50' },
    { id: 'performance', label: language === 'hi' ? 'प्रदर्शन' : 'Performance', icon: TrendingUp, color: 'text-primary-600', bgColor: 'bg-primary-50' },
    { id: 'service-book', label: language === 'hi' ? 'सेवा पुस्तिका' : 'Service Book', icon: BookOpen, color: 'text-secondary-600', bgColor: 'bg-secondary-50' },
    { id: 'settings', label: language === 'hi' ? 'सेटिंग्स' : 'Settings', icon: Settings, color: 'text-neutral-600', bgColor: 'bg-neutral-50' },
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-secondary-50/20">
      {currentRole === 'admin' ? (
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/80 backdrop-blur-xl border-r border-neutral-200/50 shadow-soft-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}> 
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-soft">
                    <Shield className="text-white" size={20} />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg text-primary-700">MCD HRMS</h1>
                    <p className="text-xs text-neutral-600">Admin Portal</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {adminMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 group ${currentView === item.id ? `${item.bgColor} ${item.color} shadow-inner-soft border border-opacity-50` : 'text-neutral-800 hover:bg-neutral-50 hover:text-black'}`}
                  >
                    <item.icon size={20} className={currentView === item.id ? item.color : `${item.color} group-hover:scale-110 transition-transform`} />
                  </button>
                ))}
              </nav>
              {/* Footer */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-neutral-50 to-primary-50/30 rounded-xl border border-neutral-200/50">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-black">{language === 'hi' ? 'एडमिन उपयोगकर्ता' : 'Admin User'}</p>
                  <p className="text-xs text-neutral-600">{language === 'hi' ? 'सिस्टम प्रशासक' : 'System Administrator'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={toggleLanguage} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium shadow-soft">
                  <Languages size={16} />
                  {language === 'hi' ? 'EN' : 'हिंदी'}
                </button>
                <button onClick={() => switchRole(currentRole === 'admin' ? 'employee' : 'admin')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary-50 text-secondary-700 border border-secondary-200 rounded-lg hover:bg-secondary-100 transition-colors text-sm font-medium shadow-soft">
                  <User size={16} />
                  {language === 'hi' ? 'कर्मचारी' : 'Employee'}
                </button>
              </div>
            </div>
          </div>
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-neutral-200/50 shadow-soft">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                    <Menu size={20} />
                  </button>
                  <div>
                    <h2 className="font-bold text-xl text-black responsive-text-lg">{adminMenuItems.find(item => item.id === currentView)?.label || 'Dashboard'}</h2>
                    <p className="text-sm text-neutral-600">Municipal Corporation of Delhi</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none w-64 transition-all" />
                  </div>
                  <button className="relative p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                    <Bell size={20} className="text-neutral-600" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full border-2 border-white animate-pulse"></div>
                  </button>
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-soft">A</div>
                </div>
              </div>
            </header>
            {/* Content */}
            <main className="flex-1 overflow-auto p-6">
              <div className="animate-in fade-in">{children}</div>
            </main>
          </div>
          {/* Sidebar Overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}
        </div>
      ) : (
        <div className="min-h-screen pb-20">
          {/* Top Bar */}
          <header className="bg-white/90 backdrop-blur-xl border-b border-neutral-200/50 shadow-soft sticky top-0 z-40">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-soft">
                  <Shield className="text-white" size={16} />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-primary-700 responsive-text-base">MCD HRMS</h1>
                  <p className="text-xs text-neutral-600">{language === 'hi' ? 'कर्मचारी पोर्टल' : 'Employee Portal'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="relative p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                  <Bell size={18} className="text-neutral-600" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-error-500 rounded-full border border-white animate-pulse"></div>
                </button>
                <button onClick={toggleLanguage} className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-200 transition-colors shadow-soft">
                  <Languages size={14} />
                  {language === 'hi' ? 'EN' : 'हिंदी'}
                </button>
              </div>
            </div>
          </header>
          {/* Content */}
          <main className="p-4">
            <div className="animate-in fade-in">{children}</div>
          </main>
          {/* Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-neutral-200/50 shadow-soft-lg z-50">
            <div className="flex items-center justify-around py-2 pb-safe">
              {employeeMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === item.id ? 'text-primary-600 bg-primary-50 shadow-inner-soft' : 'text-neutral-700 hover:text-black hover:bg-neutral-50'}`}
                >
                  <item.icon size={20} />
                  <span className="text-xs font-medium">{item.label}</span>
                  {currentView === item.id && (
                    <div className="w-1 h-1 bg-primary-500 rounded-full animate-pulse"></div>
                  )}
                </button>
              ))}
              <button onClick={() => switchRole('admin')} className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl text-secondary-600 hover:text-secondary-700 hover:bg-secondary-50 transition-all duration-200">
                <Shield size={20} />
                <span className="text-xs font-medium">{language === 'hi' ? 'एडमिन' : 'Admin'}</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

export default Layout;