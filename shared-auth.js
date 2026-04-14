/* ═══════════════════════════════════════════════════════════
   ChipCalc Shared Authentication & State Management
   모든 페이지에서 공통으로 사용할 Google 로그인, 데이터 저장 로직
═══════════════════════════════════════════════════════════ */

// Google OAuth 설정
const GOOGLE_CLIENT_ID = '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com'; // 실제 ID로 교체 필요
const API_KEY = 'AIzaSyDummyKeyForDemo'; // 실제 API 키로 교체 필요

// 로그인 상태 및 사용자 정보
let currentUser = null;
let isLoggedIn = false;

// 페이지 로드 시 로그인 상태 복구
document.addEventListener('DOMContentLoaded', function(){
  restoreLoginState();
  updateAuthUI();
});

// 로그인 상태 복구
function restoreLoginState(){
  const savedUser = localStorage.getItem('chipcalc-user');
  if(savedUser){
    try{
      currentUser = JSON.parse(savedUser);
      isLoggedIn = true;
    }catch(e){
      isLoggedIn = false;
    }
  }
}

// 인증 UI 업데이트
function updateAuthUI(){
  const authBtn = document.getElementById('authBtn');
  const saveBtn = document.getElementById('saveBtn');
  const histBtn = document.getElementById('histBtn');
  
  if(!authBtn) return;
  
  if(isLoggedIn && currentUser){
    authBtn.innerHTML = `👤 ${currentUser.name}`;
    authBtn.onclick = handleLogout;
    if(saveBtn) saveBtn.style.display = 'inline-block';
    if(histBtn) histBtn.style.display = 'inline-block';
  } else {
    authBtn.innerHTML = '🔐 Google 로그인';
    authBtn.onclick = handleAuth;
    if(saveBtn) saveBtn.style.display = 'none';
    if(histBtn) histBtn.style.display = 'none';
  }
}

// Google 로그인 처리
function handleAuth(){
  // 실제 구현: Google Sign-In 라이브러리 사용
  // 데모용 로컬 로그인 시뮬레이션
  const userName = prompt('사용자 이름을 입력하세요:');
  if(userName){
    currentUser = {
      name: userName,
      email: userName + '@example.com',
      loginTime: new Date().toISOString()
    };
    isLoggedIn = true;
    localStorage.setItem('chipcalc-user', JSON.stringify(currentUser));
    updateAuthUI();
    alert('로그인되었습니다!');
  }
}

// 로그아웃 처리
function handleLogout(){
  if(confirm('로그아웃하시겠습니까?')){
    isLoggedIn = false;
    currentUser = null;
    localStorage.removeItem('chipcalc-user');
    localStorage.removeItem('chipcalc-calculations');
    updateAuthUI();
    alert('로그아웃되었습니다.');
  }
}

// 계산 결과 저장
function saveCalculation(data){
  if(!isLoggedIn){
    alert('로그인 후 저장할 수 있습니다.');
    return;
  }
  
  const calculations = JSON.parse(localStorage.getItem('chipcalc-calculations') || '[]');
  const newCalc = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    data: data,
    user: currentUser.email
  };
  
  calculations.push(newCalc);
  localStorage.setItem('chipcalc-calculations', JSON.stringify(calculations));
  alert('계산 결과가 저장되었습니다!');
}

// 저장된 계산 불러오기
function loadCalculations(){
  if(!isLoggedIn){
    alert('로그인 후 조회할 수 있습니다.');
    return [];
  }
  
  const calculations = JSON.parse(localStorage.getItem('chipcalc-calculations') || '[]');
  return calculations.filter(c => c.user === currentUser.email);
}

// 저장된 계산 삭제
function deleteCalculation(id){
  const calculations = JSON.parse(localStorage.getItem('chipcalc-calculations') || '[]');
  const filtered = calculations.filter(c => c.id !== id);
  localStorage.setItem('chipcalc-calculations', JSON.stringify(filtered));
}

// 저장 모달 열기 (calculator.html에서 호출)
function openSaveModal(){
  if(!isLoggedIn){
    alert('로그인 후 저장할 수 있습니다.');
    return;
  }
  // calculator.html에서 구현
  if(typeof showSaveDialog === 'function'){
    showSaveDialog();
  }
}

// 기록 보기 모달 열기 (calculator.html에서 호출)
function openHistory(){
  if(!isLoggedIn){
    alert('로그인 후 조회할 수 있습니다.');
    return;
  }
  // calculator.html에서 구현
  if(typeof showHistoryDialog === 'function'){
    showHistoryDialog();
  }
}
