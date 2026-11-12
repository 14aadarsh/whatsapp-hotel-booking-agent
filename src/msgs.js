// ===== guest-facing texts (English / Hinglish / Hindi) =====
const mk = (L, c) => {
  const T = (e, h, d) => ({ eng: e, hin: h, dev: d })[L] || e;
  const P = n => inr(n);
  return {
    welcome: () => T(
`Welcome to ${c.hotel}! 🏨
How can I help you today?

1️⃣ Book a room
2️⃣ Room rates & info
3️⃣ My booking status
4️⃣ Cancel a booking
5️⃣ Talk to the receptionist

Reply with a number, or just type your question.`,
`${c.hotel} mein aapka swagat hai! 🏨
Main aapki kya madad kar sakta hu?

1️⃣ Room book karna
2️⃣ Room rates aur info
3️⃣ Meri booking ka status
4️⃣ Booking cancel karna
5️⃣ Receptionist se baat

Ek number bhejiye ya seedha apna sawal likhiye.`,
`${c.hotel} में आपका स्वागत है! 🏨
मैं आपकी क्या मदद कर सकता हूँ?

1️⃣ कमरा बुक करना
2️⃣ कमरों के रेट और जानकारी
3️⃣ मेरी बुकिंग का स्टेटस
4️⃣ बुकिंग कैंसिल करना
5️⃣ रिसेप्शनिस्ट से बात

कोई नंबर भेजिए या सीधे अपना सवाल लिखिए।`),
    rates: () => T(
`Our rooms 🏨
• AC room: ${P(c.ac)} per night
• Non-AC room: ${P(c.nac)} per night
• Up to ${c.maxg} guests per room
• Check-out time: ${c.cot}
• Payment at the hotel (no advance needed)
• Free cancellation within 6 hours of booking

To book, type "book" or send 1.`,
`Hamare rooms 🏨
• AC room: ${P(c.ac)} per night
• Non-AC room: ${P(c.nac)} per night
• Ek room mein ${c.maxg} guests tak
• Check-out time: ${c.cot}
• Payment hotel par (advance nahi chahiye)
• Booking ke 6 ghante ke andar cancel kar sakte hain

Book karne ke liye "book" likhiye ya 1 bhejiye.`,
`हमारे कमरे 🏨
• AC कमरा: ${P(c.ac)} प्रति रात
• Non-AC कमरा: ${P(c.nac)} प्रति रात
• एक कमरे में ${c.maxg} मेहमान तक
• चेक-आउट समय: ${c.cot}
• भुगतान होटल में (एडवांस नहीं)
• बुकिंग के 6 घंटे के अंदर कैंसिल कर सकते हैं

बुक करने के लिए "book" लिखिए या 1 भेजिए।`),
    askDates: () => T(
`Sure! Please tell me your check-in and check-out dates.
Example: 12 Nov to 14 Nov
(Check-out time is ${c.cot}.)`,
`Zaroor! Apni check-in aur check-out dates bataiye.
Example: 12 Nov se 14 Nov
(Check-out time ${c.cot} hai.)`,
`ज़रूर! कृपया चेक-इन और चेक-आउट की तारीख बताइए।
उदाहरण: 12 Nov से 14 Nov
(चेक-आउट समय ${c.cot} है।)`),
    askCheckout: s => T(`Check-in noted: ${dshow(s.ci)}. What is your check-out date?`, `Check-in ${dshow(s.ci)} note kar liya. Check-out date kya hai?`, `चेक-इन ${dshow(s.ci)} नोट कर लिया। चेक-आउट की तारीख क्या है?`),
    badOrder: () => T(`Check-out must be after check-in. Please send both dates again (example: 12 Nov to 14 Nov).`, `Check-out date check-in ke baad honi chahiye. Dono dates dobara bhejiye (example: 12 Nov se 14 Nov).`, `चेक-आउट की तारीख चेक-इन के बाद होनी चाहिए। कृपया दोनों तारीखें फिर से भेजिए।`),
    pastDate: () => T(`That date has already passed. Please send future dates (example: 12 Nov to 14 Nov).`, `Ye date nikal chuki hai. Aane wali dates bhejiye (example: 12 Nov se 14 Nov).`, `यह तारीख निकल चुकी है। कृपया आने वाली तारीखें भेजिए।`),
    askRooms: s => T(
`${dshow(s.ci)} to ${dshow(s.co)} (${s.nights} night${s.nights > 1 ? 's' : ''}). How many rooms do you need?
AC ${P(c.ac)} / Non-AC ${P(c.nac)} per night, max ${c.maxg} guests per room.
Example: 2 AC and 1 Non-AC`,
`${dshow(s.ci)} se ${dshow(s.co)} (${s.nights} raat). Kitne rooms chahiye?
AC ${P(c.ac)} / Non-AC ${P(c.nac)} per night, ek room mein max ${c.maxg} guests.
Example: 2 AC aur 1 Non-AC`,
`${dshow(s.ci)} से ${dshow(s.co)} (${s.nights} रात)। कितने कमरे चाहिए?
AC ${P(c.ac)} / Non-AC ${P(c.nac)} प्रति रात, एक कमरे में अधिकतम ${c.maxg} मेहमान।
उदाहरण: 2 AC और 1 Non-AC`),
    askRoomType: n => T(`${n} room(s). Do you want AC or Non-AC?`, `${n} room. AC chahiye ya Non-AC?`, `${n} रूम। AC चाहिए या Non-AC?`),
    askRoomCount: ty => T(`How many ${ty === 'AC' ? 'AC' : 'Non-AC'} rooms do you need?`, `Kitne ${ty === 'AC' ? 'AC' : 'Non-AC'} rooms chahiye?`, `कितने ${ty === 'AC' ? 'AC' : 'Non-AC'} कमरे चाहिए?`),
    notAvail: q => T(
`Sorry, we do not have that many rooms free for ${dshow(q.ci)} to ${dshow(q.co)}.
Available: ${q.ac_available} AC and ${q.nonac_available} Non-AC.
Please tell me the rooms you would like instead, or send new dates.`,
`Sorry, ${dshow(q.ci)} se ${dshow(q.co)} ke liye itne rooms free nahi hain.
Available: ${q.ac_available} AC aur ${q.nonac_available} Non-AC.
Aap kitne rooms lena chahenge wo bataiye, ya nayi dates bhejiye.`,
`क्षमा करें, ${dshow(q.ci)} से ${dshow(q.co)} के लिए इतने कमरे खाली नहीं हैं।
उपलब्ध: ${q.ac_available} AC और ${q.nonac_available} Non-AC।
कृपया बताइए कितने कमरे लेंगे, या नई तारीखें भेजिए।`),
    askGuests: s => T(
`Good news, rooms are available! 🎉
${s.ac ? s.ac + ' AC' : ''}${s.ac && s.nac ? ' + ' : ''}${s.nac ? s.nac + ' Non-AC' : ''} for ${s.nights} night(s): total ${P(s.total)}.
How many guests in total? (max ${c.maxg} per room)`,
`Good news, rooms available hain! 🎉
${s.ac ? s.ac + ' AC' : ''}${s.ac && s.nac ? ' + ' : ''}${s.nac ? s.nac + ' Non-AC' : ''}, ${s.nights} raat ka total ${P(s.total)}.
Total kitne guests honge? (ek room mein max ${c.maxg})`,
`खुशखबरी, कमरे उपलब्ध हैं! 🎉
${s.ac ? s.ac + ' AC' : ''}${s.ac && s.nac ? ' + ' : ''}${s.nac ? s.nac + ' Non-AC' : ''}, ${s.nights} रात का कुल ${P(s.total)}।
कुल कितने मेहमान होंगे? (एक कमरे में अधिकतम ${c.maxg})`),
    askGuestsOnly: () => T(`How many guests in total? (max ${c.maxg} per room)`, `Total kitne guests honge? (ek room mein max ${c.maxg})`, `कुल कितने मेहमान होंगे? (एक कमरे में अधिकतम ${c.maxg})`),
    tooMany: (g, r) => T(`${g} guests do not fit in ${r} room(s): maximum ${c.maxg} per room (${c.maxg * r} in total). Please send fewer guests, or tell me how many rooms you want (example: 3 AC).`, `${g} guests ${r} room(s) mein nahi aa sakte: ek room mein max ${c.maxg} (kul ${c.maxg * r}). Kam guests batayiye, ya kitne rooms chahiye wo likhiye (example: 3 AC).`, `${g} मेहमान ${r} कमरे में नहीं आ सकते: एक कमरे में अधिकतम ${c.maxg} (कुल ${c.maxg * r})। कम मेहमान बताइए, या कितने कमरे चाहिए लिखिए।`),
    fewer: (g, r) => { const sg = Math.max(1, Math.ceil(g / 2)); return T(
`You asked for ${r} rooms for ${g} guest${g > 1 ? 's' : ''}. Usually at least 2 guests share a room, so ${sg} room${sg > 1 ? 's' : ''} should be enough and will cost less.
Reply YES to keep ${r} rooms, NO to choose the rooms again (example: ${sg} AC), or send a new number of guests.`,
`Aapne ${r} rooms maange hain aur guests ${g} hain. Aam taur par ek room mein kam se kam 2 log rehte hain, isliye ${sg} room kaafi honge aur sasta padega.
${r} rooms hi rakhne hain to YES likhiye, rooms dobara chunne ke liye NO (example: ${sg} AC), ya guests ki nayi sankhya bhejiye.`,
`आपने ${r} कमरे माँगे हैं और मेहमान ${g} हैं। आमतौर पर एक कमरे में कम से कम 2 लोग रहते हैं, इसलिए ${sg} कमरे काफ़ी होंगे और सस्ता पड़ेगा।
${r} कमरे ही रखने हैं तो YES लिखिए, कमरे दोबारा चुनने के लिए NO (उदाहरण: ${sg} AC), या मेहमानों की नई संख्या भेजिए।`); },
    askName: () => T(`May I have the guest's full name?`, `Guest ka poora naam bataiye.`, `कृपया मेहमान का पूरा नाम बताइए।`),
    badName: () => T(`Please send the name using letters only (example: Rahul Sharma).`, `Naam sirf letters mein bhejiye (example: Rahul Sharma).`, `कृपया नाम सिर्फ अक्षरों में भेजिए (उदाहरण: राहुल शर्मा)।`),
    askId: () => T(`Which photo ID will you show at check-in, and its number?
(Aadhaar / Passport / Driving Licence / Voter ID)
Example: Aadhaar 1234 5678 9012`, `Check-in par kaun sa photo ID dikhayenge, aur uska number kya hai?
(Aadhaar / Passport / Driving Licence / Voter ID)
Example: Aadhaar 1234 5678 9012`, `चेक-इन पर कौन सा फोटो ID दिखाएंगे, और उसका नंबर क्या है?
(Aadhaar / Passport / Driving Licence / Voter ID)
उदाहरण: Aadhaar 1234 5678 9012`),
    askIdNumber: ty => T(`Please send your ${ID_TYPES[ty]} number.`, `Apna ${ID_TYPES[ty]} number bhejiye.`, `कृपया अपना ${ID_TYPES[ty]} नंबर भेजिए।`),
    askIdType: () => T(`Which ID is this number from? (Aadhaar / Passport / Driving Licence / Voter ID)`, `Ye number kaun se ID ka hai? (Aadhaar / Passport / Driving Licence / Voter ID)`, `यह नंबर किस ID का है? (Aadhaar / Passport / Driving Licence / Voter ID)`),
    idBad: code => {
      const why = {
        AADHAAR_MUST_BE_12_DIGITS: T('An Aadhaar number has exactly 12 digits.', 'Aadhaar number mein pure 12 digits hote hain.', 'आधार नंबर में ठीक 12 अंक होते हैं।'),
        AADHAAR_NUMBER_INVALID: T('This Aadhaar number does not look valid. Please check it.', 'Ye Aadhaar number sahi nahi lag raha. Dobara check kijiye.', 'यह आधार नंबर सही नहीं लग रहा। कृपया दोबारा जाँचिए।'),
        PASSPORT_FORMAT_INVALID: T('A passport number is 1 letter + 7 digits (example: K1234567).', 'Passport number 1 letter + 7 digits hota hai (example: K1234567).', 'पासपोर्ट नंबर 1 अक्षर + 7 अंक का होता है (उदाहरण: K1234567)।'),
        DRIVING_LICENSE_FORMAT_INVALID: T('A driving licence number looks like DL1420110012345.', 'Driving licence number aisa hota hai: DL1420110012345.', 'ड्राइविंग लाइसेंस नंबर ऐसा होता है: DL1420110012345।'),
        VOTER_ID_FORMAT_INVALID: T('A Voter ID looks like ABC1234567 (3 letters + 7 digits).', 'Voter ID aisa hota hai: ABC1234567 (3 letters + 7 digits).', 'वोटर ID ऐसा होता है: ABC1234567 (3 अक्षर + 7 अंक)।')
      }[code] || T('This ID number is not valid.', 'Ye ID number sahi nahi hai.', 'यह ID नंबर सही नहीं है।');
      return why + '\n' + T('Please send the ID type and number again.', 'Please ID type aur number dobara bhejiye.', 'कृपया ID का प्रकार और नंबर फिर से भेजिए।');
    },
    summary: s => T(
`Please check your booking:
👤 ${s.name}
🛏️ ${s.ac ? s.ac + ' AC' : ''}${s.ac && s.nac ? ' + ' : ''}${s.nac ? s.nac + ' Non-AC' : ''}
📅 ${dshow(s.ci)} to ${dshow(s.co)} (${s.nights} night${s.nights > 1 ? 's' : ''})
👥 ${s.guests} guest${s.guests > 1 ? 's' : ''}
🪪 ${ID_TYPES[s.idt]} ${s.idMasked}
💰 Total: ${P(s.total)} (pay at hotel)

Reply YES to send the booking request, or NO to start again.`,
`Apni booking check kijiye:
👤 ${s.name}
🛏️ ${s.ac ? s.ac + ' AC' : ''}${s.ac && s.nac ? ' + ' : ''}${s.nac ? s.nac + ' Non-AC' : ''}
📅 ${dshow(s.ci)} se ${dshow(s.co)} (${s.nights} raat)
👥 ${s.guests} guests
🪪 ${ID_TYPES[s.idt]} ${s.idMasked}
💰 Total: ${P(s.total)} (payment hotel par)

Booking request bhejne ke liye YES likhiye, dobara shuru karne ke liye NO.`,
`कृपया अपनी बुकिंग जाँचिए:
👤 ${s.name}
🛏️ ${s.ac ? s.ac + ' AC' : ''}${s.ac && s.nac ? ' + ' : ''}${s.nac ? s.nac + ' Non-AC' : ''}
📅 ${dshow(s.ci)} से ${dshow(s.co)} (${s.nights} रात)
👥 ${s.guests} मेहमान
🪪 ${ID_TYPES[s.idt]} ${s.idMasked}
💰 कुल: ${P(s.total)} (भुगतान होटल में)

बुकिंग रिक्वेस्ट भेजने के लिए YES लिखिए, दोबारा शुरू करने के लिए NO।`),
    created: (code, s) => T(
`Your booking request ${code} is received, but it is NOT confirmed yet. ⏳
${s.rooms}, ${dshow(s.ci)} to ${dshow(s.co)}, total ${P(s.total)}, pay at hotel.
The receptionist will approve it within 30 minutes and I will message you here. Cancellation is possible within 6 hours.`,
`Aapki booking request ${code} mil gayi hai, par abhi confirm NAHI hui hai. ⏳
${s.rooms}, ${dshow(s.ci)} se ${dshow(s.co)}, total ${P(s.total)}, payment hotel par.
Receptionist 30 minute ke andar approve karenge aur main yahin aapko message karunga. 6 ghante ke andar cancel kar sakte hain.`,
`आपकी बुकिंग रिक्वेस्ट ${code} मिल गई है, पर अभी कन्फर्म नहीं हुई है। ⏳
${s.rooms}, ${dshow(s.ci)} से ${dshow(s.co)}, कुल ${P(s.total)}, भुगतान होटल में।
रिसेप्शनिस्ट 30 मिनट में अप्रूव करेंगे और मैं यहीं आपको मैसेज करूँगा। 6 घंटे के अंदर कैंसिल कर सकते हैं।`),
    breakdown: s => {
      const n = s.nights, L1 = [];
      if (s.ac) L1.push(`AC: ${s.ac} x ${P(c.ac)} x ${n} ${T('night', 'raat', 'रात')} = ${P(s.ac * c.ac * n)}`);
      if (s.nac) L1.push(`Non-AC: ${s.nac} x ${P(c.nac)} x ${n} ${T('night', 'raat', 'रात')} = ${P(s.nac * c.nac * n)}`);
      return T('How the total is calculated:', 'Total aise bana hai:', 'कुल राशि ऐसे बनी है:') + '\n' + L1.join('\n') + '\n' + T('Total', 'Total', 'कुल') + ': ' + P(s.total) + '\n\n' + T('Rate x rooms x nights, no extra charges.', 'Rate x rooms x raat, koi extra charge nahi.', 'रेट x कमरे x रात, कोई अतिरिक्त शुल्क नहीं।');
    },
    reset: () => T(`No problem, I have cleared this booking. Type "menu" to start again.`, `Theek hai, ye booking maine hata di. Dobara shuru karne ke liye "menu" likhiye.`, `ठीक है, मैंने यह बुकिंग हटा दी। फिर शुरू करने के लिए "menu" लिखिए।`),
    dupe: () => T(`You already have a request for these dates. Send 3 to see its status.`, `In dates ke liye aapki request pehle se hai. Status ke liye 3 bhejiye.`, `इन तारीखों के लिए आपकी रिक्वेस्ट पहले से है। स्टेटस के लिए 3 भेजिए।`),
    dbError: () => T(`Sorry, something went wrong on our side. Please reply YES to try again.`, `Sorry, hamari taraf se kuch gadbad ho gayi. Dobara try karne ke liye YES likhiye.`, `क्षमा करें, हमारी तरफ से कुछ गड़बड़ हो गई। फिर कोशिश के लिए YES लिखिए।`),
    noBooking: () => T(`I could not find a booking for your number. Type 1 to make one.`, `Aapke number par koi booking nahi mili. Booking ke liye 1 bhejiye.`, `आपके नंबर पर कोई बुकिंग नहीं मिली। बुकिंग के लिए 1 भेजिए।`),
    statusOne: b => {
      const base = `${b.code}: ${b.rooms}, ${b.ci} to ${b.co}, ${P(b.total)}`;
      const m = {
        PENDING: T(`⏳ ${base}\nNOT confirmed yet. Waiting for receptionist approval (about ${b.mins} min left). I will message you as soon as it is decided.`, `⏳ ${base}\nAbhi confirm NAHI hui. Receptionist ke approval ka wait hai (lagbhag ${b.mins} minute bache). Decision hote hi main message karunga.`, `⏳ ${base}\nअभी कन्फर्म नहीं हुई। रिसेप्शनिस्ट के अप्रूवल का इंतज़ार है (लगभग ${b.mins} मिनट बचे)। फैसला होते ही मैं मैसेज करूँगा।`),
        CONFIRMED: T(`✅ ${base}\nCONFIRMED. Please carry your original photo ID.`, `✅ ${base}\nCONFIRMED hai. Original photo ID saath laayein.`, `✅ ${base}\nकन्फर्म है। कृपया ओरिजिनल फोटो ID साथ लाएं।`),
        REJECTED: T(`❌ ${base}\nNot approved.${b.reason ? ' Reason: ' + b.reason + '.' : ''} Send 1 to try other dates or rooms.`, `❌ ${base}\nApprove nahi hui.${b.reason ? ' Reason: ' + b.reason + '.' : ''} Dusri dates ya rooms ke liye 1 bhejiye.`, `❌ ${base}\nअप्रूव नहीं हुई।${b.reason ? ' कारण: ' + b.reason + '।' : ''} दूसरी तारीख या कमरे के लिए 1 भेजिए।`),
        EXPIRED: T(`⌛ ${base}\nNOT confirmed: it was not approved in time and the rooms were released. Send 1 to request again.`, `⌛ ${base}\nConfirm NAHI hui: time par approve nahi hui aur rooms release ho gaye. Dobara request ke liye 1 bhejiye.`, `⌛ ${base}\nकन्फर्म नहीं हुई: समय पर अप्रूव नहीं हुई और कमरे छोड़ दिए गए। फिर रिक्वेस्ट के लिए 1 भेजिए।`),
        CANCELLED: T(`🚫 ${base}\nCancelled.`, `🚫 ${base}\nCancel ho chuki hai.`, `🚫 ${base}\nरद्द हो चुकी है।`)
      };
      return m[b.status] || base;
    },
    cancelAsk: b => T(`Do you want to cancel booking ${b.code} (${b.rooms}, ${b.ci} to ${b.co})? Reply YES or NO.`, `Kya aap booking ${b.code} (${b.rooms}, ${b.ci} se ${b.co}) cancel karna chahte hain? YES ya NO likhiye.`, `क्या आप बुकिंग ${b.code} (${b.rooms}, ${b.ci} से ${b.co}) कैंसिल करना चाहते हैं? YES या NO लिखिए।`),
    cannotCancel: () => T(`I could not find a booking that can be cancelled. Cancellation is possible only within 6 hours of booking. Send 5 to talk to the receptionist.`, `Cancel ho sake aisi booking nahi mili. Cancel sirf booking ke 6 ghante ke andar ho sakti hai. Receptionist se baat ke liye 5 bhejiye.`, `कैंसिल हो सके ऐसी बुकिंग नहीं मिली। कैंसिल केवल बुकिंग के 6 घंटे के अंदर हो सकता है। रिसेप्शनिस्ट से बात के लिए 5 भेजिए।`),
    cancelled: code => T(`Booking ${code} has been cancelled. ✅`, `Booking ${code} cancel ho gayi hai. ✅`, `बुकिंग ${code} कैंसिल हो गई है। ✅`),
    cancelFailed: () => T(`I could not cancel it (it may already be cancelled or too old). Send 5 to talk to the receptionist.`, `Cancel nahi ho payi (shayad pehle hi cancel hai ya bahut purani hai). Receptionist se baat ke liye 5 bhejiye.`, `कैंसिल नहीं हो पाई (शायद पहले ही कैंसिल है या बहुत पुरानी है)। रिसेप्शनिस्ट से बात के लिए 5 भेजिए।`),
    help: () => T(`I have informed the receptionist. They will contact you as soon as possible. 🙏`, `Maine receptionist ko bata diya hai. Wo jaldi aapse sampark karenge. 🙏`, `मैंने रिसेप्शनिस्ट को बता दिया है। वे जल्द ही आपसे संपर्क करेंगे। 🙏`),
    helpAlert: (phone, txt) => `🙋 Guest needs help\n+${phone}\nMessage: "${String(txt).slice(0, 300)}"\nPlease contact the guest.`
  };
};
const ackRooms = (L, s) => {
  const r = (s.ac ? s.ac + ' AC' : '') + (s.ac && s.nac ? ' + ' : '') + (s.nac ? s.nac + ' Non-AC' : '');
  return ({ eng: `Noted: ${r} room(s). `, hin: `Note kar liya: ${r} room. `, dev: `नोट कर लिया: ${r} कमरे। ` })[L] || '';
};
const takenMsg = L => ({ eng: 'Sorry, those rooms were just taken by someone else. Please send your room requirement again or try other dates.', hin: 'Sorry, ye rooms abhi kisi aur ne le liye. Apni room requirement dobara bhejiye ya dusri dates try kijiye.', dev: 'क्षमा करें, वे कमरे अभी किसी और ने ले लिए। कृपया अपनी ज़रूरत फिर से भेजिए या दूसरी तारीखें चुनिए।' })[L] || '';
const roomsText = s => (s.ac ? s.ac + ' AC' : '') + (s.ac && s.nac ? ' + ' : '') + (s.nac ? s.nac + ' Non-AC' : '');

const techErr = L => ({ eng: 'Sorry, we had a small technical problem. Please send your last message again.', hin: 'Sorry, thodi technical problem aa gayi. Apna last message dobara bhejiye.', dev: 'क्षमा करें, थोड़ी तकनीकी समस्या आ गई। कृपया अपना पिछला संदेश फिर से भेजिए।' })[L] || '';
