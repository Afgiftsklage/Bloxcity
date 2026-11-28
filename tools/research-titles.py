# Title research: scrape public YouTube search results (Shorts filter) -> titles + view counts.
# usage: python3 -I tools/research-titles.py research/queries.txt out.json   (one search per line; ~1 s per query; no login needed)
import json, re, sys, subprocess, urllib.parse, time
OUT = sys.argv[1]
queries = [l.strip() for l in open(sys.argv[2]) if l.strip()]
SHORTS = 'EgIYAQ%3D%3D'   # sp filter: type=shorts (fallback: plain search)
def views(t):
    if not t: return None
    t = t.replace(',', '').lower(); m = re.match(r'([\d.]+)\s*([km]?)', t)
    if not m: return 0 if 'no' in t else None
    v = float(m.group(1)); return int(v * {'': 1, 'k': 1e3, 'm': 1e6}[m.group(2)])
def walk(o, out):
    if isinstance(o, dict):
        if 'shortsLockupViewModel' in o:
            v = o['shortsLockupViewModel']; om = v.get('overlayMetadata', {})
            vid = v.get('onTap', {}).get('innertubeCommand', {}).get('reelWatchEndpoint', {}).get('videoId')
            out.append({'id': vid, 'title': om.get('primaryText', {}).get('content'), 'views': views(om.get('secondaryText', {}).get('content')), 'kind': 'short'})
        if 'videoRenderer' in o:
            v = o['videoRenderer']
            out.append({'id': v['videoId'], 'title': ''.join(r.get('text', '') for r in v['title']['runs']), 'views': views(v.get('viewCountText', {}).get('simpleText')),
                        'channel': v.get('ownerText', {}).get('runs', [{}])[0].get('text'), 'len': v.get('lengthText', {}).get('simpleText'), 'kind': 'video'})
        for x in o.values(): walk(x, out)
    elif isinstance(o, list):
        for x in o: walk(x, out)
rows = {}
for q in queries:
    url = 'https://www.youtube.com/results?search_query=' + urllib.parse.quote(q) + '&sp=' + SHORTS
    html = subprocess.run(['curl', '-s', '-A', 'Mozilla/5.0', '-H', 'Accept-Language: en', url], capture_output=True, text=True).stdout
    m = re.search(r'var ytInitialData = (\{.*?\});</script>', html)
    if not m: print('no data', q); continue
    out = []; walk(json.loads(m.group(1)), out)
    for r in out:
        if r['id'] and r['title']: r.setdefault('queries', []); rows.setdefault(r['id'], {**r, 'queries': []})['queries'].append(q)
    print(f'{len(out):3d} {q}'); time.sleep(0.4)
json.dump(list(rows.values()), open(OUT, 'w'))
print('unique', len(rows))
