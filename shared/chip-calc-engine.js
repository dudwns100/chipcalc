// shared/chip-calc-engine.js
// 원가 계산 엔진 — Story 1.2
;(function () {
  'use strict'
  window.ChipCalc = window.ChipCalc || {}

  // ── 내부 상수 (클로저 캡슐화 — 외부 직접 접근 불가) ──────────────
  const WAFER_SIZE_KEY = { 150: 'p6', 200: 'p8', 300: 'p12' }
  const COGS_RATIO = 0.69

  // DEF_WAFER: 노드별 웨이퍼 단가 (USD/wafer) — p6=150mm, p8=200mm, p12=300mm
  // 기준: 차량용 MCU 대표값 (K 캘리브레이션으로 제품군별 보정)
  const DEF_WAFER_DEFAULT = {
    '350nm': { p6: 450,  p8: 520,  p12: null  },
    '180nm': { p6: 650,  p8: 760,  p12: 980   },
    '90nm':  { p6: null, p8: 980,  p12: 1600  },
    '65nm':  { p6: null, p8: 1300, p12: 1950  },
    '40nm':  { p6: null, p8: null, p12: 2700  },
    '28nm':  { p6: null, p8: null, p12: 3200  },
    '16nm':  { p6: null, p8: null, p12: 5500  },
    '7nm':   { p6: null, p8: null, p12: 11000 },
    '5nm':   { p6: null, p8: null, p12: 18000 }
  }

  // DEF_PKGS: 패키지 단가 (USD/unit) — AEC-Q100 차량용 기준
  const DEF_PKGS_DEFAULT = [
    { id:1,  name:'SOIC-8 (AEC)',   asm:0.055, test:0.035, pins:[{l:'8핀', asm:0.055,test:0.035}] },
    { id:7,  name:'LQFP (AEC)',     asm:0.090, test:0.055, pins:[
      {l:'32핀',asm:0.075,test:0.045},{l:'48핀',asm:0.085,test:0.052},
      {l:'64핀',asm:0.095,test:0.058},{l:'80핀',asm:0.105,test:0.065},
      {l:'100핀',asm:0.115,test:0.070},{l:'128핀',asm:0.130,test:0.080},
      {l:'144핀',asm:0.145,test:0.088}
    ]},
    { id:8,  name:'QFP (AEC)',      asm:0.095, test:0.058, pins:[
      {l:'44핀',asm:0.082,test:0.050},{l:'64핀',asm:0.095,test:0.058},
      {l:'100핀',asm:0.115,test:0.070},{l:'144핀',asm:0.135,test:0.082},
      {l:'176핀',asm:0.155,test:0.095}
    ]},
    { id:10, name:'QFN (AEC)',      asm:0.095, test:0.060, pins:[
      {l:'16핀',asm:0.075,test:0.046},{l:'24핀',asm:0.088,test:0.054},
      {l:'32핀',asm:0.095,test:0.060},{l:'48핀',asm:0.112,test:0.070},
      {l:'64핀',asm:0.132,test:0.082}
    ]},
    { id:13, name:'SOT-23 (AEC)',   asm:0.048, test:0.028, pins:[] },
    { id:16, name:'TO-220 (AEC)',   asm:0.085, test:0.050, pins:[] },
    { id:22, name:'BGA (AEC)',      asm:0.150, test:0.092, pins:[
      {l:'64볼',asm:0.125,test:0.076},{l:'128볼',asm:0.145,test:0.088},
      {l:'256볼',asm:0.182,test:0.112},{l:'400볼',asm:0.235,test:0.145}
    ]},
    { id:23, name:'FCBGA (AEC)',    asm:0.310, test:0.155, pins:[
      {l:'196볼',asm:0.265,test:0.132},{l:'324볼',asm:0.312,test:0.156},
      {l:'484볼',asm:0.368,test:0.184},{l:'676볼',asm:0.445,test:0.222}
    ]},
    { id:31, name:'LFCSP (AEC)',    asm:0.098, test:0.062, pins:[
      {l:'16핀',asm:0.082,test:0.050},{l:'32핀',asm:0.102,test:0.065}
    ]},
    { id:33, name:'eWLCSP (AEC)',   asm:0.185, test:0.112, pins:[] },
    { id:35, name:'Power Module (IPM)', asm:0.650, test:0.380, pins:[] },
    { id:37, name:'Bare Die KGD (AEC)', asm:0.000, test:0.058, pins:[] }
  ]

  const K_VALUES_DEFAULT = { MCU: 1.0, PMIC: 1.0, '파워IC': 1.0, '기타': 1.0 }

  // ── 런타임 변수 (loadWaferData로 교체 가능) ──────────────────────
  var _wafer = JSON.parse(JSON.stringify(DEF_WAFER_DEFAULT))
  var _pkgs  = JSON.parse(JSON.stringify(DEF_PKGS_DEFAULT))

  // ── 내부 헬퍼 ───────────────────────────────────────────────────
  function normalizeNode(node) {
    var s = String(node).trim().toLowerCase()
    return s.endsWith('nm') ? s : s + 'nm'
  }

  function getSizeKey(waferSize) {
    var key = WAFER_SIZE_KEY[waferSize]
    if (!key) throw new Error('지원하지 않는 웨이퍼 사이즈: ' + waferSize + 'mm (150/200/300mm만 지원)')
    return key
  }

  // ── 공개 API ────────────────────────────────────────────────────
  function getWaferPrice(node, waferSize) {
    var nNode = normalizeNode(node)
    var sKey  = getSizeKey(waferSize)
    if (!_wafer[nNode]) throw new Error('존재하지 않는 공정노드: ' + node)
    var price = _wafer[nNode][sKey]
    if (price == null) throw new Error(node + '/' + waferSize + 'mm 웨이퍼 단가 데이터 없음 (해당 사이즈 미지원 노드)')
    return price
  }

  function setWaferPrice(node, waferSize, price) {
    var nNode = normalizeNode(node)
    var sKey  = getSizeKey(waferSize)
    if (!_wafer[nNode]) _wafer[nNode] = {}
    _wafer[nNode][sKey] = price
  }

  function getWaferTable() {
    return JSON.parse(JSON.stringify(_wafer))
  }

  function loadWaferData(waferTable, pkgsArray) {
    if (waferTable) _wafer = JSON.parse(JSON.stringify(waferTable))
    if (pkgsArray)  _pkgs  = JSON.parse(JSON.stringify(pkgsArray))
  }

  function getPackagePrice(pkgType, pins) {
    var upper = String(pkgType).toUpperCase()
    var pkg = _pkgs.find(function (p) { return p.name.toUpperCase().indexOf(upper) !== -1 })
    if (!pkg) throw new Error('패키지 타입을 찾을 수 없습니다: ' + pkgType)
    if (pins && pkg.pins && pkg.pins.length > 0) {
      var pinLabel = pins + '핀'
      var pinEntry = pkg.pins.find(function (p) { return p.l === pinLabel })
      if (pinEntry) return { asm: pinEntry.asm, test: pinEntry.test }
      var sorted = pkg.pins.slice().sort(function (a, b) {
        return Math.abs(parseInt(a.l) - pins) - Math.abs(parseInt(b.l) - pins)
      })
      if (sorted.length > 0) return { asm: sorted[0].asm, test: sorted[0].test }
    }
    return { asm: pkg.asm, test: pkg.test }
  }

  function calcDPW(waferSize, dieArea) {
    var r = waferSize / 2
    return Math.floor(Math.PI * r * r / dieArea - Math.PI * waferSize / Math.sqrt(2 * dieArea))
  }

  function calcCOGS(params) {
    var node       = params.node
    var dieArea    = params.dieArea
    var waferSize  = params.waferSize
    var yld        = params['yield']
    var pkgType    = params.pkgType
    var pins       = params.pins
    var kValue     = (params.kValue != null) ? params.kValue : 1.0
    var waferOverride = params.waferOverride || null

    if (!yld || yld <= 0 || !dieArea || dieArea <= 0) {
      throw new Error('yield와 dieArea는 0보다 커야 합니다')
    }

    var nNode = normalizeNode(node)
    var sKey  = getSizeKey(waferSize)
    var waferPrice
    if (waferOverride && waferOverride[nNode] && waferOverride[nNode][sKey] != null) {
      waferPrice = waferOverride[nNode][sKey]
    } else {
      waferPrice = getWaferPrice(node, waferSize)
    }

    var dpw = calcDPW(waferSize, dieArea)
    if (dpw <= 0) throw new Error('DPW가 0 이하입니다. 다이 면적이 웨이퍼보다 큽니다.')
    var frontendCost = waferPrice / (dpw * yld)

    var pkg = getPackagePrice(pkgType, pins)
    var backendCost = pkg.asm + pkg.test

    var totalCOGS    = (frontendCost + backendCost) * kValue
    var estimatedASP = totalCOGS / COGS_RATIO

    return {
      frontendCost:    frontendCost,
      backendCost:     backendCost,
      totalCOGS:       totalCOGS,
      totalCOGSFmt:    '$' + totalCOGS.toFixed(4),
      estimatedASP:    estimatedASP,
      estimatedASPFmt: '$' + estimatedASP.toFixed(4)
    }
  }

  function getKValue(productFamily) {
    try {
      var ChipCalc = window.ChipCalc
      var store = ChipCalc.storage && ChipCalc.storage.load && ChipCalc.storage.load()
      if (store && store.kValues && store.kValues[productFamily] != null) {
        return store.kValues[productFamily]
      }
    } catch (e) { /* storage 미구현 시 무시 */ }
    return K_VALUES_DEFAULT[productFamily] != null ? K_VALUES_DEFAULT[productFamily] : 1.0
  }

  Object.assign(window.ChipCalc, {
    engine: {
      calcCOGS:     calcCOGS,
      getWaferPrice: getWaferPrice,
      setWaferPrice: setWaferPrice,
      getWaferTable: getWaferTable,
      loadWaferData: loadWaferData,
      getKValue:     getKValue
    }
  })
})()
