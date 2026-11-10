/**
 * Automated Test Runner untuk Kalkulator Split Bill
 * Menguji skenario TEST-001 s/d TEST-016 dari PRD v1.0.
 */

import { calculateBill, SplitMode, FeeType } from '../src/calculation/engine.js';
import { validateInput } from '../src/validation/validator.js';
import { formatIDR, parseIDR, generateShareText } from '../src/formatting/formatter.js';
import {
  parseReceiptText,
  extractMerchantName,
  detectReceiptCurrency,
  validateReceiptFile,
  validateReceiptContent
} from '../src/scanner/receiptScanner.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Detail: ${details}`);
  }
}

console.log('\n🚀 MENJALANKAN TEST SUITE KALKULATOR SPLIT BILL...\n');

// ==========================================
// TEST-001: Bagi Rata Tanpa Biaya Tambahan
// ==========================================
console.log('📌 Skenario 1: TEST-001 (Bagi Rata Tanpa Biaya)');
{
  const input = {
    mode: SplitMode.EQUAL,
    subtotal: 120000,
    participants: [{ id: 'p1', name: 'Peserta A' }, { id: 'p2', name: 'Peserta B' }],
    fees: {}
  };
  const res = calculateBill(input);
  assert(res.finalTotal === 120000, 'Total akhir Rp 120.000');
  assert(res.participantResults.length === 2, '2 Peserta');
  assert(res.participantResults[0].finalAmount === 60000, 'Peserta A Rp 60.000');
  assert(res.participantResults[1].finalAmount === 60000, 'Peserta B Rp 60.000');
  const sum = res.participantResults.reduce((a, c) => a + c.finalAmount, 0);
  assert(sum === res.finalTotal, 'Total bagian == Total akhir (120.000)');
}

// ==========================================
// TEST-002: Bagi Rata dengan Sisa Pembulatan (Rp 100.000 / 3)
// ==========================================
console.log('\n📌 Skenario 2: TEST-002 (Bagi Rata Rounding Rp 100.000 / 3)');
{
  const input = {
    mode: SplitMode.EQUAL,
    subtotal: 100000,
    participants: [
      { id: 'p1', name: 'Peserta A' },
      { id: 'p2', name: 'Peserta B' },
      { id: 'p3', name: 'Peserta C' }
    ],
    fees: {}
  };
  const res = calculateBill(input);
  assert(res.finalTotal === 100000, 'Total Rp 100.000');
  const amounts = res.participantResults.map(p => p.finalAmount);
  assert(amounts.includes(33334) && amounts.includes(33333), 'Ada pembagian Rp 33.334 dan Rp 33.333');
  const sum = amounts.reduce((a, c) => a + c, 0);
  assert(sum === 100000, 'Jumlah tepat Rp 100.000 tanpa selisih!');
}

// ==========================================
// TEST-003: Berdasarkan Pesanan (Itemized)
// ==========================================
console.log('\n📌 Skenario 3: TEST-003 (Berdasarkan Pesanan)');
{
  const input = {
    mode: SplitMode.ITEMIZED,
    participants: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }],
    items: [
      { id: 'i1', name: 'Item 1', price: 40000, qty: 1, participantIds: ['p1'] },
      { id: 'i2', name: 'Item 2', price: 60000, qty: 1, participantIds: ['p2'] }
    ],
    fees: {}
  };
  const res = calculateBill(input);
  assert(res.subtotal === 100000, 'Subtotal Rp 100.000');
  assert(res.participantResults.find(p => p.id === 'p1').finalAmount === 40000, 'Peserta A bayar Rp 40.000');
  assert(res.participantResults.find(p => p.id === 'p2').finalAmount === 60000, 'Peserta B bayar Rp 60.000');
}

// ==========================================
// TEST-004: Diskon, Pajak PB1, Service Charge
// ==========================================
console.log('\n📌 Skenario 4: TEST-004 (Diskon 10% + Service 5% + Pajak 10%)');
{
  // Subtotal: 200.000
  // Diskon 10% = 20.000 -> S_net = 180.000
  // Service 5% dari 180.000 = 9.000
  // Tax 10% dari (180.000 + 9.000 = 189.000) = 18.900
  // Total = 180.000 + 9.000 + 18.900 = 207.900
  const input = {
    mode: SplitMode.EQUAL,
    subtotal: 200000,
    participants: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }],
    fees: {
      discount: { type: FeeType.PERCENT, value: 10 },
      service: { type: FeeType.PERCENT, value: 5 },
      tax: { type: FeeType.PERCENT, value: 10 }
    }
  };
  const res = calculateBill(input);
  assert(res.discountAmount === 20000, 'Diskon Rp 20.000');
  assert(res.serviceAmount === 9000, 'Service Charge Rp 9.000');
  assert(res.taxAmount === 18900, 'Pajak Restoran PB1 Rp 18.900');
  assert(res.finalTotal === 207900, 'Total Akhir Rp 207.900');
  const sum = res.participantResults.reduce((a, c) => a + c.finalAmount, 0);
  assert(sum === 207900, 'Total akumulasi peserta tepat Rp 207.900');
}

// ==========================================
// TEST-005: Formatter & Parser Rupiah
// ==========================================
console.log('\n📌 Skenario 5: Formatter & Parser IDR');
{
  assert(formatIDR(150000) === 'Rp 150.000', 'formatIDR(150000) -> "Rp 150.000"');
  assert(parseIDR('Rp 150.000') === 150000, 'parseIDR("Rp 150.000") -> 150000');
  assert(parseIDR('2.500.000') === 2500000, 'parseIDR("2.500.000") -> 2500000');
}

// ==========================================
// TEST-006: Validasi Edge Cases
// ==========================================
console.log('\n📌 Skenario 6: Validasi Edge Cases');
{
  const invalidSession = {
    mode: 'EQUAL',
    subtotal: -5000,
    participants: []
  };
  const v = validateInput(invalidSession);
  assert(!v.isValid, 'Menolak subtotal negatif dan 0 peserta');
  assert(v.errors.some(e => e.field === 'participants'), 'Error peserta terdeteksi');
  assert(v.errors.some(e => e.field === 'subtotal'), 'Error subtotal terdeteksi');
}

// ==========================================
// TEST-007: Opsi Pembulatan Praktis (100 & 1000)
// ==========================================
console.log('\n📌 Skenario 7: Opsi Pembulatan Praktis (Ratusan & Ribuan)');
{
  const inputEqual = {
    mode: SplitMode.EQUAL,
    subtotal: 100000,
    participants: [
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
      { id: 'p3', name: 'C' }
    ],
    fees: {},
    roundingStep: 100
  };
  const res100 = calculateBill(inputEqual);
  assert(res100.participantResults.every(p => p.finalAmount === 33300), 'Masing-masing dibulatkan ke Rp 33.300');
  assert(res100.roundingDifference === -100, 'Selisih pembulatan -Rp 100');

  const input1000 = {
    ...inputEqual,
    roundingStep: 1000
  };
  const res1000 = calculateBill(input1000);
  assert(res1000.participantResults.every(p => p.finalAmount === 33000), 'Masing-masing dibulatkan ke Rp 33.000');
  assert(res1000.roundingDifference === -1000, 'Selisih pembulatan -Rp 1.000');
}

// ==========================================
// TEST-008: Format Teks WhatsApp yang Jelas
// ==========================================
console.log('\n📌 Skenario 8: Kejelasan Teks WhatsApp');
{
  const input = {
    mode: SplitMode.ITEMIZED,
    participants: [{ id: 'p1', name: 'Budi' }],
    items: [{ id: 'i1', name: 'Nasi Goreng', price: 25000, qty: 1, participantIds: ['p1'] }],
    fees: {}
  };
  const res = calculateBill(input);
  const text = generateShareText(res, input);
  assert(text.includes('RINCIAN YANG HARUS DIBAYAR:'), 'Header rincian jelas');
  assert(text.includes('Total Bayar'), 'Label Total Bayar per orang tertera');
  assert(text.includes('TOTAL BERSIH'), 'Penjelasan total bersih tertera');
  assert(text.includes('RINGKASAN STRUK:'), 'Header ringkasan struk jelas');
}

// ==========================================
// TEST-009: Smart Receipt Parser (Single-Line & Multi-Line POS)
// ==========================================
console.log('\n📌 Skenario 9: Smart Receipt Parser (Scan Struk, Merchant & Mata Uang)');
{
  const restoSampleText = `RESTO NUSANTARA RASA
Jl. Sudirman No. 45, Jakarta
--------------------------------
2x Nasi Goreng Spesial   70.000
1x Ayam Bakar Madu       45.000
1x Gurame Asam Manis     85.000
2x Sate Ayam Madura      60.000
3x Nasi Putih            24.000
2x Es Teh Manis          16.000
2x Es Jeruk Peras        28.000
1x Pisang Goreng Keju    22.000
--------------------------------
Subtotal                350.000
Diskon Promo 10%        -35.000
Service 5%               15.750
PB1 10%                  33.075
Total Bayar             363.825`;

  const coffeeSampleText = `KOPI SENJA ROASTERY
Kasir: Andi • Meja 12
--------------------------------
Kopi Susu Gula Aren
3 x 24.000               72.000
Matcha Latte Iced
2 x 28.000               56.000
Americano Hot
1 x 20.000               20.000
Croissant Almond
2 x 25.000               50.000
French Fries Truffle
1 x 32.000               32.000
Churros Cinnamon
1 x 26.000               26.000
--------------------------------
Subtotal                256.000
Service Charge 5%        12.800
Pajak PB1 10%            26.880
Grand Total             295.680`;

  const parsedResto = parseReceiptText(restoSampleText);
  assert(parsedResto.merchantName === 'RESTO NUSANTARA RASA', 'Merchant RESTO NUSANTARA RASA terdeteksi tanpa alamat');
  assert(parsedResto.currency === 'IDR', 'Mata uang default struk Indonesia adalah IDR');
  assert(parsedResto.items.length === 8, 'Struk Resto mendeteksi tepat 8 menu');
  assert(parsedResto.items[0].name === 'Nasi Goreng Spesial', 'Item 1 bernama Nasi Goreng Spesial');
  assert(parsedResto.items[0].qty === 2 && parsedResto.items[0].price === 35000, '2x Nasi Goreng Spesial total 70.000 -> harga satuan Rp 35.000');
  assert(parsedResto.fees.discount?.value === 10 && parsedResto.fees.discount?.type === FeeType.PERCENT, 'Diskon 10% terdeteksi otomatis');
  assert(parsedResto.fees.service?.value === 5 && parsedResto.fees.service?.type === FeeType.PERCENT, 'Service 5% terdeteksi otomatis');
  assert(parsedResto.fees.tax?.value === 10 && parsedResto.fees.tax?.type === FeeType.PERCENT, 'Pajak PB1 10% terdeteksi otomatis');

  const parsedCoffee = parseReceiptText(coffeeSampleText);
  assert(parsedCoffee.merchantName === 'KOPI SENJA ROASTERY', 'Merchant KOPI SENJA ROASTERY terdeteksi');
  assert(parsedCoffee.items.length === 6, 'Struk Kopi format 2-baris mendeteksi tepat 6 menu');
  assert(parsedCoffee.items[0].name === 'Kopi Susu Gula Aren', 'Item 1 Kopi Susu Gula Aren terdeteksi');
  assert(parsedCoffee.items[0].qty === 3 && parsedCoffee.items[0].price === 24000, '3 x 24.000 terdeteksi qty 3 & harga satuan Rp 24.000');

  // Uji validasi tolak PDF
  const pdfCheck = validateReceiptFile({ name: 'tagihan.pdf', type: 'application/pdf', size: 102400 });
  assert(!pdfCheck.valid && pdfCheck.message.includes('PDF'), 'Menolak file PDF dengan pesan validasi jelas');

  // Uji validasi gambar valid
  const imgCheck = validateReceiptFile({ name: 'struk.jpg', type: 'image/jpeg', size: 204800 });
  assert(imgCheck.valid, 'Menerima file gambar struk JPG');

  // Uji validasi konten bukan struk
  const randomText = 'Halo selamat pagi ini bukan struk belanja';
  const randomParsed = parseReceiptText(randomText);
  const contentCheckFail = validateReceiptContent(randomText, randomParsed, true);
  assert(!contentCheckFail.valid, 'Menolak gambar/teks yang bukan struk pesanan');

  // Uji validasi konten struk asli
  const contentCheckPass = validateReceiptContent(restoSampleText, parsedResto, true);
  assert(contentCheckPass.valid, 'Menerima konten struk pesanan yang valid');

  // Uji struk desimal / internasional (Berghotel Grosse Scheidegg dalam CHF)
  const berghotelReceipt = `Berghotel
Grosse Scheidegg
3818 Grindelwald
Familie R. Müller
Rech.Nr. 4572 30.07.2007/13:29:17
Bar Tisch 7/01
2xLatte Macchiato à 4.50 CHF 9.00
1xGloki à 5.00 CHF 5.00
1xSchweinschnitzel à 22.00 CHF 22.00
1xChässpätzli à 18.50 CHF 18.50
Total : CHF 54.50
Incl. 7.6% MwSt 54.50 CHF: 3.85
Entspricht in Euro 36.33 EUR
Es bediente Sie: Ursula
MwSt Nr.: 430 234
Tel.: 033 853 67 16
Fax.: 033 853 67 19
E-mail: grossescheidegg@bluewin.ch`;
  const parsedBerghotel = parseReceiptText(berghotelReceipt);
  const checkBerghotel = validateReceiptContent(berghotelReceipt, parsedBerghotel, true);
  assert(checkBerghotel.valid && parsedBerghotel.items.length === 4, 'Struk Berghotel (format desimal & mata uang CHF) terdeteksi tepat 4 menu');
  assert(parsedBerghotel.merchantName === 'Berghotel Grosse Scheidegg', `Merchant Berghotel Grosse Scheidegg terdeteksi (dapat: "${parsedBerghotel.merchantName}")`);
  assert(parsedBerghotel.currency === 'CHF', `Mata uang CHF terdeteksi otomatis (dapat: "${parsedBerghotel.currency}")`);
  assert(parsedBerghotel.items[0].name === 'Latte Macchiato' && parsedBerghotel.items[0].qty === 2 && parsedBerghotel.items[0].price === 4.5, '2xLatte Macchiato à 4.50 CHF 9.00 terdeteksi harga satuan 4.50 CHF');
  assert(parsedBerghotel.items[3].price === 18.5, '1xChässpätzli terdeteksi harga satuan 18.50 CHF');

  // Uji perhitungan engine pada mata uang desimal (CHF)
  const calcChf = calculateBill({
    mode: SplitMode.ITEMIZED,
    currency: 'CHF',
    participants: [{ id: 'p1', name: 'Budi' }, { id: 'p2', name: 'Siti' }],
    items: parsedBerghotel.items.map((it, idx) => ({
      id: `i_${idx}`,
      name: it.name,
      price: it.price,
      qty: it.qty,
      participantIds: ['p1', 'p2']
    })),
    fees: {}
  });
  assert(calcChf.finalTotal === 54.5, `Total perhitungan CHF tepat 54.50 CHF (dapat: ${calcChf.finalTotal})`);
  assert(calcChf.participantResults[0].finalAmount === 27.25 && calcChf.participantResults[1].finalAmount === 27.25, 'Bagi 2 dari 54.50 CHF tepat masing-masing 27.25 CHF');

  // Uji struk saat OCR memisahkan kolom kiri (nama menu) & kolom kanan (harga) + noise pinggiran
  const splitColumnOcrReceipt = `Berqhotel
Grosse Scheidegg
2xLatte Macchiato
IxGloki
lxSchweinschnitzel
1xChässpätzli
à 4. 50 CHE 9.OO |
a 5.00 CHF 5.00 |
à 22.00 CHF 22.00 .
à 18.50 CHF 18.50 |
Total : CHF 54.50`;
  const parsedSplitCol = parseReceiptText(splitColumnOcrReceipt);
  assert(parsedSplitCol.items.length === 4, 'Struk dengan kolom terpisah oleh OCR tetap mendeteksi tepat 4 menu');
  assert(parsedSplitCol.merchantName === 'Berghotel Grosse Scheidegg', 'Koreksi OCR Berqhotel -> Berghotel Grosse Scheidegg berhasil');
  assert(parsedSplitCol.items[1].name === 'Gloki' && parsedSplitCol.items[1].qty === 1 && parsedSplitCol.items[1].price === 5, 'Pasangan antrean kolom nama & harga presisi (5.00 CHF)');
}



console.log(`\n========================================`);
console.log(`HASIL: ${passedTests}/${totalTests} TESTS BERHASIL!`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}

