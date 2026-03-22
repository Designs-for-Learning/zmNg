import type { Options } from '@wdio/types';
import { platformConfig } from './tests/platforms.config';
import { getAppiumCapabilities } from './tests/helpers/ios-launcher';

export const config: Options.Testrunner = {
  runner: 'local',
  port: platformConfig.ios.appiumPort,
  specs: ['tests/features/**/*.feature'],
  capabilities: [{
    ...getAppiumCapabilities(platformConfig.ios.tablet.simulator),
    'custom:platformProfile': 'ios-tablet',
  } as WebdriverIO.Capabilities],
  services: [
    ['appium', {
      args: { port: platformConfig.ios.appiumPort },
    }],
  ],
  framework: 'cucumber',
  cucumberOpts: {
    require: ['tests/steps-wdio/**/*.steps.ts'],
    tagExpression: 'not @native and not @android and not @tauri and not @web and not @ios-phone',
    timeout: platformConfig.timeouts.appLaunch + 60000,
  },
  reporters: ['spec'],
  baseUrl: platformConfig.web.baseUrl,
};
