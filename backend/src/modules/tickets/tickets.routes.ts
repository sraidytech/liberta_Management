import { Router } from 'express';
import { TicketsController } from './tickets.controller';

const router = Router();

// Authentication is already applied at the app level

// Get ticket metadata (categories, priorities, statuses)
router.get('/metadata', async (req, res) => {
  await TicketsController.getMetadata(req, res);
});

// Get ticket statistics
router.get('/stats', async (req, res) => {
  await TicketsController.getStats(req, res);
});

// Get available assignees (coordinators and team leaders)
router.get('/assignees', async (req, res) => {
  await TicketsController.getAvailableAssignees(req, res);
});

// Get critical tickets only (EXCHANGE, REFUND, QUALITY_CONTROL)
router.get('/critical', async (req, res) => {
  await TicketsController.getCriticalTickets(req, res);
});

// Get all tickets for current user
router.get('/', async (req, res) => {
  await TicketsController.getTickets(req, res);
});

// Create a new ticket
router.post('/', async (req, res) => {
  await TicketsController.createTicket(req, res);
});

// Get specific ticket by ID
router.get('/:ticketId', async (req, res) => {
  await TicketsController.getTicketById(req, res);
});

// Add message to ticket
router.post('/:ticketId/messages', async (req, res) => {
  await TicketsController.addMessage(req, res);
});

// Update ticket status
router.put('/:ticketId/status', async (req, res) => {
  await TicketsController.updateStatus(req, res);
});

// Assign ticket to user
router.put('/:ticketId/assign', async (req, res) => {
  await TicketsController.assignTicket(req, res);
});

export default router;