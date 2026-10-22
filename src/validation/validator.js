/**
 * SplitBill Validation Module
 * Memastikan keabsahan input pengguna sebelum kalkulasi atau render.
 * Menangani EDGE-001 s/d EDGE-014.
 */

export const MAX_SAFE_BILL = 100_000_000_000; // Rp 100 Miliar limit aman
export const MAX_PARTICIPANTS = 100;
export const MAX_ITEMS = 200;

export function validateInput(session) {
  const errors = [];
  const warnings = [];

  // 1. Peserta
  const participants = session.participants || [];
  if (participants.length === 0) {
    errors.push({ field: 'participants', message: 'Minimal harus ada 1 peserta tagihan.' });
  } else if (participants.length > MAX_PARTICIPANTS) {
    errors.push({ field: 'participants', message: `Maksimal peserta adalah ${MAX_PARTICIPANTS} orang.` });
  }

  // 2. Mode Equal
  if (session.mode === 'EQUAL') {
    const subtotal = Number(session.subtotal) || 0;
    if (subtotal < 0) {
      errors.push({ field: 'subtotal', message: 'Subtotal tidak boleh bernilai negatif.' });
    } else if (subtotal > MAX_SAFE_BILL) {
      errors.push({ field: 'subtotal', message: 'Nominal subtotal melebihi batas wajar.' });
    }
  }

  // 3. Mode Itemized
  if (session.mode === 'ITEMIZED') {
    const items = session.items || [];
    if (items.length === 0) {
      warnings.push({ field: 'items', message: 'Belum ada item pesanan yang ditambahkan.' });
    } else if (items.length > MAX_ITEMS) {
      errors.push({ field: 'items', message: `Maksimal item adalah ${MAX_ITEMS} item.` });
    }

    let unassigned = 0;
    items.forEach((item, idx) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;

      if (price < 0) {
        errors.push({ field: `item_${idx}_price`, message: `Harga item "${item.name || idx + 1}" tidak boleh negatif.` });
      }
      if (qty <= 0) {
        errors.push({ field: `item_${idx}_qty`, message: `Kuantitas item "${item.name || idx + 1}" minimal 1.` });
      }
      if (!item.participantIds || item.participantIds.length === 0) {
        unassigned++;
      }
    });

    if (unassigned > 0) {
      warnings.push({
        field: 'unassigned_items',
        message: `Ada ${unassigned} item yang belum dialokasikan ke peserta.`
      });
    }
  }

  // 4. Biaya Tambahan
  const fees = session.fees || {};
  ['tax', 'service', 'tip', 'discount'].forEach(feeKey => {
    const fee = fees[feeKey];
    if (fee) {
      const val = Number(fee.value) || 0;
      if (val < 0) {
        errors.push({ field: `fee_${feeKey}`, message: `Nilai ${feeKey} tidak boleh negatif.` });
      }
      if (fee.type === 'PERCENT' && val > 100 && feeKey !== 'tip') {
        errors.push({ field: `fee_${feeKey}`, message: `Persentase ${feeKey} tidak boleh melebihi 100%.` });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
