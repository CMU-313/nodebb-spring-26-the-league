# User Guide — Sprint Features

This guide covers the three features implemented during this sprint: **Message Forwarding**, **Message Reactions**, and **Custom Color Scheme**.

---

## Table of Contents

1. [Message Forwarding](#1-message-forwarding)
2. [Message Reactions](#2-message-reactions)
3. [Custom Color Scheme](#3-custom-color-scheme)
4. [Automated Tests](#4-automated-tests)

---

## 1. Message Forwarding

### Overview

Message Forwarding allows a registered user to share a chat message from one chat room to another. The forwarded message appears in the destination room with a visual reference to the original message and its sender.

### How to Use

1. **Open a chat room** — Navigate to your chats and open any conversation.
2. **Hover over a message** — Hover over the message you want to forward. A toolbar of action buttons will appear.
3. **Click the Forward button** — Click the **share icon** (<i class="fa fa-share"></i>) in the message toolbar.
4. **Select a destination** — A dropdown appears listing all of your other chat rooms (both private and public). You can **search** for a specific room using the search bar at the top of the dropdown.
5. **Click a chat to forward** — Click the desired room. A confirmation alert will appear, and the message will be sent to the selected room.
6. **View the forwarded message** — In the destination room, the forwarded message appears with:
   - A **share icon** and the **original sender's avatar and name**
   - A **preview of the original message content**
   - The new message body (labeled "(Forwarded Message)")

### User Testing Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open a chat room with at least one message | Messages display normally |
| 2 | Hover over a message | Action toolbar appears (reply, forward, ellipsis menu) |
| 3 | Click the forward (share) button | A "Forward to:" dropdown opens with a search bar and a list of your other chat rooms |
| 4 | Type in the search field | Room list filters in real time |
| 5 | Click a room in the list | A success alert ("Message forwarded") appears, and the dropdown closes |
| 6 | Navigate to the destination room | The forwarded message appears with the original sender info and content preview |
| 7 | Click the forward button again, then click the ✕ close button on the dropdown | The dropdown closes without forwarding |
| 8 | Click outside the dropdown | The dropdown closes |

---

## 2. Message Reactions

### Overview

Message Reactions allow registered users to react to any chat message with an emoji. Reactions are visible to all room members and update in **real time** via WebSocket events.

### How to Use

1. **Open a chat room** — Navigate to a chat conversation.
2. **Add a reaction** — Below each message, click the **smiley face button** (😊). An emoji picker will appear.
3. **Select an emoji** — Choose any emoji from the picker. A **reaction pill** will appear below the message, showing the emoji and a count of `1`.
4. **Toggle a reaction** — Click an existing reaction pill to add your reaction (if you haven't reacted with that emoji) or to remove it (if you already have).
5. **View who reacted** — Reaction pills you've personally used are highlighted with a distinct "reacted" style.
6. **Real-time updates** — When another user in the room adds or removes a reaction, your view updates automatically.

### User Testing Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open a chat room with messages | Messages appear normally, with a small smiley button visible below each message |
| 2 | Click the smiley (add reaction) button on a message | An emoji picker dialog opens |
| 3 | Select an emoji (e.g., 👍) | A reaction pill appears below the message with the emoji and count "1" |
| 4 | Click the same reaction pill again | The reaction toggles off — the pill disappears (count drops to 0) |
| 5 | Add a reaction, then have a **second user** react with the same emoji | The count on the pill increases to "2"; the first user's pill shows the "reacted" highlight |
| 6 | As the second user, view the reaction pill | The pill appears without the "reacted" highlight (since it reflects only the current user's state) |
| 7 | Send an invalid emoji string via the API (e.g., `notanemoji`) | The server returns a 400 error |
| 8 | Attempt to react as a user **not in the room** | The server returns a 403 error |

---

## 3. Custom Color Scheme

### Overview

Custom Color Scheme lets each registered user create a personalized color theme for their NodeBB interface. When the **"Custom"** skin is selected, 7 color pickers appear, allowing the user to control header, body, link, and button colors.

### How to Use

1. **Go to Account Settings** — Click your profile picture → **Settings** (or navigate to `/user/<your-username>/settings`).
2. **Select the "Custom" skin** — In the **Skin** dropdown, choose **"Custom"**.
3. **Adjust colors** — Seven color picker groups will appear:

   | Setting | What It Controls |
   |---------|-----------------|
   | Header Background | Background color of the sidebar / navigation areas |
   | Header Text | Text color in the sidebar / navigation areas |
   | Body Background | Main page background color |
   | Body Text | Default text color across the page |
   | Link Color | Color of all hyperlinks |
   | Button Background | Background color of primary buttons |
   | Button Text | Text color on primary buttons |

4. **Preview in real time** — Colors are applied instantly as you pick them, so you can see the result before saving.
5. **Save** — Click **"Save Changes"** at the bottom of the settings page. Your custom colors are stored and will persist across sessions and page reloads.
6. **Reset** — Click the **"Reset Colors"** button to clear all custom color values and revert to the defaults.
7. **Switch skins** — Selecting a different skin from the dropdown hides the color pickers and applies the selected Bootswatch theme instead. Switching back to "Custom" restores your previously saved colors.

### User Testing Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Account → Settings | Settings page loads with a Skin dropdown |
| 2 | Select "Custom" from the Skin dropdown | Seven color pickers appear below the dropdown |
| 3 | Set a Body Background color (e.g., `#1a1a2e`) | The page background changes immediately |
| 4 | Set Header Background / Text colors | Both sidebars and the brand area update |
| 5 | Set Button Background / Text colors | All primary buttons (including pagination, badges, etc.) update |
| 6 | Set a Link Color | All hyperlinks change color |
| 7 | Click "Save Changes", then reload the page | All custom colors persist after reload (no flash of unstyled content) |
| 8 | Click "Reset Colors" | All color pickers clear and the page reverts to default styling |
| 9 | Switch to a different skin (e.g., Darkly) | Color pickers disappear; the Darkly theme is applied |
| 10 | Switch back to "Custom" | Color pickers reappear with previously saved colors |
| 11 | Enter an invalid color value via the API (e.g., `not-a-color`) | The server rejects it with error `[[error:invalid-theme-color]]` |
| 12 | Open a new browser/incognito window and log in | Custom colors load immediately on every page (FOUC prevention) |

---

## 4. Automated Tests

### Message Forwarding Tests

- **File:** [`test/messaging.js`](test/messaging.js) — `forwardMid` describe block (lines 631–674)
- **How to run:**
  ```bash
  npx mocha test/messaging.js --grep "forwardMid" --timeout 60000
  ```

| Test | What It Validates |
|------|-------------------|
| `should fail if forwardMid is not a number` | Rejects non-numeric `forwardMid` values with "Invalid Chat Message ID" |
| `should forward firstMid using forwardMid` | A forwarded message round-trips correctly — `forwardedMessage` is present in the response with the correct `mid` and `content` |

**Why these tests are sufficient:** They cover the two critical paths: input validation (rejecting invalid IDs) and the full end-to-end flow (sending a forwarded message and verifying the forwarded content is correctly linked and returned in the message payload).

---

### Message Reactions Tests

- **File:** [`test/messaging.js`](test/messaging.js) — `Emoji Reactions` describe block (lines 880–941)
- **How to run:**
  ```bash
  npx mocha test/messaging.js --grep "Emoji Reactions" --timeout 60000
  ```

| Test | What It Validates |
|------|-------------------|
| `should allow a user to add a reaction` | A user can successfully add a reaction; response confirms `added: true` |
| `should toggle off a reaction if the same emoji is sent again` | Sending the same emoji again removes the reaction (`added: false`) |
| `should return reactions with correct count and self flag` | Two users reacting with the same emoji yields `count: 2` and the requesting user sees `self: true` |
| `should reflect self as false for a user who has not reacted` | A non-reacting user sees `self: false` |
| `should reject an invalid emoji` | Non-emoji strings are rejected with a 400 error |
| `should reject a reaction from a user not in the room` | Unauthorized users receive a 403 error |
| `should include reactions in message payload` | Reactions are automatically included when fetching a message |

**Why these tests are sufficient:** They cover adding, toggling, counting, per-user state (`self` flag), input validation (invalid emoji), authorization (non-member rejection), and payload integration. Together, these tests exercise every backend code path in the reactions module.

---

### Custom Color Scheme Tests

- **File:** [`test/user.js`](test/user.js) — `custom theme` tests
- **How to run:**
  ```bash
  npx mocha test/user.js --grep "custom theme" --timeout 60000
  ```

| Test | What It Validates |
|------|-------------------|
| `should save custom theme color settings` | All 7 color fields round-trip correctly through save and load |
| `should reject invalid custom theme color values` | Non-hex values are rejected with `[[error:invalid-theme-color]]` |
| `should allow empty custom theme color values` | Empty strings are accepted (allows users to clear individual colors) |
| `should sanitize custom theme color values on read` | Raw `<script>` tags stored in the DB are escaped to `&lt;script&gt;` on read (XSS prevention) |

**Why these tests are sufficient:** They validate the complete settings lifecycle — saving, loading, validation, clearing, and sanitization. The validation test ensures CSS injection is blocked, and the sanitization test confirms XSS protection at the data layer. These cover all server-side logic for the feature.
