/* ═══════════════════════════════════════════════════════════
   ChipCalc Shared Styles & State Management
   모든 페이지에서 공통으로 사용할 다크모드, 언어 설정 로직
═══════════════════════════════════════════════════════════ */

(function(){
  // ── 저장된 설정 불러오기 ──
  const savedMode = localStorage.getItem('chipcalc-mode') || 'light';
  const savedLang = localStorage.getItem('chipcalc-lang') || 'ko';
  
  // ── 초기 상태 적용 ──
  applyMode(savedMode);
  applyLang(savedLang);
  
  // ── 모드 변경 함수 ──
  window.setMode = function(m){
    localStorage.setItem('chipcalc-mode', m);
    applyMode(m);
  };
  
  function applyMode(m){
    document.body.classList.toggle('dark', m === 'dark');
    const btnLight = document.getElementById('btn-light');
    const btnDark = document.getElementById('btn-dark');
    if(btnLight) btnLight.classList.toggle('active', m === 'light');
    if(btnDark) btnDark.classList.toggle('active', m === 'dark');
  }
  
  // ── 언어 변경 함수 ──
  window.setLang = function(l){
    localStorage.setItem('chipcalc-lang', l);
    applyLang(l);
    location.reload();
  };
  
  function applyLang(l){
    const btnKo = document.getElementById('btn-ko');
    const btnEn = document.getElementById('btn-en');
    if(btnKo) btnKo.classList.toggle('active', l === 'ko');
    if(btnEn) btnEn.classList.toggle('active', l === 'en');
  }
})();
