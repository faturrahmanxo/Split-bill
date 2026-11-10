/**
 * Modul Receipt Scanner & Smart Parser (OCR + Text Order Parser + PDF Document Scanner)
 * Mengekstrak nama merchant (teks saja), mata uang, daftar item makanan/minuman, kuantitas,
 * harga satuan, pajak (PB1/PPN), service charge, dan diskon secara otomatis dari foto struk.
 */

import { FeeType } from '../calculation/engine.js';
import { getCurrencyInfo } from '../formatting/formatter.js';

/**
 * Format file gambar yang diizinkan untuk scan struk (PDF ditolak secara eksplisit)
 */
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

/**
 * Validasi apakah file yang diunggah benar-benar gambar struk yang didukung (bukan PDF atau dokumen lain)
 */
export function validateReceiptFile(file) {
  if (!file) {
    return {
      valid: false,
      message: 'Pilih foto struk terlebih dahulu.'
    };
  }

  const fileName = (file.name || '').toLowerCase();
  const mimeType = (file.type || '').toLowerCase();

  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return {
      valid: false,
      message: 'Format PDF tidak didukung. Harap unggah foto struk asli dalam format JPG, PNG, atau WEBP.'
    };
  }

  const isAllowedMime = ALLOWED_IMAGE_MIME_TYPES.includes(mimeType);
  const isAllowedExt = ALLOWED_IMAGE_EXTENSIONS.test(fileName);

  if (!isAllowedMime && !isAllowedExt) {
    return {
      valid: false,
      message: 'Format file tidak valid. Hanya menerima gambar struk (JPG, PNG, atau WEBP).'
    };
  }

  if (file.size > 15 * 1024 * 1024) {
    return {
      valid: false,
      message: 'Ukuran gambar terlalu besar (maksimal 15MB).'
    };
  }

  return { valid: true, message: '' };
}

/**
 * Daftar kata kunci indikator struk belanja/restoran (Indonesia, Inggris, & Internasional)
 */
const RECEIPT_KEYWORDS_REGEX = /\b(struk|kasir|cashier|subtotal|sub\s*total|total|grand\s*total|tunai|cash|kembalian|change|pajak|pb1|ppn|tax|vat|mwst|service|diskon|discount|qty|meja|table|tisch|order|nota|bill|receipt|invoice|rech|bar|chf|eur|usd|rp|idr|rm|sgd|jpy|gbp|aud|gopay|qris|dana|ovo|bca|mandiri|resto|cafe|warung|kopi|hotel|berghotel|grindelwald)\b/i;

/**
 * Validasi apakah hasil teks/OCR benar-benar merupakan struk pesanan yang memiliki menu & harga valid
 */
export function validateReceiptContent(rawText, parsedResult, isFromImage = false) {
  const cleanText = (rawText || '').trim();

  if (!cleanText || cleanText.length < 5) {
    return {
      valid: false,
      message: isFromImage
        ? 'Gambar tidak terdeteksi sebagai struk pesanan. Pastikan foto menampilkan struk asli dengan jelas.'
        : 'Teks pesanan masih kosong. Masukkan daftar menu beserta harganya.'
    };
  }

  const validItems = Array.isArray(parsedResult?.items)
    ? parsedResult.items.filter(it => it && typeof it.name === 'string' && it.name.trim().length >= 2 && it.price > 0)
    : [];

  if (validItems.length === 0) {
    return {
      valid: false,
      message: isFromImage
        ? 'Gambar tidak terdeteksi sebagai struk pesanan yang valid. Pastikan foto menampilkan struk asli dengan daftar nama menu dan harga.'
        : 'Format teks tidak dikenali sebagai daftar pesanan. Pastikan terdapat nama menu dan harga (contoh: 2x Nasi Goreng 70.000).'
    };
  }

  const hasReceiptKeywords = RECEIPT_KEYWORDS_REGEX.test(cleanText);
  const hasMultipleItems = validItems.length >= 2;
  const hasDetectedFeesOrTotal =
    (parsedResult?.detectedTotal > 0) ||
    (parsedResult?.detectedSubtotal > 0) ||
    Boolean(parsedResult?.fees?.tax || parsedResult?.fees?.service || parsedResult?.fees?.discount);

  // Jika sudah terdeteksi menu dan harga yang jelas (atau kata kunci struk), izinkan lewat
  if (isFromImage && !hasReceiptKeywords && !hasMultipleItems && !hasDetectedFeesOrTotal && validItems.length === 0) {
    return {
      valid: false,
      message: 'Gambar yang diunggah bukan struk pesanan. Harap unggah foto struk belanja atau makanan yang memiliki daftar item dan total harga.'
    };
  }

  return { valid: true, message: '' };
}

/**
 * Daftar pola kata kunci yang BUKAN nama item makanan/minuman
 */
const IGNORE_LINE_PATTERNS = [
  /^(kasir|cashier|server|waiter|waitress|operator|admin|pelanggan|customer|member|guest|nama\s*tamu)\b/i,
  /^(tanggal|tgl|date|waktu|time|jam|no\.?\s*struk|no\.?\s*nota|no\.?\s*bill|no\.?\s*order|no\.?\s*trans|order\s*id|receipt|invoice|bill\s*no|table|meja|tisch|dine\s*in|take\s*away|delivery|gofood|grabfood|shopeefood)\b/i,
  /^(rech\.?\s*nr|bon\s*nr|beleg\s*nr|ust-?id|mwst\s*nr|steuernummer|bediente\s*sie|es\s*bediente|vielen\s*dank|danke|auf\s*wiedersehen|familie\s+[a-z])\b/i,
  /^(tunai|cash|kembalian|kembali|change|kredit|debit|qris|gopay|ovo|dana|shopeepay|linkaja|bca|mandiri|bni|bri|btn|kartu|card|payment|pembayaran|bayar|paid)\b/i,
  /^(terima\s*kasih|thank\s*you|thanks|selamat\s*datang|welcome|wifi|password|ig|instagram|telp|tel\.?|fax\.?|wa|whatsapp|hp|phone|alamat|jl\.|jalan|npwp|www\.|http|e-?mail)\b/i,
  /^(incl\.?\s*\d|inkl\.?\s*\d|entspricht\s*in\s*euro|barang\s*kena\s*pajak|harga\s*termasuk|sudah\s*termasuk|tax\s*included|nett)\b/i,
  /^(bar\s+tisch|tisch\s+\d)/i,
  /^\s*[-=*_~.#]{3,}\s*$/,
  /^\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
  /^\s*\d{2}:\d{2}(:\d{2})?\s*$/,
  /^\s*\d{4}\s+[A-Z][a-zA-ZäöüÄÖÜ]+$/ // Kode pos + kota (misal: "3818 Grindelwald")
];

const CURRENCY_REGEX_PART = '(?:rp\\.?|idr|chf|eur|usd|sgd|myr|rm|jpy|gbp|aud|cad|hkd|cny|krw|thb|sar|aed|twd|php|vnd|inr|nzd|bnd|try|qar|kwd|\\$|€|£|¥)';
const PRICE_REGEX_PART = '(\\d{1,3}(?:[.,]\\d{3})+(?:[.,]\\d{2})?|\\d{1,5}[.,]\\d{2}|\\d{3,8}|\\d{1,4}(?:[.,]\\d)?\\s*(?:k|rb|ribu))';

/**
 * Mendeteksi kode mata uang dari teks struk secara otomatis
 */
export function detectReceiptCurrency(rawText) {
  if (!rawText || typeof rawText !== 'string') return 'IDR';

  const rules = [
    { code: 'CHF', regex: /\bCHF\b/gi, weight: 3 },
    { code: 'IDR', regex: /\b(?:Rp\.?|IDR)\b/gi, weight: 3 },
    { code: 'MYR', regex: /\b(?:MYR|RM)\b/gi, weight: 3 },
    { code: 'SGD', regex: /(?:S\$|\bSGD\b)/gi, weight: 3 },
    { code: 'USD', regex: /(?:US\$|\bUSD\b)/gi, weight: 3 },
    { code: 'EUR', regex: /(?:€|\bEUR\b)/gi, weight: 2 },
    { code: 'GBP', regex: /(?:£|\bGBP\b)/gi, weight: 3 },
    { code: 'JPY', regex: /(?:¥|\bJPY\b)/gi, weight: 3 },
    { code: 'AUD', regex: /(?:A\$|\bAUD\b)/gi, weight: 3 },
    { code: 'CAD', regex: /(?:C\$|\bCAD\b)/gi, weight: 3 },
    { code: 'HKD', regex: /(?:HK\$|\bHKD\b)/gi, weight: 3 },
    { code: 'THB', regex: /(?:฿|\bTHB\b)/gi, weight: 3 },
    { code: 'KRW', regex: /(?:₩|\bKRW\b)/gi, weight: 3 },
    { code: 'SAR', regex: /\bSAR\b/gi, weight: 3 },
    { code: 'AED', regex: /\bAED\b/gi, weight: 3 },
    { code: 'PHP', regex: /(?:₱|\bPHP\b)/gi, weight: 3 },
    { code: 'VND', regex: /(?:₫|\bVND\b)/gi, weight: 3 },
    { code: 'INR', regex: /(?:₹|\bINR\b)/gi, weight: 3 },
    { code: 'CNY', regex: /\b(?:CNY|RMB)\b/gi, weight: 3 },
    { code: 'TRY', regex: /(?:₺|\bTRY\b)/gi, weight: 3 }
  ];

  let bestCode = null;
  let bestScore = 0;

  for (const rule of rules) {
    // Jangan hitung baris konversi kurs tambahan seperti "Entspricht in Euro 36.33 EUR" sebagai pemenang utama jika ada mata uang utama
    const cleanedForCurrency = rawText.replace(/entspricht\s+in\s+euro.*$/gim, '');
    const matches = [...cleanedForCurrency.matchAll(rule.regex)];
    const score = matches.length * rule.weight;
    if (score > bestScore) {
      bestScore = score;
      bestCode = rule.code;
    }
  }

  if (bestCode) return bestCode;

  // Jika hanya simbol '$' yang muncul tanpa 'Rp'/'IDR'
  if (/\$/.test(rawText) && !/\b(?:rp|idr)\b/i.test(rawText)) {
    return 'USD';
  }

  return 'IDR';
}

/**
 * Mengekstrak Nama Merchant (hanya teks bersih tanpa logo/simbol grafis) dari bagian atas struk
 */
export function extractMerchantName(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  const rawLines = rawText
    .split(/\r?\n/)
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length >= 2);

  const headerSlice = rawLines.slice(0, 8).join('\n');

  // Deteksi cepat nama merchant/ritel populer agar noise logo di sebelahnya langsung dibersihkan
  const knownBrands = [
    { regex: /\balfamart\b/i, name: 'Alfamart' },
    { regex: /\balfamidi\b/i, name: 'Alfamidi' },
    { regex: /\bindomaret\b/i, name: 'Indomaret' },
    { regex: /\bsuper\s*indo\b/i, name: 'Super Indo' },
    { regex: /\blawson\b/i, name: 'Lawson' },
    { regex: /\bfamily\s*mart\b/i, name: 'FamilyMart' },
    { regex: /\bstarbucks\b/i, name: 'Starbucks' },
    { regex: /\bkopi\s*kenangan\b/i, name: 'Kopi Kenangan' },
    { regex: /\bfore\s*coffee\b/i, name: 'Fore Coffee' },
    { regex: /\bjanji\s*jiwa\b/i, name: 'Janji Jiwa' },
    { regex: /\bsolaria\b/i, name: 'Solaria' },
    { regex: /\bmie\s*gacoan\b/i, name: 'Mie Gacoan' },
    { regex: /\bmixue\b/i, name: 'Mixue' },
    { regex: /\bmcdonald'?s?\b/i, name: "McDonald's" },
    { regex: /\bkfc\b/i, name: 'KFC' },
    { regex: /\bhokben\b/i, name: 'HokBen' },
    { regex: /\byoshinoya\b/i, name: 'Yoshinoya' },
    { regex: /\bpizza\s*hut\b/i, name: 'Pizza Hut' },
    { regex: /\bburger\s*king\b/i, name: 'Burger King' },
    { regex: /\bricheese\b/i, name: 'Richeese Factory' },
    { regex: /\bmarugame\b/i, name: 'Marugame Udon' },
    { regex: /\bsushi\s*tei\b/i, name: 'Sushi Tei' }
  ];

  for (const brand of knownBrands) {
    if (brand.regex.test(headerSlice)) {
      return brand.name;
    }
  }

  const merchantLines = [];
  const maxLinesToScan = Math.min(rawLines.length, 10);

  const stopHeaderRegex = /\b(jl\.?|jalan|street|st\.|road|rd\.|avenue|no\.?\s*\d|telp|tel\.?|fax\.?|phone|hp|wa|whatsapp|npwp|struk|kasir|cashier|server|tanggal|tgl|date|time|waktu|jam|meja|table|tisch|rech\.?\s*nr|bon|invoice|receipt|order|bill|bar\b|subtotal|total|pajak|tax|mwst|incl|welcome|selamat\s*datang|familie|pt\.?\s|cv\.?\s|cabang|outlet)\b/i;

  for (let i = 0; i < maxLinesToScan; i++) {
    let line = rawLines[i];

    // Hapus karakter non-teks / dekorasi logo ASCII di pinggir baris
    line = line
      .replace(/^[^a-zA-ZÀ-ÿ0-9]+/, '')
      .replace(/[^a-zA-ZÀ-ÿ0-9&'.\- )]+$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (line.length < 3) continue;

    // Jika sudah masuk ke baris item pesanan ("2xLatte", "1x Ayam", atau baris yang diakhiri harga) -> berhenti
    if (/^(?:\d+|[lI|!zZ])\s*[xX*]\s*[a-zA-ZÀ-ÿ]/i.test(line)) break;
    if (/\d{1,3}(?:[.,]\d{3})+$|\d+[.,]\d{2}\s*$/.test(line)) break;

    // Jika baris adalah kode pos + kota (contoh "3818 Grindelwald") atau tanggal -> berhenti jika sudah dapat merchant
    if (/^\d{4,6}\s+[A-Za-zÀ-ÿ]/.test(line) || /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(line)) {
      if (merchantLines.length > 0) break;
      continue;
    }

    // Jika baris mengandung kata kunci alamat / nomor struk / telepon -> berhenti jika sudah dapat merchant
    if (stopHeaderRegex.test(line)) {
      if (merchantLines.length > 0) break;
      continue;
    }

    // Pastikan baris didominasi huruf (teks nama tempat/merchant, bukan deretan simbol logo atau angka)
    const letters = (line.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
    const digits = (line.match(/\d/g) || []).length;
    if (letters < 3 || digits > letters) continue;

    // Koreksi OCR umum untuk huruf 'g' yang terbaca 'q' pada font struk (misal "Berqhotel" -> "Berghotel")
    line = line.replace(/\bBerqhotel\b/gi, 'Berghotel');

    // Bersihkan token noise hasil bacaan logo (kata pendek <= 3 huruf yang tidak memiliki huruf vokal seperti "rn", "tnt", "np")
    const words = line.split(/\s+/).filter(w => {
      const cleanW = w.replace(/[^a-zA-ZÀ-ÿ]/g, '');
      if (cleanW.length < 2) return false;
      if (cleanW.length <= 3 && !/[aeiouAEIOUäöüÄÖÜ]/.test(cleanW)) return false;
      return true;
    });
    if (words.length === 0) continue;

    const cleanLine = words.join(' ');
    merchantLines.push(cleanLine);

    // Gabungkan maksimal 2 baris judul merchant (contoh: "Berghotel" + "Grosse Scheidegg")
    if (merchantLines.length >= 2) break;
  }

  return merchantLines.join(' ').trim();
}

/**
 * Mengubah string harga pada struk menjadi angka sesuai mata uangnya:
 * - Untuk IDR (atau mata uang tanpa desimal): "70.000" -> 70000, "25k" -> 25000
 * - Untuk mata uang desimal (CHF, USD, EUR, SGD, MYR, dll.): "4.50" -> 4.5, "54.50" -> 54.5
 */
export function parseReceiptNumber(rawStr, currencyCode = 'IDR', forceDecimalMode = false) {
  if (!rawStr) return 0;
  let s = String(rawStr).trim().toLowerCase();

  // Tangani akhiran "k" / "rb" / "ribu" (contoh: 25k -> 25000, 12.5k -> 12500)
  const kMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*(k|rb|ribu)$/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(',', '.'));
    return Number.isNaN(num) ? 0 : Math.round(num * 1000);
  }

  // Hapus simbol mata uang dan spasi
  s = s.replace(/(?:rp\.?|idr|chf|eur|usd|sgd|myr|rm|jpy|gbp|aud|cad|hkd|cny|krw|thb|sar|aed|\$|€|£|¥|\s)/gi, '');

  const currInfo = getCurrencyInfo(currencyCode);
  const useDecimals = forceDecimalMode || currInfo.decimals > 0;

  if (useDecimals) {
    // Jika format ribuan + desimal: "1,250.50" atau "1.250,50"
    if (/^\d{1,3}(?:,\d{3})+\.\d{2}$/.test(s)) {
      s = s.replace(/,/g, '');
    } else if (/^\d{1,3}(?:\.\d{3})+,\d{2}$/.test(s)) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(',', '.');
    }
    const val = parseFloat(s);
    return Number.isNaN(val) ? 0 : Math.round(val * 100) / 100;
  }

  // Mode mata uang bulat (IDR, VND, JPY, KRW):
  // Jika diakhiri ,00 atau .00 pada angka ribuan (contoh: 35.000,00 atau 35,000.00)
  s = s.replace(/[.,]\d{2}$/, (match) => {
    const prefix = s.slice(0, -match.length);
    if (prefix.length >= 4 || /[.,]/.test(prefix)) {
      return '';
    }
    return match;
  });

  // Jika format ribuan Indonesia: 35.000 atau 1.250.000
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) {
    const digits = s.replace(/\D/g, '');
    return parseInt(digits, 10) || 0;
  }

  // Jika format desimal 2 digit pada struk tanpa Rp (misal "4.50" ketika belum terdeteksi mata uangnya)
  if (/^\d{1,4}[.,]\d{2}$/.test(s)) {
    const val = parseFloat(s.replace(',', '.'));
    if (!Number.isNaN(val) && val > 0) {
      return Math.round(val * 1000);
    }
  }

  const digitsOnly = s.replace(/\D/g, '');
  if (!digitsOnly) return 0;
  return parseInt(digitsOnly, 10) || 0;
}

/**
 * Normalisasi baris teks hasil OCR agar kesalahan baca huruf/angka umum pada struk bisa diperbaiki
 */
function normalizeOcrLine(line) {
  if (!line) return '';
  let s = line
    .replace(/[—–―]/g, '-')
    .replace(/\t+/g, '   ')
    .trim();

  // Perbaiki OCR yang membaca "1x" sebagai "lx", "Ix", "|x", "!x" atau "2x" sebagai "Zx" di awal baris
  s = s.replace(/^(?:[lI|!])\s*([xX*])\s*(?=[A-Za-zÀ-ÿ])/g, '1$1 ');
  s = s.replace(/^(?:[zZ])\s*([xX*])\s*(?=[A-Za-zÀ-ÿ])/g, '2$1 ');

  // Perbaiki OCR yang membaca angka 0 sebagai huruf O/o di dalam nominal harga
  s = s.replace(/(\d)[.,]([oO0]{2,3})\b/g, (_, d, zeros) => `${d}.${'0'.repeat(zeros.length)}`);
  s = s.replace(/(\d)([oO]{2,3})\b/g, (_, d, zeros) => `${d}${'0'.repeat(zeros.length)}`);

  // Perbaiki spasi di dalam pemisah titik/koma harga (contoh: "18. 50" -> "18.50", "54 , 50" -> "54.50", "35 . 000" -> "35.000")
  s = s.replace(/(\d)\s*[.,]\s*(\d{2,3})(?!\d)/g, '$1.$2');

  // Hanya gabungkan jika benar-benar terpisah spasi tanpa titik/koma di sekitarnya
  s = s.replace(/(?<![.,\d])(\d{1,3})\s+(000)(?![.,\d])/g, '$1.$2');
  s = s.replace(/(?<![.,\d])(\d{1,3})\s+(00|50)(?![.,\d])/g, '$1.$2');

  return s;
}

/**
 * Membersihkan nama menu dari karakter noise OCR, nomor urut, atau kode kasir
 */
function cleanItemName(rawName) {
  if (!rawName) return '';
  const trailingCurrencyRe = new RegExp(`\\s+${CURRENCY_REGEX_PART}$`, 'i');
  let name = rawName
    .replace(/^(?:\d+|[lI|!zZ])\s*[xX*]\s*/, '')
    .replace(trailingCurrencyRe, '')
    .replace(/\s+[@àáäad&o4*xX]\s*$/i, '')
    .replace(/^[-•*>+#.,:\s|]+/, '')
    .replace(/[-•*>+#.,:\s|]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  name = name.replace(/^[A-Z]{1,2}\d{2,4}\s+/i, '');
  return name;
}

/**
 * Mengecek apakah sebuah harga masuk akal untuk harga makanan/minuman
 */
function isPlausiblePrice(amount, isDecimalCurrency = false) {
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) return false;
  if (isDecimalCurrency) {
    return amount >= 0.1 && amount <= 1000000;
  }
  return amount >= 100 && amount <= 50000000;
}

/**
 * Mengubah token qty awal ("2", "1", "I", "l", "|", "Z") menjadi angka bulat
 */
function parseQtyToken(rawToken) {
  if (!rawToken) return 1;
  const t = String(rawToken).trim();
  if (/^[lI|!]$/.test(t)) return 1;
  if (/^[zZ]$/.test(t)) return 2;
  const n = parseInt(t, 10);
  return !Number.isNaN(n) && n > 0 ? n : 1;
}

/**
 * Mem-parsing teks mentah hasil OCR struk menjadi objek terstruktur
 * @param {string} rawText
 * @param {string} [forcedCurrency]
 */
export function parseReceiptText(rawText, forcedCurrency = null) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      merchantName: '',
      currency: forcedCurrency || 'IDR',
      items: [],
      fees: {},
      detectedSubtotal: 0,
      detectedTotal: 0
    };
  }

  const detectedCurrency = forcedCurrency || detectReceiptCurrency(rawText);
  const merchantName = extractMerchantName(rawText);

  // Cek apakah struk menggunakan angka desimal 2 digit (seperti 4.50, 9.00, 18.50) tanpa ribuan 3 digit
  const hasExplicitIdr = /\b(?:rp\.?|idr)\b/i.test(rawText);
  const twoDecimalMatches = [...rawText.matchAll(/(?<!\d)\d{1,3}[.,]\d{2}(?!\d)/g)];
  const threeDigitThousandMatches = [...rawText.matchAll(/(?<!\d)\d{1,3}[.,]\d{3}(?!\d)/g)];
  const currInfo = getCurrencyInfo(detectedCurrency);
  const isDecimalCurrency =
    currInfo.decimals > 0 ||
    (!hasExplicitIdr && twoDecimalMatches.length >= 2 && threeDigitThousandMatches.length === 0);

  const parseNum = (str) => parseReceiptNumber(str, detectedCurrency, isDecimalCurrency);
  const checkPrice = (amt) => isPlausiblePrice(amt, isDecimalCurrency);

  const lines = rawText
    .split(/\r?\n/)
    .map(l => normalizeOcrLine(l))
    .filter(l => l.length >= 2);

  const items = [];
  const detectedFees = {};
  let detectedSubtotal = 0;
  let detectedTotal = 0;

  const pendingItemsQueue = [];

  const priceGlobalRegex = /(?<!\d)(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d{1,5}[.,]\d{2}|\d{3,8}|\d{1,4}(?:[.,]\d)?\s*(?:k|rb|ribu))(?!\d)/gi;
  const multiLineQtyPriceRegex = new RegExp(
    `^(\\d{1,3}|[lI|!zZ])\\s*[xX*@]\\s*(?:${CURRENCY_REGEX_PART}\\s*)?${PRICE_REGEX_PART}(?:\\s+(?:${CURRENCY_REGEX_PART}\\s*)?${PRICE_REGEX_PART})?\\s*$`,
    'i'
  );
  const multiLinePriceQtyRegex = new RegExp(
    `^(?:${CURRENCY_REGEX_PART}\\s*)?${PRICE_REGEX_PART}\\s*[xX*]\\s*(\\d{1,3})(?:\\s+(?:${CURRENCY_REGEX_PART}\\s*)?${PRICE_REGEX_PART})?\\s*$`,
    'i'
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (IGNORE_LINE_PATTERNS.some(re => re.test(line))) {
      pendingItemsQueue.length = 0;
      continue;
    }

    const lower = line.toLowerCase();

    // Cek Subtotal
    if (/^(sub\s*total|subtotal|jumlah\s*harga|total\s*item|zwischensumme)\b/i.test(lower)) {
      const m = [...line.matchAll(priceGlobalRegex)];
      if (m.length > 0) detectedSubtotal = parseNum(m[m.length - 1][1]);
      pendingItemsQueue.length = 0;
      continue;
    }

    // Cek Diskon / Promo / Voucher
    if (/\b(diskon|discount|disc|promo|voucher|potongan|hemat|rabatt)\b/i.test(lower)) {
      const pctMatch = line.match(/(\d+(?:[.,]\d+)?)\s*%/);
      const allPrices = [...line.matchAll(priceGlobalRegex)];
      if (pctMatch) {
        const pct = parseFloat(pctMatch[1].replace(',', '.'));
        if (pct > 0 && pct <= 100) {
          detectedFees.discount = { type: FeeType.PERCENT, value: pct };
        }
      } else if (allPrices.length > 0) {
        const amt = parseNum(allPrices[allPrices.length - 1][1]);
        if (amt > 0) {
          detectedFees.discount = { type: FeeType.NOMINAL, value: amt };
        }
      }
      pendingItemsQueue.length = 0;
      continue;
    }

    // Cek Service Charge / Biaya Layanan
    if (/\b(service\s*charge|service|srv\s*chg|biaya\s*layanan|layanan|sc)\b/i.test(lower)) {
      const pctMatch = line.match(/(\d+(?:[.,]\d+)?)\s*%/);
      const allPrices = [...line.matchAll(priceGlobalRegex)];
      if (pctMatch) {
        const pct = parseFloat(pctMatch[1].replace(',', '.'));
        if (pct > 0 && pct <= 50) {
          detectedFees.service = { type: FeeType.PERCENT, value: pct };
        }
      } else if (allPrices.length > 0) {
        const amt = parseNum(allPrices[allPrices.length - 1][1]);
        if (amt > 0) {
          detectedFees.service = { type: FeeType.NOMINAL, value: amt };
        }
      }
      pendingItemsQueue.length = 0;
      continue;
    }

    // Cek Pajak / PB1 / PPN / Tax / VAT / MwSt (yang BUKAN inclusive)
    if (/\b(pajak|pb1|pb\s*1|ppn|tax|vat|mwst|gst|resto\s*tax)\b/i.test(lower)) {
      const pctMatch = line.match(/(?<!pb)(\d+(?:[.,]\d+)?)\s*%/i);
      const allPrices = [...line.matchAll(priceGlobalRegex)];
      if (pctMatch) {
        const pct = parseFloat(pctMatch[1].replace(',', '.'));
        if (pct > 0 && pct <= 50) {
          detectedFees.tax = { type: FeeType.PERCENT, value: pct };
        }
      } else if (allPrices.length > 0) {
        const amt = parseNum(allPrices[allPrices.length - 1][1]);
        if (amt > 0) {
          detectedFees.tax = { type: FeeType.NOMINAL, value: amt };
        }
      }
      pendingItemsQueue.length = 0;
      continue;
    }

    // Cek Grand Total
    if (/^(grand\s*total|total\s*bayar|total\s*tagihan|total\s*akhir|total|jumlah\s*total|net\s*total|harus\s*dibayar|summe|gesamt)\b/i.test(lower)) {
      const allPrices = [...line.matchAll(priceGlobalRegex)];
      if (allPrices.length > 0) detectedTotal = parseNum(allPrices[allPrices.length - 1][1]);
      pendingItemsQueue.length = 0;
      continue;
    }

    // Pola Multi-baris A: Baris berisi "3 x 24.000   72.000"
    const multiLineQtyPriceMatch = line.match(multiLineQtyPriceRegex);
    if (multiLineQtyPriceMatch && pendingItemsQueue.length > 0) {
      const pending = pendingItemsQueue.shift();
      const qty = parseQtyToken(multiLineQtyPriceMatch[1]);
      const firstPrice = parseNum(multiLineQtyPriceMatch[2]);
      if (checkPrice(firstPrice)) {
        items.push({
          name: pending.name,
          qty,
          price: firstPrice
        });
      }
      continue;
    }

    // Pola Multi-baris B: Baris berisi "24.000 x 3   72.000"
    const multiLinePriceQtyMatch = line.match(multiLinePriceQtyRegex);
    if (multiLinePriceQtyMatch && pendingItemsQueue.length > 0) {
      const pending = pendingItemsQueue.shift();
      const firstPrice = parseNum(multiLinePriceQtyMatch[1]);
      const qty = parseQtyToken(multiLinePriceQtyMatch[2]);
      if (checkPrice(firstPrice)) {
        items.push({
          name: pending.name,
          qty,
          price: firstPrice
        });
      }
      continue;
    }

    // Cari semua token angka harga pada baris ini
    const priceMatches = [...line.matchAll(priceGlobalRegex)];
    if (priceMatches.length > 0) {
      const lastMatch = priceMatches[priceMatches.length - 1];
      const tailAfterLastPrice = line.slice(lastMatch.index + lastMatch[0].length).trim();

      const tailLettersOnly = tailAfterLastPrice.replace(/[^a-zA-Z]/g, '');
      const tailIsClean = tailLettersOnly.length <= 4;

      if (tailIsClean) {
        const firstMatch = priceMatches.length >= 2 ? priceMatches[priceMatches.length - 2] : lastMatch;
        const firstAmount = parseNum(firstMatch[1]);
        const lastAmount = parseNum(lastMatch[1]);

        const textBeforeFirstPrice = line.slice(0, firstMatch.index).trim();
        const textBeforeLastPrice = line.slice(0, lastMatch.index).trim();

        // Kasus 1: Baris hanya berisi harga (misal "à 4.50 CHF 9.00" atau "70.000") dan ada antrean nama item sebelumnya
        const strippedPrefixSymbols = textBeforeFirstPrice
          .replace(new RegExp(`^[@àáäad&o4*xX\\s]+|${CURRENCY_REGEX_PART}`, 'gi'), '')
          .trim();

        if (strippedPrefixSymbols.length < 2 && pendingItemsQueue.length > 0 && checkPrice(lastAmount)) {
          const pending = pendingItemsQueue.shift();
          const qty = pending.qty || 1;
          let unitPrice = lastAmount;
          if (priceMatches.length >= 2 && checkPrice(firstAmount)) {
            unitPrice = firstAmount;
          } else if (qty > 1) {
            const divided = lastAmount / qty;
            unitPrice = isDecimalCurrency ? Math.round(divided * 100) / 100 : (lastAmount % qty === 0 ? Math.round(divided) : lastAmount);
          }
          items.push({
            name: pending.name,
            qty,
            price: unitPrice
          });
          continue;
        }

        // Kasus 2: Baris lengkap berisi Nama Menu + Harga (misal "2xLatte Macchiato à 4.50 CHF 9.00" atau "2x Nasi Goreng 70.000")
        let leftPart = priceMatches.length >= 2 && /[a-zA-ZÀ-ÿ]{2,}/.test(textBeforeFirstPrice)
          ? textBeforeFirstPrice
          : textBeforeLastPrice;

        const rightmostAmount = lastAmount;
        if (checkPrice(rightmostAmount) && /[a-zA-ZÀ-ÿ]{2,}/.test(leftPart)) {
          let qty = 1;
          let unitPrice = rightmostAmount;

          const usedTwoPrices = leftPart === textBeforeFirstPrice && priceMatches.length >= 2 && checkPrice(firstAmount);
          if (usedTwoPrices) {
            unitPrice = firstAmount;
          }

          const divideUnitIfSinglePrice = (q) => {
            if (!usedTwoPrices && q > 1) {
              const ratio = rightmostAmount / q;
              if (isDecimalCurrency) {
                unitPrice = Math.round(ratio * 100) / 100;
              } else if (rightmostAmount % q === 0) {
                unitPrice = Math.round(ratio);
              }
            }
          };

          const trailingQtyBeforePrice = leftPart.match(/^(.*?)\s+(\d{1,3}|[lI|!zZ])\s*[xX*@]\s*$/);
          if (trailingQtyBeforePrice && /[a-zA-ZÀ-ÿ]{2,}/.test(trailingQtyBeforePrice[1])) {
            leftPart = trailingQtyBeforePrice[1].trim();
            qty = parseQtyToken(trailingQtyBeforePrice[2]);
            divideUnitIfSinglePrice(qty);
          } else {
            const prefixQtyMatch =
              leftPart.match(/^(?:[^a-zA-Z0-9]*|[a-zA-Z]\s+)?(\d{1,3}|[lI|!zZ])\s*[xX*]\s*(.+)$/) ||
              leftPart.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ].+)$/);

            if (prefixQtyMatch) {
              qty = parseQtyToken(prefixQtyMatch[1]);
              leftPart = prefixQtyMatch[2].trim();
              divideUnitIfSinglePrice(qty);
            } else if (usedTwoPrices && rightmostAmount > firstAmount && firstAmount > 0) {
              const estQty = Math.round(rightmostAmount / firstAmount);
              if (Math.abs(estQty * firstAmount - rightmostAmount) < 0.05 && estQty >= 1 && estQty <= 100) {
                qty = estQty;
              }
            } else {
              const suffixQtyMatch = leftPart.match(/^(.*?)\s+(?:[xX*](\d{1,3})|(\d{1,3})[xX*])$/);
              if (suffixQtyMatch) {
                leftPart = suffixQtyMatch[1].trim();
                qty = parseQtyToken(suffixQtyMatch[2] || suffixQtyMatch[3]);
                divideUnitIfSinglePrice(qty);
              }
            }
          }

          const cleanedName = cleanItemName(leftPart);
          if (cleanedName.length >= 2 && /[a-zA-ZÀ-ÿ]{2,}/.test(cleanedName)) {
            items.push({
              name: cleanedName,
              qty,
              price: unitPrice
            });
            pendingItemsQueue.length = 0;
            continue;
          }
        }
      }
    }

    // Jika baris ini hanya berupa nama menu (misal "Kopi Susu Gula Aren" atau "2xLatte Macchiato")
    const leadingQtyMatch = line.match(/^(?:[^a-zA-Z0-9]*|[a-zA-Z]\s+)?(\d{1,3}|[lI|!zZ])\s*[xX*]\s*(.+)$/);
    const hasQtyPrefix = Boolean(leadingQtyMatch);
    const candidateQty = leadingQtyMatch ? parseQtyToken(leadingQtyMatch[1]) : 1;
    const candidateName = cleanItemName(leadingQtyMatch ? leadingQtyMatch[2] : line);

    if (
      candidateName.length >= 3 &&
      candidateName.length <= 48 &&
      /[a-zA-ZÀ-ÿ]{3,}/.test(candidateName) &&
      !/\d{4,}/.test(candidateName)
    ) {
      // Jangan masukkan nama merchant di baris paling atas sebagai pending item
      if (merchantName && merchantName.toLowerCase().includes(candidateName.toLowerCase()) && items.length === 0 && !hasQtyPrefix) {
        continue;
      }
      if (hasQtyPrefix && pendingItemsQueue.length > 0 && pendingItemsQueue.every(p => !p.hasQtyPrefix)) {
        pendingItemsQueue.length = 0;
      }
      pendingItemsQueue.push({ name: candidateName, qty: candidateQty, hasQtyPrefix });
    }
  }

  // Fallback cerdas: jika OCR kehilangan titik desimal (misal "2xLatte Macchiato a 4.5 CHF 9")
  if (items.length === 0) {
    for (const line of lines) {
      if (IGNORE_LINE_PATTERNS.some(re => re.test(line))) continue;
      if (/^(sub\s*total|subtotal|grand\s*total|total|diskon|discount|service|pajak|pb1|ppn|tax|vat|mwst)\b/i.test(line)) continue;

      const numMatches = [...line.matchAll(/(?<!\d)(\d{1,6}(?:[.,]\d{1,3})?)(?!\d)/g)];
      if (numMatches.length === 0) continue;

      const lastNumMatch = numMatches[numMatches.length - 1];
      const textBeforeLast = line.slice(0, lastNumMatch.index).trim();
      if (!/[a-zA-ZÀ-ÿ]{3,}/.test(textBeforeLast)) continue;

      let rawVal = parseFloat(lastNumMatch[1].replace(',', '.'));
      if (Number.isNaN(rawVal) || rawVal <= 0) continue;
      let priceVal = isDecimalCurrency
        ? Math.round(rawVal * 100) / 100
        : (rawVal < 500 ? Math.round(rawVal * 1000) : Math.round(rawVal));

      let leftPart = textBeforeLast;
      let qty = 1;

      const prefixQtyMatch = leftPart.match(/^(?:[^a-zA-Z0-9]*|[a-zA-Z]\s+)?(\d{1,3}|[lI|!zZ])\s*[xX*]\s*(.+)$/);
      if (prefixQtyMatch) {
        qty = parseQtyToken(prefixQtyMatch[1]);
        leftPart = prefixQtyMatch[2].trim();
        leftPart = leftPart.replace(/\s+(?:[@àáäad&o4*xX]\s*)?\d+(?:[.,]\d+)?(?:\s*[a-zA-Z]{2,4})?\s*$/i, '').trim();
        if (qty > 1) {
          priceVal = isDecimalCurrency
            ? Math.round((priceVal / qty) * 100) / 100
            : (priceVal % qty === 0 ? Math.round(priceVal / qty) : priceVal);
        }
      }

      const cleanedName = cleanItemName(leftPart);
      if (cleanedName.length >= 2 && /[a-zA-ZÀ-ÿ]{2,}/.test(cleanedName) && checkPrice(priceVal)) {
        items.push({
          name: cleanedName,
          qty,
          price: priceVal
        });
      }
    }
  }

  return {
    merchantName,
    currency: detectedCurrency,
    items,
    fees: detectedFees,
    detectedSubtotal,
    detectedTotal
  };
}

/**
 * Menyusun ulang baris horizontal dari koordinat kata hasil OCR Tesseract
 */
function reconstructHorizontalLines(ocrData) {
  let words = [];
  if (Array.isArray(ocrData?.words) && ocrData.words.length > 0) {
    words = ocrData.words;
  } else if (Array.isArray(ocrData?.blocks)) {
    for (const block of ocrData.blocks) {
      for (const para of block?.paragraphs || []) {
        for (const line of para?.lines || []) {
          for (const word of line?.words || []) {
            words.push(word);
          }
        }
      }
    }
  }

  if (words.length === 0) {
    return '';
  }

  const validWords = words
    .filter(w => w && typeof w.text === 'string' && w.text.trim().length > 0 && w.bbox)
    .map(w => {
      const y0 = Number(w.bbox.y0) || 0;
      const y1 = Number(w.bbox.y1) || y0;
      const x0 = Number(w.bbox.x0) || 0;
      return {
        text: w.text.trim(),
        x0,
        cy: (y0 + y1) / 2,
        height: Math.max(8, y1 - y0)
      };
    });

  if (validWords.length === 0) return '';

  validWords.sort((a, b) => a.cy - b.cy);

  const rows = [];
  for (const word of validWords) {
    let matchedRow = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      const tolerance = Math.max(row.avgHeight, word.height) * 0.65;
      if (Math.abs(word.cy - row.cy) <= tolerance) {
        matchedRow = row;
        break;
      }
    }

    if (matchedRow) {
      matchedRow.words.push(word);
      const n = matchedRow.words.length;
      matchedRow.cy = (matchedRow.cy * (n - 1) + word.cy) / n;
      matchedRow.avgHeight = (matchedRow.avgHeight * (n - 1) + word.height) / n;
    } else {
      rows.push({
        cy: word.cy,
        avgHeight: word.height,
        words: [word]
      });
    }
  }

  rows.sort((a, b) => a.cy - b.cy);
  return rows
    .map(row => {
      row.words.sort((a, b) => a.x0 - b.x0);
      return row.words.map(w => w.text).join(' ');
    })
    .join('\n');
}

/**
 * Mendeteksi koordinat kotak kertas struk pada gambar/frame video (untuk kotak deteksi biru & auto-crop)
 */
export function detectPaperBounds(srcData, fullW, fullH) {
  const gridStep = Math.max(2, Math.floor(Math.min(fullW, fullH) / 160));
  const rowPaperCounts = new Int32Array(fullH);
  const colPaperCounts = new Int32Array(fullW);
  let sampledCols = 0;
  let sampledRows = 0;

  for (let y = 0; y < fullH; y += gridStep) {
    sampledRows++;
    for (let x = 0; x < fullW; x += gridStep) {
      if (y === 0) sampledCols++;
      const idx = (y * fullW + x) * 4;
      const r = srcData[idx];
      const g = srcData[idx + 1];
      const b = srcData[idx + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = maxC - minC;
      // Kertas struk terang (lum > 140) dan bersaturasi rendah
      if (lum > 140 && sat < 68) {
        rowPaperCounts[y]++;
        colPaperCounts[x]++;
      }
    }
  }

  const minRowThreshold = Math.max(3, Math.floor(sampledCols * 0.26));
  const minColThreshold = Math.max(3, Math.floor(sampledRows * 0.26));

  let topY = 0;
  let bottomY = fullH - 1;
  let leftX = 0;
  let rightX = fullW - 1;

  while (topY < fullH && rowPaperCounts[topY] < minRowThreshold) topY += gridStep;
  while (bottomY > topY && rowPaperCounts[bottomY] < minRowThreshold) bottomY -= gridStep;
  while (leftX < fullW && colPaperCounts[leftX] < minColThreshold) leftX += gridStep;
  while (rightX > leftX && colPaperCounts[rightX] < minColThreshold) rightX -= gridStep;

  const cropW = rightX - leftX;
  const cropH = bottomY - topY;
  const isValid = cropW > fullW * 0.28 && cropH > fullH * 0.32 && (cropW < fullW * 0.96 || cropH < fullH * 0.96);

  if (!isValid) {
    const fallbackPadX = Math.round(fullW * 0.08);
    const fallbackPadY = Math.round(fullH * 0.06);
    return {
      detected: false,
      x: fallbackPadX,
      y: fallbackPadY,
      width: fullW - fallbackPadX * 2,
      height: fullH - fallbackPadY * 2
    };
  }

  const padX = Math.round(cropW * 0.02);
  const padY = Math.round(cropH * 0.02);
  const sx = Math.max(0, leftX - padX);
  const sy = Math.max(0, topY - padY);
  const sw = Math.min(fullW - sx, cropW + padX * 2);
  const sh = Math.min(fullH - sy, cropH + padY * 2);

  return {
    detected: true,
    x: sx,
    y: sy,
    width: sw,
    height: sh
  };
}

/**
 * Menggambar kotak deteksi biru ("biru-biru ke-detect") di sekeliling struk
 */
export function drawBlueScannerOverlay(ctx, bounds, canvasW, canvasH) {
  if (!ctx || !bounds) return;
  ctx.clearRect(0, 0, canvasW, canvasH);

  const { x, y, width: w, height: h } = bounds;

  // Fill biru transparan lembut di atas area struk yang terdeteksi
  ctx.fillStyle = 'rgba(14, 165, 233, 0.16)';
  ctx.fillRect(x, y, w, h);

  // Garis tepi biru menyala
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = Math.max(2, Math.round(Math.min(canvasW, canvasH) * 0.005));
  ctx.strokeRect(x, y, w, h);

  // Siku sudut biru tebal (corner brackets)
  const cornerLen = Math.max(16, Math.round(Math.min(w, h) * 0.09));
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = Math.max(4, Math.round(Math.min(canvasW, canvasH) * 0.01));
  ctx.lineCap = 'round';

  // Kiri Atas
  ctx.beginPath();
  ctx.moveTo(x, y + cornerLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cornerLen, y);
  ctx.stroke();

  // Kanan Atas
  ctx.beginPath();
  ctx.moveTo(x + w - cornerLen, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + cornerLen);
  ctx.stroke();

  // Kiri Bawah
  ctx.beginPath();
  ctx.moveTo(x, y + h - cornerLen);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + cornerLen, y + h);
  ctx.stroke();

  // Kanan Bawah
  ctx.beginPath();
  ctx.moveTo(x + w - cornerLen, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - cornerLen);
  ctx.stroke();
}

/**
 * Preprocessing gambar struk:
 * - Mendeteksi area kertas struk dan menggambar overlay deteksi biru pada pratinjau
 * - Memotong (auto-crop) area struk secara natural serta menghasilkan variasi contrast enhancement
 *   agar karakter teks struk thermal/pudar terbaca dengan sangat tajam dan presisi tinggi oleh OCR
 */
export async function preprocessReceiptImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const MAX_DIM = 2200;
        let fullW = img.naturalWidth || img.width;
        let fullH = img.naturalHeight || img.height;

        if (fullW > MAX_DIM || fullH > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / fullW, MAX_DIM / fullH);
          fullW = Math.round(fullW * ratio);
          fullH = Math.round(fullH * ratio);
        }

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = fullW;
        srcCanvas.height = fullH;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(img, 0, 0, fullW, fullH);
        URL.revokeObjectURL(url);

        const srcData = srcCtx.getImageData(0, 0, fullW, fullH).data;
        const bounds = detectPaperBounds(srcData, fullW, fullH);

        // Buat gambar preview dengan highlight biru deteksi struk
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = fullW;
        previewCanvas.height = fullH;
        const previewCtx = previewCanvas.getContext('2d');
        previewCtx.drawImage(srcCanvas, 0, 0);

        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = fullW;
        overlayCanvas.height = fullH;
        drawBlueScannerOverlay(overlayCanvas.getContext('2d'), bounds, fullW, fullH);
        previewCtx.drawImage(overlayCanvas, 0, 0);

        const detectedPreviewDataUrl = previewCanvas.toDataURL('image/jpeg', 0.88);

        // Perbesar crop struk (upscale) agar teks kecil tetap tajam saat dibaca OCR
        const upScale = Math.min(2.5, Math.max(1, 1500 / Math.max(1, bounds.width)));
        const outW = Math.round(bounds.width * upScale);
        const outH = Math.round(bounds.height * upScale);

        const ocrCanvas = document.createElement('canvas');
        ocrCanvas.width = outW;
        ocrCanvas.height = outH;
        const ocrCtx = ocrCanvas.getContext('2d');
        ocrCtx.imageSmoothingEnabled = true;
        ocrCtx.imageSmoothingQuality = 'high';
        ocrCtx.drawImage(srcCanvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, outW, outH);

        // Varian grayscale dengan auto-levels berbasis persentil (menormalkan struk thermal pudar / pencahayaan miring)
        const enhancedCanvas = document.createElement('canvas');
        enhancedCanvas.width = outW;
        enhancedCanvas.height = outH;
        const enhCtx = enhancedCanvas.getContext('2d');
        enhCtx.drawImage(ocrCanvas, 0, 0);

        const imgData = enhCtx.getImageData(0, 0, outW, outH);
        const d = imgData.data;
        const hist = new Uint32Array(256);
        for (let i = 0; i < d.length; i += 4) {
          const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          d[i] = d[i + 1] = d[i + 2] = lum;
          hist[lum]++;
        }
        const totalPx = d.length / 4;
        let acc = 0;
        let lo = 0;
        let hi = 255;
        for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= totalPx * 0.02) { lo = v; break; } }
        acc = 0;
        for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= totalPx * 0.4) { hi = v; break; } }
        if (hi - lo < 40) { lo = Math.max(0, lo - 20); hi = Math.min(255, lo + 120); }
        const range = Math.max(1, hi - lo);
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.min(255, Math.max(0, ((d[i] - lo) / range) * 255));
          d[i] = d[i + 1] = d[i + 2] = v;
        }
        enhCtx.putImageData(imgData, 0, 0);

        ocrCanvas.toBlob((ocrBlob) => {
          enhancedCanvas.toBlob((enhancedBlob) => {
            resolve({
              ocrBlob: ocrBlob || file,
              enhancedBlob: enhancedBlob || ocrBlob || file,
              detectedPreviewDataUrl
            });
          }, 'image/png');
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        resolve({
          ocrBlob: file,
          enhancedBlob: file,
          detectedPreviewDataUrl: ''
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('File gambar rusak atau tidak dapat dibaca.'));
    };

    img.src = url;
  });
}

let tesseractLoadPromise = null;

function ensureTesseractLoaded(onProgress) {
  if (window.Tesseract) {
    return Promise.resolve(window.Tesseract);
  }
  if (tesseractLoadPromise) {
    return tesseractLoadPromise;
  }

  if (onProgress) onProgress({ status: 'Menyiapkan mesin pemindai struk...', progress: 0.1 });

  tesseractLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else reject(new Error('Tesseract gagal diinisialisasi.'));
    };
    script.onerror = () => {
      tesseractLoadPromise = null;
      reject(new Error('Gagal mengunduh komponen OCR. Pastikan koneksi internet aktif atau gunakan tab Tempel Teks.'));
    };
    document.head.appendChild(script);
  });

  return tesseractLoadPromise;
}

/**
 * Menjalankan OCR akurat pada file gambar struk dan mem-parsing hasilnya
 */
export async function scanReceiptImage(file, onProgress) {
  const fileCheck = validateReceiptFile(file);
  if (!fileCheck.valid) {
    throw new Error(fileCheck.message);
  }

  if (onProgress) onProgress({ status: 'Mendeteksi area struk...', progress: 0.15 });
  const { ocrBlob, enhancedBlob, detectedPreviewDataUrl } = await preprocessReceiptImage(file);

  const Tesseract = await ensureTesseractLoaded(onProgress);

  if (onProgress) onProgress({ status: 'Memindai merchant, mata uang & menu...', progress: 0.25, detectedPreviewDataUrl });

  let passIndex = 0;
  let totalPasses = 4;
  const loggerFn = (m) => {
    if (m && m.status === 'recognizing text' && typeof m.progress === 'number') {
      const overall = 0.25 + ((passIndex + m.progress) / totalPasses) * 0.7;
      if (onProgress) {
        onProgress({
          status: `Memindai struk (${Math.round(overall * 100)}%)...`,
          progress: overall,
          detectedPreviewDataUrl
        });
      }
    }
  };

  let worker = null;
  try {
    if (typeof Tesseract.createWorker === 'function') {
      worker = await Tesseract.createWorker('eng+ind', 1, { logger: loggerFn });
    }
  } catch (e) {
    worker = null;
  }

  const recognize = async (blobToScan, psm) => {
    if (worker) {
      await worker.setParameters({
        tessedit_pageseg_mode: String(psm),
        preserve_interword_spaces: '1',
        user_defined_dpi: '300'
      });
      return worker.recognize(blobToScan);
    }
    return Tesseract.recognize(blobToScan, 'eng+ind', { logger: loggerFn });
  };

  // Skor kandidat hasil OCR: jumlah menu valid + kecocokan total item dengan subtotal/total struk
  const scoreCandidate = (cand) => {
    const items = cand.parsed.items || [];
    if (items.length === 0) return 0;
    let score = items.length * 10;
    const sum = items.reduce((acc, it) => acc + (it.price || 0) * (it.qty || 1), 0);
    const refs = [cand.parsed.detectedSubtotal, cand.parsed.detectedTotal].filter(v => v > 0);
    if (refs.some(ref => Math.abs(sum - ref) / ref < 0.02)) score += 60;
    else if (refs.some(ref => sum <= ref * 1.3 && sum >= ref * 0.7)) score += 15;
    if (cand.parsed.merchantName) score += 4;
    if (RECEIPT_KEYWORDS_REGEX.test(cand.text)) score += 6;
    return score;
  };

  const buildCandidate = (ocrResult) => {
    const raw = ocrResult?.data?.text || '';
    const rows = reconstructHorizontalLines(ocrResult?.data);
    const pRows = rows ? parseReceiptText(rows) : { items: [] };
    const pRaw = parseReceiptText(raw);
    const useRows = (pRows.items?.length || 0) >= (pRaw.items?.length || 0) && rows;
    const cand = {
      raw,
      rows,
      parsed: useRows ? pRows : pRaw,
      text: useRows ? rows : raw
    };
    cand.score = scoreCandidate(cand);
    return cand;
  };

  const plan = [
    { blob: ocrBlob, psm: 6 },
    { blob: enhancedBlob || ocrBlob, psm: 6 },
    { blob: enhancedBlob || ocrBlob, psm: 4 },
    { blob: file, psm: 3 }
  ];
  totalPasses = plan.length;

  let best = null;
  try {
    for (let i = 0; i < plan.length; i++) {
      passIndex = i;
      const cand = buildCandidate(await recognize(plan[i].blob, plan[i].psm));
      if (!best || cand.score > best.score) best = cand;
      // Berhenti lebih awal jika hasil sudah sangat meyakinkan (total cocok dengan jumlah item)
      if (best.score >= 70) break;
      if (i >= 1 && best.score >= 30 && (best.parsed.items?.length || 0) >= 3) break;
    }
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch (e) { /* abaikan */ }
    }
  }

  const parsed = best.parsed;
  const effectiveText = best.text;

  if (!parsed.merchantName) {
    parsed.merchantName = extractMerchantName(best.raw) || extractMerchantName(best.rows) || '';
  }

  if (onProgress) onProgress({ status: 'Memvalidasi hasil pindaian struk...', progress: 0.97, detectedPreviewDataUrl });

  const contentCheck = validateReceiptContent(effectiveText, parsed, true);
  if (!contentCheck.valid) {
    throw new Error(contentCheck.message);
  }

  return {
    rawText: effectiveText,
    parsed,
    detectedPreviewDataUrl
  };
}
