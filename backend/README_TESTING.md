# Backend Testing Guide

## Setup

1. Install test dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Run tests:
   ```bash
   npm test
   ```

3. Run tests in watch mode:
   ```bash
   npm run test:watch
   ```

4. Run tests with coverage:
   ```bash
   npm run test:coverage
   ```

## Test Files

- `__tests__/webhooks.test.js` - Tests for Stripe webhook processing
- `__tests__/trial.test.js` - Tests for trial signup and status checks

## Writing Tests

Tests use Jest and Supertest. All external dependencies (database, Stripe, email) are mocked.

### Example Test Structure

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    // Arrange
    mockFunction.mockResolvedValue(expectedValue);

    // Act
    const response = await request(app)
      .post('/api/endpoint')
      .send({ data: 'test' });

    // Assert
    expect(response.status).toBe(200);
    expect(mockFunction).toHaveBeenCalled();
  });
});
```

## Mocking

All external services are mocked:
- Database (`../database/db`)
- Stripe service (`../services/stripe`)
- Email service (`../services/email`)
- License generator (`../services/licenseGenerator`)
- Logger (`../utils/logger`)

## Notes

- Tests run in `test` environment (NODE_ENV=test)
- Console output is suppressed during tests
- Tests timeout after 10 seconds







