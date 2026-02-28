# Emoji Reactions Feature - User Guide

## Overview
Registered users can react to chat messages with emojis. Reactions are visible to all users in the room and update in real time.

---

## How to Use

> *This section for frontend details*

- How to open the reaction picker
- How to add a reaction to a message
- How to remove a reaction (click again to toggle off)
- Where reaction counts are displayed
- How real-time updates appear

---

## API Reference (Backend)

The following REST endpoints are available for emoji reactions:

### Get Reactions for a Message
```
GET /api/v3/chats/:roomId/messages/:mid/reactions
```
Returns all reactions on a message, including count and whether the requesting user has reacted.

**Response:**
```json
{
  "reactions": [
    { "emoji": "👍", "count": 3, "self": true },
    { "emoji": "😂", "count": 1, "self": false }
  ]
}
```

### Add or Remove a Reaction (Toggle)
```
POST /api/v3/chats/:roomId/messages/:mid/reactions
```
**Request body:**
```json
{ "emoji": "👍" }
```
**Response:**
```json
{ "added": true, "emoji": "👍" }
```
If the user has already reacted with that emoji, the reaction is removed and `added` will be `false`.

### Reactions in Message Payload
Reactions are also included automatically when fetching messages:
```
GET /api/v3/chats/:roomId/messages/:mid
```
The message object will include a `reactions` array in the same format as above.

---

## Real-Time Behavior
When any user adds or removes a reaction, all users currently in the room receive a socket event `event:chats.reaction` with the following payload:
```json
{
  "mid": 123,
  "uid": 456,
  "emoji": "👍",
  "added": true,
  "reactions": [ ... ]
}
```
The full updated reactions array is included so the UI can re-render without any additional API calls.

---

## Validation & Authorization
- Only registered users who are members of the room can react to messages
- Only valid emoji characters are accepted — plain text will be rejected with a 400 error
- Each user can only have one reaction per emoji per message (toggling removes it)
- Reactions work on both regular and deleted messages

---

## Automated Tests

**Location**: `test/messaging.js` — search for the `Emoji Reactions` describe block near the bottom of the file.

**How to run:**
```bash
./node_modules/.bin/mocha test/messaging.js
```

### What is tested and why

| Test | Why |
|------|-----|
| User can add a reaction | Confirms the happy path works end to end |
| Toggling same emoji removes it | Confirms toggle behavior from the data model |
| Reaction count and self flag are correct | Confirms multi-user reactions aggregate correctly and self is user-specific |
| Self is false for a user who hasn't reacted | Confirms self flag isn't incorrectly true for all users |
| Invalid emoji is rejected | Confirms input validation |
| User not in room is rejected | Confirms authorization |
| Reactions included in message payload | Confirms reactions are bundled with messages automatically |

These tests cover all acceptance criteria: adding/removing reactions, correct aggregation, per-user self flag, authorization, validation, and message payload integration.

---

## Frontend Testing Guide

> *This section for frontend details*

- Step by step instructions for manually testing the feature in the browser
- Expected behavior for edge cases (e.g. reacting to your own message, multiple users reacting)