#!/usr/bin/env python3
"""
Procedural asset generator for the AI Game Lab Pokemon 3D edition.

Runs inside Blender (headless) and writes GLB models to
`games/pokemon/3D/assets/models/`. Each asset is built from simple, stylized
low-poly primitives with flat PBR colors so it matches the game's look and
loads fast on the web.

The in-game loader (`3D/js/world3d.js`) auto-normalizes every model: it strips
studio junk, re-scales to a per-model target height, and sits the soles on
y=0. So absolute size here does not matter — only proportions and keeping each
model centered on X/Y with its base at Z=0 (Blender is Z-up; the glTF exporter
converts to Y-up).

Usage:
    blender --background --python scripts/blender/gen_pokemon_assets.py -- [names...]
    RENDER=1 blender --background --python scripts/blender/gen_pokemon_assets.py -- tree

With no names it builds every asset. RENDER=1 also writes preview PNGs to
`scripts/blender/previews/`.
"""

import bpy
import bmesh
import math
import os
import sys

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(THIS_DIR, "..", ".."))
OUT_DIR = os.path.join(REPO_ROOT, "games", "pokemon", "3D", "assets", "models")
PREVIEW_DIR = os.path.join(THIS_DIR, "previews")
os.makedirs(OUT_DIR, exist_ok=True)

RENDER = os.environ.get("RENDER", "0") == "1"

# ---------------------------------------------------------------------------
# Color helpers (convert sRGB hex -> linear so the in-game color matches)
# ---------------------------------------------------------------------------

def _srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _hex_lin(h):
    r = ((h >> 16) & 255) / 255.0
    g = ((h >> 8) & 255) / 255.0
    b = (h & 255) / 255.0
    return (_srgb_to_linear(r), _srgb_to_linear(g), _srgb_to_linear(b))


def mat(name, hexcol, rough=0.85, metal=0.0, emit=None, emit_str=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    r, g, b = _hex_lin(hexcol)
    bsdf.inputs["Base Color"].default_value = (r, g, b, alpha)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit is not None:
        er, eg, eb = _hex_lin(emit)
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (er, eg, eb, 1.0)
        elif "Emission" in bsdf.inputs:
            bsdf.inputs["Emission"].default_value = (er, eg, eb, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emit_str
    if alpha < 1.0:
        m.blend_method = "BLEND"
    return m


# ---------------------------------------------------------------------------
# Scene / primitive helpers
# ---------------------------------------------------------------------------

def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for b in list(block):
            block.remove(b)


def _finish(name, m, smooth=False):
    o = bpy.context.active_object
    o.name = name
    o.data.name = name
    o.data.materials.clear()
    if m:
        o.data.materials.append(m)
    if smooth:
        bpy.ops.object.shade_smooth()
    return o


def box(name, w, d, h, loc=(0, 0, 0), rot=(0, 0, 0), m=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = _finish(name, m)
    o.scale = (w, d, h)
    return o


def cyl(name, r, h, loc=(0, 0, 0), rot=(0, 0, 0), verts=20, m=None, smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=loc, rotation=rot)
    return _finish(name, m, smooth)


def cone(name, r1, r2, h, loc=(0, 0, 0), rot=(0, 0, 0), verts=20, m=None, smooth=True):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=h, vertices=verts, location=loc, rotation=rot)
    return _finish(name, m, smooth)


def ico(name, r, subdiv=2, loc=(0, 0, 0), rot=(0, 0, 0), m=None, smooth=True):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, subdivisions=subdiv, location=loc, rotation=rot)
    return _finish(name, m, smooth)


def sphere(name, r, loc=(0, 0, 0), segs=20, rings=12, m=None, smooth=True):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=segs, ring_count=rings, location=loc)
    return _finish(name, m, smooth)


def torus(name, major, minor, loc=(0, 0, 0), rot=(0, 0, 0), m=None, smooth=True):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc, rotation=rot,
                                     major_segments=24, minor_segments=10)
    return _finish(name, m, smooth)


# ---------------------------------------------------------------------------
# Shared sub-parts
# ---------------------------------------------------------------------------

SKIN = 0xf1c9a5


def _eyes(cz, face=1.0, r=0.032, sep=0.09, depth=0.2):
    eye = mat("m_eye", 0x1a1a1f, rough=0.4)
    sphere("eye_l", r, loc=(-sep, face * depth, cz), m=eye)
    sphere("eye_r", r, loc=(sep, face * depth, cz), m=eye)


def _cap(top_z, crown_hex, brim_hex=None):
    crown = mat("m_cap", crown_hex, rough=0.7)
    c = ico("cap_crown", 0.26, subdiv=2, loc=(0, 0, top_z), m=crown)
    c.scale = (1.0, 1.0, 0.62)
    brim_m = mat("m_cap_brim", brim_hex if brim_hex is not None else crown_hex, rough=0.7)
    b = cyl("cap_brim", 0.24, 0.05, loc=(0, 0.2, top_z - 0.04), verts=20, m=brim_m)
    b.scale = (1.0, 1.15, 1.0)


def humanoid(shirt, pants, hair=None, hair_style="short", cap=None, cap_brim=None,
             apron=None, coat=None, cross=False, dress=False, skin=SKIN, shoe=0x38343a):
    """Stylized chibi trainer/NPC. Base at z=0, ~1.75 tall, faces +Y."""
    m_shirt = mat("m_shirt", shirt, rough=0.8)
    m_pants = mat("m_pants", pants, rough=0.85)
    m_skin = mat("m_skin", skin, rough=0.7)
    m_shoe = mat("m_shoe", shoe, rough=0.6)

    # Shoes
    box("shoe_l", 0.15, 0.26, 0.09, loc=(-0.12, 0.03, 0.045), m=m_shoe)
    box("shoe_r", 0.15, 0.26, 0.09, loc=(0.12, 0.03, 0.045), m=m_shoe)

    if dress or coat:
        low_hex = coat if coat else shirt
        m_low = mat("m_low", low_hex, rough=0.82)
        cone("lower", 0.36, 0.16, 0.62, loc=(0, 0, 0.42), verts=22, m=m_low)
    else:
        cyl("leg_l", 0.095, 0.52, loc=(-0.12, 0, 0.33), m=m_pants)
        cyl("leg_r", 0.095, 0.52, loc=(0.12, 0, 0.33), m=m_pants)

    # Torso
    torso_hex = coat if coat else shirt
    m_torso = mat("m_torso", torso_hex, rough=0.8)
    tor = cone("torso", 0.25, 0.2, 0.5, loc=(0, 0, 0.82), verts=22, m=m_torso)
    tor.scale = (1.0, 0.72, 1.0)

    # Apron / lab-coat front panel
    if apron is not None:
        m_ap = mat("m_apron", apron, rough=0.85)
        box("apron", 0.3, 0.03, 0.42, loc=(0, 0.17, 0.72), m=m_ap)

    # Arms
    ca = cyl("arm_l", 0.058, 0.44, loc=(-0.29, 0, 0.78), rot=(0, 0, 0.16), m=m_torso)
    cb = cyl("arm_r", 0.058, 0.44, loc=(0.29, 0, 0.78), rot=(0, 0, -0.16), m=m_torso)
    sphere("hand_l", 0.06, loc=(-0.33, 0, 0.57), m=m_skin)
    sphere("hand_r", 0.06, loc=(0.33, 0, 0.57), m=m_skin)

    # Neck + head
    cyl("neck", 0.07, 0.08, loc=(0, 0, 1.12), m=m_skin)
    head = sphere("head", 0.24, loc=(0, 0, 1.32), m=m_skin)
    head.scale = (1.0, 0.96, 1.06)
    _eyes(1.34)
    # Smile-ish nose dot
    sphere("nose", 0.02, loc=(0, 0.235, 1.29), m=mat("m_nose", 0xd9a07a, rough=0.6))

    # Hair
    if hair is not None:
        m_hair = mat("m_hair", hair, rough=0.75)
        if hair_style == "buns":
            h = ico("hair", 0.25, subdiv=2, loc=(0, -0.02, 1.42), m=m_hair)
            h.scale = (1.05, 1.0, 0.7)
            sphere("bun_l", 0.12, loc=(-0.22, -0.05, 1.5), m=m_hair)
            sphere("bun_r", 0.12, loc=(0.22, -0.05, 1.5), m=m_hair)
        else:
            h = ico("hair", 0.255, subdiv=2, loc=(0, -0.03, 1.4), m=m_hair)
            h.scale = (1.05, 1.05, 0.72)

    # Cap
    if cap is not None:
        _cap(1.47, cap, cap_brim)
        if cross:
            m_cross = mat("m_cross", 0xd62828, rough=0.6)
            box("cross_v", 0.05, 0.02, 0.14, loc=(0, 0.24, 1.5), m=m_cross)
            box("cross_h", 0.14, 0.02, 0.05, loc=(0, 0.24, 1.5), m=m_cross)


# ---------------------------------------------------------------------------
# Environment props
# ---------------------------------------------------------------------------

def build_tree():
    trunk = cone("trunk", 0.2, 0.13, 1.0, loc=(0, 0, 0.5), verts=10, m=mat("m_bark", 0x6b452a, rough=0.9))
    # small root flare
    cone("root", 0.3, 0.18, 0.16, loc=(0, 0, 0.08), verts=10, m=mat("m_bark2", 0x5c3a22, rough=0.9))
    greens = [0x2f7d34, 0x3c9142, 0x276b2c]
    blobs = [(0.72, 0, 0, 1.45, 0), (0.55, -0.32, 0.1, 1.75, 1), (0.55, 0.34, -0.05, 1.7, 2),
             (0.5, 0.05, 0.32, 1.9, 1), (0.46, 0.02, -0.02, 2.15, 0)]
    for i, (r, x, y, z, ci) in enumerate(blobs):
        b = ico("leaf%d" % i, r, subdiv=2, loc=(x, y, z), m=mat("m_leaf%d" % i, greens[ci], rough=0.85))
        b.scale = (1.0, 1.0, 0.92)


def build_berry_tree():
    cone("trunk", 0.16, 0.1, 0.72, loc=(0, 0, 0.36), verts=10, m=mat("m_bark", 0x5c3d20, rough=0.9))
    g = mat("m_leaf", 0x2a8a34, rough=0.85)
    for i, (r, x, y, z) in enumerate([(0.55, 0, 0, 1.05), (0.42, -0.28, 0.08, 1.28), (0.42, 0.28, -0.06, 1.25)]):
        ico("leaf%d" % i, r, subdiv=2, loc=(x, y, z), m=g)
    berry = mat("m_berry", 0xd11f27, rough=0.4)
    import random
    random.seed(7)
    for i in range(7):
        a = i / 7.0 * math.tau
        ico("berry%d" % i, 0.07, subdiv=1,
            loc=(math.cos(a) * 0.5, math.sin(a) * 0.5, 1.05 + math.sin(a * 2) * 0.22), m=berry)


def build_bush():
    cols = [0x2c7a30, 0x358c39, 0x256b28]
    pts = [(0.32, -0.2, -0.1, 0.3), (0.3, 0.22, 0.08, 0.34), (0.28, 0.0, 0.2, 0.38), (0.26, 0.05, -0.18, 0.28)]
    for i, (r, x, y, z) in enumerate(pts):
        b = ico("lobe%d" % i, r, subdiv=2, loc=(x, y, z), m=mat("m_bush%d" % i, cols[i % 3], rough=0.88))
        b.scale = (1.0, 1.0, 0.9)


def build_rock():
    cols = [0x6a6c72, 0x585a63, 0x777982]
    specs = [(0.4, -0.18, 0.0, 0.26, (1.2, 1.0, 0.8)),
             (0.3, 0.24, 0.12, 0.2, (1.0, 1.1, 0.75)),
             (0.24, 0.05, -0.2, 0.16, (1.1, 0.9, 0.7))]
    for i, (r, x, y, z, sc) in enumerate(specs):
        b = ico("rock%d" % i, r, subdiv=1, loc=(x, y, z), m=mat("m_rock%d" % i, cols[i % 3], rough=0.95), smooth=False)
        b.scale = sc


def build_lamp():
    dark = mat("m_metal", 0x1b1d24, rough=0.5, metal=0.6)
    cyl("base", 0.2, 0.18, loc=(0, 0, 0.09), verts=16, m=dark)
    cyl("pole", 0.06, 1.7, loc=(0, 0, 1.0), verts=12, m=dark)
    # Lantern: glowing glass housing framed by thin dark edges so the light shows.
    glass = mat("m_glass", 0xffe08a, rough=0.3, emit=0xffcf6a, emit_str=6.0)
    box("glass", 0.26, 0.26, 0.36, loc=(0, 0, 2.05), m=glass)
    for i, (sx, sy) in enumerate([(-1, -1), (-1, 1), (1, -1), (1, 1)]):
        box("edge%d" % i, 0.05, 0.05, 0.4, loc=(sx * 0.14, sy * 0.14, 2.05), m=dark)
    box("lant_base", 0.32, 0.32, 0.06, loc=(0, 0, 1.85), m=dark)
    cone("cap", 0.28, 0.02, 0.22, loc=(0, 0, 2.36), verts=4, rot=(0, 0, math.pi / 4), m=dark)
    sphere("finial", 0.05, loc=(0, 0, 2.52), m=dark)


def build_lily():
    padc = [0x2f7a36, 0x379142]
    import random
    random.seed(3)
    for i in range(4):
        r = 0.3 + random.random() * 0.18
        p = cyl("pad%d" % i, r, 0.04, loc=((random.random() - 0.5) * 0.9, (random.random() - 0.5) * 0.9, 0.02 + i * 0.015),
                verts=14, m=mat("m_pad%d" % i, padc[i % 2], rough=0.7))
        # notch look: keep simple disc
    petm = mat("m_petal", 0xf58cc6, rough=0.5)
    for i in range(5):
        a = i / 5.0 * math.tau
        pt = box("petal%d" % i, 0.06, 0.13, 0.03, loc=(math.cos(a) * 0.08, math.sin(a) * 0.08, 0.1),
                 rot=(0, 0, a), m=petm)
    sphere("center", 0.05, loc=(0, 0, 0.12), m=mat("m_lc", 0xffd94a, rough=0.5))


def build_sign():
    wood = mat("m_wood", 0x7a5330, rough=0.9)
    wood2 = mat("m_wood2", 0xc7a15a, rough=0.85)
    cyl("post", 0.06, 1.0, loc=(0, 0, 0.5), verts=10, m=wood)
    box("board", 0.72, 0.08, 0.42, loc=(0, 0.02, 1.02), m=wood2)
    box("board_trim", 0.76, 0.06, 0.06, loc=(0, 0.0, 1.24), m=wood)
    # little arrow
    cone("arrow", 0.12, 0.0, 0.18, loc=(0.34, 0.06, 1.02), rot=(math.pi / 2, 0, -math.pi / 2), verts=3,
         m=mat("m_arrow", 0xd8562b, rough=0.7))


def build_heal_pad():
    base = mat("m_pad", 0xff6f8a, rough=0.5, emit=0xff2f52, emit_str=2.2)
    cyl("pad", 0.62, 0.08, loc=(0, 0, 0.04), verts=28, m=base)
    ring = mat("m_ring", 0xffffff, rough=0.5, emit=0xffd0d8, emit_str=1.2)
    t = torus("ring", 0.5, 0.05, loc=(0, 0, 0.08), m=ring)
    cross = mat("m_cross", 0xffffff, rough=0.4, emit=0xffffff, emit_str=1.5)
    box("cross_v", 0.12, 0.34, 0.03, loc=(0, 0, 0.1), m=cross)
    box("cross_h", 0.34, 0.12, 0.03, loc=(0, 0, 0.1), m=cross)


def build_cave():
    stone = mat("m_stone", 0x4a4a58, rough=0.95)
    stone2 = mat("m_stone2", 0x3a3a46, rough=0.95)
    # Arch made from a half torus standing upright
    t = torus("arch", 1.1, 0.34, loc=(0, 0, 1.15), rot=(math.pi / 2, 0, 0), m=stone, smooth=False)
    # dark opening
    disc = mat("m_dark", 0x0c0c12, rough=1.0)
    d = cyl("mouth", 0.85, 0.06, loc=(0, 0.18, 1.05), rot=(math.pi / 2, 0, 0), verts=24, m=disc)
    d.scale = (1.0, 1.35, 1.0)
    # boulders flanking
    for i, (x, z, r) in enumerate([(-1.05, 0.5, 0.55), (1.05, 0.5, 0.55), (-0.7, 1.7, 0.4), (0.7, 1.75, 0.42)]):
        b = ico("boulder%d" % i, r, subdiv=1, loc=(x, 0, z), m=stone2 if i % 2 else stone, smooth=False)
        b.scale = (1.1, 1.0, 0.9)


# ---------------------------------------------------------------------------
# New props
# ---------------------------------------------------------------------------

def build_fountain():
    stone = mat("m_stone", 0x9aa0a8, rough=0.85)
    stone2 = mat("m_stone2", 0x808690, rough=0.85)
    water = mat("m_water", 0x4aa3e6, rough=0.15, emit=0x2f7fd0, emit_str=1.2, alpha=0.9)
    # outer basin wall
    t = torus("basin", 0.9, 0.16, loc=(0, 0, 0.16), m=stone)
    cyl("basin_floor", 0.86, 0.1, loc=(0, 0, 0.06), verts=32, m=stone2)
    cyl("water_low", 0.8, 0.06, loc=(0, 0, 0.16), verts=32, m=water)
    # central column + upper bowl
    cyl("column", 0.16, 0.55, loc=(0, 0, 0.45), verts=16, m=stone)
    cone("bowl", 0.42, 0.2, 0.16, loc=(0, 0, 0.78), verts=24, m=stone2)
    cyl("water_top", 0.34, 0.05, loc=(0, 0, 0.86), verts=24, m=water)
    cyl("spout", 0.06, 0.3, loc=(0, 0, 1.02), verts=10, m=stone)
    sphere("spray", 0.12, loc=(0, 0, 1.2), m=water)


def build_cattail():
    stem = mat("m_stem", 0x3f8f3e, rough=0.85)
    head = mat("m_head", 0x6b4326, rough=0.8)
    import random
    random.seed(11)
    for i in range(6):
        x = (random.random() - 0.5) * 0.5
        y = (random.random() - 0.5) * 0.5
        h = 0.7 + random.random() * 0.4
        lean = (random.random() - 0.5) * 0.12
        cyl("stem%d" % i, 0.02, h, loc=(x, y, h / 2), rot=(lean, lean, 0), verts=6, m=stem)
        cap = cyl("head%d" % i, 0.05, 0.2, loc=(x + lean * h * 0.5, y + lean * h * 0.5, h - 0.02), verts=8, m=head)
        cap.scale = (1.0, 1.0, 1.0)


def build_pokeball():
    red = mat("m_red", 0xe3350d, rough=0.35)
    white = mat("m_white", 0xf4f4f6, rough=0.35)
    black = mat("m_black", 0x1a1a1f, rough=0.4)
    btn = mat("m_btn", 0xffffff, rough=0.3, emit=0xffffff, emit_str=0.6)

    # Sphere split at the equator: red top, white bottom (per-face materials).
    ball = sphere("ball", 0.5, loc=(0, 0, 0.5), segs=28, rings=18, m=red)
    ball.data.materials.append(white)  # slot 1
    me = ball.data
    bm = bmesh.new()
    bm.from_mesh(me)
    # Mesh data is local (centered on origin); equator is local z = 0.
    for f in bm.faces:
        f.material_index = 0 if f.calc_center_median().z >= 0.0 else 1
    bm.to_mesh(me)
    bm.free()

    # Black equator band + button
    torus("band", 0.5, 0.055, loc=(0, 0, 0.5), rot=(math.pi / 2, 0, 0), m=black)
    cyl("btn_ring", 0.14, 0.06, loc=(0, 0.5, 0.5), rot=(math.pi / 2, 0, 0), verts=20, m=black)
    cyl("btn", 0.08, 0.08, loc=(0, 0.54, 0.5), rot=(math.pi / 2, 0, 0), verts=20, m=btn)


# ---------------------------------------------------------------------------
# Character builders
# ---------------------------------------------------------------------------

def build_player():
    humanoid(shirt=0x2b5fd0, pants=0x243b6e, hair=0x4a3320,
             cap=0xd42a2a, cap_brim=0xb01f1f)


def build_nurse():
    humanoid(shirt=0xf5f5f7, pants=0xf5f5f7, hair=0xef6fa5, hair_style="buns",
             apron=0xf7b8cf, cap=0xffffff, cross=True, dress=True)


def build_oak():
    humanoid(shirt=0xf0f0f2, pants=0x5a4a36, hair=0xc2c2c8, coat=0xeeeef2, apron=0x9c7b4a)


def build_shop():
    humanoid(shirt=0x2f9e5e, pants=0x33475a, hair=0x2a2a2e,
             apron=0x256b45, cap=0x2f9e5e, cap_brim=0x1f6b40)


def build_kid():
    humanoid(shirt=0xf2c53d, pants=0x6a4a2a, hair=0x5a3a1e,
             cap=0x3b62c4, cap_brim=0x2c4aa0)


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------
ASSETS = {
    # Improved existing (drop-in, same filenames)
    "tree": build_tree,
    "berry_tree": build_berry_tree,
    "bush": build_bush,
    "rock": build_rock,
    "lamp": build_lamp,
    "lily": build_lily,
    "sign": build_sign,
    "heal_pad": build_heal_pad,
    "cave": build_cave,
    "player_trainer": build_player,
    "nurse_joy": build_nurse,
    "professor_oak": build_oak,
    "shop_clerk": build_shop,
    "youngster_joey": build_kid,
    # New assets
    "fountain": build_fountain,
    "cattail": build_cattail,
    "pokeball": build_pokeball,
}


# ---------------------------------------------------------------------------
# Export + preview
# ---------------------------------------------------------------------------

def _select_all_meshes():
    bpy.ops.object.select_all(action="DESELECT")
    objs = [o for o in bpy.data.objects if o.type == "MESH"]
    for o in objs:
        o.select_set(True)
    if objs:
        bpy.context.view_layer.objects.active = objs[0]
    return objs


def export_glb(name):
    _select_all_meshes()
    out = os.path.join(OUT_DIR, name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )
    return out


def render_preview(name):
    objs = [o for o in bpy.data.objects if o.type == "MESH"]
    if not objs:
        return
    # combined bounds
    import mathutils
    mn = mathutils.Vector((1e9, 1e9, 1e9))
    mx = mathutils.Vector((-1e9, -1e9, -1e9))
    for o in objs:
        for corner in o.bound_box:
            wc = o.matrix_world @ mathutils.Vector(corner)
            mn = mathutils.Vector((min(mn[i], wc[i]) for i in range(3)))
            mx = mathutils.Vector((max(mx[i], wc[i]) for i in range(3)))
    center = (mn + mx) / 2.0
    size = (mx - mn).length

    cam_data = bpy.data.cameras.new("cam")
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.collection.objects.link(cam)
    d = max(size * 1.1, 1.5)
    cam.location = (center.x + d * 0.75, center.y - d * 0.9, center.z + d * 0.6)
    # aim
    import mathutils as mu
    direction = center - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam

    sun_data = bpy.data.lights.new("sun", "SUN")
    sun_data.energy = 3.0
    sun = bpy.data.objects.new("sun", sun_data)
    sun.rotation_euler = (math.radians(55), math.radians(15), math.radians(40))
    bpy.context.collection.objects.link(sun)

    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (0.6, 0.68, 0.75, 1.0)
    bg.inputs[1].default_value = 1.0
    bpy.context.scene.world = world

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    try:
        scene.cycles.samples = 24
        scene.cycles.use_denoising = False
    except Exception:
        pass
    scene.render.resolution_x = 420
    scene.render.resolution_y = 420
    scene.render.film_transparent = False
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    scene.render.filepath = os.path.join(PREVIEW_DIR, name + ".png")
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv
    names = []
    if "--" in argv:
        names = argv[argv.index("--") + 1:]
    if not names:
        names = list(ASSETS.keys())

    built = []
    for name in names:
        if name not in ASSETS:
            print("SKIP unknown asset:", name)
            continue
        reset_scene()
        ASSETS[name]()
        out = export_glb(name)
        if RENDER:
            render_preview(name)
        sz = os.path.getsize(out)
        built.append((name, sz))
        print("BUILT %-16s %6d bytes" % (name, sz))

    print("DONE built %d assets -> %s" % (len(built), OUT_DIR))


if __name__ == "__main__":
    main()
