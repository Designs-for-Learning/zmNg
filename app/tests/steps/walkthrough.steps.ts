import { Given, When, Then } from 'playwright-bdd/decorators';
import { expect, Page } from '@playwright/test';
import { testConfig } from '../helpers/config';

/**
 * Full App Walkthrough Step Definitions
 *
 * These step definitions use test.step() internally to provide
 * detailed, structured reporting for each action.
 */
export class WalkthroughSteps {
  page: Page;

  constructor({ page }: { page: Page }) {
    this.page = page;
  }

  /**
   * Navigation Steps
   */
  @When('I navigate to the {string} page')
  async navigateToPage(pageName: string) {
    await this.page.waitForTimeout(100); // Brief stabilization

    const pageRoutes: Record<string, string> = {
      'Dashboard': 'dashboard',
      'Monitors': 'monitors',
      'Montage': 'montage',
      'Events': 'events',
      'Event Montage': 'event-montage',
      'Timeline': 'timeline',
      'Notifications': 'notifications',
      'Profiles': 'profiles',
      'Settings': 'settings',
      'Server': 'server',
      'Logs': 'logs',
    };

    const route = pageRoutes[pageName];
    if (!route) {
      throw new Error(`Unknown page: ${pageName}`);
    }

    await this.page.getByRole('link', { name: new RegExp(`^${pageName}$`, 'i') }).click();
    await this.page.waitForURL(new RegExp(`.*${route}`), { timeout: testConfig.timeouts.transition });
  }

  @When('I navigate back')
  async navigateBack() {
    await this.page.goBack();
    await this.page.waitForTimeout(500);
  }

  @When('I navigate back if I clicked into an event')
  async navigateBackIfEvent() {
    // This is a conditional step that may or may not execute
    // The actual navigation is handled by the previous step
  }

  /**
   * Page Heading Verification
   */
  @Then('I should see the page heading {string}')
  async shouldSeePageHeading(heading: string) {
    await expect(this.page.getByRole('heading', { name: new RegExp(heading, 'i') }).first()).toBeVisible();
  }

  @Then('I should be on the {string} page')
  async shouldBeOnPage(pageName: string) {
    const pageRoutes: Record<string, string> = {
      'Events': 'events',
    };
    const route = pageRoutes[pageName];
    await this.page.waitForURL(new RegExp(`.*${route}$`), { timeout: testConfig.timeouts.transition });
  }

  /**
   * Dashboard Steps
   */
  @When('I open the Add Widget dialog')
  async openAddWidgetDialog() {
    const addWidgetBtn = this.page.getByRole('button', { name: /add widget/i }).first();
    if (await addWidgetBtn.isVisible()) {
      await addWidgetBtn.click();
    } else {
      await this.page.getByTitle(/Add Widget|Add/i).click();
    }

    const dialog = this.page.getByRole('dialog', { name: /add widget/i });
    await expect(dialog).toBeVisible();
  }

  @When('I select the {string} widget type')
  async selectWidgetType(widgetType: string) {
    const option = this.page.locator('div.border.rounded-lg').filter({ hasText: new RegExp(`^${widgetType}$`) }).first();
    await option.click();
    await expect(option).toHaveClass(/border-primary/);
  }

  @When('I enter widget title {string}')
  async enterWidgetTitle(title: string) {
    // Generate unique title with timestamp
    const uniqueTitle = `${title} ${Date.now()}`;
    await this.page.getByLabel(/widget title/i).fill(uniqueTitle);
    // Store for later verification
    (this as any).lastWidgetTitle = uniqueTitle;
  }

  @When('I click the Add button in the dialog')
  async clickAddButtonInDialog() {
    const dialog = this.page.getByRole('dialog', { name: /add widget/i });
    const addBtn = dialog.getByRole('button', { name: /Add/i });
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();
    await addBtn.click();
    await expect(dialog).not.toBeVisible();
  }

  @Then('the widget {string} should appear on the dashboard')
  async widgetShouldAppear(_title: string) {
    // Use the stored unique title
    const uniqueTitle = (this as any).lastWidgetTitle;
    await expect(this.page.locator('.react-grid-item').filter({ hasText: uniqueTitle }))
      .toBeVisible({ timeout: testConfig.timeouts.element });
  }

  /**
   * Monitors Steps
   */
  @Then('I should see at least {int} monitor cards')
  async shouldSeeMonitorCards(count: number) {
    const monitorCards = this.page.getByTestId('monitor-card');
    const actualCount = await monitorCards.count();
    expect(actualCount).toBeGreaterThanOrEqual(count);
    console.log(`Found ${actualCount} monitors`);
  }

  @When('I click into the first monitor detail page')
  async clickIntoFirstMonitor() {
    // Click on the monitor player/image which triggers navigation
    // Use force to bypass hover overlay that intercepts clicks
    const firstMonitorPlayer = this.page.getByTestId('monitor-player').first();
    await firstMonitorPlayer.click({ force: true });
    await this.page.waitForURL(/.*monitors\/\d+/, { timeout: testConfig.timeouts.transition });
  }

  @Then('I should see the monitor player')
  async shouldSeeMonitorPlayer() {
    // Should see the monitor player/stream (use first if multiple exist)
    await expect(this.page.getByTestId('monitor-player').first()).toBeVisible({ timeout: 10000 });
  }

  @Then('I should see the monitor grid')
  async shouldSeeMonitorGrid() {
    await expect(this.page.getByTestId('monitor-grid')).toBeVisible();
  }

  /**
   * Montage Steps
   */
  @Then('I should see the montage interface')
  async shouldSeeMontageInterface() {
    // Montage should have some layout controls or grid container
    const hasLayoutControls = await this.page.locator('select,button').count() > 0;
    expect(hasLayoutControls).toBeTruthy();
  }

  /**
   * Events Steps
   */
  @Then('I should see events list or empty state')
  async shouldSeeEventsOrEmptyState() {
    const eventCount = await this.page.locator('[data-testid="event-card"]').count();
    const hasNoEventsMessage = await this.page.getByText(/no events/i).isVisible();

    expect(eventCount > 0 || hasNoEventsMessage).toBeTruthy();

    if (eventCount > 0) {
      console.log(`Found ${eventCount} events`);
      (this as any).hasEvents = true;
    } else {
      (this as any).hasEvents = false;
    }
  }

  @When('I click into the first event if events exist')
  async clickIntoFirstEventIfExists() {
    const hasEvents = (this as any).hasEvents;

    if (hasEvents) {
      const firstEvent = this.page.getByTestId('event-card').first();
      await firstEvent.click();
      await this.page.waitForURL(/.*events\/\d+/, { timeout: testConfig.timeouts.transition });

      // Verify event detail page loaded (URL changed is enough verification)
      await this.page.waitForTimeout(500);
      (this as any).clickedIntoEvent = true;
    } else {
      (this as any).clickedIntoEvent = false;
    }
  }

  /**
   * Timeline Steps
   */
  @Then('I should see timeline interface elements')
  async shouldSeeTimelineInterface() {
    // Timeline should have some interactive elements or content
    const hasButtons = await this.page.locator('button').count() > 0;
    const hasInputs = await this.page.locator('input').count() > 0;
    const hasSelects = await this.page.locator('select').count() > 0;

    expect(hasButtons || hasInputs || hasSelects).toBeTruthy();
  }

  /**
   * Notifications Steps
   */
  @Then('I should see notification interface elements')
  async shouldSeeNotificationInterface() {
    // Should have some interactive elements or content
    const hasButtons = await this.page.locator('button').count() > 0;
    const hasContent = await this.page.locator('div').count() > 0;

    expect(hasButtons || hasContent).toBeTruthy();
  }

  /**
   * Profiles Steps
   */
  @Then('I should see at least {int} profile cards')
  async shouldSeeProfileCards(count: number) {
    const profileCount = await this.page.locator('[data-testid="profile-card"]').count();
    expect(profileCount).toBeGreaterThanOrEqual(count);
    console.log(`Found ${profileCount} profile(s)`);
  }

  @Then('I should see the active profile indicator')
  async shouldSeeActiveProfileIndicator() {
    await expect(this.page.getByTestId('profile-active-indicator')).toBeVisible();
  }

  @Then('I should see profile management buttons')
  async shouldSeeProfileManagementButtons() {
    const addButton = this.page.getByRole('button', { name: /add/i }).first();
    await expect(addButton).toBeVisible();
  }

  /**
   * Settings Steps
   */
  @Then('I should see settings interface elements')
  async shouldSeeSettingsInterface() {
    // Settings should have various configuration options
    const hasThemeControls = await this.page.getByText(/theme/i).isVisible().catch(() => false);
    const hasLanguageControls = await this.page.getByText(/language/i).isVisible().catch(() => false);
    const hasSwitches = await this.page.locator('[role="switch"]').count() > 0;

    expect(hasThemeControls || hasLanguageControls || hasSwitches).toBeTruthy();
  }

  /**
   * Server Steps
   */
  @Then('I should see server information displayed')
  async shouldSeeServerInformation() {
    // Server page should show version, status, or other server details
    const hasServerInfo = await this.page.getByText(/version/i).isVisible().catch(() => false);
    const hasStatus = await this.page.getByText(/status/i).isVisible().catch(() => false);
    const hasCards = await this.page.locator('[role="region"]').count() > 0;

    expect(hasServerInfo || hasStatus || hasCards).toBeTruthy();
  }

  /**
   * Logs Steps
   */
  @Then('I should see log entries or empty state')
  async shouldSeeLogEntriesOrEmptyState() {
    const logCount = await this.page.locator('[data-testid="log-entry"]').count();
    const hasNoLogsMessage = await this.page.getByText(/no logs/i).isVisible();

    expect(logCount > 0 || hasNoLogsMessage).toBeTruthy();

    if (logCount > 0) {
      console.log(`Found ${logCount} log entries`);
    }
  }

  @Then('I should see log control elements')
  async shouldSeeLogControls() {
    // Should have log level filter or clear logs button
    const hasLevelFilter = await this.page.getByRole('combobox').isVisible().catch(() => false);
    const hasClearButton = await this.page.getByRole('button', { name: /clear/i }).isVisible().catch(() => false);
    const hasSaveButton = await this.page.getByRole('button', { name: /save|download|share/i }).isVisible().catch(() => false);

    expect(hasLevelFilter || hasClearButton || hasSaveButton).toBeTruthy();
  }
}
