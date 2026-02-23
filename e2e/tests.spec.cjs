const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:1420';
const API_URL = 'http://localhost:8000';

describe('VoiceCode E2E Tests', () => {
  
  test.beforeAll(async () => {
    // Wait for services to be ready
    await Promise.all([
      new Promise((resolve) => {
        const check = setInterval(() => {
          fetch(`${BASE_URL}`).then(() => {
            clearInterval(check);
            resolve();
          }).catch(() => {});
        }, 1000);
      }),
      new Promise((resolve) => {
        const check = setInterval(() => {
          fetch(`${API_URL}/health`).then(() => {
            clearInterval(check);
            resolve();
          }).catch(() => {});
        }, 1000);
      })
    ]);
  });

  test('1. Page loads with title', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/VoiceCode/);
  });

  test('2. Header displays VoiceCode', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('VoiceCode');
  });

  test('3. All navigation tabs visible', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByRole('button', { name: /Dictate/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Voices/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Commands/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Test/ })).toBeVisible();
  });

  test('4. Navigation between tabs works', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Click Voices tab
    await page.getByRole('button', { name: /Voices/ }).click();
    await expect(page.locator('h2')).toContainText('Voice Profiles');
    
    // Click Commands tab
    await page.getByRole('button', { name: /Commands/ }).click();
    await expect(page.locator('h2')).toContainText('Voice Commands');
    
    // Click Test tab
    await page.getByRole('button', { name: /Test/ }).click();
    await expect(page.locator('h2')).toContainText('Test Commands');
    
    // Click Dictate tab
    await page.getByRole('button', { name: /Dictate/ }).click();
    await expect(page.locator('h2')).toContainText('Voice Dictation');
  });

  test('5. Backend shows connected status', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10000 });
  });

  test('6. Health endpoint works', async () => {
    const response = await fetch(`${API_URL}/health`);
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('7. TTS voices endpoint works', async () => {
    const response = await fetch(`${API_URL}/tts/voices`);
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.voices)).toBe(true);
    expect(data.voices.length).toBeGreaterThan(0);
  });

  test('8. TTS generate works', async () => {
    const response = await fetch(`${API_URL}/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello world',
        voice: 'en-US-AriaNeural'
      })
    });
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toContain('audio');
  });

  test('9. Voice profiles endpoint works', async () => {
    const response = await fetch(`${API_URL}/voice-profiles`);
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('10. Voice presets endpoint works', async () => {
    const response = await fetch(`${API_URL}/voice/presets`);
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.presets)).toBe(true);
  });

  test('11. Commands endpoint works', async () => {
    const response = await fetch(`${API_URL}/commands`);
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('12. Command templates endpoint works', async () => {
    const response = await fetch(`${API_URL}/commands/templates`);
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.templates)).toBe(true);
  });

  test('13. Create command works', async () => {
    const response = await fetch(`${API_URL}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger: 'test cmd',
        action_type: 'insert_text',
        action_config: { text: 'Hello' },
        category: 'test',
        enabled: true
      })
    });
    expect(response.ok).toBe(true);
  });

  test('14. Execute command works', async () => {
    const response = await fetch(`${API_URL}/commands/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'test cmd' })
    });
    expect(response.ok).toBe(true);
  });

  test('15. Settings endpoint works', async () => {
    const response = await fetch(`${API_URL}/settings`);
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('stt_provider');
    expect(data).toHaveProperty('tts_voice');
  });

  test('16. Update settings works', async () => {
    const response = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stt_provider: 'local', tts_speed: 1.0 })
    });
    expect(response.ok).toBe(true);
  });

  test('17. Voice button visible', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('.voice-button')).toBeVisible();
  });

  test('18. Dictation textarea visible', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('textarea')).toBeVisible();
  });
});
