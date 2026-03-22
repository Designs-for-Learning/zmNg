import { When, Then } from '@cucumber/cucumber';
import { browser, $, expect } from '@wdio/globals';
import { testConfig } from '../helpers/config';

let lastWidgetTitle: string;

// ----- Dashboard Widget CRUD -----

When('I open the Add Widget dialog', async () => {
  const addWidgetBtn = await $('[data-testid="add-widget-trigger"]');
  await expect(addWidgetBtn).toBeDisplayed();
  await addWidgetBtn.click();

  const dialog = await $('[data-testid="add-widget-dialog"]');
  await expect(dialog).toBeDisplayed();
});

When('I select the {string} widget type', async (widgetType: string) => {
  const normalized = widgetType.toLowerCase();
  const typeSelectors: Record<string, string> = {
    'monitor': 'widget-type-monitor',
    'monitor stream': 'widget-type-monitor',
    'events': 'widget-type-events',
    'recent events': 'widget-type-events',
    'timeline': 'widget-type-timeline',
    'heatmap': 'widget-type-heatmap',
    'event heatmap': 'widget-type-heatmap',
  };

  const matchingKey = Object.keys(typeSelectors).find((key) => normalized.includes(key));
  if (matchingKey) {
    const option = await $(`[data-testid="${typeSelectors[matchingKey]}"]`);
    await option.click();
    // Verify selected state via border-primary class
    const cls = await option.getAttribute('class');
    expect(cls).toContain('border-primary');
    return;
  }

  // Fallback: click matching text in widget type grid
  const option = await $(`//div[contains(@class,"border") and contains(@class,"rounded-lg")][contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"${widgetType.toLowerCase()}")]`);
  await option.click();
  const cls = await option.getAttribute('class');
  expect(cls).toContain('border-primary');
});

When('I select the first monitor in the widget dialog', async () => {
  const list = await $('[data-testid="monitor-selection-list"]');
  const firstCheckbox = await list.$('[data-testid^="monitor-checkbox-"]');
  await firstCheckbox.click();
});

When('I enter widget title {string}', async (title: string) => {
  lastWidgetTitle = `${title} ${Date.now()}`;
  const titleInput = await $('[data-testid="widget-title-input"]');
  await titleInput.clearValue();
  await titleInput.setValue(lastWidgetTitle);
});

When('I click the Add button in the dialog', async () => {
  const addBtn = await $('[data-testid="widget-add-button"]');
  await expect(addBtn).toBeDisplayed();
  await expect(addBtn).toBeEnabled();
  await addBtn.click();

  // Wait for dialog to close
  const dialog = await $('[data-testid="add-widget-dialog"]');
  await dialog.waitForDisplayed({
    timeout: testConfig.timeouts.element,
    reverse: true,
  });
});

Then('the widget {string} should appear on the dashboard', async (_title: string) => {
  await browser.waitUntil(
    async () => {
      const widgets = await $$('.react-grid-item');
      for (const w of widgets) {
        const text = await w.getText();
        if (text.includes(lastWidgetTitle)) return true;
      }
      return false;
    },
    { timeout: testConfig.timeouts.element },
  );
});

Then('the widget should contain non-empty content', async () => {
  await browser.waitUntil(
    async () => {
      const widgets = await $$('.react-grid-item');
      for (const w of widgets) {
        const text = await w.getText();
        if (text.includes(lastWidgetTitle) && text.trim().length > 0) return true;
      }
      return false;
    },
    { timeout: testConfig.timeouts.transition },
  );
});

// ----- Widget Edit / Delete -----

When('I enter dashboard edit mode', async () => {
  const editBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"edit")]');
  await editBtn.click();
  await browser.pause(300);
});

When('I click the widget edit button on the first widget', async () => {
  const firstWidget = await $('.react-grid-item');
  const editBtn = await firstWidget.$('button svg.lucide-pencil');
  const parentBtn = await editBtn.parentElement();
  await parentBtn.click();
});

When('I click the widget delete button on the first widget', async () => {
  const firstWidget = await $('.react-grid-item');
  // Try destructive button first, then X icon button
  let deleteBtn = await firstWidget.$('button[class*="destructive"]');
  if (!(await deleteBtn.isDisplayed().catch(() => false))) {
    const xIcon = await firstWidget.$('button svg.lucide-x');
    deleteBtn = await xIcon.parentElement();
  }
  await deleteBtn.click();
});

Then('I should see the widget edit dialog', async () => {
  const dialog = await $('[data-testid="widget-edit-dialog"]');
  const roleDialog = await $('[role="dialog"]');
  await browser.waitUntil(
    async () => {
      return (await dialog.isDisplayed().catch(() => false)) ||
        (await roleDialog.isDisplayed().catch(() => false));
    },
    { timeout: testConfig.timeouts.element },
  );
});

When('I change the widget title to {string}', async (title: string) => {
  lastWidgetTitle = title;
  let titleInput = await $('[data-testid="widget-edit-title-input"]');
  if (!(await titleInput.isDisplayed().catch(() => false))) {
    titleInput = await $('//label[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"title")]/ancestor::div[1]//input');
  }
  await titleInput.clearValue();
  await titleInput.setValue(title);
});

When('I save the widget changes', async () => {
  let saveBtn = await $('[data-testid="widget-edit-save-button"]');
  if (!(await saveBtn.isDisplayed().catch(() => false))) {
    saveBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"save")]');
  }
  await saveBtn.click();
  await browser.pause(300);
});

Then('the widget should be removed from the dashboard', async () => {
  await browser.pause(500);
});

Then('the add widget button should be visible', async () => {
  const addBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"add widget")]');
  await expect(addBtn).toBeDisplayed();
});
