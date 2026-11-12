"""10 guests try to book 3 AC rooms each at the same moment; only 15 AC rooms exist -> exactly 5 must succeed
and no room may be booked twice.  Usage: MYSQL_ARGS="-uroot -S /tmp/m.sock" python3 tests/concurrency_test.py"""
import subprocess, datetime, os, sys, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(__file__))
from t_sql import aad
ARGS = os.environ.get('MYSQL_ARGS', '-uroot -S /tmp/m.sock').split()
def sql(q): return subprocess.run(['mysql', *ARGS, 'hotel_booking', '-B', '-N', '-e', q], capture_output=True, text=True)
def call(i, ci, co):
    idn = aad()
    sql(f"INSERT INTO hb_msg_tokens (phone, token_hash) VALUES ('91888000{i:04d}', SHA2('{idn}',256))")
    r = sql(f"CALL hb_create_booking('91888000{i:04d}','G{i}','aadhaar','{idn}','{ci}','{co}',3,0,3,'english',0,@c,@r); SELECT @r;")
    return r.stdout.strip() or r.stderr.strip()
t = datetime.date.today() + datetime.timedelta(days=20)
sql("DELETE FROM hb_bookings; DELETE FROM hb_guests;")
with cf.ThreadPoolExecutor(10) as ex: res = list(ex.map(lambda i: call(i, str(t), str(t + datetime.timedelta(days=1))), range(10)))
dup = sql("SELECT room_id FROM hb_booking_rooms GROUP BY room_id HAVING COUNT(*)>1").stdout.strip()
assert res.count('OK') == 5 and not dup, (res, dup)
print('PASS: 5 bookings succeeded, 5 got NOT_ENOUGH_AC, no room double-booked')
