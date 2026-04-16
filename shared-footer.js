/* ═══════════════════════════════════════════════════════════
   ChipCalc — shared-footer.js
   모든 페이지 공통 footer 자동 주입
   연도 자동 갱신, 링크 통일 관리
═══════════════════════════════════════════════════════════ */

(function () {
  var year = new Date().getFullYear();

  var html = [
    '<div class="footer-links">',
    '  <a href="index.html">홈</a>',
    '  <a href="calculator.html">계산기</a>',
    '  <a href="fab-explorer.html">Fab Explorer</a>',
    '  <a href="guide-semiconductor-cost.html">원가 가이드</a>',
    '  <a href="guide-chips-per-wafer.html">DPW 가이드</a>',
    '  <a href="about.html">About</a>',
    '  <a href="privacy.html">Privacy</a>',
    '  <a href="https://github.com/dudwns100/chipcalc" target="_blank" rel="noopener">GitHub</a>',
    '</div>',
    '<div>\u00a9 ' + year + ' ChipCalc \u00b7 \ubaa8\ub4e0 \uac00\uaca9 \ub370\uc774\ud130\ub294 \uacf5\uac1c \uc790\ub8cc \uae30\ubc18 \ucd94\uc815\uce58\uc785\ub2c8\ub2e4.</div>',
  ].join('\n');

  function inject() {
    var existing = document.querySelector('footer');
    if (existing) {
      existing.innerHTML = html;
    } else {
      var footer = document.createElement('footer');
      footer.innerHTML = html;
      document.body.appendChild(footer);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
