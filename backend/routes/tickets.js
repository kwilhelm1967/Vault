const express = require('express');
const db = require('../database/db');
const ticketService = require('../services/ticketService');
const { sendTicketCreatedEmail, sendTicketResponseEmail } = require('../services/email');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/tickets
 * Create a new support ticket
 */
router.post('/', async (req, res) => {
  try {
    const { email, name, subject, description, category, priority, license_key } = req.body;
    
    // Validation
    if (!email || !subject || !description) {
      return res.status(400).json({
        success: false,
        error: 'Email, subject, and description are required',
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }
    
    // Validate category
    const validCategories = ['technical', 'billing', 'license', 'feature', 'bug', 'other'];
    const ticketCategory = category && validCategories.includes(category) ? category : 'other';
    
    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    const ticketPriority = priority && validPriorities.includes(priority) ? priority : 'normal';
    
    // Create ticket
    const ticket = await ticketService.createTicket({
      email,
      name,
      subject,
      description,
      category: ticketCategory,
      priority: ticketPriority,
      license_key,
    });
    
    // Send confirmation email
    try {
      await sendTicketCreatedEmail({
        to: ticket.email,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
      });
    } catch (emailError) {
      // Log but don't fail the request
      logger.error('Failed to send ticket creation email', emailError, {
        operation: 'ticket_email',
        ticket_number: ticket.ticket_number,
      });
    }
    
    res.json({
      success: true,
      ticket: {
        ticket_number: ticket.ticket_number,
        status: ticket.status,
        created_at: ticket.created_at,
      },
    });
  } catch (error) {
    logger.error('Failed to create ticket', error, {
      operation: 'ticket_create',
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create ticket. Please try again later.',
    });
  }
});

/**
 * GET /api/tickets/:ticket_number
 * Get a specific ticket with messages
 */
router.get('/:ticket_number', async (req, res) => {
  try {
    const { ticket_number } = req.params;
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }
    
    const ticket = await ticketService.getTicketWithMessages(ticket_number, email);
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }
    
    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Email does not match ticket owner',
      });
    }
    
    logger.error('Failed to get ticket', error, {
      operation: 'ticket_get',
      ticket_number: req.params.ticket_number,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve ticket',
    });
  }
});

/**
 * GET /api/tickets
 * Get all tickets for a customer
 */
router.get('/', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }
    
    const tickets = await ticketService.getCustomerTickets(email);
    
    res.json({
      success: true,
      tickets,
    });
  } catch (error) {
    logger.error('Failed to get customer tickets', error, {
      operation: 'ticket_list',
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tickets',
    });
  }
});

/**
 * POST /api/tickets/:ticket_number/messages
 * Add a message to a ticket
 */
router.post('/:ticket_number/messages', async (req, res) => {
  try {
    const { ticket_number } = req.params;
    const { email, name, message } = req.body;
    
    if (!email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Email and message are required',
      });
    }
    
    const ticketMessage = await ticketService.addMessage({
      ticket_number,
      message,
      sender_type: 'customer',
      sender_email: email,
      sender_name: name,
    });
    
    // Get updated ticket
    const ticket = await db.supportTickets.findByNumber(ticket_number);
    
    // Send notification email to support
    try {
      await sendTicketResponseEmail({
        to: process.env.SUPPORT_EMAIL || 'support@localpasswordvault.com',
        ticketNumber: ticket.ticket_number,
        customerEmail: ticket.email,
        customerName: name || ticket.name,
        message,
      });
    } catch (emailError) {
      logger.error('Failed to send ticket response email', emailError, {
        operation: 'ticket_email',
        ticket_number,
      });
    }
    
    res.json({
      success: true,
      message: ticketMessage,
    });
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('not found')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }
    
    logger.error('Failed to add ticket message', error, {
      operation: 'ticket_message',
      ticket_number: req.params.ticket_number,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to add message',
    });
  }
});

module.exports = router;

