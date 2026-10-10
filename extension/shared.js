"use strict";

// Shared by the content script and the worker's page-side Skip lookup.
globalThis.QuietSkip = Object.freeze({
  selectors: [
    ".ytp-skip-ad-button", ".ytp-skip-ad-button-modern",
    ".ytp-ad-skip-button", ".ytp-ad-skip-button-modern",
    ".ytp-ad-skip-button-slot button", ".ytp-ad-skip-button-container button",
    'button[aria-label="Skip ad" i]', 'button[aria-label="Skip ads" i]'
  ].join(","),
  isAdPlaying: function (player) {
    return Boolean(player && (player.classList.contains("ad-showing") ||
      player.classList.contains("ad-interrupting")));
  },
  getSkipButton: function (candidate, player) {
    const button = candidate.querySelector("button, [role='button']") || candidate;
    if (button.disabled || button.getAttribute("aria-disabled") === "true" ||
        !button.getClientRects().length) return null;
    const style = getComputedStyle(button);
    if (style.visibility !== "visible" || style.pointerEvents === "none") return null;
    // Children can override an ancestor's visibility and pointer-events.
    for (let element = button; element && element !== player; element = element.parentElement) {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.opacity === "0") return null;
    }
    return button;
  }
});
