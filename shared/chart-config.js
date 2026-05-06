;(function () {
  'use strict'
  window.ChipCalc = window.ChipCalc || {}

  var CHART_COLORS = {
    primary:  '#3b82f6',
    danger:   '#ef4444',
    warning:  '#f59e0b',
    success:  '#16a34a',
    text:     '#0f172a',
    gridLine: '#e2e8f0'
  }

  var CHART_FONT = { family: 'ui-monospace, monospace', size: 12 }

  function savePng(chartInstance, filename) {
    if (typeof document === 'undefined') return
    var dataUrl = chartInstance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
    var a = document.createElement('a')
    a.href = dataUrl
    a.download = filename + '.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function initChart(domId) {
    if (!window.echarts) {
      window.ChipCalc.ui.toast('차트를 불러올 수 없습니다. 페이지를 새로고침해주세요.', 'error')
      return null
    }
    var el = document.getElementById(domId)
    if (!el) return null
    return window.echarts.init(el)
  }

  Object.assign(window.ChipCalc, {
    chart: {
      savePng:   savePng,
      initChart: initChart,
      COLORS:    CHART_COLORS,
      FONT:      CHART_FONT
    }
  })
})()
