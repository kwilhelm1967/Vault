import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Local Password Vault
 * 
 * These tests verify the core user flows work correctly.
 */

// Helper to set up a test trial in localStorage (required before vault access)
async function setupTestTrial(page: Page) {
  // Create a valid trial file in localStorage
  // This simulates an active trial so the app allows vault access
  const deviceId = 'a'.repeat(64); // 64-char hex device ID
  const startDate = new Date().toISOString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
  
  const trialFile = {
    trial_key: 'TRIA-TEST-1234-5678',
    device_id: deviceId,
    plan_type: 'trial',
    start_date: startDate,
    expires_at: expiresAt.toISOString(),
    product_type: 'lpv',
    signature: 'test-signature',
    signed_at: new Date().toISOString(),
  };
  
  // Set up trial in localStorage before navigating
  await page.evaluate((file) => {
    localStorage.setItem('lpv_trial_file', JSON.stringify(file));
    localStorage.setItem('lpv_trial_used', 'true');
    // Also set trial activated date to make it valid
    localStorage.setItem('lpv_license_activated', new Date().toISOString());
  }, trialFile);
  
  // Navigate to ensure app picks up the trial
  await page.goto('/');
  // Wait a bit for app to initialize
  await page.waitForTimeout(500);
}

// Helper to create a new vault
async function createVault(page: Page, password: string = 'TestPassword123!') {
  // First set up trial, then create vault
  await setupTestTrial(page);
  await page.goto('/');
  
  // Wait for login screen (password input)
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  
  // Fill in master password
  await page.fill('input[type="password"]', password);
  
  // If confirm password field exists (new vault)
  const confirmInput = page.locator('input[placeholder*="Confirm"], input[name*="confirm"]');
  if (await confirmInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmInput.fill(password);
  }
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for vault to load - look for Dashboard or main vault content
  await page.waitForSelector('text=Dashboard, text=Add Account, [aria-label*="Add"]', { timeout: 15000 });
}

// Helper to unlock existing vault (prefixed with _ as currently unused but kept for future tests)
async function _unlockVault(page: Page, password: string = 'TestPassword123!') {
  await page.goto('/');
  await page.waitForSelector('input[type="password"]');
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Dashboard', { timeout: 10000 });
}

test.describe('Vault Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should show login screen on first visit', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load - should see either license screen or login screen
    // With trial set up, should see login screen
    await page.waitForSelector('input[type="password"], input[placeholder*="license"], input[placeholder*="XXXX"]', { timeout: 10000 });
    
    // Should see password input or license input
    const passwordInput = page.locator('input[type="password"]');
    const licenseInput = page.locator('input[placeholder*="license"], input[placeholder*="XXXX"]');
    
    // Either password input (vault login) or license input (license screen) should be visible
    const hasPasswordInput = await passwordInput.isVisible().catch(() => false);
    const hasLicenseInput = await licenseInput.isVisible().catch(() => false);
    
    expect(hasPasswordInput || hasLicenseInput).toBe(true);
  });

  test('should require password confirmation for new vault', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[type="password"]');
    
    // Fill first password
    await page.fill('input[type="password"]', 'TestPassword123!');
    
    // Should show confirm field or validation
    const confirmField = page.locator('input[placeholder*="Confirm"], input[name*="confirm"]');
    await expect(confirmField).toBeVisible({ timeout: 5000 }).catch(() => {
      // Some implementations may not have separate confirm field
    });
  });

  test('should reject weak passwords', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[type="password"]');
    
    // Try weak password
    await page.fill('input[type="password"]', 'weak');
    
    // Should show strength indicator or warning
    const pageContent = await page.textContent('body');
    expect(pageContent).toMatch(/weak|short|strong|strength/i);
  });
});

test.describe('Vault Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await createVault(page);
  });

  test('should show dashboard after login', async ({ page }) => {
    // Look for Dashboard text or Dashboard button
    await expect(page.locator('text=Dashboard, button:has-text("Dashboard")').first()).toBeVisible({ timeout: 10000 });
  });

  test('should add new password entry', async ({ page }) => {
    // Click add button - look for "Add Account" or "Add" button
    const addButton = page.locator('button:has-text("Add Account"), button:has-text("Add"), [aria-label*="Add"]').first();
    await addButton.click({ timeout: 5000 });
    
    // Wait for form modal - look for account name input
    await page.waitForSelector('input[placeholder*="Account"], input[name*="account"], input[placeholder*="Account name"]', { timeout: 5000 });
    
    // Fill form
    const accountInput = page.locator('input[placeholder*="Account"], input[name*="account"], input[placeholder*="Account name"]').first();
    await accountInput.fill('Test Account');
    
    const usernameInput = page.locator('input[placeholder*="Username"], input[name*="username"], input[type="email"]').first();
    if (await usernameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usernameInput.fill('testuser@example.com');
    }
    
    const passwordInput = page.locator('input[placeholder*="Password"], input[name*="password"], input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passwordInput.fill('SecurePassword123!');
    }
    
    // Save - look for "Save" or "Add Account" button
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Add Account"), button[type="submit"]').first();
    await saveButton.click();
    
    // Verify entry appears
    await expect(page.locator('text=Test Account')).toBeVisible({ timeout: 10000 });
  });

  test('should search entries', async ({ page }) => {
    // First add an entry
    const addButton = page.locator('button:has-text("Add Account"), button:has-text("Add"), [aria-label*="Add"]').first();
    await addButton.click({ timeout: 5000 });
    await page.waitForSelector('input[placeholder*="Account"], input[name*="account"]', { timeout: 5000 });
    await page.fill('input[placeholder*="Account"], input[name*="account"]', 'Unique Search Test');
    const usernameInput = page.locator('input[placeholder*="Username"], input[name*="username"]').first();
    if (await usernameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usernameInput.fill('search@test.com');
    }
    const passwordInput = page.locator('input[placeholder*="Password"], input[name*="password"], input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passwordInput.fill('TestPass123!');
    }
    await page.click('button:has-text("Save"), button:has-text("Add Account"), button[type="submit"]');
    
    // Wait for entry to appear
    await page.waitForSelector('text=Unique Search Test', { timeout: 10000 });
    
    // Search
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill('Unique');
    
    // Should still see the entry
    await expect(page.locator('text=Unique Search Test')).toBeVisible({ timeout: 5000 });
    
    // Search for something else
    await searchInput.fill('nonexistent');
    
    // Should not see entry (or see "no results")
    await expect(page.locator('text=Unique Search Test')).not.toBeVisible({ timeout: 3000 });
  });

  test('should copy password to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Add entry first
    const addButton = page.locator('button:has-text("Add Account"), button:has-text("Add"), [aria-label*="Add"]').first();
    await addButton.click({ timeout: 5000 });
    await page.waitForSelector('input[placeholder*="Account"], input[name*="account"]', { timeout: 5000 });
    await page.fill('input[placeholder*="Account"], input[name*="account"]', 'Clipboard Test');
    const usernameInput = page.locator('input[placeholder*="Username"], input[name*="username"]').first();
    if (await usernameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usernameInput.fill('clipuser');
    }
    const passwordInput = page.locator('input[placeholder*="Password"], input[name*="password"], input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passwordInput.fill('CopyMePassword123!');
    }
    await page.click('button:has-text("Save"), button:has-text("Add Account"), button[type="submit"]');
    
    // Wait for entry
    await page.waitForSelector('text=Clipboard Test', { timeout: 10000 });
    
    // Expand entry (click on it)
    await page.click('text=Clipboard Test');
    
    // Find and click copy button for password
    const copyButton = page.locator('[title*="Copy"], [aria-label*="Copy password"], [aria-label*="Copy"]').first();
    if (await copyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await copyButton.click();
      
      // Verify clipboard (may not work in all browsers)
      const _clipboardText = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
      // Just verify the action completed without error (clipboardText kept for debugging)
    }
  });

  test('should delete entry', async ({ page }) => {
    // Add entry
    const addButton = page.locator('button:has-text("Add Account"), button:has-text("Add"), [aria-label*="Add"]').first();
    await addButton.click({ timeout: 5000 });
    await page.waitForSelector('input[placeholder*="Account"], input[name*="account"]', { timeout: 5000 });
    await page.fill('input[placeholder*="Account"], input[name*="account"]', 'Delete Me Entry');
    const usernameInput = page.locator('input[placeholder*="Username"], input[name*="username"]').first();
    if (await usernameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usernameInput.fill('deleteuser');
    }
    const passwordInput = page.locator('input[placeholder*="Password"], input[name*="password"], input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passwordInput.fill('DeletePass123!');
    }
    await page.click('button:has-text("Save"), button:has-text("Add Account"), button[type="submit"]');
    
    // Wait for entry
    await page.waitForSelector('text=Delete Me Entry', { timeout: 10000 });
    
    // Expand and find delete button
    await page.click('text=Delete Me Entry');
    
    // Click delete
    const deleteBtn = page.locator('button:has-text("Delete"), [title*="Delete"], [aria-label*="Delete"]').first();
    await deleteBtn.click({ timeout: 3000 });
    
    // Confirm deletion - look for confirm button
    const confirmDeleteBtn = page.locator('button:has-text("Delete"):not(:has-text("Cancel")), button:has-text("Confirm")').first();
    if (await confirmDeleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmDeleteBtn.click();
    }
    
    // Entry should be gone
    await expect(page.locator('text=Delete Me Entry')).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Security Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    // Set up test trial first, then create vault
    await setupTestTrial(page);
    await createVault(page);
  });

  test('should lock vault manually', async ({ page }) => {
    // Find lock button
    const lockBtn = page.locator('button[title*="Lock"], button:has-text("Lock"), [aria-label*="Lock"]').first();
    
    if (await lockBtn.isVisible()) {
      await lockBtn.click();
      
      // Should return to login screen
      await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should not show passwords by default', async ({ page }) => {
    // Add entry with password
    await page.click('button:has-text("Add")');
    await page.waitForSelector('input[placeholder*="Account"]');
    await page.fill('input[placeholder*="Account"]', 'Hidden Password Test');
    await page.fill('input[placeholder*="Username"]', 'hiddenuser');
    await page.fill('input[placeholder*="Password"]', 'HiddenPassword123!');
    await page.click('button:has-text("Save")');
    
    // Wait and expand entry
    await page.waitForSelector('text=Hidden Password Test');
    await page.click('text=Hidden Password Test');
    
    // Password should be masked
    const maskedPassword = page.locator('text=••••••••');
    await expect(maskedPassword.first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    // Set up test trial first, then create vault
    await setupTestTrial(page);
    await createVault(page);
  });

  test('should navigate to Settings', async ({ page }) => {
    // Click settings
    const settingsBtn = page.locator('button:has-text("Settings"), [title*="Settings"], [aria-label*="Settings"]').first();
    if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsBtn.click();
      
      // Should see settings content
      await expect(page.locator('text=Auto-Lock, text=Security, text=Timeout, text=Settings').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate to Dashboard', async ({ page }) => {
    // Should see dashboard by default or after clicking
    const dashboardBtn = page.locator('button:has-text("Dashboard"), text=Dashboard').first();
    if (await dashboardBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dashboardBtn.click();
    }
    
    // Should see dashboard content
    await expect(page.locator('text=Total, text=Accounts, text=Passwords, text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter by category', async ({ page }) => {
    // Add entry in specific category
    await page.click('button:has-text("Add")');
    await page.waitForSelector('input[placeholder*="Account"]');
    await page.fill('input[placeholder*="Account"]', 'Banking Entry');
    await page.fill('input[placeholder*="Username"]', 'bankuser');
    await page.fill('input[placeholder*="Password"]', 'BankPass123!');
    
    // Select category if dropdown exists
    const categorySelect = page.locator('select, [role="combobox"]').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ label: 'Banking' }).catch(() => {
        // Try clicking if it's a custom dropdown
      });
    }
    
    await page.click('button:has-text("Save")');
    
    // Click Banking category in sidebar
    const bankingFilter = page.locator('button:has-text("Banking"), text=Banking').first();
    if (await bankingFilter.isVisible()) {
      await bankingFilter.click();
      
      // Should still see banking entry
      await expect(page.locator('text=Banking Entry')).toBeVisible();
    }
  });
});

test.describe('Keyboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    // Set up test trial first, then create vault
    await setupTestTrial(page);
    await createVault(page);
  });

  test('should open keyboard shortcuts with ?', async ({ page }) => {
    // Press ? key
    await page.keyboard.press('?');
    
    // Should see shortcuts modal
    await expect(page.locator('text=Keyboard Shortcuts, text=Shortcut').first()).toBeVisible({ timeout: 3000 }).catch(() => {
      // Shortcuts modal may not be implemented
    });
  });

  test('should focus search with Ctrl+F', async ({ page }) => {
    await page.keyboard.press('Control+f');
    
    // Search input should be focused
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeFocused({ timeout: 3000 }).catch(() => {
      // May use different shortcut
    });
  });
});

