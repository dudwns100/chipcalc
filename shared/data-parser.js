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

  Object.assign(window.ChipCalc, {
    parser: {
      parseCurrency: parseCurrency,
      parsePercent:  parsePercent,
      parseDecimal:  parseDecimal,
      parseInteger:  parseInteger,
      parseTSV:      parseTSV
    }
  })
})()
