/* ═══════════════════════════════════════════════════════════
   ChipCalc — shared-styles.js
   다크모드, 언어 설정, 모바일 네비게이션 공통 관리
   모든 페이지에서 로드됩니다.
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var STORAGE_MODE = 'chipcalc-mode';
  var STORAGE_LANG = 'chipcalc-lang';

  var savedMode = 'light';
  var savedLang = 'ko';
  try {
    savedMode = localStorage.getItem(STORAGE_MODE) || 'light';
    savedLang = localStorage.getItem(STORAGE_LANG) || 'ko';
  } catch(e) {}

  /* ── 다크모드 즉시 적용 (FOUC 방지) ── */
  if (savedMode === 'dark') {
    document.body.classList.add('dark');
  }

  function syncUI() {
    applyMode(savedMode, false);
    applyLang(savedLang, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncUI);
  } else {
    syncUI();
  }

  /* ── 다크모드 ── */
  function applyMode(m, save) {
    document.body.classList.toggle('dark', m === 'dark');
    var btnL = document.getElementById('btn-light');
    var btnD = document.getElementById('btn-dark');
    if (btnL) btnL.classList.toggle('active', m === 'light');
    if (btnD) btnD.classList.toggle('active', m === 'dark');
    if (save) { try { localStorage.setItem(STORAGE_MODE, m); } catch(e) {} }
    savedMode = m;
  }

  window.setMode = function(m) { applyMode(m, true); };

  /* ── 언어 설정 ── */
  function applyLang(l, save) {
    var btnKo = document.getElementById('btn-ko');
    var btnEn = document.getElementById('btn-en');
    if (btnKo) btnKo.classList.toggle('active', l === 'ko');
    if (btnEn) btnEn.classList.toggle('active', l === 'en');
    if (save) { try { localStorage.setItem(STORAGE_LANG, l); } catch(e) {} }
    savedLang = l;
  }

  if (!window.setLang) {
    window.setLang = function(l) { applyLang(l, true); };
  }

  window.getCurrentLang = function() { return savedLang; };

  /* ══════════════════════════════════════
     모바일 네비게이션 — 모든 페이지 공용
     햄버거 버튼 ↔ 드로어 토글
  ══════════════════════════════════════ */
  window.toggleMobileNav = function() {
    var drawer = document.getElementById('navDrawer');
    var btn    = document.getElementById('navHamburger');
    if (!drawer || !btn) return;
    var isOpen = drawer.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
  };

  /* 드로어 외부 클릭 시 닫기 */
  document.addEventListener('click', function(e) {
    var drawer = document.getElementById('navDrawer');
    var btn    = document.getElementById('navHamburger');
    if (!drawer || !btn) return;
    if (drawer.classList.contains('open') &&
        !drawer.contains(e.target) &&
        !btn.contains(e.target)) {
      drawer.classList.remove('open');
      btn.classList.remove('open');
    }
  });

})();
