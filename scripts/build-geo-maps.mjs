/**
 * build-geo-maps.mjs — one-time geometry build for the Geo Restriction maps.
 *
 * Produces precomputed, code-keyed SVG paths so the map components can render
 * reliable, identifiable geography WITHOUT any mapping library. Availability
 * (enabled/disabled) is NOT baked in here — it comes from the backend at runtime.
 *
 * Sources (public, permissively licensed):
 *   - World:  Natural Earth 1:110m Admin-0 countries (public domain)
 *             https://github.com/nvkelso/natural-earth-vector
 *             geojson/ne_110m_admin_0_countries.geojson
 *             identifier: properties.ISO_A2 (fallback ISO_A2_EH for the 5 "-99"
 *             cases: fixes NO, FR, XK; drops Northern Cyprus & Somaliland).
 *   - US:     PublicaMundi us-states.json (name + FIPS)
 *             https://github.com/PublicaMundi/MappingAPI
 *             identifier: properties.name -> USPS code (table below).
 *
 * Projection: simple equirectangular (linear lon/lat), no dependencies.
 * The US uses Alaska + Hawaii insets so the map reads like a standard US map.
 *
 * Output: public/maps/world.paths.json, public/maps/us.paths.json
 *   { viewBox: "0 0 W H", regions: [{ code, name, d }] }
 *
 * Run: node scripts/build-geo-maps.mjs  (expects the two source files in /tmp;
 * see the curl commands in the Phase 4B report for provenance).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'maps');

const round = (n) => Math.round(n * 10) / 10;

// Canonical U.S. state/territory name -> USPS code.
const US_NAME_TO_CODE = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL',
  Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA',
  Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI',
  Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT',
  Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR',
  Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY', 'Puerto Rico': 'PR',
};

// ---- geometry helpers -------------------------------------------------------
function outerRings(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  // Keep each polygon's outer ring (index 0); drop holes/lakes.
  return polys.map((p) => p[0]).filter(Boolean);
}
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2); // in deg^2
}
function allPoints(rings) {
  const pts = [];
  for (const r of rings) for (const p of r) pts.push(p);
  return pts;
}
function ringsToPath(rings, project) {
  let d = '';
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = project(ring[i][0], ring[i][1]);
      d += (i === 0 ? 'M' : 'L') + round(x) + ' ' + round(y);
    }
    d += 'Z';
  }
  return d;
}
// Fit a set of lon/lat points into a target box, preserving aspect (y flipped).
function makeFitter(points, box) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lo, la] of points) {
    if (lo < minLon) minLon = lo; if (lo > maxLon) maxLon = lo;
    if (la < minLat) minLat = la; if (la > maxLat) maxLat = la;
  }
  const bw = maxLon - minLon, bh = maxLat - minLat;
  const tw = box.x1 - box.x0, th = box.y1 - box.y0;
  const s = Math.min(tw / bw, th / bh);
  const offx = box.x0 + (tw - bw * s) / 2;
  const offy = box.y0 + (th - bh * s) / 2;
  return (lon, lat) => [offx + (lon - minLon) * s, offy + (maxLat - lat) * s];
}

// ---- WORLD ------------------------------------------------------------------
function buildWorld() {
  const W = 1000, H = 500;
  const g = JSON.parse(fs.readFileSync('/tmp/ne.json', 'utf8'));
  const project = (lon, lat) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
  const regions = [];
  for (const f of g.features) {
    let code = f.properties.ISO_A2;
    if (!code || code === '-99') code = f.properties.ISO_A2_EH;
    if (!code || code === '-99') continue; // no usable ISO code -> skip
    let rings = outerRings(f.geometry);
    const largest = Math.max(...rings.map(ringArea));
    rings = rings.filter((r) => ringArea(r) >= 1.5 || ringArea(r) === largest);
    const d = ringsToPath(rings, project);
    if (d) regions.push({ code, name: f.properties.ADMIN, d });
  }
  return { viewBox: `0 0 ${W} ${H}`, regions };
}

// ---- US (continental + AK/HI insets) ---------------------------------------
function buildUs() {
  const W = 1000, H = 560;
  const g = JSON.parse(fs.readFileSync('/tmp/us.geojson', 'utf8'));
  const feats = g.features
    .map((f) => ({ code: US_NAME_TO_CODE[f.properties.name], name: f.properties.name, geom: f.geometry }))
    .filter((f) => f.code && f.code !== 'PR'); // PR excluded from the US picker

  const ringsByCode = {};
  for (const f of feats) ringsByCode[f.code] = outerRings(f.geom);

  const isInset = (c) => c === 'AK' || c === 'HI';
  // Continental fit (everything except AK/HI).
  const contPts = [];
  for (const f of feats) if (!isInset(f.code)) contPts.push(...allPoints(ringsByCode[f.code]));
  const contFit = makeFitter(contPts, { x0: 150, x1: 980, y0: 30, y1: 470 });

  // Alaska: drop the Aleutian tail that crosses the antimeridian (lon > 0).
  const akRings = ringsByCode['AK'].map((r) => r.filter(([lo]) => lo < 0)).filter((r) => r.length > 2);
  const akFit = makeFitter(allPoints(akRings), { x0: 20, x1: 250, y0: 380, y1: 545 });
  const hiFit = makeFitter(allPoints(ringsByCode['HI']), { x0: 270, x1: 380, y0: 470, y1: 545 });

  const regions = [];
  for (const f of feats) {
    let project, rings;
    if (f.code === 'AK') { project = akFit; rings = akRings; }
    else if (f.code === 'HI') { project = hiFit; rings = ringsByCode['HI']; }
    else { project = contFit; rings = ringsByCode[f.code]; }
    const largest = Math.max(...rings.map(ringArea));
    rings = rings.filter((r) => ringArea(r) >= 0.02 || ringArea(r) === largest);
    const d = ringsToPath(rings, project);
    if (d) regions.push({ code: f.code, name: f.name, d });
  }
  return { viewBox: `0 0 ${W} ${H}`, regions };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const world = buildWorld();
const us = buildUs();
fs.writeFileSync(path.join(OUT_DIR, 'world.paths.json'), JSON.stringify(world));
fs.writeFileSync(path.join(OUT_DIR, 'us.paths.json'), JSON.stringify(us));
console.log('world regions:', world.regions.length, '| codes:', world.regions.map((r) => r.code).slice(0, 12).join(','));
console.log('us regions:', us.regions.length, '| codes:', us.regions.map((r) => r.code).join(','));
console.log('sizes:',
  (fs.statSync(path.join(OUT_DIR, 'world.paths.json')).size / 1024).toFixed(0) + 'KB world,',
  (fs.statSync(path.join(OUT_DIR, 'us.paths.json')).size / 1024).toFixed(0) + 'KB us');
