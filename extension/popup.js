const manifest = chrome.runtime.getManifest();
document.getElementById("name").textContent = `${manifest.name} · ${manifest.version}`;
const status = document.getElementById("status");
const details = document.getElementById("details");

async function refresh() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const report = await chrome.tabs.sendMessage(tab.id, { type: "ad-mute-status" });
    status.textContent = report.version !== manifest.version ? "Reload this YouTube tab to use the updated script." :
      report.adActive ? "Ad detected; muting active." : "No ad currently detected.";
    const last = report.lastAdReport;
    details.textContent = !last ? "No ad inspected in this tab yet." :
      `Latest ad check: ${last.matched} Skip controls matched. ` +
      (last.clickable ? "An enabled, visible Skip control was found. " : "No enabled, visible Skip control was found. ") +
      `${last.attempts} clicks attempted in this tab. These are attempts, not confirmed skips.`;
    if (report.trustedClickError) details.textContent += ` Browser click failed: ${report.trustedClickError}`;
  } catch {
    status.textContent = "Open a YouTube video and reload its tab.";
    details.textContent = "The extension cannot read its status from this tab yet.";
  }
}
refresh();
setInterval(refresh, 500);
