import { Router } from 'express';
import { UsersController } from './users.controller';
import { authMiddleware, requireManager } from '@/common/middleware/auth';
import { adminMiddleware } from '@/middleware/admin';

const router = Router();
const usersController = new UsersController();

// All routes require authentication
router.use(authMiddleware as any);

// GET /api/v1/users - Get all users (Admin and Team Manager)
router.get('/', requireManager as any, async (req, res) => {
  await usersController.getUsers(req, res);
});

// POST /api/v1/users - Create new user (Admin and Team Manager)
router.post('/', requireManager as any, async (req, res) => {
  await usersController.createUser(req, res);
});

// PUT /api/v1/users/:id - Update user (Admin and Team Manager)
router.put('/:id', requireManager as any, async (req, res) => {
  await usersController.updateUser(req, res);
});

// DELETE /api/v1/users/:id - Delete user (Admin only)
router.delete('/:id', adminMiddleware as any, async (req, res) => {
  await usersController.deleteUser(req, res);
});

// PATCH /api/v1/users/:id/availability - Update user availability (Admin and Team Manager)
router.patch('/:id/availability', requireManager as any, async (req, res) => {
  await usersController.updateAvailability(req, res);
});

export default router;