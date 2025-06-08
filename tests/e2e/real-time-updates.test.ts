import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('Real-time Updates E2E Tests', () => {
  let browser: Browser;
  let page1: Page;
  let page2: Page;
  const baseURL = process.env.FRONTEND_URL || 'http://localhost:3000';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      slowMo: 50,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create two pages to simulate multiple users
    page1 = await browser.newPage();
    page2 = await browser.newPage();
    
    await page1.setViewport({ width: 1280, height: 720 });
    await page2.setViewport({ width: 1280, height: 720 });

    // Create a test world on page1
    await page1.goto(baseURL);
    await page1.waitForSelector('[data-testid="dashboard"]');
    await page1.click('[data-testid="create-world-button"]');
    await page1.waitForSelector('[data-testid="create-world-modal"]');
    await page1.type('[data-testid="world-name-input"]', 'Real-time Test World');
    await page1.type('[data-testid="world-description-input"]', 'World for testing real-time updates');
    await page1.click('[data-testid="create-world-submit"]');
    await page1.waitForSelector('[data-testid="world-viewer"]', { timeout: 15000 });

    // Get the world URL and navigate page2 to the same world
    const worldUrl = page1.url();
    await page2.goto(worldUrl);
    await page2.waitForSelector('[data-testid="world-viewer"]', { timeout: 10000 });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('Agent spawning is synchronized across multiple clients', async () => {
    // Spawn an agent on page1
    await page1.click('[data-testid="spawn-agent-button"]');
    await page1.waitForSelector('[data-testid="spawn-agent-modal"]');
    await page1.type('[data-testid="agent-name-input"]', 'Sync Test Agent');
    await page1.type('[data-testid="agent-description-input"]', 'Agent for sync testing');
    await page1.click('[data-testid="world-canvas"]', { offset: { x: 400, y: 300 } });
    await page1.click('[data-testid="spawn-agent-submit"]');

    // Wait for agent to appear on page1
    await page1.waitForSelector('[data-testid="agent-Sync Test Agent"]', { timeout: 10000 });

    // Verify agent appears on page2 via real-time updates
    await page2.waitForSelector('[data-testid="agent-Sync Test Agent"]', { timeout: 15000 });

    // Verify agent appears in agent list on page2
    await page2.click('[data-testid="agent-inspector-toggle"]');
    await page2.waitForSelector('[data-testid="agent-list-item-Sync Test Agent"]', { timeout: 5000 });
  }, 45000);

  test('Agent movement is synchronized across clients', async () => {
    // Move agent on page1
    await page1.click('[data-testid="agent-Sync Test Agent"]');
    await page1.waitForSelector('[data-testid="agent-details-panel"]');
    
    // Right-click to move agent
    await page1.click('[data-testid="world-canvas"]', { 
      button: 'right',
      offset: { x: 600, y: 500 }
    });
    await page1.waitForSelector('[data-testid="context-menu"]');
    await page1.click('[data-testid="move-agent-here"]');

    // Wait for movement animation to complete
    await page1.waitForTimeout(3000);

    // Verify agent position updated on page2
    await page2.waitForTimeout(2000); // Allow time for real-time update
    const agentElement2 = await page2.$('[data-testid="agent-Sync Test Agent"]');
    const boundingBox2 = await agentElement2?.boundingBox();
    expect(boundingBox2?.x).toBeGreaterThan(500); // Verify new position
  }, 30000);

  test('Chat messages are synchronized across clients', async () => {
    // Send message from page1
    await page1.click('[data-testid="agent-Sync Test Agent"]');
    await page1.waitForSelector('[data-testid="agent-details-panel"]');
    await page1.click('[data-testid="chat-with-agent-button"]');
    await page1.waitForSelector('[data-testid="chat-interface"]');

    const testMessage = 'Hello from page 1!';
    await page1.type('[data-testid="chat-input"]', testMessage);
    await page1.click('[data-testid="send-message-button"]');

    // Wait for agent response on page1
    await page1.waitForSelector('[data-testid="agent-response"]', { timeout: 15000 });

    // Check if chat is visible on page2
    await page2.click('[data-testid="agent-Sync Test Agent"]');
    await page2.waitForSelector('[data-testid="agent-details-panel"]');
    await page2.click('[data-testid="chat-with-agent-button"]');
    await page2.waitForSelector('[data-testid="chat-interface"]');

    // Verify message appears in chat history on page2
    const chatHistory2 = await page2.textContent('[data-testid="chat-history"]');
    expect(chatHistory2).toContain(testMessage);
  }, 40000);

  test('Time control changes are synchronized', async () => {
    // Change time speed on page1
    await page1.click('[data-testid="time-controls-toggle"]');
    await page1.waitForSelector('[data-testid="time-controls-panel"]');
    await page1.click('[data-testid="time-speed-2x"]');

    // Wait for update to propagate
    await page1.waitForTimeout(2000);

    // Verify time speed indicator on page2
    await page2.click('[data-testid="time-controls-toggle"]');
    await page2.waitForSelector('[data-testid="time-controls-panel"]');
    
    const timeSpeedIndicator2 = await page2.textContent('[data-testid="time-speed-indicator"]');
    expect(timeSpeedIndicator2).toContain('2x');

    // Pause simulation on page1
    await page1.click('[data-testid="pause-simulation-button"]');
    await page1.waitForTimeout(2000);

    // Verify pause state on page2
    const pauseButton2 = await page2.$('[data-testid="resume-simulation-button"]');
    expect(pauseButton2).toBeTruthy(); // Should show resume button when paused
  }, 25000);

  test('Agent memory updates are synchronized', async () => {
    // Trigger memory creation by sending multiple messages
    const messages = [
      'I love exploring new places',
      'The weather is beautiful today',
      'I wonder what adventures await'
    ];

    for (const message of messages) {
      await page1.type('[data-testid="chat-input"]', message);
      await page1.click('[data-testid="send-message-button"]');
      await page1.waitForTimeout(2000);
    }

    // Wait for memories to be processed
    await page1.waitForTimeout(5000);

    // Check memory on page1
    await page1.click('[data-testid="view-agent-memory-button"]');
    await page1.waitForSelector('[data-testid="memory-browser"]');
    const memoryItems1 = await page1.$$('[data-testid^="memory-item-"]');
    const memoryCount1 = memoryItems1.length;

    // Check memory on page2
    await page2.click('[data-testid="view-agent-memory-button"]');
    await page2.waitForSelector('[data-testid="memory-browser"]');
    
    // Wait for memory sync
    await page2.waitForTimeout(3000);
    const memoryItems2 = await page2.$$('[data-testid^="memory-item-"]');
    const memoryCount2 = memoryItems2.length;

    expect(memoryCount2).toBe(memoryCount1);
  }, 45000);

  test('Connection recovery after network interruption', async () => {
    // Simulate network interruption by going offline
    await page2.setOfflineMode(true);
    await page2.waitForTimeout(2000);

    // Try to perform an action while offline
    await page1.click('[data-testid="world-canvas"]', { 
      button: 'right',
      offset: { x: 300, y: 200 }
    });
    await page1.click('[data-testid="move-agent-here"]');
    await page1.waitForTimeout(2000);

    // Reconnect page2
    await page2.setOfflineMode(false);
    await page2.waitForTimeout(3000);

    // Verify page2 receives the missed updates
    const agentElement2 = await page2.$('[data-testid="agent-Sync Test Agent"]');
    const boundingBox2 = await agentElement2?.boundingBox();
    expect(boundingBox2?.x).toBeLessThan(400); // Should reflect the new position
  }, 30000);

  test('Multiple agent interactions are properly synchronized', async () => {
    // Spawn a second agent on page2
    await page2.click('[data-testid="spawn-agent-button"]');
    await page2.waitForSelector('[data-testid="spawn-agent-modal"]');
    await page2.type('[data-testid="agent-name-input"]', 'Second Sync Agent');
    await page2.type('[data-testid="agent-description-input"]', 'Second agent for sync testing');
    await page2.click('[data-testid="world-canvas"]', { offset: { x: 200, y: 200 } });
    await page2.click('[data-testid="spawn-agent-submit"]');

    // Wait for second agent to appear on both pages
    await page2.waitForSelector('[data-testid="agent-Second Sync Agent"]', { timeout: 10000 });
    await page1.waitForSelector('[data-testid="agent-Second Sync Agent"]', { timeout: 15000 });

    // Verify both agents are visible on both pages
    const agents1 = await page1.$$('[data-testid^="agent-"]');
    const agents2 = await page2.$$('[data-testid^="agent-"]');
    
    expect(agents1.length).toBe(2);
    expect(agents2.length).toBe(2);
  }, 40000);
});