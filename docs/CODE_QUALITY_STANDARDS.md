# Code Quality Standards

This document defines the code quality standards and best practices for the Local Password Vault project.

## Table of Contents

1. [General Principles](#general-principles)
2. [Code Style](#code-style)
3. [TypeScript Standards](#typescript-standards)
4. [React Component Standards](#react-component-standards)
5. [Error Handling](#error-handling)
6. [Logging Standards](#logging-standards)
7. [Security Standards](#security-standards)
8. [Documentation Requirements](#documentation-requirements)
9. [Testing Requirements](#testing-requirements)
10. [File Organization](#file-organization)

---

## General Principles

### 1. **100% Offline After Activation**
- **CRITICAL**: No network calls after license activation (except during activation itself)
- All functionality must work completely offline
- Use `devLog` for development logging (tree-shaken in production)
- No analytics, telemetry, or error reporting to external services in production

### 2. **Privacy First**
- No data collection without explicit user consent
- All sensitive data must be encrypted at rest
- Local-first architecture

### 3. **Code Clarity**
- Code should be self-documenting
- Prefer explicit over implicit
- Avoid magic numbers and strings
- Use meaningful variable and function names

### 4. **Maintainability**
- Keep functions small and focused (single responsibility)
- DRY (Don't Repeat Yourself) - but don't over-abstract
- Prefer composition over inheritance

---

## Code Style

### TypeScript/JavaScript

- **Use TypeScript** for all new code
- **Strict mode enabled**: No implicit any, strict null checks
- **ESLint rules**: Follow project ESLint configuration
- **Formatting**: Use Prettier (if configured) or consistent formatting

### Naming Conventions

- **Variables/Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`
- **Component files**: `PascalCase.tsx` (e.g., `LoginScreen.tsx`)
- **Utility files**: `camelCase.ts` (e.g., `errorHandling.ts`)
- **Hook files**: `camelCase.ts` with `use` prefix (e.g., `useAppStatus.ts`)

### File Organization

```
src/
├── components/       # React components
│   ├── vault/       # Vault-related components
│   ├── auth/        # Authentication components
│   └── ...
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── config/          # Configuration files
└── styles/          # Style files
```

---

## TypeScript Standards

### Type Safety

- **Always define types** for function parameters and return values
- **Use interfaces** for object shapes
- **Avoid `any`** - use `unknown` when type is truly unknown
- **Use type guards** for runtime type checking

```typescript
// ✅ Good
function processEntry(entry: PasswordEntry): void {
  // ...
}

// ❌ Bad
function processEntry(entry: any): void {
  // ...
}
```

### Null Safety

- **Use optional chaining** (`?.`) and nullish coalescing (`??`)
- **Explicit null checks** when necessary
- **Use type guards** to narrow types

```typescript
// ✅ Good
const name = entry?.accountName ?? 'Unknown';

// ❌ Bad
const name = entry.accountName || 'Unknown'; // Doesn't handle null properly
```

---

## React Component Standards

### Component Structure

1. **Imports** (external libraries first, then local)
2. **Types/Interfaces**
3. **Constants**
4. **Component definition**
5. **Exports**

### Component Patterns

- **Functional components** only (no class components)
- **Use hooks** for state and side effects
- **Extract custom hooks** when logic is reusable
- **Keep components focused** - extract sub-components when >300 lines

### Props Interface

Always define props interface:

```typescript
interface ComponentProps {
  /** Description of the prop */
  requiredProp: string;
  /** Optional prop description */
  optionalProp?: number;
}

export const Component: React.FC<ComponentProps> = ({ requiredProp, optionalProp }) => {
  // ...
};
```

### State Management

- **Use `useState`** for local component state
- **Use `useCallback`** for memoized callbacks
- **Use `useMemo`** for expensive computations
- **Avoid prop drilling** - consider context for deeply nested props

---

## Error Handling

### Error Types

Use structured error handling with `errorHandling.ts` utilities:

```typescript
import { createError, withErrorHandling } from './utils/errorHandling';

// ✅ Good - Structured error
try {
  await operation();
} catch (error) {
  throw createError('OPERATION_FAILED', 'Operation failed', {
    recoverable: true,
    context: 'user-action'
  });
}

// ✅ Good - Error handling wrapper
const { data, error } = await withErrorHandling(
  () => performOperation(),
  'operation-context'
);
```

### Error Messages

- **User-facing errors**: Clear, actionable, non-technical
- **Developer errors**: Include context and error codes
- **Never expose sensitive data** in error messages

---

## Logging Standards

### Development Logging

Use `devLog` utilities for development logging (automatically tree-shaken in production):

```typescript
import { devLog, devWarn, devError } from './utils/devLog';

// ✅ Good
devLog('User action:', action);
devWarn('Potential issue:', warning);
devError('Error occurred:', error);

// ❌ Bad - Will appear in production
console.log('User action:', action);
console.error('Error:', error);
```

### Production Logging

- **No `console.log/warn/error`** in production code
- **Use `devLog`** for all debug output
- **Silent failures** where appropriate (no user-facing errors for expected failures)

---

## Security Standards

### Data Encryption

- **All sensitive data** must be encrypted at rest
- **Use secure random** for IDs and tokens (`crypto.randomUUID()`)
- **Never store plaintext passwords**

### Input Validation

- **Always validate user input**
- **Sanitize all user-provided data**
- **Use type guards** for runtime validation

```typescript
import { sanitizeTextField, validateEmail } from './utils/validation';

// ✅ Good
const sanitized = sanitizeTextField(userInput);
if (!validateEmail(email)) {
  throw new Error('Invalid email');
}
```

### No Network Calls

- **CRITICAL**: After activation, no network calls except:
  - Initial license activation
  - License transfer
  - Manual update checks (if implemented, must be opt-in)

---

## Documentation Requirements

### JSDoc Comments

Add JSDoc comments for:
- **Public functions/methods**
- **Complex algorithms**
- **Security-sensitive code**
- **Non-obvious code logic**

```typescript
/**
 * Validates and processes a password entry
 * 
 * @param entry - The password entry to validate
 * @param options - Processing options
 * @param options.encrypt - Whether to encrypt the entry (default: true)
 * @returns Processed entry or null if validation fails
 * @throws {ValidationError} If entry is invalid
 * 
 * @example
 * ```typescript
 * const processed = processEntry(entry, { encrypt: true });
 * ```
 */
export function processEntry(
  entry: PasswordEntry,
  options: { encrypt?: boolean } = {}
): PasswordEntry | null {
  // ...
}
```

### Code Comments

- **Explain why**, not what (code should be self-explanatory)
- **Mark TODOs** with context: `// TODO: Refactor when X is available`
- **Remove commented-out code** (use git history instead)

---

## Testing Requirements

### Test Coverage

- **Minimum 50% coverage** for utilities and business logic
- **Critical paths**: 80%+ coverage
- **Security-sensitive code**: 90%+ coverage

### Test Organization

- **Unit tests**: One test file per source file (`*.test.ts`)
- **Test location**: Same directory or `__tests__/` folder
- **Test naming**: Descriptive test names explaining what is tested

```typescript
describe('storageService', () => {
  describe('saveEntries', () => {
    it('should encrypt entries before saving', async () => {
      // ...
    });

    it('should throw error when vault is locked', async () => {
      // ...
    });
  });
});
```

---

## File Organization

### Component Extraction

Extract components/hooks when:
- Component exceeds **300 lines**
- Logic is **reusable** across multiple components
- Logic is **complex** and deserves its own file

### Import Organization

1. **External libraries** (React, third-party)
2. **Internal utilities** (utils, hooks)
3. **Types**
4. **Styles**
5. **Local imports** (same directory)

```typescript
// External
import { useState, useEffect } from 'react';
import { Button } from 'lucide-react';

// Internal utilities
import { storageService } from './utils/storage';
import { useAppStatus } from './hooks';

// Types
import { PasswordEntry } from './types';

// Styles
import './Component.css';

// Local
import { SubComponent } from './SubComponent';
```

---

## Clean Code Checklist

Before submitting code, ensure:

- [ ] No `console.log/error/warn` in production code
- [ ] All functions have proper TypeScript types
- [ ] JSDoc comments on public/complex functions
- [ ] No commented-out code
- [ ] No unused imports or variables
- [ ] Error handling in place
- [ ] Input validation where needed
- [ ] Tests updated/added for new functionality
- [ ] Code follows naming conventions
- [ ] No security vulnerabilities (no network calls after activation)

---

## Review Guidelines

When reviewing code:

1. **Security**: Ensure no network calls after activation
2. **Type Safety**: Check for proper TypeScript usage
3. **Error Handling**: Verify errors are handled appropriately
4. **Performance**: Look for unnecessary re-renders or computations
5. **Readability**: Code should be clear and self-documenting
6. **Testing**: New features should have tests

---

## Version History

- **v1.0** - Initial standards document (2024)

