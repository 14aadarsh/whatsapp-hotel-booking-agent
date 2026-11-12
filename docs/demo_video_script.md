# Demo video: 60-90 seconds

Record the guest phone and the receptionist phone side by side (screen recording of both, or two takes). Add captions; many people watch with the sound off.

| Time | Show | Caption / voiceover |
|---|---|---|
| 0-5 s | Title card | "WhatsApp hotel booking agent: rules decide, a human approves" |
| 5-15 s | Guest says "hi"; welcome menu appears | "Real front-desk flow: welcome menu first" |
| 15-35 s | Guest types `2 AC aur 2 non ac room, 20 dec se 21 dec`; bot shows availability and total Rs 9,600; guest asks "total kaise hua?" and gets the breakdown | "Understands Hinglish. Price comes from the database, not from the AI" |
| 35-50 s | Guests, name, wrong Aadhaar rejected, correct one accepted, summary with masked ID, YES. Bot says "request received, NOT confirmed yet" | "ID validated with a checksum. The bot never confirms by itself" |
| 50-65 s | Receptionist phone: alert, open link, tap Approve; guest phone: CONFIRMED message | "Human approval, guest notified instantly" |
| 65-80 s | n8n canvas 5 seconds, then the booking table in Workbench (1 booking = 1 row) | "n8n + MySQL, normalized design, safe transactions" |
| 80-90 s | End card with GitHub link | "Code, tests and docs on GitHub" |

Optional 6-room / 6-guest clip: the bot suggests 3 rooms, the guest can keep, change rooms or change guests.

Tips: do one dry run first; use a fresh chat (`DELETE FROM hb_sessions`); blur or crop phone numbers; keep the ngrok warning page out of the shot (open it once before recording).
