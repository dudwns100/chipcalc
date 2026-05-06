// shared/chip-calc-engine.test.js
// Node.js 단위 테스트 — chip-calc-engine.js AC1~AC9 검증
// 실행: node shared/chip-calc-engine.test.js

'use strict'

// window mock
global.window = global
global.window.ChipCalc = {
  engine: null, parser: null, storage: null, ui: null, chart: null,
  state: { portfolioData: [] }
}

require('./chip-calc-engine.js')

const engine = window.ChipCalc.engine

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

function assertThrows(fn, msgFragment, label) {
  try {
    fn()
    console.error('  ❌ FAIL (no throw):', label)
    failed++
  } catch (e) {
    if (!msgFragment || e.message.includes(msgFragment)) {
      console.log('  ✅ PASS:', label)
      passed++
    } else {
      console.error('  ❌ FAIL (wrong message):', label, '→', e.message)
      failed++
    }
  }
}

// ── AC1: calcCOGS 반환 구조 및 타입 검증 ──────────────────────────────────
console.log('\n[AC1] calcCOGS 반환 구조')
const r1 = engine.calcCOGS({ node: '28nm', dieArea: 10, waferSize: 300, yield: 0.95, pkgType: 'QFP', pins: 100, kValue: 1.0 })
assert(typeof r1.frontendCost === 'number', 'frontendCost는 number 타입')
assert(typeof r1.backendCost === 'number', 'backendCost는 number 타입')
assert(typeof r1.totalCOGS === 'number', 'totalCOGS는 number 타입')
assert(typeof r1.totalCOGSFmt === 'string', 'totalCOGSFmt는 string 타입')
assert(typeof r1.estimatedASP === 'number', 'estimatedASP는 number 타입')
assert(typeof r1.estimatedASPFmt === 'string', 'estimatedASPFmt는 string 타입')
assert(r1.totalCOGSFmt.startsWith('$'), 'totalCOGSFmt는 $ 시작')
assert(r1.estimatedASPFmt.startsWith('$'), 'estimatedASPFmt는 $ 시작')
// estimatedASP = totalCOGS / 0.69
assert(Math.abs(r1.estimatedASP - r1.totalCOGS / 0.69) < 1e-9, 'estimatedASP = totalCOGS / 0.69')
// 정밀도 유지 (toFixed 없이 중간 계산)
assert(r1.frontendCost > 0, 'frontendCost > 0')

// ── AC2: K=1.5 결과가 K=1.0 결과의 1.5배 ──────────────────────────────────
console.log('\n[AC2] K 스케일링')
const r2a = engine.calcCOGS({ node: '28nm', dieArea: 10, waferSize: 300, yield: 0.95, pkgType: 'QFP', pins: 100, kValue: 1.0 })
const r2b = engine.calcCOGS({ node: '28nm', dieArea: 10, waferSize: 300, yield: 0.95, pkgType: 'QFP', pins: 100, kValue: 1.5 })
assert(Math.abs(r2b.totalCOGS - r2a.totalCOGS * 1.5) < 1e-9, 'K=1.5 totalCOGS = K=1.0 × 1.5')

// ── AC3: 존재하지 않는 노드 Error throw ────────────────────────────────────
console.log('\n[AC3] 잘못된 노드 Error')
assertThrows(
  () => engine.getWaferPrice('invalid-node', 300),
  '존재하지 않는 공정노드',
  'invalid-node getWaferPrice → Error'
)

// ── AC4: yield=0, dieArea=0 사전 검증 ─────────────────────────────────────
console.log('\n[AC4] 사전 검증 (yield/dieArea ≤ 0)')
assertThrows(
  () => engine.calcCOGS({ node: '28nm', dieArea: 10, waferSize: 300, yield: 0, pkgType: 'QFP', kValue: 1.0 }),
  'yield와 dieArea는 0보다 커야 합니다',
  'yield=0 → Error'
)
assertThrows(
  () => engine.calcCOGS({ node: '28nm', dieArea: 0, waferSize: 300, yield: 0.95, pkgType: 'QFP', kValue: 1.0 }),
  'yield와 dieArea는 0보다 커야 합니다',
  'dieArea=0 → Error'
)

// ── AC5: waferOverride 우선 적용, fallback 검증 ────────────────────────────
console.log('\n[AC5] waferOverride 우선 적용')
const overridePrice = 9500
const r5 = engine.calcCOGS({
  node: '28nm', dieArea: 10, waferSize: 300, yield: 0.95,
  pkgType: 'QFP', pins: 100, kValue: 1.0,
  waferOverride: { '28nm': { p12: overridePrice } }
})
// override 적용 시 frontendCost 기준으로 DEF_WAFER(3200)과 다른 값
const r5_def = engine.calcCOGS({ node: '28nm', dieArea: 10, waferSize: 300, yield: 0.95, pkgType: 'QFP', pins: 100, kValue: 1.0 })
assert(r5.frontendCost !== r5_def.frontendCost, 'waferOverride 적용 시 frontendCost 다름')
// waferOverride에 없는 노드는 DEF_WAFER fallback
const r5b = engine.calcCOGS({
  node: '28nm', dieArea: 10, waferSize: 300, yield: 0.95,
  pkgType: 'QFP', pins: 100, kValue: 1.0,
  waferOverride: { '65nm': { p12: 1111 } }  // 28nm override 없음
})
assert(Math.abs(r5b.frontendCost - r5_def.frontendCost) < 1e-9, 'override 없는 노드는 DEF_WAFER fallback')

// ── AC6: 중간 계산 string 변환으로 인한 NaN 없음 ────────────────────────────
console.log('\n[AC6] number 타입 보장, NaN 없음')
assert(!isNaN(r1.frontendCost), 'frontendCost NaN 없음')
assert(!isNaN(r1.backendCost), 'backendCost NaN 없음')
assert(!isNaN(r1.totalCOGS), 'totalCOGS NaN 없음')
assert(!isNaN(r1.estimatedASP), 'estimatedASP NaN 없음')

// ── AC7: DEF_WAFER 외부 접근 불가, getWaferTable() deep copy 반환 ──────────
console.log('\n[AC7] DEF_WAFER 캡슐화')
assert(typeof window.DEF_WAFER === 'undefined', 'window.DEF_WAFER 직접 접근 불가 (undefined)')
assert(typeof window.ChipCalc.engine.DEF_WAFER === 'undefined', 'engine.DEF_WAFER 직접 접근 불가')
const tbl = engine.getWaferTable()
assert(typeof tbl === 'object' && tbl !== null, 'getWaferTable() 객체 반환')
assert(typeof tbl['28nm'] === 'object', 'getWaferTable()에 28nm 포함')
// deep copy 확인 — 수정해도 내부 영향 없음
tbl['28nm'].p12 = 99999
assert(engine.getWaferPrice('28nm', 300) !== 99999, 'getWaferTable() deep copy 확인')

// ── AC8: DPW ≈ 640, frontendCost 공식 검증 ────────────────────────────────
console.log('\n[AC8] DPW 계산 검증')
// node='28nm', waferSize=300, dieArea=100, yield=0.95
// DPW = floor(π×150²/100 − π×300/√200) ≈ 640
const r8 = engine.calcCOGS({ node: '28nm', dieArea: 100, waferSize: 300, yield: 0.95, pkgType: 'QFP', pins: 100, kValue: 1.0 })
// waferPrice=3200, DPW=640, yield=0.95
const expectedFE = 3200 / (640 * 0.95)
assert(Math.abs(r8.frontendCost - expectedFE) < 1e-6, `frontendCost = 3200/(640×0.95) = ${expectedFE.toFixed(6)}`)
// 순수 함수 — 동일 입력 동일 출력
const r8b = engine.calcCOGS({ node: '28nm', dieArea: 100, waferSize: 300, yield: 0.95, pkgType: 'QFP', pins: 100, kValue: 1.0 })
assert(r8.totalCOGS === r8b.totalCOGS, '순수 함수 (같은 입력 → 같은 출력)')

// ── AC9: getKValue storage 없을 때 1.0 fallback ────────────────────────────
console.log('\n[AC9] getKValue fallback')
// storage 스텁 상태 (empty object, .load 없음)
assert(engine.getKValue('MCU') === 1.0, 'getKValue MCU → 1.0 (storage 없음)')
assert(engine.getKValue('PMIC') === 1.0, 'getKValue PMIC → 1.0 (storage 없음)')
assert(engine.getKValue('알수없음') === 1.0, 'getKValue 미등록 → 1.0')

// ── 결과 ────────────────────────────────────────────────────────────────────
console.log(`\n──────────────────────────────────────────`)
console.log(`결과: ${passed} passed / ${failed} failed`)
if (failed > 0) {
  process.exit(1)
} else {
  console.log('모든 테스트 통과 ✅')
}
