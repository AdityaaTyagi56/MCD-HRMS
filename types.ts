export type Role = 'admin' | 'employee';

export interface LocationCoords {
  lat: number;
  lng: number;
}

export interface ServiceRecord {
  id: number;
  date: string;
  type: 'Hiring' | 'Promotion' | 'Transfer' | 'Award' | 'Punishment' | 'Increment';
  description: string;
  authority: string;
  hash: string; // Blockchain simulation
}

export interface PerformanceMetric {
  attendanceScore: number; // 0-100
  grievanceScore: number; // 0-100 (Citizen complaints against them)
  taskCompletion: number; // 0-100
  overallGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
  lastReviewDate: string;
}

export interface Employee {
  id: number;
  name: string;
  role: string;
  department: 'Sanitation' | 'Administration' | 'Engineering' | 'Health';
  status: 'Present' | 'Absent' | 'On Leave';
  coords: LocationCoords | null;
  attendanceTime?: string;
  mobile?: string;
  salary?: number;
  joiningDate: string;
  currentPostingDate: string; // For transfer logic
  retirementDate: string; // For retirement radar
  serviceBook: ServiceRecord[];
  performance: PerformanceMetric;
  photoUrl?: string; // For face rec
}

export interface Grievance {
  id: number;
  userId: number; // Changed from user string to ID for better linking
  user: string;
  category: string;
  description: string;
  status: 'Pending' | 'Under Review' | 'Resolved' | 'Escalated';
  priority: 'High' | 'Medium' | 'Low';
  date: string;
  escalationLevel: 0 | 1 | 2; // 0: Zonal, 1: Deputy Comm, 2: Commissioner
  slaBreach: boolean;
}

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  pendingGrievances: number;
  criticalAlerts: string[];
}

export interface LeaveRequest {
  id: number;
  userId: number;
  userName: string;
  startDate: string;
  endDate: string;
  type: 'Medical' | 'Casual' | 'Privilege';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestDate: string;
}

export interface Payslip {
  id: number;
  userId: number;
  userName: string;
  role: string;
  month: string;
  year: number;
  basicSalary: number;
  deductions: number;
  netSalary: number;
  daysPresent: number;
  status: 'Paid' | 'Pending';
}

export type AppView =
  | 'dashboard'
  | 'payroll'
  | 'leave'
  | 'transfers'
  | 'performance'
  | 'service-book'
  | 'settings'
  | 'history'
  | 'profile';