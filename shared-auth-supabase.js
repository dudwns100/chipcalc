/* ═══════════════════════════════════════════════════════════
   ChipCalc — shared-auth-supabase.js
   Supabase 인증 & 전역 상태 관리
═══════════════════════════════════════════════════════════ */

var SUPA_URL = 'https://azouxvpthllgczbihppi.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6b3V4dnB0aGxsZ2N6YmlocHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzIzMTcsImV4cCI6MjA5MTY0ODMxN30.NCxy8WXBIyJ0INZkAzlsZMLZurfhCrIF4n_V1aUZQO0';

var supa = null;
var currentUser = null;
var _menuOpen = false;

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
  /* auth-hide 스타일 제거 (리다이렉트 없으면 화면 복원) */
  (function(){
    var s = document.getElementById('auth-hide');
    if (s) s.parentNode.removeChild(s);
  })();

  /* 페이지 로드 시: 세션 + returnTo 동시 확인 → 가장 신뢰성 높음 */
  supa.auth.getSession().then(function(res) {
    var session = res.data && res.data.session;
    if (session) {
      currentUser = session.user;
      _updateAuthUI();
      /* returnTo 확인 후 리다이렉트 */
      _handleReturnTo();
    }
  });

  /* 상태 변화 감지 (로그인/로그아웃 순간) */
  supa.auth.onAuthStateChange(function(event, session) {
    currentUser = session ? session.user : null;
    _updateAuthUI();

    if (event === 'SIGNED_IN') {
      _handleReturnTo();
    }

    if (typeof window.onAuthStateChanged === 'function') {
      window.onAuthStateChanged(event, session);
    }
  });
}

/* ── 로그인 후 원래 페이지 복귀 ── */
function _handleReturnTo() {
  var returnTo = '';
  try { returnTo = localStorage.getItem('chipcalc-return') || ''; } catch(e) {}
  if (!returnTo) return;

  /* 현재 URL과 다를 때만 이동 (무한루프 방지) */
  var current = window.location.origin + window.location.pathname;
  var target  = returnTo.split('#')[0]; /* 해시 제거 비교 */
  if (target && target !== current) {
    try { localStorage.removeItem('chipcalc-return'); } catch(e) {}
    window.location.href = returnTo;
  } else {
    try { localStorage.removeItem('chipcalc-return'); } catch(e) {}
  }
}

/* ── Auth UI 업데이트 ── */
function _updateAuthUI() {
  var authBtn = document.getElementById('authBtn');
  /* saveBtn/histBtn — calculator.html에만 존재 */
  var saveBtn = document.getElementById('saveBtn');
  var histBtn = document.getElementById('histBtn');

  if (!authBtn) return;

  if (currentUser) {
    var meta = currentUser.user_metadata || {};
    var name = meta.full_name || meta.name || '사용자';
    var firstName = name.split(' ')[0];

    authBtn.innerHTML = '<span class="auth-icon">👤</span>'
      + '<span class="auth-text"> ' + firstName + '</span>';
    authBtn.classList.add('logged');
    authBtn.onclick = _toggleUserMenu;

    /* 드롭다운 생성/업데이트 */
    _buildUserMenu(firstName, currentUser.email || '');

    /* 기존 info 툴팁 숨김 */
    var tip = authBtn.closest('.auth-tip-wrap');
    if (tip) {
      var infoTip = tip.querySelector('.auth-tip');
      if (infoTip) infoTip.style.display = 'none';
    }

    /* 저장/기록: calculator.html에만 존재하므로 요소가 있을 때만 표시 */
    if (saveBtn) saveBtn.style.display = 'flex';
    if (histBtn) histBtn.style.display = 'flex';

    /* 드로어 액션: calculator.html에만 */
    var da = document.getElementById('drawerActions');
    if (da) da.classList.add('visible');

  } else {
    authBtn.innerHTML = '<span class="auth-icon">🔐</span>'
      + '<span class="auth-text"> Google 로그인</span>';
    authBtn.classList.remove('logged');
    authBtn.onclick = handleAuth;

    /* info 툴팁 복원 */
    var tip2 = authBtn.closest('.auth-tip-wrap');
    if (tip2) {
      var infoTip2 = tip2.querySelector('.auth-tip');
      if (infoTip2) infoTip2.style.display = '';
    }

    /* 유저 메뉴 숨김 */
    var menu = document.getElementById('userMenu');
    if (menu) { menu.style.display = 'none'; _menuOpen = false; }

    if (saveBtn) saveBtn.style.display = 'none';
    if (histBtn) histBtn.style.display = 'none';

    var da2 = document.getElementById('drawerActions');
    if (da2) da2.classList.remove('visible');
  }
}

/* ── 유저 드롭다운 메뉴 생성 (body에 fixed로 추가 → stacking context 이슈 방지) ── */
function _buildUserMenu(name, email) {
  var existing = document.getElementById('userMenu');
  if (existing) {
    var n = document.getElementById('_um_name');
    var e = document.getElementById('_um_email');
    if (n) n.textContent = name;
    if (e) e.textContent = email;
    return;
  }

  var menu = document.createElement('div');
  menu.id = 'userMenu';
  menu.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;padding:14px 14px 10px">'
    + '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#0071e3,#0051a8);color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
    + (name ? name[0].toUpperCase() : '?')
    + '</div>'
    + '<div style="min-width:0">'
    + '<div id="_um_name" style="font-size:13px;font-weight:700;color:#1c1c1e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _esc(name) + '</div>'
    + '<div id="_um_email" style="font-size:10.5px;color:#6b6b70;margin-top:1px;word-break:break-all">' + _esc(email) + '</div>'
    + '</div></div>'
    + '<div style="height:1px;background:rgba(0,0,0,0.08);margin:0"></div>'
    + '<button onclick="handleAuth()" style="display:flex;align-items:center;gap:8px;width:100%;padding:11px 14px;border:none;background:transparent;color:#e4362a;font-size:13px;font-weight:600;cursor:pointer;text-align:left;font-family:inherit;transition:background 0.12s" onmouseover="this.style.background=\'#fff1f0\'" onmouseout="this.style.background=\'transparent\'">'
    + '🚪 로그아웃'
    + '</button>';

  /* fixed 스타일 — body에 직접 추가 */
  menu.style.cssText = [
    'position:fixed',
    'z-index:99999',
    'background:#fff',
    'border:1px solid rgba(0,0,0,0.1)',
    'border-radius:12px',
    'box-shadow:0 8px 30px rgba(0,0,0,0.15)',
    'width:220px',
    'display:none',
    'overflow:hidden'
  ].join(';');

  document.body.appendChild(menu);

  /* 다크모드 대응 */
  if (document.body.classList.contains('dark')) {
    menu.style.background = '#2c2c2e';
    menu.style.border = '1px solid rgba(255,255,255,0.12)';
    var nameEl = document.getElementById('_um_name');
    if (nameEl) nameEl.style.color = '#f2f2f7';
  }

  /* 외부 클릭 닫기 */
  document.addEventListener('click', function(e) {
    var authBtn = document.getElementById('authBtn');
    if (_menuOpen && !menu.contains(e.target) && e.target !== authBtn && !authBtn.contains(e.target)) {
      menu.style.display = 'none';
      _menuOpen = false;
    }
  });
}

/* ── 유저 메뉴 토글 ── */
function _toggleUserMenu(e) {
  if (e) e.stopPropagation();
  var menu = document.getElementById('userMenu');
  var authBtn = document.getElementById('authBtn');
  if (!menu || !authBtn) return;

  _menuOpen = !_menuOpen;
  if (_menuOpen) {
    /* authBtn 위치 기준으로 fixed 좌표 계산 */
    var rect = authBtn.getBoundingClientRect();
    menu.style.top  = (rect.bottom + 6) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.style.left = 'auto';
    menu.style.display = 'block';
    /* 다크모드 실시간 */
    if (document.body.classList.contains('dark')) {
      menu.style.background = '#2c2c2e';
      menu.style.border = '1px solid rgba(255,255,255,0.12)';
    } else {
      menu.style.background = '#fff';
      menu.style.border = '1px solid rgba(0,0,0,0.1)';
    }
  } else {
    menu.style.display = 'none';
  }
}

/* ── 로그인 / 로그아웃 ── */
async function handleAuth() {
  if (!supa) { alert('인증 모듈 로드 중입니다. 잠시 후 다시 시도해주세요.'); return; }

  /* 메뉴 닫기 */
  var menu = document.getElementById('userMenu');
  if (menu) { menu.style.display = 'none'; _menuOpen = false; }

  if (currentUser) {
    await supa.auth.signOut();
  } else {
    /* 현재 페이지 저장 */
    try { localStorage.setItem('chipcalc-return', window.location.href); } catch(e) {}
    await supa.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://dudwns100.github.io/chipcalc/' }
    });
  }
}

/* ── 유틸 ── */
function _esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function esc2(s) { return _esc(s); }

function showToast(msg, duration) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1c1c1e;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:500;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,0.2);pointer-events:none;font-family:-apple-system,sans-serif';
  document.body.appendChild(t);
  setTimeout(function() {
    t.style.opacity = '0'; t.style.transition = 'opacity 0.3s';
    setTimeout(function() { if(t.parentNode) t.parentNode.removeChild(t); }, 350);
  }, duration || 2500);
}

/* ── 초기화 ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initSupabase);
} else {
  _initSupabase();
}
