/* Oxyhelp — comportament: limbă RO/EN, meniu, apariții, carusel, bandă de interioare */
(function () {
  var root = document.documentElement;

  /* ----- limbă: textul românesc stă în HTML, cel englezesc în data-en ----- */
  var nodes = [].slice.call(document.querySelectorAll('[data-en]'));
  var attrNodes = [].slice.call(document.querySelectorAll('[data-en-alt],[data-en-label],[data-en-href]'));
  nodes.forEach(function (n) { n.setAttribute('data-ro', n.innerHTML); });
  attrNodes.forEach(function (n) {
    if (n.hasAttribute('data-en-alt')) n.setAttribute('data-ro-alt', n.getAttribute('alt') || '');
    if (n.hasAttribute('data-en-label')) n.setAttribute('data-ro-label', n.getAttribute('aria-label') || '');
    if (n.hasAttribute('data-en-href')) n.setAttribute('data-ro-href', n.getAttribute('href') || '');
  });
  var titleRo = document.title;
  var titleEn = (document.querySelector('meta[name="title-en"]') || {}).content;

  function setLang(l) {
    root.lang = l; root.setAttribute('data-lang', l);
    nodes.forEach(function (n) { n.innerHTML = n.getAttribute('data-' + l); });
    attrNodes.forEach(function (n) {
      if (n.hasAttribute('data-en-alt')) n.setAttribute('alt', n.getAttribute('data-' + l + '-alt'));
      if (n.hasAttribute('data-en-label')) n.setAttribute('aria-label', n.getAttribute('data-' + l + '-label'));
      if (n.hasAttribute('data-en-href')) n.setAttribute('href', n.getAttribute('data-' + l + '-href'));
    });
    if (titleEn) document.title = l === 'en' ? titleEn : titleRo;
    [].forEach.call(document.querySelectorAll('.lang button'), function (b) {
      b.setAttribute('aria-pressed', String(b.value === l));
    });
    try { localStorage.setItem('oxy-lang', l); } catch (e) {}
    document.dispatchEvent(new CustomEvent('langchange', { detail: l }));
  }
  var saved = 'ro';
  try { saved = localStorage.getItem('oxy-lang') || 'ro'; } catch (e) {}
  if (saved === 'en') setLang('en');
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.lang button');
    if (b) setLang(b.value);
  });

  /* ----- meniu pe telefon ----- */
  var mb = document.querySelector('.menu-btn');
  if (mb) {
    mb.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      mb.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) mb.click();
    });
  }

  /* ----- apariții la derulare ----- */
  requestAnimationFrame(function () { document.body.classList.add('loaded'); });
  var rv = [].slice.call(document.querySelectorAll('.rv'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rv.forEach(function (n) { io.observe(n); });
  } else { rv.forEach(function (n) { n.classList.add('in'); }); }

  /* ----- bandă: alege interiorul ----- */
  [].forEach.call(document.querySelectorAll('.band'), function (band) {
    var ps = [].slice.call(band.querySelectorAll('.band__p'));
    function pick(p) { ps.forEach(function (x) { x.setAttribute('aria-pressed', String(x === p)); }); }
    ps.forEach(function (p) {
      p.addEventListener('click', function () { pick(p); });
      p.addEventListener('mouseenter', function () { if (matchMedia('(hover:hover) and (min-width:761px)').matches) pick(p); });
    });
  });

  /* ----- carusel ----- */
  [].forEach.call(document.querySelectorAll('.car'), function (car) {
    var track = car.querySelector('.car__track');
    var slides = [].slice.call(track.children);
    var prev = car.querySelector('[data-dir="-1"]'), next = car.querySelector('[data-dir="1"]');
    var count = car.querySelector('.car__count'), dots = car.querySelector('.car__dots');
    var cur = 0;
    slides.forEach(function (s, i) {
      if (!dots) return;
      var d = document.createElement('button');
      d.type = 'button'; d.setAttribute('aria-label', (i + 1) + ' / ' + slides.length);
      d.addEventListener('click', function () { go(i); });
      dots.appendChild(d);
    });
    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      cur = i;
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft), behavior: 'smooth' });
    }
    function sync() {
      var x = track.scrollLeft + parseFloat(getComputedStyle(track).paddingLeft), best = 0, bd = 1e9;
      slides.forEach(function (s, i) { var d = Math.abs(s.offsetLeft - track.offsetLeft - x); if (d < bd) { bd = d; best = i; } });
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) best = Math.max(best, cur > best ? cur : best);
      cur = best;
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      if (count) count.textContent = (cur + 1) + ' / ' + slides.length;
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = atEnd;
      if (dots) [].forEach.call(dots.children, function (d, i) { d.setAttribute('aria-current', String(i === cur)); });
    }
    if (prev) prev.addEventListener('click', function () { go(cur - 1); });
    if (next) next.addEventListener('click', function () { go(cur + 1); });
    track.addEventListener('scroll', sync, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
    });
    window.addEventListener('resize', sync);
    sync();
  });
})();

/* ----- calendar de evenimente: desenează lunile din lista de evenimente ----- */
(function () {
  var box = document.querySelector('.cal__months');
  var items = [].slice.call(document.querySelectorAll('.cal__list li[data-start]'));
  if (!box || !items.length) return;
  var WD = { ro: ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'], en: ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'] };
  function d(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function draw() {
    var lang = document.documentElement.getAttribute('data-lang') || 'ro';
    var months = {};
    items.forEach(function (li) { var s = d(li.dataset.start); months[s.getFullYear() + '-' + s.getMonth()] = [s.getFullYear(), s.getMonth()]; });
    box.innerHTML = '';
    Object.keys(months).forEach(function (k) {
      var y = months[k][0], m = months[k][1];
      var el = document.createElement('div'); el.className = 'cal__m';
      var h = document.createElement('h3');
      h.textContent = new Date(y, m, 1).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ro-RO', { month: 'long', year: 'numeric' });
      var g = document.createElement('div'); g.className = 'cal__g';
      WD[lang].forEach(function (w) { var s = document.createElement('span'); s.className = 'wd'; s.textContent = w; g.appendChild(s); });
      var first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
      for (var i = 0; i < first; i++) g.appendChild(document.createElement('span'));
      for (var day = 1; day <= days; day++) {
        var cur = new Date(y, m, day), hit = null;
        items.forEach(function (li) { if (cur >= d(li.dataset.start) && cur <= d(li.dataset.end)) hit = li; });
        var c = document.createElement(hit ? 'button' : 'span');
        c.textContent = day;
        if (hit) (function (li, btn) {
          btn.type = 'button';
          btn.setAttribute('aria-label', day + ' — ' + li.querySelector('b').textContent);
          btn.addEventListener('click', function () {
            items.forEach(function (x) { x.classList.toggle('is-on', x === li); });
            [].forEach.call(box.querySelectorAll('button'), function (b) { b.classList.toggle('is-on', b.dataset.ev === li.dataset.start); });
            li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          });
          btn.dataset.ev = li.dataset.start;
        })(hit, c);
        g.appendChild(c);
      }
      el.appendChild(h); el.appendChild(g); box.appendChild(el);
    });
  }
  draw();
  document.addEventListener('langchange', draw);
})();
