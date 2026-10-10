"use strict";

importScripts("shared.js");

const busy = new Set();
const lastAttempt = new Map();

// Recheck the page immediately before clicking. Neither coordinates nor code
// are accepted from a message sender.
const locateSkip = `(() => {
  if (location.origin !== 'https://www.youtube.com') return null;
  const player = document.getElementById('movie_player');
  const isAdPlaying = ${QuietSkip.isAdPlaying.toString()};
  const getSkipButton = ${QuietSkip.getSkipButton.toString()};
  if (!isAdPlaying(player)) return null;
  for (const candidate of player.querySelectorAll(${JSON.stringify(QuietSkip.selectors)})) {
    const button = getSkipButton(candidate, player);
    if (!button) continue;
    const rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    if (hit !== button && !button.contains(hit)) continue;
    return {x, y};
  }
  return null;
})()`;

async function clickSkip(sender) {
  const tabId = sender.tab?.id;
  if (!Number.isInteger(tabId) || sender.frameId !== 0 ||
      !sender.url?.startsWith('https://www.youtube.com/')) return { error: 'Unsupported sender.' };
  if (busy.has(tabId) || Date.now() - (lastAttempt.get(tabId) ?? 0) < 1000) return { skipped: true };
  busy.add(tabId);
  lastAttempt.set(tabId, Date.now());
  const target = { tabId };
  let attached = false;
  try {
    await chrome.debugger.attach(target, '1.3');
    attached = true;
    const result = await chrome.debugger.sendCommand(target, 'Runtime.evaluate', {
      expression: locateSkip, returnByValue: true
    });
    const point = result.result?.value;
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return { skipped: true };
    await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
      type: 'mousePressed', ...point, button: 'left', clickCount: 1
    });
    await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
      type: 'mouseReleased', ...point, button: 'left', clickCount: 1
    });
    return { clicked: true };
  } catch (error) {
    return { error: error.message };
  } finally {
    if (attached) await chrome.debugger.detach(target).catch(() => {});
    busy.delete(tabId);
  }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type !== 'trusted-skip') return;
  clickSkip(sender).then(respond);
  return true;
});
chrome.tabs.onRemoved.addListener(tabId => { lastAttempt.delete(tabId); });
