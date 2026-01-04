# Government API Integration Guide

## 📋 Overview

The MCD HRMS system now integrates with **5 major Indian Government APIs** for employee verification, benefits tracking, and document management:

1. **Aadhaar Verification** (UIDAI eKYC API)
2. **PAN Verification** (Income Tax Department)
3. **EPFO Integration** (Employee Provident Fund)
4. **ESI Integration** (Employee State Insurance)
5. **DigiLocker** (Digital Document Locker)

All APIs work in **mock mode by default** for development/testing. Configure real API keys in production for live verification.

---

## 🔑 API Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Aadhaar Verification (UIDAI eKYC API)
AADHAAR_API_KEY=your-uidai-api-key

# PAN Verification (Income Tax Department)
PAN_API_KEY=your-income-tax-api-key

# EPFO (Employee Provident Fund)
EPFO_API_KEY=your-epfo-api-key

# ESI (Employee State Insurance)
ESI_API_KEY=your-esi-api-key

# DigiLocker Integration
DIGILOCKER_CLIENT_ID=your-digilocker-client-id
DIGILOCKER_CLIENT_SECRET=your-digilocker-client-secret
```

### How to Get API Keys

#### 1. Aadhaar (UIDAI eKYC)
- **Website:** https://uidai.gov.in
- **Process:**
  1. Register as Authentication User Agency (AUA)
  2. Submit KYC documents
  3. Sign AUA agreement
  4. Receive Sub-AUA code and API credentials
- **Documentation:** https://uidai.gov.in/ecosystem/authentication-devices-documents.html
- **Pricing:** ₹0.50 per authentication (approx)

#### 2. PAN Verification
- **Website:** https://www.incometax.gov.in
- **Process:**
  1. Apply for PAN verification API access through IT department
  2. For government entities: Contact NSDL/PROTEAN
  3. Get API credentials through authorized channel
- **Documentation:** Available through IT department portal
- **Pricing:** Government rates apply

#### 3. EPFO
- **Website:** https://www.epfindia.gov.in
- **Process:**
  1. Register as employer on EPFO Unified Portal
  2. Request API access for employee verification
  3. Complete employer KYC
  4. Receive API credentials
- **Documentation:** https://unifiedportal-mem.epfindia.gov.in/
- **Pricing:** Free for registered employers

#### 4. ESI
- **Website:** https://www.esic.nic.in
- **Process:**
  1. Register on ESIC portal as employer
  2. Apply for API access
  3. Submit registration documents
  4. Receive API key
- **Documentation:** https://www.esic.nic.in/
- **Pricing:** Free for registered employers

#### 5. DigiLocker
- **Website:** https://www.digilocker.gov.in
- **Process:**
  1. Register as Requester Organization
  2. Submit organization documents
  3. Sign MOU with DigiLocker team
  4. Receive OAuth client credentials
- **Documentation:** https://egovstandards.gov.in/digilocker-integration
- **Pricing:** Free for government organizations

---

## 🚀 API Endpoints

### 1. Aadhaar Verification

**Endpoint:** `POST /api/government/aadhaar/verify`

**Request:**
```json
{
  "aadhaarNumber": "123456789012",
  "employeeId": 1,
  "consent": true
}
```

**Response (Success):**
```json
{
  "success": true,
  "verified": true,
  "name": "Rajesh Kumar",
  "dob": "1985-05-15",
  "gender": "Male",
  "address": "Ward 4, Karol Bagh, New Delhi - 110005"
}
```

**Response (Mock Data):**
```json
{
  "success": true,
  "verified": true,
  "name": "Rajesh Kumar",
  "dob": "1985-05-15",
  "gender": "Male",
  "address": "Ward 4, Karol Bagh, New Delhi - 110005",
  "message": "✅ Verified using mock data (Configure AADHAAR_API_KEY for production)"
}
```

---

### 2. PAN Verification

**Endpoint:** `POST /api/government/pan/verify`

**Request:**
```json
{
  "panNumber": "ABCDE1234F",
  "employeeId": 1,
  "name": "Rajesh Kumar"
}
```

**Response (Success):**
```json
{
  "success": true,
  "verified": true,
  "name": "Rajesh Kumar",
  "panStatus": "Active",
  "message": "✅ Verified using mock data (Configure PAN_API_KEY for production)"
}
```

**Response (Name Mismatch):**
```json
{
  "success": true,
  "verified": false,
  "name": "Different Name",
  "panStatus": "Active",
  "message": "⚠️ PAN found but name does not match"
}
```

---

### 3. EPFO Balance

**Endpoint:** `POST /api/government/epfo/balance`

**Request:**
```json
{
  "uan": "123456789012",
  "employeeId": 1
}
```

**Response (Success):**
```json
{
  "success": true,
  "uan": "123456789012",
  "name": "Rajesh Kumar",
  "balance": 125000,
  "lastContribution": "2025-12-31",
  "message": "✅ Mock data (Configure EPFO_API_KEY for production)"
}
```

---

### 4. ESI Details

**Endpoint:** `POST /api/government/esi/details`

**Request:**
```json
{
  "ipNumber": "1234567890",
  "employeeId": 1
}
```

**Response (Success):**
```json
{
  "success": true,
  "ipNumber": "1234567890",
  "name": "Rajesh Kumar",
  "dispensary": "ESI Dispensary - Karol Bagh",
  "validUpto": "2026-03-31",
  "message": "✅ Mock data (Configure ESI_API_KEY for production)"
}
```

---

### 5. DigiLocker Documents

**Endpoint:** `POST /api/government/digilocker/documents`

**Request:**
```json
{
  "employeeId": 1
}
```

**Response (Success):**
```json
{
  "success": true,
  "documents": [
    {
      "docType": "Aadhaar Card",
      "docName": "aadhaar.pdf",
      "issuer": "UIDAI",
      "uri": "digilocker://aadhaar/xxxx-xxxx-1234",
      "size": 245000,
      "mimeType": "application/pdf"
    },
    {
      "docType": "PAN Card",
      "docName": "pan.pdf",
      "issuer": "Income Tax Department",
      "uri": "digilocker://pan/ABCDE1234F",
      "size": 189000,
      "mimeType": "application/pdf"
    }
  ],
  "message": "✅ Mock data (Configure DIGILOCKER credentials for production)"
}
```

---

### 6. API Status Check

**Endpoint:** `GET /api/government/status`

**Response:**
```json
{
  "aadhaar": {
    "enabled": false,
    "mode": "mock"
  },
  "pan": {
    "enabled": false,
    "mode": "mock"
  },
  "epfo": {
    "enabled": false,
    "mode": "mock"
  },
  "esi": {
    "enabled": false,
    "mode": "mock"
  },
  "digilocker": {
    "enabled": false,
    "mode": "mock"
  }
}
```

---

## 💻 Frontend Usage

### Import the Service

```typescript
import {
  verifyAadhaar,
  verifyPAN,
  fetchEPFOBalance,
  fetchESIDetails,
  fetchDigiLockerDocuments,
} from '../services/government-api';
```

### Example: Aadhaar Verification

```typescript
const handleVerify = async () => {
  const result = await verifyAadhaar({
    aadhaarNumber: '123456789012',
    employeeId: 1,
    consent: true,
  });

  if (result.verified) {
    console.log('Verified!', result.name, result.dob);
  } else {
    console.error(result.error);
  }
};
```

### Use the Component

```tsx
import GovernmentVerification from './components/GovernmentVerification';

// In your component
<GovernmentVerification
  employeeId={employee.id}
  employeeName={employee.name}
/>
```

---

## 🔒 Security Considerations

### 1. Data Privacy
- **Aadhaar:** Requires explicit user consent as per Aadhaar Act, 2016
- **PAN:** Verify name matching to prevent fraud
- **EPFO/ESI:** Access only employee's own data
- **DigiLocker:** Requires OAuth user authorization

### 2. Data Storage
- **Never store** Aadhaar/PAN in plain text
- Use encryption for sensitive fields
- Store only masked versions for display
- Implement proper access controls

### 3. API Security
- Store API keys in environment variables only
- Never expose API keys to frontend
- Use server-side proxies for all API calls
- Implement rate limiting
- Log all verification attempts for audit

### 4. Compliance
- **Aadhaar Act, 2016:** Mandatory consent, purpose limitation
- **IT Act, 2000:** Data protection requirements
- **Right to Privacy:** SC judgment 2017 guidelines
- **DPDP Act, 2023:** Personal data protection

---

## 🧪 Mock Data (Development)

### Aadhaar Mock Database
```javascript
{
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
}
```

### PAN Mock Database
```javascript
{
  'ABCDE1234F': { name: 'Rajesh Kumar', status: 'Active' },
  'XYZAB5678C': { name: 'Priya Sharma', status: 'Active' },
}
```

---

## 📊 Production Deployment

### Step 1: Obtain API Keys
1. Follow registration process for each API (see above)
2. Complete KYC and documentation
3. Receive API credentials

### Step 2: Configure Environment
```bash
# Production .env
AADHAAR_API_KEY=sk_live_xxxxxxxx
PAN_API_KEY=pan_prod_xxxxxxxx
EPFO_API_KEY=epfo_live_xxxxxxxx
ESI_API_KEY=esi_prod_xxxxxxxx
DIGILOCKER_CLIENT_ID=digi_xxxxx
DIGILOCKER_CLIENT_SECRET=digi_secret_xxxxx
```

### Step 3: Test in Staging
- Verify each API with test credentials
- Check error handling
- Validate response formats
- Test consent workflows

### Step 4: Monitor Usage
- Track API call volumes
- Monitor error rates
- Set up alerts for failures
- Review audit logs regularly

---

## 🛠️ Troubleshooting

### Issue: "API not configured" error
**Solution:** Check that API keys are properly set in environment variables and server is restarted.

### Issue: "Consent required" for Aadhaar
**Solution:** Ensure consent checkbox is checked before verification.

### Issue: "Name mismatch" for PAN
**Solution:** Verify spelling matches exactly with PAN card. Use fuzzy matching in production.

### Issue: DigiLocker OAuth errors
**Solution:** Implement proper OAuth 2.0 flow with redirect URIs configured in DigiLocker dashboard.

### Issue: EPFO/ESI connection timeout
**Solution:** Increase timeout settings. Government APIs may be slow during peak hours.

---

## 📈 Future Enhancements

1. **Passport Verification API** - Ministry of External Affairs
2. **Driving License API** - Parivahan/Transport Dept
3. **Voter ID Verification** - Election Commission
4. **Education Certificates** - DigiLocker Academic integration
5. **Bank Account Verification** - Penny drop via Razorpay/Cashfree
6. **Police Verification** - CCTNS integration
7. **Medical Records** - ABDM (Ayushman Bharat) integration

---

## 📞 Support

### Government API Support Contacts

- **UIDAI (Aadhaar):** support@uidai.gov.in | 1947
- **Income Tax (PAN):** 1800 180 1961
- **EPFO:** support@epfindia.gov.in | 1800 118 005
- **ESIC:** support@esic.nic.in | 1800 103 7777
- **DigiLocker:** support@digitallocker.gov.in

### Technical Support

- **Repository:** https://github.com/AdityaaTyagi56/MCD-HRMS
- **Issues:** Create issue on GitHub
- **Email:** devops@mcd-hrms.gov.in

---

## ✅ Checklist for Production

- [ ] Obtained all required API keys
- [ ] Configured environment variables
- [ ] Tested each API with production credentials
- [ ] Implemented proper error handling
- [ ] Added audit logging for all verifications
- [ ] Set up monitoring and alerts
- [ ] Reviewed security and compliance
- [ ] Trained admins on verification workflows
- [ ] Created backup plan for API outages
- [ ] Documented API usage patterns

---

**Last Updated:** January 4, 2026  
**Version:** 1.0  
**Status:** Production Ready with Mock Fallback
