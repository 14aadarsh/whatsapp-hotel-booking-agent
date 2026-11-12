const cfgOf = r => ({ hotel: r.hotel_name || 'our hotel', ac: Number(r.ac_rate) || 3000, nac: Number(r.nonac_rate) || 1800, maxg: Number(r.max_guests) || 4, cot: String(r.checkout_time || '11:00'), rec: r.rec_phone || '' });
const sqq = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\r\n]+/g, ' ');
const nightsOf = (ci, co) => Math.round((new Date(co + 'T00:00:00Z') - new Date(ci + 'T00:00:00Z')) / 86400e3);
const maskId = n => 'X'.repeat(Math.max(0, String(n).length - 4)) + String(n).slice(-4);
