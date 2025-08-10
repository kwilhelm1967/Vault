# Local Password Vault - License Server

This is the backend license validation server for Local Password Vault. It provides secure license validation, anti-piracy protection, and usage analytics.

## Features

- **License Validation**: Server-side license verification with hardware binding
- **Anti-Piracy Protection**: Suspicious activity detection and reporting
- **Usage Analytics**: Anonymous usage tracking and business intelligence
- **Rate Limiting**: Protection against abuse and brute force attacks
- **Security Monitoring**: Real-time security threat detection
- **Admin Dashboard**: License management and analytics

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file:
```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost/licenses
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-here
STRIPE_SECRET_KEY=sk_live_...
EMAIL_SERVICE_API_KEY=your-email-api-key
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### 3. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### License Validation
```http
POST /api/validate-license
Content-Type: application/json

{
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "hardwareId": "hardware-fingerprint",
  "timestamp": 1640995200000,
  "userAgent": "Mozilla/5.0...",
  "platform": "Win32",
  "securityInfo": {
    "buildId": "build-123",
    "violations": []
  }
}
```

**Response:**
```json
{
  "valid": true,
  "licenseData": {
    "type": "pro",
    "status": "active",
    "activatedAt": 1640995200000,
    "expiresAt": null
  }
}
```

### License Activation
```http
POST /api/activate-license
Content-Type: application/json

{
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "customerEmail": "customer@example.com",
  "hardwareId": "hardware-fingerprint"
}
```

### Analytics Tracking
```http
POST /api/analytics
Content-Type: application/json

{
  "events": [
    {
      "event": "feature_usage",
      "properties": {
        "feature": "password_generator",
        "timestamp": 1640995200000
      }
    }
  ],
  "sessionId": "session-123",
  "userId": "user-456"
}
```

### Suspicious Activity Reporting
```http
POST /api/report-suspicious-activity
Content-Type: application/json

{
  "type": "automation_tools_detected",
  "details": {
    "indicatorCount": 3,
    "indicators": ["webdriver", "phantom", "selenium"]
  },
  "timestamp": 1640995200000,
  "userAgent": "Mozilla/5.0...",
  "platform": "Win32"
}
```

## Database Schema

### PostgreSQL Setup
```sql
-- Licenses table
CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    license_key VARCHAR(19) UNIQUE NOT NULL,
    license_type VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active',
    hardware_id VARCHAR(64),
    max_activations INTEGER DEFAULT 1,
    activation_count INTEGER DEFAULT 0,
    transfer_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB
);

-- Usage tracking table
CREATE TABLE license_usage (
    id SERIAL PRIMARY KEY,
    license_key VARCHAR(19),
    hardware_id VARCHAR(64),
    ip_address INET,
    user_agent TEXT,
    platform VARCHAR(50),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suspicious activities table
CREATE TABLE suspicious_activities (
    id SERIAL PRIMARY KEY,
    activity_type VARCHAR(100),
    license_key VARCHAR(19),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    severity VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics events table
CREATE TABLE analytics_events (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(100),
    user_id VARCHAR(100),
    session_id VARCHAR(100),
    properties JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
```sql
CREATE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_email ON licenses(customer_email);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_hardware ON licenses(hardware_id);
CREATE INDEX idx_usage_license ON license_usage(license_key);
CREATE INDEX idx_usage_created ON license_usage(created_at);
CREATE INDEX idx_suspicious_type ON suspicious_activities(activity_type);
CREATE INDEX idx_suspicious_created ON suspicious_activities(created_at);
CREATE INDEX idx_analytics_event ON analytics_events(event_name);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);
```

## Security Features

### Rate Limiting
- **General API**: 100 requests per 15 minutes per IP
- **License Validation**: 10 requests per minute per IP
- **Suspicious Activity**: 5 reports per minute per IP

### Hardware Fingerprinting
- **Similarity Calculation**: Allows minor hardware changes (>80% similarity)
- **Transfer Limits**: Maximum 3 transfers per license
- **Binding Validation**: Strict hardware binding with grace period

### Anti-Piracy Detection
- **Pattern Recognition**: Detects common piracy indicators
- **Behavioral Analysis**: Identifies suspicious usage patterns
- **Real-time Monitoring**: Immediate threat detection and response
- **Automated Responses**: Automatic license suspension for severe violations

## Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3001

CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  license-server:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/licenses
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=licenses
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Cloud Deployment (AWS)
```bash
# Deploy to AWS ECS or Lambda
# Use RDS for PostgreSQL
# Use ElastiCache for Redis
# Use CloudFront for CDN
# Use Route 53 for DNS
```

## Monitoring & Analytics

### Key Metrics
- **License Validation Rate**: Successful vs failed validations
- **Activation Rate**: New license activations per day
- **Piracy Detection**: Suspicious activities and blocked attempts
- **Performance**: API response times and error rates
- **Revenue Protection**: Estimated piracy losses prevented

### Alerting
- **High Failure Rate**: >10% validation failures
- **Suspicious Activity**: Multiple piracy indicators
- **Performance Issues**: >500ms average response time
- **Security Threats**: Automated attack detection

### Dashboards
- **Real-time Metrics**: Live license validation stats
- **Security Dashboard**: Threat detection and response
- **Business Intelligence**: Revenue and usage analytics
- **Performance Monitoring**: API health and performance

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
# Use Artillery or similar tool
artillery run load-test.yml
```

## Maintenance

### Regular Tasks
- **Database Cleanup**: Remove old usage logs (>90 days)
- **Security Updates**: Keep dependencies updated
- **Performance Monitoring**: Monitor and optimize slow queries
- **Backup Verification**: Test backup and restore procedures

### Scaling Considerations
- **Horizontal Scaling**: Multiple server instances behind load balancer
- **Database Optimization**: Read replicas and connection pooling
- **Caching Strategy**: Redis for frequently accessed data
- **CDN Integration**: CloudFront for global distribution

## Support

### Troubleshooting
- **License Not Found**: Check license key format and database
- **Hardware Mismatch**: Review hardware fingerprinting logic
- **High Error Rate**: Check database connectivity and performance
- **Suspicious Activity**: Review detection algorithms and thresholds

### Logs
- **Application Logs**: Structured JSON logging with Winston
- **Access Logs**: HTTP request/response logging
- **Security Logs**: Suspicious activity and threat detection
- **Performance Logs**: API response times and database queries

---

## Production Checklist

### Security
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting and DDoS protection
- [ ] Enable security headers (Helmet.js)
- [ ] Configure firewall rules
- [ ] Set up intrusion detection

### Performance
- [ ] Configure database connection pooling
- [ ] Set up Redis caching
- [ ] Enable gzip compression
- [ ] Configure CDN for static assets
- [ ] Set up load balancing
- [ ] Monitor performance metrics

### Monitoring
- [ ] Set up application monitoring (New Relic/DataDog)
- [ ] Configure log aggregation (ELK Stack)
- [ ] Set up alerting for critical issues
- [ ] Create performance dashboards
- [ ] Configure uptime monitoring

### Backup & Recovery
- [ ] Set up automated database backups
- [ ] Test backup restoration procedures
- [ ] Configure disaster recovery plan
- [ ] Set up cross-region replication
- [ ] Document recovery procedures

This license server provides enterprise-grade security and anti-piracy protection for your Local Password Vault business. It's designed to scale with your business and protect your revenue from piracy and abuse.