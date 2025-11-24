import { Router } from 'express';
import { QualityController } from './quality.controller';
import { authMiddleware, requireQualityAgent } from '../../common/middleware/auth';

const router = Router();

// All quality routes require authentication and quality agent role
router.use(authMiddleware as any);
router.use(requireQualityAgent as any);

/**
 * @route   GET /api/v1/quality/tickets
 * @desc    Get all quality control tickets with filters
 * @access  Quality Agent, Team Manager, Admin
 */
router.get('/tickets', async (req, res) => {
  await QualityController.getQualityTickets(req, res);
});

/**
 * @route   GET /api/v1/quality/tickets/:id
 * @desc    Get single quality ticket by ID
 * @access  Quality Agent, Team Manager, Admin
 */
router.get('/tickets/:id', async (req, res) => {
  await QualityController.getQualityTicketById(req, res);
});

/**
 * @route   PUT /api/v1/quality/tickets/:id/stage
 * @desc    Update quality review stage
 * @access  Quality Agent, Team Manager, Admin
 */
router.put('/tickets/:id/stage', async (req, res) => {
  await QualityController.updateReviewStage(req, res);
});
/**
 * @route   PUT /api/v1/quality/tickets/:id/severity
 * @desc    Update quality severity
 * @access  Quality Agent, Team Manager, Admin
 */
router.put('/tickets/:id/severity', async (req, res) => {
  await QualityController.updateSeverity(req, res);
});


/**
 * @route   POST /api/v1/quality/tickets/:id/notes
 * @desc    Add quality inspection note
 * @access  Quality Agent, Team Manager, Admin
 */
router.post('/tickets/:id/notes', async (req, res) => {
  await QualityController.addInspectionNote(req, res);
});

/**
 * @route   PUT /api/v1/quality/tickets/:id/approve
 * @desc    Approve quality ticket
 * @access  Quality Agent, Team Manager, Admin
 */
router.put('/tickets/:id/approve', async (req, res) => {
  await QualityController.approveTicket(req, res);
});

/**
 * @route   PUT /api/v1/quality/tickets/:id/reject
 * @desc    Reject quality ticket
 * @access  Quality Agent, Team Manager, Admin
 */
router.put('/tickets/:id/reject', async (req, res) => {
  await QualityController.rejectTicket(req, res);
});

/**
 * @route   PUT /api/v1/quality/tickets/:id/escalate
 * @desc    Escalate quality ticket to Team Manager
 * @access  Quality Agent, Team Manager, Admin
 */
router.put('/tickets/:id/escalate', async (req, res) => {
  await QualityController.escalateTicket(req, res);
});

/**
 * @route   GET /api/v1/quality/statistics
 * @desc    Get quality statistics
 * @access  Quality Agent, Team Manager, Admin
 */
router.get('/statistics', async (req, res) => {
  await QualityController.getStatistics(req, res);
});

/**
 * @route   GET /api/v1/quality/trends
 * @desc    Get quality trends over time
 * @access  Quality Agent, Team Manager, Admin
 */
router.get('/trends', async (req, res) => {
  await QualityController.getTrends(req, res);
});

/**
 * @route   GET /api/v1/quality/performance
 * @desc    Get agent performance comparison
 * @access  Team Manager, Admin only
 */
router.get('/performance', async (req, res) => {
  await QualityController.getPerformanceComparison(req, res);
});

export default router;