// shared/ui-utils.test.js
// Node.js 단위 테스트 — ui-utils.js AC1, AC2, AC3, AC6, AC7 검증
// 실행: node shared/ui-utils.test.js

'use strict'

// ── DOM mock ──────────────────────────────────────────────────────────────────
var createdElements = []
var bodyChildren = []
var setTimeoutCalls = []

global.document = {
  createElement: function(tag) {
    var el = {
      tag: tag,
      style: { cssText: '' },
      textContent: '',
      parentNode: { removeChild: function() {} },
      remove: function() { this._removed = true }
    }
    createdElements.push(el)
    return el
  },
  body: {
    appendChild: function(el) { bodyChildren.push(el) }
  }
}
global.setTimeout = function(fn, ms) {
  setTimeoutCalls.push({ fn: fn, ms: ms })
  // 즉시 실행 (테스트에서 3초 대기 불필요)
  fn()
}

// ── window & ChipCalc mock ────────────────────────────────────────────────────
global.window = global

var engineCalls = {}
var storageCalls = {}
var savedStore = null

global.window.ChipCalc = {
  engine: {
    setWaferPrice: function(n, s, p) { engineCalls.setWaferPrice = { n: n, s: s, p: p } },
    getWaferTable: function() { return { '28nm': { p12: 9500 } } }
  },
  storage: {
    load: function() {
      return {
        version: '1.0', wafer: null, pkgs: null,
        kValues: { MCU: 1.0 },
        priceReviewHistory: [],
        columnMapping: { portfolio: {}, review: {} },
        waferBaseline: null
      }
    },
    save: function(s) { savedStore = s }
  },
  parser: null, ui: null, chart: null,
  state: { portfolioData: [] }
}

require('./ui-utils.js')

const ui = window.ChipCalc.ui

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log('  ✅ PASS:', label)
    passed++
  } else {
    console.error('  ❌ FAIL:', label)
    failed++
  }
}

function reset() {
  createdElements = []
  bodyChildren = []
  setTimeoutCalls = []
  engineCalls = {}
  storageCalls = {}
  savedStore = null
}

// ── AC1: toast DOM 생성 + 색상 + setTimeout ────────────────────────────────
console.log('\n[AC1] toast — DOM 생성 & 색상')
reset()
ui.toast('저장 완료', 'info')
assert(bodyChildren.length === 1, 'toast → body에 엘리먼트 추가')
var toastEl = bodyChildren[0]
assert(toastEl.style.cssText.includes('#3b82f6'), 'info → 파란색 (#3b82f6)')
assert(toastEl.textContent === '저장 완료', 'toast 메시지 설정')
assert(setTimeoutCalls.length >= 1, 'setTimeout 호출됨')
assert(setTimeoutCalls[0].ms === 3000, 'setTimeout 3000ms')

reset()
ui.toast('주의', 'warn')
var warnEl = bodyChildren[0]
assert(warnEl.style.cssText.includes('#f59e0b'), 'warn → 황색 (#f59e0b)')

reset()
ui.toast('에러', 'error')
var errEl = bodyChildren[0]
assert(errEl.style.cssText.includes('#ef4444'), 'error → 빨간색 (#ef4444)')

// document 없으면 silent fail
reset()
var _savedDoc = global.document
global.document = undefined
var threw = false
try { ui.toast('test', 'info') } catch(e) { threw = true }
assert(!threw, 'document 없어도 에러 없음 (silent fail)')
global.document = _savedDoc

// ── AC2: formatPercent ────────────────────────────────────────────────────────
console.log('\n[AC2] formatPercent')
assert(ui.formatPercent(0.0312) === '3.12%', 'formatPercent(0.0312) → "3.12%"')
assert(ui.formatPercent(0.03) === '3.00%', 'formatPercent(0.03) → "3.00%"')
assert(ui.formatPercent(0.1) === '10.00%', 'formatPercent(0.1) → "10.00%"')
assert(ui.formatPercent(0) === '0.00%', 'formatPercent(0) → "0.00%"')
assert(ui.formatPercent(1) === '100.00%', 'formatPercent(1) → "100.00%"')

// ── AC7: formatCurrency ───────────────────────────────────────────────────────
console.log('\n[AC7] formatCurrency')
assert(ui.formatCurrency(5.263158) === '$5.2632', 'formatCurrency(5.263158) → "$5.2632"')
assert(ui.formatCurrency(3.2) === '$3.2000', 'formatCurrency(3.2) → "$3.2000"')
assert(ui.formatCurrency(0) === '$0.0000', 'formatCurrency(0) → "$0.0000"')

// ── AC3: updateWaferPrice — engine + storage 조율 ────────────────────────────
console.log('\n[AC3] updateWaferPrice')
reset()
ui.updateWaferPrice('28nm', 300, 9500)
assert(engineCalls.setWaferPrice !== undefined, 'engine.setWaferPrice 호출됨')
assert(engineCalls.setWaferPrice.n === '28nm', 'setWaferPrice node 정확')
assert(engineCalls.setWaferPrice.s === 300, 'setWaferPrice size 정확')
assert(engineCalls.setWaferPrice.p === 9500, 'setWaferPrice price 정확')
assert(savedStore !== null, 'storage.save 호출됨')
assert(savedStore.wafer !== null, 'store.wafer 업데이트됨')
assert(savedStore.wafer['28nm'] !== undefined, 'store.wafer에 28nm 데이터 포함')

// ── AC6: refreshPortfolioView no-op 존재 ─────────────────────────────────────
console.log('\n[AC6] refreshPortfolioView no-op')
assert(typeof ui.refreshPortfolioView === 'function', 'refreshPortfolioView는 함수')
var noopThrew = false
try { ui.refreshPortfolioView() } catch(e) { noopThrew = true }
assert(!noopThrew, 'refreshPortfolioView() 호출 시 에러 없음')

// ── 네임스페이스 확인 ─────────────────────────────────────────────────────────
console.log('\n[namespace] ChipCalc.ui 구조')
assert(typeof ui.toast === 'function', 'ui.toast 존재')
assert(typeof ui.formatPercent === 'function', 'ui.formatPercent 존재')
assert(typeof ui.formatCurrency === 'function', 'ui.formatCurrency 존재')
assert(typeof ui.updateWaferPrice === 'function', 'ui.updateWaferPrice 존재')

// ── 결과 ─────────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────')
console.log('결과: ' + passed + ' passed / ' + failed + ' failed')
if (failed > 0) process.exit(1)
else console.log('모든 테스트 통과 ✅')
