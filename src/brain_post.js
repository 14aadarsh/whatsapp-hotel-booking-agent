// ===== BRAIN POST: turns the database answer into the next guest message =====
const plan = $('Brain').first().json;
const msg = $('Clean Message').first().json;
const ctxRow = (() => { try { return $('Load Context').first().json; } catch (e) { return {}; } })();
const from = String(msg.from).replace(/\D/g, '');
const L = msg.lang || 'eng';
const c = cfgOf(ctxRow), M = mk(L, c);
const sd = $getWorkflowStaticData('global');
sd.flow = sd.flow || {};
let s = sd.flow[from] || { step: 'IDLE' };
const save = () => { s.ts = Date.now(); sd.flow[from] = s; };
const res = $input.all().map(i => i.json).filter(r => r && typeof r === 'object');
const r0 = res.find(r => r.booking_code !== undefined || r.cancelled_rows !== undefined || r.can_book !== undefined || r.date_check !== undefined) || res[0] || {};
const reply = t => [{ json: { output: t } }];

try {
  if (!res.length || r0.error || r0.message && !r0.booking_code && r0.can_book === undefined && r0.cancelled_rows === undefined) return reply(plan.kind === 'create' ? M.dbError() : techErr(L));
  if (plan.kind === 'check') {
    if (r0.date_check !== 'OK') { s.ci = s.co = null; s.step = 'DATES'; save(); return reply(M.badOrder()); }
    if (r0.can_book === 'YES') {
      s.total = Number(r0.total_amount); s.nights = Number(r0.days) || s.nights; s.step = 'GUESTS';
      save(); return reply((plan.prefix || '') + M.askGuests(s));
    }
    s.total = null; s.ac = 0; s.nac = 0; s.step = 'ROOMS'; save();
    return reply(M.notAvail({ ci: s.ci, co: s.co, ac_available: Number(r0.ac_available) || 0, nonac_available: Number(r0.nonac_available) || 0 }));
  }
  if (plan.kind === 'create') {
    const code = String(r0.booking_code || ''), result = String(r0.result || '');
    if (result === 'OK' && code) {
      const out = M.created(code, { rooms: roomsText(s), ci: s.ci, co: s.co, total: s.total });
      delete sd.flow[from];                      // wipe the draft, including the ID number
      return reply(out);
    }
    s.step = 'CONFIRM';
    if (result === 'DUPLICATE_BOOKING') { delete sd.flow[from]; return reply(M.dupe()); }
    if (/^NOT_ENOUGH/.test(result)) { s.total = null; s.ac = 0; s.nac = 0; s.step = 'ROOMS'; save(); return reply(takenMsg(L)); }
    if (/^INVALID_ID|ID_NOT_PROVIDED/.test(result)) { s.idn = null; s.step = 'ID'; save(); return reply(result.startsWith('INVALID_ID_') ? M.idBad(result.replace('INVALID_ID_', '')) : M.askId()); }
    if (result === 'GUESTS_EXCEED_CAPACITY') { s.guests = null; s.step = 'GUESTS'; save(); return reply(M.askGuestsOnly()); }
    if (result === 'INVALID_DATES') { s.ci = s.co = null; s.total = null; s.step = 'DATES'; save(); return reply(M.askDates()); }
    if (result === 'INVALID_NAME') { s.name = null; s.step = 'NAME'; save(); return reply(M.askName()); }
    save(); return reply(M.dbError());
  }
  if (plan.kind === 'cancel') {
    const ok = Number(r0.cancelled_rows) >= 1;
    delete sd.flow[from];
    return reply(ok ? M.cancelled(plan.code) : M.cancelFailed());
  }
  return reply(M.welcome());
} catch (e) { return reply(M.dbError()); }
