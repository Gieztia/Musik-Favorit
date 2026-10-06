/* =========================================================
   MIXTAPE.CO — Survei Musik Favorit
   ========================================================= */

const CONFIG = {
  // ⬇⬇⬇ TEMPEL URL WEB APP (berakhiran /exec) DI SINI ⬇⬇⬇
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwQKGVuYZRXhrwirRHUpWKlLtM5g9efFgSG32eF6l7ey0V9lCVCf-508m6t5CijP5NPDw/exec',
  TIMEOUT_MS: 25000
};

(function () {
  'use strict';

  /* ---------- Util ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isConfigured = () => /^https:\/\/script\.google(usercontent)?\.com\//.test(CONFIG.SCRIPT_URL);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------- Genre meta (warna & emoji diambil dari chip di HTML) ---------- */
  const genreMeta = {};
  $$('input[name="genre"]').forEach((input) => {
    const label = input.closest('.chip');
    genreMeta[input.value] = {
      color: label ? label.style.getPropertyValue('--c').trim() || '#ffd23f' : '#ffd23f',
      emoji: label ? label.dataset.emoji || '🎵' : '🎵'
    };
  });
  const metaOf = (genre) => genreMeta[genre] || { color: '#ffd23f', emoji: '🎵' };

  const palette = ['#ff3b5c', '#ff7a1a', '#ffd23f', '#3ddc84', '#1ec8c8', '#3b82f6', '#b583ff', '#ff7ab8'];

  /* ---------- Toast ---------- */
  const toastEl = $('#toast');
  let toastTimer = null;
  function toast(message, type) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = 'toast show ' + (type || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 4200);
  }

  /* ---------- Counter animasi ---------- */
  function runCounters(root) {
    $$('[data-count]', root).forEach((node) => {
      if (node.dataset.done === node.dataset.count) return;
      const to = parseFloat(node.dataset.count) || 0;
      const dec = parseInt(node.dataset.dec || '0', 10);
      node.dataset.done = node.dataset.count;
      if (reduceMotion) { node.textContent = to.toFixed(dec); return; }
      const dur = 1400;
      const t0 = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        node.textContent = (to * eased).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Reveal saat scroll ---------- */
  let observer = null;
  function reveal(node) {
    node.classList.add('in');
    runCounters(node);
  }
  function observe(node) {
    if (!observer) { reveal(node); return; }
    observer.observe(node);
  }
  if ('IntersectionObserver' in window && !reduceMotion) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  }
  $$('.reveal').forEach(observe);

  /* ---------- Render hasil ---------- */
  const DEMO = {
    ok: true, total: 128, avgRating: 8.6,
    genres: [
      { name: 'Pop', count: 34 }, { name: 'Rock', count: 24 }, { name: 'Hip-Hop', count: 19 },
      { name: 'Indie', count: 16 }, { name: 'EDM', count: 12 }, { name: 'Dangdut', count: 10 },
      { name: 'K-Pop', count: 8 }, { name: 'Jazz', count: 5 }
    ],
    artists: [
      { name: 'Taylor Swift', count: 11 }, { name: 'Sheila On 7', count: 9 }, { name: 'Bruno Mars', count: 7 },
      { name: 'Tulus', count: 6 }, { name: 'Coldplay', count: 5 }
    ],
    platforms: [
      { name: 'Spotify', count: 62 }, { name: 'YouTube Music', count: 28 }, { name: 'YouTube', count: 22 },
      { name: 'Apple Music', count: 9 }, { name: 'JOOX', count: 7 }
    ],
    recent: [
      { nama: 'Rani', genre: 'Pop', artis: 'Taylor Swift', lagu: 'Lover', waktu: 'Malam' },
      { nama: 'Bima', genre: 'Rock', artis: 'Sheila On 7', lagu: 'Dan', waktu: 'Perjalanan' },
      { nama: 'Sari', genre: 'Indie', artis: 'Fourtwnty', lagu: 'Zona Nyaman', waktu: 'Belajar / Kerja' },
      { nama: 'Dito', genre: 'EDM', artis: 'Alan Walker', lagu: 'Faded', waktu: 'Olahraga' }
    ]
  };

  function renderBars(container, items, total, colorFor) {
    container.replaceChildren();
    if (!items || !items.length) {
      container.appendChild(el('p', 'empty', 'Belum ada data. Jadilah yang pertama mengisi! 🎶'));
      return;
    }
    const max = Math.max.apply(null, items.map((i) => i.count)) || 1;
    items.forEach((item, idx) => {
      const row = el('div', 'bar-row');
      row.style.setProperty('--d', (idx * 90) + 'ms');
      const label = el('span', 'bar-label', item.name);
      const track = el('span', 'bar');
      const fill = el('i');
      fill.style.setProperty('--w', Math.max(6, Math.round((item.count / max) * 100)) + '%');
      fill.style.setProperty('--c', colorFor(item, idx));
      track.appendChild(fill);
      const pct = total ? Math.round((item.count / total) * 100) : 0;
      const value = el('span', 'bar-val', item.count + ' · ' + pct + '%');
      row.append(label, track, value);
      container.appendChild(row);
    });
  }

  function renderRank(container, items) {
    container.replaceChildren();
    if (!items || !items.length) {
      container.appendChild(el('li', 'empty', 'Belum ada data.'));
      return;
    }
    items.forEach((item, idx) => {
      const li = el('li', 'rank-item');
      li.style.setProperty('--c', palette[idx % palette.length]);
      li.append(el('b', 'rank-no', String(idx + 1)), el('span', 'rank-name', item.name), el('span', 'rank-count', item.count + '×'));
      container.appendChild(li);
    });
  }

  function renderRecent(container, items) {
    container.replaceChildren();
    if (!items || !items.length) {
      container.appendChild(el('p', 'empty', 'Belum ada jawaban masuk.'));
      return;
    }
    items.forEach((r, idx) => {
      const m = metaOf(r.genre);
      const card = el('article', 'mini win reveal reveal-pop');
      card.style.setProperty('--d', (idx * 70) + 'ms');
      card.style.setProperty('--accent', m.color);
      const bar = el('div', 'win-bar');
      bar.append(el('span', 'dot r'), el('span', 'dot y'), el('span', 'dot g'));
      const body = el('div', 'mini-body');
      const head = el('div', 'mini-head');
      head.append(el('span', 'mini-emoji', m.emoji), el('strong', '', r.nama || 'Anon'));
      const tag = el('span', 'tag', r.genre || '—');
      tag.style.background = m.color;
      const song = el('p', 'mini-song', r.lagu || '—');
      const by = el('p', 'mini-by', r.artis || '—');
      body.append(head, tag, song, by);
      if (r.waktu) body.appendChild(el('p', 'mini-when', 'Dengar saat: ' + r.waktu));
      card.append(bar, body);
      container.appendChild(card);
      observe(card);
    });
  }

  function setCount(id, value, dec) {
    const node = document.getElementById(id);
    if (!node) return;
    node.dataset.count = String(value);
    node.dataset.dec = String(dec || 0);
    delete node.dataset.done;
    const root = node.closest('.reveal');
    if (root && root.classList.contains('in')) runCounters(root);
    else if (reduceMotion || !observer) node.textContent = Number(value).toFixed(dec || 0);
    else node.textContent = (0).toFixed(dec || 0);
  }

  function render(data, isDemo) {
    const total = data.total || 0;
    setCount('statTotal', total, 0);
    setCount('statRating', data.avgRating || 0, 1);

    const topGenre = (data.genres && data.genres[0]) ? data.genres[0].name : '—';
    const topPlatform = (data.platforms && data.platforms[0]) ? data.platforms[0].name : '—';
    $('#statGenre').textContent = topGenre;
    $('#statPlatform').textContent = topPlatform;

    renderBars($('#genreBars'), data.genres, total, (item) => metaOf(item.name).color);
    renderBars($('#platformBars'), data.platforms, total, (item, idx) => palette[(idx + 3) % palette.length]);
    renderRank($('#artistRank'), data.artists);
    renderRecent($('#recentGrid'), data.recent);

    const note = $('#demoNote');
    note.hidden = !isDemo;
    $('#resultsState').hidden = true;
  }

  /* ---------- Network ---------- */
  async function request(url, options) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CONFIG.TIMEOUT_MS);
    try {
      const res = await fetch(url, Object.assign({}, options, { signal: ctrl.signal, redirect: 'follow' }));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadResults() {
    const state = $('#resultsState');
    if (!isConfigured()) {
      render(DEMO, true);
      return;
    }
    state.hidden = false;
    state.textContent = 'Memuat hasil survei…';
    try {
      const data = await request(CONFIG.SCRIPT_URL, { method: 'GET' });
      if (!data || data.ok !== true) throw new Error((data && data.error) || 'Respons tidak valid');
      render(data, false);
    } catch (err) {
      state.hidden = false;
      state.textContent = 'Hasil belum bisa dimuat. Pastikan Web App sudah di-deploy dengan akses “Anyone”.';
    }
  }

  /* ---------- Form ---------- */
  const form = $('#surveyForm');
  const submitBtn = $('#submitBtn');
  const rating = $('#rating');
  const ratingOut = $('#ratingOut');
  const comment = $('#komentar');
  const commentCount = $('#komentarCount');

  function paintRating() {
    const v = Number(rating.value);
    ratingOut.textContent = v;
    const pct = ((v - 1) / 9) * 100;
    rating.style.setProperty('--p', pct + '%');
  }
  rating.addEventListener('input', paintRating);
  paintRating();

  comment.addEventListener('input', () => {
    commentCount.textContent = comment.value.length + '/200';
  });

  function setError(name, message) {
    const box = form.querySelector('[data-err="' + name + '"]');
    if (box) box.textContent = message || '';
    const field = box ? box.closest('.field') : null;
    if (field) field.classList.toggle('bad', !!message);
  }

  function validate() {
    let firstBad = null;
    const checks = [
      ['nama', () => form.nama.value.trim().length >= 2, 'Nama minimal 2 karakter.'],
      ['genre', () => !!form.querySelector('input[name="genre"]:checked'), 'Pilih satu genre favoritmu.'],
      ['artis', () => form.artis.value.trim().length >= 1, 'Tulis nama artis/band favoritmu.'],
      ['lagu', () => form.lagu.value.trim().length >= 1, 'Tulis judul lagu favoritmu.'],
      ['platform', () => !!form.querySelector('input[name="platform"]:checked'), 'Pilih platform yang paling sering dipakai.']
    ];
    checks.forEach(([name, test, msg]) => {
      const ok = test();
      setError(name, ok ? '' : msg);
      if (!ok && !firstBad) firstBad = form.querySelector('[data-err="' + name + '"]').closest('.field');
    });
    return firstBad;
  }

  ['nama', 'artis', 'lagu'].forEach((n) => form[n].addEventListener('input', () => setError(n, '')));
  $$('input[name="genre"]').forEach((i) => i.addEventListener('change', () => setError('genre', '')));
  $$('input[name="platform"]').forEach((i) => i.addEventListener('change', () => setError('platform', '')));

  function confetti() {
    if (reduceMotion) return;
    const colors = ['#ff3b5c', '#ff7a1a', '#ffd23f', '#3ddc84', '#1ec8c8', '#3b82f6', '#ff7ab8'];
    const glyphs = ['♪', '♫', '★', '●', '■'];
    const layer = el('div', 'confetti');
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 46; i++) {
      const p = el('span', '', glyphs[i % glyphs.length]);
      p.style.setProperty('--x', (Math.random() * 100) + 'vw');
      p.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
      p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      p.style.setProperty('--t', (1.8 + Math.random() * 1.6) + 's');
      p.style.setProperty('--dl', (Math.random() * 0.5) + 's');
      p.style.color = colors[i % colors.length];
      p.style.fontSize = (16 + Math.random() * 22) + 'px';
      layer.appendChild(p);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 4200);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const firstBad = validate();
    if (firstBad) {
      firstBad.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      toast('Ada kolom yang belum lengkap 👀', 'bad');
      return;
    }

    if (!isConfigured()) {
      toast('Link Web App belum diisi di app.js (CONFIG.SCRIPT_URL).', 'bad');
      return;
    }

    const payload = {
      nama: form.nama.value.trim(),
      usia: form.usia.value,
      genre: form.querySelector('input[name="genre"]:checked').value,
      artis: form.artis.value.trim(),
      lagu: form.lagu.value.trim(),
      platform: form.querySelector('input[name="platform"]:checked').value,
      waktu: (form.querySelector('input[name="waktu"]:checked') || {}).value || '',
      rating: Number(rating.value),
      komentar: comment.value.trim(),
      website: form.website.value
    };

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.querySelector('.btn-text').textContent = 'Mengirim…';

    try {
      // String body => text/plain, jadi tidak memicu CORS preflight di Apps Script
      const data = await request(CONFIG.SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      if (!data || data.ok !== true) throw new Error((data && data.error) || 'Gagal menyimpan');

      toast('Terima kasih! Jawabanmu sudah masuk 🎉', 'good');
      confetti();
      form.reset();
      paintRating();
      commentCount.textContent = '0/200';
      loadResults();
    } catch (err) {
      const msg = err && err.name === 'AbortError'
        ? 'Koneksi terlalu lama. Coba lagi ya.'
        : (err && err.message && err.message.indexOf('HTTP') !== 0 && err.message !== 'Failed to fetch' ? err.message : 'Gagal mengirim. Cek koneksi atau pengaturan Web App.');
      toast(msg, 'bad');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      submitBtn.querySelector('.btn-text').textContent = 'Kirim Jawaban';
    }
  });

  $('#year').textContent = new Date().getFullYear();
  loadResults();
})();
