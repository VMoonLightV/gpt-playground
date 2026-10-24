import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { Script } from 'node:vm';

const docs = resolve(import.meta.dirname, '../docs');
const root = resolve(import.meta.dirname, '..');
const allHtml = [];

function visit(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const full = join(folder, entry.name);
    if (entry.isDirectory()) visit(full);
    else if (entry.name.endsWith('.html')) allHtml.push(full);
  }
}
visit(docs);

test('the atlas has navigable core pages and source catalog', () => {
  for (const name of ['index.html', 'works/index.html', 'notes/index.html', 'notes/scales/index.html', 'about/index.html', 'a-seed/index.html', 'one-bit/index.html']) {
    assert.ok(existsSync(join(docs, name)), name);
  }
  assert.ok(existsSync(join(root, 'notes/README.md')), 'notes source catalog missing');
});

test('relative href and src references resolve to real site files', () => {
  for (const file of allHtml) {
    const html = readFileSync(file, 'utf8');
    const refs = [...html.matchAll(/\b(?:href|src)\s*=\s*["']([^"'<>]+)["']/g)].map(match => match[1]);
    for (const ref of refs) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(ref)) continue;
      const clean = ref.split(/[?#]/, 1)[0];
      if (!clean) continue;
      const target = resolve(dirname(file), clean);
      assert.ok(target.startsWith(docs), 'Link escapes docs: ' + file + ' -> ' + ref);
      assert.ok(existsSync(target), 'Broken link: ' + file + ' -> ' + ref);
      if (statSync(target).isDirectory()) assert.ok(existsSync(join(target, 'index.html')), 'No index in ' + target);
    }
  }
});

test('each page has a title and a lang attribute', () => {
  for (const file of allHtml) {
    const html = readFileSync(file, 'utf8');
    assert.match(html, /<html\s+lang=/i, file);
    assert.match(html, /<title>[^<]+<\/title>/i, file);
  }
});

test('the interactive one-bit script remains syntactically valid', () => {
  const html = readFileSync(join(docs, 'one-bit/index.html'), 'utf8');
  const inline = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(inline, 'one-bit script missing');
  assert.doesNotThrow(() => new Script(inline[1], { filename: 'one-bit-inline.js' }));
});

test('homepage does not expose private chronicles or third-party trackers', () => {
  const html = readFileSync(join(docs, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /backup-0[1-5]|google-analytics|gtag\(|plausible\.io/i);
  assert.match(html, /href="\.\/one-bit\/"/i);
  assert.match(html, /href="\.\/notes\/scales\/" /);
});

test('field-note index routes every note to an on-site reading page', () => {
  const index = readFileSync(join(docs, 'notes/index.html'), 'utf8');
  const catalog = readFileSync(join(root, 'notes/README.md'), 'utf8');
  const notes = [
    { filename: '2026-10-24-two-roads-one-higgs.md', route: 'higgs-production', title: '两条道路，一枚希格斯' },
    { filename: '2026-10-23-two-mixtures-one-classifier.md', route: 'mixture-classifier', title: '两杯混合物，一位分类器' },
    { filename: '2026-10-22-correlation-constellations.md', route: 'correlation-constellations', title: '两片相关的星空' },
    { filename: '2026-10-21-the-moving-observer.md', route: 'moving-observer', title: '移动的观测者' },
    { filename: '2026-10-19-map-of-scales.md', route: 'scales', title: '尺度之间的地图' },
  ];
  assert.match(index, /5 field notes/);
  const archiveRows = [...index.matchAll(/<a class="archive-row" href="([^"]+)"/g)].map(match => match[1]);
  assert.equal(archiveRows.length, notes.length, 'website index should list five reading pages');
  assert.ok(archiveRows.every(href => href.startsWith('./') && !href.includes('github.com')), 'archive rows must stay on the website');
  for (const note of notes) {
    assert.ok(catalog.includes(note.filename), 'source catalog missing ' + note.filename);
    assert.ok(index.includes('href="./' + note.route + '/"'), 'website index missing on-site route ' + note.route);
    const page = readFileSync(join(docs, 'notes', note.route, 'index.html'), 'utf8');
    assert.match(page, /<article class="article"/, 'rendered article missing for ' + note.route);
    assert.ok(page.includes(note.title), 'article title missing for ' + note.route);
    assert.ok(page.includes('blob/main/notes/' + note.filename), 'canonical source link missing for ' + note.route);
  }
});

test('the atlas home is a single full-screen star map', () => {
  const home = readFileSync(join(docs, 'index.html'), 'utf8');
  const sky = readFileSync(join(docs, 'sky.js'), 'utf8');
  assert.match(home, /<body class="atlas-home">/);
  assert.match(home, /id="sky-world"/);
  assert.match(home, /id="starfield"/);
  assert.match(home, /src="\.\/sky\.js"/);
  assert.match(home, /aria-labelledby="atlas-heading"/);
  assert.equal((home.match(/<section\b/g) || []).length, 1, 'homepage must contain only the star map');
  assert.doesNotMatch(home, /feature-section|notebook-section|philosophy-section|sky-intro/);
  for (const route of ['./works/', './notes/', './about/', './a-seed/', './one-bit/', './notes/scales/']) {
    assert.ok(home.includes('href="' + route + '"'), 'Missing home destination: ' + route);
  }
  for (const name of ['NEBULA / 01', 'PLANET / 001', 'ASTEROID / 001']) {
    assert.ok(home.includes(name), 'Missing celestial type: ' + name);
  }
  for (const id of ['sky-zoom-in', 'sky-zoom-out', 'sky-reset', 'sky-motion']) {
    assert.ok(home.includes('id="' + id + '"'), 'Missing navigation control: ' + id);
  }
  assert.match(home, /id="sky-motion"[^>]*aria-pressed="false"/);
  assert.doesNotThrow(() => new Script(sky, { filename: 'sky.js' }));
});

test('ambient star drift is opt-out, reduced-motion aware and efficient', () => {
  const sky = readFileSync(join(docs, 'sky.js'), 'utf8');
  assert.match(sky, /prefers-reduced-motion: reduce/);
  assert.match(sky, /document\.hidden/);
  assert.match(sky, /visibilitychange/);
  assert.match(sky, /buildStarLayers/);
  assert.match(sky, /drawImage\(/);
  assert.match(sky, /time - lastDraw >= 50/);
  assert.match(sky, /motionControl\.setAttribute\('aria-pressed', String\(paused\)\)/);
  assert.match(sky, /ArrowLeft/);
  assert.match(sky, /setPointerCapture/);
  assert.doesNotMatch(sky, /fetch\(|XMLHttpRequest|localStorage/);
});
