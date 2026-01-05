# WhatsApp & Voice Webhook Setup Guide

## WhatsApp Integration (Twilio)

### 1. Configure Twilio WhatsApp Sandbox
1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Follow the instructions to join your sandbox (send a code to the Twilio number)

### 2. Set Webhook URL
In Twilio Console:
- Go to **Messaging** → **Settings** → **WhatsApp sandbox settings**
- Set **"When a message comes in"** webhook to:
  ```
  https://your-domain.com/api/whatsapp/webhook
  ```
- Method: `POST`
- Content Type: `application/x-www-form-urlencoded`

### 3. Test the Integration
Send a WhatsApp message to your Twilio sandbox number:
```
मेरा वेतन नहीं मिला
```

You should receive an auto-acknowledgement with ticket number.

### 4. WhatsApp Leave Workflow

The same inbound webhook also supports leave applications and admin decisions.

Employee (examples):
```
Leave tomorrow fever
Leave 2026-01-10 to 2026-01-12 family function
छुट्टी कल बुखार
छुट्टी 10/01/2026 - 12/01/2026 शादी
```

Admin (from the configured admin number) replies:
```
APPROVE <leaveId>
REJECT <leaveId>
```

## Voice/IVR Integration

### Webhook Endpoint
```
POST /api/voice/webhook
```

### Request Body
```json
{
  "phoneNumber": "+919876543210",
  "transcript": "Transcribed Hindi/English text",
  "audioUrl": "https://storage.example.com/audio/recording.mp3",
  "userName": "Employee Name (optional)"
}
```

### Response
```json
{
  "success": true,
  "ticketId": 1234567890,
  "category": "Payroll and Salary Issue",
  "priority": "High",
  "message": "Voice complaint registered successfully"
}
```

## How It Works

1. **Employee sends WhatsApp message or calls IVR**
2. **Webhook receives the message/transcript**
3. **System matches phone number to employee database**
4. **AI/NLP analyzes complaint** (category, priority, sentiment)
5. **Grievance is created** and stored with source tracking
6. **Auto-acknowledgement sent** via WhatsApp with ticket number
7. **Admin sees complaint** in dashboard with source badge

## Features Added

✅ **WhatsApp Intake**: Employees can submit complaints via WhatsApp  
✅ **Voice Intake**: IVR systems can POST transcribed audio  
✅ **Auto-Acknowledgement**: Instant ticket confirmation in Hindi + English  
✅ **Phone Matching**: Automatic employee identification  
✅ **Source Tracking**: Know which channel complaint came from  
✅ **AI Analysis**: Category and priority auto-detected  
✅ **Bilingual Support**: Messages in both Hindi and English

## Environment Variables

Add to `.env.local`:
```
VITE_TWILIO_ACCOUNT_SID=your_account_sid
VITE_TWILIO_AUTH_TOKEN=your_auth_token
VITE_TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
ADMIN_WHATSAPP_NUMBER=+919876543210
FRONTEND_URL=https://mcd-hrms.vercel.app
```

## Security Notes

- Webhook endpoints validate Twilio signatures (implement if in production)
- Phone numbers are sanitized and matched carefully
- Audio URLs should be authenticated/temporary
- Consider rate limiting on webhook endpoints
