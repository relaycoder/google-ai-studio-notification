for kimi

the button state are

<svg data-v-fc4634ef="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" name="Send" class="send-icon iconify" width="1em" height="1em" viewBox="0 0 1024 1024"><path d="M705.536 433.664a38.4 38.4 0 1 1-54.272 54.272L550.4 387.114667V729.6a38.4 38.4 0 0 1-76.8 0V387.114667l-100.864 100.821333a38.4 38.4 0 1 1-54.272-54.272l166.4-166.4a38.4 38.4 0 0 1 54.272 0l166.4 166.4z" fill="currentColor" data-darkreader-inline-fill="" style="--darkreader-inline-fill: currentColor;"></path></svg>

and when processing

<svg data-v-fc4634ef="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" name="stop" class="send-icon iconify" width="1em" height="1em" viewBox="0 0 1024 1024"><path d="M331.946667 379.904c-11.946667 23.466667-11.946667 54.186667-11.946667 115.626667v32.938666c0 61.44 0 92.16 11.946667 115.626667 10.538667 20.650667 27.306667 37.418667 47.957333 47.957333 23.466667 11.946667 54.186667 11.946667 115.626667 11.946667h32.938666c61.44 0 92.16 0 115.626667-11.946667 20.650667-10.538667 37.418667-27.306667 47.957333-47.957333 11.946667-23.466667 11.946667-54.186667 11.946667-115.626667v-32.938666c0-61.44 0-92.16-11.946667-115.626667a109.696 109.696 0 0 0-47.957333-47.957333c-23.466667-11.946667-54.186667-11.946667-115.626667-11.946667h-32.938666c-61.44 0-92.16 0-115.626667 11.946667-20.650667 10.538667-37.418667 27.306667-47.957333 47.957333z" fill="currentColor" data-darkreader-inline-fill="" style="--darkreader-inline-fill: currentColor;"></path></svg>

the distinguisable is name="Send" and name="stop"

===

we need configurable constant from yaml file of list web and target element selector because the page is not only ai studio but also https://www.kimi.com/chat/* https://chat.qwen.ai/c/*

===

the element target should be in constants.ts

===

add below state status to floating indicator:

`Could not post message, port may be disconnected. Error: Attempting to use a disconnected port object`
`AI Studio Notifier: Cannot post message, port is not connected.`
`AI Studio Notifier: Connection to background script failed: Error: Extension context invalidated.`

===

standby monitoring should auto paused when the user is not in the tab or not active. and auto resume monitoring when the user is back. so we can save resource

===

multi tab usage on different chrome tab profile always causing error

`AI Studio Notifier: Cannot post message, port is not connected.`
`AI Studio Notifier: Connection to background script failed: Error: Extension context invalidated.`

===

remove the width gap in floating indicator.

===

content.js problems

Could not post message, port may be disconnected. Error: Attempting to use a disconnected port object
content.js:40 (anonymous function)

+u.stack}return{value:e,source:t,stack:l,digest:null}}function Ql(e,t,n){return{value:e,source:null,stack:n??null,digest:t??null}}function Lu(e,t){try{console.error(t.value)}catch(n){setTimeout(function(){throw n})}}var fd=typeof WeakMap=="function"?WeakMap:Map;function ja(e,t,n){n=Qe(-1,n),n.tag=3,n.payload={element:null};var r=t.value;return n.callback=function(){el||(el=!0,$u=r),Lu(e,t)},n}function Da(e,t,n){n=Qe(-1,n),n.tag=3;var r=e.type.getDerivedStateFromError;if(typeof r=="function"){var l=t.value;n.payload=function(){return r(l)},n.callback=function(){Lu(e,t)}}var u=e.stateNode;return u!==null&&typeof u.componentDidCatch=="function"&&(n.callback=function(){Lu(e,t),typeof r!="function"&&(ct===null?ct=new Set([this]):c..............


===

expanded indicator view;

1. sidebar should be resizable
2. default size of sidebar and content list is not conforming to eyes
3. rather than showing tab title in item history, just show datetime and duration
4. hold ctrl + click to sidebar item should go to the tab
5. the main portion width should be the sidebar
6. show status to the sidebar items

===

make the codebase radically DRY for less code and less LoC without feature regression

also the monitoring often not working especially after previous process finished.

Could not post message, port may be disconnected. Error: Attempting to use a disconnected port object
Context
https://aistudio.google.com/prompts/1tCjzpm7gEhkVsmdAAVnTpnpxtZ9NybZF
Stack Trace
content.js:40 (anonymous function)

===

the UI and UX of expanded indicator is not so friendly for multi tab switching especially with many runs history

===

refactor the UI look and UX of expanded indicator and its features to be highly cohesive. also the resizable should also horizontal, edge any side.

===

remove go to tab action menu, to go tab just click on the notification system. because the remind me in 5 is not showing maybe because it max to two action menu

===

#### Tier 1: User Interface & Experience Enhancements

These features focus on improving the user's direct interaction with the on-page indicator.

1.  **Persistent Indicator Position:**
    *   **Description:** Save the indicator's last known `(x, y)` coordinates to `chrome.storage.local`. When the page reloads, the indicator would reappear at the position the user last dragged it to, instead of resetting to the top-right corner.
    *   **Benefit:** Improves user convenience and personalization.


===

4.  **Run History in Indicator:**
    *   **Description:** Make the indicator expandable. When expanded, it could show a list of the last runs from the current session, including their duration and final status (e.g., `✔ 01:23`, `✖ 00:15`). also useful summary stat like avg
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
    *   **Description:** Attempt to automatically capture context from the tab name when a run starts (e.g., "Finished in 2m 15s - Google Search...").
    *   **Benefit:** Makes notifications far more informative, especially if the user has multiple AI Studio tabs open.

===

4.  **Multi-Tab Awareness:**
    *   **Description:** Refactor the state management to be tab-specific. This would allow the extension to track processes in multiple AI Studio tabs simultaneously. The UI could be handled by either showing one indicator per tab or a single, master indicator that lists the status of all tracked tabs.
    *   **Benefit:** A critical feature for power users who work on multiple prompts or models in parallel.


===

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

create chrome extension

that is always watching for a button state in  https://aistudio.google.com/* tab

state 1: running and stoppable

has element

<rect _ngcontent-ng-c704612383="" x="8" y="8" width="8" height="8" class="stoppable-stop ng-tns-c704612383-13"></rect>

state 2: stopped and runnable

has no element/ absence of

<rect _ngcontent-ng-c704612383="" x="8" y="8" width="8" height="8" class="stoppable-stop ng-tns-c704612383-13"></rect>

I believe the static part of code to trace is the word of `stoppable-stop`

I want the chrome extension play notification sound on every transition of state 1 to state 2
