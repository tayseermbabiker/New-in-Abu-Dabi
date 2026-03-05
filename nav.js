// NewInAbuDhabi — Shared Navigation Bar
(function () {
  // Inject CSS
  var style = document.createElement('style');
  style.textContent = [
    '.site-nav{position:sticky;top:0;z-index:500;background:var(--navy,#0c2340);border-bottom:1px solid rgba(255,255,255,0.08)}',
    '.site-nav-inner{max-width:1200px;margin:0 auto;padding:0 24px;display:flex;align-items:center;height:56px;gap:8px}',
    '.site-nav-brand{color:#fff;text-decoration:none;font-family:"Playfair Display",Georgia,serif;font-size:1.05rem;font-weight:700;white-space:nowrap;margin-right:auto}',
    '[dir="rtl"] .site-nav-brand{font-family:"Cairo",sans-serif;margin-right:0;margin-left:auto}',
    '.site-nav-links{display:flex;align-items:center;gap:4px;list-style:none;margin:0;padding:0}',
    '.site-nav-links a{color:rgba(255,255,255,0.75);text-decoration:none;font-size:0.82rem;font-weight:500;padding:6px 12px;border-radius:6px;transition:color 0.2s,background 0.2s;white-space:nowrap}',
    '.site-nav-links a:hover,.site-nav-links a.active{color:#fff;background:rgba(255,255,255,0.1)}',
    '.site-nav .nav-lang{display:flex;align-items:center;gap:3px;margin-left:12px;background:rgba(255,255,255,0.1);padding:4px 6px;border-radius:6px}',
    '[dir="rtl"] .site-nav .nav-lang{margin-left:0;margin-right:12px}',
    '.site-nav .nav-lang-btn{background:none;border:none;color:rgba(255,255,255,0.6);font-size:0.75rem;font-weight:600;padding:3px 8px;border-radius:4px;cursor:pointer;font-family:inherit;transition:all 0.2s}',
    '.site-nav .nav-lang-btn:hover{color:#fff}',
    '.site-nav .nav-lang-btn.active{color:#fff;background:var(--sunset,#d4894a)}',
    '.site-nav-toggle{display:none;background:none;border:none;color:#fff;padding:8px;cursor:pointer;margin-left:8px}',
    '[dir="rtl"] .site-nav-toggle{margin-left:0;margin-right:8px}',
    '@media(max-width:860px){',
    '  .site-nav-links{display:none;position:absolute;top:56px;left:0;right:0;flex-direction:column;background:var(--navy,#0c2340);padding:8px 24px 16px;border-bottom:1px solid rgba(255,255,255,0.08);gap:2px}',
    '  .site-nav-links.open{display:flex}',
    '  .site-nav-links a{padding:10px 12px;font-size:0.9rem}',
    '  .site-nav-toggle{display:block}',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // Determine current page
  var path = location.pathname.split('/').pop() || 'index.html';

  // Nav links
  var links = [
    { href: 'visa-legal.html', en: 'Visa & Legal', ar: '\u062A\u0623\u0634\u064A\u0631\u0627\u062A' },
    { href: 'newcomer-setup.html', en: 'Newcomer Setup', ar: '\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0642\u0627\u062F\u0645\u064A\u0646' },
    { href: 'transport-driving.html', en: 'Transport', ar: '\u0627\u0644\u0646\u0642\u0644' },
    { href: 'healthcare.html', en: 'Healthcare', ar: '\u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629' },
    { href: 'kids-education.html', en: 'Kids & Schools', ar: '\u0627\u0644\u0623\u0637\u0641\u0627\u0644' },
    { href: 'weekend-fun.html', en: 'Weekend Fun', ar: '\u0639\u0637\u0644\u0629 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639' }
  ];

  var linksHtml = links.map(function (l) {
    var cls = path === l.href ? ' class="active"' : '';
    return '<a href="' + l.href + '"' + cls + ' data-en="' + l.en + '" data-ar="' + l.ar + '">' + l.en + '</a>';
  }).join('');

  // Build nav
  var nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.innerHTML =
    '<div class="site-nav-inner">' +
      '<a href="index.html" class="site-nav-brand" data-en="New In Abu Dhabi" data-ar="\u062C\u062F\u064A\u062F \u0641\u064A \u0623\u0628\u0648\u0638\u0628\u064A">New In Abu Dhabi</a>' +
      '<ul class="site-nav-links" id="site-nav-links">' + linksHtml + '</ul>' +
      '<div class="nav-lang">' +
        '<button class="nav-lang-btn active" data-lang="en" onclick="switchLanguage(\'en\')">EN</button>' +
        '<button class="nav-lang-btn" data-lang="ar" onclick="switchLanguage(\'ar\')">AR</button>' +
      '</div>' +
      '<button class="site-nav-toggle" id="site-nav-toggle" aria-label="Menu">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
      '</button>' +
    '</div>';

  // Insert at top of body
  document.body.insertBefore(nav, document.body.firstChild);

  // Remove old lang-switcher if exists (guide pages have it as standalone)
  var oldSwitcher = document.querySelector('.lang-switcher');
  if (oldSwitcher) oldSwitcher.remove();

  // Mobile toggle
  document.getElementById('site-nav-toggle').addEventListener('click', function () {
    document.getElementById('site-nav-links').classList.toggle('open');
  });

  // Sync language state on load
  var saved = localStorage.getItem('selectedLanguage');
  if (saved === 'ar') {
    nav.querySelectorAll('.nav-lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === 'ar');
    });
  }

  // Listen for language changes to update nav buttons
  var origSwitch = window.switchLanguage;
  window.switchLanguage = function (lang) {
    if (origSwitch) origSwitch(lang);
    nav.querySelectorAll('.nav-lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    // Update nav data-en/data-ar elements
    nav.querySelectorAll('[data-en][data-ar]').forEach(function (el) {
      el.textContent = el.getAttribute(lang === 'ar' ? 'data-ar' : 'data-en');
    });
  };
})();
