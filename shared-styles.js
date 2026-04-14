/* ═══════════════════════════════════════════════════════════
   ChipCalc — shared-styles.js
   다크모드 & 언어 설정 공통 관리
   모든 페이지에서 <script src="shared-styles.js"> 로 로드
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var STORAGE_MODE = 'chipcalc-mode';
  var STORAGE_LANG = 'chipcalc-lang';

  /* ── 저장된 값 읽기 ── */
  var savedMode = '';
  var savedLang = '';
  try {
    savedMode = localStorage.getItem(STORAGE_MODE) || 'light';
    savedLang = localStorage.getItem(STORAGE_LANG) || 'ko';
  } catch(e) {
    savedMode = 'light';
    savedLang = 'ko';
  }

  /* ── 다크모드 즉시 적용 (FOUC 방지) ── */
  if (savedMode === 'dark') {
    document.documentElement.classList.add('dark-init');
  }

  /* ── DOM 준비 후 버튼 상태 동기화 ── */
  function syncUI() {
    applyMode(savedMode, false);
    applyLang(savedLang, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncUI);
  } else {
    syncUI();
  }

  /* ─────────────────────────────────────
     다크모드
  ───────────────────────────────────── */
  function applyMode(m, save) {
    document.body.classList.toggle('dark', m === 'dark');
    var btnL = document.getElementById('btn-light');
    var btnD = document.getElementById('btn-dark');
    if (btnL) btnL.classList.toggle('active', m === 'light');
    if (btnD) btnD.classList.toggle('active', m === 'dark');
    if (save) {
      try { localStorage.setItem(STORAGE_MODE, m); } catch(e) {}
    }
    savedMode = m;
  }

  window.setMode = function(m) {
    applyMode(m, true);
  };

  /* ─────────────────────────────────────
     언어 설정
     ※ calculator.html은 자체 setLang()을 재정의하므로
       이 기본 구현은 가이드·about 등 단순 페이지용
  ───────────────────────────────────── */
  function applyLang(l, save) {
    var btnKo = document.getElementById('btn-ko');
    var btnEn = document.getElementById('btn-en');
    if (btnKo) btnKo.classList.toggle('active', l === 'ko');
    if (btnEn) btnEn.classList.toggle('active', l === 'en');
    if (save) {
      try { localStorage.setItem(STORAGE_LANG, l); } catch(e) {}
    }
    savedLang = l;
  }

  /* 기본 setLang — calculator.html은 자체 구현으로 덮어씀 */
  if (!window.setLang) {
    window.setLang = function(l) {
      applyLang(l, true);
      /* ⚠ location.reload() 제거 — 계산기 상태 보존을 위해
         간단한 페이지는 필요 없고, calculator는 자체 setLang() 사용 */
    };
  }

  /* 현재 언어 반환 헬퍼 */
  window.getCurrentLang = function() {
    return savedLang;
  };

})();
