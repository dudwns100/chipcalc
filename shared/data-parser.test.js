// shared/data-parser.test.js
// Node.js 단위 테스트 — data-parser.js AC1, AC2, AC6, AC7 검증
// 실행: node shared/data-parser.test.js

'use strict'

global.window = global
global.window.ChipCalc = {
  engine: null, parser: null, storage: null,
  ui: { toast: null }, chart: null,
  state: { portfolioData: [] }
}

require('./data-parser.js')

const parser = window.ChipCalc.parser

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
    console.error('  ❌ FAIL (expected null, got ' + val + '):', label)
    failed++
  }
}

// ── AC1: parseCurrency ──────────────────────────────────────────────────────
console.log('\n[AC1] parseCurrency')
assert(parser.parseCurrency('$1,234.56') === 1234.56, "'$1,234.56' → 1234.56")
assert(parser.parseCurrency('1,234원') === 1234, "'1,234원' → 1234")
assert(parser.parseCurrency('¥1,000') === 1000, "'¥1,000' → 1000")
assert(parser.parseCurrency('€500.00') === 500, "'€500.00' → 500")
assert(parser.parseCurrency('USD 3.20') === 3.20, "'USD 3.20' → 3.20")
assert(parser.parseCurrency('5.50') === 5.50, "'5.50' → 5.50 (기호 없음)")
assertNull(parser.parseCurrency('abc'), "'abc' → null")
assertNull(parser.parseCurrency(''), "'' → null")
assertNull(parser.parseCurrency(null), "null → null")

// ── AC2: parsePercent (스마트 파싱) ─────────────────────────────────────────
console.log('\n[AC2] parsePercent 스마트 파싱')
assert(Math.abs(parser.parsePercent('3') - 0.03) < 1e-10, "'3' → 0.03")
assert(Math.abs(parser.parsePercent('3%') - 0.03) < 1e-10, "'3%' → 0.03")
assert(Math.abs(parser.parsePercent('0.03') - 0.03) < 1e-10, "'0.03' → 0.03 (n<1 그대로)")
assert(Math.abs(parser.parsePercent('30') - 0.30) < 1e-10, "'30' → 0.30")
assert(Math.abs(parser.parsePercent('0.3') - 0.30) < 1e-10, "'0.3' → 0.30 (n<1 그대로)")
assert(Math.abs(parser.parsePercent('8') - 0.08) < 1e-10, "'8' → 0.08")
assertNull(parser.parsePercent(''), "'' → null")
assertNull(parser.parsePercent('abc'), "'abc' → null")
assertNull(parser.parsePercent(null), "null → null")

// ── AC6: parseDecimal, parseInteger 타입 검증 ──────────────────────────────
console.log('\n[AC6] parseDecimal & parseInteger')
assert(parser.parseDecimal('0.95') === 0.95, "'0.95' → 0.95")
assert(parser.parseDecimal('1,000.5') === 1000.5, "'1,000.5' → 1000.5 (쉼표 제거)")
assertNull(parser.parseDecimal('abc'), "'abc' → null")
assertNull(parser.parseDecimal(null), "null → null")
assert(typeof parser.parseDecimal('0.95') === 'number', "parseDecimal 반환 typeof === 'number'")

assert(parser.parseInteger('100') === 100, "'100' → 100")
assert(parser.parseInteger('1,000') === 1000, "'1,000' → 1000 (쉼표 제거)")
assert(parser.parseInteger('3.7') === 3, "'3.7' → 3 (정수 변환)")
assertNull(parser.parseInteger('abc'), "'abc' → null")
assertNull(parser.parseInteger(null), "null → null")
assert(typeof parser.parseInteger('100') === 'number', "parseInteger 반환 typeof === 'number'")

// ── AC7: parseTSV 헤더 자동 감지 ────────────────────────────────────────────
console.log('\n[AC7] parseTSV')
// 기본 케이스: 헤더 있음
const tsv1 = parser.parseTSV('품목\t노드\t단가\n부품A\t28nm\t5.50')
assert(Array.isArray(tsv1.headers), 'headers는 배열')
assert(tsv1.headers.length === 3, 'headers 길이 3')
assert(tsv1.headers[0] === '품목', 'headers[0] === 품목')
assert(tsv1.headers[2] === '단가', 'headers[2] === 단가')
assert(Array.isArray(tsv1.rows), 'rows는 배열')
assert(tsv1.rows.length === 1, 'rows 길이 1')
assert(tsv1.rows[0][0] === '부품A', "rows[0][0] === '부품A'")
assert(tsv1.rows[0][2] === '5.50', "rows[0][2] === '5.50'")

// 헤더 없음 케이스: 첫 행이 전부 숫자
const tsv2 = parser.parseTSV('1\t2\t3\n4\t5\t6')
assert(tsv2.headers.length === 0, '첫 행 전부 숫자 → headers 빈 배열')
assert(tsv2.rows.length === 2, '숫자만인 경우 rows 2개')

// 빈 문자열
const tsv3 = parser.parseTSV('')
assert(tsv3.headers.length === 0, '빈 TSV → headers 빈 배열')
assert(tsv3.rows.length === 0, '빈 TSV → rows 빈 배열')

// 여러 행
const tsv4 = parser.parseTSV('품목명\t가격\nA\t3.0\nB\t4.0\nC\t5.0')
assert(tsv4.rows.length === 3, '3 데이터 행 → rows.length === 3')

// ── Story 2.1: detectPortfolioColumns ────────────────────────────────────────
console.log('\n[Story 2.1] detectPortfolioColumns')

// 한국어 헤더 감지
;(function() {
  var h = ['품목명', '공정노드', '다이면적(mm²)', '웨이퍼사이즈', '수율', '패키지타입', '핀수', '제품군', '단가']
  var m = parser.detectPortfolioColumns(h)
  assert(m.name === 0,          '한국어: name → 0 (품목명)')
  assert(m.node === 1,          '한국어: node → 1 (공정노드)')
  assert(m.dieArea === 2,       '한국어: dieArea → 2 (다이면적)')
  assert(m.waferSize === 3,     '한국어: waferSize → 3 (웨이퍼사이즈)')
  assert(m['yield'] === 4,      '한국어: yield → 4 (수율)')
  assert(m.pkgType === 5,       '한국어: pkgType → 5 (패키지타입)')
  assert(m.pins === 6,          '한국어: pins → 6 (핀수)')
  assert(m.productFamily === 7, '한국어: productFamily → 7 (제품군)')
  assert(m.actualPrice === 8,   '한국어: actualPrice → 8 (단가)')
})()

// 영어 헤더 감지
;(function() {
  var h = ['product', 'node', 'die area', 'wafer', 'yield', 'package', 'pins', 'family', 'price']
  var m = parser.detectPortfolioColumns(h)
  assert(m.name === 0,          '영어: name → 0 (product)')
  assert(m.node === 1,          '영어: node → 1')
  assert(m.dieArea === 2,       '영어: dieArea → 2 (die area)')
  assert(m.waferSize === 3,     '영어: waferSize → 3 (wafer)')
  assert(m['yield'] === 4,      '영어: yield → 4')
  assert(m.pkgType === 5,       '영어: pkgType → 5 (package)')
  assert(m.pins === 6,          '영어: pins → 6')
  assert(m.productFamily === 7, '영어: productFamily → 7 (family)')
  assert(m.actualPrice === 8,   '영어: actualPrice → 8 (price)')
})()

// 미감지 헤더 → undefined
;(function() {
  var m = parser.detectPortfolioColumns(['abc', 'xyz', '123'])
  assert(m.node === undefined,  '미감지: node → undefined')
  assert(m.name === undefined,  '미감지: name → undefined')
  assert(m.dieArea === undefined, '미감지: dieArea → undefined')
})()

// ── Story 2.1: parsePortfolioRows ─────────────────────────────────────────────
console.log('\n[Story 2.1] parsePortfolioRows')

// 기본 6개 필드 정상 변환
;(function() {
  var headers = ['품목명', '공정노드', '다이면적', '웨이퍼사이즈', '수율', '패키지타입', '핀수', '제품군', '단가']
  var rows = [
    ['APX-A100', '28nm', '25', '300', '0.95', 'QFP', '64', 'MCU', '3.50'],
    ['BPX-B070', '40nm', '18', '300', '92%',  'QFN', '32', 'PMIC', '2.10']
  ]
  var mapping = { name:0, node:1, dieArea:2, waferSize:3, 'yield':4, pkgType:5, pins:6, productFamily:7, actualPrice:8 }
  var result = parser.parsePortfolioRows(rows, headers, mapping)
  assert(result.items.length === 2,                         '2개 아이템 파싱')
  assert(result.items[0].node === '28nm',                   'item[0].node = 28nm')
  assert(result.items[0].dieArea === 25,                    'item[0].dieArea = 25')
  assert(result.items[0].waferSize === 300,                 'item[0].waferSize = 300')
  assert(Math.abs(result.items[0]['yield'] - 0.95) < 1e-9, 'item[0].yield = 0.95')
  assert(result.items[0].pkgType === 'QFP',                 'item[0].pkgType = QFP')
  assert(result.items[0].pins === 64,                       'item[0].pins = 64')
  assert(result.items[0].productFamily === 'MCU',           'item[0].productFamily = MCU')
  assert(Math.abs(result.items[0].actualPrice - 3.50) < 1e-9, 'item[0].actualPrice = 3.50')
  assert(Math.abs(result.items[1]['yield'] - 0.92) < 1e-9, 'item[1].yield 92% → 0.92')
})()

// yield null 시 아이템 생성 (recalculateAll에서 0.95 기본값)
;(function() {
  var headers = ['품목명', '공정노드', '다이면적', '웨이퍼사이즈', '패키지타입', '단가']
  var rows = [['APX', '28nm', '25', '300', 'QFP', '3.50']]
  var mapping = { name:0, node:1, dieArea:2, waferSize:3, pkgType:4, actualPrice:5 }
  var result = parser.parsePortfolioRows(rows, headers, mapping)
  assert(result.items.length === 1,          'yield 없어도 아이템 생성')
  assert(result.items[0]['yield'] === null,  'yield 미매핑 → null')
})()

// 빈 행 스킵
;(function() {
  var rows = [[''], [], ['', '', '']]
  var result = parser.parsePortfolioRows(rows, [], {})
  assert(result.items.length === 0 || result.warnings.length > 0, '빈 행만 → 빈 배열 or warning')
})()

// productFamily 미매핑 → '기타' 기본값
;(function() {
  var headers = ['품목명', '공정노드', '단가']
  var rows = [['APX', '28nm', '3.50']]
  var mapping = { name:0, node:1, actualPrice:2 }
  var result = parser.parsePortfolioRows(rows, headers, mapping)
  assert(result.items.length > 0 && result.items[0].productFamily === '기타', 'productFamily 미매핑 → 기타')
})()

// 숫자 없음 → 빈 배열 + warning
;(function() {
  var headers = ['col1', 'col2']
  var rows = [['abc', 'def'], ['ghi', 'jkl']]
  var mapping = { name:0, node:1 }
  var result = parser.parsePortfolioRows(rows, headers, mapping)
  assert(result.warnings.length > 0, '숫자 없음 → warnings 있음')
  assert(result.items.length === 0,  '숫자 없음 → 빈 배열 반환')
})()

// ── 결과 ─────────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────')
console.log('결과: ' + passed + ' passed / ' + failed + ' failed')
if (failed > 0) {
  process.exit(1)
} else {
  console.log('모든 테스트 통과 ✅')
}
