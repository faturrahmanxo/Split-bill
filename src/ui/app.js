/**
 * SplitBill Main Application Controller
 * Mengintegrasikan Engine, Validator, dan Formatter dengan DOM reaktif.
 * Desain Amethyst & SVG Icon murni tanpa emoji.
 */

import { calculateBill, SplitMode, FeeType } from '../calculation/engine.js';
import { validateInput } from '../validation/validator.js';
import { formatIDR, parseIDR, generateShareText } from '../formatting/formatter.js';

// State Aplikasi
const state = {
  mode: SplitMode.EQUAL,
  subtotal: 200000,
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
  theme: localStorage.getItem('splitbill_theme') || 'dark',
  lastCalculationResult: null
};

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

// Inisialisasi DOM
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initModeSwitcher();
  initEqualModeControls();
  initItemizedModeControls();
  initFeeControls();
  initActionButtons();
  initCollapsible();
  
  // Render awal
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
    }, 650);
  };

  if (document.readyState === 'complete') {
    dismiss();
  } else {
    window.addEventListener('load', dismiss, { once: true });
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
  const sectionEqual = document.getElementById('sectionEqualMode');
  const sectionItemized = document.getElementById('sectionItemizedMode');

  tabEqual.addEventListener('click', () => {
    state.mode = SplitMode.EQUAL;
    tabEqual.classList.add('active');
    tabItemized.classList.remove('active');
    sectionEqual.style.display = 'block';
    sectionItemized.style.display = 'none';
    updateCalculation();
  });

  tabItemized.addEventListener('click', () => {
    state.mode = SplitMode.ITEMIZED;
    tabItemized.classList.add('active');
    tabEqual.classList.remove('active');
    sectionEqual.style.display = 'none';
    sectionItemized.style.display = 'block';
    updateCalculation();
  });
}

// ==========================================
// 3. Equal Mode Controls
// ==========================================
function initEqualModeControls() {
  const subtotalInput = document.getElementById('equalSubtotalInput');
  const btnDec = document.getElementById('btnDecParticipants');
  const btnInc = document.getElementById('btnIncParticipants');
  const countDisplay = document.getElementById('participantCountDisplay');

  subtotalInput.addEventListener('input', (e) => {
    const rawVal = parseIDR(e.target.value);
    state.subtotal = rawVal;
    subtotalInput.value = formatIDR(rawVal).replace('Rp ', '');
    updateCalculation();
  });

  btnDec.addEventListener('click', () => {
    if (state.participants.length > 1) {
      state.participants.pop();
      countDisplay.textContent = state.participants.length;
      renderEqualParticipants();
      renderItemizedParticipants();
      renderItems();
      updateCalculation();
    }
  });

  btnInc.addEventListener('click', () => {
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

  btnAddPart.addEventListener('click', () => {
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

  newPartInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnAddPart.click();
  });

  btnAddItem.addEventListener('click', () => {
    state.items.push({
      id: `i_${Date.now()}`,
      name: `Menu #${state.items.length + 1}`,
      price: 25000,
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

  state.items.forEach((item, itemIdx) => {
    const card = document.createElement('div');
    card.className = 'item-card';

    const itemTotal = (item.price || 0) * (item.qty || 1);

    card.innerHTML = `
      <!-- Baris 1: Nama Menu & Tombol Hapus -->
      <div class="item-card-header-row">
        <div class="item-name-col">
          <label class="item-mini-label">Nama Menu</label>
          <input class="input-text item-name-input" type="text" placeholder="Contoh: Nasi Goreng" value="${escapeHtml(item.name)}">
        </div>
        <button class="item-delete-btn" title="Hapus Menu" type="button" aria-label="Hapus Menu">
          ${SVG_ICONS.TRASH}
        </button>
      </div>

      <!-- Baris 2: Harga Satuan & Jumlah Porsi -->
      <div class="item-card-controls-row">
        <div class="item-control-col item-price-col">
          <label class="item-mini-label">Harga Satuan</label>
          <div class="input-currency-wrapper item-price-input-wrap">
            <span class="input-currency-prefix" style="left: 12px; font-size: 13px;">Rp</span>
            <input class="input-text tabular-nums item-price-field" type="text" inputmode="numeric" placeholder="0" value="${formatIDR(item.price).replace('Rp ', '')}">
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

      <!-- Baris 3: Siapa yang pesan menu ini? -->
      <div class="item-allocation-section">
        <div class="item-allocation-label">
          <span>Siapa yang pesan menu ini?</span>
          <span class="item-subtotal-badge tabular-nums">Total: ${formatIDR(itemTotal)}</span>
        </div>
        <div class="participant-selectors"></div>
      </div>
    `;

    // Event listeners
    const nameInput = card.querySelector('.item-name-input');
    const priceInput = card.querySelector('.item-price-field');
    const qtyInput = card.querySelector('.qty-number-input');
    const btnDec = card.querySelector('.qty-btn-dec');
    const btnInc = card.querySelector('.qty-btn-inc');
    const delBtn = card.querySelector('.item-delete-btn');
    const subtotalBadge = card.querySelector('.item-subtotal-badge');

    const updateItemTotal = () => {
      const tot = (item.price || 0) * (item.qty || 1);
      if (subtotalBadge) subtotalBadge.textContent = `Total: ${formatIDR(tot)}`;
    };

    nameInput.addEventListener('input', (e) => {
      item.name = e.target.value;
      updateCalculation();
    });

    priceInput.addEventListener('input', (e) => {
      item.price = parseIDR(e.target.value);
      priceInput.value = formatIDR(item.price).replace('Rp ', '');
      updateItemTotal();
      updateCalculation();
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

    // Participant Selectors (Who ordered/shared this?)
    const selectorWrap = card.querySelector('.participant-selectors');

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
        : parseIDR(e.target.value);
      state.fees[key].value = val;
      updateCalculation();
    });
  });

  // Toggle Units (% vs Rp)
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
        input.value = formatIDR(state.fees[feeKey].value).replace('Rp ', '');
      } else {
        input.value = state.fees[feeKey].value;
      }
      updateCalculation();
    });
  });

  // Preset Chips
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
// 6. Action Buttons & Sharing
// ==========================================
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

  btnShareList.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!state.lastCalculationResult) return;
      const shareText = generateShareText(state.lastCalculationResult, state);

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Rincian Split Bill',
            text: shareText
          });
          showToast('Berhasil dibagikan');
          return;
        } catch (err) {
          // Fallback ke WhatsApp jika user cancel atau gagal
        }
      }

      const encoded = encodeURIComponent(shareText);
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    });
  });

  btnReset.addEventListener('click', () => {
    if (confirm('Yakin ingin mereset seluruh data tagihan?')) {
      state.subtotal = 0;
      state.items = [];
      document.getElementById('equalSubtotalInput').value = '0';
      renderItems();
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

function showToast(msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `${SVG_ICONS.CHECK} <span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2600);
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

  // Jalankan perhitungan di engine
  const result = calculateBill({
    mode: state.mode,
    subtotal: state.subtotal,
    participants: state.participants,
    items: state.items,
    fees: state.fees
  });

  state.lastCalculationResult = result;

  // Update Hero Total Display
  document.getElementById('finalTotalDisplay').textContent = formatIDR(result.finalTotal);
  document.getElementById('summarySubtotal').textContent = formatIDR(result.subtotal);

  // Update Breakdown Component Rows
  const rowDiscount = document.getElementById('rowDiscount');
  const rowService = document.getElementById('rowService');
  const rowTax = document.getElementById('rowTax');
  const rowTip = document.getElementById('rowTip');

  document.getElementById('summaryDiscount').textContent = `-${formatIDR(result.discountAmount)}`;
  document.getElementById('summaryService').textContent = `+${formatIDR(result.serviceAmount)}`;
  document.getElementById('summaryTax').textContent = `+${formatIDR(result.taxAmount)}`;
  document.getElementById('summaryTip').textContent = `+${formatIDR(result.tipAmount)}`;

  rowDiscount.style.display = result.discountAmount > 0 ? 'flex' : 'none';
  rowService.style.display = result.serviceAmount > 0 ? 'flex' : 'none';
  rowTax.style.display = result.taxAmount > 0 ? 'flex' : 'none';
  rowTip.style.display = result.tipAmount > 0 ? 'flex' : 'none';

  // Render Participants Result Accordion
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
        <div class="participant-avatar" style="width:28px; height:28px; font-size:12px;">${p.name.charAt(0).toUpperCase()}</div>
        <span class="participant-name-text">${escapeHtml(p.name)}</span>
      </div>
      <div class="participant-amount-text tabular-nums">${formatIDR(p.finalAmount)}</div>
    `;

    // Panel detail jika diklik
    const detailPanel = document.createElement('div');
    detailPanel.className = 'participant-details-panel';
    detailPanel.style.display = 'none';

    let detailHtml = '';
    if (state.mode === SplitMode.ITEMIZED && p.items && p.items.length > 0) {
      detailHtml += `<div style="font-weight:700; margin-bottom:6px; color:var(--text-primary);">Pesanan:</div>`;
      p.items.forEach(it => {
        const shareNote = it.isShared ? ` <span style="color:var(--text-tertiary);">(patungan ${it.shareCount} org)</span>` : '';
        detailHtml += `
          <div class="detail-item-line">
            <span>• ${escapeHtml(it.name)} (${it.qty}x)${shareNote}</span>
            <span class="tabular-nums">${formatIDR(it.userPortion)}</span>
          </div>
        `;
      });
    }

    // Detail Pajak & Service porsi orang ini
    detailHtml += `<div style="font-weight:700; margin-top:10px; margin-bottom:6px; color:var(--text-primary);">Porsi Beban Biaya:</div>`;
    detailHtml += `
      <div class="detail-item-line">
        <span>Subtotal Menu:</span>
        <span class="tabular-nums">${formatIDR(p.subtotal)}</span>
      </div>
    `;
    if (p.serviceShare > 0) {
      detailHtml += `
        <div class="detail-item-line">
          <span>Service Charge:</span>
          <span class="tabular-nums">+${formatIDR(p.serviceShare)}</span>
        </div>
      `;
    }
    if (p.taxShare > 0) {
      detailHtml += `
        <div class="detail-item-line">
          <span>Pajak Restoran PB1:</span>
          <span class="tabular-nums">+${formatIDR(p.taxShare)}</span>
        </div>
      `;
    }
    if (p.discountShare > 0) {
      detailHtml += `
        <div class="detail-item-line" style="color:var(--accent-rose);">
          <span>Diskon:</span>
          <span class="tabular-nums">-${formatIDR(p.discountShare)}</span>
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

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
