/* Open Atlas / Deep Field
 * An open map with gentle, layered stellar drift.
 * - Stars are pre-rendered into canvas tiles, not recreated every frame.
 * - Ambient motion is capped at 20 FPS and stops in hidden tabs.
 * - Reduced-motion preference disables ambient animation.
 * - Manual navigation and every celestial link work while paused.
 * Zero dependencies, no network requests or tracking.
 */
(() => {
  'use strict';
  const stage = document.getElementById('open-sky');
  const world = document.getElementById('sky-world');
  const canvas = document.getElementById('starfield');
  if (!stage || !world || !canvas) return;

  stage.tabIndex = 0;
  stage.setAttribute('aria-describedby', 'sky-instructions');

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionControl = document.getElementById('sky-motion');
  const zoomIn = document.getElementById('sky-zoom-in');
  const zoomOut = document.getElementById('sky-zoom-out');
  const resetButton = document.getElementById('sky-reset');

  const mobile = () => window.matchMedia('(max-width: 600px)').matches;
  const narrow = () => window.matchMedia('(max-width: 830px)').matches;
  const initial = () => mobile()
    ? { x: -390, y: 30, scale: 0.94 }
    : narrow() ? { x: -215, y: 25, scale: 0.95 }
      : { x: 0, y: 0, scale: 1 };

  let { x, y, scale } = initial();
  let width = 0, height = 0, dpr = 1;
  let dragging = null;
  let manualPaused = false;
  let driftSeconds = 0;
  let previousFrame = 0, lastDraw = 0, frameId = 0;
  let stars = [];

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const wrap = (value, length) => ((value % length) + length) % length;
  const isRunning = () => !manualPaused && !reduce.matches && !document.hidden;
  let randomSeed = 337144;

  function random() {
    randomSeed = (Math.imul(1664525, randomSeed) + 1013904223) >>> 0;
    return randomSeed / 4294967296;
  }

  // Each layer is drawn only on resize, then composited at different speeds.
  // The four tiled copies keep the field continuous as it passes each edge.
  function buildStarLayers() {
    randomSeed = 337144;
    const area = Math.max(0.15, (width * height) / (1600 * 900));
    const configs = [
      { density: 550, base: 155, parallax: 0.06, vx: 0.45, vy: 0.15 },
      { density: 430, base: 115, parallax: 0.12, vx: 1.05, vy: 0.32 },
      { density: 270, base: 85, parallax: 0.24, vx: 2.05, vy: 0.68 },
    ];

    stars = configs.map((config, index) => {
      const tile = document.createElement('canvas');
      tile.width = Math.round(width * dpr);
      tile.height = Math.round(height * dpr);
      const drawing = tile.getContext('2d', { alpha: true });
      if (!drawing) return { tile, ...config };
      drawing.scale(dpr, dpr);
      const count = Math.max(config.base, Math.round(config.density * area));

      for (let i = 0; i < count; i++) {
        const xx = random() * width;
        const yy = random() * height;
        const brightness = random();
        const radius = (index === 0 ? 0.26 : 0.39) + Math.pow(brightness, 2) * (index === 2 ? 1.7 : 1.08);
        const alpha = (0.16 + brightness * (index === 2 ? 0.56 : 0.39)).toFixed(3);
        drawing.beginPath();
        drawing.arc(xx, yy, radius, 0, 2 * Math.PI);
        drawing.fillStyle = 'rgba(219,237,255,' + alpha + ')';
        drawing.fill();

        // A few quiet bright points add scale, without animating flashes.
        if (brightness > 0.995 && index > 0) {
          const halo = drawing.createRadialGradient(xx, yy, 0, xx, yy, radius * 6);
          halo.addColorStop(0, 'rgba(181,222,244,0.27)');
          halo.addColorStop(1, 'rgba(181,222,244,0)');
          drawing.fillStyle = halo;
          drawing.beginPath();
          drawing.arc(xx, yy, radius * 6, 0, Math.PI * 2);
          drawing.fill();
        }
      }
      return { tile, ...config };
    });
  }

  function drawStars() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const layer of stars) {
      const shiftX = wrap(driftSeconds * layer.vx + x * layer.parallax, width);
      const shiftY = wrap(driftSeconds * layer.vy + y * layer.parallax, height);
      const startX = shiftX - width;
      const startY = shiftY - height;
      ctx.drawImage(layer.tile, startX, startY, width, height);
      ctx.drawImage(layer.tile, startX + width, startY, width, height);
      ctx.drawImage(layer.tile, startX, startY + height, width, height);
      ctx.drawImage(layer.tile, startX + width, startY + height, width, height);
    }
  }

  function drawWorld() {
    // A bounded, almost imperceptible motion of the nearer nebulae and planets.
    // Freeze the offset, rather than snapping back, when motion is paused.
    const glideX = reduce.matches ? 0 : Math.sin(driftSeconds / 38) * 14;
    const glideY = reduce.matches ? 0 : Math.cos(driftSeconds / 54) * 10 - 10;
    world.style.transform =
      'translate(calc(-50% + ' + (x + glideX).toFixed(2) + 'px), ' +
      'calc(-50% + ' + (y + glideY).toFixed(2) + 'px)) scale(' + scale.toFixed(3) + ')';
  }

  function draw() {
    if (width <= 0 || height <= 0) return;
    drawWorld();
    drawStars();
  }

  function frame(time) {
    frameId = 0;
    const running = isRunning();
    if (running) {
      if (previousFrame) driftSeconds += Math.min((time - previousFrame) / 1000, 0.12);
      previousFrame = time;
    } else previousFrame = 0;
    if (!lastDraw || time - lastDraw >= 50 || !running) {
      draw();
      lastDraw = time;
    }
    if (running) schedule();
  }

  function schedule() {
    if (!frameId) frameId = window.requestAnimationFrame(frame);
  }

  function stop() {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    previousFrame = 0;
    schedule(); // draw the exact frozen state once
  }

  function updateMotionControl() {
    if (!motionControl) return;
    motionControl.disabled = reduce.matches;
    const paused = manualPaused || reduce.matches;
    motionControl.setAttribute('aria-pressed', String(paused));
    motionControl.textContent = reduce.matches ? '静态星空' : paused ? '继续漂移' : '暂停漂移';
    motionControl.title = reduce.matches ? '系统已启用减少动态效果' :
      paused ? '继续缓慢漂移' : '暂停星空缓慢漂移';
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.round(rect.width);
    height = Math.round(rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    buildStarLayers();
    schedule();
  }

  function zoom(factor) {
    scale = clamp(scale * factor, 0.62, 1.85);
    schedule();
  }

  function reset() {
    ({ x, y, scale } = initial());
    schedule();
  }

  zoomIn?.addEventListener('click', () => zoom(1.18));
  zoomOut?.addEventListener('click', () => zoom(1 / 1.18));
  resetButton?.addEventListener('click', reset);
  motionControl?.addEventListener('click', () => {
    if (reduce.matches) return;
    manualPaused = !manualPaused;
    updateMotionControl();
    if (manualPaused) stop();
    else { previousFrame = 0; schedule(); }
  });

  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    if (event.target.closest('a, button, .sky-controls, .sky-bottom')) return;
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener('pointermove', event => {
    if (!dragging || dragging.id !== event.pointerId) return;
    x = clamp(x + event.clientX - dragging.x, -2400, 2400);
    y = clamp(y + event.clientY - dragging.y, -1500, 1500);
    dragging.x = event.clientX;
    dragging.y = event.clientY;
    schedule();
  });

  function endDrag(event) {
    if (dragging && dragging.id === event.pointerId) dragging = null;
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('lostpointercapture', endDrag);

  stage.addEventListener('wheel', event => {
    if (!event.ctrlKey) return; // Avoid interfering with browser scroll/zoom habits.
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
      x = clamp(x, -2400, 2400);
      y = clamp(y, -1500, 1500);
      schedule();
    }
  });

  const reducedChanged = () => {
    updateMotionControl();
    if (reduce.matches) stop();
    else { previousFrame = 0; schedule(); }
  };
  if (reduce.addEventListener) reduce.addEventListener('change', reducedChanged);
  else reduce.addListener(reducedChanged);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else { previousFrame = 0; schedule(); }
  });

  let wasMobile = mobile(), wasNarrow = narrow();
  window.addEventListener('resize', () => {
    const m = mobile(), n = narrow();
    if (m !== wasMobile || n !== wasNarrow) reset();
    wasMobile = m;
    wasNarrow = n;
    resize();
  });

  updateMotionControl();
  resize();
})();
