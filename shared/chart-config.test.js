// shared/chart-config.test.js
// Node.js 단위 테스트 — chart-config.js AC4, AC5 검증
// 실행: node shared/chart-config.test.js

'use strict'

// ── DOM mock ──────────────────────────────────────────────────────────────────
var createdElements = []
var appendedToBody = []
var removedFromBody = []

global.document = {
  createElement: function(tag) {
    var el = {
      tag: tag,
      style: { cssText: '' },
      textContent: '',
      href: '',
      download: '',
      parentNode: true,
      remove: function() { this.parentNode = null },
      click: function() { this._clicked = true }
    }
    createdElements.push(el)
    return el
  },
  body: {
    appendChild: function(el) { appendedToBody.push(el) },
    removeChild: function(el) { removedFromBody.push(el) }
  },
  getElementById: function(id) {
    return id === 'validId' ? { id: id } : null
  }
}

global.setTimeout = function(fn, ms) { fn() }

// ── window & ChipCalc mock ────────────────────────────────────────────────────
global.window = global

var toastCalls = []

global.window.ChipCalc = {
  engine: null,
  storage: null,
  parser: null,
  chart: null,
  ui: {
    toast: function(msg, level) { toastCalls.push({ msg: msg, level: level }) }
  },
  state: { portfolioData: [] }
}

// echarts mock
global.window.echarts = {
  init: function(el) { return { el: el, _initialized: true } }
}

require('./chart-config.js')

const chart = window.ChipCalc.chart

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
  appendedToBody = []
  removedFromBody = []
  toastCalls = []
}

// ── AC4: savePng — getDataURL + <a download> 트리거 ──────────────────────────
console.log('\n[AC4] savePng')
reset()
var mockChart = {
  getDataURL: function(opts) {
    this._lastOpts = opts
    return 'data:image/png;base64,TEST'
  }
}
chart.savePng(mockChart, 'portfolio-2026-05-06')
assert(mockChart._lastOpts !== undefined, 'getDataURL 호출됨')
assert(mockChart._lastOpts.type === 'png', 'getDataURL type=png')
assert(mockChart._lastOpts.pixelRatio === 2, 'getDataURL pixelRatio=2')
assert(mockChart._lastOpts.backgroundColor === '#fff', 'getDataURL backgroundColor=#fff')

var aEl = createdElements.find(function(e) { return e.tag === 'a' })
assert(aEl !== undefined, '<a> 엘리먼트 생성됨')
assert(aEl && aEl.href === 'data:image/png;base64,TEST', '<a>.href = dataUrl')
assert(aEl && aEl.download === 'portfolio-2026-05-06.png', '<a>.download = filename+.png')
assert(aEl && aEl._clicked === true, '<a>.click() 호출됨')
assert(removedFromBody.length >= 1, 'body.removeChild 호출됨')

// document 없으면 silent fail
reset()
var _savedDoc = global.document
global.document = undefined
var threw = false
try { chart.savePng(mockChart, 'test') } catch(e) { threw = true }
assert(!threw, 'document 없어도 에러 없음 (silent fail)')
global.document = _savedDoc

// ── AC5: initChart — echarts 없으면 toast error + null ───────────────────────
console.log('\n[AC5] initChart')
reset()
var result = chart.initChart('validId')
assert(result !== null, 'echarts 있을 때 initChart → null 아님')
assert(result && result._initialized === true, 'echarts.init 호출됨')

// echarts 없는 경우
reset()
var _savedEcharts = global.window.echarts
global.window.echarts = undefined
var result2 = chart.initChart('validId')
assert(result2 === null, 'echarts 없을 때 null 반환')
assert(toastCalls.length >= 1, 'toast 호출됨')
assert(toastCalls[0].level === 'error', 'toast level=error')
assert(toastCalls[0].msg.includes('차트를 불러올 수 없습니다'), 'toast 메시지 확인')
global.window.echarts = _savedEcharts

// ── 네임스페이스 확인 ─────────────────────────────────────────────────────────
console.log('\n[namespace] ChipCalc.chart 구조')
assert(typeof chart.savePng === 'function', 'chart.savePng 존재')
assert(typeof chart.initChart === 'function', 'chart.initChart 존재')
assert(typeof chart.COLORS === 'object', 'chart.COLORS 존재')
assert(chart.COLORS.primary === '#3b82f6', 'COLORS.primary = #3b82f6')
assert(chart.COLORS.danger === '#ef4444', 'COLORS.danger = #ef4444')
assert(chart.COLORS.warning === '#f59e0b', 'COLORS.warning = #f59e0b')
assert(typeof chart.FONT === 'object', 'chart.FONT 존재')
assert(chart.FONT.size === 12, 'FONT.size = 12')

// ── 결과 ─────────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────')
console.log('결과: ' + passed + ' passed / ' + failed + ' failed')
if (failed > 0) process.exit(1)
else console.log('모든 테스트 통과 ✅')
