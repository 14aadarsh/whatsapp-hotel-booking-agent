// ===== BRAIN: deterministic hotel-receptionist conversation (no LLM for booking) =====
const msg = $('Clean Message').first().json;
const row = $input.first() ? $input.first().json : {};
const from = String(msg.from).replace(/\D/g, '');
const L = msg.lang || 'eng';
const raw = String(msg.text || '').trim();
const n = raw.toLowerCase().replace(/\s+/g, ' ');
const c = cfgOf(row), M = mk(L, c);
const today = todayIST();
let bookings = [];
try { const b = typeof row.bookings_json === 'string' ? JSON.parse(row.bookings_json) : row.bookings_json; if (Array.isArray(b)) bookings = b.map(x => ({ ...x, total: Number(x.total) || 0, mins: Number(x.mins) || 0 })).sort((a, b) => b.id - a.id); } catch (e) {}

const sd = $getWorkflowStaticData('global');
sd.flow = sd.flow || {};
for (const k of Object.keys(sd.flow)) if (Date.now() - (sd.flow[k].ts || 0) > 3 * 3600e3) delete sd.flow[k];
let s = sd.flow[from];
if (!s) s = { step: 'IDLE' };
const save = () => { s.ts = Date.now(); sd.flow[from] = s; };
const wipe = () => { delete sd.flow[from]; };
const fresh = () => { s = { step: 'IDLE' }; };

const out = (reply, extra) => [{ json: { action: 'reply', output: reply, ...(extra || {}) } }];
const say = reply => { save(); return out(reply); };
const faq = (suffix) => { save(); return [{ json: { action: 'faq', suffix: suffix ? '\n\n' + suffix : '' } }]; };

// ----- intents -----
const GREET = /^(hi+|hello+|hey+|hy|hlo|helo|namaste|namaskar|good (morning|afternoon|evening)|menu|start|help|restart|reset|home|main menu|नमस्ते|नमस्कार|हेलो|मेनू)(?=$|[\s,.!?])/i;
const RESET = /^(menu|restart|reset|start over|home|main menu|मेनू)(?=$|[\s,.!?])/i;
const I_STATUS = /\b(status|my booking|meri booking|booking status|check booking|booking check|kya hua)\b|स्टेटस|मेरी बुकिंग/i;
const I_CANCEL = /\bcancel|रद्द|कैंसिल|\bcancle\b/i;
const I_HELP = /\b(receptionist|reception|manager|human|call me|talk to|speak to|contact|complaint|agent|baat karni|baat karna)\b|रिसेप्शन|मैनेजर/i;
const I_RATES = /\b(rate|rates|price|prices|pricing|cost|charges?|tariff|kitna|kitne|kimat|rent|paisa|paise|facilities|amenities|info|information)\b|रेट|कीमत|किराया/i;
const I_BOOK = /\b(book|booking|reserve|reservation|room|rooms|kamra|kamre|chahiye|chahie|vacancy)\b|कमरा|कमरे|बुक|चाहिए/i;
const I_FAQ = /\b(wifi|wi-fi|parking|food|restaurant|breakfast|lunch|dinner|taxi|cab|pool|gym|laundry|location|address|where|near|map|pet|pets|smoking|party|event|tour|spa|bar|alcohol|early|late|couple|unmarried|family|foreigner|gst|invoice|bill)\b/i;

// ----- slots from any message -----
const pd = parseDates(raw, today);
const pr = parseRooms(pd.rest);
const pg = parseGuests(pd.rest);
const bare = /^\s*(\d{1,2})\s*$/.test(raw) ? +raw.trim() : null;
const dateErr = () => {
  if (s.ci && s.ci < iso(today)) return 'past';
  if (s.ci && s.co && s.co <= s.ci) return 'order';
  return null;
};
function applyDates() {
  const d = pd.dates;
  if (d.length >= 2) { s.ci = iso(d[0]); s.co = iso(d[1]); }
  else if (d.length === 1) {
    if (pd.nights) { s.ci = iso(d[0]); s.co = iso(addDays(d[0], pd.nights)); }
    else if (s.ci && !s.co && iso(d[0]) > s.ci) s.co = iso(d[0]);
    else if (s.ci && s.co) { s.ci = iso(d[0]); s.co = null; }
    else { s.ci = iso(d[0]); s.co = null; }
  } else if (pd.nights && s.ci) s.co = iso(addDays(new Date(s.ci + 'T00:00:00Z'), pd.nights));
  s.total = null;
}
function applyRooms() {
  if (pr.any) { s.ac = pr.ac; s.nac = pr.nac; s.pendType = null; s.pendCount = null; s.total = null; return true; }
  if (pr.pendType || pr.pendCount) { s.pendType = pr.pendType || s.pendType || null; s.pendCount = pr.pendCount || s.pendCount || null; }
  if (s.pendType && s.pendCount) { if (s.pendType === 'AC') { s.ac = s.pendCount; s.nac = 0; } else { s.nac = s.pendCount; s.ac = 0; } s.pendType = s.pendCount = null; s.total = null; return true; }
  return false;
}
const hasRooms = () => (s.ac || 0) + (s.nac || 0) > 0;
const nRooms = () => (s.ac || 0) + (s.nac || 0);

// next question / action for the booking flow
function advance(prefix) {
  prefix = prefix || '';
  const e = dateErr();
  if (e === 'past') { s.ci = s.co = null; s.step = 'DATES'; return say(M.pastDate()); }
  if (e === 'order') { s.co = null; s.ci = null; s.step = 'DATES'; return say(M.badOrder()); }
  if (!s.ci) { s.step = 'DATES'; return say(prefix + M.askDates()); }
  if (!s.co) { s.step = 'DATES'; return say(prefix + M.askCheckout(s)); }
  s.nights = nightsOf(s.ci, s.co);
  if (!hasRooms()) {
    s.step = 'ROOMS';
    if (s.pendCount && !s.pendType) return say(prefix + M.askRoomType(s.pendCount));
    if (s.pendType && !s.pendCount) return say(prefix + M.askRoomCount(s.pendType));
    return say(prefix + M.askRooms(s));
  }
  if (!s.total) {          // ask the database for availability + the total price
    s.step = 'CHECK'; save();
    const sql = `SELECT q.*, IF(q.date_check = 'OK' AND q.ac_available >= q.ac_requested AND q.nonac_available >= q.nonac_requested AND q.ac_requested + q.nonac_requested > 0, 'YES', 'NO') AS can_book FROM (SELECT IF(p.ci IS NULL OR p.co IS NULL OR DATEDIFF(p.co, p.ci) < 1 OR p.ci < hb_today_ist(), 'INVALID_DATES', 'OK') AS date_check, DATEDIFF(p.co, p.ci) AS days, p.ac AS ac_requested, hb_free_rooms(p.ci, p.co, 'AC') AS ac_available, p.nac AS nonac_requested, hb_free_rooms(p.ci, p.co, 'NonAC') AS nonac_available, DATEDIFF(p.co, p.ci) * (p.ac * t1.rate_per_night + p.nac * t2.rate_per_night) + ROUND(DATEDIFF(p.co, p.ci) * (p.ac * t1.rate_per_night + p.nac * t2.rate_per_night) * IFNULL((SELECT CAST(cfg_value AS DECIMAL(5,2)) FROM hb_config WHERE cfg_key = 'tax_percent'), 0) / 100, 2) AS total_amount FROM (SELECT STR_TO_DATE('${s.ci}', '%Y-%m-%d') AS ci, STR_TO_DATE('${s.co}', '%Y-%m-%d') AS co, ${+s.ac || 0} AS ac, ${+s.nac || 0} AS nac) p JOIN hb_room_types t1 ON t1.code = 'AC' JOIN hb_room_types t2 ON t2.code = 'NonAC') q`;
    return [{ json: { action: 'sql', kind: 'check', sql, prefix } }];
  }
  if (s.guests && s.guests > c.maxg * nRooms()) s.guests = null;
  if (!s.guests && s.guestsHint) { const g = s.guestsHint; s.guestsHint = null; return takeGuests(g); }
  if (!s.guests) { s.step = 'GUESTS'; return say(prefix + M.askGuests(s)); }
  if (!s.name) { s.step = 'NAME'; return say(prefix + M.askName()); }
  if (!s.idn) { s.step = 'ID'; return say(prefix + (s.idt ? M.askIdNumber(s.idt) : M.askId())); }
  s.step = 'CONFIRM';
  return say(M.summary({ ...s, idMasked: maskId(s.idn) }));
}

const reprompt = () => ({ DATES: s.ci ? M.askCheckout(s) : M.askDates(), ROOMS: M.askRooms(s), CHECK: M.askRooms(s), GUESTS: M.askGuestsOnly(), FEWER: M.fewer(s.guests, nRooms()), NAME: M.askName(), ID: s.idt ? M.askIdNumber(s.idt) : M.askId(), CONFIRM: M.summary({ ...s, idMasked: maskId(s.idn || '') }) })[s.step] || '';
const unclear = () => (raw.includes('?') || raw.split(/\s+/).length >= 4) ? faq(reprompt()) : say(reprompt());
// guests rule: max per room; fewer guests than rooms needs a yes
function takeGuests(g) {
  const r = nRooms();
  if (!g || g < 1) return say(M.askGuestsOnly());
  if (g > c.maxg * r) return say(M.tooMany(g, r));
  s.guests = g;
  if (r > 1 && g <= r) { s.step = 'FEWER'; return say(M.fewer(g, r)); }
  return advance();
}

try {
  // ===== 0. hard resets & greetings =====
  if (RESET.test(n)) { wipe(); fresh(); return say(M.welcome()); }
  const midFlow = !['IDLE'].includes(s.step);
  const anySlot0 = pd.dates.length || pd.nights || pr.any || pr.pendType || pr.pendCount;
  const onlyGreet = GREET.test(n) && n.split(' ').length <= 3 && !anySlot0;
  if (onlyGreet && !midFlow) { fresh(); return say(M.welcome()); }
  if (onlyGreet && midFlow && /^(hi+|hello+|hey+|namaste|नमस्ते|good )/i.test(n)) { fresh(); return say(M.welcome()); }
  if (midFlow && s.step !== 'CANCEL_CONFIRM' && /^(cancel|stop|exit|quit|abort)\b/.test(n) && n.split(' ').length <= 2) { wipe(); fresh(); return out(M.reset()); }

  // ===== 1. confirmations that wait for yes/no =====
  if (s.step === 'CANCEL_CONFIRM') {
    if (yes(raw)) { s.step = 'IDLE'; const code = String(s.cancelCode || '').replace(/[^A-Z0-9]/gi, '').toUpperCase(); save();
      const phone = from;
      return [{ json: { action: 'sql', kind: 'cancel', code, sql: `UPDATE hb_bookings b JOIN hb_guests g ON g.id = b.guest_id SET b.status = 'CANCELLED', b.decided_at = NOW() WHERE b.booking_code = '${code}' AND g.phone = '${phone}' AND b.status IN ('PENDING','CONFIRMED') AND b.created_at > NOW() - INTERVAL 6 HOUR; SELECT ROW_COUNT() AS cancelled_rows;` } }]; }
    if (no(raw)) { fresh(); return say(M.welcome()); }
    fresh();
  }

  if (s.step === 'FEWER') {
    if (yes(raw)) return advance();
    if (no(raw)) { s.ac = 0; s.nac = 0; s.total = null; s.pendType = s.pendCount = null; s.step = 'ROOMS'; return say(M.askRooms(s)); }
    if (pr.any) { applyRooms(); s.step = 'ROOMS'; return advance(); }
    if (bare || pg) return takeGuests(bare || pg);
    return say(M.fewer(s.guests, nRooms()));
  }

  if (['NAME', 'ID', 'CONFIRM'].includes(s.step) && pg && !pr.any && !pd.dates.length && !(s.step === 'NAME' && /^[\p{L} .'-]+$/u.test(raw))) return takeGuests(pg);

  if (s.step === 'CONFIRM') {
    if (yes(raw)) {
      const sql = `CALL hb_create_booking('${from}', '${sqq(s.name)}', '${s.idt}', '${String(s.idn).replace(/[^A-Za-z0-9]/g, '')}', '${s.ci}', '${s.co}', ${+s.ac || 0}, ${+s.nac || 0}, ${+s.guests || 1}, '${L === 'dev' ? 'hindi' : L === 'hin' ? 'hinglish' : 'english'}', 0, @bc, @br); SELECT @bc AS booking_code, @br AS result;`;
      s.step = 'CREATING'; save();
      return [{ json: { action: 'sql', kind: 'create', sql } }];
    }
    if (no(raw)) { wipe(); fresh(); return out(M.reset()); }
    return say(M.summary({ ...s, idMasked: maskId(s.idn) }));
  }
  if (s.step === 'CREATING') {   // a repeated "yes" while the request is being created
    if (yes(raw)) return out(M.dupe());
    s.step = 'CONFIRM';
  }

  // ===== 2. questions that work at any step =====
  if (s.step !== 'ID' && s.step !== 'NAME') {
    if (I_HELP.test(n) && !/\b(book|booking)\b/.test(n)) { return [{ json: { action: 'help', output: M.help(), rec_phone: c.rec, alert: M.helpAlert(from, raw) } }]; }
    if (I_STATUS.test(n)) {
      if (!bookings.length) return say(M.noBooking());
      return say(bookings.slice(0, 3).map(b => M.statusOne({ ...b }, L)).join('\n\n'));
    }
    if (I_CANCEL.test(n) && !(s.step === 'FEWER')) {
      const b = bookings.find(x => x.cancel && ['PENDING', 'CONFIRMED'].includes(x.status));
      if (!b) return say(M.cannotCancel());
      s.step = 'CANCEL_CONFIRM'; s.cancelCode = b.code;
      return say(M.cancelAsk(b));
    }
  }

  if (s.total && s.ci && s.co && !bare && /(how|kese|kaise|kaisa|calculat|breakdown|hisab|hisaab|why|kyu|kyun|explain|samjha|detail)/.test(n) && /(total|amount|price|rate|paise|paisa|rs|bill|cost)/.test(n)) {
    s.nights = nightsOf(s.ci, s.co);
    return say(M.breakdown(s) + '\n\n' + reprompt());
  }

  // ===== 3. menu choices (only on the menu) =====
  if (s.step === 'IDLE' && bare >= 1 && bare <= 5) {
    if (bare === 1) { s.step = 'DATES'; return say(M.askDates()); }
    if (bare === 2) return say(M.rates());
    if (bare === 3) return say(bookings.length ? bookings.slice(0, 3).map(b => M.statusOne({ ...b }, L)).join('\n\n') : M.noBooking());
    if (bare === 4) { const b = bookings.find(x => x.cancel && ['PENDING', 'CONFIRMED'].includes(x.status)); if (!b) return say(M.cannotCancel()); s.step = 'CANCEL_CONFIRM'; s.cancelCode = b.code; return say(M.cancelAsk(b)); }
    return [{ json: { action: 'help', output: M.help(), rec_phone: c.rec, alert: M.helpAlert(from, raw) } }];
  }

  // ===== 4. booking slot-filling =====
  const anySlot = pd.dates.length || pd.nights || pr.any || pr.pendType || pr.pendCount;
  if (s.step === 'IDLE' && I_FAQ.test(n) && !anySlot) return faq('');
  if (s.step === 'IDLE' && I_RATES.test(n) && !pd.dates.length && !pr.any) return say(M.rates());
  const startBooking = s.step === 'IDLE' && (anySlot || (I_BOOK.test(n) && !I_RATES.test(n)));
  if (startBooking) {
    s.step = 'DATES';
    if (pd.dates.length || pd.nights) applyDates();
    const gotRooms = applyRooms();
    if (pg && hasRooms()) s.guestsHint = pg;
    return advance(gotRooms ? ackRooms(L, s) : '');
  }
  if (s.step === 'IDLE' && I_RATES.test(n)) return say(M.rates());
  if (s.step === 'IDLE' && I_FAQ.test(n)) return faq('');

  if (s.step === 'DATES') {
    if (pd.dates.length || pd.nights) { applyDates(); const gr = applyRooms(); return advance(gr ? ackRooms(L, s) : ''); }
    if (I_RATES.test(n)) return say(M.rates() + '\n\n' + M.askDates());
    return unclear();
  }
  if (s.step === 'ROOMS' || s.step === 'CHECK') {
    const dch = pd.dates.length || pd.nights;
    if (dch) applyDates();
    const gr = applyRooms();
    if (!gr && bare && s.pendType) { s.pendCount = bare; applyRooms(); }
    else if (!gr && bare && !s.pendType) { s.pendCount = bare; s.ac = 0; s.nac = 0; s.total = null; }
    if (hasRooms() || s.pendType || s.pendCount || dch) return advance();
    if (I_RATES.test(n)) return say(M.rates() + '\n\n' + M.askRooms(s));
    return unclear();
  }
  if (s.step === 'GUESTS') {
    if (pd.dates.length || pd.nights) { applyDates(); }
    if (pr.any) { applyRooms(); s.step = 'ROOMS'; return advance(); }
    if (!s.total) return advance();
    const g = bare || pg;
    if (g) return takeGuests(g);
    if (I_RATES.test(n)) return say(M.rates() + '\n\n' + M.askGuestsOnly());
    return unclear();
  }
  if (s.step === 'NAME') {
    let nm = raw.replace(/^(my name is|my name|name is|name|i am|i'm|this is|mera naam|mera name|naam|main|मेरा नाम|नाम)\s*(hai|is|:|-)?\s*/i, '').replace(/\s*(hai|है)$/i, '').trim();
    if (/^[\p{L}][\p{L}\p{M} .'-]{1,59}$/u.test(nm) && !/\d/.test(nm) && !yes(nm) && !no(nm)) { s.name = nm.replace(/\s+/g, ' '); return advance(); }
    return (raw.includes('?') || nm.split(' ').length >= 5) ? faq(reprompt()) : say(M.badName());
  }
  if (s.step === 'ID') {
    const t = idTypeOf(raw) || null;
    let num = idNumberOf(raw);
    if (t) s.idt = t;
    if (!num && t && s.idnPending) { num = s.idnPending; }
    if (num && s.idt) {
      const r = idCheck(s.idt, num);
      if (r !== 'OK') { const bad = s.idt; s.idn = null; return say(M.idBad(r)); }
      s.idn = num; return advance();
    }
    if (num && !s.idt) { s.idnPending = num; return say(M.askIdType()); }
    if (s.idt) return unclear();
    return unclear();
  }

  // ===== 5. anything else (FAQ / small talk) -> LLM, then re-ask the pending question =====
  return faq(s.step === 'IDLE' ? '' : reprompt());
} catch (err) {
  return out(M.welcome());
}
