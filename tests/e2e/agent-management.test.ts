import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('Agent Management E2E Tests', () => {
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

    // Create a test world first
    await page.goto(baseURL);
    await page.waitForSelector('[data-testid="dashboard"]');
    await page.click('[data-testid="create-world-button"]');
    await page.waitForSelector('[data-testid="create-world-modal"]');
    await page.type('[data-testid="world-name-input"]', 'Agent Test World');
    await page.type('[data-testid="world-description-input"]', 'World for testing agents');
    await page.click('[data-testid="create-world-submit"]');
    await page.waitForSelector('[data-testid="world-viewer"]', { timeout: 15000 });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('User can spawn a new agent in the world', async () => {
    // Click the spawn agent button
    await page.click('[data-testid="spawn-agent-button"]');
    await page.waitForSelector('[data-testid="spawn-agent-modal"]');

    // Fill in agent details
    await page.type('[data-testid="agent-name-input"]', 'Test Agent Alice');
    await page.type('[data-testid="agent-description-input"]', 'A friendly test agent');

    // Set personality traits
    await page.click('[data-testid="trait-friendly"]');
    await page.click('[data-testid="trait-curious"]');
    await page.click('[data-testid="trait-helpful"]');

    // Set occupation
    await page.select('[data-testid="agent-occupation-select"]', 'explorer');

    // Set age
    await page.type('[data-testid="agent-age-input"]', '25');

    // Click on the map to set position
    await page.click('[data-testid="world-canvas"]', { offset: { x: 400, y: 300 } });

    // Submit agent creation
    await page.click('[data-testid="spawn-agent-submit"]');

    // Wait for agent to appear
    await page.waitForSelector('[data-testid="agent-Test Agent Alice"]', { timeout: 10000 });

    // Verify agent appears in the agent list
    await page.click('[data-testid="agent-inspector-toggle"]');
    await page.waitForSelector('[data-testid="agent-list"]');
    
    const agentListItem = await page.textContent('[data-testid="agent-list-item-Test Agent Alice"]');
    expect(agentListItem).toContain('Test Agent Alice');
  }, 45000);

  test('User can interact with an agent through chat', async () => {
    // Click on the agent to select it
    await page.click('[data-testid="agent-Test Agent Alice"]');
    await page.waitForSelector('[data-testid="agent-details-panel"]');

    // Open chat interface
    await page.click('[data-testid="chat-with-agent-button"]');
    await page.waitForSelector('[data-testid="chat-interface"]');

    // Send a message to the agent
    const testMessage = 'Hello! How are you feeling today?';
    await page.type('[data-testid="chat-input"]', testMessage);
    await page.click('[data-testid="send-message-button"]');

    // Wait for agent response
    await page.waitForSelector('[data-testid="agent-response"]', { timeout: 15000 });

    // Verify the message appears in chat history
    const chatHistory = await page.textContent('[data-testid="chat-history"]');
    expect(chatHistory).toContain(testMessage);

    // Verify agent responded
    const agentResponse = await page.textContent('[data-testid="agent-response"]');
    expect(agentResponse.length).toBeGreaterThan(0);
  }, 30000);

  test('User can view agent memory and reflections', async () => {
    // Open memory browser
    await page.click('[data-testid="view-agent-memory-button"]');
    await page.waitForSelector('[data-testid="memory-browser"]');

    // Check if memories are displayed
    await page.waitForSelector('[data-testid="memory-list"]');
    const memoryItems = await page.$$('[data-testid^="memory-item-"]');
    expect(memoryItems.length).toBeGreaterThan(0);

    // Click on a memory to view details
    await page.click('[data-testid^="memory-item-"]');
    await page.waitForSelector('[data-testid="memory-details"]');

    // Check memory importance score
    const importanceScore = await page.textContent('[data-testid="memory-importance"]');
    expect(importanceScore).toBeDefined();

    // Switch to reflections tab
    await page.click('[data-testid="reflections-tab"]');
    await page.waitForSelector('[data-testid="reflections-list"]');
  }, 25000);

  test('User can view and modify agent plans', async () => {
    // Open plans view
    await page.click('[data-testid="view-agent-plans-button"]');
    await page.waitForSelector('[data-testid="plans-browser"]');

    // Check if plans are displayed
    const planItems = await page.$$('[data-testid^="plan-item-"]');
    
    if (planItems.length > 0) {
      // Click on a plan to view details
      await page.click('[data-testid^="plan-item-"]');
      await page.waitForSelector('[data-testid="plan-details"]');

      // Check plan steps
      const planSteps = await page.$$('[data-testid^="plan-step-"]');
      expect(planSteps.length).toBeGreaterThan(0);
    }

    // Add a new goal for the agent
    await page.click('[data-testid="add-goal-button"]');
    await page.waitForSelector('[data-testid="add-goal-modal"]');
    
    await page.type('[data-testid="goal-input"]', 'Explore the northern area of the world');
    await page.click('[data-testid="add-goal-submit"]');

    // Wait for new plan to be generated
    await page.waitForSelector('[data-testid="plan-generated-success"]', { timeout: 10000 });
  }, 30000);

  test('User can move agent to different locations', async () => {
    // Close any open panels
    await page.click('[data-testid="close-panels-button"]');

    // Right-click on the map to open context menu
    await page.click('[data-testid="world-canvas"]', { 
      button: 'right',
      offset: { x: 600, y: 400 }
    });

    // Select "Move agent here" option
    await page.waitForSelector('[data-testid="context-menu"]');
    await page.click('[data-testid="move-agent-here"]');

    // Wait for agent to move
    await page.waitForTimeout(2000);

    // Verify agent position changed
    const agentElement = await page.$('[data-testid="agent-Test Agent Alice"]');
    const boundingBox = await agentElement?.boundingBox();
    expect(boundingBox?.x).toBeGreaterThan(500); // Approximate new position
  }, 20000);

  test('User can delete an agent', async () => {
    // Select the agent
    await page.click('[data-testid="agent-Test Agent Alice"]');
    await page.waitForSelector('[data-testid="agent-details-panel"]');

    // Click delete agent button
    await page.click('[data-testid="delete-agent-button"]');

    // Confirm deletion
    await page.waitForSelector('[data-testid="confirm-delete-agent-modal"]');
    await page.click('[data-testid="confirm-delete-agent-button"]');

    // Wait for deletion to complete
    await page.waitForSelector('[data-testid="agent-deleted-success"]', { timeout: 10000 });

    // Verify agent is no longer visible
    const agentElement = await page.$('[data-testid="agent-Test Agent Alice"]');
    expect(agentElement).toBeNull();

    // Verify agent is removed from agent list
    await page.click('[data-testid="agent-inspector-toggle"]');
    const agentListItem = await page.$('[data-testid="agent-list-item-Test Agent Alice"]');
    expect(agentListItem).toBeNull();
  }, 25000);

  test('Error handling for invalid agent creation', async () => {
    // Try to create an agent with missing required fields
    await page.click('[data-testid="spawn-agent-button"]');
    await page.waitForSelector('[data-testid="spawn-agent-modal"]');

    // Leave name empty and try to submit
    await page.click('[data-testid="spawn-agent-submit"]');

    // Verify error message appears
    await page.waitForSelector('[data-testid="agent-name-error"]');
    const errorMessage = await page.textContent('[data-testid="agent-name-error"]');
    expect(errorMessage).toContain('required');

    // Close modal
    await page.click('[data-testid="close-modal"]');
  }, 15000);
});