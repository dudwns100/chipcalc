;(function () {
  'use strict'
  window.ChipCalc = window.ChipCalc || {}

  var COLORS = { info: '#3b82f6', warn: '#f59e0b', error: '#ef4444' }

  function toast(msg, level) {
    if (typeof document === 'undefined' || !document.body) return
    var el = document.createElement('div')
    el.style.cssText = [
      'position:fixed', 'bottom:1.5rem', 'right:1.5rem', 'z-index:9999',
      'padding:0.75rem 1.25rem', 'border-radius:0.5rem',
      'font-size:0.875rem', 'color:#fff',
      'box-shadow:0 4px 6px rgba(0,0,0,0.1)',
      'background:' + (COLORS[level] || COLORS.info),
      'max-width:20rem', 'word-break:break-word'
    ].join(';')
    el.textContent = msg
    document.body.appendChild(el)
    setTimeout(function () { if (el.parentNode) el.remove() }, 3000)
  }

  function formatPercent(val) {
    return (val * 100).toFixed(2) + '%'
  }

  function formatCurrency(val) {
    return '$' + val.toFixed(4)
  }

  function updateWaferPrice(node, size, price) {
    var C = window.ChipCalc
    C.engine.setWaferPrice(node, size, price)
    var store = C.storage.load()
    store.wafer = C.engine.getWaferTable()
    C.storage.save(store)
    var hasData = C.state && C.state.portfolioData && C.state.portfolioData.length > 0
    if (hasData) {
      C.engine.recalculateAll()
      toast('웨이퍼 단가 저장됨', 'info')
    } else {
      toast('단가가 저장되었습니다. 포트폴리오 데이터 로드 후 분석을 재실행하세요.', 'info')
    }
  }

  // refreshPortfolioView — Story 2.2
  // portfolioData 전체를 읽어 그룹별 분포 테이블 렌더링 + 이상치 강조 + 에러 토스트
  function refreshPortfolioView() {
    var state = window.ChipCalc && window.ChipCalc.state
    var resultsEl = document.getElementById('cc-analysis-results')
    if (!resultsEl) return
    if (!state || !state.portfolioData || state.portfolioData.length === 0) {
      resultsEl.classList.add('hidden')
      var bubbleSec = document.getElementById('cc-bubble-section')
      if (bubbleSec) bubbleSec.classList.add('hidden')
      return
    }

    var items = state.portfolioData
    var skipped = []       // calcError 있는 품목명
    var outlierCount = 0
    var okCount = 0
    var groups = {}        // groupKey → [item, ...]

    for (var i = 0; i < items.length; i++) {
      var item = items[i]
      if (item.calcError) {
        skipped.push(item.name || ('행' + (i + 1)))
        continue
      }
      var groupKey = [item.node || '?', item.waferSize || '?', item.pkgType || '?'].join(' · ')
      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(item)
      if (item.isOutlier) outlierCount++
      else okCount++
    }

    // 에러 아이템 토스트 알림
    if (skipped.length > 0) {
      var msg = skipped.length <= 3
        ? ('계산 불가 품목: ' + skipped.join(', '))
        : ('알 수 없는 노드로 인해 ' + skipped.length + '개 품목이 제외되었습니다')
      toast(msg, 'warn')
    }

    // 요약 Pills
    var pillsEl = document.getElementById('cc-summary-pills')
    if (pillsEl) {
      var total = outlierCount + okCount
      pillsEl.innerHTML =
        '<span class="cc-pill total">전체 ' + total + '건</span>' +
        (outlierCount > 0 ? '<span class="cc-pill outlier">이상치 ' + outlierCount + '건</span>' : '') +
        '<span class="cc-pill ok">정상 ' + okCount + '건</span>' +
        (skipped.length > 0 ? '<span class="cc-pill error">제외 ' + skipped.length + '건</span>' : '')
    }

    // 결과 테이블 tbody
    var tbody = document.getElementById('cc-results-tbody')
    if (!tbody) return
    var rows = ''
    var sortedGroups = Object.keys(groups).sort()
    for (var gi = 0; gi < sortedGroups.length; gi++) {
      var gKey = sortedGroups[gi]
      var gItems = groups[gKey]
      // 그룹 헤더 행
      rows += '<tr class="cc-group-header"><td colspan="7">' + escapeHtml(gKey) + ' (' + gItems.length + '건)</td></tr>'
      // 그룹 내 품목 (outlier 먼저)
      gItems.sort(function(a, b) { return (b.isOutlier ? 1 : 0) - (a.isOutlier ? 1 : 0) })
      for (var ii = 0; ii < gItems.length; ii++) {
        var it = gItems[ii]
        var pricePerMm2 = (it.actualPrice != null && it.dieArea && it.dieArea > 0)
          ? (it.actualPrice / it.dieArea).toFixed(4)
          : '—'
        var ratio = (it.actualPrice != null && it.estimatedASP && it.estimatedASP > 0)
          ? ((it.actualPrice / it.estimatedASP - 1) * 100).toFixed(1) + '%'
          : '—'
        var badge = it.isOutlier
          ? '<span class="cc-badge-outlier">이상치</span>'
          : '<span class="cc-badge-ok">정상</span>'
        var rowClass = it.isOutlier ? 'cc-outlier-row' : ''
        rows += '<tr class="' + rowClass + '">' +
          '<td>' + escapeHtml(it.name || '') + '</td>' +
          '<td>' + escapeHtml(gKey) + '</td>' +
          '<td>$' + pricePerMm2 + '</td>' +
          '<td>' + (it.actualPrice != null ? '$' + it.actualPrice.toFixed(4) : '—') + '</td>' +
          '<td>' + (it.estimatedASP != null ? '$' + it.estimatedASP.toFixed(4) : '—') + '</td>' +
          '<td>' + ratio + '</td>' +
          '<td>' + badge + '</td>' +
          '</tr>'
      }
    }
    tbody.innerHTML = rows
    resultsEl.classList.remove('hidden')

    // 버블차트 렌더링 트리거 (Story 2.3)
    if (window.ChipCalc.chart && typeof window.ChipCalc.chart.renderPortfolioBubble === 'function') {
      window.ChipCalc.chart.renderPortfolioBubble(window.ChipCalc.state.portfolioData, false)
    }

    // 내보내기 바 활성화 (Story 2.5)
    if (typeof window.ChipCalc.ui.enablePortfolioExport === 'function') {
      window.ChipCalc.ui.enablePortfolioExport()
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  Object.assign(window.ChipCalc, {
    ui: {
      toast:                toast,
      formatPercent:        formatPercent,
      formatCurrency:       formatCurrency,
      updateWaferPrice:     updateWaferPrice,
      refreshPortfolioView: refreshPortfolioView
    }
  })
})()
