// WDIO globals (browser, $, $$) are injected at runtime by the WebDriverIO runner.
// They are not available at TypeScript compile time — each access below uses a
// type-cast to the relevant WDIO type so the compiler accepts them.
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { platformConfig } from '../platforms.config';
import type { PlatformProfile } from '../platforms.config.defaults';
import type { TestActions } from './types';

// WDIO injects browser/$/$$ into the global scope at runtime.
// Declare minimal shapes here so TypeScript can follow the call sites.
declare const browser: {
  url(path: string): Promise<void>;
  getUrl(): Promise<string>;
  getWindowSize(): Promise<{ width: number; height: number }>;
  saveScreenshot(filePath: string): Promise<void>;
  refresh(): Promise<void>;
  pause(ms: number): Promise<void>;
  waitUntil(
    condition: () => Promise<boolean>,
    options?: { timeout?: number; interval?: number; timeoutMsg?: string },
  ): Promise<void>;
};

declare function $(selector: string): {
  click(): Promise<void>;
  setValue(value: string): Promise<void>;
  getText(): Promise<string>;
  getAttribute(attr: string): Promise<string | null>;
  getCSSProperty(prop: string): Promise<{ value: string }>;
  isDisplayed(): Promise<boolean>;
  waitForDisplayed(options?: { timeout?: number; reverse?: boolean }): Promise<void>;
  scrollIntoView(): Promise<void>;
  getLocation(): Promise<{ x: number; y: number }>;
  getSize(): Promise<{ width: number; height: number }>;
};

declare function $$(selector: string): Promise<unknown[]>;

export class WdioActions implements TestActions {
  private readonly platformName: PlatformProfile;
  private readonly screenshotDir: string;

  constructor(platformName: PlatformProfile, screenshotDir: string) {
    this.platformName = platformName;
    this.screenshotDir = screenshotDir;
  }

  private selector(testId: string): string {
    return `[data-testid="${testId}"]`;
  }

  async goto(urlPath: string): Promise<void> {
    await browser.url(urlPath);
  }

  async click(testId: string): Promise<void> {
    await $(this.selector(testId)).click();
  }

  async clickByRole(role: string, name: string): Promise<void> {
    await $(`[role="${role}"][aria-label="${name}"]`).click();
  }

  async clickByText(text: string): Promise<void> {
    await $(`//*[contains(text(), "${text}")]`).click();
  }

  async fill(testId: string, value: string): Promise<void> {
    await $(this.selector(testId)).setValue(value);
  }

  async getText(testId: string): Promise<string> {
    return $(this.selector(testId)).getText();
  }

  async getAllTexts(testId: string): Promise<string[]> {
    const elements = await $$(this.selector(testId));
    return Promise.all(
      (elements as Array<{ getText(): Promise<string> }>).map((el) => el.getText()),
    );
  }

  async isVisible(testId: string, timeout?: number): Promise<boolean> {
    try {
      await $(this.selector(testId)).waitForDisplayed({
        timeout: timeout ?? platformConfig.timeouts.element,
      });
      return true;
    } catch {
      return false;
    }
  }

  async waitForVisible(testId: string, timeout?: number): Promise<void> {
    await $(this.selector(testId)).waitForDisplayed({
      timeout: timeout ?? platformConfig.timeouts.element,
    });
  }

  async waitForHidden(testId: string, timeout?: number): Promise<void> {
    await $(this.selector(testId)).waitForDisplayed({
      timeout: timeout ?? platformConfig.timeouts.element,
      reverse: true,
    });
  }

  async getCount(testId: string): Promise<number> {
    const elements = await $$(this.selector(testId));
    return (elements as unknown[]).length;
  }

  async getAttribute(testId: string, attr: string): Promise<string | null> {
    return $(this.selector(testId)).getAttribute(attr);
  }

  async hasClass(testId: string, className: string): Promise<boolean> {
    const classAttr = await $(this.selector(testId)).getAttribute('class');
    return classAttr?.split(' ').includes(className) ?? false;
  }

  async getCssValue(testId: string, property: string): Promise<string> {
    const result = await $(this.selector(testId)).getCSSProperty(property);
    return result.value;
  }

  async getBoundingBox(
    testId: string,
  ): Promise<{ x: number; y: number; width: number; height: number } | null> {
    try {
      const el = $(this.selector(testId));
      const [location, size] = await Promise.all([el.getLocation(), el.getSize()]);
      return { x: location.x, y: location.y, width: size.width, height: size.height };
    } catch {
      return null;
    }
  }

  async getViewportSize(): Promise<{ width: number; height: number }> {
    return browser.getWindowSize();
  }

  async scrollTo(testId: string): Promise<void> {
    await $(this.selector(testId)).scrollIntoView();
  }

  async screenshot(name: string): Promise<Buffer> {
    const dir = path.join(this.screenshotDir, this.platformName);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${name}.png`);
    await browser.saveScreenshot(filePath);
    return fs.readFileSync(filePath);
  }

  async compareScreenshot(name: string, threshold?: number): Promise<void> {
    const dir = path.join(this.screenshotDir, this.platformName);
    fs.mkdirSync(dir, { recursive: true });
    const baselinePath = path.join(dir, `${name}.png`);

    const currentPath = path.join(dir, `${name}-current.png`);
    await browser.saveScreenshot(currentPath);

    if (!fs.existsSync(baselinePath)) {
      fs.copyFileSync(currentPath, baselinePath);
      fs.rmSync(currentPath);
      return;
    }

    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    const current = PNG.sync.read(fs.readFileSync(currentPath));

    const { width, height } = baseline;
    const diff = new PNG({ width, height });

    const numDiffPixels = pixelmatch(
      baseline.data,
      current.data,
      diff.data,
      width,
      height,
      { threshold: threshold ?? 0.1 },
    );

    const totalPixels = width * height;
    const pixelRatio = numDiffPixels / totalPixels;

    if (numDiffPixels > 0) {
      const diffPath = path.join(dir, `${name}-diff.png`);
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
      fs.rmSync(currentPath);
      throw new Error(
        `Screenshot mismatch for "${name}": ${numDiffPixels} pixels differ ` +
          `(${(pixelRatio * 100).toFixed(2)}%). Diff saved to ${diffPath}`,
      );
    }

    fs.rmSync(currentPath);
  }

  async currentPath(): Promise<string> {
    const url = await browser.getUrl();
    return new URL(url).pathname;
  }

  async waitForNavigation(timeout?: number): Promise<void> {
    const startUrl = await browser.getUrl();
    await browser.waitUntil(
      async () => {
        const current = await browser.getUrl();
        return current !== startUrl;
      },
      {
        timeout: timeout ?? platformConfig.timeouts.navigation,
        interval: 200,
        timeoutMsg: `URL did not change from "${startUrl}" within the timeout`,
      },
    );
  }

  async reload(): Promise<void> {
    await browser.refresh();
  }

  async wait(ms: number): Promise<void> {
    await browser.pause(ms);
  }

  platform(): PlatformProfile {
    return this.platformName;
  }
}
