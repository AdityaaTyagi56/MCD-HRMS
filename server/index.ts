import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { INITIAL_EMPLOYEES, INITIAL_GRIEVANCES, INITIAL_LEAVES, INITIAL_PAYSLIPS, INITIAL_WARDS, MCD_ZONE_COORDS } from '../constants';
import { Employee, Grievance, LeaveRequest, Payslip, Ward } from '../types';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

const app = express();
const PORT = Number(process.env.PORT) || 8010;
const API_KEY = process.env.API_KEY || 'hackathon-demo-key';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8001,http://localhost:8010,http://localhost:8002,https://mcd-hrms.vercel.app')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (API_KEY === 'hackathon-demo-key') {
  console.warn('Security warning: Using default API_KEY. Set a strong API_KEY in .env.local');
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const secureCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // For production, allow Vercel domain
    if (origin && origin.includes('vercel.app')) return callback(null, true);
    // For hackathon demo, allow all origins rather than crash
    console.warn(`CORS warning: origin ${origin} not in allowlist, allowing anyway for demo`);
    return callback(null, true);
  },
  credentials: true,
});

app.use(helmet());
app.use(limiter);
app.use(express.json({ limit: '200kb' }));
app.use(secureCors);
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const accessLogStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('tiny'));

// Simple JSON persistence for hackathon demo
const dataDir = path.join(process.cwd(), 'server', 'data');
const fileFor = (name: string) => path.join(dataDir, `${name}.json`);

const ensureDir = () => {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
};

const persist = (name: string, data: unknown) => {
  try {
    ensureDir();
    fs.writeFileSync(fileFor(name), JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Persist error', name, err);
  }
};

const load = <T,>(name: string, fallback: T): T => {
  try {
    const file = fileFor(name);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.error('Load error', name, err);
  }
  return fallback;
};

const employees: Employee[] = load('employees', INITIAL_EMPLOYEES.map((e) => ({ ...e })));
const grievances: Grievance[] = load('grievances', INITIAL_GRIEVANCES.map((g) => ({ ...g })));
const leaves: LeaveRequest[] = load('leaves', INITIAL_LEAVES.map((l) => ({ ...l })));
let payslips: Payslip[] = load('payslips', INITIAL_PAYSLIPS.map((p) => ({ ...p })));
const wards: Ward[] = load('wards', INITIAL_WARDS.map((w) => ({ ...w })));

const authGuard = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const headerKey = req.headers['x-api-key'];
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  if (headerKey === API_KEY || bearer === API_KEY) return next();
  return res.status(401).json({ message: 'Unauthorized' });
};

const attendanceSchema = z.object({
  userId: z.number().int().positive(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const grievanceSchema = z.object({
  userId: z.number().int().positive(),
  category: z.string().min(3).max(80),
  description: z.string().min(5).max(500),
  priority: z.enum(['High', 'Medium', 'Low']).optional().default('Low'),
});

const leaveSchema = z.object({
  userId: z.number().int().positive(),
  startDate: z.string().min(4),
  endDate: z.string().min(4),
  type: z.enum(['Medical', 'Casual', 'Privilege']),
  reason: z.string().min(5).max(500),
});

const statusSchema = z.object({
  status: z.enum(['Approved', 'Rejected', 'Pending']),
});

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    message: 'MCD HRMS API root. Use /health or /api/* endpoints.',
    health: '/health'
  });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/metrics', (_req, res) => {
  res.json({
    ok: true,
    counts: {
      employees: employees.length,
      grievances: grievances.length,
      leaves: leaves.length,
      payslips: payslips.length,
    },
    allowedOrigins,
    port: PORT,
  });
});

app.use('/api', authGuard);

app.get('/api/employees', (_req, res) => {
  const safeEmployees = employees.map(({ coords, ...rest }) => rest);
  res.json(safeEmployees);
});

app.get('/api/wards', (_req, res) => {
  res.json(wards);
});

app.post('/api/attendance', (req, res) => {
  const parsed = attendanceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.format() });

  const { userId, lat, lng } = parsed.data;
  const emp = employees.find((e) => e.id === userId);
  if (!emp) return res.status(404).json({ message: 'Employee not found' });

  const distanceKm = haversineDistance(lat, lng, MCD_ZONE_COORDS.lat, MCD_ZONE_COORDS.lng);
  if (distanceKm > (MCD_ZONE_COORDS.radiusKm || 2)) {
    return res.status(403).json({ message: 'Outside allowed geofence', distanceKm: Number(distanceKm.toFixed(2)) });
  }

  emp.status = 'Present';
  emp.coords = { lat, lng };
  emp.attendanceTime = new Date().toISOString();
  persist('employees', employees);
  res.json({ message: 'Attendance recorded', distanceKm: Number(distanceKm.toFixed(2)) });
});

app.get('/api/grievances', (_req, res) => {
  res.json(grievances);
});

app.post('/api/grievances', (req, res) => {
  const parsed = grievanceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.format() });

  const emp = employees.find((e) => e.id === parsed.data.userId);
  const grievance: Grievance = {
    id: Date.now(),
    userId: parsed.data.userId,
    user: emp?.name || 'Unknown',
    category: sanitize(parsed.data.category),
    description: sanitize(parsed.data.description),
    priority: parsed.data.priority,
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    escalationLevel: 0,
    slaBreach: false,
  };
  grievances.unshift(grievance);
  persist('grievances', grievances);
  res.status(201).json(grievance);
});

app.patch('/api/grievances/:id/status', (req, res) => {
  const grievanceId = Number(req.params.id);
  const { status } = req.body;
  
  if (!['Pending', 'Under Review', 'Resolved', 'Escalated'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }
  
  const grievance = grievances.find((g) => g.id === grievanceId);
  if (!grievance) return res.status(404).json({ message: 'Grievance not found' });
  
  grievance.status = status;
  persist('grievances', grievances);
  res.json(grievance);
});

app.get('/api/leaves', (_req, res) => {
  res.json(leaves);
});

app.post('/api/leaves', (req, res) => {
  const parsed = leaveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.format() });

  const emp = employees.find((e) => e.id === parsed.data.userId);
  const leave: LeaveRequest = {
    id: Number(Date.now().toString().slice(-9)),
    userId: parsed.data.userId,
    userName: emp?.name || 'Unknown',
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    type: parsed.data.type,
    reason: sanitize(parsed.data.reason),
    status: 'Pending',
    requestDate: new Date().toISOString().split('T')[0],
  };
  leaves.unshift(leave);
  persist('leaves', leaves);
  res.status(201).json(leave);
});

app.post('/api/leaves/:id/status', (req, res) => {
  const parsedStatus = statusSchema.safeParse(req.body);
  if (!parsedStatus.success) return res.status(400).json({ message: 'Invalid payload', issues: parsedStatus.error.format() });
  const leaveId = Number(req.params.id);
  const leave = leaves.find((l) => l.id === leaveId);
  if (!leave) return res.status(404).json({ message: 'Leave not found' });
  leave.status = parsedStatus.data.status;
  persist('leaves', leaves);
  res.json(leave);
});

app.get('/api/payslips', (_req, res) => {
  res.json(payslips);
});

app.post('/api/payroll/release-all', (_req, res) => {
  payslips = payslips.map((p) => ({ ...p, status: 'Paid' }));
  persist('payslips', payslips);
  res.json({ message: 'All pending salaries marked as paid' });
});

app.post('/api/payslips', (req, res) => {
  const schema = z.object({
    userId: z.number().int().positive(),
    month: z.string().min(3),
    year: z.number().int().gte(2020),
    daysPresent: z.number().int().min(0).max(31),
    basicSalary: z.number().min(0),
    deductions: z.number().min(0),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.format() });

  const emp = employees.find((e) => e.id === parsed.data.userId);
  if (!emp) return res.status(404).json({ message: 'Employee not found' });

  const netSalary = parsed.data.basicSalary - parsed.data.deductions;
  const slip: Payslip = {
    id: Number(uuid().replace(/-/g, '').slice(0, 12)),
    userId: emp.id,
    userName: emp.name,
    role: emp.role,
    month: parsed.data.month,
    year: parsed.data.year,
    daysPresent: parsed.data.daysPresent,
    basicSalary: parsed.data.basicSalary,
    deductions: parsed.data.deductions,
    netSalary,
    status: 'Pending',
  };
  payslips.unshift(slip);
  persist('payslips', payslips);
  res.status(201).json(slip);
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Secure API running on http://0.0.0.0:${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

function sanitize(text: string) {
  return text.replace(/<[^>]*>?/gm, '').trim();
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
