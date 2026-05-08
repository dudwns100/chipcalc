// shared/storage.js
// localStorage CRUD + export/import — Story 1.3
;(function () {
  'use strict'
  window.ChipCalc = window.ChipCalc || {}

  const CURRENT_VERSION = '1.0'
  const STORAGE_KEY = 'chipcalc_store'

  // GAP-01: columnMapping 탭별 분리, GAP-02: priceReviewHistory 스키마 포함
  const DEFAULTS = {
    version: CURRENT_VERSION,
    wafer: null,
    pkgs: null,
    kValues: { MCU: 1.0, PMIC: 1.0, '파워IC': 1.0, '기타': 1.0 },
    priceReviewHistory: [],
    columnMapping: { portfolio: {}, review: {} },
    waferBaseline: null,
    uiSettings: { threshold: 15, trendMode: 'all', classMode: 'hybrid', bubbleScale: 'sqrt', lang: 'ko' }
  }

  function _defaults() {
    return JSON.parse(JSON.stringify(DEFAULTS))
  }

  // ui.toast 안전 호출 — Story 1.4 전까지 toast 미구현
  function _toast(msg, level) {
    var ui = window.ChipCalc && window.ChipCalc.ui
    if (ui && typeof ui.toast === 'function') ui.toast(msg, level)
  }

  function _isStorageAvailable() {
    try {
      localStorage.setItem('__chipcalc_test', '1')
      localStorage.removeItem('__chipcalc_test')
      return true
    } catch (e) {
      return false
    }
  }

  function load() {
    if (!_isStorageAvailable()) {
      _toast('로컬 저장소를 사용할 수 없습니다. 설정이 유지되지 않을 수 있습니다.', 'warn')
      return _defaults()
    }
    try {
      var raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return _defaults()
      var store = JSON.parse(raw)
      if (store.version !== CURRENT_VERSION) {
        _toast('설정 데이터가 업데이트됩니다.', 'info')
        return Object.assign(_defaults(), store, { version: CURRENT_VERSION })
      }
      return Object.assign(_defaults(), store)
    } catch (e) {
      return _defaults()
    }
  }

  function save(store) {
    if (!_isStorageAvailable()) {
      _toast('로컬 저장소를 사용할 수 없습니다. 설정이 유지되지 않을 수 있습니다.', 'warn')
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        if (store.priceReviewHistory && store.priceReviewHistory.length > 100) {
          store.priceReviewHistory = store.priceReviewHistory.slice(-100)
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
        } catch (e2) {
          _toast('저장 공간이 부족합니다.', 'error')
        }
      }
    }
  }

  function exportConfig() {
    return JSON.stringify(load())
  }

  function importConfig(jsonStr) {
    try {
      var store = JSON.parse(jsonStr)
      save(store)
    } catch (e) {
      _toast('설정 가져오기에 실패했습니다.', 'error')
    }
  }

  Object.assign(window.ChipCalc, {
    storage: {
      load: load,
      save: save,
      exportConfig: exportConfig,
      importConfig: importConfig
    }
  })
})()
