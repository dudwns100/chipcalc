/* ═══════════════════════════════════════════════════════════
   ChipCalc — shared-auth-supabase.js
   Supabase 인증 & 전역 로그인 상태 관리
═══════════════════════════════════════════════════════════ */

var SUPA_URL = 'https://azouxvpthllgczbihppi.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6b3V4dnB0aGxsZ2N6YmlocHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzIzMTcsImV4cCI6MjA5MTY0ODMxN30.NCxy8WXBIyJ0INZkAzlsZMLZurfhCrIF4n_V1aUZQO0';

var supa = null;
var currentUser = null;

/* ── Supabase 초기화 ── */
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

    /* ── 로그인 직후: 저장해둔 페이지로 복귀 ── */
    if (event === 'SIGNED_IN') {
      var returnTo = localStorage.getItem('chipcalc-return');
      if (returnTo && returnTo !== window.location.href) {
        localStorage.removeItem('chipcalc-return');
        window.location.href = returnTo;
        return;
      }
      localStorage.removeItem('chipcalc-return');
    }

    if (typeof window.onAuthStateChanged === 'function') {
      window.onAuthStateChanged(event, session);
    }
  });
}

/* ── Auth UI 업데이트 ── */
function _updateAuthUI() {
  var authBtn = document.getElementById('authBtn');
  var saveBtn = document.getElementById('saveBtn');
  var histBtn = document.getElementById('histBtn');
  if (!authBtn) return;

  if (currentUser) {
    var meta = currentUser.user_metadata || {};
    var name = meta.full_name || meta.name || '사용자';
    var firstName = name.split(' ')[0];
    var email = currentUser.email || '';

    /* 버튼: 아이콘 + 텍스트 span 구조 */
    authBtn.innerHTML = '<span class="auth-icon">👤</span><span class="auth-text"> ' + firstName + '</span>';
    authBtn.classList.add('logged');
    authBtn.onclick = _toggleUserMenu;

    /* 유저 드롭다운 메뉴 업데이트 */
    _ensureUserMenu(firstName, email);

    if (saveBtn) saveBtn.style.display = 'flex';
    if (histBtn) histBtn.style.display = 'flex';
  } else {
    authBtn.innerHTML = '<span class="auth-icon">🔐</span><span class="auth-text"> Google 로그인</span>';
    authBtn.classList.remove('logged');
    authBtn.onclick = handleAuth;

    /* 유저 메뉴 숨김 */
    var menu = document.getElementById('userMenu');
    if (menu) { menu.classList.remove('open'); }

    if (saveBtn) saveBtn.style.display = 'none';
    if (histBtn) histBtn.style.display = 'none';
  }
}

/* ── 유저 드롭다운 메뉴 생성/업데이트 ── */
function _ensureUserMenu(name, email) {
  var existing = document.getElementById('userMenu');
  if (existing) {
    var n = document.getElementById('userMenuName');
    var e = document.getElementById('userMenuEmail');
    if (n) n.textContent = name;
    if (e) e.textContent = email;
    return;
  }

  /* 메뉴 DOM 생성 */
  var wrap = document.querySelector('.auth-tip-wrap');
  if (!wrap) return;

  var menu = document.createElement('div');
  menu.id = 'userMenu';
  menu.className = 'user-menu';
  menu.innerHTML =
    '<div class="user-menu-profile">' +
      '<div class="user-menu-avatar">' + (name ? name[0].toUpperCase() : '?') + '</div>' +
      '<div>' +
        '<div class="user-menu-name" id="userMenuName">' + name + '</div>' +
        '<div class="user-menu-email" id="userMenuEmail">' + email + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="user-menu-divider"></div>' +
    '<button class="user-menu-logout" onclick="handleAuth()">🚪 로그아웃</button>';

  wrap.appendChild(menu);

  /* 외부 클릭 시 닫기 */
  document.addEventListener('click', function(e) {
    if (!wrap.contains(e.target)) {
      menu.classList.remove('open');
    }
  });
}

/* ── 유저 메뉴 토글 ── */
function _toggleUserMenu(e) {
  e.stopPropagation();
  var menu = document.getElementById('userMenu');
  if (menu) menu.classList.toggle('open');
}

/* ── 로그인 / 로그아웃 ── */
async function handleAuth() {
  if (!supa) { alert('인증 모듈이 로드되지 않았습니다. 잠시 후 다시 시도해주세요.'); return; }

  if (currentUser) {
    /* 유저 메뉴 닫기 */
    var menu = document.getElementById('userMenu');
    if (menu) menu.classList.remove('open');
    await supa.auth.signOut();
  } else {
    /* 현재 페이지 저장 → 로그인 후 복귀 */
    localStorage.setItem('chipcalc-return', window.location.href);
    await supa.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://dudwns100.github.io/chipcalc/' }
    });
  }
}

/* ── 공통 유틸 ── */
function showToast(msg, duration) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1c1c1e;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:500;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2);pointer-events:none';
  document.body.appendChild(t);
  setTimeout(function() {
    t.style.opacity = '0'; t.style.transition = 'opacity 0.3s';
    setTimeout(function() { t.remove(); }, 300);
  }, duration || 2500);
}

function esc2(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── 초기화 ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initSupabase);
} else {
  _initSupabase();
}
