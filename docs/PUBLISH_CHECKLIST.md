# Before you publish

- [ ] Revoke every key or token that was ever pasted into a chat or screenshot (WhatsApp access token, LLM API keys) and create new ones.
- [ ] Workflow JSON: remove Phone Number ID, Business Account ID, your phone numbers, ngrok URL, verify token.
- [ ] `sql/schema.sql` keeps placeholders (`91XXXXXXXXXX`, `YOUR-NGROK-URL`), not your real values.
- [ ] Screenshots and video: blur phone numbers, guest names that are real, tokens, and the ngrok URL.
- [ ] README: replace `YOUR_VIDEO_LINK`; add 3-4 screenshots in `docs/screenshots/` and reference them.
- [ ] Do not present it as a live client project unless it is one: "demo / proof of concept for a 30-room hotel".

# Git commands

```
cd whatsapp-hotel-booking-agent
git init
git add .
git commit -m "WhatsApp hotel booking agent: rule-based booking flow, MySQL, receptionist approval"
git branch -M main
git remote add origin https://github.com/14aadarsh/whatsapp-hotel-booking-agent.git
git push -u origin main
```
(Create the empty repo `whatsapp-hotel-booking-agent` on GitHub first. Add topics: n8n, whatsapp, llm-agent, mysql, automation.)
