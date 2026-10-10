# Chrome Web Store submission copy

Name: QuietSkip

Summary: Mutes YouTube ads, restores your previous mute setting, and clicks Skip when available.

## Description

QuietSkip quietly handles YouTube video ads in desktop Chrome. It mutes detected ads, restores your previous mute setting afterward, and clicks Skip when YouTube makes the button available.

No account, tracking, analytics, or backend. Free and open source.

QuietSkip does not remove ads or skip an ad before its Skip button is enabled. YouTube player changes can affect detection. The popup shows current ad status and attempted Skip clicks.

The debugger permission allows a brief browser-level click because YouTube rejects scripted Skip clicks. Chrome grants this permission broadly, while QuietSkip restricts its implementation to YouTube tabs and checks the active ad and visible Skip control before acting. It detaches after each attempt. Chrome may display a debugging banner; open DevTools or another debugger can prevent automatic skipping.

Independent project, not affiliated with YouTube or Google.

Source and support: https://github.com/josephtwilliams/quietskip
Privacy policy: https://github.com/josephtwilliams/quietskip/blob/main/PRIVACY.md

## Single purpose

Mute YouTube video ads and activate the available Skip control, restoring the user's previous mute setting afterward.

## Permission justification: debugger

YouTube's Skip handler rejects untrusted scripted clicks. The debugger API dispatches browser-level mouse input to that same enabled control. Requests are accepted only from top-level YouTube content scripts. The worker independently rechecks the exact YouTube origin and active ad, finds a visible enabled control at its current location, sends a mouse press and release, and detaches in a finally block. It accepts no arbitrary code or coordinates from messages. DOM-only scripted clicks were tested and rejected by YouTube.

## Site access justification

Content scripts run only on https://www.youtube.com/* to inspect ad state, mute the player, restore its previous mute setting, and request Skip clicks.

## Remote code

No remote code. All logic, including the Runtime.evaluate expression, is generated exclusively from packaged functions and constants. Nothing is fetched from remote sources.

## Data disclosures

No user data is collected, stored persistently, or transmitted. Player state and diagnostics are processed locally in memory for the single purpose. Review the dashboard's exact wording when completing its certifications.

## Reviewer test instructions

1. Install, allow the requested permission, and close DevTools on YouTube tabs.
2. Open a monetized video at https://www.youtube.com/. Ad delivery depends on account and location; an ad-free or Premium session will not exercise the feature.
3. During a video ad, open QuietSkip's popup and verify it reports muting active.
4. When Skip becomes available, observe a click attempt and return to playback. Audio restores to the prior mute setting.
5. Test an already-muted video; it should remain muted afterward.
6. The popup counts attempts rather than guaranteed skips. No sign-in credentials required.

## Publication status

Submission and approval are pending. The debugger permission remains subject to Google's review. Do not describe the extension as approved before approval.
