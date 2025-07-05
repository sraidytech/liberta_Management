import { Router } from 'express';
import { AssignmentController } from './assignment.controller';
import { authMiddleware } from '@/common/middleware/auth';

const router = Router();
const assignmentController = new AssignmentController();

// All assignment routes require authentication
router.use(authMiddleware);

/**
 * @route POST /api/v1/assignments/trigger
 * @desc Manually trigger assignment of unassigned orders
 * @access ADMIN, TEAM_MANAGER
 */
router.post('/trigger', async (req, res) => {
  await assignmentController.triggerAssignment(req, res);
});

/**
 * @route GET /api/v1/assignments/stats
 * @desc Get assignment statistics
 * @access ADMIN, TEAM_MANAGER, AGENT_SUIVI
 */
router.get('/stats', async (req, res) => {
  await assignmentController.getAssignmentStats(req, res);
});

/**
 * @route GET /api/v1/assignments/agent/:agentId/stats
 * @desc Get assignment statistics for a specific agent (considering product assignments)
 * @access ADMIN, TEAM_MANAGER, Own Agent
 */
router.get('/agent/:agentId/stats', async (req, res) => {
  await assignmentController.getAgentStats(req, res);
});

/**
 * @route POST /api/v1/assignments/reassign/:orderId
 * @desc Manually reassign an order to a specific agent
 * @access ADMIN, TEAM_MANAGER
 */
router.post('/reassign/:orderId', async (req, res) => {
  await assignmentController.reassignOrder(req, res);
});

/**
 * @route POST /api/v1/assignments/bulk-reassign
 * @desc Bulk reassignment of orders with percentage distribution
 * @access ADMIN, TEAM_MANAGER
 */
router.post('/bulk-reassign', async (req, res) => {
  await assignmentController.bulkReassignOrders(req, res);
});

/**
 * @route POST /api/v1/assignments/manual/:orderId
 * @desc Manually assign an order to a specific agent
 * @access ADMIN, TEAM_MANAGER
 */
router.post('/manual/:orderId', async (req, res) => {
  await assignmentController.manualAssignOrder(req, res);
});

/**
 * @route GET /api/v1/assignments/agents
 * @desc Get available agents for manual assignment
 * @access ADMIN, TEAM_MANAGER
 */
router.get('/agents', async (req, res) => {
  await assignmentController.getAvailableAgents(req, res);
});

/**
 * @route PUT /api/v1/assignments/agent/:agentId/availability
 * @desc Update agent availability status
 * @access ADMIN, TEAM_MANAGER, Own Agent
 */
router.put('/agent/:agentId/availability', async (req, res) => {
  await assignmentController.updateAgentAvailability(req, res);
});

/**
 * @route GET /api/v1/assignments/workloads
 * @desc Get agent workload distribution
 * @access ADMIN, TEAM_MANAGER
 */
router.get('/workloads', async (req, res) => {
  await assignmentController.getAgentWorkloads(req, res);
});

/**
 * @route POST /api/v1/assignments/redistribute/:agentId
 * @desc Force redistribute orders from offline agents
 * @access ADMIN, TEAM_MANAGER
 */
router.post('/redistribute/:agentId', async (req, res) => {
  await assignmentController.redistributeOrders(req, res);
});

/**
 * @route GET /api/v1/assignments/analytics
 * @desc Get assignment history and analytics
 * @access ADMIN, TEAM_MANAGER
 */
router.get('/analytics', async (req, res) => {
  await assignmentController.getAssignmentAnalytics(req, res);
});

/**
 * @route POST /api/v1/assignments/agent/:agentId/mark-active
 * @desc Mark agent as active for assignment purposes (when they log in)
 * @access ADMIN, TEAM_MANAGER, Own Agent
 */
router.post('/agent/:agentId/mark-active', async (req, res) => {
  await assignmentController.markAgentActive(req, res);
});

/**
 * @route POST /api/v1/assignments/test
 * @desc Test assignment system with a limited number of orders
 * @access ADMIN, TEAM_MANAGER
 */
router.post('/test', async (req, res) => {
  await assignmentController.testAssignment(req, res);
});

export default router;