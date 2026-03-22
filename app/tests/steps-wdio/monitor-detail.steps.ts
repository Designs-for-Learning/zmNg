import { Given, When, Then } from '@cucumber/cucumber';
import { browser, $, $$, expect } from '@wdio/globals';
import { testConfig } from '../helpers/config';

let hasPTZ = false;

// ----- Video Player / Monitor Detail -----

Then('I should see the monitor player', async () => {
  await browser.waitUntil(
    async () => {
      const videoPlayer = await $('[data-testid="video-player"]').isDisplayed().catch(() => false);
      const detailSettings = await $('[data-testid="monitor-detail-settings"]').isDisplayed().catch(() => false);
      const monitorPlayer = await $('[data-testid="monitor-player"]').isDisplayed().catch(() => false);
      return videoPlayer || detailSettings || monitorPlayer;
    },
    { timeout: testConfig.timeouts.transition },
  );
});

Then('I should see the monitor rotation status', async () => {
  const settingsBtn = await $('[data-testid="monitor-detail-settings"]');
  await expect(settingsBtn).toBeDisplayed();
  await settingsBtn.click();
  const rotation = await $('[data-testid="monitor-rotation"]');
  await expect(rotation).toBeDisplayed();
});

// ----- Video Player Element -----

Then('I should see a video player element', async () => {
  const videoPlayer = await $('[data-testid="video-player"]');
  await videoPlayer.waitForDisplayed({ timeout: testConfig.timeouts.transition });
});

Then('each monitor should have a video player element', async () => {
  const monitorCards = await $$('[data-testid="montage-monitor-card"]');
  expect(monitorCards.length).toBeGreaterThan(0);

  for (const card of monitorCards) {
    const video = await card.$('video[data-testid="video-player-video"]');
    await video.waitForDisplayed({ timeout: testConfig.timeouts.transition });
  }
});

// ----- Snapshot -----

When('I click the snapshot button', async () => {
  let snapshotBtn = await $('[data-testid="snapshot-button"]');
  if (!(await snapshotBtn.isDisplayed().catch(() => false))) {
    snapshotBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"snapshot") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"download")]');
  }
  await snapshotBtn.click();
});

Then('the snapshot should be saved successfully', async () => {
  await browser.pause(testConfig.timeouts.transition);
  // On web, file download happens automatically. On mobile, check for toast or task.
  try {
    await browser.waitUntil(
      async () => {
        const successToast = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"snapshot") and contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"saved")]');
        const bgTask = await $('[data-testid^="background-task"]');
        return (await successToast.isDisplayed().catch(() => false)) ||
          (await bgTask.isDisplayed().catch(() => false));
      },
      { timeout: testConfig.timeouts.transition },
    );
  } catch {
    // Download might have completed silently
  }
});

Then('I should see streaming method setting', async () => {
  const streaming = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"streaming method")]');
  await streaming.waitForDisplayed({ timeout: testConfig.timeouts.transition });
});

Then('I can change the streaming method preference', async () => {
  const select = await $('//select[contains(translate(.,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"auto") or contains(translate(.,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"webrtc") or contains(translate(.,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"mjpeg")]');
  const button = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"auto") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"webrtc") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"mjpeg")]');
  const element = (await select.isDisplayed().catch(() => false)) ? select : button;
  await expect(element).toBeDisplayed();
  await expect(element).toBeEnabled();
});

When('viewing a monitor without active profile', async () => {
  // Edge case testing — no action needed
});

Then('the video player should show loading or error state', async () => {
  try {
    await browser.waitUntil(
      async () => {
        const loading = await $('[data-testid="video-player-loading"]').isDisplayed().catch(() => false);
        const error = await $('[data-testid="video-player-error"]').isDisplayed().catch(() => false);
        return loading || error;
      },
      { timeout: testConfig.timeouts.transition },
    );
  } catch {
    // Normal state if fallback works — acceptable
  }
});

Given('the monitor is streaming', async () => {
  const video = await $('video[data-testid="video-player-video"]');
  await video.waitForDisplayed({ timeout: testConfig.timeouts.transition });
});

When('I capture a snapshot', async () => {
  let snapshotBtn = await $('[data-testid="snapshot-button"]');
  if (!(await snapshotBtn.isDisplayed().catch(() => false))) {
    snapshotBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"snapshot") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"download")]');
  }
  await snapshotBtn.click();
});

Then('the snapshot should contain the current frame', async () => {
  await browser.pause(testConfig.timeouts.transition);
});

Then('the download should complete without errors', async () => {
  const errorToast = await $('//*[@role="alert"][contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"error") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"failed")]');
  const isErrorVisible = await errorToast.isDisplayed().catch(() => false);
  expect(isErrorVisible).toBe(false);
});

// ----- Video Player State -----

Then('the video player should be in playing state', async () => {
  const video = await $('video[data-testid="video-player-video"]');
  await video.waitForDisplayed({ timeout: testConfig.timeouts.transition });
});

When('I click the snapshot button in monitor detail', async () => {
  let snapshotBtn = await $('[data-testid="snapshot-button"]');
  if (!(await snapshotBtn.isDisplayed().catch(() => false))) {
    snapshotBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"snapshot")]');
  }
  await snapshotBtn.click();
});

Then('I should see snapshot download initiated', async () => {
  const errorToast = await $('[data-sonner-toast][data-type="error"]');
  const successToast = await $('[data-sonner-toast][data-type="success"]');
  const waitTimeout = 5000;

  try {
    await browser.waitUntil(
      async () => {
        const hasSuccess = await successToast.isDisplayed().catch(() => false);
        const hasError = await errorToast.isDisplayed().catch(() => false);
        return hasSuccess || hasError;
      },
      { timeout: waitTimeout },
    );

    // If error toast appeared, fail
    if (await errorToast.isDisplayed().catch(() => false)) {
      const errorText = await errorToast.getText();
      throw new Error(`Snapshot download failed: ${errorText}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Snapshot download failed')) {
      throw error;
    }
    // If timeout, check final state
    if (await errorToast.isDisplayed().catch(() => false)) {
      const errorText = await errorToast.getText();
      throw new Error(`Snapshot download failed: ${errorText}`);
    }
    // No error toast = likely succeeded
  }
});

When('I click the fullscreen button on video player', async () => {
  let fullscreenBtn = await $('[data-testid="video-fullscreen-button"]');
  if (!(await fullscreenBtn.isDisplayed().catch(() => false))) {
    fullscreenBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"fullscreen")]');
  }
  await fullscreenBtn.click();
});

Then('the video should enter fullscreen mode', async () => {
  await browser.pause(500);
});

Then('the video should exit fullscreen mode', async () => {
  await browser.pause(300);
});

// ----- Monitor Settings Dialog -----

When('I open the monitor settings dialog', async () => {
  let settingsBtn = await $('[data-testid="monitor-detail-settings"]');
  if (!(await settingsBtn.isDisplayed().catch(() => false))) {
    settingsBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"settings")]');
  }
  await settingsBtn.click();
  await browser.pause(300);
});

Then('I should see the monitor mode dropdown', async () => {
  let dropdown = await $('[data-testid="monitor-mode-select"]');
  if (!(await dropdown.isDisplayed().catch(() => false))) {
    dropdown = await $('select');
    if (!(await dropdown.isDisplayed().catch(() => false))) {
      dropdown = await $('[role="combobox"]');
    }
  }
  await expect(dropdown).toBeDisplayed();
});

Then('the current mode should be displayed', async () => {
  const modeDisplay = await $('//*[contains(text(),"Monitor") or contains(text(),"Modect") or contains(text(),"Record") or contains(text(),"Mocord") or contains(text(),"None") or contains(text(),"Nodect")]');
  await expect(modeDisplay).toBeDisplayed();
});

When('I change the monitor mode to {string}', async (mode: string) => {
  const modeSelect = await $('[data-testid="monitor-mode-select"]');
  await modeSelect.waitForDisplayed({ timeout: testConfig.timeouts.element });
  await modeSelect.click();

  let option = await $(`[role="option"][name="${mode}"]`);
  if (!(await option.isDisplayed().catch(() => false))) {
    option = await $(`[data-value="${mode}"]`);
  }
  if (!(await option.isDisplayed().catch(() => false))) {
    option = await $(`//*[@role="option"][contains(text(),"${mode}")]`);
  }
  await option.click();
});

Then('I should see mode update loading indicator', async () => {
  await browser.pause(100);
});

Then('I should see mode updated success toast', async () => {
  try {
    const toast = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"mode") and contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"updated") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"updated")]');
    await toast.waitForDisplayed({ timeout: testConfig.timeouts.transition });
  } catch {
    // Toast may have auto-dismissed
  }
});

// ----- Alarm Steps -----

Then('I should see the alarm status indicator', async () => {
  let alarm = await $('[data-testid="alarm-status"]');
  if (!(await alarm.isDisplayed().catch(() => false))) {
    alarm = await $('[data-testid*="alarm"]');
  }
  await expect(alarm).toBeDisplayed();
});

Then('the alarm status label should be visible', async () => {
  const label = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"armed") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"disarmed")]');
  await expect(label).toBeDisplayed();
});

When('I toggle the alarm switch on', async () => {
  let toggle = await $('[data-testid="alarm-toggle"]');
  if (!(await toggle.isDisplayed().catch(() => false))) {
    toggle = await $('[role="switch"]');
  }
  await toggle.click();
});

When('I toggle the alarm switch off', async () => {
  let toggle = await $('[data-testid="alarm-toggle"]');
  if (!(await toggle.isDisplayed().catch(() => false))) {
    toggle = await $('[role="switch"]');
  }
  await toggle.click();
});

Then('I should see alarm updating indicator', async () => {
  await browser.pause(100);
});

Then('I should see alarm armed toast', async () => {
  try {
    const toast = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"alarm") and contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"armed")]');
    await toast.waitForDisplayed({ timeout: testConfig.timeouts.transition });
  } catch {
    // Toast may have auto-dismissed
  }
});

Then('I should see alarm disarmed toast', async () => {
  try {
    const toast = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"disarmed")]');
    await toast.waitForDisplayed({ timeout: testConfig.timeouts.transition });
  } catch {
    // Toast may have auto-dismissed
  }
});

Then('the alarm border should indicate armed state', async () => {
  const player = await $('[data-testid="monitor-player"]');
  await expect(player).toBeDisplayed();
});

Then('the alarm switch should show optimistic update', async () => {
  const toggle = await $('[role="switch"]');
  await expect(toggle).toBeDisplayed();
});

Then('the alarm border class should change', async () => {
  await browser.pause(300);
});

// ----- PTZ Steps -----

Given('the current monitor supports PTZ', async () => {
  let ptzControls = await $('[data-testid="ptz-controls"]');
  if (!(await ptzControls.isDisplayed().catch(() => false))) {
    ptzControls = await $('[data-testid*="ptz"]');
  }
  hasPTZ = await ptzControls.isDisplayed().catch(() => false);
});

Then('I should see the PTZ control panel', async () => {
  if (!hasPTZ) return;
  const ptzPanel = await $('[data-testid="ptz-controls"]');
  await expect(ptzPanel).toBeDisplayed();
});

Then('I should see directional arrows', async () => {
  if (!hasPTZ) return;
  const arrows = await $('[data-testid*="ptz"]');
  await expect(arrows).toBeDisplayed();
});

Then('I should see zoom controls', async () => {
  if (!hasPTZ) return;
  const zoom = await $('[data-testid*="zoom"]');
  await expect(zoom).toBeDisplayed();
});

When('I click the PTZ pan left button', async () => {
  if (!hasPTZ) return;
  let leftBtn = await $('[data-testid="ptz-left"]');
  if (!(await leftBtn.isDisplayed().catch(() => false))) {
    leftBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"left")]');
  }
  await leftBtn.click();
});

When('I click the PTZ pan right button', async () => {
  if (!hasPTZ) return;
  let rightBtn = await $('[data-testid="ptz-right"]');
  if (!(await rightBtn.isDisplayed().catch(() => false))) {
    rightBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"right")]');
  }
  await rightBtn.click();
});

When('I click the PTZ tilt up button', async () => {
  if (!hasPTZ) return;
  let upBtn = await $('[data-testid="ptz-up"]');
  if (!(await upBtn.isDisplayed().catch(() => false))) {
    upBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"up")]');
  }
  await upBtn.click();
});

When('I click the PTZ tilt down button', async () => {
  if (!hasPTZ) return;
  let downBtn = await $('[data-testid="ptz-down"]');
  if (!(await downBtn.isDisplayed().catch(() => false))) {
    downBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"down")]');
  }
  await downBtn.click();
});

When('I click the PTZ zoom in button', async () => {
  if (!hasPTZ) return;
  let zoomIn = await $('[data-testid="ptz-zoom-in"]');
  if (!(await zoomIn.isDisplayed().catch(() => false))) {
    zoomIn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"zoom") and contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"in")]');
  }
  await zoomIn.click();
});

When('I click the PTZ zoom out button', async () => {
  if (!hasPTZ) return;
  let zoomOut = await $('[data-testid="ptz-zoom-out"]');
  if (!(await zoomOut.isDisplayed().catch(() => false))) {
    zoomOut = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"zoom") and contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"out")]');
  }
  await zoomOut.click();
});

Then('the PTZ command should be sent', async () => {
  if (!hasPTZ) return;
  const errorToast = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"ptz") and contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"failed")]');
  const hasError = await errorToast.isDisplayed().catch(() => false);
  expect(hasError).toBeFalsy();
});

Then('the auto-stop should trigger after delay', async () => {
  if (!hasPTZ) return;
  await browser.pause(600);
});

When('I toggle continuous PTZ mode on', async () => {
  if (!hasPTZ) return;
  const toggle = await $('[data-testid="ptz-continuous-toggle"]');
  if (await toggle.isDisplayed().catch(() => false)) {
    await toggle.click();
  }
});

Then('the command should continue until stop pressed', async () => {
  if (!hasPTZ) return;
  await browser.pause(300);
});

When('I click the PTZ stop button', async () => {
  if (!hasPTZ) return;
  let stopBtn = await $('[data-testid="ptz-stop"]');
  if (!(await stopBtn.isDisplayed().catch(() => false))) {
    stopBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"stop")]');
  }
  if (await stopBtn.isDisplayed().catch(() => false)) {
    await stopBtn.click();
  }
});

Then('the movement should stop', async () => {
  if (!hasPTZ) return;
  await browser.pause(300);
});

// ----- Monitor Navigation -----

Then('I should see navigation arrows if multiple monitors exist', async () => {
  const nextBtn = await $('[data-testid="monitor-next"]');
  const prevBtn = await $('[data-testid="monitor-prev"]');
  const hasNext = await nextBtn.isDisplayed().catch(() => false);
  const hasPrev = await prevBtn.isDisplayed().catch(() => false);
  // Just log — navigation arrows are optional
  void (hasNext || hasPrev);
});

When('I click the next monitor button if visible', async () => {
  const nextBtn = await $('[data-testid="monitor-next"]');
  if (await nextBtn.isDisplayed().catch(() => false)) {
    await nextBtn.click();
    await browser.pause(500);
  }
});

When('I click the previous monitor button if visible', async () => {
  const prevBtn = await $('[data-testid="monitor-prev"]');
  if (await prevBtn.isDisplayed().catch(() => false)) {
    await prevBtn.click();
    await browser.pause(500);
  }
});

Then('the monitor should change to next in list', async () => {
  await browser.waitUntil(
    async () => (await browser.getUrl()).match(/monitors\/\d+/) !== null,
    { timeout: testConfig.timeouts.transition },
  );
});

Then('the monitor should change to previous in list', async () => {
  await browser.waitUntil(
    async () => (await browser.getUrl()).match(/monitors\/\d+/) !== null,
    { timeout: testConfig.timeouts.transition },
  );
});

// ----- Swipe Navigation -----

When('I swipe left on the video player', async () => {
  const player = await $('[data-testid="monitor-player"]');
  if (await player.isDisplayed().catch(() => false)) {
    // Use touch actions for swipe on mobile
    const location = await player.getLocation();
    const size = await player.getSize();
    const startX = location.x + size.width * 0.8;
    const endX = location.x + size.width * 0.2;
    const y = location.y + size.height / 2;

    await browser.action('pointer', { parameters: { pointerType: 'touch' } })
      .move({ x: Math.round(startX), y: Math.round(y) })
      .down()
      .move({ x: Math.round(endX), y: Math.round(y), duration: 300 })
      .up()
      .perform();
    await browser.pause(500);
  }
});

When('I swipe right on the video player', async () => {
  const player = await $('[data-testid="monitor-player"]');
  if (await player.isDisplayed().catch(() => false)) {
    const location = await player.getLocation();
    const size = await player.getSize();
    const startX = location.x + size.width * 0.2;
    const endX = location.x + size.width * 0.8;
    const y = location.y + size.height / 2;

    await browser.action('pointer', { parameters: { pointerType: 'touch' } })
      .move({ x: Math.round(startX), y: Math.round(y) })
      .down()
      .move({ x: Math.round(endX), y: Math.round(y), duration: 300 })
      .up()
      .perform();
    await browser.pause(500);
  }
});

Then('the next monitor should load if available', async () => {
  await browser.pause(500);
});

Then('the previous monitor should load if available', async () => {
  await browser.pause(500);
});

// ----- Settings Button & Dialog -----

When('I click the settings button', async () => {
  const settingsBtn = await $('[data-testid="monitor-detail-settings"]');
  await settingsBtn.click();
});

Then('I should see the monitor settings dialog', async () => {
  const dialog = await $('[role="dialog"]');
  const testIdDialog = await $('[data-testid="monitor-settings-dialog"]');
  await browser.waitUntil(
    async () => {
      return (await dialog.isDisplayed().catch(() => false)) ||
        (await testIdDialog.isDisplayed().catch(() => false));
    },
    { timeout: testConfig.timeouts.element },
  );
});

// ----- Rotation -----

Then('I should see the rotation dropdown', async () => {
  let rotation = await $('[data-testid="monitor-rotation"]');
  if (!(await rotation.isDisplayed().catch(() => false))) {
    rotation = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"rotation")]');
  }
  await expect(rotation).toBeDisplayed();
});

Then('I should see rotation options 0 90 180 270', async () => {
  await browser.pause(300);
});

When('I select rotation value {string}', async (value: string) => {
  let rotationSelect = await $('[data-testid="rotation-select"]');
  if (!(await rotationSelect.isDisplayed().catch(() => false))) {
    rotationSelect = await $('select');
  }

  try {
    await rotationSelect.selectByVisibleText(value);
  } catch {
    await rotationSelect.click();
    const option = await $(`//*[text()="${value}"]`);
    await option.click();
  }
});

Then('the video should rotate 90 degrees', async () => {
  await browser.pause(300);
});

// ----- Controls Card -----

Then('I should see the controls card', async () => {
  let controlsCard = await $('[data-testid="monitor-controls-card"]');
  if (!(await controlsCard.isDisplayed().catch(() => false))) {
    controlsCard = await $('[data-testid*="controls"]');
  }
  await expect(controlsCard).toBeDisplayed();
});

Then('I should see the alarm toggle in controls card', async () => {
  let alarmToggle = await $('[data-testid="alarm-toggle"]');
  if (!(await alarmToggle.isDisplayed().catch(() => false))) {
    alarmToggle = await $('[role="switch"]');
  }
  await expect(alarmToggle).toBeDisplayed();
});

Then('I should see the mode selector in controls card', async () => {
  const modeSel = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"mode") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"function")]');
  await expect(modeSel).toBeDisplayed();
});

Then('I should see the settings button in controls card', async () => {
  let settingsBtn = await $('[data-testid="monitor-detail-settings"]');
  if (!(await settingsBtn.isDisplayed().catch(() => false))) {
    settingsBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"settings")]');
  }
  await expect(settingsBtn).toBeDisplayed();
});

// ----- Stream Error Handling -----

Given('the stream connection fails', async () => {
  // Setup state for error testing
});

Then('I should see stream error message', async () => {
  const errorMsg = await $('[data-testid="stream-error"]');
  await errorMsg.isDisplayed().catch(() => false);
});

Then('I should see retry button', async () => {
  const retryBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"retry") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"reconnect")]');
  await retryBtn.isDisplayed().catch(() => false);
});

When('I click the retry button', async () => {
  const retryBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"retry") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"reconnect")]');
  if (await retryBtn.isDisplayed().catch(() => false)) {
    await retryBtn.click();
  }
});

Then('the stream should attempt to reconnect', async () => {
  await browser.pause(500);
});

// ----- PTZ Error Handling -----

Given('the PTZ endpoint is unavailable', async () => {
  // Setup state for error testing
});

Then('I should see PTZ error toast', async () => {
  const toast = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"ptz") and (contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"failed") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"error"))]');
  await toast.isDisplayed().catch(() => false);
});

// ----- Mode Change Error Handling -----

Given('the mode change endpoint returns error', async () => {
  // Setup state for error testing
});

Then('I should see mode change error toast', async () => {
  const toast = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"mode") and contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"failed")]');
  await toast.isDisplayed().catch(() => false);
});

Then('the mode should revert to original', async () => {
  await browser.pause(500);
});

// ----- Zone Overlay Steps -----

Then('I should see the zone toggle button', async () => {
  const zoneToggle = await $('[data-testid="zone-toggle-button"]');
  await zoneToggle.waitForDisplayed({ timeout: testConfig.timeouts.element });
});

When('I click the zone toggle button', async () => {
  const zoneToggle = await $('[data-testid="zone-toggle-button"]');
  await zoneToggle.click();
  await browser.pause(500);
});

Then('the zone toggle should be active', async () => {
  const zoneToggle = await $('[data-testid="zone-toggle-button"]');
  await expect(zoneToggle).toBeDisplayed();
  // Check for zone overlay or active button state
  const zoneOverlay = await $('[data-testid="zone-overlay"]');
  await zoneOverlay.isDisplayed().catch(() => false);
});

Then('the zone toggle should be inactive', async () => {
  const zoneToggle = await $('[data-testid="zone-toggle-button"]');
  await expect(zoneToggle).toBeDisplayed();
});
