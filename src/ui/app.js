/**
 * SplitBill Main Application Controller
 * Mengintegrasikan Engine, Validator, Formatter Multi-Currency,
 * Scanner Struk Akurat dengan Deteksi Biru (Otomatis & Manual di dalam Kamera),
 * Fitur Manual 2-Step, dan Bagikan Hasil Struk Langsung.
 */

import { calculateBill, SplitMode, FeeType } from '../calculation/engine.js';
import { validateInput } from '../validation/validator.js';
import {
  WORLD_CURRENCIES,
  getCurrencyInfo,
  formatCurrency,
  parseCurrencyInput,
  generateShareText
} from '../formatting/formatter.js?v=4.0';
import {
  parseReceiptText,
  preprocessReceiptImage,
  scanReceiptImage,
  detectPaperBounds,
  drawBlueScannerOverlay,
  validateReceiptFile,
  validateReceiptContent
} from '../scanner/receiptScanner.js?v=4.3';

// State Aplikasi
const state = {
  mode: SplitMode.EQUAL,
  merchantName: '',
  currency: 'IDR',
  subtotal: 200000,
  roundingStep: 1,
  scanCaptureMode: 'AUTO', // 'AUTO' (Otomatis di kamera) | 'MANUAL' (Cekrek manual di kamera)
  participants: [
    { id: 'p_1', name: 'Budi' },
    { id: 'p_2', name: 'Siti' },
    { id: 'p_3', name: 'Andi' }
  ],
  items: [
    { id: 'i_1', name: 'Nasi Goreng Spesial', price: 35000, qty: 2, participantIds: ['p_1', 'p_2'] },
    { id: 'i_2', name: 'Ayam Bakar Madu', price: 45000, qty: 1, participantIds: ['p_2'] },
    { id: 'i_3', name: 'Mie Goreng Seafood', price: 40000, qty: 1, participantIds: ['p_3'] },
    { id: 'i_4', name: 'Es Teh Manis', price: 8000, qty: 3, participantIds: ['p_1', 'p_2', 'p_3'] }
  ],
  fees: {
    discount: { type: FeeType.PERCENT, value: 10 },
    service: { type: FeeType.PERCENT, value: 5 },
    tax: { type: FeeType.PERCENT, value: 10 },
    tip: { type: FeeType.PERCENT, value: 0 }
  },
  paymentInfo: {
    bankName: '',
    accountNumber: '',
    accountHolder: ''
  },
  theme: localStorage.getItem('splitbill_theme') || 'dark',
  lastCalculationResult: null
};

// Storage Key
const STORAGE_KEY = 'splitbill_saved_session_v1';

function fmtMoney(amount, includeSymbol = true) {
  return formatCurrency(amount, state.currency, includeSymbol);
}

function parseMoney(rawStr) {
  return parseCurrencyInput(rawStr, state.currency);
}

function saveToStorage() {
  try {
    const sessionData = {
      mode: state.mode,
      merchantName: state.merchantName,
      currency: state.currency,
      subtotal: state.subtotal,
      roundingStep: state.roundingStep,
      participants: state.participants,
      items: state.items,
      fees: state.fees,
      paymentInfo: state.paymentInfo
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed) {
      if (parsed.mode) state.mode = parsed.mode;
      if (typeof parsed.merchantName === 'string') state.merchantName = parsed.merchantName;
      if (typeof parsed.currency === 'string') state.currency = parsed.currency;
      if (typeof parsed.subtotal === 'number') state.subtotal = parsed.subtotal;
      if (parsed.roundingStep) state.roundingStep = Number(parsed.roundingStep) || 1;
      if (Array.isArray(parsed.participants) && parsed.participants.length > 0) {
        state.participants = parsed.participants;
      }
      if (Array.isArray(parsed.items)) state.items = parsed.items;
      if (parsed.fees) state.fees = parsed.fees;
      if (parsed.paymentInfo) state.paymentInfo = parsed.paymentInfo;
      return true;
    }
  } catch (e) {
    console.warn('Storage load failed:', e);
  }
  return false;
}

// SVG Templates
const SVG_ICONS = {
  SUN: `<svg class="icon-svg icon-md" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  MOON: `<svg class="icon-svg icon-md" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  TRASH: `<svg class="icon-svg icon-sm" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
  CLOSE: `<svg class="icon-svg icon-sm" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  CHEVRON_UP: `<svg class="icon-svg icon-md" viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg>`,
  CHEVRON_DOWN: `<svg class="icon-svg icon-md" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>`,
  CHECK: `<svg class="icon-svg icon-md" viewBox="0 0 24 24" style="stroke: var(--accent-success);"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`
};

document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initTheme();
  initCurrencyDropdowns();
  initLandingNavigation();
  initModeSwitcher();
  initEqualModeControls();
  initItemizedModeControls();
  initFeeControls();
  initRoundingControls();
  initPaymentControls();
  initActionButtons();
  initCollapsible();
  initReceiptScanner();

  syncLoadedStateToUI();

  renderEqualParticipants();
  renderItemizedParticipants();
  renderItems();
  updateCalculation();
  initPreloader();
});

// ==========================================
// 0. Preloader Management
// ==========================================
function initPreloader() {
  const preloader = document.getElementById('appPreloader');
  if (!preloader) return;

  const dismiss = () => {
    setTimeout(() => {
      preloader.classList.add('fade-out');
      preloader.addEventListener('transitionend', () => {
        if (preloader.parentNode) {
          preloader.parentNode.removeChild(preloader);
        }
      }, { once: true });
    }, 1500);
  };

  if (document.readyState === 'complete') {
    dismiss();
  } else {
    window.addEventListener('load', dismiss, { once: true });
  }
}

// ==========================================
// 0a. Dropdown Seluruh Mata Uang Dunia & Info Merchant (Hanya di Step 1)
// ==========================================
function updateManualSetupButtonsState() {
  const setupMerchantInput = document.getElementById('merchantNameInput');
  const btnManualGoEqual = document.getElementById('btnManualGoEqual');
  const btnManualGoItemized = document.getElementById('btnManualGoItemized');
  const hasMerchant = Boolean(setupMerchantInput?.value?.trim());

  if (btnManualGoEqual) btnManualGoEqual.disabled = !hasMerchant;
  if (btnManualGoItemized) btnManualGoItemized.disabled = !hasMerchant;
}

function initCurrencyDropdowns() {
  const setupSelect = document.getElementById('merchantCurrencySelect');

  const optionsHtml = WORLD_CURRENCIES.map(c => {
    return `<option value="${c.code}">${c.code} (${c.symbol}) - ${c.name}</option>`;
  }).join('');

  if (setupSelect) {
    setupSelect.innerHTML = optionsHtml;
    setupSelect.value = state.currency || 'IDR';
    setupSelect.addEventListener('change', (e) => {
      setCurrency(e.target.value);
    });
  }

  const setupMerchantInput = document.getElementById('merchantNameInput');
  if (setupMerchantInput) {
    setupMerchantInput.value = state.merchantName || '';
    setupMerchantInput.addEventListener('input', (e) => {
      state.merchantName = e.target.value.trim();
      updateManualSetupButtonsState();
      saveToStorage();
    });
  }

  updateManualSetupButtonsState();
}

function setCurrency(newCurrencyCode) {
  const info = getCurrencyInfo(newCurrencyCode);
  state.currency = info.code;

  if (info.decimals > 0 && state.roundingStep > 1) {
    state.roundingStep = 1;
  }

  syncCurrencySymbolsToUI();
  renderItems();
  updateCalculation();
}

function syncCurrencySymbolsToUI() {
  const info = getCurrencyInfo(state.currency);
  const setupSelect = document.getElementById('merchantCurrencySelect');
  if (setupSelect && setupSelect.value !== info.code) setupSelect.value = info.code;

  const equalPrefix = document.getElementById('equalCurrencyPrefix');
  if (equalPrefix) equalPrefix.textContent = info.symbol;

  document.querySelectorAll('.fee-nominal-unit-btn').forEach(btn => {
    btn.textContent = info.symbol;
  });

  const subtotalInput = document.getElementById('equalSubtotalInput');
  if (subtotalInput) {
    subtotalInput.value = fmtMoney(state.subtotal, false);
  }

  ['discount', 'service', 'tax', 'tip'].forEach(key => {
    const fee = state.fees[key];
    const input = document.getElementById(`${key}ValInput`);
    if (input && fee && fee.type === FeeType.NOMINAL) {
      input.value = fmtMoney(fee.value, false);
    }
  });
}

// ==========================================
// 0b. Alur Halaman: Home Screen -> Pilih Metode -> Step 1 Manual Setup -> Step 2 Kalkulator
// ==========================================
function navigateToView(viewName, scroll = true) {
  state.currentView = viewName;
  const landing = document.getElementById('landingView');
  const methodView = document.getElementById('methodSelectView');
  const manualSetup = document.getElementById('manualSetupView');
  const calc = document.getElementById('calculatorView');
  const resetBtn = document.getElementById('resetSessionBtn');

  if (viewName === 'calculator') {
    document.body.classList.remove('is-landing');
    if (landing) landing.style.display = 'none';
    if (methodView) methodView.style.display = 'none';
    if (manualSetup) manualSetup.style.display = 'none';
    if (calc) calc.style.display = 'block';
    if (resetBtn) resetBtn.style.display = 'inline-flex';
    if (window.location.hash !== '#kalkulator') {
      window.location.hash = '#kalkulator';
    }
  } else if (viewName === 'manual-setup') {
    document.body.classList.add('is-landing');
    if (landing) landing.style.display = 'none';
    if (methodView) methodView.style.display = 'none';
    if (calc) calc.style.display = 'none';
    if (manualSetup) manualSetup.style.display = 'flex';
    if (resetBtn) resetBtn.style.display = 'none';
    updateManualSetupButtonsState();
    if (window.location.hash !== '#info-merchant') {
      window.location.hash = '#info-merchant';
    }
  } else if (viewName === 'method') {
    document.body.classList.add('is-landing');
    if (landing) landing.style.display = 'none';
    if (calc) calc.style.display = 'none';
    if (manualSetup) manualSetup.style.display = 'none';
    if (methodView) methodView.style.display = 'flex';
    if (resetBtn) resetBtn.style.display = 'none';
    if (window.location.hash !== '#pilih-metode') {
      window.location.hash = '#pilih-metode';
    }
  } else {
    document.body.classList.add('is-landing');
    if (calc) calc.style.display = 'none';
    if (methodView) methodView.style.display = 'none';
    if (manualSetup) manualSetup.style.display = 'none';
    if (landing) landing.style.display = 'flex';
    if (resetBtn) resetBtn.style.display = 'none';
    if (['#kalkulator', '#pilih-metode', '#info-merchant'].includes(window.location.hash)) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  if (scroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function switchModeTo(targetMode) {
  state.mode = targetMode;
  const tabEqual = document.getElementById('tabModeEqual');
  const tabItemized = document.getElementById('tabModeItemized');
  const sectionEqual = document.getElementById('sectionEqualMode');
  const sectionItemized = document.getElementById('sectionItemizedMode');

  if (targetMode === SplitMode.ITEMIZED) {
    tabItemized?.classList.add('active');
    tabEqual?.classList.remove('active');
    if (sectionEqual) sectionEqual.style.display = 'none';
    if (sectionItemized) sectionItemized.style.display = 'block';
  } else {
    tabEqual?.classList.add('active');
    tabItemized?.classList.remove('active');
    if (sectionEqual) sectionEqual.style.display = 'block';
    if (sectionItemized) sectionItemized.style.display = 'none';
  }
  updateCalculation();
}

function initLandingNavigation() {
  const heroBtnStart = document.getElementById('heroBtnStart');
  heroBtnStart?.addEventListener('click', () => {
    navigateToView('method');
  });

  const btnBackToLanding = document.getElementById('btnBackToLanding');
  btnBackToLanding?.addEventListener('click', () => {
    navigateToView('landing');
  });

  const cardChoiceScan = document.getElementById('cardChoiceScan');
  if (cardChoiceScan) {
    const triggerScanEntry = () => openScannerModal();
    cardChoiceScan.addEventListener('click', triggerScanEntry);
    cardChoiceScan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerScanEntry();
      }
    });
  }

  const cardChoiceManual = document.getElementById('cardChoiceManual');
  if (cardChoiceManual) {
    const triggerManualEntry = () => {
      state.merchantName = '';
      const setupMerchantInput = document.getElementById('merchantNameInput');
      if (setupMerchantInput) setupMerchantInput.value = '';
      updateManualSetupButtonsState();
      navigateToView('manual-setup');
    };
    cardChoiceManual.addEventListener('click', triggerManualEntry);
    cardChoiceManual.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerManualEntry();
      }
    });
  }

  const btnBackFromManualSetup = document.getElementById('btnBackFromManualSetup');
  btnBackFromManualSetup?.addEventListener('click', () => {
    navigateToView('method');
  });

  const applyManualSetupAndGo = (targetSplitMode) => {
    const setupCurrency = document.getElementById('merchantCurrencySelect')?.value || 'IDR';
    const setupMerchant = document.getElementById('merchantNameInput')?.value?.trim() || '';
    if (!setupMerchant) {
      updateManualSetupButtonsState();
      return;
    }
    state.merchantName = setupMerchant;
    setCurrency(setupCurrency);
    switchModeTo(targetSplitMode);
    navigateToView('calculator');
  };

  const btnManualGoEqual = document.getElementById('btnManualGoEqual');
  btnManualGoEqual?.addEventListener('click', () => {
    applyManualSetupAndGo(SplitMode.EQUAL);
  });

  const btnManualGoItemized = document.getElementById('btnManualGoItemized');
  btnManualGoItemized?.addEventListener('click', () => {
    applyManualSetupAndGo(SplitMode.ITEMIZED);
  });

  const brandLogoBtn = document.getElementById('brandLogoBtn');
  if (brandLogoBtn) {
    brandLogoBtn.addEventListener('click', () => navigateToView('landing'));
    brandLogoBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToView('landing');
      }
    });
  }

  const btnBackToHome = document.getElementById('btnBackToHome');
  btnBackToHome?.addEventListener('click', () => {
    navigateToView('method');
  });

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#kalkulator') {
      if (state.currentView !== 'calculator') navigateToView('calculator', false);
    } else if (window.location.hash === '#info-merchant') {
      if (state.currentView !== 'manual-setup') navigateToView('manual-setup', false);
    } else if (window.location.hash === '#pilih-metode') {
      if (state.currentView !== 'method') navigateToView('method', false);
    } else {
      if (state.currentView !== 'landing') navigateToView('landing', false);
    }
  });

  if (window.location.hash === '#kalkulator') {
    navigateToView('calculator', false);
  } else if (window.location.hash === '#info-merchant') {
    navigateToView('manual-setup', false);
  } else if (window.location.hash === '#pilih-metode') {
    navigateToView('method', false);
  } else {
    navigateToView('landing', false);
  }
}

// ==========================================
// 1. Theme Management (Dark / Light)
// ==========================================
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();

  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      localStorage.setItem('splitbill_theme', state.theme);
      updateThemeIcon();
    });
  }
}

function updateThemeIcon() {
  const iconSpan = document.getElementById('themeIcon');
  if (iconSpan) {
    iconSpan.innerHTML = state.theme === 'dark' ? SVG_ICONS.SUN : SVG_ICONS.MOON;
  }
}

// ==========================================
// 2. Mode Switcher (Bagi Rata vs Per Pesanan)
// ==========================================
function initModeSwitcher() {
  const tabEqual = document.getElementById('tabModeEqual');
  const tabItemized = document.getElementById('tabModeItemized');

  tabEqual?.addEventListener('click', () => switchModeTo(SplitMode.EQUAL));
  tabItemized?.addEventListener('click', () => switchModeTo(SplitMode.ITEMIZED));
}

// ==========================================
// 3. Equal Mode Controls
// ==========================================
function initEqualModeControls() {
  const subtotalInput = document.getElementById('equalSubtotalInput');
  const btnDec = document.getElementById('btnDecParticipants');
  const btnInc = document.getElementById('btnIncParticipants');
  const countDisplay = document.getElementById('participantCountDisplay');

  subtotalInput?.addEventListener('input', (e) => {
    const rawVal = parseMoney(e.target.value);
    state.subtotal = rawVal;
    updateCalculation();
  });

  subtotalInput?.addEventListener('blur', () => {
    subtotalInput.value = fmtMoney(state.subtotal, false);
  });

  btnDec?.addEventListener('click', () => {
    if (state.participants.length > 1) {
      state.participants.pop();
      countDisplay.textContent = state.participants.length;
      renderEqualParticipants();
      renderItemizedParticipants();
      renderItems();
      updateCalculation();
    }
  });

  btnInc?.addEventListener('click', () => {
    const nextIdx = state.participants.length + 1;
    state.participants.push({
      id: `p_${Date.now()}`,
      name: `Teman ${nextIdx}`
    });
    countDisplay.textContent = state.participants.length;
    renderEqualParticipants();
    renderItemizedParticipants();
    renderItems();
    updateCalculation();
  });
}

function renderEqualParticipants() {
  const container = document.getElementById('equalParticipantsList');
  if (!container) return;
  container.innerHTML = '';

  state.participants.forEach((p, idx) => {
    const chip = document.createElement('div');
    chip.className = 'participant-chip';
    chip.innerHTML = `
      <div class="participant-avatar">${p.name.charAt(0).toUpperCase()}</div>
      <input type="text" value="${escapeHtml(p.name)}" style="background:transparent; border:none; color:inherit; font:inherit; width:90px; outline:none;" data-id="${p.id}">
    `;

    const input = chip.querySelector('input');
    input.addEventListener('change', (e) => {
      p.name = e.target.value.trim() || `Peserta ${idx + 1}`;
      renderItemizedParticipants();
      updateCalculation();
    });

    container.appendChild(chip);
  });
}

// ==========================================
// 4. Itemized Mode Controls
// ==========================================
function initItemizedModeControls() {
  const newPartInput = document.getElementById('newParticipantInput');
  const btnAddPart = document.getElementById('btnAddParticipant');
  const btnAddItem = document.getElementById('btnAddItem');

  btnAddPart?.addEventListener('click', () => {
    const name = newPartInput.value.trim();
    if (name) {
      const newP = { id: `p_${Date.now()}`, name };
      state.participants.push(newP);
      newPartInput.value = '';
      renderEqualParticipants();
      renderItemizedParticipants();
      renderItems();
      document.getElementById('participantCountDisplay').textContent = state.participants.length;
      updateCalculation();
    }
  });

  newPartInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnAddPart.click();
  });

  btnAddItem?.addEventListener('click', () => {
    const currInfo = getCurrencyInfo(state.currency);
    const defaultPrice = currInfo.decimals > 0 ? 10 : 25000;
    state.items.push({
      id: `i_${Date.now()}`,
      name: `Menu #${state.items.length + 1}`,
      price: defaultPrice,
      qty: 1,
      participantIds: state.participants.length > 0 ? [state.participants[0].id] : []
    });
    renderItems();
    updateCalculation();
  });
}

function renderItemizedParticipants() {
  const container = document.getElementById('itemizedParticipantsList');
  if (!container) return;
  container.innerHTML = '';

  state.participants.forEach((p) => {
    const chip = document.createElement('div');
    chip.className = 'participant-chip';
    chip.innerHTML = `
      <div class="participant-avatar">${p.name.charAt(0).toUpperCase()}</div>
      <span>${escapeHtml(p.name)}</span>
      ${state.participants.length > 1 ? `<button class="chip-remove" data-id="${p.id}" title="Hapus">${SVG_ICONS.CLOSE}</button>` : ''}
    `;

    const removeBtn = chip.querySelector('.chip-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        state.participants = state.participants.filter(item => item.id !== p.id);
        state.items.forEach(it => {
          it.participantIds = it.participantIds.filter(id => id !== p.id);
        });
        document.getElementById('participantCountDisplay').textContent = state.participants.length;
        renderEqualParticipants();
        renderItemizedParticipants();
        renderItems();
        updateCalculation();
      });
    }

    container.appendChild(chip);
  });
}

function renderItems() {
  const container = document.getElementById('itemsContainer');
  if (!container) return;
  container.innerHTML = '';

  const currSymbol = getCurrencyInfo(state.currency).symbol;

  state.items.forEach((item, itemIdx) => {
    const card = document.createElement('div');
    card.className = 'item-card';

    const itemTotal = (item.price || 0) * (item.qty || 1);

    card.innerHTML = `
      <div class="item-card-header-row">
        <div class="item-name-col">
          <label class="item-mini-label">Nama Menu</label>
          <input class="input-text item-name-input" type="text" placeholder="Contoh: Nasi Goreng" value="${escapeHtml(item.name)}">
        </div>
        <button class="item-delete-btn" title="Hapus Menu" type="button" aria-label="Hapus Menu">
          ${SVG_ICONS.TRASH}
        </button>
      </div>

      <div class="item-card-controls-row">
        <div class="item-control-col item-price-col">
          <label class="item-mini-label">Harga Satuan</label>
          <div class="input-currency-wrapper item-price-input-wrap">
            <span class="input-currency-prefix" style="left: 12px; font-size: 13px;">${escapeHtml(currSymbol)}</span>
            <input class="input-text tabular-nums item-price-field" type="text" inputmode="decimal" placeholder="0" value="${fmtMoney(item.price, false)}">
          </div>
        </div>

        <div class="item-control-col item-qty-col">
          <label class="item-mini-label">Jumlah (Porsi)</label>
          <div class="item-qty-stepper">
            <button class="qty-btn qty-btn-dec" type="button" aria-label="Kurang Porsi">
              <svg class="icon-svg icon-sm" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>
            </button>
            <input class="input-text tabular-nums qty-number-input" type="number" min="1" max="999" value="${item.qty}">
            <button class="qty-btn qty-btn-inc" type="button" aria-label="Tambah Porsi">
              <svg class="icon-svg icon-sm" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="item-allocation-section">
        <div class="item-allocation-label">
          <span>Siapa yang pesan menu ini?</span>
          <span class="item-subtotal-badge tabular-nums">Total: ${fmtMoney(itemTotal)}</span>
        </div>
        <div class="participant-selectors"></div>
      </div>
    `;

    const nameInput = card.querySelector('.item-name-input');
    const priceInput = card.querySelector('.item-price-field');
    const qtyInput = card.querySelector('.qty-number-input');
    const btnDec = card.querySelector('.qty-btn-dec');
    const btnInc = card.querySelector('.qty-btn-inc');
    const delBtn = card.querySelector('.item-delete-btn');
    const subtotalBadge = card.querySelector('.item-subtotal-badge');

    const updateItemTotal = () => {
      const tot = (item.price || 0) * (item.qty || 1);
      if (subtotalBadge) subtotalBadge.textContent = `Total: ${fmtMoney(tot)}`;
    };

    nameInput.addEventListener('input', (e) => {
      item.name = e.target.value;
      updateCalculation();
    });

    priceInput.addEventListener('input', (e) => {
      item.price = parseMoney(e.target.value);
      updateItemTotal();
      updateCalculation();
    });

    priceInput.addEventListener('blur', () => {
      priceInput.value = fmtMoney(item.price, false);
    });

    qtyInput.addEventListener('input', (e) => {
      item.qty = Math.max(1, parseInt(e.target.value, 10) || 1);
      updateItemTotal();
      updateCalculation();
    });

    btnDec.addEventListener('click', () => {
      if (item.qty > 1) {
        item.qty -= 1;
        qtyInput.value = item.qty;
        updateItemTotal();
        updateCalculation();
      }
    });

    btnInc.addEventListener('click', () => {
      item.qty += 1;
      qtyInput.value = item.qty;
      updateItemTotal();
      updateCalculation();
    });

    delBtn.addEventListener('click', () => {
      state.items.splice(itemIdx, 1);
      renderItems();
      updateCalculation();
    });

    const selectorWrap = card.querySelector('.participant-selectors');

    if (state.participants.length > 1) {
      const allSelected = state.participants.every(p => item.participantIds.includes(p.id));
      const allChip = document.createElement('button');
      allChip.type = 'button';
      allChip.className = `person-select-chip select-all-chip ${allSelected ? 'selected' : ''}`;
      allChip.innerHTML = `<span>Semua</span>`;
      allChip.title = 'Pilih semua teman untuk bagi rata menu ini';
      allChip.addEventListener('click', () => {
        const currentlyAll = state.participants.every(p => item.participantIds.includes(p.id));
        if (currentlyAll) {
          item.participantIds = [];
        } else {
          item.participantIds = state.participants.map(p => p.id);
        }
        renderItems();
        updateCalculation();
      });
      selectorWrap.appendChild(allChip);
    }

    state.participants.forEach(p => {
      const isSelected = item.participantIds.includes(p.id);
      const pChip = document.createElement('button');
      pChip.type = 'button';
      pChip.className = `person-select-chip ${isSelected ? 'selected' : ''}`;
      pChip.innerHTML = `
        <span class="participant-avatar" style="width:16px; height:16px; font-size:9px;">${p.name.charAt(0).toUpperCase()}</span>
        <span>${escapeHtml(p.name)}</span>
      `;

      pChip.addEventListener('click', () => {
        if (item.participantIds.includes(p.id)) {
          item.participantIds = item.participantIds.filter(id => id !== p.id);
          pChip.classList.remove('selected');
        } else {
          item.participantIds.push(p.id);
          pChip.classList.add('selected');
        }
        updateCalculation();
      });

      selectorWrap.appendChild(pChip);
    });

    container.appendChild(card);
  });
}

// ==========================================
// 5. Fee Settings & Presets
// ==========================================
function initFeeControls() {
  const feeKeys = ['discount', 'service', 'tax', 'tip'];

  feeKeys.forEach(key => {
    const input = document.getElementById(`${key}ValInput`);
    if (!input) return;

    input.addEventListener('input', (e) => {
      const val = state.fees[key].type === FeeType.PERCENT
        ? parseFloat(e.target.value) || 0
        : parseMoney(e.target.value);
      state.fees[key].value = val;
      updateCalculation();
    });
  });

  document.querySelectorAll('.toggle-unit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const feeKey = btn.dataset.fee;
      const unit = btn.dataset.unit;
      const parent = btn.closest('.toggle-unit');
      parent.querySelectorAll('.toggle-unit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.fees[feeKey].type = unit;
      const input = document.getElementById(`${feeKey}ValInput`);
      if (unit === FeeType.NOMINAL) {
        input.value = fmtMoney(state.fees[feeKey].value, false);
      } else {
        input.value = state.fees[feeKey].value;
      }
      updateCalculation();
    });
  });

  document.querySelectorAll('.preset-chip[data-target]').forEach(chip => {
    chip.addEventListener('click', () => {
      const target = chip.dataset.target;
      const val = Number(chip.dataset.val);
      state.fees[target].value = val;

      const input = document.getElementById(`${target}ValInput`);
      if (input) input.value = val;

      state.fees[target].type = FeeType.PERCENT;
      const feeGroup = input.closest('.form-group');
      const unitBtns = feeGroup.querySelectorAll('.toggle-unit-btn');
      unitBtns.forEach(b => {
        if (b.dataset.unit === 'PERCENT') b.classList.add('active');
        else b.classList.remove('active');
      });

      updateCalculation();
    });
  });
}

function initCollapsible() {
  const btn = document.getElementById('toggleFeesBtn');
  const content = document.getElementById('feesContent');
  const icon = document.getElementById('toggleFeesIcon');

  if (btn && content && icon) {
    btn.addEventListener('click', () => {
      const isHidden = content.classList.toggle('hidden');
      icon.innerHTML = isHidden ? SVG_ICONS.CHEVRON_DOWN : SVG_ICONS.CHEVRON_UP;
      btn.setAttribute('aria-expanded', !isHidden);
    });
  }
}

// ==========================================
// 5b. Rounding Controls
// ==========================================
function initRoundingControls() {
  const buttons = document.querySelectorAll('.rounding-pill-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number(btn.dataset.rounding) || 1;
      state.roundingStep = val;
      buttons.forEach(b => {
        if (Number(b.dataset.rounding) === val) b.classList.add('active');
        else b.classList.remove('active');
      });
      saveToStorage();
      updateCalculation();
    });
  });
}

// ==========================================
// 5c. Payment Controls & Storage Sync
// ==========================================
function initPaymentControls() {
  const bankInput = document.getElementById('paymentBankInput');
  const accInput = document.getElementById('paymentAccountInput');
  const holderInput = document.getElementById('paymentHolderInput');

  if (bankInput && state.paymentInfo.bankName) bankInput.value = state.paymentInfo.bankName;
  if (accInput && state.paymentInfo.accountNumber) accInput.value = state.paymentInfo.accountNumber;
  if (holderInput && state.paymentInfo.accountHolder) holderInput.value = state.paymentInfo.accountHolder;

  document.querySelectorAll('.payment-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bank = btn.dataset.bank;
      if (bankInput) {
        bankInput.value = bank;
        state.paymentInfo.bankName = bank;
        saveToStorage();
        updateCalculation();
      }
    });
  });

  [bankInput, accInput, holderInput].forEach(inp => {
    if (!inp) return;
    inp.addEventListener('input', () => {
      state.paymentInfo.bankName = (bankInput?.value || '').trim();
      state.paymentInfo.accountNumber = (accInput?.value || '').trim();
      state.paymentInfo.accountHolder = (holderInput?.value || '').trim();
      saveToStorage();
      updateCalculation();
    });
  });
}

function syncLoadedStateToUI() {
  syncCurrencySymbolsToUI();

  const setupMerchantInput = document.getElementById('merchantNameInput');
  if (setupMerchantInput) setupMerchantInput.value = state.merchantName || '';
  updateManualSetupButtonsState();

  const subtotalInput = document.getElementById('equalSubtotalInput');
  if (subtotalInput) {
    subtotalInput.value = fmtMoney(state.subtotal, false);
  }
  const countDisplay = document.getElementById('participantCountDisplay');
  if (countDisplay) {
    countDisplay.textContent = state.participants.length;
  }

  const tabEqual = document.getElementById('tabModeEqual');
  const tabItemized = document.getElementById('tabModeItemized');
  const sectionEqual = document.getElementById('sectionEqualMode');
  const sectionItemized = document.getElementById('sectionItemizedMode');

  if (state.mode === SplitMode.ITEMIZED) {
    tabItemized?.classList.add('active');
    tabEqual?.classList.remove('active');
    if (sectionEqual) sectionEqual.style.display = 'none';
    if (sectionItemized) sectionItemized.style.display = 'block';
  } else {
    tabEqual?.classList.add('active');
    tabItemized?.classList.remove('active');
    if (sectionEqual) sectionEqual.style.display = 'block';
    if (sectionItemized) sectionItemized.style.display = 'none';
  }

  ['discount', 'service', 'tax', 'tip'].forEach(key => {
    const fee = state.fees[key];
    const input = document.getElementById(`${key}ValInput`);
    if (input && fee) {
      input.value = fee.type === FeeType.NOMINAL
        ? fmtMoney(fee.value, false)
        : fee.value;
      const feeGroup = input.closest('.form-group');
      if (feeGroup) {
        const unitBtns = feeGroup.querySelectorAll('.toggle-unit-btn');
        unitBtns.forEach(b => {
          if (b.dataset.unit === fee.type) b.classList.add('active');
          else b.classList.remove('active');
        });
      }
    }
  });

  const currentRounding = Number(state.roundingStep) || 1;
  const roundingBtns = document.querySelectorAll('.rounding-pill-btn');
  roundingBtns.forEach(b => {
    if (Number(b.dataset.rounding) === currentRounding) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
}

// ==========================================
// 6. Action Buttons & Unduh Struk (gambar PNG lengkap)
// ==========================================
const RECEIPT_AVATAR_COLORS = ['#6BB1AD', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#EF4444', '#14B8A6'];

function receiptRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function receiptTruncate(ctx, text, maxWidth) {
  let t = String(text || '');
  if (ctx.measureText(t).width <= maxWidth) return t;
  while (t.length > 1 && ctx.measureText(t + '...').width > maxWidth) t = t.slice(0, -1);
  return t + '...';
}

/**
 * Menggambar struk lengkap (header merchant + total, rincian per orang, ringkasan biaya, footer)
 * dengan layout kartu bergaya "nota modern" berwarna hijau tua.
 */
function renderReceiptImageBlob() {
  const res = state.lastCalculationResult;
  if (!res) return Promise.resolve(null);

  const scale = 2;
  const W = 640;
  const PAD = 36;
  const FONT = '"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
  const people = res.participantResults || [];
  const isItemized = state.mode === SplitMode.ITEMIZED;

  const summaryRows = [['Subtotal Menu', fmtMoney(res.subtotal)]];
  if (res.discountAmount > 0) summaryRows.push(['Diskon', `-${fmtMoney(res.discountAmount)}`]);
  if (res.serviceAmount > 0) summaryRows.push(['Service Charge', `+${fmtMoney(res.serviceAmount)}`]);
  if (res.taxAmount > 0) summaryRows.push(['Pajak', `+${fmtMoney(res.taxAmount)}`]);
  if (res.tipAmount > 0) summaryRows.push(['Tip', `+${fmtMoney(res.tipAmount)}`]);
  if (res.roundingDifference) {
    const d = res.roundingDifference;
    summaryRows.push(['Pembulatan', `${d > 0 ? '+' : '-'}${fmtMoney(Math.abs(d))}`]);
  }

  const personLines = (p) => (isItemized && Array.isArray(p.items) && p.items.length > 0 ? p.items.length : 1)
    + (p.serviceShare > 0 ? 1 : 0) + (p.taxShare > 0 ? 1 : 0) + (p.discountShare > 0 ? 1 : 0);

  const HEADER_H = 210;
  const CARD_HEADER_H = 54;
  const LINE_H = 26;
  let contentH = 0;
  people.forEach(p => { contentH += CARD_HEADER_H + personLines(p) * LINE_H + 26; });
  const SUMMARY_H = 70 + summaryRows.length * LINE_H + 70;
  const FOOTER_H = 70;
  const H = HEADER_H + contentH + SUMMARY_H + FOOTER_H;

  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Latar & header gelap
  ctx.fillStyle = '#EDF3F2';
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, HEADER_H);
  grad.addColorStop(0, '#0F1D1D');
  grad.addColorStop(1, '#1E3A39');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, HEADER_H);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6BB1AD';
  ctx.font = `800 13px ${FONT}`;
  ctx.fillText('SPLITBILL', PAD, 46);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#A7BCBD';
  ctx.font = `600 13px ${FONT}`;
  const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  ctx.fillText(dateStr, W - PAD, 46);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 28px ${FONT}`;
  const merchant = ((state.merchantName || '').trim() || 'Tagihan Bersama');
  ctx.fillText(receiptTruncate(ctx, merchant, W - PAD * 2), PAD, 96);

  ctx.fillStyle = '#A7BCBD';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText(`TOTAL TAGIHAN  (${state.currency})`, PAD, 138);

  ctx.fillStyle = '#6BB1AD';
  ctx.font = `800 46px ${FONT}`;
  ctx.fillText(fmtMoney(res.finalTotal), PAD, 186);

  // Kartu per orang
  let y = HEADER_H + 24;
  people.forEach((p, idx) => {
    const lines = personLines(p);
    const cardH = CARD_HEADER_H + lines * LINE_H + 10;

    ctx.fillStyle = '#FFFFFF';
    receiptRoundRect(ctx, 20, y, W - 40, cardH, 16);
    ctx.fill();

    // Avatar persegi membulat berinisial
    ctx.fillStyle = RECEIPT_AVATAR_COLORS[idx % RECEIPT_AVATAR_COLORS.length];
    receiptRoundRect(ctx, PAD, y + 14, 34, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = `800 16px ${FONT}`;
    ctx.fillText((p.name || '?').charAt(0).toUpperCase(), PAD + 17, y + 37);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#132222';
    ctx.font = `800 17px ${FONT}`;
    ctx.fillText(receiptTruncate(ctx, p.name, 300), PAD + 46, y + 37);

    ctx.textAlign = 'right';
    ctx.font = `800 18px ${FONT}`;
    ctx.fillText(fmtMoney(p.finalAmount), W - PAD, y + 37);

    let ly = y + CARD_HEADER_H + 14;
    const drawLine = (label, value, color = '#3d5252') => {
      ctx.fillStyle = color;
      ctx.font = `500 14px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(receiptTruncate(ctx, label, 340), PAD + 46, ly);
      ctx.textAlign = 'right';
      ctx.fillText(value, W - PAD, ly);
      ly += LINE_H;
    };

    if (isItemized && Array.isArray(p.items) && p.items.length > 0) {
      p.items.forEach(it => {
        const shared = it.isShared ? ` (1/${it.shareCount})` : '';
        drawLine(`${it.name} x${it.qty}${shared}`, fmtMoney(it.userPortion));
      });
    } else {
      drawLine('Porsi bagi rata', fmtMoney(p.subtotal));
    }
    if (p.serviceShare > 0) drawLine('Service Charge', fmtMoney(p.serviceShare), '#6b7f7f');
    if (p.taxShare > 0) drawLine('Pajak', fmtMoney(p.taxShare), '#6b7f7f');
    if (p.discountShare > 0) drawLine('Diskon', `-${fmtMoney(p.discountShare)}`, '#be4b5c');

    y += cardH + 14;
  });

  // Ringkasan biaya
  const sumH = 24 + summaryRows.length * LINE_H + 62;
  ctx.fillStyle = '#FFFFFF';
  receiptRoundRect(ctx, 20, y, W - 40, sumH, 16);
  ctx.fill();

  let sy = y + 36;
  summaryRows.forEach(([label, value]) => {
    ctx.fillStyle = '#3d5252';
    ctx.font = `500 14px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, PAD, sy);
    ctx.textAlign = 'right';
    ctx.fillText(value, W - PAD, sy);
    sy += LINE_H;
  });

  ctx.strokeStyle = '#B8C7C6';
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, sy - 10);
  ctx.lineTo(W - PAD, sy - 10);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#132222';
  ctx.font = `800 18px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL BAYAR', PAD, sy + 22);
  ctx.textAlign = 'right';
  ctx.fillText(fmtMoney(res.finalTotal), W - PAD, sy + 22);

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6b7f7f';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText('Dibuat dengan SplitBill', W / 2, H - 28);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

async function downloadReceipt() {
  if (!state.lastCalculationResult) return;
  try {
    const blob = await renderReceiptImageBlob();
    if (!blob) {
      showToast('Gagal membuat struk', 'error');
      return;
    }
    const safeName = ((state.merchantName || 'splitbill').trim() || 'splitbill')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'splitbill';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `struk-${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast('Struk berhasil diunduh');
  } catch (err) {
    showToast('Gagal mengunduh struk', 'error');
  }
}


function initActionButtons() {
  const btnCopyList = [
    document.getElementById('btnCopyText'),
    document.getElementById('btnCopyTextDesktop')
  ].filter(Boolean);

  const btnShareList = [
    document.getElementById('btnShareWhatsApp'),
    document.getElementById('btnShareDesktop')
  ].filter(Boolean);

  const btnReset = document.getElementById('resetSessionBtn');

  btnCopyList.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!state.lastCalculationResult) return;
      const shareText = generateShareText(state.lastCalculationResult, state);
      try {
        await navigator.clipboard.writeText(shareText);
        showToast('Rincian berhasil disalin ke clipboard');
      } catch (err) {
        fallbackCopyText(shareText);
      }
    });
  });

  // Klik "Unduh Struk" langsung mengunduh gambar struk lengkap
  btnShareList.forEach(btn => {
    btn.addEventListener('click', () => {
      downloadReceipt();
    });
  });

  btnReset?.addEventListener('click', () => {
    if (confirm('Yakin ingin mereset seluruh data tagihan?')) {
      localStorage.removeItem(STORAGE_KEY);
      state.subtotal = 0;
      state.merchantName = '';
      state.items = [];
      state.participants = [
        { id: `p_${Date.now()}_1`, name: 'Teman 1' },
        { id: `p_${Date.now()}_2`, name: 'Teman 2' }
      ];
      document.getElementById('equalSubtotalInput').value = '0';
      document.getElementById('participantCountDisplay').textContent = state.participants.length;
      syncLoadedStateToUI();
      renderEqualParticipants();
      renderItemizedParticipants();
      renderItems();
      saveToStorage();
      updateCalculation();
      showToast('Tagihan berhasil direset');
    }
  });
}

function fallbackCopyText(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('Rincian berhasil disalin');
  } catch (err) {
    alert('Gagal menyalin otomatis, silakan salin teks manual.');
  }
  document.body.removeChild(textArea);
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  const iconSvg = type === 'error'
    ? `<svg class="icon-svg icon-md" viewBox="0 0 24 24" style="stroke: var(--accent-rose);"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`
    : SVG_ICONS.CHECK;
  toast.innerHTML = `${iconSvg} <span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3200);
}

// ==========================================
// 7. Core Calculation & UI Render
// ==========================================
function updateCalculation() {
  const validation = validateInput(state);
  const unassignedBanner = document.getElementById('unassignedWarning');

  if (state.mode === SplitMode.ITEMIZED) {
    const unassignedWarning = validation.warnings.find(w => w.field === 'unassigned_items');
    if (unassignedWarning) {
      unassignedBanner.style.display = 'flex';
      document.getElementById('unassignedWarningText').textContent = unassignedWarning.message;
    } else {
      unassignedBanner.style.display = 'none';
    }
  } else {
    unassignedBanner.style.display = 'none';
  }

  // Tampilkan baris Merchant (statis/terkunci) di ringkasan jika ada
  const rowMerchant = document.getElementById('rowMerchantInfo');
  const summaryMerchant = document.getElementById('summaryMerchantName');
  if (rowMerchant && summaryMerchant) {
    const cleanMerchant = (state.merchantName || '').trim();
    if (cleanMerchant) {
      rowMerchant.style.display = 'flex';
      summaryMerchant.textContent = cleanMerchant;
    } else {
      rowMerchant.style.display = 'none';
    }
  }

  const paymentBadge = document.getElementById('paymentDisplayBadge');
  const paymentText = document.getElementById('paymentDisplayText');
  if (paymentBadge && paymentText) {
    const { bankName, accountNumber, accountHolder } = state.paymentInfo || {};
    if (bankName || accountNumber) {
      paymentBadge.style.display = 'flex';
      const holderStr = accountHolder ? ` (a/n ${accountHolder})` : '';
      paymentText.textContent = `${bankName ? bankName + ' ' : ''}${accountNumber}${holderStr}`;
    } else {
      paymentBadge.style.display = 'none';
    }
  }

  saveToStorage();

  const result = calculateBill({
    mode: state.mode,
    currency: state.currency,
    subtotal: state.subtotal,
    roundingStep: state.roundingStep,
    participants: state.participants,
    items: state.items,
    fees: state.fees
  });

  state.lastCalculationResult = result;

  document.getElementById('finalTotalDisplay').textContent = fmtMoney(result.finalTotal);
  document.getElementById('summarySubtotal').textContent = fmtMoney(result.subtotal);

  const rowDiscount = document.getElementById('rowDiscount');
  const rowService = document.getElementById('rowService');
  const rowTax = document.getElementById('rowTax');
  const rowTip = document.getElementById('rowTip');

  document.getElementById('summaryDiscount').textContent = `-${fmtMoney(result.discountAmount)}`;
  document.getElementById('summaryService').textContent = `+${fmtMoney(result.serviceAmount)}`;
  document.getElementById('summaryTax').textContent = `+${fmtMoney(result.taxAmount)}`;
  document.getElementById('summaryTip').textContent = `+${fmtMoney(result.tipAmount)}`;

  rowDiscount.style.display = result.discountAmount > 0 ? 'flex' : 'none';
  rowService.style.display = result.serviceAmount > 0 ? 'flex' : 'none';
  rowTax.style.display = result.taxAmount > 0 ? 'flex' : 'none';
  rowTip.style.display = result.tipAmount > 0 ? 'flex' : 'none';

  const summaryStatus = document.getElementById('summaryStatus');
  if (summaryStatus) {
    if (result.roundingStep && result.roundingStep > 1) {
      const diff = result.roundingDifference || 0;
      const diffText = diff === 0
        ? 'Pas'
        : (diff > 0 ? `Surplus +${fmtMoney(diff)}` : `Selisih -${fmtMoney(Math.abs(diff))}`);
      const stepLabel = fmtMoney(result.roundingStep);
      summaryStatus.innerHTML = `
        <svg class="icon-svg icon-sm" viewBox="0 0 24 24" style="stroke: var(--palette-lilac);">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>Dibulatkan ke ${stepLabel} (${diffText})</span>
      `;
    } else {
      summaryStatus.innerHTML = `
        <svg class="icon-svg icon-sm" viewBox="0 0 24 24" style="stroke: var(--accent-success);">
          <circle cx="12" cy="12" r="10"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <span>Presisi 100% pas (Tanpa selisih)</span>
      `;
    }
  }

  renderParticipantsResult(result);
}

function renderParticipantsResult(result) {
  const container = document.getElementById('participantsResultContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!result.participantResults || result.participantResults.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-tertiary); padding:20px;">Belum ada peserta tagihan.</div>`;
    return;
  }

  result.participantResults.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'participant-result-card';

    const header = document.createElement('div');
    header.className = 'participant-result-header';
    header.innerHTML = `
      <div class="participant-info">
        <div class="participant-avatar" style="width:30px; height:30px; font-size:12px;">${p.name.charAt(0).toUpperCase()}</div>
        <span class="participant-name-text">${escapeHtml(p.name)}</span>
      </div>
      <div class="participant-amount-col">
        <div class="participant-amount-badge">Total Bayar</div>
        <div class="participant-amount-text tabular-nums">${fmtMoney(p.finalAmount)}</div>
      </div>
    `;

    const detailPanel = document.createElement('div');
    detailPanel.className = 'participant-details-panel';
    detailPanel.style.display = 'none';

    let detailHtml = '';
    if (state.mode === SplitMode.ITEMIZED && p.items && p.items.length > 0) {
      detailHtml += `<div style="font-weight:700; margin-bottom:8px; color:var(--text-primary);">Pesanan &amp; Jatah Patungan:</div>`;
      p.items.forEach(it => {
        const shareHtml = it.isShared
          ? `<div class="share-badge">Patungan ${it.shareCount} org - Jatah kamu: ${fmtMoney(it.userPortion)}</div>`
          : `<span class="tabular-nums" style="font-weight:700;">${fmtMoney(it.userPortion)}</span>`;
        detailHtml += `
          <div class="detail-item-line" style="align-items: center; justify-content: space-between; gap: 8px;">
            <span>- ${escapeHtml(it.name)} (${it.qty}x)</span>
            ${shareHtml}
          </div>
        `;
      });
    }

    detailHtml += `<div style="font-weight:700; margin-top:12px; margin-bottom:6px; color:var(--text-primary);">Porsi Biaya &amp; Pajak Bersih:</div>`;
    detailHtml += `
      <div class="detail-item-line">
        <span>Subtotal Menu:</span>
        <span class="tabular-nums">${fmtMoney(p.subtotal)}</span>
      </div>
    `;
    if (p.serviceShare > 0) {
      detailHtml += `
        <div class="detail-item-line">
          <span>Service Charge:</span>
          <span class="tabular-nums">+${fmtMoney(p.serviceShare)}</span>
        </div>
      `;
    }
    if (p.taxShare > 0) {
      detailHtml += `
        <div class="detail-item-line">
          <span>Pajak:</span>
          <span class="tabular-nums">+${fmtMoney(p.taxShare)}</span>
        </div>
      `;
    }
    if (p.discountShare > 0) {
      detailHtml += `
        <div class="detail-item-line" style="color:var(--accent-rose);">
          <span>Diskon:</span>
          <span class="tabular-nums">-${fmtMoney(p.discountShare)}</span>
        </div>
      `;
    }
    if (p.exactFinalAmount && p.exactFinalAmount !== p.finalAmount) {
      detailHtml += `
        <div class="detail-item-line" style="color:var(--palette-lilac); font-style: italic; border-top: 1px dashed var(--border-subtle); margin-top: 8px; padding-top: 6px;">
          <span>Sebelum Dibulatkan:</span>
          <span class="tabular-nums">${fmtMoney(p.exactFinalAmount)}</span>
        </div>
      `;
    }

    detailPanel.innerHTML = detailHtml;

    header.addEventListener('click', () => {
      const isVisible = detailPanel.style.display === 'block';
      detailPanel.style.display = isVisible ? 'none' : 'block';
    });

    card.appendChild(header);
    card.appendChild(detailPanel);
    container.appendChild(card);
  });
}

// ==========================================
// 8. Receipt Scanner Modal (Deteksi Biru + Otomatis & Manual di Dalam Kamera)
// ==========================================
let activeCameraStream = null;
let cameraDetectRafId = null;
let stableBlueDetectFrames = 0;
let currentFacingMode = 'environment';

function showScannerValidation(message) {
  const alertBox = document.getElementById('scannerValidationAlert');
  const alertText = document.getElementById('scannerValidationText');
  if (alertBox && alertText) {
    alertText.textContent = message;
    alertBox.style.display = 'flex';
  }
}

function clearScannerValidation() {
  const alertBox = document.getElementById('scannerValidationAlert');
  if (alertBox) {
    alertBox.style.display = 'none';
  }
}

function stopLiveCamera() {
  if (cameraDetectRafId) {
    cancelAnimationFrame(cameraDetectRafId);
    cameraDetectRafId = null;
  }
  stableBlueDetectFrames = 0;

  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach(track => track.stop());
    activeCameraStream = null;
  }
  const videoEl = document.getElementById('cameraVideoEl');
  if (videoEl) {
    videoEl.srcObject = null;
  }
  const detectCanvas = document.getElementById('cameraDetectionCanvas');
  if (detectCanvas) {
    const ctx = detectCanvas.getContext('2d');
    ctx?.clearRect(0, 0, detectCanvas.width, detectCanvas.height);
  }
  const cameraContainer = document.getElementById('cameraLiveContainer');
  const dropZone = document.getElementById('scannerDropZone');
  if (cameraContainer) cameraContainer.style.display = 'none';
  if (dropZone) dropZone.style.display = 'block';
}

function updateRawTextButtonState() {
  const rawTextarea = document.getElementById('rawReceiptTextarea');
  const btnParseRaw = document.getElementById('btnParseRawText');
  if (!btnParseRaw) return;

  const text = rawTextarea?.value?.trim() || '';
  if (!text) {
    btnParseRaw.disabled = true;
    return;
  }

  const parsed = parseReceiptText(text);
  const contentCheck = validateReceiptContent(text, parsed, false);
  btnParseRaw.disabled = !contentCheck.valid;
}

function openScannerModal() {
  const modal = document.getElementById('receiptScannerModal');
  if (!modal) return;
  clearScannerValidation();
  stopLiveCamera();
  updateRawTextButtonState();

  const dropZone = document.getElementById('scannerDropZone');
  const dropzoneDefault = document.getElementById('dropzoneDefaultContent');
  const dropzonePreview = document.getElementById('dropzonePreviewContent');
  const cropStage = document.getElementById('scannerCropPreviewStage');

  if (cropStage) cropStage.style.display = 'none';
  if (dropZone) dropZone.style.display = 'block';
  if (dropzoneDefault) dropzoneDefault.style.display = 'flex';
  if (dropzonePreview) dropzonePreview.style.display = 'none';

  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeScannerModal() {
  stopLiveCamera();
  const cropStage = document.getElementById('scannerCropPreviewStage');
  if (cropStage) cropStage.style.display = 'none';
  const modal = document.getElementById('receiptScannerModal');
  if (!modal) return;
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function applyParsedReceiptAndGoToSplitBill(parsed) {
  if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) return;

  state.mode = SplitMode.ITEMIZED;

  if (parsed.merchantName && typeof parsed.merchantName === 'string') {
    state.merchantName = parsed.merchantName.trim();
  }

  if (parsed.currency) {
    const currInfo = getCurrencyInfo(parsed.currency);
    state.currency = currInfo.code;
    if (currInfo.decimals > 0) {
      state.roundingStep = 1;
    }
  }

  const defaultParticipantIds = state.participants.length > 0 ? [state.participants[0].id] : [];
  const now = Date.now();
  state.items = parsed.items.map((it, idx) => ({
    id: `i_${now}_${idx}`,
    name: (it.name || `Menu #${idx + 1}`).trim(),
    price: Math.max(0, Number(it.price) || 0),
    qty: Math.max(1, parseInt(it.qty, 10) || 1),
    participantIds: [...defaultParticipantIds]
  }));

  state.fees = {
    discount: { type: FeeType.PERCENT, value: 0 },
    service: { type: FeeType.PERCENT, value: 0 },
    tax: { type: FeeType.PERCENT, value: 0 },
    tip: { type: FeeType.PERCENT, value: 0 }
  };

  if (parsed.fees) {
    ['discount', 'service', 'tax'].forEach(feeKey => {
      if (parsed.fees[feeKey]) {
        state.fees[feeKey] = { ...parsed.fees[feeKey] };
      }
    });
  }

  syncLoadedStateToUI();
  renderItems();
  updateCalculation();
  closeScannerModal();
  navigateToView('calculator');

  const merchantInfo = state.merchantName ? ` dari ${state.merchantName}` : '';
  showToast(`${state.items.length} menu${merchantInfo} (${state.currency}) berhasil dimasukkan`);
}

let pendingScanSession = {
  file: null,
  source: 'gallery',
  precomputed: null,
  activeFilter: 'original'
};

function initReceiptScanner() {
  const modal = document.getElementById('receiptScannerModal');
  if (!modal) return;

  const btnClose = document.getElementById('btnCloseScannerModal');

  // Pilihan Otomatis vs Manual di Dalam Kamera
  const btnModeAuto = document.getElementById('btnScanModeAuto');
  const btnModeManual = document.getElementById('btnScanModeManual');
  const cameraAutoHintBadge = document.getElementById('cameraAutoHintBadge');
  const btnCaptureCamera = document.getElementById('btnCaptureCamera');

  const updateCameraModeUI = (mode) => {
    state.scanCaptureMode = mode;
    stableBlueDetectFrames = 0;
    if (mode === 'AUTO') {
      btnModeAuto?.classList.add('active');
      btnModeManual?.classList.remove('active');
      if (cameraAutoHintBadge) {
        cameraAutoHintBadge.textContent = 'Arahkan kamera ke struk';
      }
    } else {
      btnModeManual?.classList.add('active');
      btnModeAuto?.classList.remove('active');
      if (cameraAutoHintBadge) {
        cameraAutoHintBadge.textContent = 'Manual: Tekan tombol shutter untuk memotret';
      }
    }
  };

  btnModeAuto?.addEventListener('click', () => updateCameraModeUI('AUTO'));
  btnModeManual?.addEventListener('click', () => updateCameraModeUI('MANUAL'));

  const tabPhoto = document.getElementById('tabScanPhoto');
  const tabText = document.getElementById('tabScanText');
  const panelPhoto = document.getElementById('panelScanPhoto');
  const panelText = document.getElementById('panelScanText');

  const dropZone = document.getElementById('scannerDropZone');
  const fileInput = document.getElementById('receiptFileInput');
  const btnPickGallery = document.getElementById('btnPickGallery');
  const btnPickCamera = document.getElementById('btnPickCamera');
  const btnChangePhoto = document.getElementById('btnChangeReceiptPhoto');

  const cameraContainer = document.getElementById('cameraLiveContainer');
  const videoEl = document.getElementById('cameraVideoEl');
  const detectCanvas = document.getElementById('cameraDetectionCanvas');
  const btnSwitchCamera = document.getElementById('btnSwitchCamera');
  const btnSwitchCameraTop = document.getElementById('btnSwitchCameraTop');
  const btnCloseCamera = document.getElementById('btnCloseCamera');
  const btnCameraPickGallery = document.getElementById('btnCameraPickGallery');

  // STAGE 2: Pratinjau Struk Lebih Dekat
  const cropStage = document.getElementById('scannerCropPreviewStage');
  const cropPreviewImg = document.getElementById('croppedReceiptPreviewImg');
  const btnFilterOrig = document.getElementById('btnPreviewFilterOriginal');
  const btnFilterEnh = document.getElementById('btnPreviewFilterEnhanced');
  const btnRetakeScan = document.getElementById('btnRetakeScan');
  const btnConfirmScanNext = document.getElementById('btnConfirmScanNext');

  // STAGE 3: OCR Progress
  const dropzoneDefault = document.getElementById('dropzoneDefaultContent');
  const dropzonePreview = document.getElementById('dropzonePreviewContent');
  const previewImg = document.getElementById('receiptPreviewImg');
  const laserLine = document.getElementById('scannerLaserLine');
  const statusText = document.getElementById('scannerStatusText');
  const progressFill = document.getElementById('scannerProgressFill');

  const rawTextarea = document.getElementById('rawReceiptTextarea');
  const btnParseRaw = document.getElementById('btnParseRawText');

  btnClose?.addEventListener('click', closeScannerModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeScannerModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeScannerModal();
    }
  });

  tabPhoto?.addEventListener('click', () => {
    clearScannerValidation();
    tabPhoto.classList.add('active');
    tabText?.classList.remove('active');
    if (panelPhoto) panelPhoto.style.display = 'block';
    if (panelText) panelText.style.display = 'none';
  });

  tabText?.addEventListener('click', () => {
    clearScannerValidation();
    stopLiveCamera();
    if (cropStage) cropStage.style.display = 'none';
    tabText.classList.add('active');
    tabPhoto?.classList.remove('active');
    if (panelText) panelText.style.display = 'block';
    if (panelPhoto) panelPhoto.style.display = 'none';
    updateRawTextButtonState();
  });

  rawTextarea?.addEventListener('input', () => {
    clearScannerValidation();
    updateRawTextButtonState();
  });

  btnPickGallery?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearScannerValidation();
    fileInput?.click();
  });

  btnCameraPickGallery?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearScannerValidation();
    stopLiveCamera();
    fileInput?.click();
  });

  function captureFrameFromVideo() {
    if (!videoEl || !activeCameraStream) return;
    const width = videoEl.videoWidth || 1280;
    const height = videoEl.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, width, height);

    stopLiveCamera();

    canvas.toBlob((blob) => {
      if (!blob) {
        showScannerValidation('Gagal menangkap foto dari kamera.');
        return;
      }
      const capturedFile = new File([blob], `struk-kamera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      openCropPreviewStage(capturedFile, 'camera');
    }, 'image/jpeg', 0.94);
  }

  // Loop deteksi kotak biru real-time di dalam kamera
  function startBlueDetectionLoop() {
    const sampleCanvas = document.createElement('canvas');
    const sampleCtx = sampleCanvas.getContext('2d');

    const loop = () => {
      if (!activeCameraStream || !videoEl || !detectCanvas) return;

      if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
        const vw = videoEl.videoWidth;
        const vh = videoEl.videoHeight;
        if (detectCanvas.width !== vw || detectCanvas.height !== vh) {
          detectCanvas.width = vw;
          detectCanvas.height = vh;
          sampleCanvas.width = vw;
          sampleCanvas.height = vh;
        }

        sampleCtx.drawImage(videoEl, 0, 0, vw, vh);
        const frameData = sampleCtx.getImageData(0, 0, vw, vh).data;
        const bounds = detectPaperBounds(frameData, vw, vh);
        const overlayCtx = detectCanvas.getContext('2d');
        drawBlueScannerOverlay(overlayCtx, bounds, vw, vh);

        if (state.scanCaptureMode === 'AUTO') {
          if (bounds.detected) {
            stableBlueDetectFrames++;
            if (cameraAutoHintBadge) {
              const pct = Math.min(100, Math.round((stableBlueDetectFrames / 22) * 100));
              cameraAutoHintBadge.textContent = `Memindai... tahan posisi (${pct}%)`;
            }
            if (stableBlueDetectFrames >= 22) {
              captureFrameFromVideo();
              return;
            }
          } else {
            stableBlueDetectFrames = Math.max(0, stableBlueDetectFrames - 1);
            if (cameraAutoHintBadge) {
              cameraAutoHintBadge.textContent = 'Arahkan kamera ke struk';
            }
          }
        }
      }

      cameraDetectRafId = requestAnimationFrame(loop);
    };

    cameraDetectRafId = requestAnimationFrame(loop);
  }

  async function startLiveCamera(facingMode = 'environment') {
    clearScannerValidation();
    if (cropStage) cropStage.style.display = 'none';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showScannerValidation('Browser ini tidak mendukung akses kamera langsung. Silakan gunakan tombol Pilih Foto.');
      return;
    }

    try {
      if (activeCameraStream) {
        activeCameraStream.getTracks().forEach(t => t.stop());
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (fallbackErr) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      activeCameraStream = stream;
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play().catch(() => {});
      }
      if (dropZone) dropZone.style.display = 'none';
      if (cameraContainer) cameraContainer.style.display = 'flex';

      updateCameraModeUI(state.scanCaptureMode);
      startBlueDetectionLoop();
    } catch (err) {
      showScannerValidation('Akses kamera ditolak atau perangkat tidak memiliki kamera. Izinkan akses kamera di browser Anda.');
    }
  }

  btnPickCamera?.addEventListener('click', (e) => {
    e.stopPropagation();
    startLiveCamera(currentFacingMode);
  });

  const toggleFacingMode = () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    startLiveCamera(currentFacingMode);
  };

  btnSwitchCamera?.addEventListener('click', toggleFacingMode);
  btnSwitchCameraTop?.addEventListener('click', toggleFacingMode);

  btnCloseCamera?.addEventListener('click', () => {
    stopLiveCamera();
  });

  btnCaptureCamera?.addEventListener('click', () => {
    captureFrameFromVideo();
  });

  // STAGE 2: Pratinjau Struk Lebih Dekat
  async function openCropPreviewStage(file, source = 'gallery') {
    clearScannerValidation();
    const fileCheck = validateReceiptFile(file);
    if (!fileCheck.valid) {
      showScannerValidation(fileCheck.message);
      return;
    }

    stopLiveCamera();

    if (dropZone) dropZone.style.display = 'none';
    if (cameraContainer) cameraContainer.style.display = 'none';
    if (cropStage) cropStage.style.display = 'flex';

    const fallbackUrl = URL.createObjectURL(file);
    if (cropPreviewImg) {
      cropPreviewImg.src = fallbackUrl;
    }

    btnFilterOrig?.classList.add('active');
    btnFilterEnh?.classList.remove('active');

    try {
      const precomputed = await preprocessReceiptImage(file);
      pendingScanSession = {
        file,
        source,
        precomputed,
        activeFilter: 'original'
      };

      if (precomputed.croppedPreviewDataUrl && cropPreviewImg) {
        cropPreviewImg.src = precomputed.croppedPreviewDataUrl;
      }
    } catch (err) {
      console.warn('Pratinjau struk memakai gambar asli:', err);
      pendingScanSession = {
        file,
        source,
        precomputed: null,
        activeFilter: 'original'
      };
    }
  }

  btnFilterOrig?.addEventListener('click', () => {
    if (!pendingScanSession.file) return;
    btnFilterOrig.classList.add('active');
    btnFilterEnh?.classList.remove('active');
    pendingScanSession.activeFilter = 'original';
    if (cropPreviewImg) {
      cropPreviewImg.src = pendingScanSession.precomputed?.croppedPreviewDataUrl || URL.createObjectURL(pendingScanSession.file);
    }
  });

  btnFilterEnh?.addEventListener('click', () => {
    if (!pendingScanSession.file) return;
    btnFilterEnh.classList.add('active');
    btnFilterOrig?.classList.remove('active');
    pendingScanSession.activeFilter = 'enhanced';
    if (cropPreviewImg) {
      cropPreviewImg.src = pendingScanSession.precomputed?.enhancedPreviewDataUrl || pendingScanSession.precomputed?.croppedPreviewDataUrl || URL.createObjectURL(pendingScanSession.file);
    }
  });

  btnRetakeScan?.addEventListener('click', () => {
    clearScannerValidation();
    const lastSource = pendingScanSession.source;
    pendingScanSession = { file: null, source: 'gallery', precomputed: null, activeFilter: 'original' };
    if (cropStage) cropStage.style.display = 'none';

    if (lastSource === 'camera') {
      startLiveCamera(currentFacingMode);
    } else {
      if (dropZone) dropZone.style.display = 'block';
      if (dropzoneDefault) dropzoneDefault.style.display = 'flex';
      if (dropzonePreview) dropzonePreview.style.display = 'none';
    }
  });

  btnConfirmScanNext?.addEventListener('click', () => {
    if (!pendingScanSession.file) return;
    runReceiptOcrProcess();
  });

  // STAGE 3: OCR Progress & Auto-input
  async function runReceiptOcrProcess() {
    clearScannerValidation();
    if (!pendingScanSession.file) return;

    if (cropStage) cropStage.style.display = 'none';
    if (dropZone) dropZone.style.display = 'block';
    if (dropzoneDefault) dropzoneDefault.style.display = 'none';
    if (dropzonePreview) dropzonePreview.style.display = 'flex';
    if (laserLine) laserLine.style.display = 'block';

    const currentDisplayImg = pendingScanSession.precomputed?.croppedPreviewDataUrl ||
      URL.createObjectURL(pendingScanSession.file);
    if (previewImg) {
      previewImg.src = currentDisplayImg;
    }

    if (statusText) statusText.textContent = 'Memindai daftar menu & harga...';
    if (progressFill) progressFill.style.width = '15%';

    try {
      const { parsed, detectedPreviewDataUrl } = await scanReceiptImage(
        pendingScanSession.file,
        ({ status, progress, detectedPreviewDataUrl: liveBlueUrl }) => {
          if (statusText && status) statusText.textContent = status;
          if (progressFill && typeof progress === 'number') {
            progressFill.style.width = `${Math.min(100, Math.round(progress * 100))}%`;
          }
          if (liveBlueUrl && previewImg && previewImg.src !== liveBlueUrl) {
            previewImg.src = liveBlueUrl;
          }
        },
        pendingScanSession.precomputed
      );

      if (detectedPreviewDataUrl && previewImg) {
        previewImg.src = detectedPreviewDataUrl;
      }

      if (laserLine) laserLine.style.display = 'none';
      if (progressFill) progressFill.style.width = '100%';
      if (statusText) {
        statusText.textContent = `Struk terdeteksi (${parsed.items.length} menu)! Mengalihkan otomatis...`;
      }

      setTimeout(() => {
        applyParsedReceiptAndGoToSplitBill(parsed);
      }, 350);
    } catch (err) {
      if (laserLine) laserLine.style.display = 'none';
      if (progressFill) progressFill.style.width = '0%';
      if (cropStage) cropStage.style.display = 'flex';
      if (dropzonePreview) dropzonePreview.style.display = 'none';
      showScannerValidation(err.message || 'Gagal memindai struk. Pastikan foto menampilkan struk pesanan yang jelas.');
    }
  }

  btnChangePhoto?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearScannerValidation();
    if (cropStage) cropStage.style.display = 'none';
    if (dropzoneDefault) dropzoneDefault.style.display = 'flex';
    if (dropzonePreview) dropzonePreview.style.display = 'none';
    fileInput?.click();
  });

  dropZone?.addEventListener('click', (e) => {
    if (
      e.target === dropZone ||
      e.target.closest('#dropzoneDefaultContent')
    ) {
      if (!e.target.closest('button')) {
        clearScannerValidation();
        fileInput?.click();
      }
    }
  });

  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone?.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      openCropPreviewStage(file, 'gallery');
    }
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) openCropPreviewStage(file, 'gallery');
    fileInput.value = '';
  });

  btnParseRaw?.addEventListener('click', () => {
    clearScannerValidation();
    const text = rawTextarea?.value?.trim() || '';
    const parsed = parseReceiptText(text);
    const contentCheck = validateReceiptContent(text, parsed, false);

    if (!contentCheck.valid) {
      updateRawTextButtonState();
      return;
    }

    applyParsedReceiptAndGoToSplitBill(parsed);
  });

  updateRawTextButtonState();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
