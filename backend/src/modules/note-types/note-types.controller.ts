import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NoteTypesController {
  /**
   * Get all active note types
   */
  async getNoteTypes(req: Request, res: Response) {
    try {
      const { includeInactive = 'false' } = req.query;
      
      const where = includeInactive === 'true' ? {} : { isActive: true };
      
      const noteTypes = await prisma.noteType.findMany({
        where,
        orderBy: {
          name: 'asc'
        }
      });

      res.json({
        success: true,
        data: {
          noteTypes
        }
      });
    } catch (error) {
      console.error('❌ Error fetching note types:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch note types'
        }
      });
    }
  }

  /**
   * Create a new note type (Admin only)
   */
  async createNoteType(req: Request, res: Response) {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Note type name is required'
          }
        });
      }

      // Check if note type already exists
      const existingNoteType = await prisma.noteType.findUnique({
        where: { name: name.trim() }
      });

      if (existingNoteType) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Note type with this name already exists'
          }
        });
      }

      const noteType = await prisma.noteType.create({
        data: {
          name: name.trim()
        }
      });

      res.status(201).json({
        success: true,
        data: noteType,
        message: 'Note type created successfully'
      });
    } catch (error) {
      console.error('❌ Error creating note type:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create note type'
        }
      });
    }
  }

  /**
   * Update a note type (Admin only)
   */
  async updateNoteType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, isActive } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Note type name is required'
          }
        });
      }

      // Check if note type exists
      const existingNoteType = await prisma.noteType.findUnique({
        where: { id }
      });

      if (!existingNoteType) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Note type not found'
          }
        });
      }

      // Check if another note type with the same name exists (excluding current one)
      const duplicateNoteType = await prisma.noteType.findFirst({
        where: {
          name: name.trim(),
          id: { not: id }
        }
      });

      if (duplicateNoteType) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Note type with this name already exists'
          }
        });
      }

      const updatedNoteType = await prisma.noteType.update({
        where: { id },
        data: {
          name: name.trim(),
          ...(typeof isActive === 'boolean' && { isActive })
        }
      });

      res.json({
        success: true,
        data: updatedNoteType,
        message: 'Note type updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating note type:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update note type'
        }
      });
    }
  }

  /**
   * Delete a note type (Admin only)
   */
  async deleteNoteType(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if note type exists
      const existingNoteType = await prisma.noteType.findUnique({
        where: { id }
      });

      if (!existingNoteType) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Note type not found'
          }
        });
      }

      await prisma.noteType.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Note type deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting note type:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete note type'
        }
      });
    }
  }

  /**
   * Toggle note type active status (Admin only)
   */
  async toggleNoteTypeStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if note type exists
      const existingNoteType = await prisma.noteType.findUnique({
        where: { id }
      });

      if (!existingNoteType) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Note type not found'
          }
        });
      }

      const updatedNoteType = await prisma.noteType.update({
        where: { id },
        data: {
          isActive: !existingNoteType.isActive
        }
      });

      res.json({
        success: true,
        data: updatedNoteType,
        message: `Note type ${updatedNoteType.isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('❌ Error toggling note type status:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to toggle note type status'
        }
      });
    }
  }
}

export const noteTypesController = new NoteTypesController();