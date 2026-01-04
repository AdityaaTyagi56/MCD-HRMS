/**
 * Government API Integration Service for MCD HRMS
 * Integrates with Indian Government APIs for employee verification and benefits
 */

import { BACKEND_URL } from '../config/env';

// ============================================================================
// Configuration
// ============================================================================

const GOV_API_CONFIG = {
  aadhaar: {
    baseUrl: process.env.VITE_AADHAAR_API_URL || 'https://api.uidai.gov.in',
    apiKey: process.env.VITE_AADHAAR_API_KEY || '',
    enabled: !!process.env.VITE_AADHAAR_API_KEY,
  },
  pan: {
    baseUrl: process.env.VITE_PAN_API_URL || 'https://api.incometax.gov.in',
    apiKey: process.env.VITE_PAN_API_KEY || '',
    enabled: !!process.env.VITE_PAN_API_KEY,
  },
  digilocker: {
    baseUrl: process.env.VITE_DIGILOCKER_API_URL || 'https://api.digitallocker.gov.in',
    clientId: process.env.VITE_DIGILOCKER_CLIENT_ID || '',
    clientSecret: process.env.VITE_DIGILOCKER_CLIENT_SECRET || '',
    enabled: !!process.env.VITE_DIGILOCKER_CLIENT_ID,
  },
  epfo: {
    baseUrl: process.env.VITE_EPFO_API_URL || 'https://api.epfindia.gov.in',
    apiKey: process.env.VITE_EPFO_API_KEY || '',
    enabled: !!process.env.VITE_EPFO_API_KEY,
  },
  esi: {
    baseUrl: process.env.VITE_ESI_API_URL || 'https://api.esic.nic.in',
    apiKey: process.env.VITE_ESI_API_KEY || '',
    enabled: !!process.env.VITE_ESI_API_KEY,
  },
};

// ============================================================================
// Type Definitions
// ============================================================================

export interface AadhaarVerificationRequest {
  aadhaarNumber: string;
  employeeId: number;
  consent: boolean;
}

export interface AadhaarVerificationResponse {
  success: boolean;
  verified: boolean;
  name?: string;
  dob?: string;
  gender?: string;
  address?: string;
  photo?: string;
  error?: string;
  message?: string;
}

export interface PANVerificationRequest {
  panNumber: string;
  employeeId: number;
  name: string;
}

export interface PANVerificationResponse {
  success: boolean;
  verified: boolean;
  name?: string;
  panStatus?: 'Active' | 'Inactive' | 'Invalid';
  error?: string;
  message?: string;
}

export interface DigiLockerDocument {
  docType: string;
  docName: string;
  issuer: string;
  uri: string;
  size: number;
  mimeType: string;
}

export interface DigiLockerResponse {
  success: boolean;
  documents?: DigiLockerDocument[];
  error?: string;
}

export interface EPFOBalanceRequest {
  uan: string; // Universal Account Number
  employeeId: number;
}

export interface EPFOBalanceResponse {
  success: boolean;
  uan?: string;
  name?: string;
  balance?: number;
  lastContribution?: string;
  error?: string;
}

export interface ESIBalanceRequest {
  ipNumber: string; // Insurance Person Number
  employeeId: number;
}

export interface ESIBalanceResponse {
  success: boolean;
  ipNumber?: string;
  name?: string;
  dispensary?: string;
  validUpto?: string;
  error?: string;
}

// ============================================================================
// Mock Data for Development/Testing
// ============================================================================

const MOCK_AADHAAR_DATA: Record<string, any> = {
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

const MOCK_PAN_DATA: Record<string, any> = {
  'ABCDE1234F': {
    name: 'Rajesh Kumar',
    status: 'Active',
  },
  'XYZAB5678C': {
    name: 'Priya Sharma',
    status: 'Active',
  },
};

// ============================================================================
// Aadhaar Verification
// ============================================================================

/**
 * Verify Aadhaar number and fetch basic details
 * Uses eKYC API if available, otherwise mock data for demo
 */
export async function verifyAadhaar(
  request: AadhaarVerificationRequest
): Promise<AadhaarVerificationResponse> {
  try {
    // Validate Aadhaar format (12 digits)
    const aadhaarPattern = /^\d{12}$/;
    if (!aadhaarPattern.test(request.aadhaarNumber)) {
      return {
        success: false,
        verified: false,
        error: 'Invalid Aadhaar format. Must be 12 digits.',
      };
    }

    // Check consent
    if (!request.consent) {
      return {
        success: false,
        verified: false,
        error: 'User consent required for Aadhaar verification',
      };
    }

    // If real API is configured, use it
    if (GOV_API_CONFIG.aadhaar.enabled) {
      const response = await fetch(`${BACKEND_URL}/api/government/aadhaar/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    }

    // Mock verification for demo
    const mockData = MOCK_AADHAAR_DATA[request.aadhaarNumber];
    if (mockData) {
      return {
        success: true,
        verified: true,
        name: mockData.name,
        dob: mockData.dob,
        gender: mockData.gender,
        address: mockData.address,
        message: 'Aadhaar verified successfully (Mock Data)',
      };
    }

    return {
      success: false,
      verified: false,
      error: 'Aadhaar not found in database',
    };
  } catch (error: any) {
    console.error('Aadhaar verification error:', error);
    return {
      success: false,
      verified: false,
      error: error.message || 'Aadhaar verification failed',
    };
  }
}

// ============================================================================
// PAN Verification
// ============================================================================

/**
 * Verify PAN number and match with name
 * Uses Income Tax API if available, otherwise mock data
 */
export async function verifyPAN(
  request: PANVerificationRequest
): Promise<PANVerificationResponse> {
  try {
    // Validate PAN format (5 letters, 4 digits, 1 letter)
    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panPattern.test(request.panNumber)) {
      return {
        success: false,
        verified: false,
        error: 'Invalid PAN format. Must be in format: ABCDE1234F',
      };
    }

    // If real API is configured, use it
    if (GOV_API_CONFIG.pan.enabled) {
      const response = await fetch(`${BACKEND_URL}/api/government/pan/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    }

    // Mock verification for demo
    const mockData = MOCK_PAN_DATA[request.panNumber];
    if (mockData) {
      // Simple name matching (fuzzy match in production)
      const nameMatch = mockData.name.toLowerCase().includes(request.name.toLowerCase()) ||
                       request.name.toLowerCase().includes(mockData.name.toLowerCase());

      return {
        success: true,
        verified: nameMatch,
        name: mockData.name,
        panStatus: mockData.status,
        message: nameMatch 
          ? 'PAN verified successfully (Mock Data)'
          : 'PAN found but name does not match',
      };
    }

    return {
      success: false,
      verified: false,
      error: 'PAN not found in database',
    };
  } catch (error: any) {
    console.error('PAN verification error:', error);
    return {
      success: false,
      verified: false,
      error: error.message || 'PAN verification failed',
    };
  }
}

// ============================================================================
// DigiLocker Integration
// ============================================================================

/**
 * Fetch employee documents from DigiLocker
 */
export async function fetchDigiLockerDocuments(
  employeeId: number
): Promise<DigiLockerResponse> {
  try {
    if (!GOV_API_CONFIG.digilocker.enabled) {
      return {
        success: false,
        error: 'DigiLocker API not configured',
      };
    }

    const response = await fetch(`${BACKEND_URL}/api/government/digilocker/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ employeeId }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('DigiLocker fetch error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch DigiLocker documents',
    };
  }
}

// ============================================================================
// EPFO Integration
// ============================================================================

/**
 * Fetch EPFO balance and contribution details
 */
export async function fetchEPFOBalance(
  request: EPFOBalanceRequest
): Promise<EPFOBalanceResponse> {
  try {
    // Validate UAN format (12 digits)
    const uanPattern = /^\d{12}$/;
    if (!uanPattern.test(request.uan)) {
      return {
        success: false,
        error: 'Invalid UAN format. Must be 12 digits.',
      };
    }

    if (!GOV_API_CONFIG.epfo.enabled) {
      // Return mock data for demo
      return {
        success: true,
        uan: request.uan,
        name: 'Employee Name',
        balance: 125000,
        lastContribution: '2025-12-31',
        error: 'Using mock data - EPFO API not configured',
      };
    }

    const response = await fetch(`${BACKEND_URL}/api/government/epfo/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('EPFO balance fetch error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch EPFO balance',
    };
  }
}

// ============================================================================
// ESI Integration
// ============================================================================

/**
 * Fetch ESI details and dispensary information
 */
export async function fetchESIDetails(
  request: ESIBalanceRequest
): Promise<ESIBalanceResponse> {
  try {
    // Validate IP Number format
    if (!request.ipNumber || request.ipNumber.length < 10) {
      return {
        success: false,
        error: 'Invalid IP Number format',
      };
    }

    if (!GOV_API_CONFIG.esi.enabled) {
      // Return mock data for demo
      return {
        success: true,
        ipNumber: request.ipNumber,
        name: 'Employee Name',
        dispensary: 'ESI Dispensary - Karol Bagh',
        validUpto: '2026-03-31',
        error: 'Using mock data - ESI API not configured',
      };
    }

    const response = await fetch(`${BACKEND_URL}/api/government/esi/details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('ESI details fetch error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch ESI details',
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check which government APIs are configured
 */
export function getConfiguredAPIs(): Record<string, boolean> {
  return {
    aadhaar: GOV_API_CONFIG.aadhaar.enabled,
    pan: GOV_API_CONFIG.pan.enabled,
    digilocker: GOV_API_CONFIG.digilocker.enabled,
    epfo: GOV_API_CONFIG.epfo.enabled,
    esi: GOV_API_CONFIG.esi.enabled,
  };
}

/**
 * Mask sensitive government IDs for display
 */
export function maskAadhaar(aadhaar: string): string {
  if (aadhaar.length !== 12) return aadhaar;
  return `XXXX-XXXX-${aadhaar.slice(-4)}`;
}

export function maskPAN(pan: string): string {
  if (pan.length !== 10) return pan;
  return `${pan.slice(0, 2)}XXX${pan.slice(-4)}`;
}

export function maskUAN(uan: string): string {
  if (uan.length !== 12) return uan;
  return `XXXX-XXXX-${uan.slice(-4)}`;
}
