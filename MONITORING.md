# MCD HRMS Monitoring & Observability Guide

## Overview
The MCD HRMS system includes comprehensive monitoring and metrics collection for production readiness. This guide covers health checks, Prometheus metrics, and system dashboards.

## Health Check Endpoints

### Server Health Check
```bash
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:00:00.000Z",
  "uptime": 86400,
  "services": {
    "api": "operational",
    "ml_service": "online",
    "database": "operational"
  },
  "metrics": {
    "pending_grievances": 15,
    "sla_breaches": 2,
    "error_rate": "0.5%",
    "memory_usage_mb": 128
  },
  "version": "2.0.0"
}
```

**Status Codes:**
- `200` - System healthy
- `503` - System degraded (ML service offline or high error rate)

### ML Service Health Check
```bash
GET http://localhost:8002/health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:00:00Z",
  "service": "MCD HRMS ML Service",
  "version": "2.0.0",
  "system": {
    "cpu_usage_percent": 15.2,
    "memory_usage_percent": 45.6,
    "memory_used_mb": 512.3,
    "python_version": "3.11.0"
  },
  "features": {
    "grievance_analysis": "operational",
    "translation": "operational",
    "categorization": "operational",
    "trend_analysis": "operational",
    "security": "operational",
    "recommendations": "operational"
  },
  "openrouter_api": "configured"
}
```

## Prometheus Metrics

### Server Metrics Endpoint
```bash
GET /metrics
Content-Type: text/plain; version=0.0.4
```

### Available Metrics

#### Grievance Metrics
```
grievances_total         - Total number of grievances (gauge)
grievances_pending       - Number of pending grievances (gauge)
grievances_resolved      - Number of resolved grievances (gauge)
sla_breaches_total       - Number of SLA breaches (counter)
```

#### API Performance
```
api_requests_total       - Total API requests (counter)
api_errors_total         - Total API errors (counter)
ml_service_latency_ms    - ML service response time (gauge)
```

#### Webhook Metrics
```
webhook_deliveries_total - Total webhook deliveries (counter)
webhook_failures_total   - Total webhook failures (counter)
```

#### System Metrics
```
uptime_seconds          - Server uptime (counter)
memory_usage_mb         - Memory usage in MB (gauge)
cpu_usage_percent       - CPU usage percentage (gauge)
```

### Prometheus Configuration
Add this job to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'mcd-hrms'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8010']
        labels:
          service: 'hrms-api'
      
  - job_name: 'mcd-ml-service'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:8002']
        labels:
          service: 'ml-service'
```

## Monitoring Dashboard

### Dashboard Endpoint
```bash
GET /api/monitoring/dashboard
Headers: x-api-key: your-api-key

Response:
{
  "overview": {
    "total_grievances": 245,
    "pending": 15,
    "resolved": 220,
    "sla_breaches": 2,
    "resolution_rate": "89.8%"
  },
  "api_health": {
    "total_requests": 15420,
    "total_errors": 12,
    "error_rate": "0.08%",
    "uptime_hours": "168.5"
  },
  "ml_service": {
    "status": "online",
    "latency_ms": 450,
    "performance": "Good"
  },
  "webhooks": {
    "total_deliveries": 89,
    "failures": 3,
    "success_rate": "96.6%"
  },
  "system": {
    "memory_usage_mb": 128,
    "cpu_usage_percent": "15.2%",
    "uptime_seconds": 606600,
    "node_version": "v20.0.0"
  },
  "recent_activity": {
    "last_24h_grievances": 12,
    "high_priority_pending": 3,
    "categories": [
      ["Salary", 5],
      ["Equipment", 4],
      ["Leave", 3]
    ]
  },
  "alerts": [
    {
      "severity": "medium",
      "message": "15 pending grievances",
      "action": "Allocate additional resources for resolution"
    }
  ]
}
```

## Alerting Rules

### Recommended Grafana Alerts

#### High SLA Breach Alert
```yaml
- alert: HighSLABreaches
  expr: sla_breaches_total > 5
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High number of SLA breaches"
    description: "{{ $value }} grievances have breached SLA"
```

#### ML Service Down
```yaml
- alert: MLServiceDown
  expr: up{job="mcd-ml-service"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "ML Service is offline"
    description: "AI-powered features unavailable"
```

#### High Error Rate
```yaml
- alert: HighErrorRate
  expr: (rate(api_errors_total[5m]) / rate(api_requests_total[5m])) > 0.05
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "API error rate above 5%"
    description: "Current error rate: {{ $value | humanizePercentage }}"
```

#### Pending Grievances Backlog
```yaml
- alert: GrievanceBacklog
  expr: grievances_pending > 20
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "High number of pending grievances"
    description: "{{ $value }} grievances pending resolution"
```

## Grafana Dashboard

### Sample Dashboard JSON
```json
{
  "dashboard": {
    "title": "MCD HRMS Monitoring",
    "panels": [
      {
        "title": "Grievances Overview",
        "type": "stat",
        "targets": [
          {
            "expr": "grievances_total",
            "legendFormat": "Total"
          },
          {
            "expr": "grievances_pending",
            "legendFormat": "Pending"
          },
          {
            "expr": "grievances_resolved",
            "legendFormat": "Resolved"
          }
        ]
      },
      {
        "title": "API Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(api_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "(rate(api_errors_total[5m]) / rate(api_requests_total[5m])) * 100",
            "legendFormat": "Error %"
          }
        ]
      },
      {
        "title": "ML Service Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "ml_service_latency_ms",
            "legendFormat": "Latency (ms)"
          }
        ]
      }
    ]
  }
}
```

## Log Aggregation

### Access Logs
Access logs are stored in `/logs/access.log` in Combined Log Format:

```
127.0.0.1 - - [01/Jan/2024:10:00:00 +0000] "POST /api/grievances HTTP/1.1" 201 156 "-" "Mozilla/5.0"
```

### Audit Logs
Audit logs track sensitive operations:

```json
{
  "action": "resolve",
  "user": "Admin",
  "grievanceId": 12345,
  "details": "Grievance resolved by admin",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

Access via:
```bash
GET /api/audit/logs?startDate=2024-01-01&action=resolve
```

Download as CSV:
```bash
GET /api/audit/download
```

## Performance Benchmarks

### Target Metrics
- API Response Time: < 200ms (p95)
- ML Service Latency: < 1000ms (p95)
- Grievance Resolution SLA: < 72 hours
- System Uptime: > 99.9%
- Error Rate: < 0.5%
- Webhook Success Rate: > 95%

### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:8010/api/grievances

# Using Artillery
artillery quick --count 100 --num 10 http://localhost:8010/health
```

## Monitoring Best Practices

### Daily Checks
1. Review `/health` endpoint
2. Check SLA breach count
3. Monitor pending grievance backlog
4. Verify ML service latency
5. Review error rate trends

### Weekly Reviews
1. Analyze grievance trends
2. Review webhook delivery success rate
3. Check system resource usage
4. Validate backup integrity
5. Review audit trail for anomalies

### Monthly Reports
1. Calculate average resolution time
2. Analyze category distribution
3. Review API usage patterns
4. Assess system scalability
5. Plan capacity upgrades

## Incident Response

### ML Service Down
1. Check `/health` endpoint
2. Restart ML service: `cd ml_service && python main.py`
3. Verify OpenRouter API key
4. Check system logs for errors
5. Enable fallback mode if needed

### High Error Rate
1. Check `/api/monitoring/dashboard`
2. Review recent API changes
3. Analyze error logs
4. Identify failing endpoints
5. Rollback if necessary

### SLA Breaches
1. Check `/api/analytics/check-sla`
2. Identify bottlenecks
3. Allocate additional resources
4. Escalate critical cases
5. Implement preventive measures

## Integration Examples

### Slack Notifications
```javascript
const axios = require('axios');

// Monitor health and send Slack alert
setInterval(async () => {
  const health = await axios.get('http://localhost:8010/health');
  
  if (health.data.status !== 'healthy') {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `⚠️ HRMS Alert: System status is ${health.data.status}`
    });
  }
}, 60000); // Check every minute
```

### PagerDuty Integration
```python
import requests

def check_health():
    response = requests.get('http://localhost:8010/health')
    data = response.json()
    
    if data['status'] != 'healthy':
        # Trigger PagerDuty incident
        requests.post('https://api.pagerduty.com/incidents', 
            headers={'Authorization': f'Token token={PAGERDUTY_KEY}'},
            json={
                'incident': {
                    'type': 'incident',
                    'title': 'MCD HRMS System Degraded',
                    'service': {'id': SERVICE_ID, 'type': 'service_reference'},
                    'urgency': 'high'
                }
            }
        )
```

## Contact
For monitoring issues: devops@mcd-hrms.gov.in
For alerts: alerts@mcd-hrms.gov.in
