// shared/chipcalc-init.js
// 전역 ChipCalc 네임스페이스 초기화 — 반드시 가장 먼저 로드
window.ChipCalc = {
  engine: null,
  parser: null,
  storage: null,
  ui: null,
  chart: null,
  state: {
    portfolioData: []  // FR27: 세션 메모리 전용, localStorage 미저장
  }
}
