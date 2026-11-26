# Blocky Tales asset builder.  Run headless:  blender -b --python blender/build_assets.py
# Builds blocky characters (pivot rig: Root > Torso > Head/LeftArm/RightArm/LeftLeg/RightLeg),
# props and the cozy room, and exports GLB files to web/public/models/.
#
# Coordinates below are authored in "stage" space (same as Three.js): x right, y up, z toward camera.
# P()/S() convert to Blender (z up, -y forward).  Characters face stage +z.
import bpy, bmesh, math, os, random
from mathutils import Vector, noise

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEX = os.path.join(ROOT, 'assets_src', 'textures')
OUT = os.path.join(ROOT, 'web', 'public', 'models')
os.makedirs(OUT, exist_ok=True)
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def P(x, y, z): return Vector((x, -z, y))          # stage -> blender position
def S(w, h, d): return (w, d, h)                   # stage -> blender size

# ---------------------------------------------------------------- materials
_mats = {}
def flat(name, hexcol, rough=0.6, metal=0.0, emit=0.0):
    if name in _mats: return _mats[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    c = [int(hexcol[i:i+2], 16) / 255 for i in (1, 3, 5)]
    c = [pow(v, 2.2) for v in c] + [1]
    b.inputs['Base Color'].default_value = c
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit > 0:
        b.inputs['Emission Color'].default_value = c
        b.inputs['Emission Strength'].default_value = emit
    _mats[name] = m
    return m

def pbr(name, tex):
    """Material with real PBR maps (Poly Haven): base colour, GL normal, roughness."""
    if name in _mats: return _mats[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    def img(suffix, colorspace):
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = bpy.data.images.load(os.path.join(TEX, f'{tex}_{suffix}.jpg'))
        n.image.colorspace_settings.name = colorspace
        return n
    d = img('diff', 'sRGB'); nt.links.new(d.outputs['Color'], b.inputs['Base Color'])
    r = img('rough', 'Non-Color'); nt.links.new(r.outputs['Color'], b.inputs['Roughness'])
    n = img('nor', 'Non-Color'); nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    _mats[name] = m
    return m

# ---------------------------------------------------------------- mesh helpers
col = None
def new_collection(name):
    global col
    col = bpy.data.collections.new(name); scene.collection.children.link(col)
    return col

def box_uv(bm, tile):
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        a, b = [(1, 2), (0, 2), (0, 1)][ax]
        for l in f.loops:
            l[uv].uv = (l.vert.co[a] / tile + 0.37, l.vert.co[b] / tile + 0.21)

def finish(name, bm, mat, loc, parent, bevel, tile=1.0, rot=None, uv=True, bevel_angle=30):
    bm.normal_update()
    if uv: box_uv(bm, tile)
    me = bpy.data.meshes.new(name + 'Mesh'); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); col.objects.link(ob)
    ob.location = loc
    if rot: ob.rotation_euler = rot
    mats = mat if isinstance(mat, (list, tuple)) else [mat]
    for m in mats: me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    if bevel > 0:
        md = ob.modifiers.new('bevel', 'BEVEL'); md.width = bevel; md.segments = 3
        md.limit_method = 'ANGLE'; md.angle_limit = math.radians(bevel_angle)
    wn = ob.modifiers.new('wn', 'WEIGHTED_NORMAL'); wn.keep_sharp = False; wn.weight = 100
    if parent: ob.parent = parent
    return ob

def box(name, size, loc, mat, parent=None, bevel=0.015, tile=1.0, rot=None):
    """size/loc in BLENDER space (use S()/P() for stage space)."""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    return finish(name, bm, mat, loc, parent, min(bevel, min(size) * 0.45), tile, rot)

def cyl(name, r, h, loc, mat, parent=None, bevel=0.01, segs=48, r2=None, tile=1.0, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
    return finish(name, bm, mat, loc, parent, min(bevel, h * 0.45, r * 0.45), tile, rot)

def ball(name, r, loc, mat, parent=None, scale=(1, 1, 1), jitter=0.0, tile=1.0):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=r, calc_uvs=True)
    for v in bm.verts:
        if jitter: v.co += v.co.normalized() * noise.noise(v.co * 5.0) * jitter
        v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
    if tile != 1.0:
        uv = bm.loops.layers.uv.verify()
        for f in bm.faces:
            for l in f.loops: l[uv].uv = l[uv].uv * (1.0 / tile)
    return finish(name, bm, mat, loc, parent, 0, uv=False)

def empty(name, loc, parent=None):
    ob = bpy.data.objects.new(name, None); col.objects.link(ob); ob.location = loc
    ob.empty_display_size = 0.05
    if parent: ob.parent = parent
    return ob

def export(collection, filename):
    bpy.ops.object.select_all(action='DESELECT')
    for o in collection.all_objects: o.select_set(True)
    bpy.context.view_layer.objects.active = collection.all_objects[0]
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, filename), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_extras=True,
                              export_image_format='JPEG', export_jpeg_quality=90, export_animations=False)
    for o in collection.all_objects: o.select_set(False)
    print('exported', filename)

# ---------------------------------------------------------------- characters
# Shared proportions (metres, before Root scale). Keep in sync with web/src/engine/rig.js
LEG = (0.115, 0.115, 0.30)      # w, d, h
TORSO = (0.27, 0.16, 0.30)
ARM = (0.095, 0.095, 0.29)
HEAD_R, HEAD_H = 0.145, 0.25

def character(name, c, hair):
    new_collection(name)
    skin = flat(name + '_skin', c['skin'], 0.55)
    top = flat(name + '_top', c['top'], 0.75)
    pants = flat(name + '_pants', c['pants'], 0.8)
    shoe = flat(name + '_shoe', c['shoe'], 0.5)
    hairm = flat(name + '_hair', c['hair'], 0.65)
    acc = flat(name + '_accent', c['accent'], 0.6)
    hip = LEG[2]; sh = hip + TORSO[2]
    root = empty('Root', (0, 0, 0))
    torso = empty('Torso', (0, 0, hip + TORSO[2] / 2), root)
    box('TorsoMesh', TORSO, (0, 0, 0), top, torso, bevel=0.03)
    # hoodie pocket / stripe accent on the front (blender -y is front)
    box('TorsoAccent', (TORSO[0] * 0.62, 0.012, 0.07), (0, -TORSO[1] / 2 - 0.002, -0.06), acc, torso, bevel=0.005)
    # legs: pivot at the hip
    for side, sx in (('Left', 1), ('Right', -1)):       # stage-left of the character = +x
        leg = empty(side + 'Leg', (sx * (LEG[0] / 2 + 0.008), 0, -TORSO[2] / 2), torso)
        box(side + 'LegMesh', (LEG[0], LEG[1], LEG[2] - 0.07), (0, 0, -(LEG[2] - 0.07) / 2), pants, leg, bevel=0.022)
        box(side + 'Shoe', (LEG[0] + 0.012, LEG[1] + 0.045, 0.075), (0, -0.018, -LEG[2] + 0.0375), shoe, leg, bevel=0.025)
        arm = empty(side + 'Arm', (sx * (TORSO[0] / 2 + ARM[0] / 2 + 0.004), 0, TORSO[2] / 2 - 0.035), torso)
        box(side + 'ArmMesh', (ARM[0], ARM[1], ARM[2] - 0.075), (0, 0, 0.035 - (ARM[2] - 0.075) / 2), top, arm, bevel=0.022)
        box(side + 'Hand', (ARM[0] - 0.006, ARM[1] - 0.006, 0.08), (0, 0, 0.035 - ARM[2] + 0.04), skin, arm, bevel=0.025)
    # head: pivot at the neck
    head = empty('Head', (0, 0, TORSO[2] / 2 + 0.005), torso)
    cyl('HeadMesh', HEAD_R, HEAD_H, (0, 0, HEAD_H / 2), skin, head, bevel=0.035, segs=64)
    hair(head, hairm, acc)
    return root

def hair_bean(head, hm, acc):
    cyl('HairCap', HEAD_R + 0.008, 0.085, (0, 0, HEAD_H - 0.03), hm, head, bevel=0.03)
    cyl('HairBack', HEAD_R - 0.012, 0.15, (0, 0.052, HEAD_H - 0.11), hm, head, bevel=0.03)   # hugs the back of the head, hidden from the front
    for i, (x, y, s) in enumerate([(-0.07, -0.09, 0.07), (0.02, -0.11, 0.08), (0.09, -0.07, 0.06)]):
        box(f'Tuft{i}', (s, s, s), (x, y, HEAD_H + 0.01), hm, head, bevel=0.02, rot=(0.3, 0.2, 0.5 * i))

def hair_dottie(head, hm, acc):
    cyl('HairCap', HEAD_R + 0.008, 0.09, (0, 0, HEAD_H - 0.03), hm, head, bevel=0.03)
    cyl('HairBack', HEAD_R - 0.012, 0.2, (0, 0.052, HEAD_H - 0.13), hm, head, bevel=0.03)   # hugs the back of the head, hidden from the front
    box('Fringe', (0.22, 0.03, 0.05), (0, -HEAD_R + 0.012, HEAD_H - 0.045), hm, head, bevel=0.012)
    for sx in (-1, 1):
        ball(f'Pigtail{sx}', 0.062, (sx * (HEAD_R + 0.055), 0.01, HEAD_H - 0.07), hm, head, scale=(1, 1, 1.25))
        cyl(f'Band{sx}', 0.03, 0.03, (sx * (HEAD_R + 0.008), 0.01, HEAD_H - 0.06), acc, head, rot=(0, math.pi / 2, 0))

def hair_mom(head, hm, acc):
    cyl('HairCap', HEAD_R + 0.008, 0.09, (0, 0, HEAD_H - 0.03), hm, head, bevel=0.03)
    cyl('HairBack', HEAD_R - 0.012, 0.24, (0, 0.052, HEAD_H - 0.15), hm, head, bevel=0.03)   # hugs the back of the head, hidden from the front
    ball('Bun', 0.07, (0, 0.03, HEAD_H + 0.06), hm, head)
    box('Fringe', (0.2, 0.03, 0.04), (0.03, -HEAD_R + 0.012, HEAD_H - 0.04), hm, head, bevel=0.012, rot=(0, 0.25, 0))

CHARS = {
    'bean':   (dict(skin='#F7C59A', top='#FFC93C', pants='#3B5BA9', shoe='#F4F1EA', hair='#6B3F22', accent='#FF8A3C'), hair_bean),
    'dottie': (dict(skin='#F2B890', top='#FF7EB6', pants='#7A5CC9', shoe='#FFF3D6', hair='#3A2452', accent='#6FE3D0'), hair_dottie),
    'mom':    (dict(skin='#EDB48C', top='#3FA7A0', pants='#2E6F73', shoe='#F6D8E0', hair='#5A2E1C', accent='#F6E6B4'), hair_mom),
}
for name, (colors, hair) in CHARS.items():
    character(name, colors, hair)
    export(col, f'char_{name}.glb')
    for o in col.all_objects:            # free the generic rig names (Root, Torso, Head, …) for the next character
        o.name = f'{name}_{o.name}'
        if o.data: o.data.name = f'{name}_{o.data.name}'

# ---------------------------------------------------------------- room
new_collection('room')
W, H = 2.4, 2.7
M_floor, M_wall, M_wood = pbr('floor', 'floor'), pbr('wall', 'wall'), pbr('wood', 'wood')
M_blanket, M_rug, M_couch = pbr('blanket', 'blanket'), pbr('rug', 'rug'), pbr('couch', 'couch')
M_duvet = pbr('duvet', 'blanket')
white = flat('white', '#F3EEE6', 0.7); dark = flat('dark', '#23232B', 0.5)

def sbox(name, c, s, mat, parent=None, bevel=0.015, tile=1.0, rot=None):
    return box(name, S(*s), P(*c), mat, parent, bevel, tile, rot)

sbox('Floor', (0, -0.05, 0), (2 * W + 0.4, 0.1, 2 * W + 0.4), M_floor, bevel=0, tile=1.6)
sbox('Wall_Back', (0, H / 2, -W - 0.1), (2 * W + 0.4, H, 0.2), M_wall, bevel=0, tile=2.0)
sbox('Wall_Front', (0, H / 2, W + 0.1), (2 * W + 0.4, H, 0.2), M_wall, bevel=0, tile=2.0)
sbox('Wall_Left', (-W - 0.1, H / 2, 0), (0.2, H, 2 * W + 0.4), M_wall, bevel=0, tile=2.0)
sbox('Wall_Right', (W + 0.1, H / 2, 0), (0.2, H, 2 * W + 0.4), M_wall, bevel=0, tile=2.0)
sbox('Ceiling', (0, H + 0.05, 0), (2 * W + 0.4, 0.1, 2 * W + 0.4), white, bevel=0)
trim = flat('trim', '#EFE6D8', 0.5)
for nm, c, s in [('Back', (0, 0.06, -W + 0.015), (2 * W, 0.12, 0.03)), ('Front', (0, 0.06, W - 0.015), (2 * W, 0.12, 0.03)),
                 ('Left', (-W + 0.015, 0.06, 0), (0.03, 0.12, 2 * W)), ('Right', (W - 0.015, 0.06, 0), (0.03, 0.12, 2 * W))]:
    sbox('Skirting_' + nm, c, s, trim, bevel=0.008)

# window (night sky pane + moon + frame + curtains) on the back wall
wx, wy = -0.05, 1.5
sbox('MoonGlass', (wx, wy, -W + 0.012), (1.1, 1.05, 0.02), flat('nightsky', '#22346E', 0.2, emit=1.4), bevel=0)
cyl('Moon', 0.13, 0.012, P(wx + 0.25, wy + 0.22, -W + 0.03), flat('moon', '#F4F1D0', 0.4, emit=7.0), rot=(math.pi / 2, 0, 0), bevel=0)
for i in range(9):
    sx, sy = wx - 0.45 + random.random() * 0.9, wy - 0.4 + random.random() * 0.85
    if abs(sx - wx - 0.25) < 0.2 and abs(sy - wy - 0.22) < 0.2: continue
    ball(f'Star{i}', 0.012, P(sx, sy, -W + 0.03), flat('star', '#FFFFFF', 0.4, emit=6.0))
for nm, c, s in [('T', (wx, wy + 0.56, -W + 0.04), (1.26, 0.08, 0.08)), ('B', (wx, wy - 0.56, -W + 0.05), (1.34, 0.08, 0.12)),
                 ('L', (wx - 0.59, wy, -W + 0.04), (0.08, 1.2, 0.08)), ('R', (wx + 0.59, wy, -W + 0.04), (0.08, 1.2, 0.08)),
                 ('V', (wx, wy, -W + 0.035), (0.045, 1.1, 0.05)), ('H', (wx, wy, -W + 0.035), (1.1, 0.045, 0.05))]:
    sbox('WinFrame' + nm, c, s, trim, bevel=0.012)
M_curtain = flat('curtain', '#E8785A', 0.9)
for sx in (-1, 1):
    for k in range(4):
        cyl(f'Curtain{sx}{k}', 0.06, 1.55, P(wx + sx * (0.72 + k * 0.085), wy - 0.1, -W + 0.09), M_curtain, bevel=0.03, segs=16)
cyl('CurtainRod', 0.018, 2.3, P(wx, wy + 0.72, -W + 0.09), flat('brass', '#C9A24B', 0.3, 1.0), rot=(0, math.pi / 2, 0), segs=16)

# bed (back-left corner)
bx, bz = -1.78, -1.38
sbox('BedFrame', (bx, 0.17, bz), (1.14, 0.34, 2.0), M_wood, bevel=0.03, tile=0.9)
sbox('Headboard', (bx, 0.62, -W + 0.05), (1.14, 1.24, 0.1), M_wood, bevel=0.05, tile=0.9)
sbox('Mattress', (bx, 0.41, bz), (1.06, 0.16, 1.92), white, bevel=0.05)
sbox('Duvet', (bx + 0.02, 0.52, bz + 0.33), (1.12, 0.1, 1.25), M_duvet, bevel=0.045, tile=0.5, rot=(0, 0, 0.03))
sbox('DuvetFold', (bx + 0.05, 0.57, bz - 0.25), (1.1, 0.07, 0.3), M_duvet, bevel=0.03, tile=0.5, rot=(0.03, 0, -0.05))
sbox('Pillow', (bx, 0.54, -2.02), (0.68, 0.13, 0.38), flat('pillow', '#FFF7EA', 0.9), bevel=0.06, rot=(0.12, 0, 0.04))

# nightstand + digital clock (the engine attaches the display to the ClockFace empty)
nx, nz = -0.92, -2.12
sbox('Nightstand', (nx, 0.25, nz), (0.48, 0.5, 0.46), M_wood, bevel=0.03, tile=0.7)
sbox('Drawer', (nx, 0.3, nz + 0.232), (0.38, 0.16, 0.02), flat('drawer', '#F2E3C6', 0.6), bevel=0.008)
ball('Knob', 0.022, P(nx, 0.3, nz + 0.25), flat('brass', '#C9A24B'))
sbox('Clock', (nx, 0.57, nz + 0.08), (0.3, 0.14, 0.1), dark, bevel=0.03)
cf = empty('ClockFace', P(nx, 0.57, nz + 0.1315))

# rug + coffee table + the cake
sbox('Rug', (0.3, 0.012, -0.55), (2.5, 0.024, 1.9), M_rug, bevel=0.01, tile=0.8)
tx, tz, th = 0.3, -0.7, 0.42
sbox('TableTop', (tx, th - 0.03, tz), (0.95, 0.06, 0.6), M_wood, bevel=0.025, tile=0.6)
for i, (dx, dz) in enumerate([(-0.4, -0.23), (0.4, -0.23), (-0.4, 0.23), (0.4, 0.23)]):
    sbox(f'TableLeg{i}', (tx + dx, (th - 0.06) / 2, tz + dz), (0.06, th - 0.06, 0.06), M_wood, bevel=0.015, tile=0.6)
cake_root = empty('Cake', P(tx, th, tz))
cyl('CakePlate', 0.19, 0.016, (0, 0, 0.008), flat('plate', '#FAFAFA', 0.25), cake_root, bevel=0.006)
cyl('CakeStandFoot', 0.05, 0.012, (0, 0, 0.004), flat('plate', '#FAFAFA'), cake_root, bevel=0.004)
frost = flat('frosting', '#FF9EC4', 0.45); sponge = flat('sponge', '#F4D58A', 0.9); cherry = flat('cherry', '#D81E3A', 0.25)
CR, CH, NS = 0.14, 0.11, 8
for i in range(NS):
    a0, a1 = i * 2 * math.pi / NS, (i + 1) * 2 * math.pi / NS
    bm = bmesh.new(); n = 6
    cb, ct = bm.verts.new((0, 0, 0)), bm.verts.new((0, 0, CH))
    lo = [bm.verts.new((CR * math.cos(a0 + (a1 - a0) * k / n), CR * math.sin(a0 + (a1 - a0) * k / n), 0)) for k in range(n + 1)]
    hi = [bm.verts.new((v.co.x, v.co.y, CH)) for v in lo]
    faces = []
    for k in range(n):
        bm.faces.new((ct, hi[k], hi[k + 1])).material_index = 0
        bm.faces.new((cb, lo[k + 1], lo[k])).material_index = 1
        bm.faces.new((lo[k], lo[k + 1], hi[k + 1], hi[k])).material_index = 0
    bm.faces.new((cb, lo[0], hi[0], ct)).material_index = 1
    bm.faces.new((cb, ct, hi[n], lo[n])).material_index = 1
    sl = finish(f'CakeSlice{i}', bm, [frost, sponge], (0, 0, 0.016), cake_root, 0.006, uv=False, bevel_angle=40)
    am = (a0 + a1) / 2
    ball(f'Cherry{i}', 0.02, (0.095 * math.cos(am), 0.095 * math.sin(am), CH + 0.012), cherry, sl)
    ball(f'Cream{i}', 0.026, (0.095 * math.cos(am), 0.095 * math.sin(am), CH - 0.004), flat('cream', '#FFF8EE', 0.5), sl, scale=(1, 1, 0.6))
# crumbs that appear once the cake is half eaten
crumbs = empty('Crumbs', (0, 0, 0.016), cake_root)
for i in range(10):
    a = math.pi + random.random() * math.pi * 0.9; r = 0.03 + random.random() * 0.12
    box(f'Crumb{i}', (0.016, 0.014, 0.01), (r * math.cos(a), r * math.sin(a), 0.006), sponge if i % 3 else frost, crumbs, bevel=0.004, rot=(0, 0, random.random() * 3))

# couch (back wall, right) + the blanket "monster"
cx, cz = 1.32, -1.9
sbox('CouchBase', (cx, 0.2, cz), (1.7, 0.4, 0.86), M_couch, bevel=0.06, tile=0.6)
sbox('CouchBack', (cx, 0.62, cz - 0.34), (1.7, 0.78, 0.22), M_couch, bevel=0.08, tile=0.6)
for sx in (-1, 1):
    sbox(f'CouchArm{sx}', (cx + sx * 0.82, 0.38, cz), (0.2, 0.62, 0.86), M_couch, bevel=0.08, tile=0.6)
    sbox(f'CouchCushion{sx}', (cx + sx * 0.36, 0.44, cz + 0.05), (0.7, 0.12, 0.68), M_couch, bevel=0.05, tile=0.6)
sbox('ThrowPillow', (cx + 0.6, 0.66, cz - 0.14), (0.36, 0.36, 0.14), flat('throw', '#F2B441', 0.9), bevel=0.06, rot=(0.25, 0, 0.3))
for i, (dx, dz) in enumerate([(-0.75, -0.33), (0.75, -0.33), (-0.75, 0.33), (0.75, 0.33)]):
    sbox(f'CouchFoot{i}', (cx + dx, 0.03, cz + dz), (0.08, 0.06, 0.08), M_wood, bevel=0.01)
lump = empty('BlanketLump', P(cx - 0.36, 0.5, cz + 0.05))
ball('LumpMesh', 0.4, (0, 0, 0.24), M_blanket, lump, scale=(0.95, 0.82, 1.0), jitter=0.07, tile=0.45)
sbox('LumpSkirt', (0, 0.03, 0.02), (0.84, 0.1, 0.7), M_blanket, lump, bevel=0.045, tile=0.45)
eyes = empty('LumpEyes', (0, -0.325, 0.27), lump)
for sx in (-1, 1):
    ball(f'LumpEye{sx}', 0.045, (sx * 0.1, 0, 0), flat('eyeglow', '#FFE45C', 0.3, emit=3.2), eyes, scale=(1, 0.5, 1.15))
    sbox(f'LumpPupil{sx}', (sx * 0.1, 0, 0.022), (0.018, 0.05, 0.012), dark, eyes, bevel=0.004)
pile = empty('BlanketPile', P(cx + 0.42, 0.52, cz + 0.12))
ball('PileMesh', 0.3, (0, 0, 0.02), M_blanket, pile, scale=(1.25, 0.95, 0.38), jitter=0.09, tile=0.45)
sbox('PileDrape', (0.0, -0.12, 0.42), (0.6, 0.5, 0.06), M_blanket, pile, bevel=0.03, tile=0.45, rot=(-1.15, 0, 0.1))

# floor lamp (warm practical) next to the couch
lx, lz = 2.12, -0.95
cyl('LampFoot', 0.16, 0.03, P(lx, 0.015, lz), dark, bevel=0.01)
cyl('LampPole', 0.016, 1.3, P(lx, 0.66, lz), flat('brass', '#C9A24B'), segs=16)
cyl('LampShade', 0.2, 0.26, P(lx, 1.4, lz), flat('lampshade', '#FFD39A', 0.6, emit=3.5), r2=0.14, bevel=0.01)

# bookshelf (right wall)
kx, kz = 2.22, 0.75
sbox('Shelf_Back', (kx + 0.14, 0.95, kz), (0.03, 1.9, 1.2), M_wood, bevel=0.005, tile=0.8)
for sz in (-0.6, 0.6): sbox(f'Shelf_Side{sz}', (kx, 0.95, kz + sz), (0.32, 1.9, 0.04), M_wood, bevel=0.01, tile=0.8)
book_cols = ['#E4572E', '#17BEBB', '#FFC914', '#76B041', '#8E6C8A', '#F28482', '#577590', '#F9844A']
for i, y in enumerate([0.02, 0.48, 0.94, 1.4, 1.88]):
    sbox(f'Shelf_{i}', (kx, y, kz), (0.32, 0.04, 1.2), M_wood, bevel=0.01, tile=0.8)
    if i == 4: break
    z = kz - 0.55
    while z < kz + 0.45:
        w = 0.035 + random.random() * 0.04; hh = 0.24 + random.random() * 0.14
        if random.random() < 0.12: z += 0.12; continue
        cname = random.choice(book_cols)
        sbox(f'Book{i}_{int(z * 100)}', (kx - 0.02, y + 0.02 + hh / 2, z + w / 2), (0.2, hh, w), flat('book' + cname, cname, 0.7), bevel=0.006,
             rot=(0, 0, 0) if random.random() > 0.15 else (0.18, 0, 0))
        z += w + 0.004
# plant
px, pz = -2.0, 2.0
cyl('Pot', 0.17, 0.3, P(px, 0.15, pz), flat('pot', '#E07A5F', 0.7), r2=0.2, bevel=0.02)
leaf = flat('leaf', '#4C9A5B', 0.6)
for i in range(7):
    a = i * 0.9; r = 0.1 + 0.06 * (i % 3)
    ball(f'Leaf{i}', 0.13, P(px + r * math.cos(a), 0.45 + 0.1 * i, pz + r * math.sin(a)), leaf, scale=(1, 1, 1.3), jitter=0.02)
# toys on the floor
for i, (x, z, c, r) in enumerate([(-0.75, 0.55, '#E4572E', 0.3), (-0.55, 0.62, '#17BEBB', 1.1), (-0.66, 0.44, '#FFC914', 0.6)]):
    sbox(f'ToyBlock{i}', (x, 0.06, z), (0.12, 0.12, 0.12), flat('toy' + c, c, 0.45), bevel=0.02, rot=(0, 0, r))
sbox('ToyBlockTop', (-0.66, 0.18, 0.5), (0.12, 0.12, 0.12), flat('toy#76B041', '#76B041', 0.45), bevel=0.02, rot=(0, 0, 0.4))
ball('ToyBall', 0.11, P(1.55, 0.11, 0.9), flat('toyball', '#F25F5C', 0.35))

# wall art
for i, (x, y, w, h, c) in enumerate([(0.95, 1.72, 0.42, 0.52, '#F6BD60'), (1.5, 1.82, 0.34, 0.34, '#84A59D'), (1.95, 1.66, 0.32, 0.44, '#F28482')]):
    sbox(f'Frame{i}', (x, y, -W + 0.02), (w, h, 0.04), M_wood, bevel=0.012, tile=0.5)
    sbox(f'Art{i}', (x, y, -W + 0.042), (w - 0.07, h - 0.07, 0.01), flat('art' + c, c, 0.8), bevel=0)
    ball(f'ArtDot{i}', 0.06, P(x + 0.03, y - 0.03, -W + 0.045), flat('artdot', '#FFF7EA', 0.8), scale=(1, 0.1, 1))
# string lights along the back wall
bulb_cols = ['#FFD27A', '#FF9E7A', '#FFE9A8', '#FFB3C7']
nb = 17
for i in range(nb):
    t = i / (nb - 1); x = -2.2 + 4.4 * t
    sag = 0.07 * math.sin(t * math.pi * 4) ** 2
    c = bulb_cols[i % 4]
    ball(f'StringBulb{i}', 0.03, P(x, 2.42 - sag, -W + 0.05), flat('bulb' + c, c, 0.3, emit=8.0))
sbox('StringWire', (0, 2.44, -W + 0.03), (4.5, 0.008, 0.008), dark, bevel=0)

# door on the left wall: DoorPivot (hinge) > Door.  DoorGlow = bright hallway seen when it opens.
dz, dw, dh = 1.05, 0.95, 2.02
sbox('DoorGlow', (-W + 0.006, dh / 2, dz), (0.01, dh, dw), flat('hallglow', '#FFE2B0', 0.5, emit=6.0), bevel=0)
for nm, c, s in [('T', (-W + 0.03, dh + 0.05, dz), (0.07, 0.1, dw + 0.2)), ('L', (-W + 0.03, dh / 2, dz - dw / 2 - 0.05), (0.07, dh, 0.1)),
                 ('R', (-W + 0.03, dh / 2, dz + dw / 2 + 0.05), (0.07, dh, 0.1))]:
    sbox('DoorFrame' + nm, c, s, trim, bevel=0.012)
piv = empty('DoorPivot', P(-W + 0.05, 0, dz + dw / 2))
sbox('Door', (0, dh / 2, -dw / 2), (0.05, dh, dw), flat('door', '#7FB7BE', 0.55), piv, bevel=0.012)
ball('DoorKnob', 0.035, P(0.05, 1.0, -dw + 0.1), flat('brass', '#C9A24B'), piv)
# ceiling lamp (off until Mom walks in)
cyl('CeilingLamp', 0.28, 0.1, P(0, H - 0.05, -0.4), flat('ceilinglamp', '#FFF4DC', 0.4, emit=0.02), bevel=0.04)

export(col, 'room.glb')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'blender', 'blocky_tales.blend'))
