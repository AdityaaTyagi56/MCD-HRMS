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
  location: z.string().optional(),
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
    submittedAt: new Date().toISOString(),
    escalationLevel: 0,
    slaBreach: false,
    location: parsed.data.location || undefined,
  };
  grievances.unshift(grievance);
  persist('grievances', grievances);
  
  // Trigger webhook
  triggerWebhook('grievance.created', grievance);
  
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
  
  const oldStatus = grievance.status;
  grievance.status = status;
  persist('grievances', grievances);
  
  // Trigger webhooks based on status change
  if (status === 'Resolved' && oldStatus !== 'Resolved') {
    triggerWebhook('grievance.resolved', grievance);
  } else if (status === 'Escalated' && oldStatus !== 'Escalated') {
    triggerWebhook('grievance.escalated', grievance);
  }
  
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

// Analytics: Run trend analysis on grievances
app.post('/api/analytics/run-trends', authGuard, async (req, res) => {
  try {
    const grievanceData = grievances.map(g => ({
      category: g.category,
      status: g.status,
      priority: g.priority,
      date: g.date,
      description: g.description
    }));
    
    // Call AI service for trend analysis (if available on backend)
    const ML_API_URL = process.env.VITE_ML_SERVICE_URL || 'http://localhost:8002';
    
    try {
      const analysisRes = await fetch(`${ML_API_URL}/analytics/grievance-trends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grievances: grievanceData })
      });
      
      if (analysisRes.ok) {
        const analysis = await analysisRes.json();
        
        // Store in a simple file (or use database in production)
        persist('trend-analysis', {
          timestamp: new Date().toISOString(),
          data: analysis
        });
        
        return res.json({ success: true, analysis });
      }
    } catch (err) {
      console.error('ML trend analysis failed:', err);
    }
    
    // Fallback: basic analysis
    const pending = grievances.filter(g => g.status === 'Pending').length;
    const highPriority = grievances.filter(g => g.priority === 'High').length;
    
    const basicAnalysis = {
      total_grievances: grievances.length,
      pending_count: pending,
      high_priority_count: highPriority,
      categories: {} as Record<string, number>,
      recommendation: pending > 10 ? 'High backlog detected - consider additional staff' : 'Grievance load normal'
    };
    
    grievances.forEach(g => {
      basicAnalysis.categories[g.category] = (basicAnalysis.categories[g.category] || 0) + 1;
    });
    
    persist('trend-analysis', {
      timestamp: new Date().toISOString(),
      data: basicAnalysis
    });
    
    res.json({ success: true, analysis: basicAnalysis });
  } catch (error: any) {
    console.error('Trend analysis error:', error);
    res.status(500).json({ message: 'Analytics error', error: error.message });
  }
});

// Get latest trend analysis
app.get('/api/analytics/trends', authGuard, (_req, res) => {
  const trends = load('trend-analysis', { timestamp: null, data: null });
  res.json(trends);
});

// SLA Breach Detection & Auto-Escalation
app.post('/api/analytics/check-sla', authGuard, (req, res) => {
  try {
    const SLA_HOURS = 72; // 72 hours SLA
    const now = new Date();
    let escalated = 0;
    const breachedGrievances = [];
    
    for (const g of grievances) {
      if (g.status === 'Resolved' || g.status === 'Escalated') continue;
      
      const grievanceDate = new Date(g.date);
      const hoursDiff = (now.getTime() - grievanceDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > SLA_HOURS && !g.slaBreach) {
        g.slaBreach = true;
        
        // Auto-escalate
        if (g.escalationLevel < 2) {
          g.escalationLevel = (g.escalationLevel + 1) as 0 | 1 | 2;
          g.status = 'Escalated';
          escalated++;
        }
        
        breachedGrievances.push({
          id: g.id,
          category: g.category,
          days_old: Math.floor(hoursDiff / 24),
          escalation_level: g.escalationLevel
        });
      }
    }
    
    if (escalated > 0) {
      persist('grievances', grievances);
    }
    
    res.json({
      success: true,
      sla_breaches: breachedGrievances.length,
      auto_escalated: escalated,
      details: breachedGrievances
    });
  } catch (error: any) {
    console.error('SLA check error:', error);
    res.status(500).json({ message: 'SLA check failed', error: error.message });
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

// ============ External API Layer (Step 5) ============

// Webhook Subscription Management
interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret: string;
  createdAt: string;
  active: boolean;
}

const webhookSubscriptions: WebhookSubscription[] = load('webhooks', []);

const triggerWebhook = async (event: string, data: any) => {
  const activeSubscriptions = webhookSubscriptions.filter(sub => 
    sub.active && sub.events.includes(event)
  );
  
  for (const sub of activeSubscriptions) {
    try {
      const payload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        subscriptionId: sub.id
      };
      
      const signature = Buffer.from(
        JSON.stringify(payload) + sub.secret
      ).toString('base64');
      
      await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MCD-Signature': signature,
          'X-MCD-Event': event
        },
        body: JSON.stringify(payload)
      });
      
      metrics.webhook_deliveries_total++;
      console.log(`✅ Webhook triggered: ${event} → ${sub.url}`);
    } catch (error) {
      metrics.webhook_failures_total++;
      console.error(`❌ Webhook failed: ${sub.url}`, error);
    }
  }
};

// Create webhook subscription
app.post('/api/webhooks', authGuard, (req, res) => {
  const { url, events, secret } = req.body;
  
  if (!url || !events || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Missing url or events array' });
  }
  
  const validEvents = ['grievance.created', 'grievance.resolved', 'grievance.escalated', 'employee.attendance'];
  const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
  
  if (invalidEvents.length > 0) {
    return res.status(400).json({ error: `Invalid events: ${invalidEvents.join(', ')}`, validEvents });
  }
  
  const subscription: WebhookSubscription = {
    id: uuid(),
    url,
    events,
    secret: secret || uuid(),
    createdAt: new Date().toISOString(),
    active: true
  };
  
  webhookSubscriptions.push(subscription);
  persist('webhooks', webhookSubscriptions);
  
  res.status(201).json(subscription);
});

// List webhook subscriptions
app.get('/api/webhooks', authGuard, (_req, res) => {
  res.json(webhookSubscriptions);
});

// Delete webhook subscription
app.delete('/api/webhooks/:id', authGuard, (req, res) => {
  const { id } = req.params;
  const index = webhookSubscriptions.findIndex(sub => sub.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Subscription not found' });
  }
  
  webhookSubscriptions.splice(index, 1);
  persist('webhooks', webhookSubscriptions);
  
  res.json({ message: 'Subscription deleted' });
});

// OAuth Token Generation
interface OAuthToken {
  token: string;
  scope: string[];
  expiresAt: string;
  createdAt: string;
}

const oauthTokens: OAuthToken[] = load('oauth_tokens', []);

app.post('/api/auth/token', authGuard, (req, res) => {
  const { scope } = req.body;
  
  if (!scope || !Array.isArray(scope)) {
    return res.status(400).json({ error: 'Missing scope array' });
  }
  
  const validScopes = ['read:grievances', 'write:grievances', 'read:employees', 'read:analytics'];
  const invalidScopes = scope.filter((s: string) => !validScopes.includes(s));
  
  if (invalidScopes.length > 0) {
    return res.status(400).json({ error: `Invalid scopes: ${invalidScopes.join(', ')}`, validScopes });
  }
  
  const token: OAuthToken = {
    token: Buffer.from(uuid() + Date.now()).toString('base64'),
    scope,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    createdAt: new Date().toISOString()
  };
  
  oauthTokens.push(token);
  persist('oauth_tokens', oauthTokens);
  
  res.status(201).json(token);
});

// Validate OAuth token middleware
const validateOAuthToken = (requiredScope: string) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    
    const token = authHeader.substring(7);
    const oauthToken = oauthTokens.find(t => t.token === token);
    
    if (!oauthToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (new Date(oauthToken.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    if (!oauthToken.scope.includes(requiredScope)) {
      return res.status(403).json({ error: `Missing required scope: ${requiredScope}` });
    }
    
    next();
  };
};

// GraphQL-style Query Endpoint
app.post('/graphql', (req, res) => {
  const { query, variables } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }
  
  try {
    // Simple GraphQL-like query parser (demo implementation)
    const result: any = { data: {} };
    
    if (query.includes('grievances')) {
      const limit = variables?.limit || 10;
      const status = variables?.status;
      
      let filtered = grievances;
      if (status) {
        filtered = grievances.filter(g => g.status === status);
      }
      
      result.data.grievances = filtered.slice(0, limit).map(g => ({
        id: g.id,
        category: g.category,
        description: g.description,
        status: g.status,
        priority: g.priority,
        submittedAt: g.submittedAt || g.date
      }));
    }
    
    if (query.includes('employees')) {
      const limit = variables?.limit || 10;
      const department = variables?.department;
      
      let filtered = employees;
      if (department) {
        filtered = employees.filter(e => e.department === department);
      }
      
      result.data.employees = filtered.slice(0, limit).map(e => ({
        id: e.id,
        name: e.name,
        department: e.department,
        role: e.role,
        status: e.status
      }));
    }
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GraphQL Schema Documentation
app.get('/graphql/schema', (_req, res) => {
  const schema = {
    types: {
      Grievance: {
        id: 'number',
        category: 'string',
        description: 'string',
        status: 'string',
        priority: 'string',
        submittedAt: 'string'
      },
      Employee: {
        id: 'number',
        name: 'string',
        department: 'string',
        role: 'string',
        status: 'string'
      }
    },
    queries: {
      grievances: {
        args: { limit: 'number', status: 'string' },
        returns: '[Grievance]'
      },
      employees: {
        args: { limit: 'number', department: 'string' },
        returns: '[Employee]'
      }
    },
    examples: [
      {
        description: 'Get pending grievances',
        query: '{ grievances }',
        variables: { limit: 5, status: 'Pending' }
      },
      {
        description: 'Get employees by department',
        query: '{ employees }',
        variables: { limit: 10, department: 'Sanitation' }
      }
    ]
  };
  
  res.json(schema);
});

// ============ Security & Compliance (Step 6) ============

// Get audit trail logs
app.get('/api/audit/logs', authGuard, (req, res) => {
  const { startDate, endDate, action, user } = req.query;
  
  try {
    const auditLogs = JSON.parse(fs.readFileSync(fileFor('audit_logs') || '[]', 'utf-8'));
    
    let filtered = auditLogs;
    
    if (startDate) {
      filtered = filtered.filter((log: any) => new Date(log.timestamp) >= new Date(startDate as string));
    }
    
    if (endDate) {
      filtered = filtered.filter((log: any) => new Date(log.timestamp) <= new Date(endDate as string));
    }
    
    if (action) {
      filtered = filtered.filter((log: any) => log.action === action);
    }
    
    if (user) {
      filtered = filtered.filter((log: any) => log.user === user);
    }
    
    res.json({
      logs: filtered,
      total: filtered.length,
      filtered: filtered.length !== auditLogs.length
    });
  } catch (error) {
    res.json({ logs: [], total: 0 });
  }
});

// Download audit trail as CSV
app.get('/api/audit/download', authGuard, (req, res) => {
  try {
    const auditLogs = JSON.parse(fs.readFileSync(fileFor('audit_logs') || '[]', 'utf-8'));
    
    // Create CSV
    const csv = [
      'Timestamp,Action,User,Grievance ID,Details',
      ...auditLogs.map((log: any) => 
        `${log.timestamp},${log.action},${log.user},${log.grievanceId || 'N/A'},"${log.details || ''}"`
      )
    ].join('\n');
    
    // Log the download action
    const downloadLog = {
      action: 'audit-download',
      user: 'Admin',
      timestamp: new Date().toISOString(),
      details: `Downloaded ${auditLogs.length} audit records`
    };
    
    const existingLogs = JSON.parse(fs.readFileSync(fileFor('audit_logs') || '[]', 'utf-8'));
    existingLogs.push(downloadLog);
    fs.writeFileSync(fileFor('audit_logs'), JSON.stringify(existingLogs, null, 2));
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-trail-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate audit trail' });
  }
});

// PII Masking Middleware for Logs
const maskPII = (text: string): string => {
  let masked = text;
  
  // Mask phone numbers
  masked = masked.replace(/\b[6-9]\d{9}\b/g, '[PHONE-REDACTED]');
  
  // Mask emails
  masked = masked.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL-REDACTED]');
  
  // Mask Aadhaar
  masked = masked.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[AADHAAR-REDACTED]');
  
  // Mask PAN
  masked = masked.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, '[PAN-REDACTED]');
  
  return masked;
};

// Apply PII masking to Morgan logs
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sensitiveFields = ['mobile', 'phone', 'email', 'aadhaar', 'pan', 'account'];
    
    for (const field of sensitiveFields) {
      if (req.body[field]) {
        req.body[`_original_${field}`] = req.body[field];
        req.body[field] = maskPII(String(req.body[field]));
      }
    }
  }
  next();
});

// GDPR Data Deletion
app.delete('/api/gdpr/user/:userId', authGuard, (req, res) => {
  const { userId } = req.params;
  
  try {
    // Remove user grievances
    const userIdNum = Number(userId);
    const initialCount = grievances.length;
    const filtered = grievances.filter(g => g.userId !== userIdNum);
    
    if (filtered.length < initialCount) {
      grievances.length = 0;
      grievances.push(...filtered);
      persist('grievances', grievances);
    }
    
    // Remove user leaves
    const filteredLeaves = leaves.filter(l => l.userId !== userIdNum);
    if (filteredLeaves.length < leaves.length) {
      leaves.length = 0;
      leaves.push(...filteredLeaves);
      persist('leaves', leaves);
    }
    
    // Remove user payslips
    const filteredPayslips = payslips.filter(p => p.userId !== userIdNum);
    if (filteredPayslips.length < payslips.length) {
      payslips = filteredPayslips;
      persist('payslips', payslips);
    }
    
    // Log the deletion
    const deletionLog = {
      action: 'gdpr-deletion',
      user: 'Admin',
      userId: userIdNum,
      timestamp: new Date().toISOString(),
      details: `GDPR data deletion request processed for user ${userId}`
    };
    
    const existingLogs = JSON.parse(fs.readFileSync(fileFor('audit_logs') || '[]', 'utf-8'));
    existingLogs.push(deletionLog);
    fs.writeFileSync(fileFor('audit_logs'), JSON.stringify(existingLogs, null, 2));
    
    res.json({
      success: true,
      message: `All data for user ${userId} has been deleted`,
      deletedRecords: {
        grievances: initialCount - filtered.length,
        leaves: leaves.length - filteredLeaves.length,
        payslips: payslips.length - filteredPayslips.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Monitoring & Metrics (Step 8) ============

interface SystemMetrics {
  grievances_total: number;
  grievances_pending: number;
  grievances_resolved: number;
  sla_breaches_total: number;
  ml_service_latency_ms: number;
  ml_service_status: 'online' | 'offline' | 'degraded';
  api_requests_total: number;
  api_errors_total: number;
  webhook_deliveries_total: number;
  webhook_failures_total: number;
  uptime_seconds: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
}

let metrics: SystemMetrics = {
  grievances_total: 0,
  grievances_pending: 0,
  grievances_resolved: 0,
  sla_breaches_total: 0,
  ml_service_latency_ms: 0,
  ml_service_status: 'online',
  api_requests_total: 0,
  api_errors_total: 0,
  webhook_deliveries_total: 0,
  webhook_failures_total: 0,
  uptime_seconds: 0,
  memory_usage_mb: 0,
  cpu_usage_percent: 0
};

const startTime = Date.now();

// Middleware to track API requests
app.use((req, res, next) => {
  metrics.api_requests_total++;
  
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400) {
      metrics.api_errors_total++;
    }
    return originalSend.call(this, data);
  };
  
  next();
});

// Update metrics periodically
setInterval(() => {
  // Update grievance metrics
  metrics.grievances_total = grievances.length;
  metrics.grievances_pending = grievances.filter(g => g.status === 'Pending').length;
  metrics.grievances_resolved = grievances.filter(g => g.status === 'Resolved').length;
  metrics.sla_breaches_total = grievances.filter(g => g.slaBreach).length;
  
  // Update uptime
  metrics.uptime_seconds = Math.floor((Date.now() - startTime) / 1000);
  
  // Update memory usage
  const memUsage = process.memoryUsage();
  metrics.memory_usage_mb = Math.round(memUsage.heapUsed / 1024 / 1024);
  
  // Estimate CPU usage (simplified)
  metrics.cpu_usage_percent = Math.random() * 30 + 10; // Mock value
}, 5000);

// Prometheus-style metrics endpoint
app.get('/metrics', (req, res) => {
  const prometheusFormat = `
# HELP grievances_total Total number of grievances
# TYPE grievances_total gauge
grievances_total ${metrics.grievances_total}

# HELP grievances_pending Number of pending grievances
# TYPE grievances_pending gauge
grievances_pending ${metrics.grievances_pending}

# HELP grievances_resolved Number of resolved grievances
# TYPE grievances_resolved gauge
grievances_resolved ${metrics.grievances_resolved}

# HELP sla_breaches_total Number of SLA breaches
# TYPE sla_breaches_total counter
sla_breaches_total ${metrics.sla_breaches_total}

# HELP ml_service_latency_ms ML service response time in milliseconds
# TYPE ml_service_latency_ms gauge
ml_service_latency_ms ${metrics.ml_service_latency_ms}

# HELP api_requests_total Total API requests
# TYPE api_requests_total counter
api_requests_total ${metrics.api_requests_total}

# HELP api_errors_total Total API errors (4xx, 5xx)
# TYPE api_errors_total counter
api_errors_total ${metrics.api_errors_total}

# HELP webhook_deliveries_total Total webhook deliveries
# TYPE webhook_deliveries_total counter
webhook_deliveries_total ${metrics.webhook_deliveries_total}

# HELP webhook_failures_total Total webhook failures
# TYPE webhook_failures_total counter
webhook_failures_total ${metrics.webhook_failures_total}

# HELP uptime_seconds Server uptime in seconds
# TYPE uptime_seconds counter
uptime_seconds ${metrics.uptime_seconds}

# HELP memory_usage_mb Memory usage in megabytes
# TYPE memory_usage_mb gauge
memory_usage_mb ${metrics.memory_usage_mb}

# HELP cpu_usage_percent CPU usage percentage
# TYPE cpu_usage_percent gauge
cpu_usage_percent ${metrics.cpu_usage_percent}
`;
  
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(prometheusFormat);
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: metrics.uptime_seconds,
    services: {
      api: 'operational',
      ml_service: metrics.ml_service_status,
      database: 'operational'
    },
    metrics: {
      pending_grievances: metrics.grievances_pending,
      sla_breaches: metrics.sla_breaches_total,
      error_rate: metrics.api_requests_total > 0 
        ? ((metrics.api_errors_total / metrics.api_requests_total) * 100).toFixed(2) + '%'
        : '0%',
      memory_usage_mb: metrics.memory_usage_mb
    },
    version: '2.0.0'
  };
  
  // Check ML service health
  try {
    const ML_API_URL = process.env.VITE_ML_SERVICE_URL || 'http://localhost:8002';
    const startTime = Date.now();
    const response = await fetch(`${ML_API_URL}/health`, { signal: AbortSignal.timeout(5000) });
    metrics.ml_service_latency_ms = Date.now() - startTime;
    
    if (response.ok) {
      metrics.ml_service_status = 'online';
    } else {
      metrics.ml_service_status = 'degraded';
      health.status = 'degraded';
    }
  } catch (error) {
    metrics.ml_service_status = 'offline';
    health.services.ml_service = 'offline';
    health.status = 'degraded';
  }
  
  // Set response status based on health
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Detailed system status dashboard data
app.get('/api/monitoring/dashboard', authGuard, async (req, res) => {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentGrievances = grievances.filter(g => {
    const submittedAt = new Date(g.submittedAt || g.date);
    return submittedAt >= last24h;
  });
  
  const dashboard = {
    overview: {
      total_grievances: metrics.grievances_total,
      pending: metrics.grievances_pending,
      resolved: metrics.grievances_resolved,
      sla_breaches: metrics.sla_breaches_total,
      resolution_rate: metrics.grievances_total > 0
        ? ((metrics.grievances_resolved / metrics.grievances_total) * 100).toFixed(1) + '%'
        : '0%'
    },
    api_health: {
      total_requests: metrics.api_requests_total,
      total_errors: metrics.api_errors_total,
      error_rate: metrics.api_requests_total > 0
        ? ((metrics.api_errors_total / metrics.api_requests_total) * 100).toFixed(2) + '%'
        : '0%',
      uptime_hours: (metrics.uptime_seconds / 3600).toFixed(2)
    },
    ml_service: {
      status: metrics.ml_service_status,
      latency_ms: metrics.ml_service_latency_ms,
      performance: metrics.ml_service_latency_ms < 1000 ? 'Excellent' :
                   metrics.ml_service_latency_ms < 3000 ? 'Good' :
                   metrics.ml_service_latency_ms < 5000 ? 'Slow' : 'Critical'
    },
    webhooks: {
      total_deliveries: metrics.webhook_deliveries_total,
      failures: metrics.webhook_failures_total,
      success_rate: metrics.webhook_deliveries_total > 0
        ? (((metrics.webhook_deliveries_total - metrics.webhook_failures_total) / metrics.webhook_deliveries_total) * 100).toFixed(1) + '%'
        : '100%'
    },
    system: {
      memory_usage_mb: metrics.memory_usage_mb,
      cpu_usage_percent: metrics.cpu_usage_percent.toFixed(1) + '%',
      uptime_seconds: metrics.uptime_seconds,
      node_version: process.version
    },
    recent_activity: {
      last_24h_grievances: recentGrievances.length,
      high_priority_pending: grievances.filter(g => g.priority === 'High' && g.status === 'Pending').length,
      categories: Object.entries(
        recentGrievances.reduce((acc: Record<string, number>, g) => {
          acc[g.category] = (acc[g.category] || 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1]).slice(0, 5)
    },
    alerts: []
  };
  
  // Add alerts based on metrics
  if (metrics.sla_breaches_total > 5) {
    dashboard.alerts.push({
      severity: 'high',
      message: `${metrics.sla_breaches_total} SLA breaches detected`,
      action: 'Review and escalate pending high-priority grievances'
    });
  }
  
  if (metrics.grievances_pending > 20) {
    dashboard.alerts.push({
      severity: 'medium',
      message: `${metrics.grievances_pending} pending grievances`,
      action: 'Allocate additional resources for resolution'
    });
  }
  
  if (metrics.ml_service_status === 'offline') {
    dashboard.alerts.push({
      severity: 'high',
      message: 'ML service is offline',
      action: 'Restart ML service and check logs'
    });
  }
  
  if (metrics.api_requests_total > 0 && (metrics.api_errors_total / metrics.api_requests_total) > 0.05) {
    dashboard.alerts.push({
      severity: 'medium',
      message: `API error rate: ${((metrics.api_errors_total / metrics.api_requests_total) * 100).toFixed(1)}%`,
      action: 'Check error logs and investigate failing endpoints'
    });
  }
  
  res.json(dashboard);
});

// ============================================================================
// Government API Integration Endpoints
// ============================================================================

/**
 * Aadhaar Verification Endpoint
 * Verifies Aadhaar number using UIDAI eKYC API
 */
app.post('/api/government/aadhaar/verify', authGuard, async (req, res) => {
  try {
    const { aadhaarNumber, employeeId, consent } = req.body;

    if (!consent) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'User consent required for Aadhaar verification',
      });
    }

    // Validate Aadhaar format
    const aadhaarPattern = /^\d{12}$/;
    if (!aadhaarPattern.test(aadhaarNumber)) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Invalid Aadhaar format. Must be 12 digits.',
      });
    }

    // Check if real UIDAI API is configured
    const aadhaarApiKey = process.env.AADHAAR_API_KEY || '';
    
    if (aadhaarApiKey) {
      // Call real UIDAI eKYC API
      const uidaiResponse = await fetch('https://api.uidai.gov.in/ekyc/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aadhaarApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaar: aadhaarNumber,
          consent: 'Y',
        }),
      });

      if (!uidaiResponse.ok) {
        throw new Error('UIDAI API error');
      }

      const uidaiData = await uidaiResponse.json();
      
      // Update employee record with verified Aadhaar
      const employee = employees.find(e => e.id === employeeId);
      if (employee) {
        employee.aadhaar = aadhaarNumber;
        writeEmployees(employees);
      }

      return res.json({
        success: true,
        verified: true,
        name: uidaiData.name,
        dob: uidaiData.dob,
        gender: uidaiData.gender,
        address: uidaiData.address,
      });
    }

    // Mock verification for demo (remove in production)
    const mockData: Record<string, any> = {
      '123456789012': {
        name: 'Rajesh Kumar',
        dob: '1985-05-15',
        gender: 'Male',
        address: 'Ward 4, Karol Bagh, New Delhi - 110005',
      },
      '987654321098': {
        name: 'Priya Sharma',
        dob: '1990-08-22',
        gender: 'Female',
        address: 'Ward 2, Chandni Chowk, New Delhi - 110006',
      },
    };

    const mockResponse = mockData[aadhaarNumber];
    if (mockResponse) {
      // Update employee record
      const employee = employees.find(e => e.id === employeeId);
      if (employee) {
        employee.aadhaar = aadhaarNumber;
        writeEmployees(employees);
      }

      return res.json({
        success: true,
        verified: true,
        ...mockResponse,
        message: '✅ Verified using mock data (Configure AADHAAR_API_KEY for production)',
      });
    }

    res.status(404).json({
      success: false,
      verified: false,
      error: 'Aadhaar not found in database',
    });
  } catch (error: any) {
    console.error('Aadhaar verification error:', error);
    metrics.api_errors_total++;
    res.status(500).json({
      success: false,
      verified: false,
      error: error.message || 'Aadhaar verification failed',
    });
  }
});

/**
 * PAN Verification Endpoint
 * Verifies PAN card using Income Tax Department API
 */
app.post('/api/government/pan/verify', authGuard, async (req, res) => {
  try {
    const { panNumber, employeeId, name } = req.body;

    // Validate PAN format
    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panPattern.test(panNumber)) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Invalid PAN format. Must be in format: ABCDE1234F',
      });
    }

    // Check if real Income Tax API is configured
    const panApiKey = process.env.PAN_API_KEY || '';
    
    if (panApiKey) {
      // Call real Income Tax Department API
      const itdResponse = await fetch('https://api.incometax.gov.in/pan/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${panApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pan: panNumber,
          name: name,
        }),
      });

      if (!itdResponse.ok) {
        throw new Error('Income Tax API error');
      }

      const itdData = await itdResponse.json();
      
      // Update employee record
      const employee = employees.find(e => e.id === employeeId);
      if (employee && itdData.verified) {
        employee.pan = panNumber;
        writeEmployees(employees);
      }

      return res.json({
        success: true,
        verified: itdData.verified,
        name: itdData.name,
        panStatus: itdData.status,
      });
    }

    // Mock verification for demo
    const mockData: Record<string, any> = {
      'ABCDE1234F': { name: 'Rajesh Kumar', status: 'Active' },
      'XYZAB5678C': { name: 'Priya Sharma', status: 'Active' },
    };

    const mockResponse = mockData[panNumber];
    if (mockResponse) {
      // Simple name matching
      const nameMatch = mockResponse.name.toLowerCase().includes(name.toLowerCase()) ||
                       name.toLowerCase().includes(mockResponse.name.toLowerCase());

      // Update employee record
      if (nameMatch) {
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
          employee.pan = panNumber;
          writeEmployees(employees);
        }
      }

      return res.json({
        success: true,
        verified: nameMatch,
        name: mockResponse.name,
        panStatus: mockResponse.status,
        message: nameMatch 
          ? '✅ Verified using mock data (Configure PAN_API_KEY for production)'
          : '⚠️ PAN found but name does not match',
      });
    }

    res.status(404).json({
      success: false,
      verified: false,
      error: 'PAN not found in database',
    });
  } catch (error: any) {
    console.error('PAN verification error:', error);
    metrics.api_errors_total++;
    res.status(500).json({
      success: false,
      verified: false,
      error: error.message || 'PAN verification failed',
    });
  }
});

/**
 * EPFO Balance Endpoint
 * Fetches EPF balance using EPFO API
 */
app.post('/api/government/epfo/balance', authGuard, async (req, res) => {
  try {
    const { uan, employeeId } = req.body;

    // Validate UAN format
    const uanPattern = /^\d{12}$/;
    if (!uanPattern.test(uan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid UAN format. Must be 12 digits.',
      });
    }

    const epfoApiKey = process.env.EPFO_API_KEY || '';
    
    if (epfoApiKey) {
      // Call real EPFO API
      const epfoResponse = await fetch('https://api.epfindia.gov.in/balance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${epfoApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uan }),
      });

      if (!epfoResponse.ok) {
        throw new Error('EPFO API error');
      }

      const epfoData = await epfoResponse.json();
      
      return res.json({
        success: true,
        uan: uan,
        name: epfoData.name,
        balance: epfoData.balance,
        lastContribution: epfoData.lastContribution,
      });
    }

    // Mock data for demo
    const employee = employees.find(e => e.id === employeeId);
    res.json({
      success: true,
      uan: uan,
      name: employee?.name || 'Employee Name',
      balance: Math.floor(Math.random() * 200000) + 50000,
      lastContribution: '2025-12-31',
      message: '✅ Mock data (Configure EPFO_API_KEY for production)',
    });
  } catch (error: any) {
    console.error('EPFO balance fetch error:', error);
    metrics.api_errors_total++;
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch EPFO balance',
    });
  }
});

/**
 * ESI Details Endpoint
 * Fetches ESI information using ESIC API
 */
app.post('/api/government/esi/details', authGuard, async (req, res) => {
  try {
    const { ipNumber, employeeId } = req.body;

    if (!ipNumber || ipNumber.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IP Number format',
      });
    }

    const esiApiKey = process.env.ESI_API_KEY || '';
    
    if (esiApiKey) {
      // Call real ESIC API
      const esiResponse = await fetch('https://api.esic.nic.in/details', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${esiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ipNumber }),
      });

      if (!esiResponse.ok) {
        throw new Error('ESIC API error');
      }

      const esiData = await esiResponse.json();
      
      return res.json({
        success: true,
        ipNumber: ipNumber,
        name: esiData.name,
        dispensary: esiData.dispensary,
        validUpto: esiData.validUpto,
      });
    }

    // Mock data for demo
    const employee = employees.find(e => e.id === employeeId);
    const wards = ['Karol Bagh', 'Chandni Chowk', 'Rohini', 'Dwarka'];
    const randomWard = wards[Math.floor(Math.random() * wards.length)];
    
    res.json({
      success: true,
      ipNumber: ipNumber,
      name: employee?.name || 'Employee Name',
      dispensary: `ESI Dispensary - ${randomWard}`,
      validUpto: '2026-03-31',
      message: '✅ Mock data (Configure ESI_API_KEY for production)',
    });
  } catch (error: any) {
    console.error('ESI details fetch error:', error);
    metrics.api_errors_total++;
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch ESI details',
    });
  }
});

/**
 * DigiLocker Documents Endpoint
 * Fetches documents from DigiLocker
 */
app.post('/api/government/digilocker/documents', authGuard, async (req, res) => {
  try {
    const { employeeId } = req.body;

    const digilockerClientId = process.env.DIGILOCKER_CLIENT_ID || '';
    const digilockerClientSecret = process.env.DIGILOCKER_CLIENT_SECRET || '';
    
    if (digilockerClientId && digilockerClientSecret) {
      // Real DigiLocker OAuth flow would go here
      // This is simplified - actual implementation needs OAuth dance
      return res.json({
        success: false,
        error: 'DigiLocker requires user OAuth authorization. Please implement OAuth flow.',
      });
    }

    // Mock documents for demo
    const mockDocuments = [
      {
        docType: 'Aadhaar Card',
        docName: 'aadhaar.pdf',
        issuer: 'UIDAI',
        uri: 'digilocker://aadhaar/xxxx-xxxx-1234',
        size: 245000,
        mimeType: 'application/pdf',
      },
      {
        docType: 'PAN Card',
        docName: 'pan.pdf',
        issuer: 'Income Tax Department',
        uri: 'digilocker://pan/ABCDE1234F',
        size: 189000,
        mimeType: 'application/pdf',
      },
      {
        docType: 'Driving License',
        docName: 'dl.pdf',
        issuer: 'Transport Department, Delhi',
        uri: 'digilocker://dl/DL-0120231234567',
        size: 321000,
        mimeType: 'application/pdf',
      },
    ];

    res.json({
      success: true,
      documents: mockDocuments,
      message: '✅ Mock data (Configure DIGILOCKER credentials for production)',
    });
  } catch (error: any) {
    console.error('DigiLocker fetch error:', error);
    metrics.api_errors_total++;
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch DigiLocker documents',
    });
  }
});

/**
 * Government APIs Status Endpoint
 * Returns which government APIs are configured
 */
app.get('/api/government/status', authGuard, (req, res) => {
  res.json({
    aadhaar: {
      enabled: !!process.env.AADHAAR_API_KEY,
      mode: process.env.AADHAAR_API_KEY ? 'production' : 'mock',
    },
    pan: {
      enabled: !!process.env.PAN_API_KEY,
      mode: process.env.PAN_API_KEY ? 'production' : 'mock',
    },
    epfo: {
      enabled: !!process.env.EPFO_API_KEY,
      mode: process.env.EPFO_API_KEY ? 'production' : 'mock',
    },
    esi: {
      enabled: !!process.env.ESI_API_KEY,
      mode: process.env.ESI_API_KEY ? 'production' : 'mock',
    },
    digilocker: {
      enabled: !!(process.env.DIGILOCKER_CLIENT_ID && process.env.DIGILOCKER_CLIENT_SECRET),
      mode: (process.env.DIGILOCKER_CLIENT_ID && process.env.DIGILOCKER_CLIENT_SECRET) ? 'production' : 'mock',
    },
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error', err);
  metrics.api_errors_total++;
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
