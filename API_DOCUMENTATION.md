# MCD HRMS API Documentation

## Overview
The MCD HRMS API provides comprehensive access to the Human Resource Management System with support for webhooks, OAuth authentication, and GraphQL-style queries.

## Authentication

### API Key (Internal Use)
```
Header: x-api-key: your-api-key
```

### OAuth Token (External Integrations)
1. Request a token:
```bash
POST /api/auth/token
Headers: x-api-key: your-api-key
Body: {
  "scope": ["read:grievances", "write:grievances", "read:employees", "read:analytics"]
}

Response: {
  "token": "base64-encoded-token",
  "scope": ["read:grievances"],
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

2. Use the token:
```
Header: Authorization: Bearer your-oauth-token
```

### Available Scopes
- `read:grievances` - Read grievance data
- `write:grievances` - Create and update grievances
- `read:employees` - Read employee data
- `read:analytics` - Access analytics endpoints

## Webhook System

### Create Webhook Subscription
Subscribe to real-time events from the HRMS system.

```bash
POST /api/webhooks
Headers: x-api-key: your-api-key
Body: {
  "url": "https://your-domain.com/webhook-endpoint",
  "events": ["grievance.created", "grievance.resolved", "grievance.escalated"],
  "secret": "optional-webhook-secret"
}

Response: {
  "id": "uuid",
  "url": "https://your-domain.com/webhook-endpoint",
  "events": ["grievance.created", "grievance.resolved"],
  "secret": "generated-secret",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "active": true
}
```

### Webhook Events
- `grievance.created` - New grievance submitted
- `grievance.resolved` - Grievance marked as resolved
- `grievance.escalated` - Grievance escalated to higher level
- `employee.attendance` - Employee attendance marked

### Webhook Payload Format
```json
{
  "event": "grievance.created",
  "data": {
    "id": 12345,
    "userId": 1,
    "category": "Salary",
    "description": "Salary not received",
    "status": "Pending",
    "priority": "High",
    "submittedAt": "2024-01-01T10:00:00.000Z"
  },
  "timestamp": "2024-01-01T10:00:00.000Z",
  "subscriptionId": "webhook-uuid"
}
```

### Webhook Security
Each webhook request includes:
- `X-MCD-Signature`: Base64-encoded signature (payload + secret)
- `X-MCD-Event`: Event type

Verify signature on your server:
```javascript
const crypto = require('crypto');
const signature = Buffer.from(JSON.stringify(payload) + secret).toString('base64');
const isValid = signature === req.headers['x-mcd-signature'];
```

### List Webhooks
```bash
GET /api/webhooks
Headers: x-api-key: your-api-key

Response: [
  {
    "id": "uuid",
    "url": "https://your-domain.com/webhook",
    "events": ["grievance.created"],
    "active": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Delete Webhook
```bash
DELETE /api/webhooks/:id
Headers: x-api-key: your-api-key

Response: {
  "message": "Subscription deleted"
}
```

## GraphQL-style Query Endpoint

### Execute Query
```bash
POST /graphql
Body: {
  "query": "{ grievances }",
  "variables": {
    "limit": 10,
    "status": "Pending"
  }
}

Response: {
  "data": {
    "grievances": [
      {
        "id": 12345,
        "category": "Salary",
        "description": "...",
        "status": "Pending",
        "priority": "High",
        "submittedAt": "2024-01-01T10:00:00.000Z"
      }
    ]
  }
}
```

### Get Schema
```bash
GET /graphql/schema

Response: {
  "types": {
    "Grievance": {
      "id": "number",
      "category": "string",
      "description": "string",
      "status": "string",
      "priority": "string",
      "submittedAt": "string"
    },
    "Employee": { ... }
  },
  "queries": {
    "grievances": {
      "args": { "limit": "number", "status": "string" },
      "returns": "[Grievance]"
    }
  },
  "examples": [ ... ]
}
```

### Available Queries

#### Get Grievances
```json
{
  "query": "{ grievances }",
  "variables": {
    "limit": 10,
    "status": "Pending"
  }
}
```

#### Get Employees
```json
{
  "query": "{ employees }",
  "variables": {
    "limit": 20,
    "department": "Sanitation"
  }
}
```

## REST API Endpoints

### Grievances

#### Create Grievance
```bash
POST /api/grievances
Body: {
  "userId": 1,
  "category": "Salary",
  "description": "Issue description",
  "priority": "High",
  "location": "Ward 4"
}
```

#### Update Grievance Status
```bash
PATCH /api/grievances/:id/status
Body: {
  "status": "Resolved"
}
```
Triggers: `grievance.resolved` or `grievance.escalated` webhook

#### Get All Grievances
```bash
GET /api/grievances
```

### Analytics

#### Run Trend Analysis
```bash
POST /api/analytics/run-trends
Headers: x-api-key: your-api-key
Body: {
  "grievances": [ ... ]
}
```

#### Get Stored Trends
```bash
GET /api/analytics/trends
Headers: x-api-key: your-api-key
```

#### Check SLA Breaches
```bash
POST /api/analytics/check-sla
Headers: x-api-key: your-api-key
Body: {
  "grievances": [ ... ]
}
```

### WhatsApp Integration

#### Incoming Webhook
```bash
POST /api/whatsapp/webhook
Content-Type: application/x-www-form-urlencoded
Body: From=whatsapp:+919876543210&Body=Complaint text
```
Auto-creates grievance with source='whatsapp'

#### Send Message
```bash
POST /api/send-whatsapp
Body: {
  "to": "whatsapp:+919876543210",
  "message": "Your complaint #12345 has been resolved"
}
```

## Rate Limiting
- 200 requests per 15 minutes per IP
- OAuth tokens valid for 30 days
- Webhook retries: 3 attempts with exponential backoff

## Error Responses
```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient scope)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Server Error

## Example Integration

### Node.js Webhook Receiver
```javascript
const express = require('express');
const app = express();

app.post('/mcd-webhook', express.json(), (req, res) => {
  const { event, data, timestamp } = req.body;
  const signature = req.headers['x-mcd-signature'];
  
  // Verify signature
  const expectedSignature = Buffer.from(
    JSON.stringify(req.body) + process.env.WEBHOOK_SECRET
  ).toString('base64');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process event
  console.log(`Received ${event}:`, data);
  
  res.sendStatus(200);
});

app.listen(3000);
```

### Python OAuth Client
```python
import requests

# Get token
response = requests.post(
    'http://localhost:8010/api/auth/token',
    headers={'x-api-key': 'your-key'},
    json={'scope': ['read:grievances']}
)
token = response.json()['token']

# Use token
response = requests.post(
    'http://localhost:8010/graphql',
    headers={'Authorization': f'Bearer {token}'},
    json={
        'query': '{ grievances }',
        'variables': {'limit': 5, 'status': 'Pending'}
    }
)
print(response.json())
```

## Support
For issues or questions, contact: support@mcd-hrms.gov.in
