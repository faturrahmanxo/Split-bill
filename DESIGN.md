# 04 — DESIGN.md: Desain Sistem & Arsitektur UI/UX Kalkulator Split Bill

**Proyek:** Kalkulator Split Bill & Pajak  
**Versi:** v1.0 (Draft Gate G2)  
**Dokumen Terkait:** [blueprint.md](blueprint.md), [prd.md](prd.md), [sdlc.md](sdlc.md)  
**Target Platform:** Mobile-First Responsive Web (PWA-ready)

---

## 1. Filosofi & Arah Visual

Aplikasi dirancang dengan estetika **Fintech Modern & Premium**:
* **Kesan Utama:** Cepat, presisi, transparan, dan memuaskan saat disentuh (*tactile & intuitive*).
* **Nuansa Visual:** Modern Clean dengan sentuhan Glassmorphism lembut, rounded corners elegan (bento-box layout), kontras tajam untuk angka keuangan, serta micro-animation halus saat kalkulasi berubah.
* **Dual Theme:** Mendukung Dark Mode (default: *Sleek Midnight Slate*) dan Light Mode (*Crisp Clean Studio*) dengan transisi halus.

---

## 2. Design Tokens & Sistem Warna

### 2.1 Palet Warna (Theme Tokens)

| Token Name | Dark Theme (Default) | Light Theme | Penggunaan |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#0B0F17` (Deep Obsidian) | `#F8FAFC` (Slate Cool) | Background utama aplikasi |
| `--bg-surface` | `#131B2A` (Surface Navy) | `#FFFFFF` (Pure White) | Container kartu / section |
| `--bg-surface-elevated`| `#1A2438` (Elevated Layer)| `#F1F5F9` (Muted Slate) | Input field, dropdown, dialog |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | `rgba(0, 0, 0, 0.08)` | Divider & outline kartu |
| `--border-focus` | `#38BDF8` (Cyan Neon) | `#0284C7` (Sky Primary) | Garis aktif saat input aktif |
| `--primary` | `#10B981` (Emerald Pay) | `#059669` (Forest Mint) | Aksi utama, total bayar, sukses |
| `--primary-glow` | `rgba(16, 185, 129, 0.25)` | `rgba(5, 150, 105, 0.15)` | Shadow aksen kartu hasil |
| `--accent-indigo` | `#6366F1` (Indigo Smart) | `#4F46E5` (Deep Indigo) | Switcher mode, badge peserta |
| `--accent-amber` | `#F59E0B` (Amber Tax) | `#D97706` (Warm Ochre) | Badge Pajak & Service Charge |
| `--accent-rose` | `#F43F5E` (Rose Discount) | `#E11D48` (Crimson) | Badge Diskon, tombol hapus |
| `--text-primary` | `#F8FAFC` (High Contrast) | `#0F172A` (Charcoal) | Nilai nominal, judul, hasil |
| `--text-secondary` | `#94A3B8` (Muted) | `#64748B` (Cool Gray) | Label, subtitle, keterangan |
| `--text-tertiary` | `#64748B` (Dim) | `#94A3B8` (Light Slate) | Placeholder, footnote |

### 2.2 Tipografi
* **Font Family:** `Plus Jakarta Sans` / `Inter`, sans-serif (Google Fonts) – geometris, sangat mudah dibaca pada angka dan nominal.
* **Font Monospace untuk Angka (Tabular Figures):** `font-variant-numeric: tabular-nums;` agar angka tidak bergeser saat input berubah secara live.
* **Skala Tipografi:**
  * `Heading 1 (Hero Total)`: 32px / 38px, Font-weight: 800 (Extra Bold)
  * `Heading 2 (Card Title)`: 18px / 24px, Font-weight: 700 (Bold)
  * `Heading 3 (Sub-header)`: 15px / 20px, Font-weight: 600 (Semi Bold)
  * `Body Text`: 14px / 20px, Font-weight: 400 (Regular)
  * `Caption / Badges`: 12px / 16px, Font-weight: 500 (Medium)
  * `Micro Note`: 11px / 14px, Font-weight: 400 (Regular)

### 2.3 Radius & Elevasi
* **Radius:** Small (`6px`), Medium (`12px` - input/tombol), Large (`18px` - card/bento container), Full (`9999px` - chips/pill badges).
* **Shadow:**
  * Soft: `0 4px 20px -2px rgba(0, 0, 0, 0.35)`
  * Glow Accent: `0 0 25px -5px var(--primary-glow)`

---

## 3. Arsitektur Informasi & Screen Inventory (Mobile-First)

Aplikasi dibangun dalam tata letak **Single Page Application (SPA)** yang terbagi dalam modular sections yang dinamis:

```
+-----------------------------------------------------------+
| [Header] Brand "SplitBill.id" | Theme Toggle | Reset      |
+-----------------------------------------------------------+
| [SCR-001] Segmented Control: [ Bagi Rata ] [ Per Pesanan ]|
+-----------------------------------------------------------+
|                                                           |
| IF (Mode == 'Bagi Rata'):                                 |
|   +-----------------------------------------------------+ |
|   | Subtotal Tagihan (Input IDR)                        | |
|   | Jumlah Orang (Stepper - / +) + Tag Nama Peserta     | |
|   +-----------------------------------------------------+ |
|                                                           |
| ELSE (Mode == 'Per Pesanan'):                             |
|   +-----------------------------------------------------+ |
|   | Daftar Peserta (Tambah Cepat dengan Tag Avatar)     | |
|   | Daftar Item Pesanan (Nama, Harga, Qty, Checklist    | |
|   | Siapa yang Makan/Pesan)                             | |
|   | Tombol [+ Tambah Item]                              | |
|   +-----------------------------------------------------+ |
|                                                           |
| [SCR-003] Card Pengaturan Biaya & Diskon (Collapsible)    |
|   +-----------------------------------------------------+ |
|   | Diskon          : [ % / Rp ] [ Presets: 10% | 20% ] | |
|   | Service Charge  : [ % / Rp ] [ Presets: 5%  | 7.5% ]| |
|   | Pajak PB1/Resto : [ % / Rp ] [ Presets: 10% | 11% ] | |
|   | Tip             : [ % / Rp ]                        | |
|   | Info Badge: "Pajak dihitung dari: Subtotal + Serv"  | |
|   +-----------------------------------------------------+ |
|                                                           |
| [SCR-004] Card Total Akhir & Rincian Transparan           |
|   +-----------------------------------------------------+ |
|   | TOTAL AKHIR TAGIHAN: Rp 286.000                     | |
|   | Breakdown: Subtotal + Serv + PB1 - Disc + Tip       | |
|   | Status Pembulatan: "Bulat pas tanpa selisih"        | |
|   +-----------------------------------------------------+ |
|                                                           |
| [SCR-005] Kartu Tagihan Per Orang (Interactive Accordion) |
|   +-----------------------------------------------------+ |
|   | 👤 Budi        -> Rp 95.334 (Detail: Nasi + Es Teh)  | |
|   | 👤 Siti        -> Rp 95.333 (Detail: Mie Ayam)       | |
|   | 👤 Andi        -> Rp 95.333 (Detail: Kwetiau)        | |
|   +-----------------------------------------------------+ |
|                                                           |
| [Bottom Sticky Bar]                                       |
|   [ 📋 Salin Teks ]  [ 📤 Bagikan ke WhatsApp ]           |
+-----------------------------------------------------------+
```

---

## 4. Desain Spesifik Komponen UI

### 4.1 Input Formatter Rupiah & Masking
* Setiap input uang otomatis memiliki prefix label `Rp` dan pemisah ribuan titik (`150.000`).
* User bisa mengetik cepat tanpa perlu mengetik titik secara manual.
* Dukungan quick calculator tombol penambah (misal `+5.000`, `+10.000` atau tombol shortcut).

### 4.2 Quick Presets Chips
* Mengurangi friksi mengetik di ponsel dengan tombol pintas sekali tekan:
  * **Pajak:** `[ 0% ]` `[ 10% (PB1) ]` `[ 11% (PPN) ]`
  * **Service:** `[ 0% ]` `[ 5% ]` `[ 7% ]` `[ 10% ]`
  * **Diskon:** `[ 10% ]` `[ 20% ]` `[ 30% ]` `[ 50% ]`

### 4.3 Multi-Participant Allocation pada Mode Pesanan (Itemized)
* Bila 1 makanan dimakan bareng oleh 3 orang (misal: *Pizza Large* dimakan Budi, Siti, dan Andi):
  * Cukup centang nama Budi, Siti, dan Andi.
  * Mesin otomatis membagi porsi item tersebut secara rata ke 3 orang tersebut sebelum biaya global dialokasikan.
* Visual chip peserta memiliki warna avatar/inisial unik sehingga mudah dibedakan secara sekilas.

### 4.4 Indikator Validasi & Anti Kesalahan
* **Unassigned Item Warning:** Banner oranye jika ada item yang belum ditentukan siapa yang makan.
* **Discount Overflow Alert:** Peringatan instan merah jika diskon melebihi subtotal.
* **Zero Participant State:** Nonaktifkan perhitungan jika peserta = 0.

---

## 5. Standar Format Salin Hasil (WhatsApp / Clipboard Friendly)

Format teks yang dihasilkan saat user menekan **Salin Hasil** atau **Bagikan ke WhatsApp** dirancang rapi, mudah dibaca, dan tidak berantakan di layar ponsel:

```text
🧾 *RINCIAN SPLIT BILL*
📍 Tanggal: 22 Okt 2026, 20:30 WIB
Mode: Berdasarkan Pesanan

📋 *Ringkasan Tagihan:*
• Subtotal: Rp 200.000
• Diskon (10%): -Rp 20.000
• Service Charge (5%): +Rp 9.000
• Pajak Resto (10%): +Rp 18.900
• Tip: Rp 0
---------------------------------
💰 *TOTAL AKHIR: Rp 207.900*

👥 *Rincian Pembagian Per Orang:*
1. *Budi* ➔ *Rp 72.765*
   - Nasi Goreng Spesial (1x)
   - Es Teh Manis (1x)
   - Beban Biaya Pajak/Layanan: Rp 7.765

2. *Siti* ➔ *Rp 67.568*
   - Ayam Bakar Madu (1x)
   - Air Mineral (1x)
   - Beban Biaya Pajak/Layanan: Rp 7.208

3. *Andi* ➔ *Rp 67.567*
   - Mie Goreng Seafood (1x)
   - Teh Tawar Hangat (1x)
   - Beban Biaya Pajak/Layanan: Rp 7.207

✅ *Total Bagian: Rp 207.900 (Pas 100%)*
_Dihitung otomatis via SplitBill.id_
```

---

## 6. Micro-Interactions & Responsivitas

1. **Live Computation Feedback:**
   * Saat user mengetik angka atau mencentang peserta, angka total di bagian bawah berubah secara halus (*counter animation* / transisi halus tanpa flicker).
2. **Haptic & Toast Notification:**
   * Menekan "Salin Teks" memunculkan floating snackbar/toast hijau: *"Berhasil disalin! Siap ditempel ke WhatsApp 🚀"*.
3. **Mobile Keyboard Optimization:**
   * Input nominal menggunakan `inputmode="numeric"` agar langsung memunculkan numeric keypad di iOS dan Android.
4. **Zero-Scroll Sticky Summary (Mobile):**
   * Di layar ponsel, total akhir dan tombol bagikan melayang (*sticky bottom sheet*) sehingga pengguna selalu tahu berapa totalnya tanpa harus scroll bolak-balik.

---

## 7. Rekomendasi Tech Stack untuk Eksekusi

Sesuai instruksi pengembangan:
* **HTML5:** Struktur semantik, aksesibel (ARIA labels, keyboard navigation).
* **Modern Vanilla CSS:** Menggunakan CSS Variables untuk Design Tokens, Flexbox & Grid, Glassmorphism backdrop-filter, fluid typography `clamp()`.
* **Modern Modular JavaScript (ES Modules):**
  * `js/calculation.js`: Engine matematika terisolasi (deterministic rounding, proporsionalitas, integer precision).
  * `js/validation.js`: Handler validasi input dan batas aman.
  * `js/formatter.js`: IDR currency formatter dan WhatsApp text generator.
  * `js/app.js`: UI controller, reactive DOM updater, event handlers.
* **Storage:** `sessionStorage` / in-memory (tanpa server, aman, privasi 100%).

---
*Dokumen ini siap dijadikan acuan Gate G2 untuk menuju tahap Gate G3 (Implementation).*
