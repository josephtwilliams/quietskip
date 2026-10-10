(() => {
  "use strict";

  const { selectors, isAdPlaying, getSkipButton } = QuietSkip;
  const version = chrome.runtime.getManifest().version;
  let player = null;
  let queued = false;
  let stopped = false;
  // Keep every video touched during an ad break, including replacement elements.
  const originalMute = new Map();
  const lastClick = new WeakMap();
  let clickCount = 0;
  let lastAdReport = null;
  let adActive = false;
  let trustedClickError = null;

  function restoreAudio() {
    for (const [video, muted] of originalMute) video.muted = muted;
    originalMute.clear();
  }

  function check() {
    queued = false;
    if (stopped) return;
    const current = document.getElementById("movie_player");
    if (current !== player) {
      restoreAudio();
      playerObserver.disconnect();
      player = current;
      if (player) playerObserver.observe(player, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden", "disabled", "aria-disabled"]
      });
    }
    adActive = isAdPlaying(player);
    if (!adActive) {
      restoreAudio();
      return;
    }

    const video = player.querySelector("video.html5-main-video") || player.querySelector("video");
    if (video) {
      if (!originalMute.has(video)) originalMute.set(video, video.muted);
      // Setting the native mute property avoids accidentally toggling audio on.
      if (!video.muted) video.muted = true;
    }

    const candidates = [...player.querySelectorAll(selectors)];
    lastAdReport = { matched: candidates.length, clickable: false, attempts: clickCount };
    for (const candidate of candidates) {
      const button = getSkipButton(candidate, player);
      if (!button) continue;
      lastAdReport.clickable = true;
      const now = performance.now();
      if (now - (lastClick.get(button) ?? -Infinity) < 1000) continue;
      lastClick.set(button, now);
      chrome.runtime.sendMessage({ type: "trusted-skip" }).then(result => {
        trustedClickError = result.error || null;
      }).catch(error => { trustedClickError = error.message; });
      clickCount++;
      lastAdReport.attempts = clickCount;
      break;
    }
  }

  function scheduleCheck() {
    if (queued || stopped) return;
    queued = true;
    queueMicrotask(check);
  }

  const playerObserver = new MutationObserver(scheduleCheck);
  const pageObserver = new MutationObserver(scheduleCheck);
  document.addEventListener("yt-navigate-finish", scheduleCheck);
  document.addEventListener("volumechange", scheduleCheck, true);
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type !== "ad-mute-status") return;
    respond({ version, adActive, lastAdReport, trustedClickError });
  });
  // Backup for player updates that do not emit an observed DOM mutation.
  let timer;
  function start() {
    stopped = false;
    player = null;
    pageObserver.observe(document, { childList: true, subtree: true });
    timer = setInterval(check, 200);
    check();
  }
  window.addEventListener("pagehide", () => {
    stopped = true;
    clearInterval(timer);
    playerObserver.disconnect();
    pageObserver.disconnect();
    restoreAudio();
  });
  // A cached page can return without reinjecting the content script.
  window.addEventListener("pageshow", event => {
    if (event.persisted && stopped) start();
  });
  start();
})();
