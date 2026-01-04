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

type AttendanceLog = {
  userId: number;
  date: string; // YYYY-MM-DD
  timestamp: string;
  status: 'Present';
};

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
const attendanceLogs: AttendanceLog[] = load('attendance-log', []);

// Seed today's attendance log from current employee state to avoid empty charts after restart
const todaySeed = new Date().toISOString().slice(0, 10);
employees
  .filter((e) => e.status === 'Present')
  .forEach((e) => {
    const exists = attendanceLogs.find((log) => log.userId === e.id && log.date === todaySeed);
    if (!exists) {
      attendanceLogs.push({ userId: e.id, date: todaySeed, timestamp: new Date().toISOString(), status: 'Present' });
    }
  });
persist('attendance-log', attendanceLogs);

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
  const today = emp.attendanceTime.slice(0, 10);
  const existingLog = attendanceLogs.find((log) => log.userId === userId && log.date === today);
  if (existingLog) {
    existingLog.timestamp = emp.attendanceTime;
  } else {
    attendanceLogs.push({ userId, date: today, timestamp: emp.attendanceTime, status: 'Present' });
  }
  persist('employees', employees);
  persist('attendance-log', attendanceLogs);
  res.json({ message: 'Attendance recorded', distanceKm: Number(distanceKm.toFixed(2)) });
});

app.get('/api/attendance/trends', (req, res) => {
  const range = typeof req.query.range === 'string' ? req.query.range : '7d';
  const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
  const totalEmployees = employees.length || 1;

  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - (days - 1));

  const buckets: Record<string, { present: number; target: number; date: string }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    buckets[dateStr] = { present: 0, target: totalEmployees, date: label };
  }

  attendanceLogs.forEach((log) => {
    if (!buckets[log.date]) return;
    if (log.status === 'Present') {
      buckets[log.date].present += 1;
    }
  });

  const data = Object.entries(buckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, bucket]) => ({ day: bucket.date, present: bucket.present, target: bucket.target }));

  res.json(data);
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

// WhatsApp Webhook for incoming messages
app.post('/api/whatsapp/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { From, Body, MessageSid, ProfileName } = req.body;
    
    console.log('📱 WhatsApp webhook received:', { From, Body, MessageSid });
    
    // Basic validation
    if (!From || !Body) {
      return res.status(400).send('Invalid webhook payload');
    }
    
    // Extract phone number (remove whatsapp: prefix)
    const phoneNumber = From.replace('whatsapp:', '');
    
    // Try to find employee by phone number
    const employee = employees.find(e => 
      e.mobile && (e.mobile.includes(phoneNumber.slice(-10)) || phoneNumber.includes(e.mobile.slice(-10)))
    );
    
    const userId = employee?.id || 0; // 0 for unknown users
    const userName = employee?.name || ProfileName || 'Unknown User';
    
    // Analyze the complaint using NLP (if ML service available)
    let category = 'General Complaint';
    let priority: 'High' | 'Medium' | 'Low' = 'Medium';
    
    try {
      const ML_API_URL = process.env.VITE_ML_SERVICE_URL || 'http://localhost:8002';
      const analysisRes = await fetch(`${ML_API_URL}/analyze-grievance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: Body })
      });
      
      if (analysisRes.ok) {
        const analysis = await analysisRes.json();
        category = analysis.category || category;
        priority = analysis.priority || priority;
      }
    } catch (err) {
      console.error('NLP analysis failed for WhatsApp message:', err);
    }
    
    // Create grievance
    const grievance: Grievance = {
      id: Date.now(),
      userId,
      user: userName,
      category,
      description: Body,
      priority,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      escalationLevel: 0,
      slaBreach: false,
      source: 'whatsapp',
      phoneNumber,
    };
    
    grievances.unshift(grievance);
    persist('grievances', grievances);
    
    // Send acknowledgement back via WhatsApp
    const ackMessage = `✅ *शिकायत दर्ज / Complaint Registered*\n\n` +
      `Ticket #${grievance.id}\n` +
      `Category: ${category}\n` +
      `Priority: ${priority}\n\n` +
      `हम जल्द ही आपकी शिकायत पर कार्रवाई करेंगे।\n` +
      `We will address your complaint soon.\n\n` +
      `_Municipal Corporation of Delhi_`;
    
    // Respond to Twilio immediately with TwiML
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${ackMessage}</Message></Response>`);
    
    console.log('✅ Grievance created from WhatsApp:', grievance.id);
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).send('Error processing message');
  }
});

// Voice/IVR Webhook for transcribed audio complaints
app.post('/api/voice/webhook', async (req, res) => {
  try {
    const { phoneNumber, transcript, audioUrl, userName } = req.body;
    
    console.log('🎙️ Voice webhook received:', { phoneNumber, transcript });
    
    if (!phoneNumber || !transcript) {
      return res.status(400).json({ message: 'Phone number and transcript required' });
    }
    
    // Find employee
    const employee = employees.find(e => 
      e.mobile && (e.mobile.includes(phoneNumber.slice(-10)) || phoneNumber.includes(e.mobile.slice(-10)))
    );
    
    const userId = employee?.id || 0;
    const employeeName = employee?.name || userName || 'Unknown User';
    
    // Analyze complaint
    let category = 'General Complaint';
    let priority: 'High' | 'Medium' | 'Low' = 'Medium';
    
    try {
      const ML_API_URL = process.env.VITE_ML_SERVICE_URL || 'http://localhost:8002';
      const analysisRes = await fetch(`${ML_API_URL}/analyze-grievance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript })
      });
      
      if (analysisRes.ok) {
        const analysis = await analysisRes.json();
        category = analysis.category || category;
        priority = analysis.priority || priority;
      }
    } catch (err) {
      console.error('NLP analysis failed for voice message:', err);
    }
    
    // Create grievance
    const grievance: Grievance = {
      id: Date.now(),
      userId,
      user: employeeName,
      category,
      description: transcript,
      priority,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      escalationLevel: 0,
      slaBreach: false,
      source: 'voice',
      phoneNumber,
      audioUrl,
      transcript,
    };
    
    grievances.unshift(grievance);
    persist('grievances', grievances);
    
    res.status(201).json({
      success: true,
      ticketId: grievance.id,
      category,
      priority,
      message: 'Voice complaint registered successfully'
    });
    
    console.log('✅ Grievance created from voice:', grievance.id);
  } catch (error) {
    console.error('Voice webhook error:', error);
    res.status(500).json({ message: 'Error processing voice complaint' });
  }
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

app.post('/api/send-whatsapp', async (req, res) => {
  const { to, message } = req.body;
  
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || process.env.VITE_TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || process.env.VITE_TWILIO_AUTH_TOKEN;
  const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || process.env.VITE_TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return res.status(500).json({ error: 'Twilio credentials not configured' });
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: TWILIO_WHATSAPP_NUMBER,
          To: to,
          Body: message,
        }).toString(),
      }
    );

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, messageId: data.sid });
    } else {
      return res.status(400).json({ success: false, error: data.message || 'Failed to send message' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
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
