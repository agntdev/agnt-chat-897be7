# CasualChat Bot — Bot specification

**Archetype:** custom

**Voice:** friendly and casual — write every user-facing message, button label, error, and empty state in this voice.

A public Telegram bot that maintains casual conversations with up to 10-message context, offering /start, /help, /clear, and /report commands while enforcing abuse policies and auto-purging inactive sessions.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Telegram users seeking casual conversation
- General public for quick answers

## Success criteria

- Users receive context-aware replies based on last 10 messages
- Admin receives abuse reports and error alerts
- Conversation history auto-purges after 30 days of inactivity

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open welcome message and capabilities explanation
- **/help** (command, actor: user, command: /help) — Show usage summary
- **/clear** (command, actor: user, command: /clear) — Reset conversation history
- **/report** (command, actor: user, command: /report) — Send abuse report to admin

## Flows

### Conversation start
_Trigger:_ direct message or /start

1. Send welcome message
2. Explain capabilities

_Data touched:_ User, Conversation session

### Normal chat
_Trigger:_ User sends message

1. Store message in session history
2. Generate reply using last 10 messages

_Data touched:_ Message, Conversation session

### Abuse handling
_Trigger:_ Message contains disallowed content

1. Send polite refusal
2. Log to admin with user details

_Data touched:_ Message, User

## Owner-supplied settings

The OWNER provides these; they are collected in chat and injected into the environment at deploy. Read each one from the environment where it is used (`env.<KEY>` on Workers). Do NOT invent your own way of learning the value, do NOT ask for it in a bot message, and do NOT hardcode a default.

- **ADMIN_CHAT_ID** — Receive abuse reports and error alerts
  - this is the OWNER's own chat id; the platform already knows it. Read `ADMIN_CHAT_ID` — never ask a user, never treat whoever writes first as the admin.
  - may be UNSET at runtime: the bot must still start, and the feature needing ADMIN_CHAT_ID must say so plainly instead of failing.

Your behavioral specs run WITHOUT these values, so no spec may depend on one.

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

An entity that merely NAMES an owner-supplied setting above (an admin chat, an API account) is not something to store or discover — read it from the environment.

- **User** _(retention: persistent)_ — Telegram user identity and display name
  - fields: telegram_user_id, display_name
- **Conversation session** _(retention: session)_ — Rolling history of last 10 messages per user
  - fields: message_history, last_active_timestamp
- **Message** _(retention: session)_ — Individual message content and metadata
  - fields: text, timestamp, sender_type

## Integrations

- **Telegram** (required) — Bot API messaging
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Admin chat for abuse reports and error alerts
- Configurable inactivity retention period (default 30 days)

## Notifications

- Abuse reports with user ID and message content
- Error alerts when message processing fails

## Permissions & privacy

- Store last 10 messages per user for context (purged after 30 days inactivity)
- No personal data beyond Telegram-provided user IDs

## Edge cases

- Handling users exceeding abuse thresholds
- Purging inactive sessions after 30 days
- Message history rollover when exceeding 10 messages

## Required tests

- Verify /clear resets history
- Validate abuse reports reach admin chat
- Confirm context-aware replies use last 10 messages

## Assumptions

- Using Telegram's built-in message storage for session history
- Default 30-day inactivity purge unless owner specifies otherwise
