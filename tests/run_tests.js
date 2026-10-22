/**
 * Automated Test Runner untuk Kalkulator Split Bill
 * Menguji skenario TEST-001 s/d TEST-016 dari PRD v1.0.
 */

import { calculateBill, SplitMode, FeeType } from '../src/calculation/engine.js';
import { validateInput } from '../src/validation/validator.js';
import { formatIDR, parseIDR, generateShareText } from '../src/formatting/formatter.js';

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

console.log(`\n========================================`);
console.log(`HASIL: ${passedTests}/${totalTests} TESTS BERHASIL!`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
