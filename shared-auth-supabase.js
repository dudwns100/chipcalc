/* ═══════════════════════════════════════════════════════════════════════════
   SHARED SUPABASE AUTHENTICATION & STATE MANAGEMENT
   모든 페이지에서 공통으로 사용하는 로그인, 로그아웃, 사용자 상태 관리
═══════════════════════════════════════════════════════════════════════════ */

// ── Supabase 초기화 ──
const SUPA_URL = 'https://azouxvpthllgczbihppi.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6b3V4dnB0aGxsZ2N6YmlocHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzIzMTcsImV4cCI6MjA5MTY0ODMxN30.NCxy8WXBIyJ0INZkAzlsZMLZurfhCrIF4n_V1aUZQO0';

// Supabase 라이브러리가 로드될 때까지 대기
let supabaseReady = false;
let supa = null;

function initSupabase() {
  if (typeof supabase !== 'undefined') {
    supa = supabase.createClient(SUPA_URL, SUPA_KEY);
    supabaseReady = true;
    setupAuthListener();
  } else {
    setTimeout(initSupabase, 100);
  }
}

// ── 전역 사용자 상태 ──
let currentUser = null;

// ── 인증 상태 리스너 설정 ──
function setupAuthListener() {
  if (!supa) return;
  
  supa.auth.onAuthStateChange(function(event, session) {
    currentUser = session ? session.user : null;
    updateAuthUIGlobal();
    
    // 페이지별 커스텀 콜백 실행
    if (window.onAuthStateChanged) {
      window.onAuthStateChanged(event, session);
    }
  });
}

// ── 전역 GNB 인증 UI 업데이트 ──
function updateAuthUIGlobal() {
  const authBtn = document.getElementById('authBtn');
  const saveBtn = document.getElementById('saveBtn');
  const histBtn = document.getElementById('histBtn');
  
  if (!authBtn) return;
  
  if (currentUser) {
    // 로그인 상태
    const name = (currentUser.user_metadata && currentUser.user_metadata.name)
      ? currentUser.user_metadata.name.split(' ')[0]
      : '사용자';
    
    authBtn.textContent = '👤 ' + name + ' · 로그아웃';
    authBtn.classList.add('logged');
    
    // 저장/기록 버튼 표시 (계산기 페이지에만)
    if (saveBtn) saveBtn.style.display = 'flex';
    if (histBtn) histBtn.style.display = 'flex';
  } else {
    // 로그아웃 상태
    authBtn.textContent = '🔐 Google 로그인';
    authBtn.classList.remove('logged');
    
    // 저장/기록 버튼 숨김
    if (saveBtn) saveBtn.style.display = 'none';
    if (histBtn) histBtn.style.display = 'none';
  }
}

// ── 로그인/로그아웃 핸들러 ──
async function handleAuth() {
  if (!supa) {
    alert('Supabase가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  
  if (currentUser) {
    // 로그아웃
    await supa.auth.signOut();
  } else {
    // Google 로그인
    await supa.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://dudwns100.github.io/chipcalc/' }
    });
  }
}

// ── 초기화 시작 ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  initSupabase();
}
