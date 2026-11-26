# Shared helpers for the Blocky Tales Blender scripts (materials, beveled boxes/cylinders/balls, empties, GLB export).
# Stage space: x right, y up, z toward camera. P()/S() convert to Blender. Use: import sys; sys.path.insert(0, dirname); from bt import *
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


def sbox(name, c, s, mat, parent=None, bevel=0.015, tile=1.0, rot=None):
    return box(name, S(*s), P(*c), mat, parent, bevel, tile, rot)
