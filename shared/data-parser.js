// shared/data-parser.js
// TSV 파싱, 숫자 정규화 — Story 1.3
;(function () {
  'use strict'
  window.ChipCalc = window.ChipCalc || {}

  // parseCurrency: $1,234.56 → 1234.56, 1,234원 → 1234
  function parseCurrency(str) {
    if (str == null) return null
    var cleaned = String(str)
      .replace(/[$¥€₩]|USD|KRW|원/g, '')
      .replace(/,/g, '')
      .trim()
    if (cleaned === '') return null
    var n = parseFloat(cleaned)
    return isNaN(n) ? null : n
  }

  // parsePercent: '3'→0.03, '3%'→0.03, '0.03'→0.03, '30'→0.30
  // 규칙: n >= 1 이면 /100, n < 1 이면 그대로
  function parsePercent(str) {
    if (str == null) return null
    var s = String(str).trim()
    if (s === '') return null
    var cleaned = s.replace(/%/g, '').replace(/,/g, '').trim()
    var n = parseFloat(cleaned)
    if (isNaN(n)) return null
    return n >= 1 ? n / 100 : n
  }

  // parseDecimal: K값, 수율 등 소수 — 쉼표만 제거
  function parseDecimal(str) {
    if (str == null) return null
    var n = parseFloat(String(str).replace(/,/g, '').trim())
    return isNaN(n) ? null : n
  }

  // parseInteger: 핀수, 물량 등 정수
  function parseInteger(str) {
    if (str == null) return null
    var n = parseInt(String(str).replace(/,/g, '').trim(), 10)
    return isNaN(n) ? null : n
  }

  // normalizeNode: "28 nm", "28nmlp", "28nm-lp" → "28nm"
  function normalizeNode(node) {
    var s = String(node || '').trim().toLowerCase().replace(/\s+/g, '')
    var m = s.match(/^(\d+(?:\.\d+)?nm)/)
    if (m) return m[1]
    if (/^\d+(?:\.\d+)?$/.test(s)) return s + 'nm'
    return s
  }

  // parseTSV: 탭 구분 텍스트 → { headers, rows }
  // 첫 행 숫자 비율 < 50%면 헤더로 자동 판단
  function parseTSV(text) {
    if (!text || !String(text).trim()) return { headers: [], rows: [] }
    var lines = String(text).split('\n').map(function (l) { return l.replace(/\r$/, '') })
    lines = lines.filter(function (l) { return l.trim() !== '' })
    if (lines.length === 0) return { headers: [], rows: [] }

    var firstRow = lines[0].split('\t')
    var numericCount = firstRow.filter(function (c) {
      var trimmed = c.trim()
      return trimmed !== '' && !isNaN(parseFloat(trimmed))
    }).length
    var hasHeader = firstRow.length === 0 || (numericCount / firstRow.length) < 0.5

    var headers = hasHeader ? firstRow : []
    var dataLines = hasHeader ? lines.slice(1) : lines
    var rows = dataLines.map(function (l) { return l.split('\t') })

    return { headers: headers, rows: rows }
  }

  // ── 포트폴리오 열 감지 패턴 (Story 2.1) ────────────────────────
  var PORTFOLIO_FIELD_PATTERNS = {
    name:          /품목|품명|제품명|모델명?|part\b|product(?!.?famil|.?group)|mpn|model\b|item\b|^name$/i,
    node:          /공정|노드|node|process|tech/i,
    dieArea:       /다이.*면적|다이.*크기|die.?area|die.?size|칩.*면적/i,
    waferSize:     /웨이퍼|wafer/i,
    'yield':       /수율|yield/i,
    pkgType:       /패키지|package|pkg/i,
    pins:          /핀수?$|^핀$|pin|ball/i,
    productFamily: /제품군|품종|family|category|카테고리/i,
    actualPrice:   /실구매|실가|구매가|단가|actual.*price|price\b/i,
    qty:           /물량|수량|qty|quantity|volume/i
  }

  // headers: string[] → { name: idx, node: idx, ... } (미감지 필드는 undefined)
  function detectPortfolioColumns(headers) {
    var result = {}
    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i] || '').trim()
      for (var field in PORTFOLIO_FIELD_PATTERNS) {
        if (result[field] !== undefined) continue
        if (PORTFOLIO_FIELD_PATTERNS[field].test(h)) {
          result[field] = i
          break
        }
      }
    }
    return result
  }

  // rows: string[][], headers: string[], columnMapping: {field: colIdx}
  // → { items: portfolioDataItem[], warnings: string[] }
  function parsePortfolioRows(rows, headers, columnMapping) {
    var items = []
    var warnings = []
    var hasAnyNumeric = false

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      if (!row || row.length < 2) continue

      var item = {}

      var get = function(field) {
        var idx = columnMapping[field]
        return (idx != null && idx !== undefined) ? (row[idx] || '') : ''
      }

      item.name          = String(get('name')).trim() || ('행' + (i + 1))
      item.node          = normalizeNode(get('node'))
      item.dieArea       = parseDecimal(get('dieArea'))
      item.waferSize     = parseInteger(get('waferSize'))
      item.pkgType       = String(get('pkgType')).trim()
      item.pins          = parseInteger(get('pins'))
      item.productFamily = String(get('productFamily')).trim() || '기타'
      item.actualPrice   = parseCurrency(get('actualPrice'))
      item.qty           = parseInteger(get('qty'))

      var yieldRaw = get('yield')
      if (yieldRaw !== '') {
        var yp = parsePercent(yieldRaw)
        item['yield'] = (yp != null) ? yp : parseDecimal(yieldRaw)
      } else {
        item['yield'] = null
      }

      if (item.dieArea != null || item.actualPrice != null || item.waferSize != null) {
        hasAnyNumeric = true
      }

      items.push(item)
    }

    if (!hasAnyNumeric && items.length > 0) {
      warnings.push('숫자 데이터를 찾을 수 없습니다. 예시: 품목명 | 공정노드 | 단가(원) | 물량')
      return { items: [], warnings: warnings }
    }

    var seen = Object.create(null), dups = []
    items.forEach(function(it) {
      if (seen[it.name]) { if (dups.indexOf(it.name) === -1) dups.push(it.name) }
      else seen[it.name] = true
    })
    if (dups.length) warnings.push('중복 제품명: ' + dups.join(', '))

    return { items: items, warnings: warnings }
  }

  // ── 인상 검토 열 감지 패턴 (Story 3.1) ───────────────────────────
  var REVIEW_FIELD_PATTERNS = {
    name:          /품목|품명|제품명|모델명?|part\b|product(?!.?famil|.?group)|mpn|model\b|item\b|^name$/i,
    currentPrice:  /현재단가|현재가|기존단가|기존가|current.?price|^단가$|^price$/i,
    requestedRate: /요청인상률?|요청률?|인상률?|인상율|requested.?rate|increase.?rate|인상/i,
    node:          /공정|노드|node|process|tech/i,
    waferSize:     /웨이퍼|wafer/i,
    dieArea:       /다이.*면적|다이.*크기|die.?area|die.?size|칩.*면적/i,
    'yield':       /수율|yield/i,
    pkgType:       /패키지|package|pkg/i,
    pins:          /핀수?$|^핀$|pin|ball/i,
    productFamily: /제품군|품종|family|category|카테고리/i
  }

  function detectReviewColumns(headers) {
    var result = {}
    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i] || '').trim()
      for (var field in REVIEW_FIELD_PATTERNS) {
        if (result[field] !== undefined) continue
        if (REVIEW_FIELD_PATTERNS[field].test(h)) { result[field] = i; break }
      }
    }
    return result
  }

  function parseReviewRows(rows, headers, columnMapping) {
    var items = []
    var warnings = []
    var hasAnyNumeric = false

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      if (!row || row.length < 2) continue

      var get = function(field) {
        var idx = columnMapping[field]
        return (idx != null) ? (row[idx] || '') : ''
      }

      var item = {}
      item.name          = String(get('name')).trim() || ('행' + (i + 1))
      item.currentPrice  = parseCurrency(get('currentPrice'))
      item.requestedRate = parsePercent(get('requestedRate'))
      item.node          = normalizeNode(get('node'))
      item.waferSize     = parseInteger(get('waferSize'))
      item.dieArea       = parseDecimal(get('dieArea'))
      item.pkgType       = String(get('pkgType')).trim()
      item.pins          = parseInteger(get('pins'))
      item.productFamily = String(get('productFamily')).trim() || '기타'

      var yieldRaw = get('yield')
      if (yieldRaw !== '') {
        var yp = parsePercent(yieldRaw)
        item['yield'] = yp != null ? yp : parseDecimal(yieldRaw)
      } else {
        item['yield'] = null
      }

      if (item.currentPrice != null || item.requestedRate != null) hasAnyNumeric = true
      items.push(item)
    }

    if (!hasAnyNumeric && items.length > 0) {
      warnings.push('숫자 데이터(현재단가 또는 요청인상률)를 찾을 수 없습니다.')
      return { items: [], warnings: warnings }
    }
    return { items: items, warnings: warnings }
  }

  Object.assign(window.ChipCalc, {
    parser: {
      parseCurrency:          parseCurrency,
      parsePercent:           parsePercent,
      parseDecimal:           parseDecimal,
      parseInteger:           parseInteger,
      normalizeNode:          normalizeNode,
      parseTSV:               parseTSV,
      detectPortfolioColumns: detectPortfolioColumns,
      parsePortfolioRows:     parsePortfolioRows,
      detectReviewColumns:    detectReviewColumns,
      parseReviewRows:        parseReviewRows
    }
  })
})()
