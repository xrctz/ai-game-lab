"""Analyze DeadTakeover game bundle for performance patterns."""
import re
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent.parent / "games" / "zombie" / "assets" / "index-BMuMsKYH.js"
src = BUNDLE.read_text(encoding="utf-8")

print("=== FILE SIZE ===")
print(f"  {BUNDLE.stat().st_size:,} bytes")

print("\n=== EVENT LISTENERS (add/remove balance) ===")
adds = re.findall(r"\.addEventListener\(['\"]([^'\"]+)['\"]", src)
removes = re.findall(r"\.removeEventListener\(['\"]([^'\"]+)['\"]", src)
print(f"  addEventListener calls: {len(adds)}")
print(f"  removeEventListener calls: {len(removes)}")
if adds:
    from collections import Counter
    ac = Counter(adds)
    for ev, cnt in sorted(ac.items(), key=lambda x: -x[1]):
        print(f"    '{ev}': {cnt}")

print("\n=== KEY PERFORMANCE PATTERNS ===")
checks = {
    "requestAnimationFrame": r"requestAnimationFrame",
    "setInterval": r"setInterval",
    "setTimeout": r"setTimeout",
    "clearInterval": r"clearInterval",
    "clearTimeout": r"clearTimeout",
    "Date.now()": r"Date\.now\(\)",
    "performance.now": r"performance\.now",
    "context-lost": r"contextlost|contextrestored|webglcontext",
    "visibilitychange": r"visibilitychange",
    "resize/listener": r"resize",
    "deltaTime": r"deltaTime|delta_time|elapsedTime|getDelta",
    "dispose geometry": r"geometry\.dispose\(|\.dispose\s*\(",
    "JSON.parse": r"JSON\.parse\(",
    "new THREE instances": r"new\s+\w+\(",
    "scene.add": r"scene\.add\(",
    "scene.remove": r"scene\.remove\(",
    "raycaster": r"Raycaster|raycaster|intersectObjects|intersect",
    "particle": r"particle|pEmitter|Particle|particleSystem",
    "collision": r"collision|collider|Collider|overlap|intersects",
    "garbage create": r"new\s+(Array|Object|Map|Set|Float32Array|Uint8Array)\(",
    "for loop": r"for\s*\(",
    "forEach": r"\.forEach",
    "map()": r"\.map\(|\.filter\(|\.reduce\(",
}
for label, pat in checks.items():
    count = len(re.findall(pat, src, re.IGNORECASE))
    if count > 0:
        print(f"  {label}: {count}")

print("\n=== GAME ENTITY TRACKING ===")
entity_checks = {
    "zombie/enemy": r"zombie|enemy|Zombie|Enemy",
    "bullet/projectile": r"bullet|projectile|Bullet|Projectile",
    "spawn": r"[Ss]pawn",
    "wave": r"[Ww]ave",
    "pickup/loot": r"pickup|loot|Loot|drop",
    "player death": r"dead|death|respawn|die\b",
    "health": r"health|Health|HP\b",
    "damage": r"damage|Damage|dmg",
    "ammo/mag": r"ammo|magazine|reload",
    "particle/fx": r"particle|emitter|Particle|vfx",
}
for label, pat in entity_checks.items():
    count = len(re.findall(pat, src, re.IGNORECASE))
    if count > 0:
        print(f"  {label}: {count}")

print("\n=== POOLING / REUSE ===")
pool_checks = {
    "Pool references": r"[Pp]ool",
    "push/pop (pool ops)": r"\.push\(|\.pop\(|\.shift\(|\.unshift\(",
    "Array.from": r"Array\.from",
    "spread operator": r"\.\.\.",
}
for label, pat in pool_checks.items():
    count = len(re.findall(pat, src))
    print(f"  {label}: {count}")

print("\n=== MAP / WAVE SYSTEM ===")
map_checks = {
    "map references": r"[Mm]ap",
    "loadMap": r"loadMap|load_map|loadLevel|load_level",
    "startGame/init": r"startGame|start_game|initGame|init_game|newGame|new_game",
    "restart": r"restart|reset|Restart|Reset",
    "gameOver": r"gameOver|game_over|GameOver",
    "menu references": r"menu|Menu|overlay|pause",
}
for label, pat in map_checks.items():
    count = len(re.findall(pat, src, re.IGNORECASE))
    print(f"  {label}: {count}")