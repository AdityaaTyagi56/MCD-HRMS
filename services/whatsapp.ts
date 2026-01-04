/**
 * WhatsApp Messaging Service for MCD HRMS
 * Uses Twilio WhatsApp API for sending notifications to employees
 */

const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN || '';

interface WhatsAppMessage {
  to: string; // Employee mobile number (with country code)
  message: string;
  templateId?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Format phone number for WhatsApp
 * Ensures the number has country code and whatsapp: prefix
 */
function formatWhatsAppNumber(phone: string): string {
  // Remove spaces, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If starts with 0, assume India and replace with +91
  if (cleaned.startsWith('0')) {
    cleaned = '+91' + cleaned.substring(1);
  }
  
  // If doesn't start with +, assume India
  if (!cleaned.startsWith('+')) {
    cleaned = '+91' + cleaned;
  }
  
  return `whatsapp:${cleaned}`;
}

/**
 * Send WhatsApp message via Vercel API
 */
export async function sendWhatsAppMessage(params: WhatsAppMessage): Promise<SendResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('Twilio credentials not configured');
    return { success: false, error: 'WhatsApp service not configured' };
  }

  const toNumber = formatWhatsAppNumber(params.to);
  
  try {
    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toNumber,
        message: params.message,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true, messageId: data.messageId };
    } else {
      return { success: false, error: data.error || 'Failed to send message' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send attendance reminder to employee
 */
export async function sendAttendanceReminder(mobile: string, employeeName: string): Promise<SendResult> {
  const message = `🏢 *MCD HRMS Alert*\n\nनमस्ते ${employeeName},\n\nकृपया आज की उपस्थिति दर्ज करें।\nPlease mark your attendance for today.\n\n📍 Location verification required\n📸 Face authentication required\n\n_Municipal Corporation of Delhi_`;
  
  return sendWhatsAppMessage({ to: mobile, message });
}

/**
 * Send salary credit notification
 */
export async function sendSalaryNotification(
  mobile: string, 
  employeeName: string, 
  amount: number, 
  month: string
): Promise<SendResult> {
  const message = `💰 *Salary Credited*\n\nनमस्ते ${employeeName},\n\nआपका वेतन जमा हो गया है।\nYour salary has been credited.\n\n💵 Amount: ₹${amount.toLocaleString('en-IN')}\n📅 Month: ${month}\n🏦 Account: ****XXXX\n\n_Municipal Corporation of Delhi_`;
  
  return sendWhatsAppMessage({ to: mobile, message });
}

/**
 * Send leave status update
 */
export async function sendLeaveStatusUpdate(
  mobile: string,
  employeeName: string,
  status: 'Approved' | 'Rejected',
  leaveType: string,
  dates: string
): Promise<SendResult> {
  const statusEmoji = status === 'Approved' ? '✅' : '❌';
  const statusHindi = status === 'Approved' ? 'स्वीकृत' : 'अस्वीकृत';
  
  const message = `${statusEmoji} *Leave ${status}*\n\nनमस्ते ${employeeName},\n\nआपकी छुट्टी ${statusHindi} हो गई है।\nYour leave request has been ${status.toLowerCase()}.\n\n📋 Type: ${leaveType}\n📅 Dates: ${dates}\n\n_Municipal Corporation of Delhi_`;
  
  return sendWhatsAppMessage({ to: mobile, message });
}

/**
 * Send grievance update
 */
export async function sendGrievanceUpdate(
  mobile: string,
  employeeName: string,
  ticketId: string,
  status: string,
  update: string
): Promise<SendResult> {
  const message = `📢 *Grievance Update*\n\nनमस्ते ${employeeName},\n\nआपकी शिकायत में अपडेट है।\nUpdate on your grievance.\n\n🎫 Ticket: #${ticketId}\n📊 Status: ${status}\n📝 Update: ${update}\n\n_Municipal Corporation of Delhi_`;
  
  return sendWhatsAppMessage({ to: mobile, message });
}

/**
 * Send emergency/broadcast alert
 */
export async function sendEmergencyAlert(
  mobile: string,
  employeeName: string,
  alertMessage: string
): Promise<SendResult> {
  const message = `🚨 *URGENT ALERT*\n\nनमस्ते ${employeeName},\n\n${alertMessage}\n\n_Municipal Corporation of Delhi_`;
  
  return sendWhatsAppMessage({ to: mobile, message });
}

/**
 * Send bulk messages to multiple employees
 */
export async function sendBulkWhatsAppMessages(
  employees: Array<{ mobile: string; name: string }>,
  messageTemplate: (name: string) => string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] };
  
  for (const emp of employees) {
    const result = await sendWhatsAppMessage({
      to: emp.mobile,
      message: messageTemplate(emp.name),
    });
    
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(`${emp.name}: ${result.error}`);
    }
    
    // Rate limiting: Wait 1 second between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

/**
 * Check if WhatsApp service is configured
 */
export function isWhatsAppConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN);
}

export const whatsappService = {
  sendMessage: sendWhatsAppMessage,
  sendAttendanceReminder,
  sendSalaryNotification,
  sendLeaveStatusUpdate,
  sendGrievanceUpdate,
  sendEmergencyAlert,
  sendBulkMessages: sendBulkWhatsAppMessages,
  isConfigured: isWhatsAppConfigured,
};

export default whatsappService;
