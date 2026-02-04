// lib/authToken.ts
// Secure JWT-based authentication token handling

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

// Token payload interface
export interface TokenPayload {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'inactive_doctor';
}

// Get the JWT secret from environment variables
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
};

/**
 * Create a signed JWT token
 * Only call this on the server side (API routes)
 */
export function createAuthToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '7d', // Token expires in 7 days
    algorithm: 'HS256',
  });
}

/**
 * Verify and decode a JWT token
 * Returns the payload if valid, null if invalid
 * Only call this on the server side (API routes)
 */
export function verifyAuthToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;
    return decoded;
  } catch (error) {
    // Token is invalid, expired, or tampered with
    return null;
  }
}

/**
 * Cookie configuration for the auth token
 */
export const AUTH_COOKIE_NAME = 'kc_auth_token';

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,      // Can't be accessed by JavaScript (prevents XSS)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict' as const,  // Prevents CSRF attacks
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
};

/**
 * Helper to get user from request
 * Use this in API routes to get the authenticated user
 */
export function getUserFromRequest(req: NextApiRequest): TokenPayload | null {
  const token = req.cookies[AUTH_COOKIE_NAME];
  if (!token) {
    return null;
  }
  return verifyAuthToken(token);
}

/**
 * Helper to require authentication and optionally a specific role
 * Returns the user if authenticated, or sends an error response and returns null
 */
export function requireAuth(
  req: NextApiRequest, 
  res: NextApiResponse, 
  allowedRoles?: ('admin' | 'doctor')[]
): TokenPayload | null {
  const user = getUserFromRequest(req);
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Please log in' });
    return null;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role as 'admin' | 'doctor')) {
    res.status(403).json({ error: `Forbidden: ${allowedRoles.join(' or ')} access required` });
    return null;
  }
  
  return user;
}

/**
 * Helper specifically for doctor routes
 */
export function requireDoctor(req: NextApiRequest, res: NextApiResponse): TokenPayload | null {
  return requireAuth(req, res, ['doctor']);
}

/**
 * Helper specifically for admin routes
 */
export function requireAdmin(req: NextApiRequest, res: NextApiResponse): TokenPayload | null {
  return requireAuth(req, res, ['admin']);
}
