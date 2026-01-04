import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployeeManagement from './components/EmployeeManagement';
import GrievanceManagement from './components/GrievanceManagement';
import LeaveManagement from './components/LeaveManagement';
import PayrollView from './components/PayrollView';
import TransferManagement from './components/TransferManagement';
import PerformanceReview from './components/PerformanceReview';
import ServiceBook from './components/ServiceBook';
import ComingSoon from './components/ComingSoon';

const DashboardRouter = () => {
  const { currentRole, currentView } = useApp();
  
  const renderContent = () => {
    // If the view is explicitly set to dashboard
    if (currentView === 'dashboard') {
      return currentRole === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />;
    }

    // Handle shared or specific views
    switch (currentView) {
      case 'employees':
        return <EmployeeManagement />;
      case 'grievances':
        return <GrievanceManagement />;
      case 'leave':
        return <LeaveManagement />;
      case 'payroll':
        return <PayrollView />;
      case 'transfers':
        return <TransferManagement />;
      case 'performance':
        return <PerformanceReview />;
      case 'service-book':
        return <ServiceBook />;
      case 'settings':
         return <ComingSoon title="System Settings" description="Configuration options for the HRMS system will be available here." />;
      case 'history':
        return <ComingSoon title="History" description="Your attendance and leave history will appear here." />;
      case 'profile':
        return <ComingSoon title="My Profile" description="Your profile settings and personal information will be available here." />;
      default:
        return currentRole === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />;
    }
  };
  
  return (
    <Layout>
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <DashboardRouter />
    </AppProvider>
  );
};

export default App;
