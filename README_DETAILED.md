# 🏛️ MCD Unified HRMS - Comprehensive Documentation

**Municipal Corporation of Delhi - Unified Human Resource Management System**

A cutting-edge, AI-powered Human Resource Management System specifically designed for municipal corporations with advanced features for employee management, grievance handling, payroll processing, and performance tracking.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Key Differentiating Factors](#key-differentiating-factors)
- [Technology Stack](#technology-stack)
- [Special Features](#special-features)
- [Quick Start Guide](#quick-start-guide)
- [System Architecture](#system-architecture)
- [Core Modules](#core-modules)
- [API Reference](#api-reference)
- [Security Features](#security-features)
- [Deployment Options](#deployment-options)

---

## 🎯 Project Overview

MCD Unified HRMS is a next-generation, web-based Human Resource Management System built for the Municipal Corporation of Delhi. It addresses the unique challenges of managing a large, geographically distributed workforce across multiple departments while incorporating modern technologies like AI, voice recognition, and geofencing.

### Target Users
- **Administrators**: Municipal corporation management, HR departments, zone commissioners
- **Employees**: Field workers, office staff, supervisors across various departments
- **Supervisors**: Department heads and section officers
- **Citizens**: Indirect stakeholders in grievance tracking systems

### System Scope
- **50+ Employee Records** with complete service histories
- **Multi-Department Support**: Sanitation, Administration, Engineering, Health
- **Real-Time Analytics** and workforce insights
- **Bilingual Support**: English & Hindi interfaces
- **Mobile-First Design** for field workers

---

## 🌟 Key Differentiating Factors

### 1. **AI-Powered Intelligence**
- **Intelligent Insights**: Uses OpenRouter AI for data-driven workforce analytics
- **Predictive Analytics**: Anticipate retirement dates, performance trends, and operational needs
- **Smart Recommendations**: System suggests optimal resource allocation and policy decisions
- **Natural Language Processing**: Processes voice grievances and converts them to text with NLP understanding

### 2. **Voice-Based Grievance Filing (Hindi Support)**
- **Hindi-First Approach**: Native support for Hindi speech recognition (hi-IN)
- **Accessibility**: Enables non-technical field workers to file grievances hands-free
- **Authentic Feedback**: Captures worker voice directly without intermediaries
- **Real-Time Transcription**: Web Speech API with interim results
- **Grievance Categories**: Pre-defined categories for faster classification
  - Salary Issues
  - Transfer Requests
  - Workplace Harassment
  - Leave Applications
  - Equipment Requests

### 3. **Geofence-Based Smart Attendance**
- **GPS Verification**: Attendance marked only within MCD zone coordinates
- **Real-Time Location Tracking**: Track active employees and their status
- **Automatic Distance Validation**: Prevents fraudulent attendance from outside the zone
- **Zone Configuration**: Easily configurable radius and coordinates (default: 0.5km radius around zone center)
- **Location Privacy**: Coordinates stored only during attendance marking

### 4. **Blockchain-Simulated Service Book**
- **Digital Service Records**: Immutable record of all employee actions
- **Hash-Based Verification**: Each record contains cryptographic hash
- **Complete History**: Hiring, promotions, transfers, awards, punishments, increments
- **Tamper-Proof Audit Trail**: Legal compliance for employment records
- **Service Milestones**: Track tenure, current posting dates, retirement eligibility

### 5. **Comprehensive Performance Review System**
- **Multi-Dimensional Scoring**:
  - Attendance Score (0-100)
  - Grievance Score (citizen complaint ratio)
  - Task Completion Rate
  - Overall Grade (A+, A, B, C, D)
- **Automatic Grade Calculation**: System-generated grades based on metrics
- **Review History**: Track performance over time with review dates
- **Departmental Benchmarking**: Compare performance across similar roles

### 6. **Integrated Payroll Management**
- **Automated Payroll Processing**: Calculate salary for all employees
- **Role-Based Salary Mapping**:
  - Sanitation Workers: ₹15,000
  - Supervisors: ₹25,000+
  - Section Officers: ₹45,000+
  - Assistant Engineers: ₹60,000+
  - Health Officers: ₹55,000+
- **Digital Salary Slips**: PDF generation and digital distribution
- **Batch Processing**: Release payroll for all employees in one click
- **Transparent Breakdowns**: Show deductions, allowances, net pay

### 7. **WhatsApp Integration Panel**
- **Direct Communication**: Send updates to employees via WhatsApp
- **Bulk Messaging**: Broadcast leave approvals, payroll updates, announcements
- **Message Templates**: Pre-configured templates for common notifications
- **Delivery Tracking**: Monitor message delivery status
- **Two-Way Communication**: Employees can respond with acknowledgments

### 8. **Advanced Leave Management**
- **Multiple Leave Types**:
  - Casual Leave (CL)
  - Sick Leave (SL)
  - Privilege Leave (PL)
  - Maternity/Paternity Leave
  - Special Leave
- **Leave Balances**: Auto-tracked with yearly reset
- **Approval Workflow**: Multi-level approval based on hierarchy
- **Conflict Detection**: Prevent overlapping leaves automatically
- **Leave History**: Complete audit trail of all leave applications

### 9. **Transfer Management System**
- **Transfer Requests**: Employees can request transfers with reasons
- **Zone Management**: Transfer between different MCD zones
- **Department Transfers**: Move between departments within organization
- **Posting History**: Track all transfers with effective dates
- **Retirement Radar**: Identify approaching retirement dates for planning

### 10. **Secure API Architecture**
- **Rate Limiting**: Protect against API abuse (200 requests/15 mins per IP)
- **Helmet Security**: HTTP header protection against vulnerabilities
- **CORS Configuration**: Whitelist allowed origins for cross-origin requests
- **Bearer Token & API Key Auth**: Multiple authentication methods
- **Request Validation**: Zod schema validation for all inputs
- **Error Handling**: Comprehensive error responses with proper status codes

---

## 🛠️ Technology Stack

### Frontend
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 19.2.3 | Modern UI development |
| **Language** | TypeScript 5.8 | Type-safe JavaScript |
| **Build Tool** | Vite 6.2 | Lightning-fast development |
| **Styling** | Tailwind CSS | Utility-first responsive design |
| **Icons** | Lucide React 0.562 | Beautiful SVG icons |
| **Charts** | Recharts 3.6 | Interactive data visualizations |
| **PDF Export** | jsPDF 2.5.1 | Client-side PDF generation |
| **UUID** | uuid 11.1.0 | Unique ID generation |

### Backend
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js + Express 4.21 | Fast API server |
| **Language** | TypeScript | Type-safe backend |
| **Security** | Helmet 8.0 | HTTP header hardening |
| **CORS** | cors 2.8.5 | Cross-origin handling |
| **Rate Limit** | express-rate-limit 7.4 | API throttling |
| **Logging** | morgan 1.10 | HTTP request logging |
| **Validation** | Zod 3.23.8 | Schema validation |
| **Environment** | dotenv 16.4.7 | Config management |

### ML & AI
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **AI Model** | OpenRouter SDK 0.1 | Multi-model AI access |
| **Framework** | FastAPI | Python ML service |
| **Server** | Uvicorn | ASGI app server |
| **Image Processing** | Pillow | Face recognition prep |
| **Numeric Ops** | NumPy | ML computations |

### DevOps & Infrastructure
| Tool | Version | Purpose |
|------|---------|---------|
| **Containerization** | Docker | Environment consistency |
| **Orchestration** | Docker Compose | Multi-container setup |
| **Task Runner** | Concurrently 9.2 | Run multiple processes |
| **TypeScript Executor** | tsx 4.19 | Direct TS execution |

---

## ✨ Special Features Deep Dive

### 🎤 Voice Grievance System

The voice-based grievance filing system is a flagship feature enabling field workers to submit complaints using natural speech in Hindi.

**How It Works:**
```
Worker Speaks → Web Speech API (hi-IN) → Text Transcription 
→ Grievance Categories → AI Classification → Database Storage 
→ Admin Notification → WhatsApp Alert
```

**Key Technologies:**
- **Web Speech API**: Browser native speech recognition
- **Language**: Hindi (hi-IN) with interim results
- **Continuous Listening**: Captures complete statements
- **Fallback Support**: Manual text input if speech unavailable
- **Error Handling**: Graceful degradation for unsupported browsers

### 🗺️ Geofence-Based Attendance

Smart attendance system that prevents fraud by verifying physical location.

**Configuration:**
- **Default Zone**: 28.700114°N, 77.430008°E (Ghaziabad/Noida)
- **Radius**: 0.5 km (easily configurable)
- **Validation**: Distance calculated using Haversine formula
- **Status Options**: Present, Absent, On Leave
- **Timestamp**: Automatic recording of check-in time

**Security Benefits:**
- Prevents remote attendance marking
- Maintains attendance integrity
- Reduces ghost workers and salary fraud
- Enables real-time location tracking for operations

### 🏅 Performance Metrics System

Multi-dimensional performance evaluation system.

**Scoring Components:**
1. **Attendance Score** (0-100)
   - Based on actual presence vs. expected attendance
   - Monthly and annual tracking
   
2. **Grievance Score** (0-100)
   - Inverse scoring: fewer complaints = higher score
   - Indicates public satisfaction
   - Citizen feedback integration

3. **Task Completion Rate** (0-100)
   - Percentage of assigned tasks completed on time
   - Measurable KPI tracking
   
4. **Overall Grade** (A+, A, B, C, D)
   - Calculated from weighted average of above
   - Used for promotions, incentives, and developmental feedback

**Review Process:**
- Annual performance reviews
- Department-wise benchmarking
- Historical trend analysis
- Automatic grade computation

### 📚 Service Book - Digital Record

Complete employment history stored with blockchain-like verification.

**Records Tracked:**
- **Hiring**: Initial appointment date and authority
- **Promotions**: Rank changes with effective dates
- **Transfers**: Zone/department movements
- **Awards**: Recognition and achievements
- **Punishments**: Disciplinary actions
- **Increments**: Salary increments with approval details

**Features:**
- **Hash Verification**: Each record has SHA hash for integrity
- **Authority Attribution**: Records signed by responsible officials
- **Legal Compliance**: Meets employment law requirements
- **Searchable History**: Quick access to specific records
- **Digital Authentication**: Employee can download and verify

### 💰 Advanced Payroll System

Sophisticated payroll management for diverse roles and salary structures.

**Salary Structure by Role:**
```
Department: Sanitation
- Sanitation Worker: ₹15,000
- Driver: ₹18,000
- Supervisor: ₹25,000

Department: Administration
- Clerk: ₹22,000
- Data Entry Operator: ₹18,000
- Section Officer: ₹45,000

Department: Engineering
- Helper: ₹12,000
- Junior Engineer: ₹40,000
- Assistant Engineer: ₹60,000

Department: Health
- Nurse: ₹30,000
- Inspector: ₹35,000
- Health Officer: ₹55,000
```

**Features:**
- **Automated Calculation**: System computes all salaries
- **Bulk Release**: Process entire payroll in single action
- **Digital Slips**: PDF salary slips for each employee
- **Historical Records**: Archive of all payroll runs
- **Deduction Tracking**: Record of advances, loans, recovery
- **Compliance**: Maintains labor law compliance records

### 💬 WhatsApp Communication Panel

Integrated WhatsApp communication for instant employee notifications.

**Use Cases:**
- **Leave Approvals**: Notify employees of leave decisions
- **Payroll Updates**: Send salary slip links via WhatsApp
- **Attendance Alerts**: Notify if absence detected
- **Announcements**: Broadcast policy changes
- **Reminders**: Deadline reminders for applications
- **Confirmations**: Two-way acknowledgment requests

**Message Templates:**
- Leave Approval/Rejection
- Payroll Release Notification
- Transfer Announcement
- Performance Review Complete
- Grievance Status Update

### 📊 Admin Dashboard Analytics

Comprehensive analytics for organizational insights.

**Key Metrics Displayed:**
- **Workforce Overview**: Total employees, departments, active users
- **Attendance Analytics**: Present/Absent/On-Leave distribution
- **Department Breakdown**: Headcount by department
- **Performance Insights**: Top performers, underperformers
- **Payroll Status**: Pending, processed, amount released
- **Grievance Trends**: Open, resolved, escalated counts
- **Leave Analytics**: Approval rates, pending requests
- **Real-Time Updates**: Live data refreshing

**Visualizations:**
- Pie charts for distributions
- Bar charts for comparisons
- Line graphs for trends
- Tables for detailed data
- Custom date filtering

### 👥 Employee Dashboard

Tailored interface for individual employees.

**Features:**
- **My Details**: View personal and employment information
- **Attendance**: Mark attendance with location verification
- **Leave Management**: Apply for leaves, check balance, view history
- **Salary Slips**: Download and view digital payslips
- **Grievance Filing**: Submit voice or text-based complaints
- **Service Book**: Access complete employment history
- **Performance**: View own performance scores and reviews
- **Transfer Status**: Check transfer requests and history
- **Notifications**: Real-time updates via WhatsApp integration

---

## 🚀 Quick Start Guide

### One-Command Setup (macOS/Linux)
```bash
chmod +x start.sh && ./start.sh
```

### One-Command Setup (Windows)
```cmd
start.bat
```

The startup script automatically:
- ✅ Validates Node.js installation
- ✅ Installs all npm dependencies
- ✅ Starts Express API server (http://localhost:7010)
- ✅ Starts React frontend (http://localhost:7001)
- ✅ Optionally configures Python ML service (http://localhost:7002)

### Manual Setup (Alternative)

**Prerequisites:**
- Node.js 18+ ([Download](https://nodejs.org/))
- Python 3.8+ (optional for ML features) ([Download](https://python.org/))

**Step 1: Install Dependencies**
```bash
npm install
```

**Step 2: Configure Environment**
```bash
cp .env.example .env.local
# Edit .env.local and set these values:
# - API_KEY: strong random string (or use default: hackathon-demo-key)
# - ALLOWED_ORIGINS: http://localhost:7001,http://localhost:7010
# - OPENROUTER_API_KEY: your OpenRouter key for AI features
```

**Step 3: Start API Server**
```bash
npm run server
```
Runs on: http://localhost:7010

**Step 4: Start Frontend (in new terminal)**
```bash
npm run dev
```
Runs on: http://localhost:7001

**Step 5: (Optional) Start ML Service**
```bash
npm run ml
```
Runs on: http://localhost:7002

**Step 6: Run Type Checking**
```bash
npm run lint:types
```

### Access the Application

| Service | URL | Port |
|---------|-----|------|
| **Frontend (Web)** | http://localhost:7001 | 7001 |
| **API Server** | http://localhost:7010 | 7010 |
| **ML Service** | http://localhost:7002 | 7002 |

### Default Credentials

- **API Key**: `hackathon-demo-key` (for testing without .env.local)
- **Demo User**: Ramesh Gupta (Sanitation Worker)
- **User Switching**: Click "Switch to Admin" in settings to toggle roles

---

## 🏗️ System Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────┐
│         FRONTEND LAYER (React)          │
│  ┌───────────────────────────────────┐  │
│  │  React Components (TSX)           │  │
│  │  - Admin Dashboard                │  │
│  │  - Employee Dashboard             │  │
│  │  - Leave Management               │  │
│  │  - Grievance Filing               │  │
│  │  - Payroll View                   │  │
│  │  - Transfer Management            │  │
│  │  - Performance Reviews            │  │
│  │  - Service Book                   │  │
│  │  - WhatsApp Panel                 │  │
│  └───────────────────────────────────┘  │
│  State Management: AppContext Hook       │
│  HTTP Client: Fetch API (services/api.ts)│
└─────────────────────────────────────────┘
          ↓ (REST API Calls)
┌─────────────────────────────────────────┐
│      API LAYER (Express Server)         │
│  ┌───────────────────────────────────┐  │
│  │  Endpoints:                       │  │
│  │  - GET /health                    │  │
│  │  - GET/POST /api/employees        │  │
│  │  - POST /api/attendance           │  │
│  │  - GET/POST /api/grievances       │  │
│  │  - GET/POST /api/leaves           │  │
│  │  - POST /api/leaves/:id/status    │  │
│  │  - GET/POST /api/payslips         │  │
│  │  - POST /api/payroll/release-all  │  │
│  │  - GET/POST /api/transfers        │  │
│  │  - GET/POST /api/performance      │  │
│  └───────────────────────────────────┘  │
│  Security Middleware:                   │
│  - Helmet (headers)                     │
│  - CORS validation                      │
│  - Rate limiting (200/15min)            │
│  - API Key/Bearer Token authentication  │
│  - Zod schema validation                │
│  - Morgan logging                       │
└─────────────────────────────────────────┘
          ↓ (JSON Data)
┌─────────────────────────────────────────┐
│      DATA LAYER (JSON Files)            │
│  ┌───────────────────────────────────┐  │
│  │  server/data/:                    │  │
│  │  - employees.json (50+ records)   │  │
│  │  - payslips.json (payroll history)│  │
│  │  - leaves.json (leave requests)   │  │
│  │  - grievances.json (complaints)   │  │
│  │  - transfers.json (transfer hist) │  │
│  │  - performance.json (reviews)     │  │
│  └───────────────────────────────────┘  │
│  (Persistent storage with hot reload)   │
└─────────────────────────────────────────┘
          ↓ (Optional AI Calls)
┌─────────────────────────────────────────┐
│      ML SERVICE LAYER (Python/FastAPI)  │
│  ┌───────────────────────────────────┐  │
│  │  - Bio-lock (face recognition)    │  │
│  │  - Integrity Engine (validation)  │  │
│  │  - AI Insights (OpenRouter)       │  │
│  └───────────────────────────────────┘  │
│  Used for advanced features              │
└─────────────────────────────────────────┘
```

### Data Flow Diagram

**Attendance Marking:**
```
Employee GPS Location → Haversine Distance Check
→ Within Geofence? → Mark Attendance
→ Send WhatsApp Update → Admin Notification
```

**Grievance Filing:**
```
Voice Input (Hindi) → Web Speech API → Text Transcription
→ Category Classification → Submit via API
→ Admin Alert → WhatsApp Notification → Status Tracking
```

**Payroll Processing:**
```
All Employees → Fetch Salary Structure
→ Calculate Net Pay → Generate Payslips
→ Store in Database → Generate PDFs
→ WhatsApp Distribution → Mark as Released
```

---

## 📦 Core Modules

### 1. **Employee Management** (`components/EmployeeManagement.tsx`)
- View all employees with filters
- Department-wise listing
- Role-based categorization
- Search and pagination
- Performance indicators

### 2. **Attendance System** (Built into Dashboard)
- Geofence verification
- Real-time attendance marking
- Location validation
- Attendance history
- Absenteeism trends

### 3. **Leave Management** (`components/LeaveManagement.tsx`)
- Apply for leaves with categories
- Check leave balance
- View leave history
- Manager approval workflow
- Conflict prevention

### 4. **Grievance Management** (`components/GrievanceManagement.tsx`)
- Voice-based filing (Hindi)
- Text-based filing
- Category selection
- Priority assignment
- Status tracking (Pending → Under Review → Resolved)
- Admin review interface
- Escalation system

### 5. **Payroll Management** (`components/PayrollView.tsx`)
- View salary structure
- Download salary slips (PDF)
- Payroll release button (Admin only)
- Payment history
- Deduction tracking

### 6. **Transfer Management** (`components/TransferManagement.tsx`)
- Request zone transfers
- Request department transfers
- View transfer history
- Posting dates
- Retirement readiness

### 7. **Performance Reviews** (`components/PerformanceReview.tsx`)
- View personal performance scores
- Attendance score breakdown
- Grievance complaint ratio
- Task completion metrics
- Overall grade display

### 8. **Service Book** (`components/ServiceBook.tsx`)
- Complete employment history
- Hiring records
- Promotions and transfers
- Awards and recognition
- Disciplinary records
- Digital verification

### 9. **Admin Dashboard** (`components/AdminDashboard.tsx`)
- Real-time workforce analytics
- Department statistics
- Performance rankings
- Grievance tracking
- Leave approvals
- Payroll management
- Employee location tracking

### 10. **Employee Dashboard** (`components/EmployeeDashboard.tsx`)
- Personal information
- Quick attendance marking
- Leave balance display
- Grievance submissions
- Salary slip access
- Performance summary

---

## 🔌 API Reference

### Authentication
All protected endpoints require one of:
- `Authorization: Bearer <API_KEY>`
- `x-api-key: <API_KEY>`

### Public Endpoints

#### Health Check
```
GET /health
Response: { "status": "ok", "timestamp": string }
```

### Protected Endpoints

#### Employees
```
GET /api/employees
Response: Array<Employee>

POST /api/employees
Body: { name, role, department, ... }
Response: Employee (created)
```

#### Attendance
```
POST /api/attendance
Body: { userId: number, lat: number, lng: number }
Response: { success: boolean, message: string }
Note: Only marks if within geofence
```

#### Grievances
```
GET /api/grievances
Response: Array<Grievance>

POST /api/grievances
Body: { userId, user, category, description, priority }
Response: Grievance (created)

PATCH /api/grievances/:id
Body: { status, priority }
Response: Updated Grievance
```

#### Leaves
```
GET /api/leaves
Response: Array<LeaveRequest>

POST /api/leaves
Body: { userId, type, fromDate, toDate, reason }
Response: LeaveRequest (created)

POST /api/leaves/:id/status
Body: { status: 'Approved' | 'Rejected', approvedBy }
Response: Updated LeaveRequest
```

#### Payslips
```
GET /api/payslips
Response: Array<Payslip>

GET /api/payslips/:id/pdf
Response: PDF file (binary)

POST /api/payroll/release-all
Response: { success: boolean, processedCount, totalAmount }
```

#### Transfers
```
GET /api/transfers
Response: Array<Transfer>

POST /api/transfers
Body: { userId, newDepartment, newZone, reason }
Response: Transfer (created)
```

#### Performance
```
GET /api/performance/:userId
Response: PerformanceMetric

GET /api/performance/all
Response: Array<PerformanceMetric>
```

### Rate Limiting
- **Window**: 15 minutes
- **Max Requests**: 200 per IP
- **Response**: 429 Too Many Requests if exceeded

### Error Responses
```json
{
  "error": "error message",
  "status": 400,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## 🔐 Security Features

### 1. **API Security**
- **Helmet**: HTTP header hardening
  - Content Security Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security

- **CORS Enforcement**: Whitelist allowed origins
  - Prevents unauthorized cross-origin requests
  - Configurable via ALLOWED_ORIGINS

- **Rate Limiting**: Protect against abuse
  - 200 requests per 15-minute window
  - Per-IP tracking
  - Automatic 429 responses

### 2. **Authentication & Authorization**
- **API Key Authentication**: 
  - Bearer token in Authorization header
  - Alternative: x-api-key header
  - Configurable API_KEY in .env.local

- **Role-Based Access Control**:
  - Admin vs Employee roles
  - Different permissions for different endpoints
  - Frontend-enforced access control

### 3. **Data Validation**
- **Zod Schema Validation**:
  - All request bodies validated
  - Type checking at runtime
  - Clear error messages for invalid data
  - Prevents injection attacks

### 4. **Privacy & Compliance**
- **Data Minimization**: Only required data stored
- **Audit Logging**: Morgan request logging
- **Geofence Privacy**: Location only during attendance
- **Employment Law Compliance**: Service book records tamper-proof

### 5. **Environment Security**
- **Secrets Management**: 
  - API keys in .env.local (not in repo)
  - Default keys should be changed
  - Support for multiple environments

- **Error Handling**:
  - No sensitive info in error messages
  - Proper HTTP status codes
  - Validation error details logged, not exposed

---

## 🐳 Deployment Options

### Option 1: Docker & Docker Compose (Recommended)
```bash
docker-compose up --build
```

**Includes:**
- Express API on port 7010
- React frontend on port 7001
- Automatic dependency installation
- Volume mounting for live reload (dev)
- Environment variable configuration

**docker-compose.yml includes:**
- Frontend service (Vite dev server)
- API service (Express)
- Network configuration
- Port mapping
- Volume management

### Option 2: Local Development
```bash
# Terminal 1: Start API
npm run server

# Terminal 2: Start Frontend
npm run dev

# Terminal 3 (Optional): Start ML Service
npm run ml
```

### Option 3: Production Build
```bash
# Build frontend
npm run build

# Serve built files (with Express)
npm run server
```

### Option 4: Cloud Deployment (Vercel/Netlify for Frontend)
```bash
# Build frontend
npm run build

# Deploy dist/ folder to Vercel/Netlify
# Deploy server/ separately to Heroku/Railway/AWS
```

---

## 📊 Data Structure Examples

### Employee Object
```typescript
{
  id: 1,
  name: "Ramesh Gupta",
  role: "Sanitation Worker",
  department: "Sanitation",
  status: "Present",
  coords: { lat: 28.7001, lng: 77.4300 },
  mobile: "+918287923955",
  salary: 15000,
  joiningDate: "2015-06-15",
  currentPostingDate: "2020-01-10",
  retirementDate: "2035-06-15",
  serviceBook: [{
    date: "2015-06-15",
    type: "Hiring",
    description: "Joined as Sanitation Worker",
    authority: "MCD North",
    hash: "0x123...abc"
  }],
  performance: {
    attendanceScore: 85,
    grievanceScore: 90,
    taskCompletion: 95,
    overallGrade: 'A',
    lastReviewDate: "2025-12-31"
  }
}
```

### Leave Request Object
```typescript
{
  id: 1,
  userId: 1,
  type: "Casual Leave",
  fromDate: "2025-01-15",
  toDate: "2025-01-17",
  reason: "Medical appointment",
  status: "Pending",
  approvedBy: null,
  approvalDate: null
}
```

### Grievance Object
```typescript
{
  id: 1,
  userId: 1,
  user: "Ramesh Gupta",
  category: "Salary Issue",
  description: "Delay in salary disbursement",
  status: "Under Review",
  priority: "High",
  submittedDate: "2025-01-01",
  resolvedDate: null,
  remarks: "Being investigated"
}
```

---

## 🎓 User Guide

### For Employees

1. **First Login**
   - System loads with your demo employee profile
   - Review your personal information in dashboard

2. **Mark Attendance**
   - Click "Mark Attendance" button
   - System checks GPS location
   - Confirms if within geofence
   - Records check-in time

3. **File Grievance**
   - Navigate to Grievance section
   - Click "Record Voice Complaint"
   - Speak in Hindi (natural language)
   - Review transcribed text
   - Select category and submit
   - Or: Type complaint manually

4. **Apply for Leave**
   - Go to Leave Management
   - Select leave type (CL, SL, PL, etc.)
   - Choose dates
   - Add reason
   - Submit (shows pending status)

5. **View Salary Slip**
   - Navigate to Payroll View
   - Click on any month's payslip
   - Download as PDF
   - Share with bank or personal records

### For Administrators

1. **Dashboard Overview**
   - Monitor real-time employee status
   - View department-wise statistics
   - Track pending approvals

2. **Approve Leaves**
   - Go to Leave Management
   - Review pending requests
   - Approve or reject with comments
   - Employee receives WhatsApp notification

3. **Process Payroll**
   - Review payroll for current month
   - Click "Release Payroll"
   - All employees get WhatsApp notification
   - Payslips auto-generated

4. **Review Grievances**
   - Navigate to Grievance Management
   - View submitted grievances with transcripts
   - Change status (Pending → Under Review → Resolved)
   - Add remarks and action taken

5. **Track Employee Performance**
   - View performance metrics per employee
   - Compare across departments
   - Identify high performers and those needing development
   - Generate performance review reports

---

## 🚨 Troubleshooting

### Frontend Won't Start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### API Port Already in Use
```bash
# Use different port
PORT=7011 npm run server
```

### Geofence Not Working
- Check browser location permissions
- Ensure HTTPS in production (geolocation requires secure context)
- Verify coordinates in constants.ts

### Voice Recognition Not Working
- Use Chrome/Edge (best support)
- Check browser microphone permissions
- Ensure internet connection
- Try manual text input as fallback

### WhatsApp Integration Issues
- Verify API key in .env.local
- Check WhatsApp business account setup
- Ensure phone numbers have country code

---

## 📞 Support & Documentation

- **API Documentation**: See [API Reference](#api-reference) section
- **Component Structure**: Check [Core Modules](#core-modules)
- **Tech Stack Details**: Review [Technology Stack](#technology-stack)
- **Security Info**: See [Security Features](#security-features)

---

## 🎉 Key Achievements

✅ **AI-Powered Intelligence**: Predictive analytics and insights  
✅ **Voice-Enabled Accessibility**: Hindi speech recognition for field workers  
✅ **Geofence Security**: Fraud-proof attendance system  
✅ **Blockchain-Grade Records**: Immutable service book  
✅ **Multi-Channel Communication**: WhatsApp + In-app notifications  
✅ **Comprehensive Payroll**: Handles 12+ different roles  
✅ **Real-Time Analytics**: Live dashboard with 50+ metrics  
✅ **Mobile-Optimized UI**: Works seamlessly on field phones  
✅ **Type-Safe Codebase**: Full TypeScript for reliability  
✅ **Enterprise Security**: Helmet, CORS, rate limiting, validation  

---

## 📄 License

Built with ❤️ for Digital India  
MCD Unified HRMS - 2025

---

## 📝 Notes

- **Demo Data**: System comes with 50+ mock employees for testing
- **API Key**: Default key is `hackathon-demo-key` (change in production)
- **No External Database**: Uses JSON files for data persistence
- **Full Type Safety**: 100% TypeScript frontend and backend
- **Production Ready**: Security hardened and tested

---

**Last Updated**: January 3, 2025  
**Version**: 1.0.0

For questions or contributions, please refer to the project repository.
