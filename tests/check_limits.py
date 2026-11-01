"""Exercise the actual Redis Lua scripts locally. Requires fakeredis[lua].

Run with: python tests/check_limits.py
No network, credentials, or live Redis database are used.
"""

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import re

import fakeredis

source = (Path(__file__).parents[1] / "src/lib/order-protection.ts").read_text()
traffic_script = re.search(r"export const TRAFFIC_SCRIPT = `(.*?)`;", source, re.S)[1]
reserve_script = re.search(r"export const RESERVE_SCRIPT = `(.*?)`;", source, re.S)[1]


def database():
    return fakeredis.FakeRedis(decode_responses=True)


def reserve(db, digest, request_id="request-id"):
    return db.eval(
        reserve_script, 4, f"order:{digest}", "hour", "day", "spacing", digest, request_id
    )


# Rolling per-IP quota, including expiration of old attempts.
db = database()
for number in range(5):
    assert db.eval(traffic_script, 1, "ip", str(number)) == 1
assert db.eval(traffic_script, 1, "ip", "overflow") == 0
assert 0 < db.ttl("ip") <= 60
now = db.time()[0] * 1000
for member in db.zrange("ip", 0, -1):
    db.zadd("ip", {member: now - 61000})
assert db.eval(traffic_script, 1, "ip", "after-window") == 1
assert db.zcard("ip") == 1

# Only one concurrent reservation can own a dispatch; duplicates spend no quota.
db = database()
with ThreadPoolExecutor(max_workers=20) as pool:
    results = list(pool.map(lambda _: reserve(db, "same"), range(50)))
assert results.count("new") == 1
assert results.count("pending:request-id") == 49
assert db.zcard("day") == 1
assert 0 < db.ttl("order:same") <= 86400
assert reserve(db, "another") == "busy"
db.set("order:same", "sent:request-id", ex=86400)
assert reserve(db, "same", "fresh-client-id") == "sent:request-id"
assert db.zcard("day") == 1

# Hourly and daily caps are independent and do not allow boundary bursts.
db = database()
for number in range(50):
    db.delete("spacing")
    if number in (20, 40):
        assert reserve(db, f"blocked-{number}") == "limited"
        now = db.time()[0] * 1000
        for member in db.zrange("hour", 0, -1):
            db.zadd("hour", {member: now - 3601000})
    assert reserve(db, str(number)) == "new"
db.delete("spacing")
assert db.zcard("day") == 50
assert reserve(db, "over-daily-cap") == "limited"
assert db.get("order:over-daily-cap") is None
now = db.time()[0] * 1000
for key, age in [("hour", 3601000), ("day", 86401000)]:
    for member in db.zrange(key, 0, -1):
        db.zadd(key, {member: now - age})
assert reserve(db, "next-day") == "new"
assert db.zcard("day") == 1
print("Redis Lua checks passed: IP window, concurrent reservations, deduplication, spacing, hourly/daily caps, window expiry.")
