import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Prisma
jest.mock('@smartmath/database', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn<any>().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn<any>().mockReturnValue('mock.jwt.token'),
  verify: jest.fn(),
}));

import { db } from '@smartmath/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const mockDb = db as jest.Mocked<typeof db>;

describe('Auth Controller - Unit Tests', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = { body: {}, cookies: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
  });

  describe('Login Security', () => {
    it('should reject login with wrong password', async () => {
      (mockDb.user.findFirst as jest.Mock<any>).mockResolvedValue({
        id: '1', email: 'test@example.com', password: '$2b$10$hash', role: 'ONLINE_STUDENT'
      } as any);
      (bcrypt.compare as jest.Mock<any>).mockResolvedValue(false as any);

      req.body = { email: 'test@example.com', password: 'wrongpass', role: 'ONLINE_STUDENT' };

      // Inline import to avoid circular mock issues
      const { login } = await import('../controllers/auth.controller.js');
      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject login for non-existent user', async () => {
      (mockDb.user.findFirst as jest.Mock<any>).mockResolvedValue(null as any);

      req.body = { email: 'nobody@example.com', password: 'pass', role: 'ONLINE_STUDENT' };

      const { login } = await import('../controllers/auth.controller.js');
      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should issue JWT token on successful login', async () => {
      (mockDb.user.findFirst as jest.Mock<any>).mockResolvedValue({
        id: 'user-1', email: 'test@example.com', password: '$2b$10$hash',
        role: 'ONLINE_STUDENT', name: 'Test User'
      } as any);
      (bcrypt.compare as jest.Mock<any>).mockResolvedValue(true as any);

      req.body = { email: 'test@example.com', password: 'correctpass', role: 'ONLINE_STUDENT' };

      const { login } = await import('../controllers/auth.controller.js');
      await login(req, res);

      expect(jwt.sign).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', expect.any(String), expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
    });
  });

  describe('Refresh Token', () => {
    it('should reject refresh request with no cookie', async () => {
      req.cookies = {};

      const { refreshToken } = await import('../controllers/auth.controller.js');
      await refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject tampered refresh token', async () => {
      req.cookies = { refreshToken: 'invalid.token' };
      (jwt.verify as jest.Mock<any>).mockImplementation(() => { throw new Error('invalid signature'); });

      const { refreshToken } = await import('../controllers/auth.controller.js');
      await refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Logout', () => {
    it('should clear the refreshToken cookie', async () => {
      const { logout } = await import('../controllers/auth.controller.js');
      await logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });
  });
});
