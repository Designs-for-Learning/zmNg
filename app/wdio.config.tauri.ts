import type { Options } from '@wdio/types';
import { platformConfig } from './tests/platforms.config';

export const config: Options.Testrunner = {
  runner: 'local',
  hostname: 'localhost',
  port: platformConfig.tauri.driverPort,
  specs: ['tests/features/**/*.feature'],
  capabilities: [{
    browserName: 'wry',
    'custom:platformProfile': 'desktop-tauri',
  } as WebdriverIO.Capabilities],
  framework: 'cucumber',
  cucumberOpts: {
    require: ['tests/steps-wdio/**/*.steps.ts'],
    tagExpression: 'not @native and not @android and not @ios and not @ios-phone and not @ios-tablet and not @web',
    timeout: platformConfig.timeouts.appLaunch + 60000,
  },
  reporters: ['spec'],
  baseUrl: platformConfig.web.baseUrl,
};
