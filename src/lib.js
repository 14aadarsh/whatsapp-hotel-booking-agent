// ===== shared helpers (pasted into both Code nodes by the builder) =====
const todayIST = () => { const d = new Date(Date.now() + 5.5 * 3600e3); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };
const iso = d => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400e3);
const MONTHS = { jan:0, january:0, feb:1, february:1, mar:2, march:2, apr:3, april:3, may:4, jun:5, june:5, jul:6, july:6, aug:7, august:7, sep:8, sept:8, september:8, oct:9, october:9, nov:10, november:10, dec:11, december:11 };
const NUMW = { ek:1, one:1, do:2, two:2, teen:3, three:3, char:4, chaar:4, four:4, paanch:5, panch:5, five:5, chhe:6, six:6, saat:7, seven:7, aath:8, eight:8, nau:9, nine:9, das:10, ten:10 };
const mkDate = (dd, mm, yy, today) => {
  let y = yy ? (yy < 100 ? 2000 + yy : yy) : today.getUTCFullYear();
  let d = new Date(Date.UTC(y, mm, dd));
  if (d.getUTCMonth() !== mm || d.getUTCDate() !== dd) return null;      // 31 Feb etc.
  if (!yy && d < today) d = new Date(Date.UTC(y + 1, mm, dd));
  return d;
};
// returns { dates: [Date...], nights: n|null, rest: text without the matched date parts }
const deva = s => String(s).toLowerCase()
  .replace(/नॉन[\s-]*एसी|नान[\s-]*एसी/g, ' non ac ').replace(/एसी/g, ' ac ')
  .replace(/कमरों|कमरे|कमरा/g, ' rooms ').replace(/रातों|रातें|रात/g, ' nights ').replace(/दिन/g, ' days ')
  .replace(/परसों/g, ' parso ').replace(/कल/g, ' kal ').replace(/आज/g, ' aaj ')
  .replace(/मेहमान|लोग|व्यक्ति|सदस्य/g, ' guests ')
  .replace(/एक/g, ' 1 ').replace(/दो/g, ' 2 ').replace(/तीन/g, ' 3 ').replace(/चार/g, ' 4 ').replace(/पाँच|पांच/g, ' 5 ').replace(/छह|छः/g, ' 6 ').replace(/सात/g, ' 7 ').replace(/आठ/g, ' 8 ').replace(/नौ/g, ' 9 ').replace(/दस/g, ' 10 ')
  .replace(/जनवरी/g, ' jan ').replace(/फरवरी/g, ' feb ').replace(/मार्च/g, ' mar ').replace(/अप्रैल/g, ' apr ').replace(/मई/g, ' may ').replace(/जून/g, ' jun ').replace(/जुलाई/g, ' jul ').replace(/अगस्त/g, ' aug ').replace(/सितंबर|सितम्बर/g, ' sep ').replace(/अक्टूबर|अक्तूबर/g, ' oct ').replace(/नवंबर|नवम्बर/g, ' nov ').replace(/दिसंबर|दिसम्बर/g, ' dec ')
  .replace(/से/g, ' se ').replace(/तक/g, ' tak ');
function parseDates(raw, today) {
  let t = ' ' + deva(raw) + ' ';
  const found = [];     // {pos, date}
  const take = (re, fn) => { t = t.replace(re, (...a) => { const pos = a[a.length - 2]; const r = fn(...a); if (r) { found.push({ pos, date: r }); return ' '.repeat(a[0].length); } return a[0]; }); };
  take(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (m, y, mo, d) => mkDate(+d, +mo - 1, +y, today));
  // "12 se 15 nov", "12 to 15 nov", "12-15 nov"
  t = t.replace(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:to|se|-|till|tak|until|–)\s*(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\b(?:,?\s*(\d{4}))?/g, (m, d1, d2, mon, y, pos) => {
    const mm = MONTHS[mon]; if (mm === undefined) return m;
    const a = mkDate(+d1, mm, y ? +y : 0, today), b = mkDate(+d2, mm, y ? +y : 0, today); if (!a || !b) return m;
    found.push({ pos, date: a }); found.push({ pos: pos + 1, date: b }); return ' '.repeat(m.length);
  });
  take(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?([a-z]{3,9})\b(?:,?\s*(\d{4}))?/g, (m, d, mon, y) => MONTHS[mon] === undefined ? null : mkDate(+d, MONTHS[mon], y ? +y : 0, today));
  take(/\b([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s*(\d{4}))?/g, (m, mon, d, y) => MONTHS[mon] === undefined ? null : mkDate(+d, MONTHS[mon], y ? +y : 0, today));
  take(/\b(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\b/g, (m, d, mo, y) => (+mo >= 1 && +mo <= 12) ? mkDate(+d, +mo - 1, y ? +y : 0, today) : null);
  take(/\bday after tomorrow\b|\bparso\b|\bparsu\b/g, () => addDays(today, 2));
  take(/\btomorrow\b|\btmrw\b|\btomorow\b|\bkal\b/g, () => addDays(today, 1));
  take(/\btoday\b|\baaj\b|\bab\b(?=\s*(se|ko))/g, () => today);
  found.sort((a, b) => a.pos - b.pos);
  let nights = null;
  const nm = t.match(/(\d+|ek|do|teen|char|one|two|three|four|five)\s*(?:night|nights|raat|raaton|din|days?)\b/);
  if (nm) { nights = NUMW[nm[1]] || +nm[1]; t = t.replace(nm[0], ' '.repeat(nm[0].length)); }
  return { dates: found.map(f => f.date), nights, rest: t };
}
function parseRooms(rest) {
  let t = ' ' + rest.toLowerCase().replace(/non[\s\-_.]*a\.?\s*\/?\s*c\b\.?/g, ' NONAC ').replace(/\ba\s*\/\s*c\b|\bac\b/g, ' AC ').replace(/\bnon\s*ac\b/g, ' NONAC ') + ' ';
  const num = s => NUMW[s] || +s;
  let ac = 0, nac = 0, any = false, pendType = null, pendCount = null;
  const NUM = '(\\d{1,2}|ek|one|do|two|teen|three|char|chaar|four|paanch|five|six|seven|eight|nine|ten)';
  let m;
  const re1 = new RegExp(NUM + '\\s*(?:x|\\*)?\\s*(?:rooms?\\s*)?(NONAC|AC)\\b', 'g');
  while ((m = re1.exec(t))) { any = true; if (m[2] === 'AC') ac += num(m[1]); else nac += num(m[1]); }
  t = t.replace(re1, ' ');
  const re2 = new RegExp('(NONAC|AC)\\s*(?:rooms?|kamre|kamra)?\\s*[:x*\\-]?\\s*' + NUM + '\\b(?!\\s*(?:guests?|people|persons?|members?|log|pax|jane))', 'g');
  while ((m = re2.exec(t))) { any = true; if (m[1] === 'AC') ac += num(m[2]); else nac += num(m[2]); }
  t = t.replace(re2, ' ');
  if (!any) {
    const hasAC = /\bAC\b/.test(t), hasN = /\bNONAC\b/.test(t);
    const cnt = t.match(new RegExp(NUM + '\\s*(?:rooms?|kamre|kamra|kamron)\\b'));
    if (cnt) pendCount = num(cnt[1]);
    if (hasAC && !hasN) pendType = 'AC'; else if (hasN && !hasAC) pendType = 'NONAC';
    if (pendType && pendCount) { if (pendType === 'AC') ac = pendCount; else nac = pendCount; any = true; pendType = null; pendCount = null; }
  }
  return { ac, nac, any, pendType, pendCount };
}
function parseGuests(rest) {
  const t = ' ' + rest.toLowerCase() + ' ';
  const NUM = '(\\d{1,2}|ek|one|do|two|teen|three|char|chaar|four|paanch|five|six|seven|eight|nine|ten)';
  let m = t.match(new RegExp(NUM + '\\s*(?:guests?|people|persons?|members?|pax|log|logon|jane|aadmi|adults?|bande|vyakti|bachhe|kids?|children)\\b'));
  if (m) return NUMW[m[1]] || +m[1];
  m = t.match(new RegExp('\\b(?:for|total|guests?|members?)\\s*[:\\-]?\\s*' + NUM + '\\b'));
  if (m) return NUMW[m[1]] || +m[1];
  return null;
}
// ----- ID validation (same rules as the database; the database re-checks) -----
const VD = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const VP = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
const verhoeff = s => { let c = 0; const a = s.split('').reverse(); for (let i = 0; i < a.length; i++) c = VD[c][VP[i % 8][+a[i]]]; return c === 0; };
const ID_TYPES = { AADHAAR: 'Aadhaar', PASSPORT: 'Passport', DRIVING_LICENSE: 'Driving Licence', VOTER_ID: 'Voter ID' };
function idTypeOf(t) {
  if (/आधार/.test(t)) return 'AADHAAR'; if (/पासपोर्ट/.test(t)) return 'PASSPORT'; if (/लाइसेंस|लाइसेन्स/.test(t)) return 'DRIVING_LICENSE'; if (/वोटर/.test(t)) return 'VOTER_ID';
  t = t.toLowerCase().replace(/[^a-z ]/g, ' ');
  if (/\b(aadh?a+r|adhar|adhaar|uid)\b/.test(t)) return 'AADHAAR';
  if (/\bpass\s*port\b|\bpassport\b/.test(t)) return 'PASSPORT';
  if (/\bdriving\b|\blicen[cs]e\b|\bdl\b/.test(t)) return 'DRIVING_LICENSE';
  if (/\bvoter\b|\bepic\b/.test(t)) return 'VOTER_ID';
  return null;
}
function idCheck(type, num) {
  const n = String(num || '').toUpperCase().replace(/[ -]/g, '');
  if (type === 'AADHAAR') { if (!/^[0-9]{12}$/.test(n)) return 'AADHAAR_MUST_BE_12_DIGITS'; if (!/^[2-9]/.test(n) || !verhoeff(n)) return 'AADHAAR_NUMBER_INVALID'; }
  else if (type === 'PASSPORT') { if (!/^[A-PR-WY][0-9]{7}$/.test(n)) return 'PASSPORT_FORMAT_INVALID'; }
  else if (type === 'DRIVING_LICENSE') { if (!/^[A-Z]{2}[0-9]{13}$/.test(n)) return 'DRIVING_LICENSE_FORMAT_INVALID'; }
  else if (type === 'VOTER_ID') { if (!/^[A-Z]{3}[0-9]{7}$/.test(n)) return 'VOTER_ID_FORMAT_INVALID'; }
  else return 'UNKNOWN_ID_TYPE';
  return 'OK';
}
function idNumberOf(t) {
  const m = t.match(/\b\d[\d\s-]{9,15}\d\b/);            // 12 digits, maybe spaced or hyphenated
  if (m && m[0].replace(/\D/g, '').length === 12) return m[0].replace(/\D/g, '');
  const w = t.toUpperCase().split(/\s+/).map(x => x.replace(/[^A-Z0-9]/g, '')).filter(x => x.length >= 6 && x.length <= 16 && /\d/.test(x));
  return w.length ? w[0] : null;
}
const yes = t => /^(y|yes|yeah|yep|yup|yea|ya|ok|okay|okk|k|haan|han|ha|haa|ji|hanji|sure|confirm|confirmed|correct|sahi|theek hai|thik hai|theek|thik|kar do|karo|krdo|done|book kar do|book|हाँ|हां|जी|ठीक है|सही)(?=$|[\s,.!?])/i.test(t.trim());
const no = t => /^(n|no|nope|nahi|nahin|nhi|na|cancel|stop|mat|wrong|galat|नहीं|नही|ना)(?=$|[\s,.!?])/i.test(t.trim());
const inr = n => 'Rs ' + Number(n || 0).toLocaleString('en-IN');
const dshow = s => { const d = new Date(s + 'T00:00:00Z'); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
