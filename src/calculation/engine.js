/**
 * SplitBill Core Calculation Engine
 * Memenuhi spesifikasi BR-001 s/d BR-008 dan PRD v1.0.
 * Menghindari kesalahan floating-point dengan integer arithmetic & deterministic remainder distribution.
 */

export const SplitMode = {
  EQUAL: 'EQUAL',
  ITEMIZED: 'ITEMIZED'
};

export const FeeType = {
  PERCENT: 'PERCENT',
  NOMINAL: 'NOMINAL'
};

/**
 * Menghitung pembagian tagihan berdasarkan input dan aturan bisnis.
 * @param {Object} input
 * @returns {Object} calculationResult
 */
export function calculateBill(input) {
  const mode = input.mode || SplitMode.EQUAL;
  const roundingStep = Number(input.roundingStep) || 1;
  const participants = (input.participants || []).map((p, idx) => ({
    id: p.id || `p_${idx + 1}`,
    name: (p.name || `Peserta ${idx + 1}`).trim() || `Peserta ${idx + 1}`
  }));

  const fees = {
    discount: sanitizeFee(input.fees?.discount),
    service: sanitizeFee(input.fees?.service),
    tax: sanitizeFee(input.fees?.tax),
    tip: sanitizeFee(input.fees?.tip)
  };

  if (mode === SplitMode.EQUAL) {
    return calculateEqualSplit(input.subtotal || 0, participants, fees, roundingStep);
  } else {
    return calculateItemizedSplit(input.items || [], participants, fees, roundingStep);
  }
}

function applyRoundingStep(amount, step) {
  if (!step || step <= 1) return Math.round(amount);
  return Math.round(amount / step) * step;
}

function sanitizeFee(fee) {
  if (!fee) return { type: FeeType.PERCENT, value: 0 };
  const type = fee.type === FeeType.NOMINAL ? FeeType.NOMINAL : FeeType.PERCENT;
  const value = Math.max(0, Number(fee.value) || 0);
  return { type, value };
}

/**
 * Hitung nominal komponen biaya berdasarkan urutan standar struk Indonesia:
 * 1. Subtotal (S)
 * 2. Diskon (D) dari Subtotal
 * 3. Subtotal Bersih (S_net = S - D)
 * 4. Service Charge (C) dari Subtotal Bersih
 * 5. Pajak Restoran / PB1 (T) dari (Subtotal Bersih + Service Charge)
 * 6. Tip (G) dari Subtotal atau nominal langsung
 * 7. Total Akhir F = S_net + C + T + G
 */
export function computeGlobalFees(subtotal, fees) {
  const S = Math.max(0, Math.round(subtotal));

  // 1. Diskon
  let D = 0;
  if (fees.discount.type === FeeType.PERCENT) {
    D = Math.round((S * fees.discount.value) / 100);
  } else {
    D = Math.round(fees.discount.value);
  }
  D = Math.min(D, S); // Diskon tidak boleh melebihi subtotal

  const S_net = S - D;

  // 2. Service Charge
  let C = 0;
  if (fees.service.type === FeeType.PERCENT) {
    C = Math.round((S_net * fees.service.value) / 100);
  } else {
    C = Math.round(fees.service.value);
  }

  // 3. Pajak PB1 / Restoran (basis: S_net + C)
  let T = 0;
  const taxBase = S_net + C;
  if (fees.tax.type === FeeType.PERCENT) {
    T = Math.round((taxBase * fees.tax.value) / 100);
  } else {
    T = Math.round(fees.tax.value);
  }

  // 4. Tip
  let G = 0;
  if (fees.tip.type === FeeType.PERCENT) {
    G = Math.round((S * fees.tip.value) / 100);
  } else {
    G = Math.round(fees.tip.value);
  }

  const finalTotal = S_net + C + T + G;

  return {
    subtotal: S,
    discountAmount: D,
    netSubtotal: S_net,
    serviceAmount: C,
    taxAmount: T,
    tipAmount: G,
    finalTotal
  };
}

/**
 * Mode 1: Bagi Rata (Equal Split)
 */
function calculateEqualSplit(rawSubtotal, participants, fees, roundingStep = 1) {
  const global = computeGlobalFees(rawSubtotal, fees);
  const n = participants.length;

  if (n === 0) {
    return {
      mode: SplitMode.EQUAL,
      valid: false,
      error: 'Jumlah peserta minimal 1 orang.',
      roundingStep,
      roundingDifference: 0,
      sumCalculated: 0,
      ...global,
      participantResults: []
    };
  }

  const F = global.finalTotal;
  const baseShare = Math.floor(F / n);
  const remainder = F - (baseShare * n);

  // Bagi komponen biaya rata untuk transparansi
  const baseSubtotal = Math.floor(global.subtotal / n);
  const baseDiscount = Math.floor(global.discountAmount / n);
  const baseService = Math.floor(global.serviceAmount / n);
  const baseTax = Math.floor(global.taxAmount / n);
  const baseTip = Math.floor(global.tipAmount / n);

  const participantResults = participants.map((p, index) => {
    // Sisa pembulatan dialokasikan secara deterministik (+1 ke peserta awal)
    const extra = index < remainder ? 1 : 0;
    const exactAmount = baseShare + extra;
    const finalAmount = applyRoundingStep(exactAmount, roundingStep);

    return {
      id: p.id,
      name: p.name,
      subtotal: baseSubtotal,
      discountShare: baseDiscount,
      serviceShare: baseService,
      taxShare: baseTax,
      tipShare: baseTip,
      roundingAdjustment: extra,
      exactFinalAmount: exactAmount,
      finalAmount,
      items: []
    };
  });

  const sumCalculated = participantResults.reduce((acc, curr) => acc + curr.finalAmount, 0);
  const roundingDifference = sumCalculated - F;

  return {
    mode: SplitMode.EQUAL,
    valid: true,
    roundingStep,
    roundingDifference,
    sumCalculated,
    ...global,
    remainderDistributed: remainder,
    participantResults
  };
}

/**
 * Mode 2: Berdasarkan Pesanan (Itemized Split)
 */
function calculateItemizedSplit(items, participants, fees, roundingStep = 1) {
  if (participants.length === 0) {
    return {
      mode: SplitMode.ITEMIZED,
      valid: false,
      error: 'Tambahkan minimal 1 peserta untuk membagi pesanan.',
      subtotal: 0,
      finalTotal: 0,
      roundingStep,
      roundingDifference: 0,
      sumCalculated: 0,
      participantResults: []
    };
  }

  const participantMap = new Map();
  participants.forEach(p => {
    participantMap.set(p.id, {
      id: p.id,
      name: p.name,
      subtotal: 0,
      items: []
    });
  });

  let totalCalculatedSubtotal = 0;
  let unassignedItemsCount = 0;

  // Alokasi item ke peserta
  items.forEach((item, itemIdx) => {
    const price = Math.max(0, Math.round(Number(item.price) || 0));
    const qty = Math.max(1, Math.round(Number(item.qty) || 1));
    const itemTotal = price * qty;
    const assignedIds = (item.participantIds || []).filter(id => participantMap.has(id));

    if (assignedIds.length === 0) {
      unassignedItemsCount++;
    } else {
      totalCalculatedSubtotal += itemTotal;
      const k = assignedIds.length;
      const basePerPerson = Math.floor(itemTotal / k);
      const rem = itemTotal - (basePerPerson * k);

      assignedIds.forEach((pid, idx) => {
        const extra = idx < rem ? 1 : 0;
        const portion = basePerPerson + extra;
        const pRecord = participantMap.get(pid);
        pRecord.subtotal += portion;
        pRecord.items.push({
          name: item.name || `Item #${itemIdx + 1}`,
          price,
          qty,
          isShared: k > 1,
          shareCount: k,
          userPortion: portion
        });
      });
    }
  });

  const global = computeGlobalFees(totalCalculatedSubtotal, fees);
  const F = global.finalTotal;

  // Alokasi biaya proporsional ke tiap peserta
  const participantResults = [];
  const S_total = totalCalculatedSubtotal;

  if (S_total === 0) {
    // Subtotal 0, tidak ada pembagian proporsional
    participants.forEach(p => {
      participantResults.push({
        id: p.id,
        name: p.name,
        subtotal: 0,
        discountShare: 0,
        serviceShare: 0,
        taxShare: 0,
        tipShare: 0,
        roundingAdjustment: 0,
        exactFinalAmount: 0,
        finalAmount: 0,
        items: []
      });
    });
  } else {
    // Algoritma Largest Remainder (Hamilton-Hare) untuk menjamin sum(finalAmount) == F
    const rawAllocations = participants.map(p => {
      const pRecord = participantMap.get(p.id);
      const s_i = pRecord.subtotal;
      const ratio = s_i / S_total;
      const rawTotal = F * ratio;
      const floorTotal = Math.floor(rawTotal);
      const frac = rawTotal - floorTotal;

      return {
        id: p.id,
        name: p.name,
        subtotal: s_i,
        ratio,
        rawTotal,
        floorTotal,
        frac,
        items: pRecord.items
      };
    });

    const sumFloor = rawAllocations.reduce((acc, curr) => acc + curr.floorTotal, 0);
    let remainderToDistribute = F - sumFloor;

    // Urutkan berdasarkan fraksi desimal terbesar untuk alokasi +1
    const sortedIndices = rawAllocations
      .map((item, idx) => ({ idx, frac: item.frac }))
      .sort((a, b) => b.frac - a.frac);

    const bonusMap = new Set();
    for (let i = 0; i < remainderToDistribute && i < sortedIndices.length; i++) {
      bonusMap.add(sortedIndices[i].idx);
    }

    rawAllocations.forEach((item, idx) => {
      const extra = bonusMap.has(idx) ? 1 : 0;
      const exactFinal = item.floorTotal + extra;
      const finalAmount = applyRoundingStep(exactFinal, roundingStep);

      // Alokasi proporsional rincian komponen biaya
      const discountShare = Math.round(global.discountAmount * item.ratio);
      const serviceShare = Math.round(global.serviceAmount * item.ratio);
      const taxShare = Math.round(global.taxAmount * item.ratio);
      const tipShare = Math.round(global.tipAmount * item.ratio);

      participantResults.push({
        id: item.id,
        name: item.name,
        subtotal: item.subtotal,
        discountShare,
        serviceShare,
        taxShare,
        tipShare,
        roundingAdjustment: extra,
        exactFinalAmount: exactFinal,
        finalAmount,
        items: item.items
      });
    });
  }

  const sumCalculated = participantResults.reduce((acc, curr) => acc + curr.finalAmount, 0);
  const roundingDifference = sumCalculated - F;

  return {
    mode: SplitMode.ITEMIZED,
    valid: unassignedItemsCount === 0,
    unassignedItemsCount,
    roundingStep,
    roundingDifference,
    sumCalculated,
    ...global,
    participantResults
  };
}
