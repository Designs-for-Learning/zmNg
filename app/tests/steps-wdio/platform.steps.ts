import { Then } from '@cucumber/cucumber';
import { browser, expect } from '@wdio/globals';

Then('no element should overflow the viewport horizontally', async () => {
  const overflows = await browser.execute(() => {
    const vw = window.innerWidth;
    return Array.from(document.querySelectorAll('*'))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right <= vw + 1) return false;
        if (rect.width === 0 || rect.height === 0) return false;
        // Skip elements inside containers with overflow:hidden/auto/scroll
        let parent = el.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          const overflowX = style.overflowX;
          if (overflowX === 'hidden' || overflowX === 'auto' || overflowX === 'scroll') {
            return false;
          }
          parent = parent.parentElement;
        }
        return true;
      })
      .map((el) => `${el.tagName}.${el.className}`.slice(0, 80));
  }) as string[];

  expect(overflows).toHaveLength(0);
});

Then('the page should match the visual baseline', async () => {
  // Placeholder — will be connected to visual regression tooling in a later task
  await browser.pause(500);
});
