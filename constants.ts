import { Employee, Grievance, LeaveRequest, Payslip, Ward } from './types';

// YOUR COORDINATES (Ghaziabad/Noida)
export const MCD_ZONE_COORDS = {
  lat: 28.700114055048267, 
  lng: 77.43000859386893,
  radiusKm: 0.5 
};

export const GRIEVANCE_CATEGORIES = [
  "Salary Issue",
  "Transfer Request",
  "Workplace Harassment",
  "Leave Application",
  "Equipment Request"
];

// --- DATA GENERATOR ---

const FIRST_NAMES = [
  "Ramesh", "Suresh", "Anita", "Vikram", "Sunita", "Amit", "Priya", "Rahul", "Sneha", "Vijay",
  "Deepak", "Pooja", "Raj", "Meena", "Sanjay", "Kavita", "Arun", "Seema", "Karan", "Divya",
  "Mohit", "Nehe", "Vivek", "Riya", "Alok", "Anju", "Tarun", "Manju", "Lalit", "Rekha"
];

const LAST_NAMES = [
  "Gupta", "Kumar", "Singh", "Sharma", "Verma", "Reddy", "Yadav", "Mishra", "Jha", "Chopra",
  "Malhotra", "Saxena", "Bhatia", "Jain", "Aggarwal", "Rawat", "Negi", "Das", "Nair", "Patel"
];

const DEPARTMENTS = ["Sanitation", "Administration", "Engineering", "Health"] as const;

const ROLES = {
  "Sanitation": ["Sanitation Worker", "Driver", "Supervisor"],
  "Administration": ["Clerk", "Section Officer", "Data Entry Operator"],
  "Engineering": ["Junior Engineer", "Assistant Engineer", "Helper"],
  "Health": ["Health Officer", "Inspector", "Nurse"]
};

// Base Salary Mapping for Mock Payroll
const SALARY_MAP: Record<string, number> = {
  "Sanitation Worker": 15000, "Driver": 18000, "Supervisor": 25000,
  "Clerk": 22000, "Section Officer": 45000, "Data Entry Operator": 18000,
  "Junior Engineer": 40000, "Assistant Engineer": 60000, "Helper": 12000,
  "Health Officer": 55000, "Inspector": 35000, "Nurse": 30000
};

// Helper to generate random number
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Generate 50 Employees
const generateEmployees = (): Employee[] => {
  const employees: Employee[] = [];
  
  // Create 1 specific user for YOU (The Demo User)
  employees.push({
    id: 1,
    name: "Ramesh Gupta", // YOUR PERSONA
    role: "Sanitation Worker",
    department: "Sanitation",
    mobile: "+918287923955",
    status: "Absent", // Starts absent so you can mark attendance
    coords: null,
    joiningDate: "2015-06-15",
    currentPostingDate: "2020-01-10",
    retirementDate: "2035-06-15",
    serviceBook: [
      { id: 1, date: "2015-06-15", type: "Hiring", description: "Joined as Sanitation Worker", authority: "MCD North", hash: "0x123...abc" },
      { id: 2, date: "2018-03-10", type: "Award", description: "Best Worker Award", authority: "Zone Commissioner", hash: "0x456...def" }
    ],
    performance: {
      attendanceScore: 85,
      grievanceScore: 90,
      taskCompletion: 95,
      overallGrade: 'A',
      lastReviewDate: "2025-12-31"
    }
  });

  for (let i = 2; i <= 50; i++) {
    const dept = randomItem(Array.from(DEPARTMENTS));
    // @ts-ignore
    const role = randomItem(ROLES[dept]);
    const isPresent = Math.random() > 0.3; // 70% attendance rate
    
    // Generate random coords NEAR the office (within 2km) or completely off (if absent)
    let coords = null;
    if (isPresent) {
      coords = {
        lat: MCD_ZONE_COORDS.lat + (Math.random() - 0.5) * 0.02, // Small variation
        lng: MCD_ZONE_COORDS.lng + (Math.random() - 0.5) * 0.02
      };
    }

    const joinYear = randomInt(2000, 2022);
    const postingYear = randomInt(joinYear, 2023);

    employees.push({
      id: i,
      name: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
      role: role,
      department: dept,
      mobile: `+91${randomInt(70, 99)}${randomInt(10000000, 99999999)}`, // Generate realistic Indian mobile
      status: isPresent ? "Present" : "Absent",
      coords: coords,
      attendanceTime: isPresent ? `${randomInt(8, 10)}:${randomInt(10, 59)} AM` : undefined,
      joiningDate: `${joinYear}-01-15`,
      currentPostingDate: `${postingYear}-05-20`,
      retirementDate: `${joinYear + 30}-01-15`, // Approx 30 years service
      serviceBook: [],
      performance: {
        attendanceScore: randomInt(60, 100),
        grievanceScore: randomInt(70, 100),
        taskCompletion: randomInt(50, 100),
        overallGrade: randomItem(['A+', 'A', 'B', 'C', 'D']),
        lastReviewDate: "2025-12-31"
      }
    });
  }
  return employees;
};

export const INITIAL_EMPLOYEES = generateEmployees();

export const INITIAL_GRIEVANCES: Grievance[] = [
  { id: 101, userId: 1, user: "Ramesh Gupta", category: "Salary", description: "Salary Delayed for last month", status: "Pending", priority: "High", date: "2025-12-25", submittedAt: "2025-12-25T09:00:00.000Z", escalationLevel: 0, slaBreach: false },
  { id: 102, userId: 2, user: "Suresh Kumar", category: "Leave", description: "Medical Leave Approval Needed", status: "Resolved", priority: "Low", date: "2025-12-20", submittedAt: "2025-12-20T11:30:00.000Z", escalationLevel: 0, slaBreach: false },
  { id: 103, userId: 3, user: "Vikram Singh", category: "Harassment", description: "Issue with immediate supervisor", status: "Under Review", priority: "High", date: "2025-12-26", submittedAt: "2025-12-26T08:45:00.000Z", escalationLevel: 1, slaBreach: true },
  { id: 104, userId: 4, user: "Priya Sharma", category: "Equipment", description: "Broom inventory low in Ward 4", status: "Pending", priority: "Medium", date: "2025-12-27", submittedAt: "2025-12-27T14:10:00.000Z", escalationLevel: 0, slaBreach: false },

  { id: 105, userId: 5, user: "Amit Verma", category: "Transfer", description: "Request transfer to South Zone", status: "Pending", priority: "Low", date: "2025-12-28", submittedAt: "2025-12-28T10:05:00.000Z", escalationLevel: 0, slaBreach: false }
];

// Generate Leaves for the 50 employees
const generateLeaves = (): LeaveRequest[] => {
  const leaves: LeaveRequest[] = [];
  const types = ['Medical', 'Casual', 'Privilege'] as const;
  const statuses = ['Pending', 'Approved', 'Rejected'] as const;

  for(let i=0; i<15; i++) {
    const emp = randomItem(INITIAL_EMPLOYEES);
    leaves.push({
      id: 200 + i,
      userId: emp.id,
      userName: emp.name,
      startDate: `2026-01-${randomInt(5, 15).toString().padStart(2, '0')}`,
      endDate: `2026-01-${randomInt(16, 25).toString().padStart(2, '0')}`,
      type: randomItem(Array.from(types)),
      reason: "Personal requirement",
      status: i < 5 ? 'Pending' : randomItem(Array.from(statuses)), // Ensure some are pending
      requestDate: `2025-12-${randomInt(20, 30)}`
    });
  }
  return leaves;
};

export const INITIAL_LEAVES = generateLeaves();

// Generate Payslips for all 50 employees
const generatePayslips = (): Payslip[] => {
  return INITIAL_EMPLOYEES.map(emp => {
    const daysPresent = randomInt(20, 30);
    const base = SALARY_MAP[emp.role] || 15000;
    // Simple calc: Base * (Days / 30)
    const gross = Math.round((base / 30) * daysPresent);
    const deductions = Math.round(gross * 0.05); // 5% deduction
    
    return {
      id: 300 + emp.id,
      userId: emp.id,
      userName: emp.name,
      role: emp.role,
      month: "December",
      year: 2025,
      daysPresent: daysPresent,
      basicSalary: gross,
      deductions: deductions,
      netSalary: gross - deductions,
      status: emp.id % 2 === 0 ? 'Pending' : 'Paid' // Random mix
    };
  });
};

export const INITIAL_PAYSLIPS = generatePayslips();

export const INITIAL_WARDS: Ward[] = [
  { id: 1, zone: 'Zone 1', name: 'Chandni Chowk', population: 180000, riskLevel: 'Medium', notes: 'Old city dense lanes' },
  { id: 2, zone: 'Zone 2', name: 'Karol Bagh', population: 210000, riskLevel: 'Low', notes: 'Mixed commercial/residential' },
  { id: 3, zone: 'Zone 3', name: 'Civil Lines', population: 150000, riskLevel: 'Low', notes: 'Close to Yamuna embankment' },
  { id: 4, zone: 'Zone 4', name: 'Rohini', population: 320000, riskLevel: 'High', notes: 'Low-lying pockets, waterlogging risk' },
  { id: 5, zone: 'Zone 5', name: 'Najafgarh', population: 275000, riskLevel: 'Medium', notes: 'Open drains near settlements' },
  { id: 6, zone: 'Zone 6', name: 'Dwarka', population: 240000, riskLevel: 'Low', notes: 'Better drainage but high wind corridor' },
  { id: 7, zone: 'Zone 7', name: 'South Delhi', population: 330000, riskLevel: 'Medium', notes: 'Tree cover, scattered waterlogging' },
  { id: 8, zone: 'Zone 8', name: 'Central Delhi', population: 195000, riskLevel: 'Medium', notes: 'Heritage areas, traffic choke points' },
  { id: 9, zone: 'Zone 9', name: 'Narela', population: 160000, riskLevel: 'High', notes: 'Industrial belts, drainage constraints' },
  { id: 10, zone: 'Zone 10', name: 'Shahdara North', population: 200000, riskLevel: 'Medium', notes: 'Yamuna proximity, embankment watch' },
  { id: 11, zone: 'Zone 11', name: 'Shahdara South', population: 210000, riskLevel: 'High', notes: 'Floodplain-adjacent wards' },
  { id: 12, zone: 'Zone 12', name: 'Kalkaji', population: 185000, riskLevel: 'Low', notes: 'Elevated terrain, minor wind alerts' }
];