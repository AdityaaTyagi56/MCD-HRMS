# 🏛️ MCD HRMS - Municipal Corporation of Delhi
## Unified Human Resource Management System

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-20.x-brightgreen.svg)
![Python](https://img.shields.io/badge/python-3.11-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![AI](https://img.shields.io/badge/AI-powered-purple.svg)

**A modern, AI-powered HRMS solution designed for government workforce management with advanced fraud detection, multilingual support, and real-time analytics.**

[Features](#-key-features) • [Tech Stack](#-technology-stack) • [Installation](#-installation) • [Architecture](#-architecture) • [API Reference](#-api-reference)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Services](#-services)
- [AI/ML Capabilities](#-aiml-capabilities)
- [Security Features](#-security-features)
- [API Reference](#-api-reference)
- [Screenshots](#-screenshots)

---

## 🎯 Overview

MCD HRMS is a comprehensive workforce management solution built for the Municipal Corporation of Delhi. It addresses the unique challenges of managing a large government workforce including:

- **Ghost Employee Detection** - AI-powered identification of fake employee entries
- **GPS Anti-Spoofing** - Advanced location verification to prevent attendance fraud
- **Multilingual Support** - Full Hindi/English interface for accessibility
- **Voice-Based Grievance** - NLP-powered complaint system with speech recognition
- **Real-time Analytics** - Live dashboards with actionable insights

---

## ✨ Key Features

### 👥 Employee Management
- Complete employee lifecycle management
- Department-wise organization
- Performance tracking and grading (A+ to D)
- Service book maintenance
- Transfer management

### 📍 Smart Attendance System
- **GPS-based geofencing** - Ensures employees are within work zone
- **Multi-ping verification** - Collects 4 location samples for accuracy
- **AI Anti-Spoofing Detection** - Identifies fake GPS coordinates
- **Movement pattern analysis** - Detects unnaturally static positions
- **Real-time location tracking** - Live employee location monitoring

### 🎤 Voice-Powered Grievance System
- **Speech-to-text** in Hindi and English
- **NLP categorization** - Auto-routes complaints to correct department
- **Priority detection** - AI determines urgency level
- **Sentiment analysis** - Understands employee emotions
- Categories: Payroll, Harassment, Equipment, Infrastructure, Leave/Transfer

### 💰 Payroll Management
- Automated salary processing
- PDF payslip generation
- Deduction management
- Bulk salary release
- **AI Integrity Scan** - Detects payroll anomalies

### 📅 Leave Management
- Multiple leave types (Casual, Medical, Privilege)
- Balance tracking
- Approval workflow
- Calendar integration

### 📊 Analytics Dashboard
- Real-time attendance metrics
- Department-wise distribution charts
- Performance grade distribution
- Trend analysis with historical data
- Grievance statistics

### 📱 WhatsApp Integration
- Bulk messaging to employees
- Attendance reminders
- Salary alerts
- Emergency broadcasts
- Twilio-powered delivery

### 🌐 Multilingual Support
- Complete Hindi (हिंदी) interface
- English interface
- One-click language switching
- Hindi-first design for field workers

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI Framework |
| **TypeScript** | Type-safe development |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **Recharts** | Data visualization |
| **Lucide React** | Icon library |
| **jsPDF** | PDF generation |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js 20** | Runtime environment |
| **Express.js** | Web framework |
| **TypeScript** | Type-safe backend |
| **Zod** | Schema validation |
| **Helmet** | Security headers |
| **Morgan** | HTTP logging |
| **CORS** | Cross-origin handling |

### AI/ML Service
| Technology | Purpose |
|------------|---------|
| **Python 3.11** | ML runtime |
| **FastAPI** | High-performance API |
| **OpenRouter API** | LLM access (Llama 3.2) |
| **httpx** | Async HTTP client |
| **Pydantic** | Data validation |
| **Uvicorn** | ASGI server |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **Twilio** | WhatsApp messaging |

### AI Models Used
| Model | Provider | Use Case |
|-------|----------|----------|
| **Llama 3.2 3B Instruct** | Meta (via OpenRouter) | NLP, Chat, Analysis |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Admin Portal   │  │ Employee Portal │  │  Mobile View    │ │
│  │  (React + TS)   │  │  (Hindi-first)  │  │  (Responsive)   │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                               │
│                    (Express.js + Helmet)                         │
│                      Port: 8010                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Employee    │    │   Grievance   │    │    Payroll    │
│   Service     │    │   Service     │    │    Service    │
└───────────────┘    └───────┬───────┘    └───────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ML/AI SERVICE                                │
│                   (FastAPI + Python)                             │
│                      Port: 8002                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ NLP Engine  │  │ Fraud Det.  │  │ Location Verification   │ │
│  │ (Llama 3.2) │  │ (AI-powered)│  │ (Anti-Spoofing)         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  OpenRouter │  │   Twilio    │  │   Web Speech API        │ │
│  │  (LLM API)  │  │ (WhatsApp)  │  │   (Voice Recognition)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Installation

### Prerequisites
- Node.js 20.x
- Python 3.11+
- Docker & Docker Compose (for containerized deployment)

### Option 1: Docker Deployment (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd mcd-unified-hrms

# Start all services
docker compose up --build

# Access the application
# Frontend: http://localhost:8001
# Backend API: http://localhost:8010
# ML Service: http://localhost:8002
```

### Option 2: Local Development

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd ml_service
pip install -r requirements.txt
cd ..

# Start all services
npm run start

# Or start individually:
npm run server      # Backend API (port 8010)
npm run dev         # Frontend (port 8001)
npm run ml          # ML Service (port 8002)
```

---

## 🔧 Services

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 8001 | React application (Vite dev server) |
| Backend API | 8010 | Express.js REST API |
| ML Service | 8002 | FastAPI ML/AI endpoints |

### Health Checks

```bash
# Check Backend API
curl http://localhost:8010/health

# Check ML Service
curl http://localhost:8002/health

# Check Frontend
curl http://localhost:8001
```

---

## 🤖 AI/ML Capabilities

### 1. Natural Language Processing (NLP)

The system uses **Llama 3.2 3B Instruct** via OpenRouter for intelligent text analysis:

```python
# Grievance Analysis Pipeline
POST /analyze-grievance
{
  "text": "मेरी सैलरी नहीं आई है पिछले महीने से"
}

# Response
{
  "category": "Payroll and Salary Issue",
  "priority": "High",
  "sentiment": "Frustrated",
  "summary_en": "Employee salary not received for last month"
}
```

**Features:**
- Hindi and English language support
- Automatic category detection (6 categories)
- Priority assignment (High/Medium/Low)
- Sentiment analysis
- Fallback to rule-based detection if AI unavailable

### 2. Ghost Employee Detection

AI-powered identification of potentially fraudulent employee entries:

```python
POST /integrity/ghost-detection
# Analyzes employee data for:
# - Employees with "Absent" status but on payroll
# - Duplicate/similar names
# - Same bank account across multiple employees
# - Zero or very low attendance
# - Suspicious patterns in employee IDs
```

**Output:**
- Ghost probability percentage
- List of suspicious employees with risk scores
- Detected fraud patterns
- Estimated monthly fraud amount
- Actionable recommendations

### 3. Payroll Anomaly Detection

```python
POST /integrity/payroll-scan
# Detects:
# - Unusually high salaries for junior roles
# - Mock/test data in bank accounts
# - Invalid mobile numbers
# - Duplicate entries
```

### 4. Location Anti-Spoofing System

**Multi-ping GPS verification** to prevent attendance fraud:

```python
POST /location/verify
{
  "employee_id": 1,
  "employee_name": "Ramesh Gupta",
  "office_lat": 28.6328,
  "office_lng": 77.2197,
  "office_radius_km": 0.5,
  "pings": [
    {"lat": 28.6330, "lng": 77.2195, "timestamp": "...", "accuracy": 15},
    {"lat": 28.6331, "lng": 77.2196, "timestamp": "...", "accuracy": 12},
    // ... 4 pings collected over ~6 seconds
  ]
}
```

**Spoofing Detection Indicators:**
| Indicator | Description |
|-----------|-------------|
| Static Coordinates | All pings identical (no natural GPS drift) |
| Round Numbers | Suspiciously perfect coordinates |
| Poor Accuracy | GPS accuracy > 100m |
| Impossible Movement | Teleportation between pings |
| Out of Zone | Employee not within office radius |

**Verification Statuses:**
- `VERIFIED` - Employee presence confirmed (confidence ≥ 80%)
- `PARTIALLY_VERIFIED` - Minor anomalies detected (confidence 60-79%)
- `SPOOFING_SUSPECTED` - GPS spoofing indicators found
- `VERIFICATION_FAILED` - Employee not at work location

### 5. AI Chat Assistant

Natural language interface for HR queries:

```python
POST /chat
{
  "message": "How many employees are absent today?",
  "context": {
    "totalEmployees": 150,
    "presentToday": 142,
    "departments": ["Sanitation", "Administration", "Engineering"]
  }
}
```

---

## 🔒 Security Features

### Authentication & Authorization
- API key-based authentication
- Role-based access control (Admin/Employee)
- Secure session management

### Data Protection
- Helmet.js security headers
- CORS configuration
- Input validation with Zod schemas
- SQL injection prevention

### Fraud Prevention
| Feature | Description |
|---------|-------------|
| GPS Anti-Spoofing | Multi-ping location verification |
| Ghost Detection | AI-powered fake employee identification |
| Payroll Scanning | Anomaly detection in salary data |
| Biometric Ready | Face verification endpoints available |
| Audit Logging | All actions logged with timestamps |

### Infrastructure Security
- Docker containerization
- Network isolation
- Health check monitoring
- Graceful error handling

---

## 📡 API Reference

### Base URLs
| Service | URL |
|---------|-----|
| Backend API | `http://localhost:8010` |
| ML Service | `http://localhost:8002` |
| Frontend | `http://localhost:8001` |

### Core Endpoints

#### Employee Management
```
GET    /api/employees          # List all employees
GET    /api/employees/:id      # Get employee details
POST   /api/employees          # Create employee
PUT    /api/employees/:id      # Update employee
DELETE /api/employees/:id      # Delete employee
```

#### Attendance
```
POST   /api/attendance/mark    # Mark attendance with GPS
GET    /api/attendance/today   # Today's attendance report
```

#### Grievances
```
GET    /api/grievances         # List grievances
POST   /api/grievances         # Submit grievance
PUT    /api/grievances/:id     # Update/resolve grievance
```

#### ML/AI Endpoints
```
POST   /analyze-grievance      # NLP grievance analysis
POST   /integrity/ghost-detection    # Ghost employee scan
POST   /integrity/payroll-scan       # Payroll anomaly detection
POST   /integrity/attendance-fraud   # Attendance fraud detection
POST   /location/verify              # GPS anti-spoofing verification
POST   /location/analyze-pattern     # Location pattern analysis
POST   /chat                         # AI assistant chat
GET    /health                       # Service health check
```

---

## ⚙️ Environment Variables

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_KEY` | Backend API authentication key | `hackathon-demo-key` |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI | Required for AI features |
| `PORT` | Backend server port | `8010` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` |
| `TWILIO_ACCOUNT_SID` | Twilio account for WhatsApp | - |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | - |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp sender number | - |

### Example `.env` file
```env
# API Configuration
API_KEY=hackathon-demo-key
PORT=8010
NODE_ENV=production

# AI/ML Configuration
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# WhatsApp (Optional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

---

## 📱 Screenshots

### Employee Dashboard (Hindi Interface)
- Simple, mobile-first design
- Large touch targets for field workers
- GPS-verified attendance with anti-spoofing
- Voice-based grievance submission

### Admin Dashboard
- Real-time analytics and charts
- AI-powered fraud detection
- WhatsApp bulk messaging
- Employee management

### AI Features
- Ghost employee detection results
- Location verification status
- NLP grievance categorization

---

## 🚀 Deployment

### Free Hosting Setup (Recommended)

Deploy for **FREE** using Vercel (Frontend) + Render (Backend & ML):

#### Step 1: Deploy Backend Services on Render

1. Go to [render.com](https://render.com) and sign up with GitHub
2. Click **New** → **Blueprint**
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and create both services
5. Add environment variables in each service's dashboard:
   - **mcd-hrms-api**: `API_KEY` = `hackathon-demo-key`
   - **mcd-hrms-ml**: `OPENROUTER_API_KEY` = your OpenRouter key
6. Deploy! Note down your service URLs:
   - API: `https://mcd-hrms-api.onrender.com`
   - ML: `https://mcd-hrms-ml.onrender.com`

#### Step 2: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **Add New** → **Project**
3. Import your GitHub repo
4. Add environment variables:
   ```
   VITE_API_URL=https://mcd-hrms-api.onrender.com
   VITE_ML_SERVICE_URL=https://mcd-hrms-ml.onrender.com
   VITE_API_KEY=hackathon-demo-key
   VITE_OPENROUTER_API_KEY=your-openrouter-key
   ```
5. Deploy!

#### Service URLs After Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | `https://your-project.vercel.app` |
| Backend API | Render | `https://mcd-hrms-api.onrender.com` |
| ML Service | Render | `https://mcd-hrms-ml.onrender.com` |

> **Note:** Render free tier services sleep after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

---

### Docker Deployment (Self-hosted)

```bash
# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild specific service
docker compose up --build api
```

### Production Considerations

1. **Environment Variables**: Use proper secrets management
2. **SSL/TLS**: Configure HTTPS for production
3. **Database**: Replace in-memory storage with PostgreSQL/MongoDB
4. **Scaling**: Use Docker Swarm or Kubernetes for horizontal scaling
5. **Monitoring**: Add Prometheus/Grafana for metrics

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

Built for **MCD (Municipal Corporation of Delhi)** workforce management.

---

<div align="center">

**Made with ❤️ for Digital India**

![MCD](https://img.shields.io/badge/MCD-Delhi-orange.svg)
![AI](https://img.shields.io/badge/AI-Powered-purple.svg)
![Hindi](https://img.shields.io/badge/हिंदी-Supported-green.svg)

</div>
