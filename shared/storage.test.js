// shared/storage.test.js
// Node.js 단위 테스트 — storage.js AC3, AC4, AC5, AC8 검증
// 실행: node shared/storage.test.js

'use strict'

// ── window & ChipCalc mock ──────────────────────────────────────────────────
global.window = global
var toastCalls = []
global.window.ChipCalc = {
  engine: null, parser: null, storage: null,
  ui: {
    toast: function(msg, level) { toastCalls.push({ msg: msg, level: level }) }
  },
  chart: null,
  state: { portfolioData: [] }
}

// ── localStorage in-memory mock ──────────────────────────────────────────────
var _lsStore = {}
global.localStorage = {
  getItem:    function(k) { return _lsStore.hasOwnProperty(k) ? _lsStore[k] : null },
  setItem:    function(k, v) { _lsStore[k] = String(v) },
  removeItem: function(k) { delete _lsStore[k] },
  clear:      function() { _lsStore = {} }
}

function resetLS() { _lsStore = {} }
function resetToast() { toastCalls = [] }

require('./storage.js')

const storage = window.ChipCalc.storage

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

function assertNull(val, label) {
  if (val === null) {
    console.log('  ✅ PASS:', label)
    passed++
  } else {
    console.error('  ❌ FAIL (expected null, got', JSON.stringify(val) + '):', label)
    failed++
  }
}

// ── AC3: save/load 왕복 ─────────────────────────────────────────────────────
console.log('\n[AC3] save → load 왕복')
resetLS()
const testStore = {
  version: '1.0',
  wafer: { '28nm': { p12: 3200 } },
  pkgs: null,
  kValues: { MCU: 1.2 },
  priceReviewHistory: [{ id: '1', date: '2026-05-06T00:00:00Z', partNumber: 'PartA' }],
  columnMapping: { portfolio: { 품목명: 0 }, review: {} },
  waferBaseline: null
}
storage.save(testStore)
const loaded = storage.load()
assert(loaded.version === '1.0', 'version 유지')
assert(loaded.wafer && loaded.wafer['28nm'].p12 === 3200, 'wafer 데이터 유지')
assert(loaded.kValues.MCU === 1.2, 'kValues 유지')
assert(loaded.priceReviewHistory.length === 1, 'priceReviewHistory 유지')
assert(loaded.columnMapping.portfolio['품목명'] === 0, 'columnMapping 유지')

// load 반환 구조에 DEFAULTS 필드 포함 확인
assert(typeof loaded.columnMapping.portfolio === 'object', 'columnMapping.portfolio 객체')
assert(typeof loaded.columnMapping.review === 'object', 'columnMapping.review 객체')

// ── DEFAULTS fallback (빈 localStorage) ─────────────────────────────────────
console.log('\n[DEFAULTS] 빈 스토리지 → DEFAULTS 반환')
resetLS()
const def = storage.load()
assert(def.version === '1.0', 'DEFAULTS version')
assert(Array.isArray(def.priceReviewHistory), 'DEFAULTS priceReviewHistory 배열')
assert(typeof def.columnMapping.portfolio === 'object', 'DEFAULTS columnMapping.portfolio')
assert(typeof def.columnMapping.review === 'object', 'DEFAULTS columnMapping.review')
assertNull(def.waferBaseline, 'DEFAULTS waferBaseline null')

// ── 버전 불일치 → DEFAULTS 병합 ──────────────────────────────────────────────
console.log('\n[버전 불일치] 구버전 store → 병합')
resetLS(); resetToast()
const oldStore = JSON.stringify({ version: '0.9', kValues: { MCU: 0.8 } })
_lsStore['chipcalc_store'] = oldStore
const migrated = storage.load()
assert(migrated.version === '1.0', '버전 업그레이드')
assert(migrated.kValues.MCU === 0.8, '기존 데이터 보존')
assert(Array.isArray(migrated.priceReviewHistory), '누락 필드 DEFAULTS로 채움')

// ── AC4: QuotaExceededError → 100건 정리 후 재시도 ──────────────────────────
console.log('\n[AC4] QuotaExceededError 처리')
resetLS(); resetToast()
var _realSetItem = global.localStorage.setItem
// storage.save() 내부 흐름:
//   1) _isStorageAvailable() → setItem('__chipcalc_test') → 정상
//   2) setItem('chipcalc_store', 대용량) → QuotaExceededError
//   3) 100건 정리 후 setItem('chipcalc_store', 정리된버전) → 정상
var setItemCallsToStore = 0
global.localStorage.setItem = function(k, v) {
  if (k === '__chipcalc_test') {
    // 가용성 체크용 — 항상 성공
    _lsStore[k] = String(v)
    return
  }
  // chipcalc_store 첫 번째 쓰기 → QuotaExceededError
  setItemCallsToStore++
  if (setItemCallsToStore === 1) {
    var e = new Error('QuotaExceededError')
    e.name = 'QuotaExceededError'
    throw e
  }
  _lsStore[k] = String(v)
}

const bigStore = {
  version: '1.0', wafer: null, pkgs: null,
  kValues: { MCU: 1.0 },
  priceReviewHistory: (function() {
    var arr = []
    for (var i = 0; i < 150; i++) arr.push({ id: String(i), date: '2026-05-06', partNumber: 'P'+i })
    return arr
  })(),
  columnMapping: { portfolio: {}, review: {} },
  waferBaseline: null
}
storage.save(bigStore)
// 재시도 후 저장된 데이터 확인
global.localStorage.setItem = _realSetItem  // 원복
const savedAfterQuota = JSON.parse(_lsStore['chipcalc_store'] || 'null')
assert(savedAfterQuota !== null, 'QuotaExceeded 후 저장 성공')
assert(savedAfterQuota.priceReviewHistory.length <= 100, 'priceReviewHistory 100건 이하로 정리')

// ── AC5: 시크릿 모드(localStorage 불가) → toast warn ────────────────────────
console.log('\n[AC5] 시크릿 모드 — localStorage 사용 불가')
resetToast()
var _savedLS = global.localStorage
global.localStorage = {
  getItem:    function() { throw new Error('SecurityError') },
  setItem:    function() { throw new Error('SecurityError') },
  removeItem: function() { throw new Error('SecurityError') }
}
const secretResult = storage.load()
assert(Array.isArray(secretResult.priceReviewHistory), '시크릿 모드 → DEFAULTS 반환')
assert(toastCalls.some(function(t) { return t.level === 'warn' }), '시크릿 모드 → toast warn 호출')

// save도 toast warn
resetToast()
storage.save({ version: '1.0', priceReviewHistory: [] })
assert(toastCalls.some(function(t) { return t.level === 'warn' }), '시크릿 모드 save → toast warn')

global.localStorage = _savedLS  // 원복
resetLS()

// ── AC8: exportConfig / importConfig 왕복 ───────────────────────────────────
console.log('\n[AC8] exportConfig / importConfig')
resetLS()
const originalStore = {
  version: '1.0', wafer: { '28nm': { p12: 9500 } }, pkgs: null,
  kValues: { MCU: 1.3, PMIC: 1.0, '파워IC': 1.0, '기타': 1.0 },
  priceReviewHistory: [],
  columnMapping: { portfolio: { 품목명: 0 }, review: {} },
  waferBaseline: null
}
storage.save(originalStore)
const exported = storage.exportConfig()
assert(typeof exported === 'string', 'exportConfig returns string')

resetLS()
storage.importConfig(exported)
const reimported = storage.load()
assert(reimported.wafer && reimported.wafer['28nm'].p12 === 9500, 'importConfig 후 wafer 복원')
assert(reimported.kValues.MCU === 1.3, 'importConfig 후 kValues 복원')

// importConfig 잘못된 JSON
resetToast()
storage.importConfig('invalid-json{{{')
assert(toastCalls.some(function(t) { return t.level === 'error' }), 'importConfig 잘못된 JSON → toast error')

// ── 결과 ─────────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────')
console.log('결과: ' + passed + ' passed / ' + failed + ' failed')
if (failed > 0) {
  process.exit(1)
} else {
  console.log('모든 테스트 통과 ✅')
}
