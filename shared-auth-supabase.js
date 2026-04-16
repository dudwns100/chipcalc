/* ═══════════════════════════════════════════════════════════
   ChipCalc — shared-auth-supabase.js
   Supabase 인증 & 전역 로그인 상태 관리
   모든 페이지에서 공통 사용

   ⚠ shared-auth.js(더미 파일)와 함께 로드하면 충돌합니다.
     shared-auth.js는 삭제하거나 로드하지 마세요.
═══════════════════════════════════════════════════════════ */

var SUPA_URL = 'https://azouxvpthllgczbihppi.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6b3V4dnB0aGxsZ2N6YmlocHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzIzMTcsImV4cCI6MjA5MTY0ODMxN30.NCxy8WXBIyJ0INZkAzlsZMLZurfhCrIF4n_V1aUZQO0';

var supa = null;
var currentUser = null;

/* ── Supabase 초기화 (SDK 로드 대기) ── */
function _initSupabase() {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    supa = supabase.createClient(SUPA_URL, SUPA_KEY);
    _setupAuthListener();
  } else {
    setTimeout(_initSupabase, 80);
  }
}

/* ── 인증 상태 리스너 ── */
function _setupAuthListener() {
  supa.auth.onAuthStateChange(function(event, session) {
    currentUser = session ? session.user : null;
    _updateAuthUI();
    /* 페이지별 커스텀 콜백 — calculator.html 등에서 정의 가능 */
    if (typeof window.onAuthStateChanged === 'function') {
      window.onAuthStateChanged(event, session);
    }
  });
}

/* ── 공통 Auth UI 업데이트 ── */
function _updateAuthUI() {
  var authBtn = document.getElementById('authBtn');
  var saveBtn = document.getElementById('saveBtn');
  var histBtn = document.getElementById('histBtn');

  if (!authBtn) return;

  if (currentUser) {
    var meta = currentUser.user_metadata || {};
    var name = meta.full_name || meta.name || '사용자';
    var firstName = name.split(' ')[0];
    authBtn.innerHTML = '<span class="auth-icon">👤</span><span class="auth-text"> ' + firstName + ' · 로그아웃</span>';
    authBtn.classList.add('logged');
    if (saveBtn) saveBtn.style.display = 'flex';
    if (histBtn) histBtn.style.display = 'flex';
  } else {
    authBtn.innerHTML = '<span class="auth-icon">🔐</span><span class="auth-text"> Google 로그인</span>';
    authBtn.classList.remove('logged');
    if (saveBtn) saveBtn.style.display = 'none';
    if (histBtn) histBtn.style.display = 'none';
  }
}

/* ── 로그인 / 로그아웃 ── */
async function handleAuth() {
  if (!supa) {
    alert('인증 모듈이 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  if (currentUser) {
    await supa.auth.signOut();
  } else {
    await supa.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://dudwns100.github.io/chipcalc/' }
    });
  }
}

/* ── 토스트 메시지 (공통) ── */
function showToast(msg, duration) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'left:50%',
    'transform:translateX(-50%)',
    'background:#1c1c1e',
    'color:#fff',
    'padding:10px 20px',
    'border-radius:20px',
    'font-size:13px',
    'font-weight:500',
    'z-index:9999',
    'box-shadow:0 4px 16px rgba(0,0,0,0.2)',
    'font-family:var(--font)',
    'pointer-events:none'
  ].join(';');
  document.body.appendChild(t);
  setTimeout(function() {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(function() { t.remove(); }, 300);
  }, duration || 2500);
}

/* ── esc2 헬퍼 (XSS 방지) ── */
function esc2(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── 초기화 시작 ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initSupabase);
} else {
  _initSupabase();
}
