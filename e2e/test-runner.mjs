import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:1420';
const API_URL = 'http://localhost:8000';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`❌ ${name}: ${e.message}`);
  }
}

async function runTests() {
  console.log('🧪 Running VoiceCode E2E Tests...\n');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('⏳ Waiting for services...');
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  
  const healthRes = await fetch(`${API_URL}/health`);
  if (!healthRes.ok) throw new Error('Backend not ready');
  console.log('✅ Services ready\n');

  // UI Tests
  await test('1. Page loads with VoiceCode title', async () => {
    const title = await page.title();
    if (!title.includes('VoiceCode')) throw new Error(`Title is "${title}"`);
  });

  await test('2. Header displays VoiceCode', async () => {
    const h1 = await page.locator('h1').textContent();
    if (!h1.includes('VoiceCode')) throw new Error(`Header is "${h1}"`);
  });

  await test('3. All navigation tabs visible', async () => {
    const dictate = page.getByRole('button', { name: /Dictate/ });
    if (!(await dictate.isVisible())) throw new Error('Dictate tab not visible');
  });

  await test('4. Navigate to Voices tab', async () => {
    await page.getByRole('button', { name: /Voices/ }).click();
    await page.waitForTimeout(500);
    const h2 = await page.locator('h2').textContent();
    if (!h2.includes('Voice Profiles')) throw new Error(`Not on Voices page`);
  });

  await test('5. Navigate to Commands tab', async () => {
    await page.getByRole('button', { name: /Commands/ }).click();
    await page.waitForTimeout(500);
    const h2 = await page.locator('h2').textContent();
    if (!h2.includes('Voice Commands')) throw new Error(`Not on Commands page`);
  });

  await test('6. Navigate to Test tab', async () => {
    await page.getByRole('button', { name: /Test/ }).click();
    await page.waitForTimeout(500);
    const h2 = await page.locator('h2').textContent();
    if (!h2.includes('Test Commands')) throw new Error(`Not on Test page`);
  });

  await test('7. Navigate back to Dictate', async () => {
    await page.getByRole('button', { name: /Dictate/ }).click();
    await page.waitForTimeout(500);
    const h2 = await page.locator('h2').textContent();
    if (!h2.includes('Voice Dictation')) throw new Error(`Not on Dictate page`);
  });

  await test('8. Backend shows Connected', async () => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
    const connected = await page.getByText('Connected').isVisible();
    if (!connected) throw new Error('Backend not connected');
  });

  await test('9. Voice button visible', async () => {
    const btn = page.locator('button.voice-button');
    if (!(await btn.isVisible())) throw new Error('Voice button not visible');
  });

  // API Tests
  await test('10. Health endpoint works', async () => {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'healthy') throw new Error(`Status is ${data.status}`);
  });

  await test('11. TTS voices endpoint works', async () => {
    const res = await fetch(`${API_URL}/tts/voices`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    // Returns {"voices": {"en-US": [...], "en-GB": [...]}}
    if (!data.voices || typeof data.voices !== 'object') throw new Error('No voices');
    if (Object.keys(data.voices).length === 0) throw new Error('No voices available');
  });

  await test('12. TTS generate works', async () => {
    const res = await fetch(`${API_URL}/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello', voice: 'en-US-AriaNeural' })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    // Returns {"audio_base64": "...", "duration_ms": ...}
    if (!data.audio_base64) throw new Error('No audio returned');
  });

  await test('13. Voice profiles endpoint works', async () => {
    const res = await fetch(`${API_URL}/voice-profiles`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Not array');
  });

  await test('14. Voice presets endpoint works', async () => {
    const res = await fetch(`${API_URL}/voice/presets`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.presets) throw new Error('No presets');
  });

  await test('15. Commands endpoint works', async () => {
    const res = await fetch(`${API_URL}/commands`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('16. Command templates works', async () => {
    const res = await fetch(`${API_URL}/commands/templates`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Not array');
  });

  await test('17. Create command works', async () => {
    const res = await fetch(`${API_URL}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger: 'test e2e',
        action_type: 'insert_text',
        action_data: { text: 'Hello E2E' },
        is_active: true
      })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('18. Execute command works', async () => {
    const res = await fetch(`${API_URL}/commands/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'test e2e' })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('19. Settings endpoint works', async () => {
    const res = await fetch(`${API_URL}/settings`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.stt_provider) throw new Error('No stt_provider');
  });

  await test('20. Update settings works', async () => {
    const res = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stt_provider: 'local', tts_speed: 1.0 })
    });
     if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // Summary
  console.log('\n========================================');
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  await browser.close();
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
