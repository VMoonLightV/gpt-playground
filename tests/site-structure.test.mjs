import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { Script } from 'node:vm';

const docs = resolve(import.meta.dirname, '../docs');
const allHtml = [];

function visit(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const full = join(folder, entry.name);
    if (entry.isDirectory()) visit(full);
    else if (entry.name.endsWith('.html')) allHtml.push(full);
  }
}
visit(docs);

test('the atlas has navigable core pages', () => {
  for (const name of ['index.html', 'works/index.html', 'notes/index.html', 'notes/scales/index.html', 'about/index.html', 'a-seed/index.html', 'one-bit/index.html']) {
    assert.ok(existsSync(join(docs, name)), name);
  }
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
  assert.match(html, /href="\.\/one-bit\/"/);
  assert.match(html, /href="\.\/notes\/scales\/"/);
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
