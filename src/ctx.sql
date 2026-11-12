SELECT (SELECT cfg_value FROM hb_config WHERE cfg_key='hotel_name') AS hotel_name,
 (SELECT cfg_value FROM hb_config WHERE cfg_key='checkout_time') AS checkout_time,
 (SELECT cfg_value FROM hb_config WHERE cfg_key='receptionist_phone') AS rec_phone,
 (SELECT rate_per_night FROM hb_room_types WHERE code='AC') AS ac_rate,
 (SELECT rate_per_night FROM hb_room_types WHERE code='NonAC') AS nonac_rate,
 (SELECT MAX(max_guests) FROM hb_room_types) AS max_guests,
 (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', x.booking_id, 'code', x.booking_code, 'status', x.status, 'rooms', x.room_details, 'ci', DATE_FORMAT(x.check_in,'%d %b'), 'co', DATE_FORMAT(x.check_out,'%d %b'), 'total', x.total_amount, 'mins', GREATEST(TIMESTAMPDIFF(MINUTE, NOW(), x.hold_expires_at), 0), 'cancel', IF(x.created_at > NOW() - INTERVAL 6 HOUR AND x.status IN ('PENDING','CONFIRMED'), 1, 0), 'reason', x.reject_reason))
  FROM (SELECT * FROM hb_booking_summary WHERE phone = '{{ String($('Clean Message').first().json.from).replace(/\D/g,'') }}' ORDER BY booking_id DESC LIMIT 3) x) AS bookings_json
