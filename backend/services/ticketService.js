/**
 * Ticket Service
 * 
 * Business logic for support ticket management
 */

const db = require('../database/db');
const logger = require('../utils/logger');

/**
 * Generate a unique ticket number
 * Format: TKT-YYYY-NNNNNN (e.g., TKT-2025-001234)
 */
function generateTicketNumber() {
  const year = new Date().getFullYear();
  // Generate 6-digit sequential number (padded with zeros)
  // In production, this should use a sequence or counter
  const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `TKT-${year}-${random}`;
}

/**
 * Create a new support ticket
 */
async function createTicket({
  email,
  name,
  subject,
  description,
  category = 'other',
  priority = 'normal',
  license_key,
}) {
  try {
    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    
    // Find customer if exists
    let customer_id = null;
    const customer = await db.customers.findByEmail(normalizedEmail);
    if (customer) {
      customer_id = customer.id;
    }
    
    // Find license if license_key provided
    let license_id = null;
    if (license_key) {
      const license = await db.licenses.findByKey(license_key);
      if (license) {
        license_id = license.id;
      }
    }
    
    // Generate ticket number
    const ticket_number = generateTicketNumber();
    
    // Create ticket
    const ticket = await db.supportTickets.create({
      ticket_number,
      email: normalizedEmail,
      name: name?.trim() || null,
      customer_id,
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
      license_key: license_key?.trim() || null,
      license_id,
    });
    
    // Create initial message
    await db.ticketMessages.create({
      ticket_id: ticket.id,
      message: description.trim(),
      sender_type: 'customer',
      sender_email: normalizedEmail,
      sender_name: name?.trim() || null,
    });
    
    logger.info('Support ticket created', {
      operation: 'ticket_create',
      ticket_number: ticket.ticket_number,
      email: normalizedEmail,
      category,
    });
    
    return ticket;
  } catch (error) {
    logger.error('Failed to create support ticket', error, {
      operation: 'ticket_create',
      email: email?.trim(),
    });
    throw error;
  }
}

/**
 * Add a message to a ticket
 */
async function addMessage({
  ticket_number,
  message,
  sender_type,
  sender_email,
  sender_name,
  is_internal_note = false,
}) {
  try {
    // Find ticket
    const ticket = await db.supportTickets.findByNumber(ticket_number);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    
    // Verify sender is the ticket owner (for customer messages)
    if (sender_type === 'customer') {
      const normalizedEmail = sender_email.trim().toLowerCase();
      if (ticket.email !== normalizedEmail) {
        throw new Error('Unauthorized: Email does not match ticket owner');
      }
    }
    
    // Create message
    const ticketMessage = await db.ticketMessages.create({
      ticket_id: ticket.id,
      message: message.trim(),
      sender_type,
      sender_email: sender_email.trim().toLowerCase(),
      sender_name: sender_name?.trim() || null,
      is_internal_note,
    });
    
    // Update ticket last response
    await db.supportTickets.updateLastResponse(ticket.id, sender_type);
    
    // Update ticket status if needed
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      // Reopen if customer responds
      if (sender_type === 'customer') {
        await db.supportTickets.updateStatus(ticket.id, 'open');
      }
    } else if (sender_type === 'support') {
      // Mark as in progress when support responds
      if (ticket.status === 'open') {
        await db.supportTickets.updateStatus(ticket.id, 'in_progress');
      }
    }
    
    logger.info('Ticket message added', {
      operation: 'ticket_message',
      ticket_number: ticket.ticket_number,
      sender_type,
    });
    
    return ticketMessage;
  } catch (error) {
    logger.error('Failed to add ticket message', error, {
      operation: 'ticket_message',
      ticket_number,
    });
    throw error;
  }
}

/**
 * Get ticket with messages
 */
async function getTicketWithMessages(ticket_number, email, includeInternal = false) {
  try {
    const ticket = await db.supportTickets.findByNumber(ticket_number);
    if (!ticket) {
      return null;
    }
    
    // Verify email matches (for customer access)
    const normalizedEmail = email.trim().toLowerCase();
    if (ticket.email !== normalizedEmail) {
      throw new Error('Unauthorized: Email does not match ticket owner');
    }
    
    // Get messages
    const messages = await db.ticketMessages.findByTicket(ticket.id, includeInternal);
    
    return {
      ...ticket,
      messages: messages.map(msg => ({
        ...msg,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
      })),
    };
  } catch (error) {
    logger.error('Failed to get ticket', error, {
      operation: 'ticket_get',
      ticket_number,
    });
    throw error;
  }
}

/**
 * Get all tickets for a customer
 */
async function getCustomerTickets(email) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const tickets = await db.supportTickets.findByEmail(normalizedEmail);
    
    return tickets;
  } catch (error) {
    logger.error('Failed to get customer tickets', error, {
      operation: 'ticket_list',
      email,
    });
    throw error;
  }
}

/**
 * Update ticket status (admin/support only)
 */
async function updateTicketStatus(ticket_number, status, assigned_to = null) {
  try {
    const ticket = await db.supportTickets.findByNumber(ticket_number);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    
    const updateData = { status };
    if (assigned_to) {
      updateData.assigned_to = assigned_to;
    }
    
    const updated = await db.supportTickets.updateStatus(ticket.id, status, updateData);
    
    logger.info('Ticket status updated', {
      operation: 'ticket_update',
      ticket_number,
      status,
    });
    
    return updated;
  } catch (error) {
    logger.error('Failed to update ticket status', error, {
      operation: 'ticket_update',
      ticket_number,
    });
    throw error;
  }
}

module.exports = {
  generateTicketNumber,
  createTicket,
  addMessage,
  getTicketWithMessages,
  getCustomerTickets,
  updateTicketStatus,
};

