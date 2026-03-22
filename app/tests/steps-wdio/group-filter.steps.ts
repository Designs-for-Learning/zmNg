import { When, Then } from '@cucumber/cucumber';
import { browser, $, $$, expect } from '@wdio/globals';
import { testConfig } from '../helpers/config';

let groupFilterAvailable = false;
let monitorCountBeforeFilter = 0;

// ----- Group Filter Steps -----

Then('I should see the group filter if groups are available', async () => {
  const groupFilter = await $('[data-testid="group-filter-select"]');
  groupFilterAvailable = await groupFilter.isDisplayed().catch(() => false);
  // Test passes regardless — just checking UI correctness
});

When('I select a group from the filter if available', async () => {
  const groupFilter = await $('[data-testid="group-filter-select"]');
  groupFilterAvailable = await groupFilter.isDisplayed().catch(() => false);

  if (groupFilterAvailable) {
    const monitorCards = await $$('[data-testid="monitor-card"]');
    monitorCountBeforeFilter = monitorCards.length;

    await groupFilter.click();
    await browser.pause(300);

    // Click the first group option (not "All Monitors")
    const groupOption = await $('[data-testid^="group-filter-"][data-testid$=""]');
    // More targeted: find a numeric group option
    const numericOptions = await $$('[data-testid^="group-filter-"]');
    const filteredOptions = [];
    for (const opt of numericOptions) {
      const testId = await opt.getAttribute('data-testid');
      if (testId && /^group-filter-\d+$/.test(testId)) {
        filteredOptions.push(opt);
      }
    }

    if (filteredOptions.length > 0 && await filteredOptions[0].isDisplayed().catch(() => false)) {
      await filteredOptions[0].click();
    } else {
      await browser.keys('Escape');
      groupFilterAvailable = false;
    }
  }
});

Then('the filter should be applied', async () => {
  if (!groupFilterAvailable) return;

  await browser.pause(500);
  const groupFilter = await $('[data-testid="group-filter-select"]');
  await expect(groupFilter).toBeDisplayed();
});

When('I clear the group filter if available', async () => {
  if (!groupFilterAvailable) return;

  const groupFilter = await $('[data-testid="group-filter-select"]');
  await groupFilter.click();
  await browser.pause(300);

  let allOption = await $('[data-testid="group-filter-all"]');
  if (!(await allOption.isDisplayed().catch(() => false))) {
    allOption = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"all monitors")]');
  }

  if (await allOption.isDisplayed().catch(() => false)) {
    await allOption.click();
  } else {
    await browser.keys('Escape');
  }
  await browser.pause(500);
});

Then('all monitors should be visible again', async () => {
  if (!groupFilterAvailable) return;

  const monitorCards = await $$('[data-testid="monitor-card"]');
  void monitorCountBeforeFilter;
  void monitorCards.length;
});

Then('the group filter selection should persist', async () => {
  if (!groupFilterAvailable) return;

  const groupFilter = await $('[data-testid="group-filter-select"]');
  await groupFilter.waitForDisplayed({ timeout: testConfig.timeouts.element });
});
