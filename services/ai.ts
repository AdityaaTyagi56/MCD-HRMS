/**
 * Mistral (via OpenRouter) AI Service for MCD HRMS
 * Streams responses using @openrouter/sdk.
 */
import { OpenRouter } from '@openrouter/sdk';

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const MODEL_ID = 'meta-llama/llama-3.2-3b-instruct:free';
const client = new OpenRouter({ apiKey: API_KEY });

interface AnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
}

async function callAI(prompt: string): Promise<string> {
  if (!API_KEY) {
    throw new Error('OpenRouter API key not configured. Set VITE_OPENROUTER_API_KEY and restart.');
  }

  try {
    const stream = await client.chat.send({
      model: MODEL_ID,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of stream as any) {
      const delta = chunk?.choices?.[0]?.delta?.content;
      if (delta) fullResponse += delta;
    }

    if (!fullResponse) {
      throw new Error('OpenRouter returned an empty response');
    }

    return fullResponse.trim();
  } catch (error: any) {
    console.error('OpenRouter API Error:', error);
    throw new Error(error?.message || 'Failed to get AI response');
  }
}

export async function analyzeAttendancePatterns(
  employees: Array<{ name: string; status: string; attendanceTime?: string; department: string }>
): Promise<AnalysisResult> {
  try {
    const prompt = `You are an AI security analyst for a municipal corporation HRMS system. Analyze this employee attendance data for potential fraud or anomalies:

${JSON.stringify(employees, null, 2)}

Provide a JSON response with:
1. "risk_score": A number 0-100 indicating overall fraud risk
2. "anomalies": Array of detected issues (each with "type", "severity", "description", "affected_employees")
3. "recommendations": Array of action items for HR
4. "summary": Brief executive summary (2-3 sentences)

Focus on:
- Unusual check-in patterns
- Multiple employees with same check-in times (potential proxy attendance)
- Employees frequently absent
- Department-wide issues

Respond ONLY with valid JSON, no markdown.`;

    const response = await callAI(prompt);
    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(jsonStr);
    return { success: true, data: analysis };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function analyzeGrievanceTrends(
  grievances: Array<{ category: string; status: string; priority: string; date: string; description: string }>
): Promise<AnalysisResult> {
  try {
    const prompt = `You are an AI analyst for an HR grievance system at a municipal corporation (MCD Delhi). Analyze this grievance data:

${JSON.stringify(grievances, null, 2)}

Provide a JSON response with:
1. "trend_analysis": Object with "rising_issues", "declining_issues", "stable_issues"
2. "department_risk": Array of departments with high grievance rates
3. "predicted_escalations": Array of grievances likely to escalate (with "id", "reason", "recommended_action")
4. "sentiment_score": Overall employee sentiment (0-100, higher is better)
5. "priority_actions": Top 3 immediate actions for management
6. "weekly_forecast": Brief prediction for next week

Respond ONLY with valid JSON, no markdown.`;

    const response = await callAI(prompt);
    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(jsonStr);
    return { success: true, data: analysis };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function detectGhostEmployees(
  employees: Array<{ id: number; name: string; bank_account?: string; mobile?: string; status: string; department: string }>
): Promise<AnalysisResult> {
  try {
    const prompt = `You are a fraud detection AI for a government HR system. Analyze this employee database for potential "ghost employees" (fake entries used for payroll fraud):

${JSON.stringify(employees, null, 2)}

Look for:
- Duplicate or similar names
- Missing or suspicious contact info
- Patterns suggesting fake entries
- Employees never marked present

Provide a JSON response with:
1. "ghost_probability": Overall likelihood of ghost employees (0-100)
2. "suspicious_entries": Array of suspicious employee IDs with "reason"
3. "verification_needed": Array of employee IDs requiring manual verification
4. "estimated_fraud_amount": Estimated monthly fraud (assume avg salary INR 25,000)
5. "recommendations": Immediate actions for payroll team

Respond ONLY with valid JSON, no markdown.`;

    const response = await callAI(prompt);
    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(jsonStr);
    return { success: true, data: analysis };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function askAIAssistant(
  question: string,
  context: {
    totalEmployees: number;
    presentToday: number;
    pendingGrievances: number;
    departments: string[];
  }
): Promise<AnalysisResult> {
  try {
    const prompt = `You are an AI assistant for the MCD (Municipal Corporation of Delhi) HRMS dashboard. Answer this question from an HR administrator:

Question: "${question}"

Current System Data:
- Total Employees: ${context.totalEmployees}
- Present Today: ${context.presentToday}
- Pending Grievances: ${context.pendingGrievances}
- Departments: ${context.departments.join(', ')}

Provide a helpful, concise answer (2-4 sentences). If the question relates to system data, reference the numbers above. If asked about predictions or recommendations, provide practical HR advice. Keep the tone professional but friendly.`;

    const response = await callAI(prompt);
    return { success: true, data: { answer: response } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateSecurityReport(): Promise<AnalysisResult> {
  try {
    const prompt = `Generate a brief daily security assessment report for an HRMS system at a municipal corporation. Include:

1. "threat_level": "Low" | "Medium" | "High" | "Critical"
2. "active_threats": Array of current security concerns
3. "biometric_status": Status of face recognition systems
4. "geo_fencing_status": Status of location verification
5. "recommendations": Top 3 security improvements
6. "compliance_score": GDPR/data protection compliance (0-100)

Make it realistic for a government HR system handling sensitive employee data.
Respond ONLY with valid JSON, no markdown.`;

    const response = await callAI(prompt);
    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(jsonStr);
    return { success: true, data: analysis };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export const aiService = {
  analyzeAttendancePatterns,
  analyzeGrievanceTrends,
  detectGhostEmployees,
  askAIAssistant,
  generateSecurityReport,
  isConfigured: () => !!API_KEY,
};

export default aiService;