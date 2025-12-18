import { test as base } from 'playwright-bdd';
import { CommonSteps } from './steps/common.steps';
import { MonitorSteps } from './steps/monitor.steps';
import { WalkthroughSteps } from './steps/walkthrough.steps';

export const test = base.extend<{
  commonSteps: CommonSteps;
  monitorSteps: MonitorSteps;
  walkthroughSteps: WalkthroughSteps;
}>({
  commonSteps: async ({ page }, use) => {
    await use(new CommonSteps({ page }));
  },
  monitorSteps: async ({ page }, use) => {
    await use(new MonitorSteps({ page }));
  },
  walkthroughSteps: async ({ page }, use) => {
    await use(new WalkthroughSteps({ page }));
  },
});
