# Workflow

`hotel_whatsapp_bot.json` is the sanitized n8n export . It contains four flows in one workflow:

1. **Meta webhook verification** (GET `/webhook/hotel-wa`)
2. **Guest chat** (POST `/webhook/hotel-wa`): dedupe, language detection, session check, `Load Context` (settings + the guest's bookings), `Brain` (state machine), then one of: reply, SQL (`Run SQL` -> `Brain Post`), receptionist alert, or the FAQ LLM (no booking tools)
3. **Scheduler** (every 20 seconds): alerts the receptionist about new PENDING requests, expires old holds, and re-sends any guest decision message that did not go out (`guest_notified = 0`)
4. **Approval** (`/webhook/hotel-approve` page and `/webhook/hotel-decide` action): receptionist approves or rejects, guest is notified

## Before you import

Replace after importing:
- `YOUR_PHONE_NUMBER_ID` in every WhatsApp send node
- `YOUR_VERIFY_TOKEN` in the `Check Verify` node (use the same token in the Meta webhook settings)
- Select your own credentials: MySQL, WhatsApp, and the LLM model node

Credentials are not part of the export. In the retry wait node keep the unit on **seconds**.
