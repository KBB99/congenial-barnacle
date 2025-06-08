import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('World Creation E2E Tests', () => {
  let browser: Browser;
  let page: Page;
  const baseURL = process.env.FRONTEND_URL || 'http://localhost:3000';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      slowMo: 50,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('User can create a new world through the dashboard', async () => {
    // Navigate to the dashboard
    await page.goto(baseURL);
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

    // Click the "Create World" button
    await page.click('[data-testid="create-world-button"]');
    await page.waitForSelector('[data-testid="create-world-modal"]');

    // Fill in world details
    await page.type('[data-testid="world-name-input"]', 'E2E Test World');
    await page.type('[data-testid="world-description-input"]', 'A world created during E2E testing');

    // Set world size
    await page.click('[data-testid="world-size-medium"]');

    // Add a location
    await page.click('[data-testid="add-location-button"]');
    await page.type('[data-testid="location-name-input"]', 'Test Plaza');
    await page.select('[data-testid="location-type-select"]', 'public');

    // Create the world
    await page.click('[data-testid="create-world-submit"]');

    // Wait for world creation to complete
    await page.waitForSelector('[data-testid="world-created-success"]', { timeout: 15000 });

    // Verify we're redirected to the world view
    await page.waitForSelector('[data-testid="world-viewer"]', { timeout: 10000 });

    // Verify world name is displayed
    const worldTitle = await page.textContent('[data-testid="world-title"]');
    expect(worldTitle).toContain('E2E Test World');

    // Verify the location appears on the map
    await page.waitForSelector('[data-testid="location-Test Plaza"]', { timeout: 5000 });
  }, 60000);

  test('User can edit world settings', async () => {
    // Assuming we're still on the world page from the previous test
    await page.click('[data-testid="world-settings-button"]');
    await page.waitForSelector('[data-testid="world-settings-modal"]');

    // Change world description
    await page.fill('[data-testid="world-description-input"]', 'Updated description for E2E testing');

    // Change time speed
    await page.click('[data-testid="time-speed-2x"]');

    // Save changes
    await page.click('[data-testid="save-world-settings"]');

    // Wait for success message
    await page.waitForSelector('[data-testid="settings-saved-success"]', { timeout: 5000 });

    // Verify time speed indicator shows 2x
    const timeSpeedIndicator = await page.textContent('[data-testid="time-speed-indicator"]');
    expect(timeSpeedIndicator).toContain('2x');
  }, 30000);

  test('User can delete a world', async () => {
    // Go back to dashboard
    await page.click('[data-testid="back-to-dashboard"]');
    await page.waitForSelector('[data-testid="dashboard"]');

    // Find the world we created
    await page.waitForSelector('[data-testid="world-card-E2E Test World"]');

    // Click the delete button
    await page.click('[data-testid="delete-world-E2E Test World"]');

    // Confirm deletion
    await page.waitForSelector('[data-testid="confirm-delete-modal"]');
    await page.click('[data-testid="confirm-delete-button"]');

    // Wait for deletion to complete
    await page.waitForSelector('[data-testid="world-deleted-success"]', { timeout: 10000 });

    // Verify the world is no longer in the list
    const worldCard = await page.$('[data-testid="world-card-E2E Test World"]');
    expect(worldCard).toBeNull();
  }, 30000);

  test('User can navigate between different views', async () => {
    // Test navigation to different sections
    await page.click('[data-testid="nav-worlds"]');
    await page.waitForSelector('[data-testid="worlds-list"]');

    await page.click('[data-testid="nav-agents"]');
    await page.waitForSelector('[data-testid="agents-list"]');

    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForSelector('[data-testid="dashboard"]');
  }, 20000);

  test('Error handling for invalid world creation', async () => {
    // Try to create a world with invalid data
    await page.click('[data-testid="create-world-button"]');
    await page.waitForSelector('[data-testid="create-world-modal"]');

    // Leave name empty and try to submit
    await page.click('[data-testid="create-world-submit"]');

    // Verify error message appears
    await page.waitForSelector('[data-testid="world-name-error"]');
    const errorMessage = await page.textContent('[data-testid="world-name-error"]');
    expect(errorMessage).toContain('required');

    // Close modal
    await page.click('[data-testid="close-modal"]');
  }, 15000);
});