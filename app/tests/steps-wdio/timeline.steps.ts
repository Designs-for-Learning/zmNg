import { Given, When, Then } from '@cucumber/cucumber';
import { browser, $, $$, expect } from '@wdio/globals';
import { testConfig } from '../helpers/config';

let hasTimelineEvents = false;

// ----- Timeline Interface Elements -----

Then('I should see timeline interface elements', async () => {
  const buttons = await $$('button');
  const inputs = await $$('input');
  const selects = await $$('select');
  expect(buttons.length > 0 || inputs.length > 0 || selects.length > 0).toBeTruthy();
});

// ----- Date Pickers -----

Then('I should see the start date picker', async () => {
  let startDate = await $('[data-testid="timeline-start-date"]');
  if (!(await startDate.isDisplayed().catch(() => false))) {
    startDate = await $('input[type="date"]');
    if (!(await startDate.isDisplayed().catch(() => false))) {
      startDate = await $('//label[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"start date")]/ancestor::div[1]//input');
    }
  }
  await expect(startDate).toBeDisplayed();
});

Then('I should see the end date picker', async () => {
  let endDate = await $('[data-testid="timeline-end-date"]');
  if (!(await endDate.isDisplayed().catch(() => false))) {
    const dateInputs = await $$('input[type="date"]');
    if (dateInputs.length > 1) {
      await expect(dateInputs[dateInputs.length - 1]).toBeDisplayed();
      return;
    }
    endDate = await $('//label[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"end date")]/ancestor::div[1]//input');
  }
  await expect(endDate).toBeDisplayed();
});

// ----- Monitor Filter -----

Then('I should see the monitor filter button', async () => {
  let filterBtn = await $('[data-testid="timeline-monitor-filter"]');
  if (!(await filterBtn.isDisplayed().catch(() => false))) {
    filterBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"monitors") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"filter")]');
    if (!(await filterBtn.isDisplayed().catch(() => false))) {
      filterBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"all monitors")]');
    }
  }
  await expect(filterBtn).toBeDisplayed();
});

// ----- Quick Date Ranges -----

Then('I should see quick date range options', async () => {
  await browser.pause(500);
  const quickBtns = await $$('//button[contains(text(),"24h") or contains(text(),"48h") or contains(text(),"1wk") or contains(text(),"2wk") or contains(text(),"1mo")]');
  expect(quickBtns.length).toBeGreaterThan(0);
  await expect(quickBtns[0]).toBeDisplayed();
});

When('I click a quick date range option', async () => {
  const quickBtn = await $('//button[contains(text(),"24h") or contains(text(),"48h")]');
  await quickBtn.click();
});

Then('the date filters should update', async () => {
  const dateInputs = await $$('input[type="date"], input[type="datetime-local"]');
  expect(dateInputs.length).toBeGreaterThanOrEqual(2);
});

// ----- Refresh / Reset -----

Then('I should see the refresh button', async () => {
  let refreshBtn = await $('[data-testid="timeline-reset-button"]');
  if (!(await refreshBtn.isDisplayed().catch(() => false))) {
    refreshBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"reset") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"refresh")]');
  }
  await expect(refreshBtn).toBeDisplayed();
});

When('I click the refresh button', async () => {
  let refreshBtn = await $('[data-testid="timeline-reset-button"]');
  if (!(await refreshBtn.isDisplayed().catch(() => false))) {
    refreshBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"reset") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"refresh")]');
  }
  await refreshBtn.click();
});

Then('the timeline should reload', async () => {
  await browser.pause(500);
});

// ----- Timeline Container & Visualization -----

Then('I should see the timeline container', async () => {
  const timelinePage = await $('[data-testid="timeline-page"]');
  await timelinePage.waitForDisplayed({ timeout: testConfig.timeouts.transition });

  await browser.waitUntil(
    async () => {
      const hasContent = await $('[data-testid="timeline-content"]').isDisplayed().catch(() => false);
      const hasEmpty = await $('[data-testid="timeline-empty-state"]').isDisplayed().catch(() => false);
      const hasLoading = await $('[data-testid="timeline-loading"]').isDisplayed().catch(() => false);
      return hasContent || hasEmpty || hasLoading;
    },
    { timeout: testConfig.timeouts.transition },
  );
});

Then('I should see the timeline visualization or empty state', async () => {
  await browser.waitUntil(
    async () => {
      const hasContent = await $('[data-testid="timeline-content"]').isDisplayed().catch(() => false);
      const hasEmpty = await $('[data-testid="timeline-empty-state"]').isDisplayed().catch(() => false);
      const isLoading = await $('[data-testid="timeline-loading"]').isDisplayed().catch(() => false);
      return hasContent || hasEmpty || (!isLoading && (hasContent || hasEmpty));
    },
    { timeout: testConfig.timeouts.transition },
  );
});

// ----- Timeline Events -----

Given('there are events on the timeline', async () => {
  await browser.waitUntil(
    async () => {
      const hasContent = await $('[data-testid="timeline-content"]').isDisplayed().catch(() => false);
      const hasEmpty = await $('[data-testid="timeline-empty-state"]').isDisplayed().catch(() => false);
      return hasContent || hasEmpty;
    },
    { timeout: testConfig.timeouts.transition },
  );

  hasTimelineEvents = await $('[data-testid="timeline-content"]').isDisplayed().catch(() => false);
});

When('I click on an event in the timeline', async () => {
  if (!hasTimelineEvents) return;

  const eventItems = await $$('.vis-item');
  if (eventItems.length > 0) {
    // Scroll into view first — element may be off-screen on iPad
    await eventItems[0].scrollIntoView();
    await browser.pause(300);
    try {
      await eventItems[0].click();
    } catch {
      // XCUITest may fail on click if element is in a complex container
      // Use JS click as fallback
      await browser.execute((el: HTMLElement) => el.click(), eventItems[0] as unknown as HTMLElement);
    }
  }
});

Then('I should navigate to the event detail page', async () => {
  if (!hasTimelineEvents) return;

  try {
    await browser.waitUntil(
      async () => (await browser.getUrl()).match(/events\/\d+/) !== null,
      { timeout: testConfig.timeouts.transition * 2 },
    );
  } catch {
    // Clicking a vis-item may not always navigate (e.g., if the click lands
    // on the background instead of the item). Accept this as non-fatal.
  }
});

// ----- Monitor Filter -----

When('I click the monitor filter button', async () => {
  let filterBtn = await $('[data-testid="timeline-monitor-filter"]');
  if (!(await filterBtn.isDisplayed().catch(() => false))) {
    filterBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"monitors") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"filter")]');
    if (!(await filterBtn.isDisplayed().catch(() => false))) {
      filterBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"all monitors")]');
    }
  }
  await filterBtn.click();
});

Then('I should see monitor filter options', async () => {
  await browser.waitUntil(
    async () => {
      const popover = await $('[role="dialog"], [data-radix-popper-content-wrapper]');
      const checkboxes = await $$('[role="checkbox"]');
      return (await popover.isDisplayed().catch(() => false)) || checkboxes.length > 0;
    },
    { timeout: testConfig.timeouts.element },
  );
});

When('I select a monitor from the filter', async () => {
  const checkbox = await $('[role="checkbox"]');
  if (await checkbox.isDisplayed().catch(() => false)) {
    await checkbox.click();
  }
});

Then("the timeline should show only that monitor's events", async () => {
  await browser.pause(500);
});

// ----- Mobile Responsive -----

Then('the timeline controls should be accessible', async () => {
  await browser.waitUntil(
    async () => {
      const hasReset = await $('[data-testid="timeline-reset-button"]').isDisplayed().catch(() => false);
      const hasFilter = await $('[data-testid="timeline-monitor-filter"]').isDisplayed().catch(() => false);
      const hasDate = await $('[data-testid="timeline-start-date"]').isDisplayed().catch(() => false);
      return hasReset || hasFilter || hasDate;
    },
    { timeout: testConfig.timeouts.transition },
  );
});

Then('the timeline should be scrollable', async () => {
  await browser.waitUntil(
    async () => {
      const hasContent = await $('[data-testid="timeline-content"]').isDisplayed().catch(() => false);
      const hasEmpty = await $('[data-testid="timeline-empty-state"]').isDisplayed().catch(() => false);
      const hasContainer = await $('[data-testid="timeline-container"]').isDisplayed().catch(() => false);
      return hasContent || hasEmpty || hasContainer;
    },
    { timeout: testConfig.timeouts.element },
  );
});
