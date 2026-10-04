// Shared behaviour for every page: active nav state, mobile menu, header shadow.
(function () {
  var header = document.getElementById('site-header');
  if (!header) return;

  var active = header.getAttribute('data-active');
  document.querySelectorAll('[data-nav="' + active + '"]').forEach(function (a) {
    a.setAttribute('aria-current', 'page');
  });

  var btn = document.getElementById('ec-menu-btn');
  var menu = document.getElementById('ec-mobile-menu');

  function setOpen(open) {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('ec-menu-open', open);
    if (open) {
      var first = menu.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    }
  }

  if (btn && menu) {
    btn.addEventListener('click', function () { setOpen(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); }
    });
    // Close if the viewport grows to desktop while the menu is open.
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  // Collapsible panels on mobile (e.g. product filters): <button data-ec-toggle="id">
  document.querySelectorAll('[data-ec-toggle]').forEach(function (b) {
    var panel = document.getElementById(b.getAttribute('data-ec-toggle'));
    if (!panel) return;
    b.addEventListener('click', function () {
      var open = panel.classList.toggle('max-lg:hidden') === false;
      b.setAttribute('aria-expanded', String(open));
      var chev = b.querySelector('.ec-chevron');
      if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
    });
  });

  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();
