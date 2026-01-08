# Database Migration Guide

## From JSON Files to PostgreSQL

This guide provides step-by-step instructions for migrating from file-based JSON storage to PostgreSQL database.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Schema Design](#schema-design)
4. [Migration Script](#migration-script)
5. [Code Changes](#code-changes)
6. [Testing](#testing)

## Prerequisites

- PostgreSQL 14+ installed
- Node.js 20+
- `pg` npm package

```bash
npm install pg @types/pg
```

## Database Setup

### 1. Create Database

```sql
-- Create database
CREATE DATABASE mcd_hrms;

-- Connect to database
\c mcd_hrms

-- Create user (optional)
CREATE USER mcd_admin WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE mcd_hrms TO mcd_admin;
```

### 2. Environment Variables

Add to `.env` or `.env.local`:

```env
DATABASE_URL=postgresql://mcd_admin:your_secure_password@localhost:5432/mcd_hrms

# Or connection details separately
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mcd_hrms
DB_USER=mcd_admin
DB_PASSWORD=your_secure_password
```

## Schema Design

### Tables

```sql
-- Employees Table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL CHECK (department IN ('Sanitation', 'Administration', 'Engineering', 'Health')),
    status VARCHAR(20) NOT NULL DEFAULT 'Absent' CHECK (status IN ('Present', 'Absent', 'On Leave')),
    mobile VARCHAR(15),
    salary DECIMAL(10, 2),
    joining_date DATE NOT NULL,
    current_posting_date DATE NOT NULL,
    retirement_date DATE NOT NULL,
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    attendance_time VARCHAR(20),
    photo_url TEXT,
    aadhaar VARCHAR(12),
    pan VARCHAR(10),
    uan VARCHAR(20),
    esi_number VARCHAR(20),
    bank_account VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Metrics Table
CREATE TABLE performance_metrics (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    attendance_score INTEGER CHECK (attendance_score >= 0 AND attendance_score <= 100),
    grievance_score INTEGER CHECK (grievance_score >= 0 AND grievance_score <= 100),
    task_completion INTEGER CHECK (task_completion >= 0 AND task_completion <= 100),
    overall_grade VARCHAR(5) CHECK (overall_grade IN ('A+', 'A', 'B', 'C', 'D')),
    last_review_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id)
);

-- Service Records Table
CREATE TABLE service_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('Hiring', 'Promotion', 'Transfer', 'Award', 'Punishment', 'Increment')),
    description TEXT NOT NULL,
    authority VARCHAR(255) NOT NULL,
    hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grievances Table
CREATE TABLE grievances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES employees(id),
    user_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Under Review', 'Resolved', 'Escalated')),
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
    submitted_date DATE NOT NULL,
    submitted_at TIMESTAMP NOT NULL,
    escalation_level INTEGER DEFAULT 0 CHECK (escalation_level IN (0, 1, 2)),
    sla_breach BOOLEAN DEFAULT FALSE,
    source VARCHAR(20) CHECK (source IN ('web', 'whatsapp', 'voice', 'ivr')),
    phone_number VARCHAR(15),
    audio_url TEXT,
    transcript TEXT,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Requests Table
CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES employees(id),
    user_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('Medical', 'Casual', 'Privilege')),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    request_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payslips Table
CREATE TABLE payslips (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES employees(id),
    user_name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    month VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL,
    basic_salary DECIMAL(10, 2) NOT NULL,
    deductions DECIMAL(10, 2) DEFAULT 0,
    net_salary DECIMAL(10, 2) NOT NULL,
    days_present INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Paid', 'Pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Logs Table
CREATE TABLE attendance_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES employees(id),
    attendance_date DATE NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Present',
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, attendance_date)
);

-- Wards Table
CREATE TABLE wards (
    id SERIAL PRIMARY KEY,
    zone VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    population INTEGER,
    risk_level VARCHAR(20) CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_grievances_status ON grievances(status);
CREATE INDEX idx_grievances_user_id ON grievances(user_id);
CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_payslips_user_id ON payslips(user_id);
CREATE INDEX idx_payslips_year_month ON payslips(year, month);
CREATE INDEX idx_attendance_logs_user_date ON attendance_logs(user_id, attendance_date);

-- Create Updated At Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_performance_metrics_updated_at BEFORE UPDATE ON performance_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grievances_updated_at BEFORE UPDATE ON grievances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payslips_updated_at BEFORE UPDATE ON payslips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wards_updated_at BEFORE UPDATE ON wards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Migration Script

Create a migration script at `scripts/migrate-to-postgres.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Read JSON files
    const dataDir = path.join(process.cwd(), 'server', 'data');
    const employees = JSON.parse(fs.readFileSync(path.join(dataDir, 'employees.json'), 'utf-8'));
    const grievances = JSON.parse(fs.readFileSync(path.join(dataDir, 'grievances.json'), 'utf-8'));
    const leaves = JSON.parse(fs.readFileSync(path.join(dataDir, 'leaves.json'), 'utf-8'));
    const payslips = JSON.parse(fs.readFileSync(path.join(dataDir, 'payslips.json'), 'utf-8'));
    
    // Migrate Employees
    console.log('Migrating employees...');
    for (const emp of employees) {
      const empResult = await client.query(
        `INSERT INTO employees (id, name, role, department, status, mobile, salary, 
          joining_date, current_posting_date, retirement_date, lat, lng, attendance_time, photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, status = EXCLUDED.status, lat = EXCLUDED.lat, lng = EXCLUDED.lng
         RETURNING id`,
        [emp.id, emp.name, emp.role, emp.department, emp.status, emp.mobile, emp.salary,
         emp.joiningDate, emp.currentPostingDate, emp.retirementDate,
         emp.coords?.lat, emp.coords?.lng, emp.attendanceTime, emp.photoUrl]
      );
      
      // Migrate Performance Metrics
      if (emp.performance) {
        await client.query(
          `INSERT INTO performance_metrics (employee_id, attendance_score, grievance_score, 
            task_completion, overall_grade, last_review_date)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (employee_id) DO UPDATE SET
           attendance_score = EXCLUDED.attendance_score,
           grievance_score = EXCLUDED.grievance_score,
           task_completion = EXCLUDED.task_completion,
           overall_grade = EXCLUDED.overall_grade`,
          [emp.id, emp.performance.attendanceScore, emp.performance.grievanceScore,
           emp.performance.taskCompletion, emp.performance.overallGrade, emp.performance.lastReviewDate]
        );
      }
      
      // Migrate Service Records
      if (emp.serviceBook && emp.serviceBook.length > 0) {
        for (const record of emp.serviceBook) {
          await client.query(
            `INSERT INTO service_records (employee_id, record_date, record_type, description, authority, hash)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING`,
            [emp.id, record.date, record.type, record.description, record.authority, record.hash]
          );
        }
      }
    }
    
    // Migrate Grievances
    console.log('Migrating grievances...');
    for (const grv of grievances) {
      await client.query(
        `INSERT INTO grievances (id, user_id, user_name, category, description, status, priority,
          submitted_date, submitted_at, escalation_level, sla_breach, source, phone_number, 
          audio_url, transcript, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
        [grv.id, grv.userId, grv.user, grv.category, grv.description, grv.status, grv.priority,
         grv.date, grv.submittedAt, grv.escalationLevel, grv.slaBreach, grv.source,
         grv.phoneNumber, grv.audioUrl, grv.transcript, grv.location]
      );
    }
    
    // Migrate Leave Requests
    console.log('Migrating leave requests...');
    for (const leave of leaves) {
      await client.query(
        `INSERT INTO leave_requests (id, user_id, user_name, start_date, end_date, 
          leave_type, reason, status, request_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
        [leave.id, leave.userId, leave.userName, leave.startDate, leave.endDate,
         leave.type, leave.reason, leave.status, leave.requestDate]
      );
    }
    
    // Migrate Payslips
    console.log('Migrating payslips...');
    for (const pay of payslips) {
      await client.query(
        `INSERT INTO payslips (id, user_id, user_name, role, month, year, basic_salary,
          deductions, net_salary, days_present, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
        [pay.id, pay.userId, pay.userName, pay.role, pay.month, pay.year, pay.basicSalary,
         pay.deductions, pay.netSalary, pay.daysPresent, pay.status]
      );
    }
    
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateData().catch(console.error);
```

## Code Changes

### 1. Create Database Connection File

`server/db.ts`:

```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
```

### 2. Update Server Index

Update `server/index.ts` to use PostgreSQL instead of JSON files.

Example for employees endpoint:

```typescript
import pool from './db';

// GET /api/employees
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, 
        json_build_object(
          'attendanceScore', pm.attendance_score,
          'grievanceScore', pm.grievance_score,
          'taskCompletion', pm.task_completion,
          'overallGrade', pm.overall_grade,
          'lastReviewDate', pm.last_review_date
        ) as performance
      FROM employees e
      LEFT JOIN performance_metrics pm ON e.id = pm.employee_id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Testing

### 1. Test Connection

```bash
npm run test:db
```

### 2. Run Migration

```bash
npm run migrate
```

### 3. Verify Data

```sql
-- Check row counts
SELECT 'employees' as table_name, COUNT(*) as count FROM employees
UNION ALL
SELECT 'grievances', COUNT(*) FROM grievances
UNION ALL
SELECT 'leave_requests', COUNT(*) FROM leave_requests
UNION ALL
SELECT 'payslips', COUNT(*) FROM payslips;
```

## Rollback Plan

Keep JSON files as backup:

```bash
# Backup current JSON files
cp -r server/data server/data.backup

# If migration fails, restore
mv server/data.backup server/data
```

## Next Steps

1. Add database connection pooling
2. Implement database transactions
3. Add query optimization
4. Set up database backups
5. Configure read replicas for scaling
6. Add database monitoring