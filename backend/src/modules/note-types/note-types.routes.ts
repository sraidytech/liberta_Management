import { Router } from 'express';
import { noteTypesController } from './note-types.controller';
import { adminMiddleware } from '@/middleware/admin';

const router = Router();

// Authentication is already applied at the app level

// Get all note types (available to all authenticated users)
router.get('/', async (req, res) => {
  await noteTypesController.getNoteTypes(req, res);
});

// Admin-only routes
router.post('/', adminMiddleware as any, async (req, res) => {
  await noteTypesController.createNoteType(req, res);
});

router.put('/:id', adminMiddleware as any, async (req, res) => {
  await noteTypesController.updateNoteType(req, res);
});

router.delete('/:id', adminMiddleware as any, async (req, res) => {
  await noteTypesController.deleteNoteType(req, res);
});

router.patch('/:id/toggle', adminMiddleware as any, async (req, res) => {
  await noteTypesController.toggleNoteTypeStatus(req, res);
});

export default router;