remove go to tab action menu, to go tab just click on the notification system. because the remind me in 5 is not showing maybe because it max to two action menu

===

#### Tier 1: User Interface & Experience Enhancements

These features focus on improving the user's direct interaction with the on-page indicator.

1.  **Persistent Indicator Position:**
    *   **Description:** Save the indicator's last known `(x, y)` coordinates to `chrome.storage.local`. When the page reloads, the indicator would reappear at the position the user last dragged it to, instead of resetting to the top-right corner.
    *   **Benefit:** Improves user convenience and personalization.


===

4.  **Run History in Indicator:**
    *   **Description:** Make the indicator expandable. When expanded, it could show a list of the last 3-5 runs from the current session, including their duration and final status (e.g., `✔ 01:23`, `✖ 00:15`). also useful summary stat like avg
    *   **Benefit:** Provides immediate, at-a-glance context of recent activity without needing to check logs.

#### Tier 2: Configuration & Customization

2.  **Customizable Notification Sound:**
    *   **Description:** On the options page, allow users to select from a list of built-in notification sounds, or choose "None" to disable the sound entirely.
    *   **Benefit:** Gives users control over the auditory feedback, which is a highly personal preference.

===

3.  **Configurable Timers & Thresholds:**
    *   **Description:** Add settings to let the user:
        *   Change the "Remind me in..." duration (currently hardcoded to 5 minutes).
        *   Adjust the minimum process duration required to trigger a notification (currently 3 seconds).
    *   **Benefit:** Allows users to fine-tune the notification logic to match their specific workflows.

===

4.  **Notification Button Configuration:**
    *   **Description:** Let users choose which buttons appear on the desktop notification (e.g., hide the "Remind" button if they never use it).
    *   **Benefit:** Simplifies the notification and tailors it to the user's most common actions.

---

#### Tier 3: Advanced Functionality & Integrations

These are more significant features that would extend the core capabilities of the extension.

1.  **Run History & Analytics Dashboard:**
    *   **Description:** Persistently store run data (start time, duration, status) in `chrome.storage.local`. The options page could then feature a dashboard with a table of all past runs and simple analytics, like average run time or success/error rate.
    *   **Benefit:** Provides valuable insights into model performance and generation times over a longer period.

===

3.  **Contextual Run Naming:**
    *   **Description:** Attempt to automatically capture context from the name when a run starts, such as the model name or the first few words of the prompt. This name would then be included in the desktop notification (e.g., "Finished in 2m 15s - Google Search...").
    *   **Benefit:** Makes notifications far more informative, especially if the user has multiple AI Studio tabs open.

===

4.  **Multi-Tab Awareness:**
    *   **Description:** Refactor the state management to be tab-specific. This would allow the extension to track processes in multiple AI Studio tabs simultaneously. The UI could be handled by either showing one indicator per tab or a single, master indicator that lists the status of all tracked tabs.
    *   **Benefit:** A critical feature for power users who work on multiple prompts or models in parallel.

to save resource,

1. after finish proc

===

no need to fire notification if the finish processed duration below 3 second

===

move all constants to constants.ts and type to types.ts

===

add pause resume feature to floating indicator

---

the pause resume feature is also on standby state not only in during processing state

===

in floating indicator add time took timer so user know current time while processing

===

show time took also in Your process has finished notification.

===

make sure that this is production ready to handle multi monitor of multipe tabs

currently

1. on multi chrome window usage, sometimes intervally playing notification sound by itself
2. multiple firing notifications from different windows causing view button not working properly

===

should show notification on system. with following action button ;

1. Go To Tab
2. Dismiss
3. Remind 5 min

so that can be fast navigating while desktop on another window

===

add draggable floating indicator that showing the status so user know wether current page is being monitored, paused, error problem or what. use react tailwind

===
