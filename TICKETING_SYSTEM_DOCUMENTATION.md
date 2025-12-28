# Support Ticketing System - Documentation

## Overview

A complete support ticketing system has been implemented for Local Password Vault, allowing customers to create support tickets, track their status, and communicate with support staff.

## Features

✅ **Ticket Creation**: Customers can create support tickets with categories, priorities, and license key association
✅ **Ticket Tracking**: View ticket status, conversation history, and add replies
✅ **Email Notifications**: Automatic emails sent on ticket creation and responses
✅ **Ticket Management**: Support staff can update status, assign tickets, and respond
✅ **Database Integration**: Full PostgreSQL/Supabase integration with proper indexing

## Database Schema

### Tables Created

1. **support_tickets** - Main ticket table
   - `ticket_number` (unique, human-readable: TKT-2025-001234)
   - Customer info (email, name, customer_id)
   - Ticket details (subject, description, category, priority)
   - Status tracking (open, in_progress, waiting_customer, resolved, closed)
   - License association
   - Response tracking

2. **ticket_messages** - Conversation thread
   - Links to ticket
   - Message content
   - Sender type (customer/support)
   - Attachments support (JSONB)
   - Internal notes flag

### Indexes
- `idx_support_tickets_email` - Fast lookup by customer email
- `idx_support_tickets_number` - Fast lookup by ticket number
- `idx_support_tickets_status` - Filter by status
- `idx_ticket_messages_ticket` - Fast message retrieval

## API Endpoints

### POST `/api/tickets`
Create a new support ticket

**Request Body:**
```json
{
  "email": "customer@example.com",
  "name": "John Doe",
  "subject": "License activation issue",
  "description": "I cannot activate my license key...",
  "category": "license",
  "priority": "normal",
  "license_key": "XXXX-XXXX-XXXX-XXXX" // optional
}
```

**Response:**
```json
{
  "success": true,
  "ticket": {
    "ticket_number": "TKT-2025-001234",
    "status": "open",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### GET `/api/tickets?email=customer@example.com`
Get all tickets for a customer

**Response:**
```json
{
  "success": true,
  "tickets": [
    {
      "id": 1,
      "ticket_number": "TKT-2025-001234",
      "subject": "License activation issue",
      "status": "open",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### GET `/api/tickets/:ticket_number?email=customer@example.com`
Get a specific ticket with messages

**Response:**
```json
{
  "success": true,
  "ticket": {
    "ticket_number": "TKT-2025-001234",
    "subject": "License activation issue",
    "status": "open",
    "messages": [
      {
        "message": "Initial message...",
        "sender_type": "customer",
        "created_at": "2025-01-15T10:30:00Z"
      }
    ]
  }
}
```

### POST `/api/tickets/:ticket_number/messages`
Add a message to a ticket

**Request Body:**
```json
{
  "email": "customer@example.com",
  "name": "John Doe",
  "message": "Additional information..."
}
```

## Frontend Integration

### Support Page (`LPV/support.html`)

**Features:**
- Ticket creation form with category selection
- License key field (optional)
- Ticket lookup by email and ticket number
- Ticket display with conversation thread
- Reply functionality
- URL parameter support (`?ticket=TKT-2025-001234&email=user@example.com`)

**Form Fields:**
- Name
- Email
- Category (technical, billing, license, feature, bug, other)
- License Key (optional)
- Subject
- Message

## Email Notifications

### Ticket Created Email
- Sent to customer when ticket is created
- Includes ticket number and subject
- Confirmation message

### Ticket Response Email
- Sent to support staff when customer replies
- Includes ticket number, customer info, and message

## Ticket Categories

- `technical` - Technical issues, bugs, installation problems
- `billing` - Payment, refund, billing questions
- `license` - License activation, key issues
- `feature` - Feature requests
- `bug` - Bug reports
- `other` - General questions

## Ticket Priorities

- `low` - Non-urgent questions
- `normal` - Standard support requests (default)
- `high` - Urgent issues
- `urgent` - Critical problems

## Ticket Statuses

- `open` - New ticket, awaiting response
- `in_progress` - Support is working on it
- `waiting_customer` - Waiting for customer response
- `resolved` - Issue resolved
- `closed` - Ticket closed

## Security Features

- Email verification for ticket access
- Customer can only view their own tickets
- License key association for context
- Rate limiting on API endpoints (inherited from server config)

## Usage Examples

### Creating a Ticket
```javascript
const response = await fetch('https://api.localpasswordvault.com/api/tickets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    name: 'John Doe',
    subject: 'Cannot activate license',
    description: 'I purchased a license but cannot activate it...',
    category: 'license',
    license_key: 'XXXX-XXXX-XXXX-XXXX'
  })
});
```

### Viewing a Ticket
```javascript
const response = await fetch(
  'https://api.localpasswordvault.com/api/tickets/TKT-2025-001234?email=user@example.com'
);
const data = await response.json();
```

### Adding a Reply
```javascript
const response = await fetch(
  'https://api.localpasswordvault.com/api/tickets/TKT-2025-001234/messages',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      name: 'John Doe',
      message: 'Here is additional information...'
    })
  }
);
```

## Database Setup

Run the SQL schema in Supabase SQL Editor:

```sql
-- See backend/database/schema.sql for complete schema
-- Tables: support_tickets, ticket_messages
-- Indexes: idx_support_tickets_email, idx_support_tickets_number, etc.
```

## Backend Files Created/Modified

### New Files:
- `backend/services/ticketService.js` - Ticket business logic
- `backend/routes/tickets.js` - API routes

### Modified Files:
- `backend/database/schema.sql` - Added ticket tables
- `backend/database/db.js` - Added ticket database methods
- `backend/services/email.js` - Added ticket email functions
- `backend/server.js` - Added tickets router

## Frontend Files Modified

- `LPV/support.html` - Integrated ticket creation and viewing

## Next Steps (Future Enhancements)

1. **Admin Dashboard**: Create admin interface for support staff
2. **Ticket Assignment**: Assign tickets to specific support agents
3. **Internal Notes**: Support-only notes on tickets
4. **File Attachments**: Support for file uploads
5. **Ticket Search**: Advanced search and filtering
6. **SLA Tracking**: Response time tracking
7. **Ticket Templates**: Pre-defined responses
8. **Customer Portal**: Dedicated ticket management page

## Testing

To test the system:

1. **Create a ticket:**
   ```bash
   curl -X POST https://api.localpasswordvault.com/api/tickets \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "name": "Test User",
       "subject": "Test Ticket",
       "description": "This is a test ticket",
       "category": "technical"
     }'
   ```

2. **View ticket:**
   - Visit: `https://localpasswordvault.com/support.html?ticket=TKT-2025-001234&email=test@example.com`
   - Or use the "View My Tickets" button on support page

## Environment Variables

No new environment variables required. Uses existing:
- `SUPPORT_EMAIL` - For ticket notifications
- `BREVO_API_KEY` - For sending emails
- `SUPABASE_URL` - Database connection
- `SUPABASE_SERVICE_KEY` - Database authentication

## API Rate Limiting

Tickets API inherits rate limiting from server config:
- 100 requests per 15 minutes per IP
- Applied to `/api/tickets` endpoints

## Error Handling

All endpoints return consistent error format:
```json
{
  "success": false,
  "error": "Error message"
}
```

Common errors:
- `400` - Missing required fields, invalid input
- `403` - Unauthorized (email doesn't match ticket owner)
- `404` - Ticket not found
- `500` - Server error

