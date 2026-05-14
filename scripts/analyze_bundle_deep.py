"""Deep analysis v2 — safer pattern extraction from minified bundle."""
import re
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent.parent / "games" / "zombie" / "assets" / "index-BMuMsKYH.js"
src = BUNDLE.read_text(encoding="utf-8")

print("=== EVENT LISTENER BALANCE (Key Apps vs Removes) ===")
r="addEventListener"
add_matches = [m.start() for m in re.finditer(r, src)]
rem_matches = [m.start() for m in re.finditer("removeEventListener", src)]
print(f"  'addEventListener': {len(add_matches)} calls")
print(f"  'removeEventListener': {len(rem_matches)} calls")
print(f"  RATIO: {len(rem_matches)}/{len(add_matches)} = {len(rem_matches)/max(1,len(add_matches)):.2f}")

# Extract actual event types from addEventListener calls
# In minified code it could be "mousemove", "keydown" etc. — look for string literals near addEventListener
# Pattern: .addEventListener("eventname", or .addEventListener('eventname',
add_contexts = []
for m in re.finditer('addEventListener', src):
    pos = m.end()
    chunk = src[pos:pos+50]
    qm = re.search(r'(["\'])([^"\']+)\1', chunk)
    if qm:
        add_contexts.append(qm.group(2))
    else:
        # Might be a variable reference
        add_contexts.append("(var)")

from collections import Counter
ac = Counter(add_contexts)
print("\n  Event types added:")
for ev, cnt in sorted(ac.items(), key=lambda x: -x[1]):
    show = ev.replace('"','').replace("'","")[:40]
    print(f"    {show}: {cnt}")

# Timer analysis
print("\n=== TIMER BALANCE ===")
import re
# Find setTimers that store a reference vs ones that don't
setTO_refs = len(re.findall(r'(?:var|let|const)\s+\w+\s*=\s*setTimeout', src))
setIV_refs = len(re.findall(r'(?:var|let|const)\s+\w+\s*=\s*setInterval', src))
setTO_all = len(re.findall(r'setTimeout\s*\(', src))
setIV_all = len(re.findall(r'setInterval\s*\(', src))
clearTO = len(re.findall(r'clearTimeout\s*\(', src))
clearIV = len(re.findall(r'clearInterval\s*\(', src))

print(f"  setTimeout( calls: {setTO_all}")
print(f"  setInterval( calls: {setIV_all}")
print(f"  Stored setTimeout refs: {setTO_refs}")
print(f"  Stored setInterval refs: {setIV_refs}")
print(f"  clearTimeout( calls: {clearTO}")
print(f"  clearInterval( calls: {clearIV}")

# rAF loop count
print("\n=== RENDER LOOP ===")
raf_count = len(re.findall(r'requestAnimationFrame', src))
caf_count = len(re.findall(r'cancelAnimationFrame', src))
print(f"  requestAnimationFrame: {raf_count}")
print(f"  cancelAnimationFrame: {caf_count}")

# Context loss
print("\n=== WEBGL CONTEXT LOSS ===")
for label, pat in (
    ("contextlost", "contextlost"),
    ("contextrestored", "contextrestored"),
    ("webglcontextlost", "webglcontextlost"),
    ("webglcontextrestored", "webglcontextrestored"),
    ("loseContext", "loseContext"),
    ("restoreContext", "restoreContext"),
):
    cnt = len(re.findall(pat, src, re.I))
    print(f"  '{pat}': {cnt}")

# Scene management
print("\n=== SCENE MANAGEMENT ===")
for label, pat in (
    ("scene.traverse", "scene\\.traverse"),
    ("scene.clear()", "scene\\.clear\\("),
    ("removing children", "removeFromParent|parent\\.remove"),
    ("Object3D.remove", "\\.remove\\("),
):
    cnt = len(re.findall(pat, src, re.I))
    print(f"  {label}: {cnt}")

# Memory patterns
print("\n=== MEMORY PATTERNS ===")
for label, pat in (
    ("texture.dispose", "texture\\.dispose"),
    ("geometry.dispose", "geometry\\.dispose"),
    ("material.dispose", "material\\.dispose"),
    ("renderTarget.dispose", "renderTarget\\.dispose"),
    ("new Float32Array", "new Float32Array"),
    ("new Array", "new Array"),
    ("new BufferGeometry", "new \\w+\\([^)]*\\)\\s*;?\\s*$"),
):
    cnt = len(re.findall(pat, src, re.I))
    print(f"  {label}: {cnt}")

# Collision detail
print("\n=== COLLISION SYSTEM ===")
for label, pat in (
    ("Raycaster", "Raycaster|raycaster"),
    ("intersectObjects", "intersectObjects"),
    ("AABB", "Box3|Sphere|containsPoint|intersectsBox"),
    ("distance calculation", "distanceTo|manhattanDistance"),
    ("collision loop", "collision|Collision"),
):
    cnt = len(re.findall(pat, src, re.I))
    print(f"  {label}: {cnt}")

# Check for per-frame allocations in for loops
print("\n=== PER-FRAME ALLOCATION RISK ===")
per_frame_risks = re.findall(
    r'(new\s+(Vector3|Vector2|Color|Matrix3|Matrix4|Quaternion|Euler|Sphere|Box3|Ray|Plane|Frustum)\s*\()',
    src, re.I
)
print(f"  new Vector3/2/Color/Matrix etc in hot path: {len(per_frame_risks)}")
if len(per_frame_risks) <= 20:
    for m in per_frame_risks[:20]:
        print(f"    {m}")

# Entity counts
print("\n=== ENTITY PATTERNS ===")
for label, pat in (
    ("bullet pool", "bullet.*pool|pool.*bullet"),
    ("particle pool", "particle.*pool|pool.*particle"),
    ("enemy pool", "enemy.*pool|pool.*enemy|zombie.*pool"),
    ("object pool class", "class.*Pool|Pool.*class"),
    ("get from pool", "\\.get\\(|\\.obtain\\(|\\.allocate\\("),
    ("return to pool", "\\.release\\(|\\.free\\(|\\.return\\(|\\.kill\\("),
):
    cnt = len(re.findall(pat, src, re.I))
    print(f"  {label}: {cnt}")

print("\nDone.")