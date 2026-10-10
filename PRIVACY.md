# QuietSkip privacy policy

Last updated: 10 October 2026

QuietSkip processes the YouTube player's ad state, mute setting, and Skip-button state locally to mute ads and click available Skip controls. These values and click-attempt diagnostics remain in browser memory; the extension does not write them to persistent storage.

QuietSkip does not collect or transmit browsing history, video titles, account details, personal information, audio, or video. It has no analytics, advertising, remote servers, telemetry, or remote code. No data is sold or shared with the developer or third parties.

The debugger permission is used briefly to inspect the active YouTube player's Skip control and dispatch a browser-level mouse click. Chrome grants broader access than this implementation uses. The code restricts this behavior to top-level YouTube tabs, checks the page origin and active ad, and detaches afterward.

YouTube and Chrome operate under their own privacy policies. Public support requests on GitHub are handled by GitHub; include only information you intend to publish.

QuietSkip's use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

For questions, open an issue at https://github.com/josephtwilliams/quietskip/issues.
