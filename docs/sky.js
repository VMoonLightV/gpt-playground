/* Open Atlas deep-field navigator.
 * Finite curated coordinates in a wide, navigable sky; surrounding empty space
 * intentionally remains open. No tracking, network requests or animation loop.
 */
(() => {
  'use strict';

  const stage = document.getElementById('open-sky');
  const world = document.getElementById('sky-world');
  const canvas = document.getElementById('starfield');
  if (!stage || !world || !canvas) return;

  stage.setAttribute('tabindex', '0');
  stage.setAttribute('aria-describedby', 'sky-instructions');

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  // Reproducible stars, with a heavy tail of faint points.
  let seed = 137746;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const stars = Array.from({ length: 1000 }, () => ({
    x: random(), y: random(),
    radius: 0.3 + random() * (random() > 0.975 ? 2.2 : 1.0),
    opacity: 0.15 + random() * 0.57,
    parallax: 0.05 + random() * 0.22,
  }));

  const mobile = () => window.matchMedia('(max-width: 600px)').matches;
  const narrow = () => window.matchMedia('(max-width: 830px)').matches;
  const initial = () => mobile() ? { x: -510, y: 85, scale: 0.95 } :
    narrow() ? { x: -230, y: 70, scale: 0.93 } : { x: 0, y: 0, scale: 1 };

  let { x, y, scale } = initial();
  let width = 0;
  let height = 0;
  let dragging = null;
  let scheduled = false;

  const bound = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const modulo = (value, size) => ((value % size) + size) % size;

  function paintStars() {
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    for (const star of stars) {
      const sx = modulo(star.x * width + x * star.parallax, width);
      const sy = modulo(star.y * height + y * star.parallax, height);
      ctx.beginPath();
      ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(221,238,250,' + star.opacity + ')';
      ctx.fill();
    }
  }

  function render() {
    scheduled = false;
    world.style.transform = 'translate(calc(-50% + ' + x.toFixed(2) +
      'px), calc(-50% + ' + y.toFixed(2) + 'px)) scale(' + scale.toFixed(3) + ')';
    paintStars();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(render);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.round(rect.width);
    height = Math.round(rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    schedule();
  }

  function zoom(factor) {
    scale = bound(scale * factor, 0.65, 1.75);
    schedule();
  }

  function reset() {
    ({ x, y, scale } = initial());
    schedule();
  }

  document.getElementById('sky-zoom-in')?.addEventListener('click', () => zoom(1.18));
  document.getElementById('sky-zoom-out')?.addEventListener('click', () => zoom(1 / 1.18));
  document.getElementById('sky-reset')?.addEventListener('click', reset);

  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    if (event.target.closest('a, button, .sky-intro, .sky-controls, .sky-bottom')) return;
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener('pointermove', event => {
    if (!dragging || dragging.id !== event.pointerId) return;
    x = bound(x + event.clientX - dragging.x, -2400, 2400);
    y = bound(y + event.clientY - dragging.y, -1500, 1500);
    dragging.x = event.clientX;
    dragging.y = event.clientY;
    schedule();
  });

  function stopDrag(event) {
    if (dragging && dragging.id === event.pointerId) dragging = null;
  }
  stage.addEventListener('pointerup', stopDrag);
  stage.addEventListener('pointercancel', stopDrag);
  stage.addEventListener('lostpointercapture', stopDrag);

  // Avoid trapping ordinary page scroll. Hold Ctrl while scrolling to zoom.
  stage.addEventListener('wheel', event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    zoom(event.deltaY < 0 ? 1.08 : 1 / 1.08);
  }, { passive: false });

  stage.addEventListener('keydown', event => {
    if (event.target !== stage) return;
    let handled = true;
    switch (event.key) {
      case 'ArrowLeft': x += 70; break;
      case 'ArrowRight': x -= 70; break;
      case 'ArrowUp': y += 70; break;
      case 'ArrowDown': y -= 70; break;
      case '+': case '=': zoom(1.18); break;
      case '-': case '_': zoom(1 / 1.18); break;
      case 'Home': reset(); break;
      default: handled = false;
    }
    if (handled) {
      event.preventDefault();
      x = bound(x, -2400, 2400);
      y = bound(y, -1500, 1500);
      schedule();
    }
  });

  let previousMobile = mobile();
  let previousNarrow = narrow();
  window.addEventListener('resize', () => {
    const nextMobile = mobile(), nextNarrow = narrow();
    if (nextMobile !== previousMobile || nextNarrow !== previousNarrow) reset();
    previousMobile = nextMobile;
    previousNarrow = nextNarrow;
    resize();
  });

  resize();
})();
