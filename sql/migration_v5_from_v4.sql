-- Hotel WhatsApp Bot v5 : MIGRATION from the v4 single-table database. Safe: old tables are RENAMED, not dropped.
USE hotel_booking;
SET SQL_SAFE_UPDATES = 0;   -- Workbench safe-update mode would block the bulk UPDATE below (session only)
RENAME TABLE hb_bookings TO hb_bookings_legacy_v4, hb_rooms TO hb_rooms_legacy_v4;

-- ===== Tables (normalized, 3NF) =====
CREATE TABLE IF NOT EXISTS hb_config (
  cfg_key   VARCHAR(50) PRIMARY KEY,
  cfg_value VARCHAR(200)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS hb_sessions (            -- 3 h chat window per guest (also keys the LLM memory)
  phone       VARCHAR(20) PRIMARY KEY,
  active      TINYINT NOT NULL DEFAULT 1,
  started_at  DATETIME,
  last_active DATETIME
) ENGINE=InnoDB;

CREATE TABLE hb_room_types (                        -- categories + pricing live here, nowhere else
  id              TINYINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(10)   NOT NULL,           -- 'AC' | 'NonAC'
  name            VARCHAR(50)   NOT NULL,
  rate_per_night  DECIMAL(10,2) NOT NULL,
  max_guests      TINYINT UNSIGNED NOT NULL DEFAULT 4,
  UNIQUE KEY uq_room_type_code (code),
  CONSTRAINT chk_rt_rate CHECK (rate_per_night >= 0)
) ENGINE=InnoDB;

CREATE TABLE hb_rooms (                             -- physical inventory
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_no       VARCHAR(10) NOT NULL,
  room_type_id  TINYINT UNSIGNED NOT NULL,
  active        TINYINT NOT NULL DEFAULT 1,
  UNIQUE KEY uq_room_no (room_no),
  KEY idx_room_type (room_type_id),
  CONSTRAINT fk_rooms_type FOREIGN KEY (room_type_id) REFERENCES hb_room_types(id)
) ENGINE=InnoDB;

CREATE TABLE hb_guests (                            -- CRM: one row per phone number
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  phone            VARCHAR(20)  NOT NULL,
  guest_name       VARCHAR(100) NOT NULL,
  id_proof_type    ENUM('AADHAAR','PASSPORT','DRIVING_LICENSE','VOTER_ID') NULL,
  id_proof_number  VARCHAR(30)  NULL,               -- MASKED, e.g. XXXXXXXX3377 (only last 4 kept)
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_guest_phone (phone)
) ENGINE=InnoDB;

CREATE TABLE hb_bookings (                          -- header: exactly ONE row per booking_code
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_code     VARCHAR(20)  NOT NULL,
  guest_id         INT UNSIGNED NOT NULL,
  check_in         DATE NOT NULL,
  check_out        DATE NOT NULL,
  days             INT GENERATED ALWAYS AS (DATEDIFF(check_out, check_in)) VIRTUAL,
  total_guests     TINYINT UNSIGNED NOT NULL,       -- whole party, stored once
  guest_language   VARCHAR(10) NOT NULL DEFAULT 'english',
  subtotal_amount  DECIMAL(10,2) NOT NULL,
  tax_amount       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount     DECIMAL(10,2) NOT NULL,          -- true invoice grand total
  status           ENUM('PENDING','CONFIRMED','REJECTED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  approval_token   VARCHAR(40)  NOT NULL,
  hold_expires_at  DATETIME     NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at       DATETIME NULL,
  reject_reason    VARCHAR(200) NULL,
  alerted          TINYINT NOT NULL DEFAULT 0,      -- receptionist alert sent
  guest_notified   TINYINT NOT NULL DEFAULT 0,      -- final decision message delivered to guest
  notify_attempts  TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_booking_code (booking_code),
  UNIQUE KEY uq_approval_token (approval_token),
  KEY idx_dates (check_in, check_out),
  KEY idx_status_hold (status, hold_expires_at),
  KEY idx_guest (guest_id),
  CONSTRAINT fk_booking_guest FOREIGN KEY (guest_id) REFERENCES hb_guests(id),
  CONSTRAINT chk_dates CHECK (check_out > check_in),
  CONSTRAINT chk_amounts CHECK (subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount = subtotal_amount + tax_amount)
) ENGINE=InnoDB;

CREATE TABLE hb_booking_rooms (                     -- line items: one row per room in a booking
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id       INT UNSIGNED NOT NULL,
  room_id          INT UNSIGNED NOT NULL,
  guests_assigned  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  rate_per_night   DECIMAL(10,2) NOT NULL,          -- price frozen at booking time
  UNIQUE KEY uq_booking_room (booking_id, room_id),
  KEY idx_room (room_id),
  CONSTRAINT fk_br_booking FOREIGN KEY (booking_id) REFERENCES hb_bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_br_room    FOREIGN KEY (room_id)    REFERENCES hb_rooms(id),
  CONSTRAINT chk_br_guests CHECK (guests_assigned <= 4)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS hb_booking_rooms_released (   -- history: room lines of bookings that were NOT confirmed (expired / rejected / cancelled)
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_id       INT UNSIGNED NOT NULL,
  room_id          INT UNSIGNED NOT NULL,
  guests_assigned  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  rate_per_night   DECIMAL(10,2) NOT NULL,
  released_status  VARCHAR(12) NOT NULL,
  released_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_released_booking (booking_id)
) ENGINE=InnoDB;

CREATE TABLE hb_msg_tokens (                        -- proof that an ID number was typed by the guest in THIS chat (hashes only, auto-deleted after 1 day)
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  phone       VARCHAR(20) NOT NULL,
  token_hash  CHAR(64)    NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tok (phone, token_hash),
  KEY idx_tok_created (created_at)
) ENGINE=InnoDB;

DELIMITER $$
-- ===== Routines =====
DROP FUNCTION IF EXISTS hb_verhoeff_ok$$
CREATE FUNCTION hb_verhoeff_ok(s VARCHAR(20)) RETURNS TINYINT
DETERMINISTIC NO SQL
BEGIN
  -- Verhoeff checksum (the algorithm used by Aadhaar numbers)
  DECLARE d VARCHAR(100) DEFAULT '0123456789123406789523401789563401289567401239567859876043216598710432765982104387659321049876543210';
  DECLARE p VARCHAR(80)  DEFAULT '01234567891576283094580379614289160435279453126870428657390127938064157046913258';
  DECLARE c INT DEFAULT 0;
  DECLARE i INT DEFAULT 0;
  DECLARE n INT DEFAULT CHAR_LENGTH(s);
  DECLARE dig INT;
  WHILE i < n DO
    SET dig = CAST(SUBSTRING(s, n - i, 1) AS UNSIGNED);
    SET c = CAST(SUBSTRING(d, c * 10 + CAST(SUBSTRING(p, MOD(i, 8) * 10 + dig + 1, 1) AS UNSIGNED) + 1, 1) AS UNSIGNED);
    SET i = i + 1;
  END WHILE;
  RETURN IF(c = 0, 1, 0);
END$$

DROP FUNCTION IF EXISTS hb_norm_id_type$$
CREATE FUNCTION hb_norm_id_type(t VARCHAR(40)) RETURNS VARCHAR(20)
DETERMINISTIC NO SQL
BEGIN
  DECLARE x VARCHAR(40) DEFAULT LOWER(REGEXP_REPLACE(IFNULL(t,''), '[^a-zA-Z]', ''));
  IF x LIKE 'aadh%' OR x LIKE 'adh%' OR x LIKE 'uid%' THEN RETURN 'AADHAAR';
  ELSEIF x LIKE 'pass%' THEN RETURN 'PASSPORT';
  ELSEIF x = 'dl' OR x LIKE 'driv%' OR x LIKE 'licen%' THEN RETURN 'DRIVING_LICENSE';
  ELSEIF x LIKE 'voter%' OR x = 'epic' THEN RETURN 'VOTER_ID';
  END IF;
  RETURN NULL;
END$$

DROP FUNCTION IF EXISTS hb_validate_id$$
CREATE FUNCTION hb_validate_id(t VARCHAR(40), num VARCHAR(60)) RETURNS VARCHAR(60)
DETERMINISTIC NO SQL
BEGIN
  DECLARE ty VARCHAR(20) DEFAULT hb_norm_id_type(t);
  DECLARE n  VARCHAR(60) DEFAULT UPPER(REGEXP_REPLACE(IFNULL(num,''), '[ -]', ''));
  IF ty IS NULL THEN RETURN 'UNKNOWN_ID_TYPE'; END IF;
  IF ty = 'AADHAAR' THEN
    IF n NOT REGEXP '^[0-9]{12}$' THEN RETURN 'AADHAAR_MUST_BE_12_DIGITS'; END IF;
    IF n NOT REGEXP '^[2-9]' OR hb_verhoeff_ok(n) = 0 THEN RETURN 'AADHAAR_NUMBER_INVALID'; END IF;
  ELSEIF ty = 'PASSPORT' THEN
    IF n NOT REGEXP '^[A-PR-WY][0-9]{7}$' THEN RETURN 'PASSPORT_FORMAT_INVALID'; END IF;
  ELSEIF ty = 'DRIVING_LICENSE' THEN
    IF n NOT REGEXP '^[A-Z]{2}[0-9]{13}$' THEN RETURN 'DRIVING_LICENSE_FORMAT_INVALID'; END IF;
  ELSEIF ty = 'VOTER_ID' THEN
    IF n NOT REGEXP '^[A-Z]{3}[0-9]{7}$' THEN RETURN 'VOTER_ID_FORMAT_INVALID'; END IF;
  END IF;
  RETURN 'OK';
END$$

DROP FUNCTION IF EXISTS hb_mask_id$$
CREATE FUNCTION hb_mask_id(num VARCHAR(60)) RETURNS VARCHAR(30)
DETERMINISTIC NO SQL
BEGIN
  DECLARE n VARCHAR(60) DEFAULT UPPER(REGEXP_REPLACE(IFNULL(num,''), '[ -]', ''));
  RETURN CONCAT(REPEAT('X', GREATEST(CHAR_LENGTH(n) - 4, 0)), RIGHT(n, 4));
END$$

DROP FUNCTION IF EXISTS hb_today_ist$$
CREATE FUNCTION hb_today_ist() RETURNS DATE
NOT DETERMINISTIC NO SQL
BEGIN
  RETURN DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL '5:30' HOUR_MINUTE));
END$$

DROP FUNCTION IF EXISTS hb_free_rooms$$
CREATE FUNCTION hb_free_rooms(p_ci DATE, p_co DATE, p_type VARCHAR(10)) RETURNS INT
NOT DETERMINISTIC READS SQL DATA
BEGIN
  DECLARE n INT;
  SELECT COUNT(*) INTO n
  FROM hb_rooms r JOIN hb_room_types t ON t.id = r.room_type_id
  WHERE r.active = 1 AND t.code = p_type
    AND NOT EXISTS (
      SELECT 1 FROM hb_booking_rooms br JOIN hb_bookings b ON b.id = br.booking_id
      WHERE br.room_id = r.id
        AND (b.status = 'CONFIRMED' OR (b.status = 'PENDING' AND b.hold_expires_at > NOW()))
        AND b.check_in < p_co AND b.check_out > p_ci);
  RETURN n;
END$$

DROP PROCEDURE IF EXISTS hb_create_booking$$
CREATE PROCEDURE hb_create_booking(
  IN  p_phone VARCHAR(30), IN p_name VARCHAR(100), IN p_id_type VARCHAR(40), IN p_id_number VARCHAR(60),
  IN  p_ci VARCHAR(10), IN p_co VARCHAR(10), IN p_ac INT, IN p_nonac INT, IN p_guests INT,
  IN  p_lang VARCHAR(20), IN p_add_more TINYINT,
  OUT o_code VARCHAR(20), OUT o_result VARCHAR(60))
proc: BEGIN
  DECLARE v_ci DATE; DECLARE v_co DATE; DECLARE v_days INT; DECLARE v_n INT;
  DECLARE v_phone VARCHAR(20); DECLARE v_type VARCHAR(20); DECLARE v_valid VARCHAR(60);
  DECLARE v_ac_rate DECIMAL(10,2); DECLARE v_nac_rate DECIMAL(10,2); DECLARE v_cap INT;
  DECLARE v_tax_pct DECIMAL(5,2); DECLARE v_sub DECIMAL(10,2); DECLARE v_tax DECIMAL(10,2);
  DECLARE v_gid INT UNSIGNED; DECLARE v_bid INT UNSIGNED; DECLARE v_code VARCHAR(20); DECLARE v_tok VARCHAR(40);
  DECLARE v_ac_free INT; DECLARE v_nac_free INT; DECLARE v_locked INT; DECLARE v_ins INT; DECLARE v_lang VARCHAR(10);
  DECLARE v_err TEXT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_err = MESSAGE_TEXT;
    ROLLBACK;
    SET o_code = NULL;
    SET o_result = LEFT(CONCAT('ERROR_DB: ', v_err), 60);
  END;

  SET o_code = NULL;
  SET v_phone = REGEXP_REPLACE(IFNULL(p_phone,''), '[^0-9]', '');
  SET v_ci = STR_TO_DATE(p_ci, '%Y-%m-%d');
  SET v_co = STR_TO_DATE(p_co, '%Y-%m-%d');
  SET p_ac = GREATEST(IFNULL(p_ac,0),0); SET p_nonac = GREATEST(IFNULL(p_nonac,0),0);
  SET v_n = p_ac + p_nonac;
  SET v_lang = IF(LOWER(p_lang) IN ('hindi','hinglish'), LOWER(p_lang), 'english');

  IF v_phone = '' THEN SET o_result = 'INVALID_PHONE'; LEAVE proc; END IF;
  IF v_ci IS NULL OR v_co IS NULL OR v_co <= v_ci OR v_ci < hb_today_ist() THEN SET o_result = 'INVALID_DATES'; LEAVE proc; END IF;
  IF v_n < 1 THEN SET o_result = 'INVALID_ROOMS'; LEAVE proc; END IF;
  IF TRIM(IFNULL(p_name,'')) = '' THEN SET o_result = 'INVALID_NAME'; LEAVE proc; END IF;

  SET v_type = hb_norm_id_type(p_id_type);
  SET v_valid = hb_validate_id(p_id_type, p_id_number);
  IF v_valid <> 'OK' THEN SET o_result = CONCAT('INVALID_ID_', v_valid); LEAVE proc; END IF;
  -- the ID number must really have been typed by this guest in the last 3 hours (stops the LLM re-using / inventing an ID)
  IF NOT EXISTS (SELECT 1 FROM hb_msg_tokens WHERE phone = v_phone AND created_at > NOW() - INTERVAL 3 HOUR
                 AND token_hash = SHA2(UPPER(REGEXP_REPLACE(IFNULL(p_id_number,''), '[ -]', '')), 256)) THEN
    SET o_result = 'ID_NOT_PROVIDED_BY_GUEST'; LEAVE proc;
  END IF;

  SELECT rate_per_night, max_guests INTO v_ac_rate, v_cap FROM hb_room_types WHERE code = 'AC';
  SELECT rate_per_night INTO v_nac_rate FROM hb_room_types WHERE code = 'NonAC';
  SET v_cap = v_n * v_cap;
  IF IFNULL(p_guests,0) < 1 THEN SET o_result = 'INVALID_GUESTS'; LEAVE proc; END IF;
  IF p_guests > v_cap THEN SET o_result = 'GUESTS_EXCEED_CAPACITY'; LEAVE proc; END IF;

  SET v_days = DATEDIFF(v_co, v_ci);
  SET v_sub = v_days * (p_ac * v_ac_rate + p_nonac * v_nac_rate);
  SELECT CAST(cfg_value AS DECIMAL(5,2)) INTO v_tax_pct FROM hb_config WHERE cfg_key = 'tax_percent';
  SET v_tax = ROUND(v_sub * IFNULL(v_tax_pct,0) / 100, 2);

  SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;   -- every statement sees the latest committed data
  START TRANSACTION;

  -- 1) serialize competing requests: lock the candidate room rows (always in PK order, so no deadlocks)
  SELECT COUNT(*) INTO v_locked FROM hb_rooms r JOIN hb_room_types t ON t.id = r.room_type_id
   WHERE r.active = 1 AND ((t.code = 'AC' AND p_ac > 0) OR (t.code = 'NonAC' AND p_nonac > 0)) FOR UPDATE;

  -- 2) duplicate request guard (same guest, same dates, still alive, last 6 h)
  IF IFNULL(p_add_more,0) = 0 AND EXISTS (
       SELECT 1 FROM hb_bookings b JOIN hb_guests g ON g.id = b.guest_id
       WHERE g.phone = v_phone AND b.check_in = v_ci AND b.check_out = v_co
         AND (b.status = 'CONFIRMED' OR (b.status = 'PENDING' AND b.hold_expires_at > NOW()))
         AND b.created_at > NOW() - INTERVAL 6 HOUR) THEN
    ROLLBACK; SET o_result = 'DUPLICATE_BOOKING'; LEAVE proc;
  END IF;

  -- 3) availability, evaluated AFTER the lock was taken
  SET v_ac_free  = hb_free_rooms(v_ci, v_co, 'AC');
  SET v_nac_free = hb_free_rooms(v_ci, v_co, 'NonAC');
  IF v_ac_free < p_ac AND v_nac_free < p_nonac THEN ROLLBACK; SET o_result = 'NOT_ENOUGH_ROOMS'; LEAVE proc; END IF;
  IF v_ac_free  < p_ac    THEN ROLLBACK; SET o_result = 'NOT_ENOUGH_AC';    LEAVE proc; END IF;
  IF v_nac_free < p_nonac THEN ROLLBACK; SET o_result = 'NOT_ENOUGH_NONAC'; LEAVE proc; END IF;

  -- 4) guest profile (one row per phone, id proof stored masked)
  INSERT INTO hb_guests (phone, guest_name, id_proof_type, id_proof_number)
  VALUES (v_phone, LEFT(TRIM(p_name),100), v_type, hb_mask_id(p_id_number))
  ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), guest_name = VALUES(guest_name),
                          id_proof_type = VALUES(id_proof_type), id_proof_number = VALUES(id_proof_number);
  SET v_gid = LAST_INSERT_ID();

  -- 5) header
  SET v_code = CONCAT('HB', UPPER(HEX(RANDOM_BYTES(3))));
  WHILE EXISTS (SELECT 1 FROM hb_bookings WHERE booking_code = v_code) DO
    SET v_code = CONCAT('HB', UPPER(HEX(RANDOM_BYTES(3))));
  END WHILE;
  SET v_tok = LOWER(HEX(RANDOM_BYTES(20)));
  INSERT INTO hb_bookings (booking_code, guest_id, check_in, check_out, total_guests, guest_language,
                           subtotal_amount, tax_amount, total_amount, status, approval_token, hold_expires_at)
  VALUES (v_code, v_gid, v_ci, v_co, p_guests, v_lang, v_sub, v_tax, v_sub + v_tax, 'PENDING', v_tok,
          DATE_ADD(NOW(), INTERVAL 30 MINUTE));
  SET v_bid = LAST_INSERT_ID();

  -- 6) room lines (lowest free room numbers first)
  INSERT INTO hb_booking_rooms (booking_id, room_id, guests_assigned, rate_per_night)
  SELECT v_bid, x.id, 0, x.rate FROM (
    SELECT r.id, t.code, t.rate_per_night AS rate,
           ROW_NUMBER() OVER (PARTITION BY t.code ORDER BY r.room_no) AS rn
    FROM hb_rooms r JOIN hb_room_types t ON t.id = r.room_type_id
    WHERE r.active = 1
      AND NOT EXISTS (
        SELECT 1 FROM hb_booking_rooms br JOIN hb_bookings b ON b.id = br.booking_id
        WHERE br.room_id = r.id
          AND (b.status = 'CONFIRMED' OR (b.status = 'PENDING' AND b.hold_expires_at > NOW()))
          AND b.check_in < v_co AND b.check_out > v_ci)
  ) x WHERE (x.code = 'AC' AND x.rn <= p_ac) OR (x.code = 'NonAC' AND x.rn <= p_nonac);
  SET v_ins = ROW_COUNT();
  IF v_ins <> v_n THEN ROLLBACK; SET o_result = 'NOT_ENOUGH_ROOMS'; LEAVE proc; END IF;

  -- 7) spread the party over the rooms: SUM(guests_assigned) = total_guests, never multiplied
  UPDATE hb_booking_rooms br
  JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn FROM hb_booking_rooms WHERE booking_id = v_bid) q ON q.id = br.id
  SET br.guests_assigned = FLOOR(p_guests / v_n) + IF(q.rn <= MOD(p_guests, v_n), 1, 0);

  COMMIT;
  SET o_code = v_code;
  SET o_result = 'OK';
END$$
DELIMITER ;

-- ===== Reporting / workflow view: one row per booking, rooms rolled up =====
CREATE OR REPLACE VIEW hb_booking_summary AS
SELECT
  b.id AS booking_id, b.booking_code, b.status AS raw_status,
  CASE WHEN b.status = 'PENDING' AND b.hold_expires_at <= NOW() THEN 'EXPIRED' ELSE b.status END AS status,
  g.id AS guest_id, g.phone, g.guest_name, g.id_proof_type, g.id_proof_number,
  b.guest_language, b.check_in, b.check_out, b.days, b.total_guests,
  b.subtotal_amount, b.tax_amount, b.total_amount,
  b.approval_token, b.hold_expires_at, b.created_at, b.decided_at, b.reject_reason,
  b.alerted, b.guest_notified, b.notify_attempts,
  x.rooms_count, x.room_details, x.guests_in_rooms
FROM hb_bookings b
JOIN hb_guests g ON g.id = b.guest_id
JOIN (
  SELECT booking_id, SUM(cnt) AS rooms_count, SUM(gs) AS guests_in_rooms,
         GROUP_CONCAT(CONCAT(code, ' x ', cnt, ' (Room', IF(cnt > 1, 's ', ' '), nos, ')') ORDER BY code SEPARATOR ', ') AS room_details
  FROM (
    SELECT br.booking_id, t.code, COUNT(*) AS cnt, SUM(br.guests_assigned) AS gs,
           GROUP_CONCAT(r.room_no ORDER BY r.room_no SEPARATOR ', ') AS nos
    FROM (SELECT booking_id, room_id, guests_assigned FROM hb_booking_rooms
          UNION ALL
          SELECT booking_id, room_id, guests_assigned FROM hb_booking_rooms_released) br
    JOIN hb_rooms r ON r.id = br.room_id
    JOIN hb_room_types t ON t.id = r.room_type_id
    GROUP BY br.booking_id, t.code
  ) per_type
  GROUP BY booking_id
) x ON x.booking_id = b.id;

-- ===== Human-readable line items (room number + type resolved through the foreign keys) =====
CREATE OR REPLACE VIEW hb_booking_rooms_view AS
SELECT b.booking_code, g.guest_name, g.phone, r.room_no, t.code AS room_type,
       br.guests_assigned, br.rate_per_night, b.check_in, b.check_out, b.days,
       br.rate_per_night * b.days AS room_total, b.status
FROM hb_booking_rooms br
JOIN hb_bookings b   ON b.id = br.booking_id
JOIN hb_guests g     ON g.id = b.guest_id
JOIN hb_rooms r      ON r.id = br.room_id
JOIN hb_room_types t ON t.id = r.room_type_id;

-- ===== Rooms that are really taken right now: CONFIRMED bookings + PENDING bookings whose 30-min hold is still alive =====
CREATE OR REPLACE VIEW hb_room_occupancy AS
SELECT r.room_no, t.code AS room_type, b.booking_code, g.guest_name, b.check_in, b.check_out,
       CASE WHEN b.status = 'CONFIRMED' THEN 'CONFIRMED' ELSE 'HELD (waiting approval)' END AS state
FROM hb_booking_rooms br
JOIN hb_bookings b   ON b.id = br.booking_id
JOIN hb_guests g     ON g.id = b.guest_id
JOIN hb_rooms r      ON r.id = br.room_id
JOIN hb_room_types t ON t.id = r.room_type_id
WHERE b.status = 'CONFIRMED' OR (b.status = 'PENDING' AND b.hold_expires_at > NOW());

-- ===== Move data from the old single-table layout =====
-- 1) room types: take the rates from hb_config (ac_rate / nonac_rate) if they exist
INSERT INTO hb_room_types (code, name, rate_per_night, max_guests) VALUES
 ('AC','AC Room',      IFNULL((SELECT CAST(cfg_value AS DECIMAL(10,2)) FROM hb_config WHERE cfg_key='ac_rate'),3000),4),
 ('NonAC','Non-AC Room',IFNULL((SELECT CAST(cfg_value AS DECIMAL(10,2)) FROM hb_config WHERE cfg_key='nonac_rate'),1800),4);

-- 2) rooms (keep the same room numbers)
INSERT INTO hb_rooms (room_no, room_type_id, active)
SELECT o.room_no, t.id, o.active FROM hb_rooms_legacy_v4 o JOIN hb_room_types t ON t.code = o.room_type;

-- 3) guests: one per phone, latest name/ID wins; ID type guessed from old text, number masked
INSERT INTO hb_guests (phone, guest_name, id_proof_type, id_proof_number)
SELECT l.phone, l.guest_name,
  hb_norm_id_type(IF(l.id_proof REGEXP '[A-Za-z]', REGEXP_REPLACE(l.id_proof,'[^A-Za-z]',''),
                     IF(REGEXP_REPLACE(l.id_proof,'[^0-9]','') REGEXP '^[0-9]{12}$','aadhaar',''))),
  IF(REGEXP_REPLACE(l.id_proof,'[^0-9A-Za-z]','') = '' OR REGEXP_REPLACE(l.id_proof,'[^0-9]','') = '', NULL,
     hb_mask_id(IF(l.id_proof REGEXP '[0-9]{4}', REGEXP_REPLACE(l.id_proof,'^[A-Za-z]{3,} +',''), l.id_proof)))
FROM hb_bookings_legacy_v4 l
JOIN (SELECT phone, MAX(id) AS mid FROM hb_bookings_legacy_v4 GROUP BY phone) m ON m.mid = l.id;

-- 4) headers: collapse the old per-room rows into ONE row per booking_code
INSERT INTO hb_bookings (booking_code, guest_id, check_in, check_out, total_guests, guest_language,
  subtotal_amount, tax_amount, total_amount, status, approval_token, hold_expires_at,
  created_at, decided_at, reject_reason, alerted, guest_notified, notify_attempts)
SELECT l.booking_code, g.id, MIN(l.check_in),
  IF(MAX(l.check_out) > MIN(l.check_in), MAX(l.check_out), DATE_ADD(MIN(l.check_in), INTERVAL 1 DAY)),
  LEAST(GREATEST(MAX(l.guests),1),255), IFNULL(MAX(l.guest_language),'english'),
  SUM(l.total_amount), 0, SUM(l.total_amount),
  CASE WHEN SUM(l.status='PENDING')>0 THEN 'PENDING' WHEN SUM(l.status='CONFIRMED')>0 THEN 'CONFIRMED'
       WHEN SUM(l.status='REJECTED')>0 THEN 'REJECTED' WHEN SUM(l.status='EXPIRED')>0 THEN 'EXPIRED' ELSE 'CANCELLED' END,
  IFNULL(MAX(l.approval_token), LOWER(HEX(RANDOM_BYTES(20)))), IFNULL(MAX(l.hold_expires_at), NOW()),
  MIN(l.created_at), MAX(l.decided_at), MAX(l.reject_reason), MAX(l.alerted), 1, 0
FROM hb_bookings_legacy_v4 l JOIN hb_guests g ON g.phone = l.phone
GROUP BY l.booking_code, g.id;

-- 5) room lines (rate = old per-room total / days)
INSERT IGNORE INTO hb_booking_rooms (booking_id, room_id, guests_assigned, rate_per_night)
SELECT b.id, r.id, 0, ROUND(l.total_amount / GREATEST(DATEDIFF(l.check_out, l.check_in),1), 2)
FROM hb_bookings_legacy_v4 l JOIN hb_bookings b ON b.booking_code = l.booking_code
JOIN hb_rooms r ON r.room_no = l.room_no;

-- 6) spread guests over the rooms of each booking (sum = total_guests)
UPDATE hb_booking_rooms br
JOIN (SELECT br2.id, br2.booking_id, ROW_NUMBER() OVER (PARTITION BY br2.booking_id ORDER BY br2.id) AS rn,
             COUNT(*) OVER (PARTITION BY br2.booking_id) AS n FROM hb_booking_rooms br2) q ON q.id = br.id
JOIN hb_bookings b ON b.id = br.booking_id
SET br.guests_assigned = LEAST(4, FLOOR(b.total_guests / q.n) + IF(q.rn <= MOD(b.total_guests, q.n), 1, 0))
WHERE br.id > 0;   -- keeps MySQL Workbench 'safe update mode' happy

-- ===== One-time cleanup: move room lines of non-live bookings out of hb_booking_rooms =====
SET SQL_SAFE_UPDATES = 0;
INSERT INTO hb_booking_rooms_released (booking_id, room_id, guests_assigned, rate_per_night, released_status)
SELECT br.booking_id, br.room_id, br.guests_assigned, br.rate_per_night, b.status
FROM hb_booking_rooms br JOIN hb_bookings b ON b.id = br.booking_id
WHERE b.status IN ('EXPIRED','REJECTED','CANCELLED')
   OR (b.status = 'PENDING' AND b.hold_expires_at <= NOW());
DELETE br FROM hb_booking_rooms br JOIN hb_bookings b ON b.id = br.booking_id
WHERE br.id > 0 AND (b.status IN ('EXPIRED','REJECTED','CANCELLED') OR (b.status = 'PENDING' AND b.hold_expires_at <= NOW()));
-- bookings whose hold lapsed are now marked EXPIRED too (their lines are already archived above)
UPDATE hb_bookings SET status = 'EXPIRED', decided_at = IFNULL(decided_at, NOW())
WHERE id > 0 AND status = 'PENDING' AND hold_expires_at <= NOW();
SET SQL_SAFE_UPDATES = 1;

INSERT IGNORE INTO hb_config (cfg_key, cfg_value) VALUES
 ('hotel_name','Hotel Demo'),('checkout_time','11:00'),('tax_percent','0'),
 ('receptionist_phone','91XXXXXXXXXX'),('public_url','https://YOUR-NGROK-URL.ngrok-free.app');

SET SQL_SAFE_UPDATES = 1;
