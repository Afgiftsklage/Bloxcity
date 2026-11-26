# Blocky Tales — "block" character style (box heads, square limbs) + the STREET set (park, house porch, candy shop, candy fantasy).
# Run headless:  blender -b --python blender/build_ep02.py     -> web/public/models/char2_*.glb, street.glb
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bt
from bt import *
random.seed(11)

# ---------------------------------------------------------------- block-style characters
# Same pivot rig as v1:  Root > Torso > Head / LeftArm / RightArm / LeftLeg / RightLeg.  Keep in sync with episodes/*/shots.js `characters`.
LEG = (0.147, 0.15, 0.30); TORSO = (0.30, 0.15, 0.30); ARM = (0.12, 0.12, 0.30); HEAD = (0.25, 0.22, 0.22)   # w, d, h
BV = 0.009                                                                                                    # small bevel = crisp, blocky

def character2(name, c, extras):
    bt.new_collection(name)
    skin, top, pants = flat(name + '_skin', c['skin'], 0.55), flat(name + '_top', c['top'], 0.7), flat(name + '_pants', c['pants'], 0.75)
    shoe, hairm, acc = flat(name + '_shoe', c['shoe'], 0.5), flat(name + '_hair', c['hair'], 0.6), flat(name + '_accent', c['accent'], 0.55)
    root = empty('Root', (0, 0, 0))
    torso = empty('Torso', (0, 0, LEG[2] + TORSO[2] / 2), root)
    box('TorsoMesh', TORSO, (0, 0, 0), top, torso, bevel=BV)
    for side, sx in (('Left', 1), ('Right', -1)):
        leg = empty(side + 'Leg', (sx * (LEG[0] / 2 + 0.003), 0, -TORSO[2] / 2), torso)
        box(side + 'LegMesh', (LEG[0], LEG[1], LEG[2] - 0.065), (0, 0, -(LEG[2] - 0.065) / 2), pants, leg, bevel=BV)
        box(side + 'Shoe', (LEG[0] + 0.004, LEG[1] + 0.02, 0.07), (0, -0.008, -LEG[2] + 0.035), shoe, leg, bevel=BV)
        arm = empty(side + 'Arm', (sx * (TORSO[0] / 2 + ARM[0] / 2 + 0.003), 0, TORSO[2] / 2 - 0.04), torso)
        box(side + 'ArmMesh', (ARM[0], ARM[1], ARM[2] - 0.08), (0, 0, 0.04 - (ARM[2] - 0.08) / 2), top, arm, bevel=BV)
        box(side + 'Hand', (ARM[0], ARM[1], 0.085), (0, 0, 0.04 - ARM[2] + 0.0425), skin, arm, bevel=BV)
    head = empty('Head', (0, 0, TORSO[2] / 2 + 0.004), torso)
    box('HeadMesh', HEAD, (0, 0, HEAD[2] / 2), skin, head, bevel=0.014)
    extras(head, torso, hairm, acc, skin)
    bt.export(bt.col, f'char2_{name}.glb')
    for o in bt.col.all_objects:
        o.name = f'{name}2_{o.name}'
        if o.data: o.data.name = f'{name}2_{o.data.name}'

HW, HD, HH = HEAD
def bean(head, torso, hm, acc, skin):
    box('HairTop', (HW + 0.016, HD + 0.016, 0.062), (0, 0.004, HH - 0.018), hm, head, bevel=BV)
    box('HairBack', (HW + 0.016, 0.05, 0.13), (0, HD / 2 - 0.012, HH - 0.085), hm, head, bevel=BV)
    for i, x in enumerate((-0.085, -0.02, 0.05, 0.1)):
        box(f'Fringe{i}', (0.05, 0.03, 0.035 + 0.012 * (i % 2)), (x, -HD / 2 - 0.002, HH - 0.05 - 0.006 * (i % 2)), hm, head, bevel=0.006)
    box('Pocket', (0.17, 0.012, 0.075), (0, -TORSO[1] / 2 - 0.003, -0.07), acc, torso, bevel=0.005)
def dottie(head, torso, hm, acc, skin):
    box('HairTop', (HW + 0.018, HD + 0.018, 0.066), (0, 0.004, HH - 0.02), hm, head, bevel=BV)
    box('HairBack', (HW + 0.018, 0.05, 0.19), (0, HD / 2 - 0.012, HH - 0.11), hm, head, bevel=BV)
    box('Fringe', (HW + 0.004, 0.022, 0.04), (0, -HD / 2 - 0.004, HH - 0.045), hm, head, bevel=0.006)
    for sx in (-1, 1):
        box(f'Pigtail{sx}', (0.075, 0.085, 0.1), (sx * (HW / 2 + 0.05), 0.02, HH - 0.075), hm, head, bevel=BV)
        box(f'Band{sx}', (0.025, 0.05, 0.05), (sx * (HW / 2 + 0.008), 0.02, HH - 0.07), acc, head, bevel=0.005)
    box('Stripe', (TORSO[0] + 0.006, TORSO[1] + 0.006, 0.05), (0, 0, 0.03), acc, torso, bevel=0.004)
def pickle(head, torso, hm, acc, skin):
    for sx in (-1, 1): box(f'SideHair{sx}', (0.03, HD * 0.7, 0.085), (sx * (HW / 2 + 0.006), 0.03, HH - 0.075), hm, head, bevel=0.006)
    box('HairBack', (HW + 0.02, 0.04, 0.11), (0, HD / 2 + 0.002, HH - 0.085), hm, head, bevel=0.006)
    box('Moustache', (0.15, 0.03, 0.026), (0, -HD / 2 - 0.006, 0.064), hm, head, bevel=0.01)
    dark = flat('glasses', '#2B2B33', 0.3)
    for sx in (-1, 1):
        for nm, s, o in (('T', (0.07, 0.012, 0.008), (0, 0.03)), ('B', (0.07, 0.012, 0.008), (0, -0.03)), ('L', (0.008, 0.012, 0.068), (-0.035, 0)), ('R', (0.008, 0.012, 0.068), (0.035, 0))):
            box(f'Glass{sx}{nm}', s, (sx * 0.04 + o[0], -HD / 2 - 0.012, 0.099 + o[1]), dark, head, bevel=0.002)
    box('GlassBridge', (0.012, 0.012, 0.008), (0, -HD / 2 - 0.012, 0.104), dark, head, bevel=0.002)
    box('BowTie', (0.1, 0.02, 0.045), (0, -TORSO[1] / 2 - 0.006, TORSO[2] / 2 - 0.03), acc, torso, bevel=0.008)
    for i in range(3): box(f'Button{i}', (0.022, 0.012, 0.022), (0, -TORSO[1] / 2 - 0.004, 0.04 - i * 0.065), flat('button', '#F6E6B4'), torso, bevel=0.005)

character2('bean',   dict(skin='#F7C59A', top='#FFC93C', pants='#3B5BA9', shoe='#2E3A66', hair='#6B3F22', accent='#FF8A3C'), bean)
character2('dottie', dict(skin='#F2B890', top='#FF7EB6', pants='#7A5CC9', shoe='#4A3586', hair='#3A2452', accent='#6FE3D0'), dottie)
character2('pickle', dict(skin='#EDB48C', top='#5E9B5A', pants='#6B5A48', shoe='#3B2F26', hair='#F1EFEA', accent='#D8343F'), pickle)

# ---------------------------------------------------------------- street set
bt.new_collection('street')
M = {k: pbr(k, k) for k in ('grass', 'pavement', 'brick', 'asphalt', 'planks', 'roof', 'wood')}
white, dark, trim = flat('white', '#F5F1E8', 0.6), flat('dark', '#23232B', 0.5), flat('trim', '#FAF6EC', 0.5)
leafs = [flat(f'leaf{i}', c, 0.8) for i, c in enumerate(('#58A55C', '#4A9150', '#6DBB63'))]

# ground: grass, sidewalk (the action line, z in [-0.9, 0.9]), curb, road
sbox('Grass', (4, -0.05, -12), (90, 0.1, 22.2), M['grass'], bevel=0, tile=2.2)
sbox('GrassFar', (4, -0.05, 14), (90, 0.1, 14), M['grass'], bevel=0, tile=2.2)
sbox('Sidewalk', (4, 0.0, 0), (90, 0.06, 1.8), M['pavement'], bevel=0.01, tile=1.6)
sbox('Curb', (4, -0.01, 1.0), (90, 0.1, 0.2), flat('curb', '#C9C4BA', 0.8), bevel=0.02)
sbox('Road', (4, -0.08, 4.05), (90, 0.1, 5.9), M['asphalt'], bevel=0, tile=3.0)
for i in range(-10, 14): sbox(f'RoadDash{i}', (i * 3.2, -0.028, 4.0), (1.5, 0.01, 0.14), white, bevel=0)

def tree(name, x, z, h=1.7, s=1.0):
    sbox(name + 'Trunk', (x, h / 2, z), (0.34 * s, h, 0.34 * s), M['wood'], bevel=0.03, tile=0.6)
    for i, (w, hh, dy) in enumerate(((1.7, 0.9, 0.3), (1.35, 0.8, 1.05), (0.9, 0.6, 1.7))):
        sbox(f'{name}Leaf{i}', (x + (i % 2) * 0.06, h + dy * s, z), (w * s, hh * s, w * s), leafs[(i + int(x)) % 3], bevel=0.06, rot=(0, 0, 0.3 * i + x))
def bush(name, x, z, w=0.9, h=0.6):
    sbox(name, (x, h / 2, z), (w, h, w * 0.8), leafs[int(abs(x * 3)) % 3], bevel=0.08)
def flower(name, x, z, c):
    sbox(name + 'Stem', (x, 0.11, z), (0.025, 0.22, 0.025), leafs[0], bevel=0.004)
    sbox(name, (x, 0.25, z), (0.09, 0.09, 0.09), flat('flower' + c, c, 0.6), bevel=0.02)

# --- PARK (x -10 … -2.6)
for i, (x, z, h, s) in enumerate(((-8.2, -2.6, 1.8, 1.1), (-4.0, -3.4, 1.6, 1.0), (-10.5, -5.5, 2.0, 1.3), (-6.3, -6.5, 1.9, 1.2), (-12.5, -3.0, 1.7, 1.0))): tree(f'Tree{i}', x, z, h, s)
for i, (x, z) in enumerate(((-7.3, -1.7), (-5.0, -1.9), (-9.3, -1.5), (-3.2, -2.3), (-11.0, -1.9))): bush(f'Bush{i}', x, z, 0.8 + 0.2 * (i % 2), 0.5 + 0.12 * (i % 3))
for i in range(14): flower(f'Flower{i}', -10 + i * 0.55 + random.random() * 0.2, -1.15 - random.random() * 0.5, ('#FF6B8B', '#FFD23F', '#FFFFFF', '#B28DFF')[i % 4])
bx, bz = -6.3, -1.25                                             # bench
sbox('BenchSeat', (bx, 0.42, bz), (1.5, 0.07, 0.42), M['planks'], bevel=0.015, tile=0.7)
sbox('BenchBack', (bx, 0.75, bz - 0.2), (1.5, 0.34, 0.06), M['planks'], bevel=0.015, tile=0.7, rot=(-0.12, 0, 0))
for sx in (-1, 1): sbox(f'BenchLeg{sx}', (bx + sx * 0.62, 0.21, bz), (0.07, 0.42, 0.4), dark, bevel=0.012)
lx, lz = -3.4, -1.2                                              # lamp post
sbox('LampPost', (lx, 1.25, lz), (0.1, 2.5, 0.1), dark, bevel=0.015)
sbox('LampHead', (lx, 2.6, lz), (0.32, 0.3, 0.32), flat('lampglass', '#FFF3C8', 0.3, emit=1.2), bevel=0.03)
sbox('LampCap', (lx, 2.79, lz), (0.4, 0.08, 0.4), dark, bevel=0.02)
sbox('TrashCan', (-8.6, 0.33, -1.2), (0.42, 0.66, 0.42), flat('bin', '#3E7CB1', 0.5), bevel=0.03)

# --- HOUSE (x -2.2 … 4.2): Mr. Pickle's front door
hz, hx0, hx1, hh, dx, dw, dh = -2.6, -2.2, 4.2, 3.3, 1.0, 1.0, 2.05
sbox('HouseWallL', ((hx0 + dx - dw / 2) / 2, hh / 2, hz - 0.15), (dx - dw / 2 - hx0, hh, 0.3), M['brick'], bevel=0, tile=1.3)
sbox('HouseWallR', ((hx1 + dx + dw / 2) / 2, hh / 2, hz - 0.15), (hx1 - dx - dw / 2, hh, 0.3), M['brick'], bevel=0, tile=1.3)
sbox('HouseWallTop', (dx, (hh + dh) / 2, hz - 0.15), (dw, hh - dh, 0.3), M['brick'], bevel=0, tile=1.3)
sbox('HouseSideL', (hx0 + 0.15, hh / 2, hz - 2.2), (0.3, hh, 4.4), M['brick'], bevel=0, tile=1.3)
sbox('HouseSideR', (hx1 - 0.15, hh / 2, hz - 2.2), (0.3, hh, 4.4), M['brick'], bevel=0, tile=1.3)
sbox('HouseRoof', ((hx0 + hx1) / 2, hh + 0.2, hz - 1.9), (hx1 - hx0 + 0.7, 0.4, 5.2), M['roof'], bevel=0.04, tile=1.2)
sbox('HouseRoof2', ((hx0 + hx1) / 2, hh + 0.75, hz - 2.2), (hx1 - hx0 - 0.6, 0.75, 3.6), M['roof'], bevel=0.04, tile=1.2)
sbox('Chimney', (3.2, hh + 1.2, hz - 2.4), (0.55, 1.3, 0.55), M['brick'], bevel=0.02, tile=1.3)
sbox('HouseInterior', (dx, 1.2, hz - 1.6), (3.0, 2.6, 2.4), flat('interior', '#5A3F33', 0.9), bevel=0)        # warm dark hallway seen through the door
sbox('HallRug', (dx, 0.02, hz - 0.9), (0.9, 0.03, 1.2), flat('hallrug', '#B5523B', 0.9), bevel=0.01)
for nm, c, s in (('T', (dx, dh + 0.06, hz + 0.02), (dw + 0.24, 0.12, 0.1)), ('L', (dx - dw / 2 - 0.06, dh / 2, hz + 0.02), (0.12, dh, 0.1)), ('R', (dx + dw / 2 + 0.06, dh / 2, hz + 0.02), (0.12, dh, 0.1))):
    sbox('HDoorFrame' + nm, c, s, trim, bevel=0.012)
piv = empty('HouseDoorPivot', P(dx - dw / 2, 0, hz - 0.02))
sbox('HouseDoor', (dw / 2, dh / 2, 0), (dw, dh, 0.06), flat('housedoor', '#D8343F', 0.45), piv, bevel=0.012)
for i, (px, py) in enumerate(((0.28, 1.5), (0.72, 1.5), (0.28, 0.6), (0.72, 0.6))): sbox(f'HDoorPanel{i}', (px, py, 0.035), (0.3, 0.6, 0.02), flat('housedoor2', '#C22B36', 0.45), piv, bevel=0.008)
sbox('HDoorKnob', (dw - 0.12, 1.02, 0.06), (0.07, 0.07, 0.07), flat('brass', '#D9B04C', 0.3, 1.0), piv, bevel=0.02)
sbox('Doormat', (dx, 0.045, hz + 0.45), (0.9, 0.03, 0.55), flat('doormat', '#8A6B4A', 0.95), bevel=0.008)
sbox('PorchStep', (dx, 0.03, hz + 0.5), (1.8, 0.07, 1.0), flat('porch', '#D9D2C4', 0.8), bevel=0.015)
for i, wx in enumerate((-0.95, 2.95)):                          # windows + shutters + flower boxes
    sbox(f'HWinGlass{i}', (wx, 1.55, hz + 0.01), (0.9, 1.0, 0.04), flat('winglass', '#9FD3F2', 0.15, emit=0.25), bevel=0)
    for nm, c, s in (('T', (wx, 2.08, hz + 0.03), (1.06, 0.08, 0.08)), ('B', (wx, 1.02, hz + 0.05), (1.14, 0.08, 0.14)), ('V', (wx, 1.55, hz + 0.035), (0.05, 1.0, 0.05)), ('H', (wx, 1.55, hz + 0.035), (0.9, 0.05, 0.05))):
        sbox(f'HWin{i}{nm}', c, s, trim, bevel=0.01)
    for sx in (-1, 1): sbox(f'Shutter{i}{sx}', (wx + sx * 0.64, 1.55, hz + 0.03), (0.3, 1.06, 0.05), flat('shutter', '#3E8E7E', 0.6), bevel=0.012)
    sbox(f'FlowerBox{i}', (wx, 0.9, hz + 0.14), (1.0, 0.16, 0.2), M['planks'], bevel=0.015, tile=0.6)
    for k in range(5): sbox(f'BoxFlower{i}{k}', (wx - 0.4 + k * 0.2, 1.03, hz + 0.14), (0.1, 0.1, 0.1), flat('flower' + ('#FF6B8B', '#FFD23F')[k % 2], ('#FF6B8B', '#FFD23F')[k % 2]), bevel=0.02)
mx, mz = 2.35, -1.25                                             # mailbox (label added by the engine at MailboxFace)
sbox('MailPost', (mx, 0.45, mz), (0.08, 0.9, 0.08), M['wood'], bevel=0.01, tile=0.5)
sbox('MailBox', (mx, 1.0, mz), (0.44, 0.26, 0.26), flat('mailbox', '#3E7CB1', 0.45), bevel=0.03)
sbox('MailFlag', (mx + 0.24, 1.08, mz), (0.03, 0.18, 0.08), flat('mailflag', '#D8343F', 0.5), bevel=0.006)
empty('MailboxFace', P(mx, 1.0, mz + 0.132))
for i in range(22):                                              # picket fence (gap in front of the door)
    x = hx0 + 0.1 + i * 0.29
    if dx - 1.0 < x < dx + 1.0: continue
    sbox(f'Picket{i}', (x, 0.36, -1.12), (0.16, 0.72, 0.045), white, bevel=0.012)
for a, b in ((hx0, dx - 1.0), (dx + 1.0, hx1)): sbox(f'FenceRail{a}', ((a + b) / 2, 0.42, -1.15), (b - a, 0.07, 0.03), white, bevel=0.008)
for i, (x, z) in enumerate(((-1.6, -1.8), (3.6, -1.8), (-0.4, -2.2))): bush(f'HBush{i}', x, z, 0.7, 0.5)
tree('HTree', 5.0, -4.2, 1.9, 1.2)

# --- CANDY SHOP (x 5.6 … 11.2)
sz, sx0, sx1, sh, ddx, ddw, ddh = -2.5, 5.6, 11.2, 3.4, 9.0, 1.1, 2.1
pink, cream = flat('shoppink', '#FF9EC4', 0.6), flat('shopcream', '#FFF4E0', 0.6)
wl, wr, wy0, wy1 = 6.0, 8.0, 0.7, 2.1                           # shop window opening
def wall(name, x0, x1, y0, y1, mat=pink): sbox(name, ((x0 + x1) / 2, (y0 + y1) / 2, sz - 0.15), (x1 - x0, y1 - y0, 0.3), mat, bevel=0)
wall('ShopWallA', sx0, wl, 0, sh); wall('ShopWallB', wl, wr, 0, wy0, cream); wall('ShopWallC', wl, wr, wy1, sh); wall('ShopWallD', wr, ddx - ddw / 2, 0, sh)
wall('ShopWallE', ddx - ddw / 2, ddx + ddw / 2, ddh, sh); wall('ShopWallF', ddx + ddw / 2, sx1, 0, sh)
sbox('ShopSideL', (sx0 + 0.15, sh / 2, sz - 2.0), (0.3, sh, 4.0), pink, bevel=0); sbox('ShopSideR', (sx1 - 0.15, sh / 2, sz - 2.0), (0.3, sh, 4.0), pink, bevel=0)
sbox('ShopBackWall', ((sx0 + sx1) / 2, sh / 2, sz - 3.9), (sx1 - sx0, sh, 0.2), flat('shopinner', '#FFE3B8', 0.8), bevel=0)
sbox('ShopFloor', ((sx0 + sx1) / 2, 0.01, sz - 2.0), (sx1 - sx0, 0.04, 4.0), M['planks'], bevel=0, tile=1.0)
sbox('ShopCeil', ((sx0 + sx1) / 2, sh + 0.1, sz - 2.0), (sx1 - sx0 + 0.4, 0.3, 4.6), cream, bevel=0.03)
sbox('ShopLight', (8.2, sh - 0.12, sz - 1.6), (3.5, 0.08, 0.5), flat('shoplight', '#FFF0D0', 0.4, emit=5.0), bevel=0.02)
sbox('ShopGlass', ((wl + wr) / 2, (wy0 + wy1) / 2, sz - 0.05), (wr - wl, wy1 - wy0, 0.02), flat('shopglass', '#CFEFFF', 0.05), bevel=0)
for nm, c, s in (('T', ((wl + wr) / 2, wy1 + 0.04, sz + 0.03), (wr - wl + 0.2, 0.1, 0.1)), ('B', ((wl + wr) / 2, wy0 - 0.04, sz + 0.06), (wr - wl + 0.3, 0.1, 0.18)), ('L', (wl - 0.05, 1.4, sz + 0.03), (0.1, 1.5, 0.1)), ('R', (wr + 0.05, 1.4, sz + 0.03), (0.1, 1.5, 0.1)),
                  ('DT', (ddx, ddh + 0.06, sz + 0.03), (ddw + 0.24, 0.12, 0.1)), ('DL', (ddx - ddw / 2 - 0.06, ddh / 2, sz + 0.03), (0.12, ddh, 0.1)), ('DR', (ddx + ddw / 2 + 0.06, ddh / 2, sz + 0.03), (0.12, ddh, 0.1))):
    sbox('ShopFrame' + nm, c, s, trim, bevel=0.012)
candy = ['#FF4D6D', '#FFD23F', '#4CC9F0', '#80ED99', '#B28DFF', '#FF9F1C', '#FF70A6', '#FFFFFF']
cm = [flat('candy' + c, c, 0.3) for c in candy]
def jar(name, x, y, z, r=0.13, h=0.3):
    cyl(name + 'Lid', r * 0.8, 0.05, P(x, y + h + 0.025, z), flat('jarlid', '#D8343F', 0.4), bevel=0.01, segs=20)
    for k in range(9): ball(f'{name}B{k}', 0.05, P(x + (random.random() - 0.5) * r * 1.2, y + 0.05 + (k // 3) * 0.09, z + (random.random() - 0.5) * r * 1.2), random.choice(cm))
sbox('WindowShelf', ((wl + wr) / 2, wy0 + 0.03, sz - 0.4), (wr - wl, 0.06, 0.5), M['planks'], bevel=0.01, tile=0.6)
for i in range(6): jar(f'WJar{i}', wl + 0.2 + i * 0.32, wy0 + 0.06, sz - 0.35)
sbox('WindowShelf2', ((wl + wr) / 2, 1.5, sz - 0.6), (wr - wl, 0.05, 0.3), M['planks'], bevel=0.01, tile=0.6)
for i in range(5): jar(f'WJarU{i}', wl + 0.3 + i * 0.36, 1.525, sz - 0.6, 0.11, 0.24)
for row in range(3):                                             # shelves on the back wall, visible through the door
    sbox(f'BackShelf{row}', (8.6, 0.8 + row * 0.6, sz - 3.6), (4.6, 0.05, 0.36), M['planks'], bevel=0.01, tile=0.6)
    for i in range(11): jar(f'BJar{row}_{i}', 6.5 + i * 0.42, 0.825 + row * 0.6, sz - 3.6, 0.12, 0.26)
sbox('Counter', (7.3, 0.5, sz - 2.3), (2.6, 1.0, 0.7), cream, bevel=0.03); sbox('CounterTop', (7.3, 1.03, sz - 2.3), (2.75, 0.07, 0.82), pink, bevel=0.02)
for i in range(14):                                              # striped awning
    sbox(f'Awning{i}', (sx0 + 0.2 + i * 0.4, 2.62, sz + 0.55), (0.4, 0.07, 1.3), (pink if i % 2 else white), bevel=0.006, rot=(0.28, 0, 0))
    sbox(f'AwningLip{i}', (sx0 + 0.2 + i * 0.4, 2.36, sz + 1.17), (0.4, 0.2, 0.05), (white if i % 2 else pink), bevel=0.01)
sbox('ShopSign', ((sx0 + sx1) / 2, 3.25, sz + 0.12), (4.6, 0.8, 0.12), flat('signboard', '#7A3FA0', 0.5), bevel=0.04)
sbox('ShopSignTrim', ((sx0 + sx1) / 2, 3.25, sz + 0.09), (4.8, 1.0, 0.1), flat('signtrim', '#FFD23F', 0.4), bevel=0.05)
empty('ShopSignFace', P((sx0 + sx1) / 2, 3.25, sz + 0.185))
def lollipop(name, x, z, h=1.5, r=0.32, c1=0, c2=7):
    sbox(name + 'Stick', (x, h / 2, z), (0.06, h, 0.06), white, bevel=0.012)
    cyl(name + 'Disc', r, 0.1, P(x, h + r * 0.8, z), cm[c1], rot=(math.pi / 2, 0, 0), bevel=0.03, segs=28)
    cyl(name + 'Swirl', r * 0.62, 0.115, P(x, h + r * 0.8, z), cm[c2], rot=(math.pi / 2, 0, 0), bevel=0.03, segs=28)
    cyl(name + 'Dot', r * 0.28, 0.13, P(x, h + r * 0.8, z), cm[c1], rot=(math.pi / 2, 0, 0), bevel=0.03, segs=20)
lollipop('ShopLolliA', 5.9, -1.55, 1.5, 0.34, 0, 7); lollipop('ShopLolliB', 10.9, -1.6, 1.25, 0.28, 2, 7)
gx, gz = 10.1, -1.75                                             # gumball machine
sbox('GumBase', (gx, 0.3, gz), (0.36, 0.6, 0.36), flat('gumred', '#D8343F', 0.4), bevel=0.03)
sbox('GumNeck', (gx, 0.66, gz), (0.26, 0.12, 0.26), flat('gumred', '#D8343F', 0.4), bevel=0.02)
ball('GumGlobe', 0.26, P(gx, 0.95, gz), flat('gumglobe', '#EAF7FF', 0.08))
for k in range(16):
    a, b2 = random.random() * 6.28, random.random() * 1.2 - 0.9
    ball(f'Gum{k}', 0.05, P(gx + 0.215 * math.cos(a) * math.cos(b2), 0.95 + 0.215 * math.sin(b2), gz + 0.215 * math.sin(a) * math.cos(b2)), random.choice(cm))
sbox('GumCap', (gx, 1.22, gz), (0.2, 0.07, 0.2), flat('gumred', '#D8343F', 0.4), bevel=0.02)
sbox('ShopMat', (ddx, 0.04, sz + 0.5), (1.0, 0.03, 0.6), flat('shopmat', '#7A3FA0', 0.9), bevel=0.008)
tree('STree', 12.4, -3.2, 1.8, 1.1); bush('SBush0', 11.8, -1.7, 0.7, 0.5)

# --- distance: a row of little houses + hills so the street has depth
for i in range(9):
    x = -16 + i * 4.6; c = ('#F6BD60', '#84A59D', '#F28482', '#B8C0FF', '#F7EDE2')[i % 5]; w, h2 = 3.0 + (i % 3) * 0.5, 2.6 + (i % 2) * 0.8
    sbox(f'FarHouse{i}', (x, h2 / 2, -14.5 - (i % 2)), (w, h2, 3), flat('far' + c, c, 0.8), bevel=0.04)
    sbox(f'FarRoof{i}', (x, h2 + 0.3, -14.5 - (i % 2)), (w + 0.5, 0.6, 3.4), flat('farroof', '#B5523B', 0.8), bevel=0.05)
    tree(f'FarTree{i}', x + 2.3, -11 - (i % 3), 2.0, 1.3)
for i, (x, z, r) in enumerate(((-14, -30, 9), (2, -34, 12), (18, -30, 10), (32, -26, 8))): ball(f'Hill{i}', r, P(x, -r * 0.45, z), leafs[i % 3], scale=(1.6, 1, 0.6))
for i in range(6): tree(f'RoadTree{i}', -12 + i * 6.5, 8.5 + (i % 2), 1.9, 1.2)                                   # across the road (reverse angles)

# --- CANDY FANTASY (x = 30): pink limbo with a mountain of candy
fx = 30
fpink = flat('fantasy', '#FF9BC8', 0.7)
sbox('FanFloor', (fx, -0.05, -1), (16, 0.1, 14), fpink, bevel=0)
sbox('FanBack', (fx, 4, -7), (16, 9, 0.2), flat('fantasy2', '#FF7FB8', 0.8), bevel=0)
for sx in (-1, 1): sbox(f'FanSide{sx}', (fx + sx * 8, 4, -1), (0.2, 9, 14), flat('fantasy2', '#FF7FB8', 0.8), bevel=0)
ball('CandyHill', 1.5, P(fx, -0.35, -2.1), flat('candyhill', '#FFD6E8', 0.6), scale=(1.5, 1.2, 1.25))
for k in range(150):
    a, r = random.random() * 6.28, random.random() ** 0.6 * 2.1; hgt = max(0, 1.45 * (1 - (r / 2.2) ** 1.4))
    ball(f'HillCandy{k}', 0.09 + random.random() * 0.06, P(fx + r * math.cos(a) * 1.05, hgt + 0.06, -2.1 + r * math.sin(a) * 0.85), random.choice(cm))
for i, (dxx, dz2, h3, r3) in enumerate(((-2.2, -2.6, 2.3, 0.5), (2.3, -2.9, 2.0, 0.45), (-1.3, -3.9, 3.0, 0.6), (1.4, -4.2, 2.7, 0.55), (-3.2, -1.2, 1.4, 0.36), (3.3, -1.4, 1.5, 0.38))):
    lollipop(f'FanLolli{i}', fx + dxx, dz2, h3, r3, i % 7, 7)
for i in range(18):                                              # candy rain: animated by the episode (FanRain0…17)
    ball(f'FanRain{i}', 0.085, P(fx - 1.4 + (i % 6) * 0.56 + random.random() * 0.2, 3.2, 0.2 + (i // 6) * 0.35), cm[i % 8])
for i in range(8):                                               # wrapped candies on the floor
    c = cm[i % 7]; x, z = fx - 2.6 + i * 0.75, 0.9 + (i % 3) * 0.25
    sbox(f'Wrap{i}', (x, 0.07, z), (0.2, 0.13, 0.13), c, bevel=0.04, rot=(0, 0, i))
    for sx in (-1, 1): sbox(f'WrapEnd{i}{sx}', (x + sx * 0.14 * math.cos(i), 0.07, z - sx * 0.14 * math.sin(i)), (0.07, 0.1, 0.1), white, bevel=0.02, rot=(0, 0, i))

# --- hand props (parked under the ground; the engine clones them into hands / onto the sidewalk)
w = empty('Wallet', P(0, -5, 0))
box('WalletBody', (0.17, 0.04, 0.11), (0, 0, 0), flat('wallet', '#8B5A2B', 0.6), w, bevel=0.012)
box('WalletFlap', (0.17, 0.045, 0.05), (0, 0.0, 0.03), flat('wallet2', '#74481F', 0.6), w, bevel=0.012)
for i in range(3): box(f'Bill{i}', (0.13, 0.008, 0.07), (0.012 * i - 0.01, 0.004 * i - 0.004, 0.06), flat('bill', '#7FD18A', 0.7), w, bevel=0.003, rot=(0, 0.08 * (i - 1), 0))
box('WalletClasp', (0.03, 0.05, 0.03), (0, 0, 0.0), flat('brass', '#D9B04C', 0.3, 1.0), w, bevel=0.006)
pk = empty('PickleProp', P(0.5, -5, 0))
ball('PickleBody', 0.05, (0, 0, 0), flat('pickle', '#6FA83A', 0.45), pk, scale=(1, 1, 2.3), jitter=0.006)
for i in range(7): ball(f'PickleBump{i}', 0.012, (0.045 * math.cos(i * 2.1), 0.045 * math.sin(i * 2.1), -0.08 + i * 0.027), flat('pickle2', '#5A8F2E', 0.5), pk)

bt.export(bt.col, 'street.glb')
