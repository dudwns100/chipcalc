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
  }

  Object.assign(window.ChipCalc, {
    ui: {
      toast:                toast,
      formatPercent:        formatPercent,
      formatCurrency:       formatCurrency,
      updateWaferPrice:     updateWaferPrice,
      refreshPortfolioView: function () {}
    }
  })
})()
