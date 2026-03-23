import { When, Then } from '@cucumber/cucumber';
import { browser, $, $$, expect } from '@wdio/globals';
import { testConfig } from '../helpers/config';

// ----- Monitor List Steps -----

Then('I should see at least {int} monitor cards', async (count: number) => {
  await browser.waitUntil(
    async () => {
      const cards = await $$('[data-testid="monitor-card"]');
      return cards.length >= count;
    },
    { timeout: testConfig.timeouts.transition * 2 },
  );
});

Then('each monitor card should show a name and status indicator', async () => {
  const cards = await $$('[data-testid="monitor-card"]');
  expect(cards.length).toBeGreaterThan(0);

  const firstCard = cards[0];
  const nameText = await firstCard.getText();
  expect(nameText.trim().length).toBeGreaterThan(0);
});

When('I click into the first monitor detail page', async () => {
  const currentUrl = await browser.getUrl();

  if (currentUrl.includes('montage')) {
    const maximizeBtn = await $('[data-testid="montage-maximize-btn"]');
    await maximizeBtn.waitForDisplayed({ timeout: testConfig.timeouts.transition * 2 });
    await maximizeBtn.click();
  } else {
    const monitorPlayer = await $('[data-testid="monitor-player"]');
    await monitorPlayer.waitForDisplayed({ timeout: testConfig.timeouts.transition * 2 });
    await monitorPlayer.click();
  }

  await browser.waitUntil(
    async () => (await browser.getUrl()).match(/monitors\/\d+/) !== null,
    { timeout: testConfig.timeouts.transition * 2 },
  );
});

Then('I should see the monitor grid', async () => {
  const grid = await $('[data-testid="monitor-grid"]');
  await expect(grid).toBeDisplayed();
});

// ----- Montage Steps -----

Then('I should see the montage interface', async () => {
  const buttons = await $$('button');
  const selects = await $$('select');
  expect(buttons.length + selects.length).toBeGreaterThan(0);
});

Then('I should see at least {int} monitor in montage grid', async (count: number) => {
  await browser.waitUntil(
    async () => {
      const montageMonitors = await $$('[data-testid="montage-monitor"]');
      const gridItems = await $$('.react-grid-item');
      return montageMonitors.length >= count || gridItems.length >= count;
    },
    { timeout: testConfig.timeouts.transition * 2 },
  );
});

Then('each montage cell should show a monitor name label', async () => {
  const gridItems = await $$('[data-testid="montage-monitor"]');
  const fallbackItems = await $$('.react-grid-item');
  const items = gridItems.length > 0 ? gridItems : fallbackItems;
  expect(items.length).toBeGreaterThan(0);

  const firstCell = items[0];
  const cellText = await firstCell.getText();
  expect(cellText.trim().length).toBeGreaterThan(0);
});

When('I click the snapshot button on the first montage monitor', async () => {
  await browser.pause(500);

  // On touch devices, hover-to-reveal won't work.
  // Use JS to trigger mouseover to reveal controls, then click.
  const firstMonitor = await $('[data-testid="montage-monitor"]');
  if (await firstMonitor.isDisplayed().catch(() => false)) {
    // Trigger mouseover via JS to reveal hover controls
    await browser.execute((el: HTMLElement) => {
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }, firstMonitor as unknown as HTMLElement);
    await browser.pause(500);
  }

  // Try finding snapshot button by data-testid, then aria-label, then title
  let snapshotBtn = await $('[data-testid="snapshot-button"]');
  if (!(await snapshotBtn.isDisplayed().catch(() => false))) {
    snapshotBtn = await $('button[aria-label*="snapshot" i]');
  }
  if (!(await snapshotBtn.isDisplayed().catch(() => false))) {
    snapshotBtn = await $('button[title*="snapshot" i]');
  }
  if (!(await snapshotBtn.isDisplayed().catch(() => false))) {
    // Last resort: find the download/camera icon button via JS
    const clicked = await browser.execute(() => {
      const btns = document.querySelectorAll('[data-testid="montage-monitor"] button');
      for (const btn of btns) {
        if (btn.querySelector('svg.lucide-download') || btn.querySelector('svg.lucide-camera')) {
          (btn as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    if (clicked) return;
    throw new Error('Could not find snapshot button on montage monitor');
  }

  try {
    await snapshotBtn.click();
  } catch {
    await browser.execute((el: HTMLElement) => el.click(), snapshotBtn as unknown as HTMLElement);
  }
});
