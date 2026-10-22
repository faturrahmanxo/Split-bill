# 🧾 SplitBill.id — Kalkulator Patungan & Pajak Restoran

> Aplikasi web kalkulator patungan makan (*Split Bill & Tax Calculator*) yang cepat, presisi, transparan, dan tanpa friksi. Mendukung bagi rata dan per pesanan, hitung otomatis Pajak PB1 10%, Service Charge, Diskon, dan Tip dengan pembulatan presisi.

---

## 🌟 Fitur Utama

- **Mode Bagi Rata (Equal Split):** Bagi total tagihan bersama secara instan ke sejumlah orang dengan penyesuaian biaya tambahan.
- **Mode Berdasarkan Pesanan (Itemized Split):** Tambah daftar pesanan, tentukan harga, kuantitas, dan pilih siapa saja yang memesan/patungan menu tersebut.
- **Biaya & Pajak Restoran Fleksibel:** Mendukung Pajak Restoran (PB1 10% / PPN 11%), Service Charge, Diskon Promosi, dan Tip baik dalam format **Persen (%)** maupun **Nominal (Rp)**.
- **Deterministic Rounding (Anti Floating-Point):** Total akumulasi bagian tiap orang dijamin **100% pas** dengan total tagihan, tanpa ada selisih Rp1 pun yang hilang.
- **100% Sisi Klien & Privasi Terjaga:** Tidak membutuhkan login atau backend database. Semua data diproses langsung di browser pengguna.
- **Salin & Bagikan Instan:** Dilengkapi tombol salin teks rapi (format WhatsApp friendly) dan integrasi Web Share API.
- **Tampilan Modern & Responsif:** Menggunakan tema *Amethyst Violet* modern, full-width responsive dashboard untuk desktop, dan navigasi ramah mobile.
- **Smooth Preloader:** Animasi loading halus dengan logo berkilau (*pulsing glow & scan lines*).

---

## 🚀 Panduan Menjalankan Secara Lokal

1. **Clone repository:**
   ```bash
   git clone https://github.com/USERNAME/split-bill.git
   cd split-bill
   ```

2. **Jalankan server lokal:**
   ```bash
   node server.js
   ```
   Buka browser di `http://localhost:3456`.

3. **Menjalankan Automated Tests:**
   ```bash
   node tests/run_tests.js
   ```

---

## ☁️ Panduan Deploy ke Vercel

### Metode 1: Hubungkan dengan GitHub (Direkomendasikan)
1. Push repository ini ke akun GitHub Anda.
2. Buka dashboard [Vercel](https://vercel.com).
3. Klik **"Add New..."** lalu pilih **"Project"**.
4. Import repository `split-bill` Anda.
5. Pada bagian *Framework Preset*, pilih **Other** (atau biarkan default static).
6. Klik **"Deploy"**. Webapp akan langsung online dalam waktu beberapa detik!

### Metode 2: Menggunakan Vercel CLI
```bash
npx vercel
```
Ikuti instruksi login dan konfirmasi di terminal untuk deploy instan.

---

## 📄 Lisensi & Hak Cipta

© 2026 FTR.dev | Built with clean code.  
*SplitBill.id Pro Utility • Pemrosesan 100% Sisi Klien*
