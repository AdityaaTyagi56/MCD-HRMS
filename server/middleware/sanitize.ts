import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize string to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  
  // Remove HTML tags and dangerous content
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content
  });
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware to sanitize request body
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Middleware to sanitize query parameters
 */
export function sanitizeQuery(req: Request, res: Response, next: NextFunction) {
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
}

/**
 * Middleware to sanitize all inputs (body, query, params)
 */
export function sanitizeAll(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}

/**
 * Validate and sanitize HTML content
 * Allows safe HTML tags for rich text
 */
export function sanitizeHTML(html: string, allowedTags?: string[]): string {
  const defaultAllowedTags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'];
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags || defaultAllowedTags,
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

/**
 * SQL injection prevention - escape special characters
 */
export function escapeSQLString(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/\0/g, '\\0') // Escape null characters
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\x1a/g, '\\Z'); // Escape EOF
}

/**
 * Path traversal prevention
 */
export function sanitizeFilePath(filePath: string): string {
  if (typeof filePath !== 'string') return filePath;
  
  // Remove any path traversal attempts
  return filePath
    .replace(/\.\./g, '') // Remove ..
    .replace(/\/\//g, '/') // Remove double slashes
    .replace(/\\/g, '/') // Normalize backslashes
    .trim();
}

/**
 * Email validation and sanitization
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== 'string') return null;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const cleaned = email.toLowerCase().trim();
  
  return emailRegex.test(cleaned) ? cleaned : null;
}

/**
 * Phone number validation and sanitization (Indian format)
 */
export function sanitizePhoneNumber(phone: string): string | null {
  if (typeof phone !== 'string') return null;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Indian phone number validation
  const indianPhoneRegex = /^[6-9]\d{9}$/;
  
  if (indianPhoneRegex.test(digits)) {
    return `+91${digits}`;
  }
  
  return null;
}

/**
 * Aadhaar number validation and sanitization
 */
export function sanitizeAadhaar(aadhaar: string): string | null {
  if (typeof aadhaar !== 'string') return null;
  
  // Remove all non-digit characters
  const digits = aadhaar.replace(/\D/g, '');
  
  // Aadhaar is 12 digits
  if (digits.length === 12) {
    return digits;
  }
  
  return null;
}

/**
 * PAN number validation and sanitization
 */
export function sanitizePAN(pan: string): string | null {
  if (typeof pan !== 'string') return null;
  
  const cleaned = pan.toUpperCase().trim();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  
  return panRegex.test(cleaned) ? cleaned : null;
}