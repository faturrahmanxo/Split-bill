/**
 * SplitBill Formatter Module
 * Format Rupiah konsisten (IDR) & Generator Teks Ringkasan WhatsApp / Clipboard (Clean tanpa emoji).
 */
import { getPaymentDeepLink } from '../deeplink/deeplinkHelper.js';
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
 * Diformat secara elegan dengan visual hierarchy yang jelas, monospace untuk no. rekening, dan mudah dibaca di layar HP.
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

  let text = `🧾 *RINCIAN SPLIT BILL*\n`;
  text += `🗓️ Waktu: ${dateStr}, ${timeStr} WIB\n`;
  text += `📌 Mode: ${modeLabel}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `💰 *RINGKASAN STRUK:*\n`;
  text += `• Subtotal Menu: ${formatIDR(result.subtotal)}\n`;

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
    text += `• Pajak Restoran ${taxLabel}: +${formatIDR(result.taxAmount)}\n`;
  }

  if (result.tipAmount > 0) {
    text += `• Tip Kasir: +${formatIDR(result.tipAmount)}\n`;
  }

  if (result.roundingStep && result.roundingStep > 1) {
    const roundingLabel = result.roundingStep === 100 ? 'Ratusan (Rp 100)' : 'Ribuan (Rp 1.000)';
    text += `• Pembulatan: ${roundingLabel}\n`;
  }

  text += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
  text += `*TOTAL STRUK: ${formatIDR(result.finalTotal)}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `👥 *RINCIAN YANG HARUS DIBAYAR:*\n`;
  text += `_(Nominal di samping nama adalah TOTAL BERSIH yang harus ditransfer)_\n\n`;

  const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  result.participantResults.forEach((p, idx) => {
    const numBadge = numberEmojis[idx] || `${idx + 1}.`;
    text += `${numBadge} *${p.name}* ➔ *${formatIDR(p.finalAmount)}* (Total Bayar)\n`;

    if (session.mode === 'ITEMIZED' && p.items && p.items.length > 0) {
      p.items.forEach(item => {
        if (item.isShared) {
          text += `   • ${item.name} (${item.qty}x) [Patungan ${item.shareCount} org: ${formatIDR(item.userPortion)}]\n`;
        } else {
          text += `   • ${item.name} (${item.qty}x): ${formatIDR(item.userPortion)}\n`;
        }
      });
      const extraFees = (p.serviceShare || 0) + (p.taxShare || 0) + (p.tipShare || 0) - (p.discountShare || 0);
      if (extraFees !== 0) {
        const sign = extraFees > 0 ? '+' : '';
        text += `   • Biaya & Pajak: ${sign}${formatIDR(extraFees)}\n`;
      }
    }
    text += `\n`;
  });

  const sumCheck = result.participantResults.reduce((acc, curr) => acc + curr.finalAmount, 0);
  const diff = sumCheck - result.finalTotal;

  if (diff === 0) {
    text += `✅ *Status Akumulasi:* ${formatIDR(sumCheck)} (Pas 100%)\n`;
  } else if (diff > 0) {
    text += `⚖️ *Status Akumulasi:* ${formatIDR(sumCheck)} (Dibulatkan +${formatIDR(diff)})\n`;
  } else {
    text += `⚖️ *Status Akumulasi:* ${formatIDR(sumCheck)} (Dibulatkan -${formatIDR(Math.abs(diff))})\n`;
  }

  // Informasi Rekening / E-Wallet & Deep Link Pembayaran
  const payment = session.paymentInfo || {};
  if (payment.bankName || payment.accountNumber) {
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💳 *INFORMASI PEMBAYARAN:*\n`;
    if (payment.bankName) {
      text += `• Bank / E-Wallet: *${payment.bankName}*\n`;
    }
    if (payment.accountNumber) {
      // Format kode monospace agar mudah di-copy di WhatsApp cukup dengan 1x tap
      text += `• No. Rekening / HP: \`${payment.accountNumber}\` _(Tap untuk salin)_\n`;
    }
    if (payment.accountHolder) {
      text += `• Atas Nama: *${payment.accountHolder}*\n`;
    }
    // Deep Link langsung ke aplikasi E-Wallet / Mobile Banking
    if (payment.bankName) {
      const deepLink = getPaymentDeepLink(payment.bankName, payment.accountNumber, result.finalTotal);
      text += `🚀 *Buka Aplikasi:* ${deepLink}\n`;
    }
  }

  text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `✨ Dihitung via: https://split-bill-sigma-two.vercel.app/`;

  return text;
}
