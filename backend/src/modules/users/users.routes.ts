import { Router } from 'express';
import { UsersController } from './users.controller';
import { authMiddleware } from '@/common/middleware/auth';
import { adminMiddleware } from '@/middleware/admin';

const router = Router();
const usersController = new UsersController();

// All routes require authentication and admin privileges
router.use(authMiddleware as any);
router.use(adminMiddleware as any);

// GET /api/v1/users - Get all users
router.get('/', async (req, res) => {
  await usersController.getUsers(req, res);
});

// POST /api/v1/users - Create new user
router.post('/', async (req, res) => {
  await usersController.createUser(req, res);
});

// PUT /api/v1/users/:id - Update user
router.put('/:id', async (req, res) => {
  await usersController.updateUser(req, res);
});

// DELETE /api/v1/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  await usersController.deleteUser(req, res);
});

// PATCH /api/v1/users/:id/availability - Update user availability
router.patch('/:id/availability', async (req, res) => {
  await usersController.updateAvailability(req, res);
});

export default router;