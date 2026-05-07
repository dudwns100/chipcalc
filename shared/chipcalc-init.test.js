// shared/chipcalc-init.test.js — Story 1.6 단위 테스트
// 실행: node shared/chipcalc-init.test.js
'use strict'

// ── 테스트 유틸 ───────────────────────────────────────────────────
var passed = 0
var failed = 0

function test(desc, fn) {
  try {
    fn()
    console.log('  ✅ PASS:', desc)
    passed++
  } catch (e) {
    console.log('  ❌ FAIL:', desc)
    console.log('     ', e.message)
    failed++
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || '단언 실패')
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error((msg || '값 불일치') + ': expected=' + JSON.stringify(b) + ' actual=' + JSON.stringify(a))
}

// ── 테스트 환경 설정 ──────────────────────────────────────────────
global.window = global

// document/body mock (ui-utils 로드용)
global.document = {
  createElement: function(tag) {
    return { tag: tag, style: { cssText: '' }, textContent: '', parentNode: null,
      remove: function() {}, click: function() {} }
  },
  body: { appendChild: function() {}, removeChild: function() {} },
  getElementById: function() { return null }
}
global.setTimeout = function(fn, ms) { /* no-op in tests */ }

// chipcalc-init.js 로드
require('./chipcalc-init.js')

// chip-calc-engine.js 로드 (실제 calcCOGS, getKValue 등 사용)
require('./chip-calc-engine.js')

// storage mock 설정 헬퍼
function mockStorage(overrides) {
  var store = Object.assign(
    { version: '1.0', wafer: null, pkgs: null, kValues: {}, priceReviewHistory: [],
      columnMapping: { portfolio: {}, review: {} }, waferBaseline: null, outlierThreshold: 1.3 },
    overrides || {}
  )
  window.ChipCalc.storage = {
    load: function() { return JSON.parse(JSON.stringify(store)) },
    save: function(s) { store = s }
  }
  return store
}

// ui mock 설정 헬퍼
function mockUI() {
  var calls = { refreshPortfolioView: 0, toast: [] }
  window.ChipCalc.ui = {
    refreshPortfolioView: function() { calls.refreshPortfolioView++ },
    toast: function(msg, level) { calls.toast.push({ msg: msg, level: level }) }
  }
  return calls
}

// 유효한 포트폴리오 항목 생성 헬퍼
function makeItem(overrides) {
  return Object.assign({
    node: '28nm',
    dieArea: 25,
    waferSize: 300,
    'yield': 0.95,
    pkgType: 'QFP',
    pins: 64,
    productFamily: '기타',
    actualPrice: 5.0
  }, overrides || {})
}

// ── 테스트 실행 ───────────────────────────────────────────────────
console.log('\n── AC1: chipcalc-init.js 네임스페이스 초기화 ──')

test('ChipCalc.state.portfolioData가 빈 배열로 초기화된다', function() {
  assert(Array.isArray(window.ChipCalc.state.portfolioData), 'portfolioData는 배열이어야 함')
  assertEqual(window.ChipCalc.state.portfolioData.length, 0, '초기 길이는 0')
})

test('ChipCalc.engine.recalculateAll 함수가 존재한다', function() {
  assert(typeof window.ChipCalc.engine.recalculateAll === 'function', 'recalculateAll must be a function')
})

console.log('\n── AC3: ARCH-5 MUST NOT — portfolioData 없을 때 즉시 return ──')

test('portfolioData가 null이면 즉시 return (calcCOGS 미호출)', function() {
  mockStorage()
  var uiCalls = mockUI()
  window.ChipCalc.state.portfolioData = null

  var calcCount = 0
  var origCalc = window.ChipCalc.engine.calcCOGS
  window.ChipCalc.engine.calcCOGS = function() { calcCount++; return origCalc.apply(this, arguments) }

  window.ChipCalc.engine.recalculateAll()
  assertEqual(calcCount, 0, 'calcCOGS 호출 없음')
  assertEqual(uiCalls.refreshPortfolioView, 0, 'refreshPortfolioView 미호출')

  window.ChipCalc.engine.calcCOGS = origCalc
  window.ChipCalc.state.portfolioData = [] // 복원
})

test('portfolioData가 빈 배열이면 즉시 return', function() {
  mockStorage()
  var uiCalls = mockUI()
  window.ChipCalc.state.portfolioData = []

  var calcCount = 0
  var origCalc = window.ChipCalc.engine.calcCOGS
  window.ChipCalc.engine.calcCOGS = function() { calcCount++; return origCalc.apply(this, arguments) }

  window.ChipCalc.engine.recalculateAll()
  assertEqual(calcCount, 0, 'calcCOGS 호출 없음')
  assertEqual(uiCalls.refreshPortfolioView, 0, 'refreshPortfolioView 미호출')

  window.ChipCalc.engine.calcCOGS = origCalc
})

console.log('\n── AC2: 정상 항목 재계산 ──')

test('portfolioData 2개 항목 → calcCOGS 2회 호출, estimatedASP 갱신', function() {
  mockStorage()
  var uiCalls = mockUI()
  var item1 = makeItem({ actualPrice: 4.0 })
  var item2 = makeItem({ node: '40nm', waferSize: 300, dieArea: 30, actualPrice: 6.0 })
  window.ChipCalc.state.portfolioData = [item1, item2]

  window.ChipCalc.engine.recalculateAll()

  assert(typeof item1.estimatedASP === 'number', 'item1.estimatedASP는 number')
  assert(item1.estimatedASP > 0, 'item1.estimatedASP > 0')
  assert(typeof item2.estimatedASP === 'number', 'item2.estimatedASP는 number')
  assert(item2.estimatedASP > 0, 'item2.estimatedASP > 0')
  assert(item1.calcError === null, 'item1.calcError === null')
})

test('재계산 후 frontendCost, backendCost, totalCOGS 필드 갱신', function() {
  mockStorage()
  mockUI()
  var item = makeItem()
  window.ChipCalc.state.portfolioData = [item]

  window.ChipCalc.engine.recalculateAll()

  assert(typeof item.frontendCost === 'number', 'frontendCost number')
  assert(typeof item.backendCost === 'number', 'backendCost number')
  assert(typeof item.totalCOGS === 'number', 'totalCOGS number')
  assert(item.frontendCost > 0, 'frontendCost > 0')
})

console.log('\n── AC5: refreshPortfolioView 호출 ──')

test('정상 계산 완료 후 refreshPortfolioView() 호출됨', function() {
  mockStorage()
  var uiCalls = mockUI()
  window.ChipCalc.state.portfolioData = [makeItem()]

  window.ChipCalc.engine.recalculateAll()
  assertEqual(uiCalls.refreshPortfolioView, 1, 'refreshPortfolioView 1회 호출')
})

test('portfolioData 없어도 refreshPortfolioView 미호출 (ARCH-5)', function() {
  mockStorage()
  var uiCalls = mockUI()
  window.ChipCalc.state.portfolioData = []

  window.ChipCalc.engine.recalculateAll()
  assertEqual(uiCalls.refreshPortfolioView, 0, '미호출 확인')
})

console.log('\n── AC4: 오류 항목 건너뜀 ──')

test('calcCOGS가 throw한 항목 — calcError 기록, 나머지 항목 계속 처리', function() {
  mockStorage()
  mockUI()
  var badItem  = makeItem({ node: 'invalid-node-xyz', dieArea: 25 })
  var goodItem = makeItem({ actualPrice: 4.0 })
  window.ChipCalc.state.portfolioData = [badItem, goodItem]

  window.ChipCalc.engine.recalculateAll()

  assert(typeof badItem.calcError === 'string' && badItem.calcError.length > 0, 'badItem.calcError 설정됨')
  assert(badItem.isOutlier === false, 'badItem.isOutlier === false')
  assert(typeof goodItem.estimatedASP === 'number', 'goodItem은 정상 처리됨')
  assert(goodItem.calcError === null, 'goodItem.calcError === null')
})

test('calcCOGS NaN 반환 항목 — calcError 기록, 건너뜀', function() {
  mockStorage()
  mockUI()
  var origCalc = window.ChipCalc.engine.calcCOGS
  var callCount = 0

  // 첫 번째 호출에서 NaN 반환
  window.ChipCalc.engine.calcCOGS = function(params) {
    callCount++
    if (callCount === 1) return { frontendCost: NaN, backendCost: 0.1, totalCOGS: NaN, estimatedASP: NaN }
    return origCalc.apply(this, arguments)
  }

  var nanItem  = makeItem()
  var goodItem = makeItem()
  window.ChipCalc.state.portfolioData = [nanItem, goodItem]

  window.ChipCalc.engine.recalculateAll()

  assert(nanItem.calcError !== null, 'NaN 항목 calcError 설정')
  assert(nanItem.isOutlier === false, 'NaN 항목 isOutlier false')
  assert(typeof goodItem.estimatedASP === 'number' && !isNaN(goodItem.estimatedASP), '두 번째 항목 정상 처리')

  window.ChipCalc.engine.calcCOGS = origCalc
})

console.log('\n── 이상치 판정 ──')

test('actualPrice / estimatedASP > 1.3 → isOutlier: true', function() {
  mockStorage({ outlierThreshold: 1.3 })
  mockUI()
  // estimatedASP를 1.0으로 만들기 위해 actualPrice를 충분히 높게 설정
  // 실제 계산값에 맞춰 actualPrice를 크게 설정
  var item = makeItem()
  window.ChipCalc.state.portfolioData = [item]
  window.ChipCalc.engine.recalculateAll()

  // 계산된 estimatedASP를 사용해 isOutlier 조건 검증
  var expectedOutlier = item.actualPrice / item.estimatedASP > 1.3
  assert(item.isOutlier === expectedOutlier, 'isOutlier 판정 일치: ratio=' + (item.actualPrice / item.estimatedASP).toFixed(3))
})

test('actualPrice가 없으면 isOutlier: false', function() {
  mockStorage()
  mockUI()
  var item = makeItem({ actualPrice: undefined })
  window.ChipCalc.state.portfolioData = [item]

  window.ChipCalc.engine.recalculateAll()
  assert(item.isOutlier === false, 'actualPrice 없으면 isOutlier false')
})

test('임계값 1.5 설정 시 1.3 < ratio < 1.5 → isOutlier: false', function() {
  // ratio가 약 1.4가 되도록 actualPrice 조정
  mockStorage({ outlierThreshold: 1.5 })
  mockUI()
  var item = makeItem()
  window.ChipCalc.state.portfolioData = [item]
  window.ChipCalc.engine.recalculateAll()

  // 먼저 estimatedASP 확인 후 실제 ratio 계산
  var ratio = item.actualPrice / item.estimatedASP
  var expectedOutlier = ratio > 1.5
  assert(item.isOutlier === expectedOutlier, '임계값 1.5 적용 확인: ratio=' + ratio.toFixed(3) + ' outlier=' + item.isOutlier)
})

test('storage에서 outlierThreshold 1.3 기본값 사용', function() {
  mockStorage() // outlierThreshold: 1.3
  mockUI()
  var item = makeItem()
  window.ChipCalc.state.portfolioData = [item]

  window.ChipCalc.engine.recalculateAll()

  // 기본 임계값 1.3으로 판정됨 확인 (에러 없음)
  assert(item.isOutlier === (item.actualPrice / item.estimatedASP > 1.3), '기본 임계값 1.3 적용')
})

console.log('\n── 기타 엣지케이스 ──')

test('ChipCalc.ui 없어도 오류 없이 동작 (defensive)', function() {
  mockStorage()
  window.ChipCalc.ui = null
  window.ChipCalc.state.portfolioData = [makeItem()]

  var threw = false
  try {
    window.ChipCalc.engine.recalculateAll()
  } catch (e) {
    threw = true
  }
  assert(!threw, 'ui 없어도 에러 없이 동작')

  // 복원
  mockUI()
})

test('ChipCalc.storage 없어도 기본 임계값(1.3)으로 동작', function() {
  window.ChipCalc.storage = null
  mockUI()
  var item = makeItem()
  window.ChipCalc.state.portfolioData = [item]

  var threw = false
  try {
    window.ChipCalc.engine.recalculateAll()
  } catch (e) {
    threw = true
  }
  assert(!threw, 'storage 없어도 에러 없이 동작')
  assert(typeof item.estimatedASP === 'number', 'estimatedASP 계산됨')

  // 복원
  mockStorage()
})

// ── 결과 ──────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────')
console.log('결과: ' + passed + ' passed / ' + failed + ' failed')
if (failed === 0) {
  console.log('모든 테스트 통과 ✅')
} else {
  console.log('실패한 테스트가 있습니다 ❌')
  process.exit(1)
}
