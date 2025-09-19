import { Request, Response } from 'express';
import { TicketService } from '../../services/ticket.service';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export class TicketsController {
  // Create a new ticket
  static async createTicket(req: Request, res: Response) {
    try {
      const { orderId, title, category, priority, description, assigneeId } = req.body;
      const reporterId = req.user?.id;

      if (!reporterId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!orderId || !title || !category || !description) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: orderId, title, category, description'
        });
      }

      // Validate category
      if (!Object.values(TicketCategory).includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ticket category'
        });
      }

      // Validate priority if provided
      if (priority && !Object.values(TicketPriority).includes(priority)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ticket priority'
        });
      }

      const ticket = await TicketService.createTicket({
        orderId,
        reporterId,
        title,
        category,
        priority: priority || TicketPriority.MEDIUM,
        description,
        assigneeId
      });

      res.status(201).json({
        success: true,
        message: 'Ticket created successfully',
        data: { ticket }
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create ticket'
      });
    }
  }

  // Get tickets for current user
  static async getTickets(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const {
        status,
        priority,
        category,
        orderId,
        orderReference,
        page = '1',
        limit = '20'
      } = req.query;

      const filters: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      if (status && Object.values(TicketStatus).includes(status as TicketStatus)) {
        filters.status = status as TicketStatus;
      }

      if (priority && Object.values(TicketPriority).includes(priority as TicketPriority)) {
        filters.priority = priority as TicketPriority;
      }

      if (category && Object.values(TicketCategory).includes(category as TicketCategory)) {
        filters.category = category as TicketCategory;
      }

      if (orderId) {
        filters.orderId = orderId as string;
      }

      if (orderReference) {
        filters.orderReference = orderReference as string;
      }

      const result = await TicketService.getTicketsForUser(userId, filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting tickets:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get tickets'
      });
    }
  }

  // Get ticket by ID
  static async getTicketById(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const ticket = await TicketService.getTicketById(ticketId, userId);

      res.json({
        success: true,
        data: { ticket }
      });
    } catch (error) {
      console.error('Error getting ticket:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get ticket'
      });
    }
  }

  // Add message to ticket
  static async addMessage(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const { message, isInternal = false } = req.body;
      const senderId = req.user?.id;

      if (!senderId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required'
        });
      }

      const ticketMessage = await TicketService.addMessage(
        ticketId,
        senderId,
        message.trim(),
        isInternal
      );

      res.status(201).json({
        success: true,
        message: 'Message added successfully',
        data: { message: ticketMessage }
      });
    } catch (error) {
      console.error('Error adding message:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add message'
      });
    }
  }

  // Update ticket status
  static async updateStatus(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!status || !Object.values(TicketStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ticket status'
        });
      }

      const ticket = await TicketService.updateTicketStatus(ticketId, userId, status);

      res.json({
        success: true,
        message: 'Ticket status updated successfully',
        data: { ticket }
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update ticket status'
      });
    }
  }

  // Assign ticket to user
  static async assignTicket(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const { assigneeId } = req.body;
      const assignerId = req.user?.id;

      if (!assignerId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!assigneeId) {
        return res.status(400).json({
          success: false,
          message: 'Assignee ID is required'
        });
      }

      const ticket = await TicketService.assignTicket(ticketId, assignerId, assigneeId);

      res.json({
        success: true,
        message: 'Ticket assigned successfully',
        data: { ticket }
      });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign ticket'
      });
    }
  }

  // Get ticket statistics
  static async getStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const stats = await TicketService.getTicketStats(userId, userRole);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Error getting ticket stats:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get ticket statistics'
      });
    }
  }

  // Get available categories and priorities (for frontend dropdowns)
  static async getMetadata(req: Request, res: Response) {
    try {
      const metadata = {
        categories: Object.values(TicketCategory).map(category => ({
          value: category,
          label: category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
        })),
        priorities: Object.values(TicketPriority).map(priority => ({
          value: priority,
          label: priority.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
        })),
        statuses: Object.values(TicketStatus).map(status => ({
          value: status,
          label: status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
        }))
      };

      res.json({
        success: true,
        data: metadata
      });
    } catch (error) {
      console.error('Error getting metadata:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get metadata'
      });
    }
  }

  // Get available assignees (coordinators and team leaders)
  static async getAvailableAssignees(req: Request, res: Response) {
    try {
      const assignees = await TicketService.getAvailableAssignees();

      res.json({
        success: true,
        data: { assignees }
      });
    } catch (error) {
      console.error('Error getting available assignees:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available assignees'
      });
    }
  }
}