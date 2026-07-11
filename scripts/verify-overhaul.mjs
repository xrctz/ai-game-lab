#!/usr/bin/env node
/**
 * Gating verification for AI Game Lab full overhaul.
 * Drives real shipped helpers (player-urls.js) and local HTTP routes.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCRATCH = process.env.AIGL_SCRATCH || '/tmp/grok-goal-00e218ae94f9/implementer';
const PORT = Number(process.env.AIGL_PORT || 8765);
const HOST = '127.0.0.1';
const PREFIX = '/ai-game-lab';

fs.mkdirSync(SCRATCH, { recursive: true });

const require = createRequire(import.meta.url);
const urls = require(path.join(ROOT, 'player-urls.js'));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function write(name, body) {
  const p = path.join(SCRATCH, name);
  fs.writeFileSync(p, body);
  return p;
}

// --- Pure unit tests of shipped player-urls.js ---
function testPlayerUrls() {
  const lines = [];
  const z = urls.getEmbedUrl('zombie', { quality: 'high', debug: true });
  assert(z === '/ai-game-lab/games/zombie/index.html?quality=high&embed=1&debug=1', 'zombie embed url: ' + z);
  lines.push('PASS zombie embed: ' + z);

  const d = urls.getEmbedUrl('deadzone');
  assert(d === '/ai-game-lab/games/deadzone/index.html?embed=1', 'deadzone embed: ' + d);
  lines.push('PASS deadzone embed: ' + d);

  const v = urls.getEmbedUrl('voxel');
  assert(v === '/ai-game-lab/games/voxel/index.html?embed=1', 'voxel embed: ' + v);
  lines.push('PASS voxel embed: ' + v);

  const s = urls.getStandaloneUrl('zombie', { quality: 'low' });
  assert(s === '/ai-game-lab/games/zombie/index.html?quality=low', 'zombie standalone: ' + s);
  lines.push('PASS zombie standalone: ' + s);

  assert(urls.normalizeQuality('nope') === 'balanced', 'normalizeQuality fallback');
  assert(urls.isPlayableGame('zombie') && !urls.isPlayableGame('nope'), 'isPlayableGame');
  lines.push('PASS normalizeQuality + isPlayableGame');
  lines.push('PASS getGameName zombie=' + urls.getGameName('zombie'));

  write('player-urls-tests.txt', lines.join('\n') + '\n');
  return lines;
}

// --- Static HTTP with Pages base path ---
function makeServer() {
  return http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/' || urlPath === '') {
      res.writeHead(302, { Location: PREFIX + '/' });
      res.end();
      return;
    }
    if (urlPath === PREFIX || urlPath.startsWith(PREFIX + '/')) {
      urlPath = urlPath.slice(PREFIX.length) || '/';
    } else {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, ''));
    if (urlPath.endsWith('/')) filePath = path.join(ROOT, urlPath.replace(/^\//, ''), 'index.html');
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('missing ' + urlPath);
        return;
      }
      const ext = path.extname(filePath);
      const types = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg'
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
}

function get(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: HOST, port: PORT, path: pathname }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8'), headers: res.headers });
      });
    });
    req.on('error', reject);
  });
}

async function testHubRoutes() {
  const routes = [
    PREFIX + '/',
    PREFIX + '/play/',
    PREFIX + '/showcase/',
    PREFIX + '/story/',
    PREFIX + '/showcase/updates/',
    PREFIX + '/404.html',
    PREFIX + '/mindcraft-info.html'
  ];
  const lines = [];
  for (const r of routes) {
    const res = await get(r);
    assert(res.status === 200, r + ' status ' + res.status);
    assert(res.body.includes('siteNav') || res.body.includes('Site navigation') || res.body.includes('error-card'), r + ' missing nav/shell');
    assert(res.body.includes('20-overhaul') || res.body.includes('v20-overhaul') || r.includes('404'), r + ' missing build id');
    // 404 page may not load script with build if only css - it has 20-overhaul
    lines.push(`${res.status} ${r} len=${res.body.length} build=${/20-overhaul/.test(res.body)}`);
  }
  // play page player chrome IDs
  const play = await get(PREFIX + '/play/?game=zombie');
  assert(play.status === 200, 'play page');
  for (const id of ['playerScreen', 'playerName', 'playerEmpty', 'playerLoader', 'liveDot', 'btnRefresh', 'btnClose', 'btnFullscreen']) {
    assert(play.body.includes('id="' + id + '"') || play.body.includes("id='" + id + "'") || play.body.includes('id=' + id), 'missing id ' + id);
  }
  assert(play.body.includes('data-play="zombie"'), 'missing data-play zombie');
  assert(play.body.includes('player-urls.js'), 'play must load player-urls.js');
  lines.push('PASS player chrome IDs on play page');
  write('hub-routes.txt', lines.join('\n') + '\n');
  return lines;
}

async function testGameEntries() {
  const games = [
    { path: PREFIX + '/games/zombie/index.html', scripts: ['hub-embed-bridge.js', 'gameplus-mode.js', 'assets/index-labplus-v9.js'] },
    { path: PREFIX + '/games/deadzone/index.html', scripts: ['js/hub-bridge.js', 'css/style.css', 'js/game-bundle.js'] },
    { path: PREFIX + '/games/voxel/index.html', scripts: ['craftverse-lab.js', 'craftverse-lab.css', 'assets/index-BpRqJl-U.js'] }
  ];
  const lines = [];
  for (const g of games) {
    const res = await get(g.path);
    assert(res.status === 200, g.path + ' ' + res.status);
    lines.push(`${res.status} ${g.path}`);
    for (const s of g.scripts) {
      assert(res.body.includes(s), g.path + ' missing ref ' + s);
      // resolve relative URL from game dir
      const baseDir = g.path.replace(/index\.html$/, '');
      const assetPath = baseDir + s.replace(/^\.\//, '');
      // strip query
      const clean = assetPath.split('?')[0];
      const ar = await get(clean);
      assert(ar.status === 200, 'asset 200 ' + clean + ' got ' + ar.status);
      lines.push(`  asset 200 ${clean}`);
    }
  }
  write('game-entries.txt', lines.join('\n') + '\n');
  return lines;
}

async function testPlayerBoot() {
  const lines = [];
  const playZ = await get(PREFIX + '/play/?game=zombie');
  const playD = await get(PREFIX + '/play/?game=deadzone');
  assert(playZ.status === 200 && playD.status === 200, 'play loads');
  // script.js must reference embed builder
  const script = await get(PREFIX + '/script.js?v=20-overhaul');
  assert(script.status === 200, 'script.js');
  assert(script.body.includes('AIGL_PlayerUrls') || script.body.includes('getEmbedUrl'), 'script uses player urls');
  const embedZ = urls.getEmbedUrl('zombie', { quality: 'balanced' });
  const embedD = urls.getEmbedUrl('deadzone');
  lines.push('expected iframe zombie: ' + embedZ);
  lines.push('expected iframe deadzone: ' + embedD);
  lines.push('PASS play page loads with game query for zombie + deadzone');
  lines.push('PASS script.js integrates AIGL_PlayerUrls');
  // script must still create iframes with embed
  assert(script.body.includes("embed") && script.body.includes('iframe'), 'iframe creation present');
  write('player-boot.txt', lines.join('\n') + '\n');
  return lines;
}

function testChangedPaths() {
  const must = [
    'games/deadzone/css/style.css',
    'games/deadzone/js/hub-bridge.js',
    'games/deadzone/index.html',
    'games/zombie/hub-embed-bridge.js',
    'games/zombie/index.html',
    'games/zombie/startup-optimize.js',
    'games/voxel/craftverse-lab.js',
    'games/voxel/craftverse-lab.css',
    'games/voxel/index.html',
    'player-urls.js',
    'script.js',
    'styles.css',
    'index.html'
  ];
  const lines = [];
  for (const m of must) {
    const p = path.join(ROOT, m);
    assert(fs.existsSync(p), 'missing ' + m);
    const st = fs.statSync(p);
    lines.push(`OK ${m} bytes=${st.size}`);
  }
  // content markers
  assert(fs.readFileSync(path.join(ROOT, 'games/deadzone/js/hub-bridge.js'), 'utf8').includes('__deadZoneHubBridge'), 'dz bridge marker');
  assert(fs.readFileSync(path.join(ROOT, 'games/zombie/hub-embed-bridge.js'), 'utf8').includes('__dtHubEmbedBridge'), 'zombie bridge marker');
  assert(fs.readFileSync(path.join(ROOT, 'games/voxel/craftverse-lab.js'), 'utf8').includes('__craftverseLabVersion'), 'voxel version marker');
  lines.push('PASS game package markers present');
  write('changed-paths.txt', lines.join('\n') + '\n');
  return lines;
}

function testDeadzoneSmoke() {
  const lines = [];
  const bundle = path.join(ROOT, 'games/deadzone/js/game-bundle.js');
  const main = path.join(ROOT, 'games/deadzone/js/main.js');
  const input = path.join(ROOT, 'games/deadzone/js/engine/Input.js');
  assert(fs.existsSync(bundle) && fs.statSync(bundle).size > 100000, 'game-bundle present');
  lines.push('PASS game-bundle.js size=' + fs.statSync(bundle).size);
  const mainSrc = fs.readFileSync(main, 'utf8');
  assert(mainSrc.includes("import('./game/Game.js')"), 'main imports Game');
  lines.push('PASS main.js imports Game module');
  const inputSrc = fs.readFileSync(input, 'utf8');
  assert(inputSrc.includes('__deadZoneShowLockError'), 'Input uses hub bridge');
  lines.push('PASS Input.js references hub lock error helper');
  write('deadzone-smoke.txt', lines.join('\n') + '\n');
  return lines;
}

async function main() {
  const unit = testPlayerUrls();
  testChangedPaths();
  testDeadzoneSmoke();

  const server = makeServer();
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));
  try {
    await testHubRoutes();
    await testGameEntries();
    await testPlayerBoot();
  } finally {
    server.close();
  }

  const summary = [
    'ALL GATING CHECKS PASSED',
    'unit: ' + unit.length + ' lines',
    'scratch: ' + SCRATCH,
    'build: 20-overhaul'
  ].join('\n');
  write('verify-summary.txt', summary + '\n');
  console.log(summary);
}

main().catch((err) => {
  console.error('VERIFY FAILED:', err.message);
  write('verify-failure.txt', String(err.stack || err) + '\n');
  process.exit(1);
});
