import { Request, Response } from 'express';
import { QualityService } from '../../services/quality.service';
import { QualityReviewStage, QualitySeverity, TicketStatus } from '@prisma/client';

export class QualityController {
  /**
   * GET /api/v1/quality/tickets
   * Get all quality control tickets with filters
   */
  static async getQualityTickets(req: Request, res: Response) {
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
        stage,
        severity,
        decision,
        page = '1',
        limit = '20'
      } = req.query;

      const filters: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      if (status) filters.status = status as TicketStatus;
      if (stage) filters.stage = stage as QualityReviewStage;
      if (severity) filters.severity = severity as QualitySeverity;
      if (decision) filters.decision = decision;

      const result = await QualityService.getQualityTickets(userId, filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting quality tickets:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get quality tickets'
      });
    }
  }

  /**
   * GET /api/v1/quality/tickets/:id
   * Get single quality ticket by ID
   */
  static async getQualityTicketById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const ticket = await QualityService.getQualityTicketById(id, userId);

      res.json({
        success: true,
        data: { ticket }
      });
    } catch (error) {
      console.error('Error getting quality ticket:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get quality ticket'
      });
    }
  }

  /**
   * PUT /api/v1/quality/tickets/:id/stage
   * Update quality review stage
   */
  static async updateReviewStage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { stage } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!stage || !Object.values(QualityReviewStage).includes(stage)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid review stage'
        });
      }

      const ticket = await QualityService.updateQualityReviewStage(id, userId, stage);

      res.json({
        success: true,
        message: 'Review stage updated successfully',
        data: { ticket }
      });
    } catch (error) {
      console.error('Error updating review stage:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update review stage'
      });
    }
  }

  /**
   * PUT /api/v1/quality/tickets/:id/severity
   * Update quality severity
   */
  static async updateSeverity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { severity } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!severity || !Object.values(QualitySeverity).includes(severity)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid severity level'
        });
      }

      const ticket = await QualityService.updateQualitySeverity(id, userId, severity);

      res.json({
        success: true,
        message: 'Severity updated successfully',
        data: { ticket }
      });
    } catch (error) {
      console.error('Error updating severity:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update severity'
      });
    }
  }

  /**
   * POST /api/v1/quality/tickets/:id/notes
   * Add quality inspection note
   */
  static async addInspectionNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { severity, notes, metrics } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!severity || !Object.values(QualitySeverity).includes(severity)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid severity level'
        });
      }

      if (!notes || notes.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Inspection notes are required'
        });
      }

      const ticket = await QualityService.addQualityInspectionNote(id, userId, {
        severity,
        notes: notes.trim(),
        metrics
      });

      res.json({
        success: true,
        message: 'Inspection note added successfully',
        data: { ticket }
      });
    } catch (error) {
      console.error('Error adding inspection note:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add inspection note'
      });
    }
  }

  /**
   * PUT /api/v1/quality/tickets/:id/approve
   * Approve quality ticket
   */
  static async approveTicket(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approvalNotes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!approvalNotes || approvalNotes.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Approval notes are mandatory'
        });
      }

      const ticket = await QualityService.approveQualityTicket(id, userId, approvalNotes.trim());

      res.json({
        success: true,
        message: 'Quality ticket approved successfully',
        data: { ticket }
      });
    } catch (error) {
      console.error('Error approving ticket:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve ticket'
      });
    }
  }

  /**
   * PUT /api/v1/quality/tickets/:id/reject
   * Reject quality ticket
   */
  static async rejectTicket(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!rejectionReason || rejectionReason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is mandatory'
        });
      }

      const ticket = await QualityService.rejectQualityTicket(id, userId, rejectionReason.trim());

      res.json({
        success: true,
        message: 'Quality ticket rejected successfully',
        data: { ticket }
      });
    } catch (error) {
      console.error('Error rejecting ticket:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reject ticket'
      });
    }
  }

  /**
   * PUT /api/v1/quality/tickets/:id/escalate
   * Escalate quality ticket to Team Manager
   */
  static async escalateTicket(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { escalationReason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      if (!escalationReason || escalationReason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Escalation reason is mandatory'
        });
      }

      const ticket = await QualityService.escalateQualityTicket(id, userId, escalationReason.trim());

      res.json({
        success: true,
        message: 'Quality ticket escalated successfully',
        data: { ticket }
      });
    } catch (error) {
      console.error('Error escalating ticket:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to escalate ticket'
      });
    }
  }

  /**
   * GET /api/v1/quality/statistics
   * Get quality statistics
   */
  static async getStatistics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { startDate, endDate } = req.query;

      const period: any = {};
      if (startDate) period.startDate = new Date(startDate as string);
      if (endDate) period.endDate = new Date(endDate as string);

      const statistics = await QualityService.getQualityStatistics(
        userId,
        Object.keys(period).length > 0 ? period : undefined
      );

      res.json({
        success: true,
        data: { statistics }
      });
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get statistics'
      });
    }
  }

  /**
   * GET /api/v1/quality/trends
   * Get quality trends over time
   */
  static async getTrends(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { days = '30' } = req.query;
      const trends = await QualityService.getQualityTrends(userId, parseInt(days as string));

      res.json({
        success: true,
        data: { trends }
      });
    } catch (error) {
      console.error('Error getting trends:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get trends'
      });
    }
  }

  /**
   * GET /api/v1/quality/performance
   * Get agent performance comparison
   */
  static async getPerformanceComparison(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const performance = await QualityService.getAgentPerformanceComparison(userId);

      res.json({
        success: true,
        data: { performance }
      });
    } catch (error) {
      console.error('Error getting performance comparison:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get performance comparison'
      });
    }
  }
}