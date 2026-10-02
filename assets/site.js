/* Show Me iSkills — comportamiento compartido del sitio. */
// Lo propio de cada página: se vuelve a ejecutar al cambiar de sección sin recargar.
const smisInitPage = () => {
  'use strict';
  document.documentElement.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ── Menús desplegables (clic, teclado y hover en escritorio) ── */
  const items = $$('.nav-item.has-menu');
  const closeAll = except => items.forEach(i => { if (i !== except) { i.classList.remove('open'); i.querySelector('.nav-link')?.setAttribute('aria-expanded', 'false'); } });
  items.forEach(item => {
    const btn = item.querySelector('.nav-link');
    const open = v => { item.classList.toggle('open', v); btn.setAttribute('aria-expanded', String(v)); };
    btn.addEventListener('click', e => { e.preventDefault(); const v = !item.classList.contains('open'); closeAll(item); open(v); });
    let t;
    item.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) { clearTimeout(t); closeAll(item); open(true); } });
    item.addEventListener('mouseleave', () => { if (matchMedia('(hover: hover)').matches) { t = setTimeout(() => open(false), 120); } });
    item.addEventListener('keydown', e => { if (e.key === 'Escape') { open(false); btn.focus(); } });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.nav-item')) closeAll(); });

  /* ── Navegación móvil ── */
  const toggle = $('.menu-toggle'), mobile = $('.mobile-nav');
  if (toggle && mobile) {
    toggle.addEventListener('click', () => {
      const v = !mobile.classList.contains('open');
      mobile.classList.toggle('open', v);
      toggle.setAttribute('aria-expanded', String(v));
      document.body.style.overflow = v ? 'hidden' : '';
    });
    mobile.addEventListener('click', e => { if (e.target.closest('a')) { mobile.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; } });
  }

  /* ── Revelado suave al hacer scroll (todo es visible sin JS) ── */
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.remove('pre'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(el => { const r = el.getBoundingClientRect(); if (r.top > innerHeight) { el.classList.add('pre'); io.observe(el); } });
  }

  /* ── Filtros de catálogo ── */
  $$('[data-filter-group]').forEach(group => {
    const target = $(group.dataset.filterGroup);
    group.addEventListener('click', e => {
      const b = e.target.closest('.filter'); if (!b) return;
      $$('.filter', group).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const cat = b.dataset.cat;
      $$('[data-cat]', target).forEach(card => { card.hidden = cat !== 'all' && card.dataset.cat !== cat; });
    });
  });

  /* ── Buscador con resaltado (docs, ayuda, manual) ── */
  $$('[data-search]').forEach(input => {
    const scope = $(input.dataset.search);
    const units = $$('[data-unit]', scope);
    const empty = $(input.dataset.empty || '.none');
    units.forEach(u => (u._html = u.innerHTML));
    const run = () => {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      units.forEach(u => {
        u.innerHTML = u._html;
        const hit = !q || u.textContent.toLowerCase().includes(q);
        u.hidden = !hit;
        if (hit) shown++;
        if (hit && q.length > 1) {
          const walker = document.createTreeWalker(u, NodeFilter.SHOW_TEXT);
          const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
          nodes.forEach(n => {
            const i = n.data.toLowerCase().indexOf(q); if (i < 0) return;
            const mark = document.createElement('mark');
            const mid = n.splitText(i); mid.splitText(q.length);
            mark.textContent = mid.data; mid.replaceWith(mark);
          });
        }
      });
      if (empty) empty.hidden = shown > 0;
    };
    input.addEventListener('input', run);
  });

  /* ── Barra lateral: sección activa ── */
  const sideLinks = $$('.side nav a[href^="#"]');
  if (sideLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(sideLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { sideLinks.forEach(a => a.classList.remove('active')); map.get(en.target.id)?.classList.add('active'); }
    }), { rootMargin: '-20% 0px -70% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ── Formularios: validación y resumen (sin servidor configurado) ── */
  $$('form[data-local-form]').forEach(form => {
    const out = $(form.dataset.result);
    form.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      $$('.field', form).forEach(f => {
        const el = f.querySelector('input, select, textarea'); if (!el) return;
        const bad = !el.checkValidity();
        f.classList.toggle('invalid', bad);
        if (bad && ok) { el.focus(); ok = false; }
      });
      if (!ok || !out) return;
      const lines = [];
      $$('.field', form).forEach(f => {
        const el = f.querySelector('input, select, textarea'); const label = f.querySelector('label')?.textContent.replace('*', '').trim();
        if (!el || !label) return;
        const v = el.type === 'file' ? Array.from(el.files || []).map(x => x.name).join(', ') || '(sin archivo)' : el.value.trim() || '(vacío)';
        lines.push(`${label}: ${v}`);
      });
      out.hidden = false;
      $('pre', out).textContent = `${form.dataset.title || 'Mensaje'}\n${'-'.repeat(32)}\n${lines.join('\n')}`;
      out.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    });
    $$('input, select, textarea', form).forEach(el => el.addEventListener('input', () => el.closest('.field')?.classList.remove('invalid')));
  });
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const src = $(btn.dataset.copy); if (!src) return;
    try { await navigator.clipboard.writeText(src.textContent); btn.textContent = 'Copiado'; }
    catch { const r = document.createRange(); r.selectNodeContents(src); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Texto seleccionado: cópialo con Ctrl+C'; }
  }));

  /* ── Demostración de visión (solo en la página de inicio) ── */
  const cv = $('#vision-canvas');
  if (cv) {
    const ctx = cv.getContext('2d');
    const angleEl = $('#v-angle'), repEl = $('#v-rep'), phaseEl = $('#v-phase'), msgEl = $('#v-msg');
    let w = 0, h = 0, reps = 3, lastPeak = 0, phase = 'Subir';
    const fit = () => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); w = r.width; h = r.height; cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    addEventListener('resize', fit); fit();
    const rad = a => a * Math.PI / 180;
    const draw = t => {
      if (!cv.isConnected) return;
      const cyc = reduce ? 0.62 : (Math.sin(t / 1300 - Math.PI / 2) + 1) / 2; // 0..1
      const ang = 8 + cyc * 82;
      if (!reduce) {
        if (cyc > 0.97 && lastPeak === 0) { lastPeak = 1; }
        if (cyc < 0.03 && lastPeak === 1) { lastPeak = 0; reps = reps >= 10 ? 1 : reps + 1; }
        phase = cyc > 0.9 ? 'Mantener' : (Math.cos(t / 1300 - Math.PI / 2) > 0 ? 'Subir' : 'Regresar');
      }
      ctx.clearRect(0, 0, w, h);
      // Escena: piso, pared y ruido de cámara
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b1424'); g.addColorStop(0.72, '#0a111d'); g.addColorStop(1, '#060a12');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(150,172,210,.08)'; ctx.lineWidth = 1;
      for (let i = 0; i < 9; i++) { const y = h * 0.72 + i * i * 3.2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      const s = h / 520, cx = w * 0.5, top = h * 0.12;
      const P = (x, y) => [cx + x * s, top + y * s];
      const sh = 92, hip = 230;
      const L = { sh: [-56, sh], el: [-64, sh + 74], wr: [-66, sh + 144], hip: [-34, hip], kn: [-38, hip + 96], an: [-40, hip + 190] };
      const a = rad(ang);
      const R = { sh: [56, sh], hip: [34, hip], kn: [38, hip + 96], an: [40, hip + 190] };
      R.el = [R.sh[0] + Math.sin(a) * 76, R.sh[1] + Math.cos(a) * 76];
      R.wr = [R.el[0] + Math.sin(a) * 70, R.el[1] + Math.cos(a) * 70];
      // Silueta (cuerpo) suave
      ctx.fillStyle = 'rgba(165,176,195,.13)';
      const body = [P(-62, sh - 6), P(62, sh - 6), P(44, hip + 10), P(-44, hip + 10)];
      ctx.beginPath(); body.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
      const [hx, hy] = P(0, 40); ctx.beginPath(); ctx.arc(hx, hy, 30 * s, 0, Math.PI * 2); ctx.fill();
      const limb = (p, q, wdt) => { const A = P(...p), B = P(...q); ctx.strokeStyle = 'rgba(165,176,195,.13)'; ctx.lineWidth = wdt * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.stroke(); };
      [[L.sh, L.el, 26], [L.el, L.wr, 22], [R.sh, R.el, 26], [R.el, R.wr, 22], [L.hip, L.kn, 34], [L.kn, L.an, 28], [R.hip, R.kn, 34], [R.kn, R.an, 28]].forEach(x => limb(...x));
      // Caja de detección
      const [bx, by] = P(-150, -4), [bx2, by2] = P(150, hip + 214);
      ctx.strokeStyle = 'rgba(157,187,255,.55)'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]); ctx.strokeRect(bx, by, bx2 - bx, by2 - by); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(60,123,242,.9)'; ctx.fillRect(bx, by - 20, 92, 20);
      ctx.fillStyle = '#fff'; ctx.font = '500 11px "IBM Plex Mono", monospace'; ctx.fillText('persona 1', bx + 8, by - 6);
      // Arco del ángulo
      const [ox, oy] = P(...R.sh);
      ctx.strokeStyle = 'rgba(67,192,138,.35)'; ctx.lineWidth = 10 * s; ctx.beginPath(); ctx.arc(ox, oy, 58 * s, rad(90 - 95), rad(90 - 80)); ctx.stroke();
      ctx.strokeStyle = '#9dbbff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ox, oy, 46 * s, rad(90), rad(90 - ang), true); ctx.stroke();
      // Esqueleto
      const bones = [[L.sh, R.sh], [L.sh, L.el], [L.el, L.wr], [L.sh, L.hip], [R.sh, R.hip], [L.hip, R.hip], [L.hip, L.kn], [L.kn, L.an], [R.hip, R.kn], [R.kn, R.an], [R.sh, R.el], [R.el, R.wr]];
      bones.forEach(([p, q], i) => { const A = P(...p), B = P(...q); ctx.strokeStyle = i >= 10 ? '#ffffff' : '#3c7bf2'; ctx.lineWidth = i >= 10 ? 3 : 2.2; ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.stroke(); });
      [L.sh, L.el, L.wr, L.hip, L.kn, L.an, R.sh, R.el, R.wr, R.hip, R.kn, R.an].forEach(p => { const [x, y] = P(...p); ctx.fillStyle = '#060a12'; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#9dbbff'; ctx.lineWidth = 1.6; ctx.stroke(); });
      const [ex, ey] = P(...R.el); ctx.fillStyle = '#edf1f7'; ctx.font = '500 12px "IBM Plex Mono", monospace'; ctx.fillText(Math.round(ang) + '°', ex + 10, ey - 8);
      if (angleEl) angleEl.textContent = Math.round(ang) + '°';
      if (repEl) repEl.textContent = reps + ' / 10';
      if (phaseEl) phaseEl.textContent = phase;
      if (msgEl) msgEl.textContent = ang >= 80 ? 'Así. Mantén un momento.' : phase === 'Regresar' ? 'Regresa con control.' : 'Sube hasta la altura del hombro.';
      if (!reduce) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  const y = $('#year'); if (y) y.textContent = String(new Date().getFullYear());
};
smisInitPage();

/* ── Movimiento: fondo vivo, parallax de página, cursor y transiciones ── */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

  /* Transición de entrada */
  const pt = document.createElement('div');
  pt.className = 'pt';
  pt.setAttribute('aria-hidden', 'true');
  pt.innerHTML = '<span class="line"></span><span class="mark"><img src="assets/img/rango.png" alt="">Show Me iSkills</span>';
  document.body.appendChild(pt);
  let entering = false;
  try { entering = sessionStorage.getItem('smis-pt') === '1'; sessionStorage.removeItem('smis-pt'); } catch {}
  if (!reduce) {
    document.body.classList.add('page-enter');
    if (entering) { pt.classList.add('enter'); setTimeout(() => pt.classList.remove('enter'), 1000); }
  }

  /* Cambio de sección sin recargar: se conserva el audio (Rango puede hablar solo) */
  const swap = (doc, hash) => {
    ['header.site-header', 'nav.mobile-nav', 'main'].forEach(sel => {
      const cur = document.querySelector(sel), next = doc.querySelector(sel);
      if (cur && next) cur.replaceWith(document.importNode(next, true));
    });
    document.title = doc.title;
    document.body.style.overflow = '';
    const target = hash && document.getElementById(hash);
    if (target) target.scrollIntoView(); else scrollTo(0, 0);
    smisInitPage();
    window.SmisMotion?.applyDepth();
    window.SmisRango?.refresh();
    document.dispatchEvent(new CustomEvent('smis:page'));
  };
  let busy = false;
  const go = async (href, push) => {
    if (busy) return; busy = true;
    pt.classList.remove('enter');
    if (!reduce) pt.classList.add('leave');
    const wait = new Promise(r => setTimeout(r, reduce ? 0 : 620));
    let doc = null;
    try {
      const res = await fetch(href, { credentials: 'same-origin' });
      if (res.ok) doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    } catch {}
    await wait;
    if (!doc || !doc.querySelector('main')) { location.href = href; return; }
    if (push) history.pushState({ smis: 1 }, '', href);
    swap(doc, href.split('#')[1]);
    busy = false;
    pt.classList.remove('leave');
    if (!reduce) {
      pt.classList.add('enter'); setTimeout(() => pt.classList.remove('enter'), 1000);
      document.body.classList.remove('page-enter'); void document.body.offsetWidth; document.body.classList.add('page-enter');
    }
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:)/.test(href) || /\.pdf($|#)/i.test(href)) return;
    const [file] = href.split('#');
    const here = location.pathname.split('/').pop() || 'index.html';
    if (file === here || file === '') return;
    e.preventDefault();
    go(href, true);
  });
  history.replaceState({ smis: 1 }, '');
  addEventListener('popstate', e => { if (e.state?.smis) go(location.href, false); });
  addEventListener('pageshow', ev => { if (ev.persisted) pt.classList.remove('leave'); });

  if (reduce) return;

  /* Puntero suavizado → variables --px/--py para toda la página */
  let tx = 0, ty = 0, cx = 0, cy = 0, mx = innerWidth / 2, my = innerHeight / 2, last = 0;
  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY; last = performance.now();
    tx = (mx / innerWidth) * 2 - 1; ty = (my / innerHeight) * 2 - 1;
  }, { passive: true });

  /* Capas de la página que se mueven a distinta profundidad */
  const depth = (sel, d) => document.querySelectorAll(sel).forEach(el => { if (!el.closest('.with-side') && !el.closest('form')) { el.dataset.depth = ''; el.style.setProperty('--depth', d); } });
  const applyDepth = () => {
    depth('.hero h1, .page-hero h1', 14);
    depth('.hero .lead, .page-hero .lead, .head h2', 8);
    depth('.vision, .shot, .rango-visual', -18);
    depth('.feature .icon, .eyebrow', 10);
    depth('.logos img', -10);
    depth('.panel, .skill, .res, .pipe, .member', -5);
  };
  applyDepth();
  window.SmisMotion = { applyDepth };

  /* Fondo vivo: puntos tipo «puntos corporales» que se desplazan y reaccionan al cursor */
  const amb = document.createElement('div');
  amb.className = 'ambient';
  amb.setAttribute('aria-hidden', 'true');
  amb.innerHTML = '<div class="glow g1"></div><div class="glow g2"></div><canvas></canvas>';
  document.body.prepend(amb);
  const cv = amb.querySelector('canvas'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, pts = [];
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, (W * H) / 16000));
    pts = Array.from({ length: n }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35 + (i % 3 === 0 ? 0.25 : 0), vy: (Math.random() - 0.5) * 0.3,
      z: 0.4 + Math.random() * 0.9, r: Math.random() < 0.15 ? 2.4 : 1.4,
    }));
  };
  addEventListener('resize', resize); resize();

  /* Estela del cursor: marcas que nacen y se alejan en distintas direcciones */
  const trail = [];
  let lastSpawn = 0;
  const spawn = (x, y, t) => {
    if (t - lastSpawn < 45) return; lastSpawn = t;
    const a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 1.2;
    trail.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, kind: Math.random() < 0.3 ? 'plus' : Math.random() < 0.5 ? 'ring' : 'dot' });
    if (trail.length > 60) trail.shift();
  };

  /* Cursor propio */
  let dot, ring, rx = mx, ry = my;
  if (fine) {
    dot = document.createElement('div'); dot.className = 'cursor-dot';
    ring = document.createElement('div'); ring.className = 'cursor-ring';
    document.body.append(dot, ring);
    addEventListener('pointermove', () => root.classList.add('cursor-on'), { once: true });
    document.addEventListener('pointerover', e => root.classList.toggle('cursor-hover', !!e.target.closest('a, button, summary, .filter, input, select, textarea, label')));
    addEventListener('pointerdown', () => root.classList.add('cursor-down'));
    addEventListener('pointerup', () => root.classList.remove('cursor-down'));
    document.addEventListener('pointerleave', () => root.classList.remove('cursor-on'));
    document.addEventListener('pointerenter', () => root.classList.add('cursor-on'));
  }

  let pmx = mx, pmy = my;
  const frame = t => {
    // Sin movimiento del mouse, la escena deriva sola.
    if (t - last > 3000) { tx = Math.sin(t / 3200) * 0.35; ty = Math.cos(t / 4100) * 0.25; }
    cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
    root.style.setProperty('--px', cx.toFixed(4));
    root.style.setProperty('--py', cy.toFixed(4));

    if (fine && dot) {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      const moved = Math.hypot(mx - pmx, my - pmy);
      if (moved > 2 && t - last < 100) spawn(mx, my, t);
      pmx = mx; pmy = my;
    }

    ctx.clearRect(0, 0, W, H);
    const ox = cx * 40, oy = cy * 30;
    for (const p of pts) {
      p.x += p.vx * p.z; p.y += p.vy * p.z;
      const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
      if (d < 140 && d > 0.1) { p.x += (dx / d) * (140 - d) * 0.03; p.y += (dy / d) * (140 - d) * 0.03; }
      if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
    }
    // Conexiones cercanas, más visibles alrededor del cursor
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], ax = a.x + ox * a.z, ay = a.y + oy * a.z;
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j], bx = b.x + ox * b.z, by = b.y + oy * b.z;
        const d = Math.hypot(ax - bx, ay - by);
        if (d < 130) {
          const near = Math.max(0, 1 - Math.hypot((ax + bx) / 2 - mx, (ay + by) / 2 - my) / 260);
          ctx.strokeStyle = `rgba(157,187,255,${(1 - d / 130) * (0.07 + near * 0.35)})`;
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(157,187,255,${0.25 + a.z * 0.3})`;
      ctx.beginPath(); ctx.arc(ax, ay, a.r * a.z, 0, Math.PI * 2); ctx.fill();
    }
    // Estela
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.vy *= 0.985; p.life -= 0.012;
      if (p.life <= 0) { trail.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(60,123,242,${p.life * 0.8})`;
      ctx.fillStyle = `rgba(157,187,255,${p.life * 0.9})`;
      ctx.lineWidth = 1.2;
      if (p.kind === 'dot') { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill(); }
      else if (p.kind === 'ring') { ctx.beginPath(); ctx.arc(p.x, p.y, 6 * (1.4 - p.life), 0, Math.PI * 2); ctx.stroke(); }
      else { const s = 4; ctx.beginPath(); ctx.moveTo(p.x - s, p.y); ctx.lineTo(p.x + s, p.y); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x, p.y + s); ctx.stroke(); }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();


/* ── Efectos de sonido sutiles (Web Audio, sin archivos) ── */
const SmisSfx = (() => {
  'use strict';
  const AC = window.AudioContext || window.webkitAudioContext;
  let on = true;
  try { on = localStorage.getItem('smis-sonido') !== '0'; } catch {}
  let ctx = null, master = null, noise = null;
  const ensure = () => {
    if (!AC || !on) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  // Solo suena después de una interacción: los navegadores no permiten audio antes.
  let unlocked = false;
  const unlock = () => { unlocked = true; ensure(); };
  addEventListener('pointerdown', unlock, { capture: true, once: true });
  addEventListener('keydown', unlock, { capture: true, once: true });

  const tone = (freq, dur, { type = 'sine', vol = 0.05, to = null, delay = 0 } = {}) => {
    const c = unlocked && ensure(); if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  };
  const whoosh = (dur = 0.42, from = 300, to = 2600, vol = 0.07) => {
    const c = unlocked && ensure(); if (!c) return;
    const t = c.currentTime, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noise; f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + dur + 0.02);
  };
  const fx = {
    hover: () => tone(1900, 0.035, { vol: 0.018 }),
    tap: () => tone(620, 0.08, { type: 'triangle', vol: 0.05, to: 340 }),
    open: () => { tone(520, 0.07, { vol: 0.035 }); tone(780, 0.09, { vol: 0.03, delay: 0.05 }); },
    page: () => whoosh(),
    chime: () => { tone(659, 0.35, { vol: 0.03 }); tone(988, 0.45, { vol: 0.025, delay: 0.09 }); },
    ok: () => { tone(784, 0.12, { vol: 0.04 }); tone(1175, 0.22, { vol: 0.035, delay: 0.08 }); },
  };

  // Enlaces y botones: un tic al pasar el cursor (máx. uno cada 70 ms) y un toque al hacer clic.
  const target = '.btn, .nav-link, .dropdown a, .card a, a.card, .filter, button, .side-nav a, footer a';
  let lastHover = 0, lastEl = null;
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest(target);
    if (!el || el === lastEl) return;
    lastEl = el;
    const now = performance.now(); if (now - lastHover < 70) return;
    lastHover = now; fx.hover();
  });
  document.addEventListener('pointerout', e => { if (lastEl && !lastEl.contains(e.relatedTarget)) lastEl = null; });
  document.addEventListener('click', e => {
    const el = e.target.closest('a, button, summary, [role="button"]'); if (!el) return;
    if (el.matches('.sfx-toggle')) return;
    const a = el.closest('a[href]');
    if (a && !a.target && a.origin === location.origin && !a.getAttribute('href').startsWith('#') && a.pathname !== location.pathname) fx.page();
    else if (el.getAttribute('aria-expanded') !== null) fx.open();
    else fx.tap();
  }, true);
  document.addEventListener('submit', () => fx.ok(), true);

  // Botón para silenciar o activar los sonidos.
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'sfx-toggle';
  const paint = () => {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Silenciar efectos de sonido' : 'Activar efectos de sonido');
    btn.title = on ? 'Sonido activado' : 'Sonido desactivado';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/>${on ? '<path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</svg>`;
  };
  btn.addEventListener('click', () => {
    on = !on;
    try { localStorage.setItem('smis-sonido', on ? '1' : '0'); } catch {}
    if (!on && ctx) ctx.suspend(); else { unlocked = true; fx.ok(); }
    paint();
  });
  paint();
  if (AC) document.body.appendChild(btn);
  return fx;
})();


/* ── Rango guía: una frase breve por zona, con su voz grabada ── */
(() => {
  'use strict';
  let zones = Array.from(document.querySelectorAll('[data-rango]'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let voiceOn = true;
  try { voiceOn = localStorage.getItem('smis-rango-voz') !== '0'; } catch {}

  const box = document.createElement('div');
  box.className = 'rango-guide';
  box.innerHTML = `<button class="avatar" type="button"><img src="assets/img/rango.png" alt=""><span class="vol"></span></button>
    <div class="bubble" role="status" aria-live="polite"><b>Rango</b><p></p><span class="hint"></span></div>`;
  document.body.appendChild(box);
  const btn = box.querySelector('.avatar'), text = box.querySelector('.bubble p'), hint = box.querySelector('.hint'), vol = box.querySelector('.vol');
  const paint = () => {
    btn.setAttribute('aria-pressed', String(voiceOn));
    btn.setAttribute('aria-label', voiceOn ? 'Silenciar la voz de Rango' : 'Activar la voz de Rango');
    vol.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/>${voiceOn ? '<path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</svg>`;
    hint.textContent = voiceOn ? 'Toca mi ícono para silenciarme.' : 'Toca mi ícono para escuchar mi voz.';
  };
  paint();

  const player = new Audio();
  player.preload = 'none';
  player.addEventListener('playing', () => box.classList.add('speaking'));
  ['pause', 'ended', 'error'].forEach(ev => player.addEventListener(ev, () => box.classList.remove('speaking')));
  let pending = null;
  const play = src => {
    if (!voiceOn || !src) return false;
    player.pause();
    player.src = src;
    player.currentTime = 0;
    const pr = player.play();
    // Sin un toque previo el navegador no deja reproducir: se guarda y suena con el primer toque.
    if (pr) pr.catch(() => { pending = src; hint.textContent = 'Toca cualquier parte de la página y te hablo.'; });
    return true;
  };
  const flush = () => { if (pending && voiceOn) { const s = pending; pending = null; paint(); play(s); } };
  addEventListener('pointerdown', flush, true);
  addEventListener('keydown', flush, true);

  let hideT = 0, current = null;
  const say = zone => {
    current = zone;
    const msg = zone.dataset.rango;
    text.textContent = msg;
    box.classList.add('show');
    if (!play(zone.dataset.rangoAudio)) SmisSfx.chime();
    clearTimeout(hideT);
    hideT = setTimeout(() => box.classList.remove('show'), Math.max(4500, 1800 + msg.length * 55));
  };

  btn.addEventListener('click', () => {
    voiceOn = !voiceOn;
    try { localStorage.setItem('smis-rango-voz', voiceOn ? '1' : '0'); } catch {}
    paint();
    pending = null;
    if (!voiceOn) { player.pause(); return; }
    const vis = zones.find(z => { const r = z.getBoundingClientRect(); return r.top < innerHeight * 0.7 && r.bottom > innerHeight * 0.3; });
    const z = vis || (current?.isConnected ? current : zones[0]);
    if (z) say(z);
  });

  // Cada zona aparece una vez por visita, cuando cruza el centro de la pantalla.
  const done = new Set();
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting || done.has(en.target)) return;
    done.add(en.target);
    setTimeout(() => say(en.target), reduce ? 0 : 450);
  }), { rootMargin: '-35% 0px -35% 0px', threshold: 0 });
  setTimeout(() => zones.forEach(z => io.observe(z)), document.body.classList.contains('page-enter') ? 900 : 200);
  addEventListener('pagehide', () => player.pause());
  window.SmisRango = {
    refresh() {
      io.disconnect(); done.clear(); current = null; pending = null;
      zones = Array.from(document.querySelectorAll('[data-rango]'));
      setTimeout(() => zones.forEach(z => io.observe(z)), reduce ? 100 : 700);
    },
  };
})();
