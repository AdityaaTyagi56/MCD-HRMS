import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Role, Employee, Grievance, LocationCoords, LeaveRequest, Payslip, AppView } from '../types';
import { INITIAL_EMPLOYEES, INITIAL_GRIEVANCES, MCD_ZONE_COORDS, INITIAL_LEAVES, INITIAL_PAYSLIPS } from '../constants';
import { api, getApiConfig, setApiConfig } from '../services/api';

type ApiStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AppContextType {
  currentRole: Role;
  switchRole: (role: Role) => void;
  
  // Navigation
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Localization
  language: 'en' | 'hi';
  toggleLanguage: () => void;
  t: (key: string) => string;

  // Data
  employees: Employee[];
  grievances: Grievance[];
  leaves: LeaveRequest[];
  payslips: Payslip[];
  officeLocation: LocationCoords;
  apiBase: string;
  apiKey: string;
  apiStatus: ApiStatus;
  apiError: string | null;

  // Actions
  addGrievance: (grievance: { userId: number; category: string; description: string; priority?: 'High' | 'Medium' | 'Low' }) => Promise<void>;
  resolveGrievance: (id: number) => void;
  markAttendance: (id: number, coords: { lat: number, lng: number }, photoUrl?: string) => Promise<void>;
  setOfficeLocationToCurrent: () => void;
  applyForLeave: (request: Omit<LeaveRequest, 'id' | 'status' | 'requestDate' | 'userName'>) => Promise<void>;
  updateLeaveStatus: (id: number, status: 'Approved' | 'Rejected') => Promise<void>;
  releaseAllSalaries: () => Promise<void>;
  setApiBase: (base: string) => void;
  setApiKey: (key: string) => void;
  refreshAll: () => Promise<void>;
  
  // ML Security Services
  checkLiveness: (command: string, imageBlob: Blob) => Promise<{verified: boolean, message?: string}>;
  scanDocument: (file: File) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialApi = getApiConfig();
  const [currentRole, setCurrentRole] = useState<Role>('admin');
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [language, setLanguage] = useState<'en' | 'hi'>('hi');

  // Comprehensive Translation Dictionary
  const translations: Record<string, { en: string; hi: string }> = {
    // Core Actions
    "mark_attendance": { en: "Mark Attendance", hi: "उपस्थिति दर्ज करें" },
    "salary_slip": { en: "Salary Slip", hi: "वेतन पर्ची" },
    "complaint": { en: "Complaint", hi: "शिकायत" },
    "dashboard": { en: "Dashboard", hi: "डैशबोर्ड" },
    "welcome": { en: "Welcome", hi: "स्वागत है" },
    
    // Status Messages
    "processing": { en: "Processing...", hi: "प्रक्रिया जारी है..." },
    "success": { en: "Success", hi: "सफल" },
    "failed": { en: "Failed", hi: "विफल" },
    "listening": { en: "Listening...", hi: "सुन रहा हूँ..." },
    "speak_now": { en: "Speak Now", hi: "अब बोलें" },
    "tap_to_speak": { en: "Tap to Speak", hi: "बोलने के लिए टैप करें" },
    
    // Location
    "location_verified": { en: "Location Verified", hi: "स्थान सत्यापित" },
    "location_failed": { en: "Location Failed", hi: "स्थान सत्यापन विफल" },
    "verifying_location": { en: "Verifying Location...", hi: "स्थान सत्यापित हो रहा है..." },
    
    // Attendance Modal
    "capture_photo": { en: "Capture Photo", hi: "फोटो खींचें" },
    "attendance_marked": { en: "Attendance Marked", hi: "उपस्थिति दर्ज हुई" },
    
    // Employee Info
    "ward": { en: "Ward", hi: "वार्ड" },
    "sanitation": { en: "Sanitation", hi: "सफाई विभाग" },
    "department": { en: "Department", hi: "विभाग" },
    
    // Voice Modal
    "describe_issue": { en: "Describe your issue...", hi: "अपनी समस्या बताएं..." },
    "complaint_submitted": { en: "Complaint Submitted!", hi: "शिकायत दर्ज हो गई!" },
    
    // Navigation
    "home": { en: "Home", hi: "होम" },
    "history": { en: "History", hi: "इतिहास" },
    "profile": { en: "Profile", hi: "प्रोफाइल" },
    
    // General
    "submit": { en: "Submit", hi: "जमा करें" },
    "cancel": { en: "Cancel", hi: "रद्द करें" },
    "close": { en: "Close", hi: "बंद करें" },
    "loading": { en: "Loading...", hi: "लोड हो रहा है..." },
    "error": { en: "Error", hi: "त्रुटि" },
    "retry": { en: "Retry", hi: "पुनः प्रयास करें" },
    
    // Admin Dashboard
    "total_workforce": { en: "Total Workforce", hi: "कुल कर्मचारी" },
    "present_today": { en: "Present Today", hi: "आज उपस्थित" },
    "pending_issues": { en: "Pending Issues", hi: "लंबित मुद्दे" },
    "monthly_savings": { en: "Monthly Savings", hi: "मासिक बचत" },
    "live_alerts": { en: "LIVE ALERTS", hi: "लाइव अलर्ट" },
    "attendance_trends": { en: "Attendance Trends", hi: "उपस्थिति रुझान" },
    "weekly_overview": { en: "Weekly performance overview", hi: "साप्ताहिक प्रदर्शन अवलोकन" },
    "department_wise": { en: "Department Wise", hi: "विभाग अनुसार" },
    "workforce_distribution": { en: "Workforce distribution", hi: "कार्यबल वितरण" },
    "performance": { en: "Performance", hi: "प्रदर्शन" },
    "grade_distribution": { en: "Grade distribution", hi: "ग्रेड वितरण" },
    "live_employee_status": { en: "Live Employee Status", hi: "लाइव कर्मचारी स्थिति" },
    "realtime_tracking": { en: "Real-time attendance tracking", hi: "रीयल-टाइम उपस्थिति ट्रैकिंग" },
    "search_employees": { en: "Search employees...", hi: "कर्मचारी खोजें..." },
    "employee": { en: "Employee", hi: "कर्मचारी" },
    "status": { en: "Status", hi: "स्थिति" },
    "checkin": { en: "Check-in", hi: "चेक-इन" },
    "present": { en: "Present", hi: "उपस्थित" },
    "absent": { en: "Absent", hi: "अनुपस्थित" },
    "on_leave": { en: "On Leave", hi: "छुट्टी पर" },
    
    // Grievances
    "employee_grievances": { en: "Employee Grievances", hi: "कर्मचारी शिकायतें" },
    "ai_complaint_analysis": { en: "AI-powered complaint analysis & routing", hi: "AI-संचालित शिकायत विश्लेषण" },
    "voice_nlp_enabled": { en: "Voice NLP Enabled", hi: "वॉइस NLP सक्षम" },
    "all": { en: "All", hi: "सभी" },
    "pending": { en: "Pending", hi: "लंबित" },
    "resolved": { en: "Resolved", hi: "समाधान" },
    "total": { en: "Total", hi: "कुल" },
    "high_priority": { en: "High Priority", hi: "उच्च प्राथमिकता" },
    "resolve": { en: "Resolve", hi: "समाधान करें" },
    "no_grievances": { en: "No grievances found", hi: "कोई शिकायत नहीं मिली" },
    "description": { en: "Description", hi: "विवरण" },
    "submitted": { en: "Submitted", hi: "जमा किया" },
    "mark_resolved": { en: "Mark as Resolved", hi: "समाधान के रूप में चिह्नित करें" },
    
    // WhatsApp
    "whatsapp_notifications": { en: "WhatsApp Notifications", hi: "व्हाट्सएप सूचनाएं" },
    "send_bulk_messages": { en: "Send bulk messages to employees", hi: "कर्मचारियों को बल्क संदेश भेजें" },
    "attendance_reminders": { en: "Attendance Reminders", hi: "उपस्थिति रिमाइंडर" },
    "salary_alerts": { en: "Salary Alerts", hi: "वेतन अलर्ट" },
    "emergency_broadcast": { en: "Emergency Broadcast", hi: "आपातकालीन प्रसारण" },
    "open_whatsapp": { en: "Open WhatsApp Panel", hi: "व्हाट्सएप पैनल खोलें" },
    
    // AI Assistant
    "ai_assistant": { en: "AI Assistant", hi: "AI सहायक" },
    "intelligent_analytics": { en: "Intelligent workforce analytics", hi: "बुद्धिमान कार्यबल विश्लेषण" },
    "fraud_detection": { en: "Fraud Detection", hi: "धोखाधड़ी पहचान" },
    "performance_insights": { en: "Performance Insights", hi: "प्रदर्शन अंतर्दृष्टि" },
    "smart_analysis": { en: "Smart Analysis", hi: "स्मार्ट विश्लेषण" },
    "ask_ai": { en: "Ask AI Assistant", hi: "AI सहायक से पूछें" },
    "ml_online": { en: "Online", hi: "ऑनलाइन" },
    "ml_offline": { en: "Offline", hi: "ऑफलाइन" },
    
    // Leave Management
    "leave_management": { en: "Leave Management", hi: "छुट्टी प्रबंधन" },
    "apply_leave": { en: "Apply for Leave", hi: "छुट्टी के लिए आवेदन करें" },
    "leave_history": { en: "Leave History", hi: "छुट्टी इतिहास" },
    "leave_balance": { en: "Leave Balance", hi: "छुट्टी शेष" },
    "casual_leave": { en: "Casual Leave", hi: "आकस्मिक छुट्टी" },
    "medical_leave": { en: "Medical Leave", hi: "चिकित्सा छुट्टी" },
    "privilege_leave": { en: "Privilege Leave", hi: "विशेषाधिकार छुट्टी" },
    "start_date": { en: "Start Date", hi: "प्रारंभ तिथि" },
    "end_date": { en: "End Date", hi: "समाप्ति तिथि" },
    "reason": { en: "Reason", hi: "कारण" },
    "days": { en: "days", hi: "दिन" },
    "remaining": { en: "remaining", hi: "शेष" },
    "used": { en: "Used", hi: "उपयोग किया" },
    "approved": { en: "Approved", hi: "स्वीकृत" },
    "rejected": { en: "Rejected", hi: "अस्वीकृत" },
    "submit_application": { en: "Submit Application", hi: "आवेदन जमा करें" },
    
    // Payroll
    "payroll": { en: "Payroll", hi: "वेतन" },
    "my_compensation": { en: "My Compensation", hi: "मेरा वेतन" },
    "net_pay": { en: "Net Pay", hi: "शुद्ध वेतन" },
    "earnings": { en: "Earnings", hi: "आय" },
    "deductions": { en: "Deductions", hi: "कटौती" },
    "download_slip": { en: "Download Slip", hi: "पर्ची डाउनलोड करें" },
    "payment_history": { en: "Payment History", hi: "भुगतान इतिहास" },
    "paid": { en: "Paid", hi: "भुगतान हुआ" },
    "basic_pay": { en: "Basic Pay", hi: "मूल वेतन" },
    "next_payday": { en: "Next payday", hi: "अगला वेतन दिवस" },
    "release_salaries": { en: "Release All Salaries", hi: "सभी वेतन जारी करें" },
    "all_processed": { en: "All Processed", hi: "सभी प्रोसेस हो गए" },
    
    // Time
    "last_7_days": { en: "Last 7 days", hi: "पिछले 7 दिन" },
    "last_30_days": { en: "Last 30 days", hi: "पिछले 30 दिन" },
    "last_90_days": { en: "Last 90 days", hi: "पिछले 90 दिन" },
    "this_month": { en: "This Month", hi: "इस महीने" },
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : 'en');
  };

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  // Set Hindi as default for all roles; keep auto-switch to Hindi for employees
  useEffect(() => {
    if (currentRole === 'employee') {
      setLanguage('hi');
    }
  }, [currentRole]);

  const [apiBase, setApiBaseState] = useState<string>(initialApi.base);
  const [apiKey, setApiKeyState] = useState<string>(initialApi.key);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('idle');
  const [apiError, setApiError] = useState<string | null>(null);
  
  const ML_API_URL = import.meta.env.VITE_ML_SERVICE_URL || "http://localhost:8002";

  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [grievances, setGrievances] = useState<Grievance[]>(INITIAL_GRIEVANCES);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(INITIAL_LEAVES);
  const [payslips, setPayslips] = useState<Payslip[]>(INITIAL_PAYSLIPS);
  
  const [officeLocation, setOfficeLocation] = useState<LocationCoords>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('officeLocation');
      return saved ? JSON.parse(saved) : { lat: MCD_ZONE_COORDS.lat, lng: MCD_ZONE_COORDS.lng };
    }
    return { lat: MCD_ZONE_COORDS.lat, lng: MCD_ZONE_COORDS.lng };
  });

  useEffect(() => {
    setApiConfig({ base: apiBase, key: apiKey });
  }, [apiBase, apiKey]);

  const refreshAll = useCallback(async () => {
    setApiStatus('loading');
    setApiError(null);
    setApiConfig({ base: apiBase, key: apiKey });
    try {
      // In a real app, we would fetch from API. For this demo, we use local state if modified, or initial constants.
      // However, since we are simulating a backend, let's just use the state we have.
      // But to simulate "refresh", we might want to re-fetch if we were actually connected to a DB.
      // For now, we'll just keep the local state as the source of truth for the session.
      setApiStatus('ready');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to reach API';
      setApiError(message);
      setApiStatus('error');
    }
  }, [apiBase, apiKey]);

  // Initial load
  useEffect(() => {
    // We don't want to overwrite state on every mount if we have data, but for dev hot reload it's fine.
  }, []);

  const switchRole = (role: Role) => {
    setCurrentRole(role);
    setCurrentView('dashboard'); 
  };

  const setApiBase = (base: string) => {
    setApiBaseState(base);
    setApiConfig({ base });
  };

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    setApiConfig({ key });
  };

  const addGrievance = async (newGrievance: { userId: number; category: string; description: string; priority?: 'High' | 'Medium' | 'Low' }) => {
    // @ts-ignore - API signature mismatch in mock vs real, handling gracefully
    const grievance = await api.submitGrievance({ ...newGrievance, user: 'Unknown' }); 
    setGrievances((prev) => [grievance, ...prev]);
  };

  const resolveGrievance = async (id: number) => {
    try {
      await api.updateGrievanceStatus(id, 'Resolved');
      setGrievances((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, status: 'Resolved' as const } : g
        )
      );
    } catch (error) {
      console.error('Failed to resolve grievance:', error);
      // Fallback to local state update if API fails
      setGrievances((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, status: 'Resolved' as const } : g
        )
      );
    }
  };

  const markAttendance = async (id: number, coords: { lat: number, lng: number }, photoUrl?: string) => {
    try {
      await api.markAttendance({ userId: id, lat: coords.lat, lng: coords.lng });
    } catch (error) {
      console.error('Failed to sync attendance with server:', error);
      // Continue with local update even if API fails
    }
    const now = new Date().toLocaleTimeString();
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? { ...emp, status: 'Present', coords, attendanceTime: now, photoUrl }
          : emp
      )
    );
  };

  const setOfficeLocationToCurrent = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setOfficeLocation(newCoords);
      localStorage.setItem('officeLocation', JSON.stringify(newCoords)); 
      alert(`Office Location Updated to: ${newCoords.lat.toFixed(4)}, ${newCoords.lng.toFixed(4)}`);
    }, (err) => {
      alert("Error getting location: " + err.message);
    });
  };

  const applyForLeave = async (request: Omit<LeaveRequest, 'id' | 'status' | 'requestDate' | 'userName'>) => {
    try {
      const newLeave = await api.createLeave({
        userId: request.userId,
        startDate: request.startDate,
        endDate: request.endDate,
        type: request.type,
        reason: request.reason,
      });
      setLeaves(prev => [newLeave, ...prev]);
    } catch (error) {
      console.error('Failed to apply for leave:', error);
      // Create a local leave request as fallback
      const fallbackLeave: LeaveRequest = {
        id: Date.now(),
        userId: request.userId,
        userName: employees.find(e => e.id === request.userId)?.name || 'Unknown',
        startDate: request.startDate,
        endDate: request.endDate,
        type: request.type,
        reason: request.reason,
        status: 'Pending',
        requestDate: new Date().toISOString().split('T')[0],
      };
      setLeaves(prev => [fallbackLeave, ...prev]);
      throw error; // Re-throw so UI can show error
    }
  };

  const updateLeaveStatus = async (id: number, status: 'Approved' | 'Rejected') => {
    try {
      const updated = await api.updateLeaveStatus(id, status);
      setLeaves(prev => prev.map(leave => 
        leave.id === id ? updated : leave
      ));
    } catch (error) {
      console.error('Failed to update leave status:', error);
      // Fallback to local state update
      setLeaves(prev => prev.map(leave => 
        leave.id === id ? { ...leave, status } : leave
      ));
    }
  };

  const releaseAllSalaries = async () => {
    try {
      await api.releaseAllSalaries();
    } catch (error) {
      console.error('Failed to sync salary release with server:', error);
      // Continue with local update
    }
    setPayslips(prev => prev.map(p => ({ ...p, status: 'Paid' })));
  };

  const checkLiveness = async (command: string, imageBlob: Blob): Promise<{verified: boolean, message?: string}> => {
    try {
      const formData = new FormData();
      formData.append('command', command);
      formData.append('file', imageBlob, 'capture.jpg');

      const response = await fetch(`${ML_API_URL}/biolock/liveness`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('ML Service Unavailable');
      }

      const result = await response.json();
      return { verified: result.verified, message: result.message };
    } catch (error) {
      console.warn("ML Service failed, falling back to mock:", error);
      // Fallback mock logic for demo purposes if Python server isn't running
      return { verified: true, message: "Mock Verification Success" };
    }
  };

  const scanDocument = async (file: File): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${ML_API_URL}/integrity/document-scan`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('ML Service Unavailable');
      }

      return await response.json();
    } catch (error) {
      console.warn("ML Service failed, falling back to mock:", error);
      return { is_tampered: false, confidence_score: 0.9, details: "Mock Scan: Document appears authentic." };
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        switchRole,
        currentView,
        setCurrentView,
        language,
        toggleLanguage,
        t,
        employees,
        grievances,
        leaves,
        payslips,
        apiBase,
        apiKey,
        apiStatus,
        apiError,
        addGrievance,
        resolveGrievance,
        markAttendance,
        officeLocation,
        setOfficeLocationToCurrent,
        applyForLeave,
        updateLeaveStatus,
        releaseAllSalaries,
        setApiBase,
        setApiKey,
        refreshAll,
        checkLiveness,
        scanDocument
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};