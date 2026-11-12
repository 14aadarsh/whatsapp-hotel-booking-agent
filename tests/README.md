# Tests

Run against a **scratch** database (the tests delete bookings):

```bash
mysql -uroot -e "DROP DATABASE IF EXISTS hotel_booking" && mysql -uroot < sql/schema.sql
export MYSQL_ARGS="-uroot"            # or "-uroot -S /path/to/socket", add -h/-p as needed
node tests/conversation_test.js       # 30 checks: full guest conversations against the shipped workflow
node tests/db_layer_tests.js          # 33 checks: SQL tools, approval page, notifications, expiry, cancel (v5 variant)
python3 tests/concurrency_test.py     # 10 parallel guests, 15 rooms -> exactly 5 succeed, no double booking
```

`conversation_test.js` executes the real `Clean Message`, `Brain` and `Brain Post` Code nodes and the real `Session Update` / `Load Context` SQL from `workflow/hotel_whatsapp_bot.json`, so it tests the artifact you import. It plays guest chats: welcome menu, "book 11 ac rooms", the full booking in English and Hindi, invalid and valid Aadhaar, masked ID, availability and capacity limits, the fewer-guests suggestion, changing guests at the summary, how a total is calculated, rates, FAQ routing, receptionist alert, status, cancel (rooms released) and duplicate YES.

`db_layer_tests.js` covers the database layer with the earlier v5 LLM-agent export (`workflow/v5_llm_agent_variant.json`): totals, ID checks and masking, duplicates, capacity, expired holds, approval tokens, single guest notification, sweeper, cancellation.

Tested on MariaDB 10.11; the schema targets MySQL 8.0.16+ as well. Apply `sql/schema.sql` fully (it includes `hb_msg_tokens`).
