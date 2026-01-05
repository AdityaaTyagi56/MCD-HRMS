/**
 * WhatsApp Messaging Service for MCD HRMS
 *
 * Sends messages via the backend API (/api/send-whatsapp) where Twilio credentials live.
 * This keeps Twilio secrets off the client.
 */

import { getApiConfig } from './api';

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

const DEFAULT_APP_URL = 'https://mcd-hrms.vercel.app';

function getAppUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return DEFAULT_APP_URL;
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
 * Send WhatsApp message via backend API
 */
export async function sendWhatsAppMessage(params: WhatsAppMessage): Promise<SendResult> {
  const toNumber = formatWhatsAppNumber(params.to);
  
  try {
    const { base, key } = getApiConfig();
    const apiUrl = `${base}/api/send-whatsapp`;
      
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
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
      console.error('WhatsApp API error:', data);
      return { success: false, error: data.error || 'Failed to send message' };
    }
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send attendance reminder to employee
 */
export async function sendAttendanceReminder(mobile: string, employeeName: string): Promise<SendResult> {
  const dashboardUrl = getAppUrl();

  const message =
    `🏢 *MCD HRMS*\n\n` +
    `नमस्ते ${employeeName}, कृपया आज की उपस्थिति दर्ज करें।\n` +
    `Hello ${employeeName}, please mark your attendance today.\n\n` +
    `लिंक / Link: ${dashboardUrl}\n\n` +
    `_Municipal Corporation of Delhi_`;
  
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
  const dashboardUrl = getAppUrl();

  const message =
    `💰 *MCD HRMS*\n\n` +
    `नमस्ते ${employeeName}, आपका वेतन जमा हो गया है।\n` +
    `Hello ${employeeName}, your salary has been credited.\n\n` +
    `राशि / Amount: ₹${amount.toLocaleString('en-IN')}\n` +
    `माह / Month: ${month}\n\n` +
    `विवरण / Details: ${dashboardUrl}\n\n` +
    `_Municipal Corporation of Delhi_`;
  
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
  const dashboardUrl = getAppUrl();

  const message =
    `🚨 *MCD HRMS - Alert*\n\n` +
    `नमस्ते ${employeeName},\n` +
    `${alertMessage}\n\n` +
    `लिंक / Link: ${dashboardUrl}\n\n` +
    `_Municipal Corporation of Delhi_`;
  
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
  // Client does not know server env; allow UI and let server return errors.
  return true;
}

export const whatsappService = {
  sendMessage: sendWhatsAppMessage,
  sendAttendanceReminder,
  sendSalaryNotification,
  sendEmergencyAlert,
  sendBulkMessages: sendBulkWhatsAppMessages,
  isConfigured: isWhatsAppConfigured,
};

export default whatsappService;
