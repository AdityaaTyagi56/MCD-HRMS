import express, { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, verifyToken, AuthRequest, authenticateJWT } from '../middleware/jwt';

const router = express.Router();

// Validation schemas
const loginSchema = z.object({
  mobile: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// In-memory user storage (replace with database in production)
interface User {
  id: number;
  mobile: string;
  password: string; // hashed
  role: 'admin' | 'employee';
  name: string;
}

// Mock users - In production, fetch from database
const users: User[] = [
  {
    id: 1,
    mobile: '+918287923955',
    password: bcrypt.hashSync('password123', 10), // Default password
    role: 'employee',
    name: 'Ramesh Gupta',
  },
  {
    id: 0,
    mobile: '+919999999999',
    password: bcrypt.hashSync('admin123', 10), // Admin password
    role: 'admin',
    name: 'Admin User',
  },
];

/**
 * POST /api/auth/login
 * Login with mobile and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { mobile, password } = loginSchema.parse(req.body);

    // Find user
    const user = users.find(u => u.mobile === mobile);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const payload = {
      userId: user.id,
      role: user.role,
      name: user.name,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Verify refresh token
    const payload = verifyToken(refreshToken);

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      role: payload.role,
      name: payload.name,
    });

    res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client should delete tokens)
 */
router.post('/logout', authenticateJWT, (req: AuthRequest, res: Response) => {
  // In a stateless JWT system, logout is handled client-side by deleting tokens
  // If you implement token blacklisting, add token to blacklist here
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticateJWT, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = users.find(u => u.id === req.user!.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    name: user.name,
    role: user.role,
    mobile: user.mobile,
  });
});

/**
 * POST /api/auth/change-password
 * Change password
 */
router.post('/change-password', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = users.find(u => u.id === req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;