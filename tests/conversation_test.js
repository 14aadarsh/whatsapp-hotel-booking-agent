// End-to-end conversation tests for the guided booking flow.
// Runs the REAL Code nodes (Clean Message, Brain, Brain Post) and SQL nodes (Session Update, Load Context)
// from workflow/hotel_whatsapp_bot.json against a scratch MySQL / MariaDB database.
const fs = require('fs'), cp = require('child_process');
const wf = JSON.parse(fs.readFileSync(__dirname + '/../workflow/hotel_whatsapp_bot.json', 'utf8'));
const N = n => wf.nodes.find(x => x.name === n);
const ARGS = (process.env.MYSQL_ARGS || '-uroot -S /tmp/m.sock').split(' ');
const run = sql => { try { return cp.execFileSync('mysql', [...ARGS, 'hotel_booking', '-B', '--raw', '-e', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return 'ERR ' + e.stderr; } };
const my = sql => { const o = run(sql); if (o.startsWith('ERR')) throw new Error(o); if (!o.trim()) return []; const [h, ...r] = o.trim().split('\n'); const c = h.split('\t'); return r.map(l => Object.fromEntries(l.split('\t').map((v, i) => [c[i], v === 'NULL' ? null : v]))); };
const render = (tpl, from, CM) => tpl.replace(/^=/, '').replace(/\{\{([\s\S]*?)\}\}/g, (m, e) => { const $ = n => ({ first: () => ({ json: CM || { from } }) }); const v = new Function('$', `return (${e});`)($); return v == null ? '' : String(v); });
const sd = {};
function turn(from, text) {
  const body = { entry: [{ changes: [{ value: { messages: [{ id: 'm' + Math.random(), from, type: 'text', text: { body: text } }] } }] }] };
  const cm = new Function('$input', '$getWorkflowStaticData', N('Clean Message').parameters.jsCode)({ first: () => ({ json: { body } }) }, () => sd);
  const CM = cm[0].json; let brainOut, ctx = {};
  const $ = n => ({ first: () => ({ json: n === 'Clean Message' ? CM : n === 'Brain' ? brainOut : n === 'Load Context' ? ctx : {} }) });
  my(render(N('Session Update').parameters.query, from, CM));
  ctx = my(render(N('Load Context').parameters.query, from, CM))[0] || {};
  const b = new Function('$input', '$', '$getWorkflowStaticData', N('Brain').parameters.jsCode)({ first: () => ({ json: ctx }) }, $, () => sd);
  brainOut = b[0].json;
  if (brainOut.action === 'reply') return { action: 'reply', text: brainOut.output };
  if (brainOut.action === 'faq') return { action: 'faq', text: brainOut.suffix || '' };
  if (brainOut.action === 'help') return { action: 'help', text: brainOut.output, to: brainOut.rec_phone };
  const rows = my(brainOut.sql);
  const p = new Function('$input', '$', '$getWorkflowStaticData', N('Brain Post').parameters.jsCode)({ first: () => ({ json: rows[0] || {} }), all: () => rows.map(j => ({ json: j })) }, $, () => sd);
  return { action: 'sql', text: p[0].json.output };
}
let pass = 0, fail = 0;
const ok = (name, c, info = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', name, c ? '' : info); };
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const day = n => { const d = new Date(Date.now() + 5.5 * 3600e3 + n * 86400e3); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; };
const AADHAAR = '491417776311';   // valid Verhoeff checksum
const P = i => '9198000100' + String(i).padStart(2, '0');
run("DELETE FROM hb_bookings; DELETE FROM hb_guests; DELETE FROM hb_sessions; DELETE FROM hb_msg_tokens; UPDATE hb_config SET cfg_value='919111111111' WHERE cfg_key='receptionist_phone'");

let r = turn(P(1), 'hi');
ok('greets with a welcome menu', /Welcome to/.test(r.text) && /Book a room/.test(r.text) && /receptionist/i.test(r.text), r.text);
r = turn(P(2), 'i want to book 11 ac rooms');
ok('"book 11 ac rooms" starts a booking (never "no capability")', /check-in and check-out/i.test(r.text) && !/capab|sorry/i.test(r.text) && /11 AC/.test(r.text), r.text);

// full happy path, English
const f = P(3);
turn(f, 'hello'); turn(f, '1');
r = turn(f, day(20) + ' to ' + day(22)); ok('asks rooms after dates', /How many rooms/.test(r.text), r.text);
r = turn(f, '2 AC and 2 non ac'); ok('availability + exact total from DB (2 nights: 2x3000 + 2x1800 = 19200)', /Rs 19,200/.test(r.text) && /guests/i.test(r.text), r.text);
r = turn(f, '8'); ok('guests accepted, asks name', /full name/i.test(r.text), r.text);
r = turn(f, 'Ravi Kumar'); ok('asks ID', /photo ID/i.test(r.text), r.text);
r = turn(f, 'aadhaar 38348843377'); ok('11-digit Aadhaar rejected', /12 digits/.test(r.text), r.text);
r = turn(f, 'aadhaar 123456789012'); ok('Aadhaar with bad checksum rejected', /not look valid/i.test(r.text), r.text);
r = turn(f, 'aadhaar ' + AADHAAR.slice(0, 4) + ' ' + AADHAAR.slice(4, 8) + ' ' + AADHAAR.slice(8)); ok('valid Aadhaar accepted, summary shows MASKED id', /XXXXXXXX6311/.test(r.text) && !r.text.includes(AADHAAR) && /Reply YES/.test(r.text), r.text);
r = turn(f, 'guests 6'); ok('guests can still be changed at the summary', /6 guests/.test(r.text) && /Reply YES/.test(r.text), r.text);
r = turn(f, 'yes'); ok('booking created but NOT confirmed', /NOT confirmed/.test(r.text) && /HB[0-9A-F]{6}/.test(r.text), r.text);
const row = my("SELECT status,rooms_count,total_amount,total_guests,id_proof_number FROM hb_booking_summary WHERE phone='" + f + "'")[0];
ok('database row: PENDING, 4 rooms, 19200.00, 6 guests, masked id', row && row.status === 'PENDING' && row.rooms_count === '4' && row.total_amount === '19200.00' && row.total_guests === '6' && /^X+6311$/.test(row.id_proof_number), JSON.stringify(row));
r = turn(f, 'status'); ok('status says waiting for approval', /NOT confirmed/.test(r.text) && /approval/i.test(r.text), r.text);
r = turn(f, 'cancel'); ok('cancel asks for confirmation', /cancel booking HB/i.test(r.text), r.text);
r = turn(f, 'yes'); ok('cancel done', /cancelled/i.test(r.text), r.text);
ok('cancelled booking releases rooms', my("SELECT COUNT(*) n FROM hb_booking_rooms br JOIN hb_bookings b ON b.id=br.booking_id WHERE b.status='CANCELLED'")[0].n === '0');

// availability / capacity
let g = P(4); turn(g, 'book'); turn(g, day(30) + ' to ' + day(31));
r = turn(g, '16 ac'); ok('too many rooms: tells what is available', /Available: 15 AC/.test(r.text), r.text);
r = turn(g, '2 ac'); r = turn(g, '9'); ok('over capacity (9 guests, 2 rooms) is refused', /do not fit/.test(r.text), r.text);

// suggestion when guests <= rooms
g = P(5); turn(g, 'book 6 ac rooms ' + day(40) + ' to ' + day(41));
r = turn(g, '6'); ok('6 rooms / 6 guests: suggests 3 rooms', /3 rooms should be enough/.test(r.text) && /YES to keep 6/.test(r.text), r.text);
r = turn(g, 'no'); ok('NO lets the guest pick rooms again', /How many rooms/.test(r.text), r.text);
turn(g, '3 ac'); r = turn(g, '6'); ok('6 guests in 3 rooms: no suggestion, goes to name', /full name/i.test(r.text), r.text);
g = P(6); turn(g, 'book 3 ac ' + day(42) + ' to ' + day(43)); turn(g, '2');
r = turn(g, '6'); ok('guest can change the guest count at the suggestion step', /full name/i.test(r.text), r.text);

// total explanation is computed, not hallucinated
g = P(7); turn(g, 'book 2 ac 2 non ac ' + day(45) + ' to ' + day(46));
r = turn(g, '9600 kese hua total?'); ok('"how is the total made" is answered from the booking data', /2 x Rs 3,000 x 1/.test(r.text) && /Rs 9,600/.test(r.text), r.text);

// routing
r = turn(P(8), 'AC room ka rate kya hai'); ok('rates answered by code (Hinglish)', /Rs 3,000/.test(r.text) && /Hamare rooms/.test(r.text), r.text);
r = turn(P(9), 'do you have wifi?'); ok('general question goes to the LLM', r.action === 'faq', JSON.stringify(r));
r = turn(P(10), '5'); ok('menu 5 alerts the receptionist', r.action === 'help' && r.to === '919111111111', JSON.stringify(r));
r = turn(P(11), 'status'); ok('status with no booking', /could not find a booking/i.test(r.text), r.text);

// Hindi (Devanagari)
g = P(12);
r = turn(g, 'मुझे एक कमरा चाहिए'); ok('Hindi: replies in Devanagari', /[ऀ-ॿ]/.test(r.text) && /तारीख/.test(r.text), r.text);
turn(g, 'कल से 2 रात'); r = turn(g, '1 AC'); ok('Hindi: "कल से 2 रात" understood, total shown', /Rs 6,000/.test(r.text), r.text);

// duplicate and busy-guest protection
g = P(13); turn(g, 'book 1 ac ' + day(50) + ' to ' + day(51)); turn(g, '2'); turn(g, 'Asha Rao'); turn(g, 'aadhaar ' + AADHAAR); turn(g, 'yes');
r = turn(g, 'yes'); ok('second YES does not create a second booking', my("SELECT COUNT(*) n FROM hb_bookings b JOIN hb_guests g ON g.id=b.guest_id WHERE g.phone='" + g + "'")[0].n === '1', r.text);

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
