/**
 * SplitBill Formatter Module
 * Format Rupiah konsisten (IDR) & Generator Teks Ringkasan WhatsApp / Clipboard (Clean tanpa emoji).
 */

/**
 * Format integer uang ke format Rupiah standar Indonesia.
 * Contoh: 150000 -> "Rp 150.000"
 */
export function formatIDR(amount) {
  const numeric = Math.round(Number(amount) || 0);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.abs(numeric));

  if (numeric < 0) {
    return `-Rp ${formatted}`;
  }
  return `Rp ${formatted}`;
}

/**
 * Parsing teks string input angka uang ke integer murni.
 * "Rp 150.000" -> 150000
 */
export function parseIDR(str) {
  if (typeof str === 'number') return Math.max(0, Math.round(str));
  if (!str) return 0;
  const cleaned = str.toString().replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * Menghasilkan teks rapi siap kirim ke WhatsApp / Salin Clipboard
 * Format elegan & profesional tanpa emoji.
 */
export function generateShareText(result, session) {
  if (!result || !result.valid) {
    return 'Tagihan belum lengkap untuk dibagikan.';
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const modeLabel = session.mode === 'EQUAL' ? 'Bagi Rata' : 'Berdasarkan Pesanan';

  let text = `[RINCIAN SPLIT BILL]\n`;
  text += `Waktu: ${dateStr}, ${timeStr} WIB\n`;
  text += `Mode: ${modeLabel}\n\n`;

  text += `RINGKASAN TAGIHAN:\n`;
  text += `• Subtotal: ${formatIDR(result.subtotal)}\n`;

  if (result.discountAmount > 0) {
    const discLabel = session.fees?.discount?.type === 'PERCENT'
      ? `(${session.fees.discount.value}%)`
      : '';
    text += `• Diskon ${discLabel}: -${formatIDR(result.discountAmount)}\n`;
  }

  if (result.serviceAmount > 0) {
    const servLabel = session.fees?.service?.type === 'PERCENT'
      ? `(${session.fees.service.value}%)`
      : '';
    text += `• Service Charge ${servLabel}: +${formatIDR(result.serviceAmount)}\n`;
  }

  if (result.taxAmount > 0) {
    const taxLabel = session.fees?.tax?.type === 'PERCENT'
      ? `(${session.fees.tax.value}%)`
      : '';
    text += `• Pajak Resto ${taxLabel}: +${formatIDR(result.taxAmount)}\n`;
  }

  if (result.tipAmount > 0) {
    text += `• Tip: +${formatIDR(result.tipAmount)}\n`;
  }

  text += `---------------------------------\n`;
  text += `TOTAL AKHIR: ${formatIDR(result.finalTotal)}\n\n`;

  text += `RINCIAN PER ORANG:\n`;

  result.participantResults.forEach((p, idx) => {
    text += `${idx + 1}. ${p.name} -> ${formatIDR(p.finalAmount)}\n`;

    if (session.mode === 'ITEMIZED' && p.items && p.items.length > 0) {
      p.items.forEach(item => {
        const sharedNote = item.isShared ? ` (patungan ${item.shareCount} orang)` : '';
        text += `   - ${item.name} (${item.qty}x)${sharedNote}: ${formatIDR(item.userPortion)}\n`;
      });
      const extraFees = (p.serviceShare || 0) + (p.taxShare || 0) + (p.tipShare || 0) - (p.discountShare || 0);
      if (extraFees !== 0) {
        const sign = extraFees > 0 ? '+' : '';
        text += `   - Biaya & Pajak Bersih: ${sign}${formatIDR(extraFees)}\n`;
      }
    }
  });

  const sumCheck = result.participantResults.reduce((acc, curr) => acc + curr.finalAmount, 0);
  text += `\nTotal Akumulasi: ${formatIDR(sumCheck)} (Pas 100%)\n`;
  text += `Dihitung via: https://split-bill-sigma-two.vercel.app/`;

  return text;
}
