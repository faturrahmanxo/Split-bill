/**
 * SplitBill Formatter Module
 * Mendukung seluruh mata uang dunia (WORLD_CURRENCIES), Format Rupiah (IDR),
 * serta Generator Teks Struk & Ringkasan Share.
 */

export const WORLD_CURRENCIES = [
  { code: 'IDR', symbol: 'Rp', name: 'Rupiah Indonesia', decimals: 0 },
  { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan (RMB)', decimals: 2 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', decimals: 2 },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', decimals: 2 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimals: 2 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2 },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', decimals: 0 },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', decimals: 2 },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', decimals: 0 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2 },
  { code: 'BND', symbol: 'B$', name: 'Brunei Dollar', decimals: 2 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', decimals: 2 },
  { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', decimals: 2 },
  { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar', decimals: 2 },
  { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar', decimals: 2 },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', decimals: 2 },
  { code: 'JOD', symbol: 'JOD', name: 'Jordanian Dinar', decimals: 2 },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', decimals: 2 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', decimals: 2 },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', decimals: 2 },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', decimals: 0 },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', decimals: 0 },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', decimals: 2 },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', decimals: 2 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', decimals: 2 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', decimals: 2 },
  { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham', decimals: 2 },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', decimals: 2 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', decimals: 2 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', decimals: 2 },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', decimals: 2 },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', decimals: 2 },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', decimals: 0 },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', decimals: 2 },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', decimals: 0 },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', decimals: 2 },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', decimals: 2 },
  { code: 'NPR', symbol: 'Rs', name: 'Nepalese Rupee', decimals: 2 },
  { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat', decimals: 0 },
  { code: 'KHR', symbol: '៛', name: 'Cambodian Riel', decimals: 0 },
  { code: 'LAK', symbol: '₭', name: 'Lao Kip', decimals: 0 }
];

export function getCurrencyInfo(currencyCode = 'IDR') {
  const code = String(currencyCode || 'IDR').toUpperCase();
  return WORLD_CURRENCIES.find(c => c.code === code) || WORLD_CURRENCIES[0];
}

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
 * Format nominal uang sesuai mata uang yang dipilih (IDR maupun mata uang dunia).
 */
export function formatCurrency(amount, currencyCode = 'IDR', includeSymbol = true) {
  const info = getCurrencyInfo(currencyCode);
  if (info.code === 'IDR' && includeSymbol) {
    return formatIDR(amount);
  }

  const raw = Number(amount) || 0;
  const hasFraction = Math.abs(raw - Math.round(raw)) > 0.001;
  const decimals = info.decimals > 0 && (hasFraction || info.code !== 'IDR') ? info.decimals : 0;

  let formatted;
  if (info.code === 'IDR') {
    formatted = new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(Math.round(raw)));
  } else {
    formatted = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: hasFraction ? decimals : (decimals > 0 ? 2 : 0),
      maximumFractionDigits: decimals
    }).format(Math.abs(raw));
  }

  if (!includeSymbol) {
    return raw < 0 ? `-${formatted}` : formatted;
  }

  if (raw < 0) {
    return `-${info.symbol} ${formatted}`;
  }
  return `${info.symbol} ${formatted}`;
}

/**
 * Parsing teks string input angka uang ke integer murni (IDR).
 * "Rp 150.000" -> 150000
 */
export function parseIDR(str) {
  if (typeof str === 'number') return Math.max(0, Math.round(str));
  if (!str) return 0;
  const cleaned = str.toString().replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * Parsing input nominal sesuai mata uang (mendukung desimal untuk mata uang asing seperti USD/CHF/EUR).
 */
export function parseCurrencyInput(str, currencyCode = 'IDR') {
  const info = getCurrencyInfo(currencyCode);
  if (info.decimals === 0) {
    return parseIDR(str);
  }
  if (typeof str === 'number') return Math.max(0, Number(str.toFixed(2)));
  if (!str) return 0;
  let s = String(str).trim();
  // Jika hanya ada 1 koma sebagai pemisah desimal ("4,50"), ubah ke titik
  if (/^\d+,\d{1,2}$/.test(s)) {
    s = s.replace(',', '.');
  } else {
    // Hapus koma pemisah ribuan ("1,250.50")
    s = s.replace(/,/g, '');
  }
  const cleaned = s.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}` : parts[0];
  const val = parseFloat(normalized);
  return Number.isNaN(val) ? 0 : Math.max(0, Number(val.toFixed(2)));
}

/**
 * Menghasilkan teks rapi siap kirim ke WhatsApp / Share Struk
 */
export function generateShareText(result, session) {
  if (!result || !result.valid) {
    return 'Tagihan belum lengkap untuk dibagikan.';
  }

  const currencyCode = session?.currency || 'IDR';
  const fmt = (val) => formatCurrency(val, currencyCode, true);
  const merchantName = (session?.merchantName || '').trim();

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

  let text = `*RINCIAN SPLIT BILL*\n`;
  if (merchantName) {
    text += `Merchant: *${merchantName}*\n`;
  }
  text += `Waktu: ${dateStr}, ${timeStr} WIB\n`;
  text += `Mode: ${modeLabel} (${currencyCode})\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `*RINGKASAN STRUK:*\n`;
  text += `- Subtotal Menu: ${fmt(result.subtotal)}\n`;

  if (result.discountAmount > 0) {
    const discLabel = session.fees?.discount?.type === 'PERCENT'
      ? `(${session.fees.discount.value}%)`
      : '';
    text += `- Diskon ${discLabel}: -${fmt(result.discountAmount)}\n`;
  }

  if (result.serviceAmount > 0) {
    const servLabel = session.fees?.service?.type === 'PERCENT'
      ? `(${session.fees.service.value}%)`
      : '';
    text += `- Service Charge ${servLabel}: +${fmt(result.serviceAmount)}\n`;
  }

  if (result.taxAmount > 0) {
    const taxLabel = session.fees?.tax?.type === 'PERCENT'
      ? `(${session.fees.tax.value}%)`
      : '';
    text += `- Pajak Restoran ${taxLabel}: +${fmt(result.taxAmount)}\n`;
  }

  if (result.tipAmount > 0) {
    text += `- Tip Kasir: +${fmt(result.tipAmount)}\n`;
  }

  if (result.roundingStep && result.roundingStep > 1) {
    const roundingLabel = result.roundingStep === 100 ? 'Ratusan (Rp 100)' : 'Ribuan (Rp 1.000)';
    text += `- Pembulatan: ${roundingLabel}\n`;
  }

  text += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
  text += `*TOTAL STRUK: ${fmt(result.finalTotal)}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `*RINCIAN YANG HARUS DIBAYAR:*\n`;
  text += `_(Nominal di samping nama adalah TOTAL BERSIH yang harus ditransfer)_\n\n`;

  result.participantResults.forEach((p, idx) => {
    text += `[${idx + 1}] *${p.name}* -> *${fmt(p.finalAmount)}* (Total Bayar)\n`;

    if (session.mode === 'ITEMIZED' && p.items && p.items.length > 0) {
      p.items.forEach(item => {
        if (item.isShared) {
          text += `   - ${item.name} (${item.qty}x) [Patungan ${item.shareCount} orang: ${fmt(item.userPortion)}]\n`;
        } else {
          text += `   - ${item.name} (${item.qty}x): ${fmt(item.userPortion)}\n`;
        }
      });
      const extraFees = Number(((p.serviceShare || 0) + (p.taxShare || 0) + (p.tipShare || 0) - (p.discountShare || 0)).toFixed(2));
      if (Math.abs(extraFees) > 0.001) {
        const sign = extraFees > 0 ? '+' : '';
        text += `   - Biaya & Pajak: ${sign}${fmt(extraFees)}\n`;
      }
    }
    text += `\n`;
  });

  const sumCheck = Number(result.participantResults.reduce((acc, curr) => acc + curr.finalAmount, 0).toFixed(2));
  const diff = Number((sumCheck - result.finalTotal).toFixed(2));

  if (Math.abs(diff) < 0.005) {
    text += `*Status Akumulasi:* ${fmt(sumCheck)} (Pas 100%)\n`;
  } else if (diff > 0) {
    text += `*Status Akumulasi:* ${fmt(sumCheck)} (Dibulatkan +${fmt(diff)})\n`;
  } else {
    text += `*Status Akumulasi:* ${fmt(sumCheck)} (Dibulatkan -${fmt(Math.abs(diff))})\n`;
  }

  // Informasi Rekening / E-Wallet
  const payment = session.paymentInfo || {};
  if (payment.bankName || payment.accountNumber) {
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*INFORMASI PEMBAYARAN:*\n`;
    if (payment.bankName) {
      text += `- Bank / E-Wallet: *${payment.bankName}*\n`;
    }
    if (payment.accountNumber) {
      text += `- No. Rekening / HP: \`${payment.accountNumber}\` _(Tap untuk salin)_\n`;
    }
    if (payment.accountHolder) {
      text += `- Atas Nama: *${payment.accountHolder}*\n`;
    }
  }

  text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Dihitung via: SplitBill`;

  return text;
}
