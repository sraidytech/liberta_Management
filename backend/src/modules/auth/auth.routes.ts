import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware, requireAdmin } from '@/common/middleware/auth';

const router = Router();

// Public authentication routes
router.post('/login', (req, res) => authController.login(req, res));
router.post('/register', (req, res) => authController.register(req, res));
router.post('/refresh', (req, res) => authController.refreshToken(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

// Password management (public)
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));

// Protected profile management
router.get('/profile', authMiddleware, (req, res) => authController.getProfile(req, res));
router.put('/profile', authMiddleware, (req, res) => authController.updateProfile(req, res));

// Admin-only password management
router.post('/change-user-password', authMiddleware as any, requireAdmin as any, (req, res) => authController.changeUserPassword(req, res));
router.post('/change-own-password', authMiddleware as any, requireAdmin as any, (req, res) => authController.changeOwnPassword(req, res));

export default router;