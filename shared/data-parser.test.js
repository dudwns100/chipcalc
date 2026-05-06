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

// ── 결과 ─────────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────')
console.log('결과: ' + passed + ' passed / ' + failed + ' failed')
if (failed > 0) {
  process.exit(1)
} else {
  console.log('모든 테스트 통과 ✅')
}
