03 — SDLC Kalkulator Split Bill \& Pajak v1.0

Software Development Life Cycle

Draft v1.0



Tanggal: 22 Oktober 2026 · Mode: Guided · Status: Menunggu ACC



Tujuan: menetapkan proses kerja dari requirement hingga rilis dan pemeliharaan, dengan perhatian khusus pada akurasi perhitungan uang, privasi data, dan pengalaman mobile.



Daftar isi

1\. Prinsip dan model SDLC

2\. Tahapan dan release gates

3\. Peran dan tanggung jawab

4\. Backlog dan change management

5\. Repository dan branching

6\. Environment dan konfigurasi

7\. Standar implementasi dan code review

8\. Strategi pengujian

9\. Security dan privacy lifecycle

10\. CI/CD, release, rollback, dan incident

11\. Maintenance dan retirement

12\. Artifact ownership

13\. Definition of Ready dan Definition of Done

14\. Risiko dan keputusan terbuka

1\. Prinsip dan model SDLC

1.1 Model yang direkomendasikan

Gunakan iterative Agile dengan release gates: pekerjaan dibagi menjadi increment kecil, diuji secara berulang, dan hanya berpindah tahap ketika kriteria penerimaan terpenuhi.



Alasan:

\- Formula kalkulasi dan pembulatan memerlukan validasi sejak awal.

\- UX mobile bisa diperbaiki berdasarkan hasil pengujian.

\- MVP tidak memerlukan proses enterprise yang berat.

\- Perubahan aturan biaya harus dapat ditelusuri dan diuji regresinya.

1.2 Prinsip wajib

1\. Requirement memiliki ID dan kriteria penerimaan.

2\. Perubahan formula harus disertai test case.

3\. Logika kalkulasi dipisahkan dari UI.

4\. Tidak ada rilis tanpa pengujian regresi kalkulasi.

5\. Data tagihan dan nama peserta tidak dikirim ke server pada MVP.

6\. Asumsi bisnis tidak boleh diubah diam-diam menjadi aturan produk.

7\. Rilis harus dapat dihentikan atau dikembalikan ke versi stabil.

2\. Tahapan dan release gates

01



Discovery \& Specification



Blueprint, PRD, aturan biaya, acceptance criteria



G1 — Requirement disetujui







02



UX \& Technical Design



User flow, screen inventory, DESIGN.md, keputusan stack



G2 — Desain dan arsitektur disetujui







03



Implementation



Mesin kalkulasi, UI responsif, validasi, fitur share



G3 — Code review dan automated tests lulus







04



Verification \& QA



Test integrasi, edge cases, aksesibilitas, privacy



G4 — Acceptance tests lulus







05



Release



Build produksi, smoke test, pemantauan awal



G5 — Rilis dinyatakan sehat







06



Operate \& Improve



Pemantauan, bug fix, perubahan terkontrol



Evaluasi berkelanjutan







2.1 Gate criteria

Gate	Syarat minimum

G1	Scope MVP, formula, dan aturan pembulatan terdefinisi; keputusan kritis tidak menggantung

G2	Flow, screen inventory, arsitektur, dan strategi testing disetujui

G3	Review kode lulus, unit test lulus, tidak ada secret di repository

G4	Acceptance test, edge cases, mobile, privacy, dan regression test lulus

G5	Deployment berhasil, smoke test lulus, rollback tersedia



Blocker khusus proyek: G1 tidak boleh dianggap selesai sebelum urutan diskon, service charge, pajak, tip, dan basis kalkulasinya ditetapkan.

3\. Peran dan tanggung jawab

Untuk MVP, satu orang dapat memegang beberapa peran. Tanggung jawab tetap harus jelas meskipun tim kecil.

Aktivitas	Product Owner	Architect	Developer	QA

Scope dan prioritas	A/R	C	I	C

Aturan kalkulasi	A	R/C	C	C

Desain arsitektur	C	A/R	C	C

Implementasi	I	C	A/R	C

Pengujian	C	C	R	A/R

Keputusan rilis	A	C	R	C

Incident dan rollback	A	R/C	R	C



Keterangan: R = Responsible, A = Accountable, C = Consulted, I = Informed.



Jika belum ada QA khusus, developer menjalankan automated tests dan Product Owner/representatif pengguna memvalidasi acceptance criteria.

4\. Backlog dan change management

4.1 Struktur backlog

Setiap pekerjaan harus ditautkan ke requirement atau kebutuhan operasional.

Epic	Contoh backlog	Traceability

Kalkulasi inti	Formula biaya, presisi uang, pembulatan	FR-011–020, BR-001–008

Mode bagi rata	Peserta dan pembagian total	FR-001–005

Mode berdasarkan pesanan	Item dan alokasi peserta	FR-006–010

UX dan validasi	Input error, empty state, layout mobile	FR-024–028

Berbagi hasil	Clipboard dan Web Share API	FR-021–023

Quality \& privacy	Unit test, keamanan input, pemeriksaan network	NFR-003–010, SEC-001–006



4.2 Prioritas

\- P0: wajib agar MVP memenuhi tujuan inti.

\- P1: peningkatan setelah MVP.

\- P2: eksperimen atau fitur yang belum terbukti dibutuhkan.

OCR, riwayat cloud, login, dan integrasi pembayaran tetap di luar MVP sampai ada persetujuan perubahan scope.

4.3 Change request

Setiap perubahan yang memengaruhi formula, data, UX, atau deployment harus mencatat:

1\. Alasan dan masalah yang ingin diselesaikan.

2\. Requirement dan screen yang terdampak.

3\. Dampak pada kalkulasi, privasi, biaya, dan jadwal.

4\. Test case yang perlu ditambahkan atau diperbarui.

5\. Persetujuan pihak yang bertanggung jawab.

6\. Versi dokumen dan keputusan yang diperbarui.

Perubahan formula tidak boleh langsung diterapkan ke produksi tanpa regression test.

5\. Repository dan branching

5.1 Struktur repository konseptual

Struktur final mengikuti framework yang dipilih pada tahap Architecture. Secara konseptual, pisahkan:

\- src/ui — komponen antarmuka dan halaman.

\- src/calculation — formula, basis biaya, alokasi, dan rounding.

\- src/validation — validasi input.

\- src/formatting — format Rupiah dan teks ringkasan.

\- tests/unit — pengujian fungsi kalkulasi.

\- tests/integration — alur fitur dan integrasi browser.

\- docs — requirement, keputusan arsitektur, dan panduan rilis.

Nama folder di atas adalah rancangan awal, bukan keharusan framework tertentu.

5.2 Branching strategy

Rekomendasi: trunk-based sederhana dengan pull request.

\- main: cabang stabil yang selalu harus lolos pemeriksaan.

\- feat/<short-name>: fitur singkat.

\- fix/<short-name>: perbaikan bug.

\- hotfix/<short-name>: perbaikan produksi yang mendesak.

Aturan:

\- Perubahan masuk melalui pull request.

\- Jangan commit langsung ke main untuk perubahan fitur.

\- Hindari branch berumur panjang.

\- Setiap perubahan formula wajib memiliki test.

\- Gunakan tag versi untuk release yang dipublikasikan.

5.3 Pull request checklist

\- \[ ] Requirement dan scope perubahan jelas.

\- \[ ] Tidak ada perubahan di luar scope tanpa persetujuan.

\- \[ ] Test lulus.

\- \[ ] Formula dan rounding ditinjau bila terdampak.

\- \[ ] Tidak ada secret atau data pribadi nyata.

\- \[ ] UX responsif dan aksesibilitas diperiksa.

\- \[ ] Dokumentasi diperbarui bila keputusan berubah.

6\. Environment dan konfigurasi

Environment	Tujuan	Data	Deployment

Local	Pengembangan	Data dummy	Mesin developer

Preview/Staging	Review dan QA	Data sintetis	Build kandidat

Production	Penggunaan nyata	Sesi pengguna di browser	Hosting produksi



Aturan konfigurasi

\- Jangan menaruh secret di kode frontend atau environment variable yang akan ikut dibundel ke browser.

\- Karena MVP tidak memerlukan backend, konfigurasi server-side harus diminimalkan.

\- Gunakan HTTPS di staging dan production.

\- Build production harus dapat direproduksi dari versi source yang diketahui.

\- Perubahan konfigurasi hosting dan domain dicatat.

\- Jangan memasukkan nama teman, pesanan nyata, atau nominal pribadi ke test fixture yang dipublikasikan.

7\. Standar implementasi dan code review

7.1 Pemisahan tanggung jawab

Mesin kalkulasi harus menjadi modul yang dapat diuji tanpa merender UI. Modul ini menerima input terstruktur dan menghasilkan hasil terstruktur.



Lapisan utama:

1\. Input dan validasi.

2\. Model data sesi.

3\. Kalkulasi subtotal.

4\. Perhitungan diskon dan biaya tambahan.

5\. Alokasi antar peserta.

6\. Pembulatan.

7\. Formatter hasil.

8\. UI dan fungsi berbagi.

7.2 Aturan kode

\- Gunakan tipe data yang eksplisit untuk mode persen dan nominal.

\- Jangan menggabungkan format tampilan Rupiah dengan logika aritmetika.

\- Hindari floating-point biasa untuk perhitungan uang.

\- Validasi nilai di batas modul, bukan hanya melalui UI.

\- Hindari duplikasi formula di komponen berbeda.

\- Tangani pembagi nol dan input di luar rentang.

\- Pesan error harus menjelaskan tindakan koreksi.

\- Gunakan nama variabel dan fungsi yang menggambarkan aturan bisnis.

7.3 Code review khusus kalkulasi

Reviewer wajib memeriksa:

\- Basis setiap komponen biaya.

\- Urutan kalkulasi.

\- Penanganan diskon yang melebihi batas.

\- Alokasi biaya global ke peserta.

\- Pembulatan dan sisa nominal.

\- Konsistensi total akhir dan total per orang.

\- Perilaku saat input berubah atau dihapus.

8\. Strategi pengujian

Level 1 — Unit tests



Menguji formula, validasi, alokasi, presisi, dan pembulatan secara terisolasi.







Level 2 — Integration tests



Memastikan input UI diteruskan ke mesin kalkulasi dengan benar dan hasil ditampilkan sesuai.







Level 3 — End-to-end dan usability



Memvalidasi journey bagi rata, split item, koreksi input, serta salin/bagikan hasil pada perangkat target.







Level 4 — Security, privacy, dan regression



Memastikan input tidak dieksekusi, data tidak terkirim tanpa alasan, dan perbaikan tidak merusak hasil sebelumnya.







8.1 Test matrix wajib

Area	Kasus minimum

Pembagian rata	Dua peserta, banyak peserta, sisa pembulatan

Pembagian item	Item berbeda harga, kuantitas, beberapa item per orang

Biaya	Pajak persen/nominal, service charge, tip, diskon

Input	Kosong, nol, negatif, format tidak valid, batas maksimum

Perubahan state	Peserta/item dihapus, mode diganti, input dikoreksi

Konsistensi	Total bagian sama dengan total akhir

Share	API tersedia, tidak tersedia, izin ditolak

UX	Keyboard, label, error state, viewport mobile

Privacy	Network request tidak mengandung detail sesi



8.2 Quality gate kalkulasi

\- Semua unit test kalkulasi yang diwajibkan harus lulus.

\- Tidak ada mismatch yang belum dijelaskan antara total akhir dan total per orang.

\- Setiap perubahan aturan biaya memiliki test vector.

\- Hasil harus deterministik untuk input dan konfigurasi yang sama.

\- Test fixture mencakup nominal kecil, besar, nilai nol, dan kasus rounding.

9\. Security dan privacy lifecycle

9.1 Sebelum development

\- Konfirmasi bahwa kalkulasi inti berjalan di browser.

\- Minimalkan pengumpulan data.

\- Identifikasi input yang dapat disalahgunakan.

\- Tetapkan kebijakan error logging agar tidak membawa isi tagihan.

9.2 Saat development

\- Render input sebagai teks, bukan HTML mentah.

\- Hindari dependency yang tidak diperlukan.

\- Review dependency dan lisensi sebelum rilis.

\- Jangan menyimpan detail sesi ke analytics atau log.

\- Jangan menaruh secret dalam source code.

9.3 Sebelum release

\- Periksa dependency dan kerentanan yang diketahui.

\- Periksa konfigurasi HTTPS.

\- Inspeksi request jaringan.

\- Uji penanganan input ekstrem dan string berbahaya.

\- Pastikan halaman privasi sesuai perilaku aplikasi.

9.4 Setelah release

\- Perbarui dependency dengan prosedur terkontrol.

\- Perbaiki kerentanan berdasarkan tingkat risiko.

\- Catat incident dan keputusan mitigasi.

\- Jika fitur baru membutuhkan backend atau penyimpanan, lakukan privacy review sebelum implementasi.

10\. CI/CD, release, rollback, dan incident

10.1 Pipeline CI yang direkomendasikan

Setiap pull request menjalankan:

1\. Pemeriksaan format dan lint.

2\. Type checking jika didukung stack terpilih.

3\. Unit test.

4\. Integration test yang tersedia.

5\. Build production.

6\. Pemeriksaan dependency dan secret.

7\. Pemeriksaan hasil build dan artefak rilis.

Deployment otomatis ke production baru diputuskan setelah platform hosting dipilih. Pada awalnya, deployment produksi dapat membutuhkan persetujuan manual.

10.2 Release checklist

\- \[ ] Build berasal dari commit yang diketahui.

\- \[ ] Semua pemeriksaan CI lulus.

\- \[ ] Acceptance dan regression test lulus.

\- \[ ] Tidak ada blocker kalkulasi yang diketahui.

\- \[ ] Staging smoke test lulus.

\- \[ ] HTTPS dan domain diverifikasi.

\- \[ ] Versi stabil sebelumnya diketahui.

\- \[ ] Rollback dapat dijalankan.

\- \[ ] Panduan pengguna dan catatan perubahan diperbarui.

10.3 Rollback

Rollback diperlukan bila terjadi:

\- Hasil perhitungan salah secara material.

\- Fitur inti tidak bisa digunakan.

\- Halaman tidak dapat dimuat secara konsisten.

\- Kerentanan keamanan kritis ditemukan.

\- Data sesi terkirim ke tujuan yang tidak direncanakan.

Prosedur:

1\. Hentikan promosi release baru.

2\. Revert atau deploy ulang versi stabil sebelumnya.

3\. Jalankan smoke test dan test kalkulasi utama.

4\. Catat dampak dan akar masalah.

5\. Tambahkan test pencegahan sebelum merilis ulang.

Karena MVP tidak memerlukan migrasi database, rollback awal relatif sederhana. Jika backend ditambahkan di masa depan, migrasi skema harus memiliki strategi kompatibilitas dan pemulihan tersendiri.

10.4 Incident handling

Severity	Contoh	Respons

SEV-1	Kebocoran data atau formula yang menyebabkan hasil salah secara luas	Hentikan rilis, mitigasi segera, rollback jika perlu

SEV-2	Mode split atau komponen biaya utama gagal	Prioritaskan perbaikan dan rilis patch

SEV-3	Masalah UI terbatas dengan workaround	Masukkan ke backlog dan jadwalkan perbaikan

SEV-4	Ketidaksempurnaan visual atau copy	Perbaiki pada iterasi berikutnya



Setiap incident material harus memiliki catatan waktu, dampak, mitigasi, akar masalah, dan tindakan pencegahan.

11\. Maintenance dan retirement

11.1 Pemeliharaan rutin

Frekuensi	Aktivitas

Setiap release	Regression test kalkulasi dan smoke test

Berkala	Review dependency, error, dan feedback pengguna

Saat formula berubah	Review requirement, test vector, dan dokumentasi

Saat framework/dependency diperbarui	Compatibility test dan rollback plan

Sebelum retirement	Pengumuman, penghentian deployment, dan penanganan data sesuai kebijakan



11.2 Kebijakan penghentian

Jika aplikasi tidak lagi dipelihara:

1\. Tentukan tanggal penghentian dan komunikasikan kepada pengguna.

2\. Hentikan deployment fitur baru.

3\. Pastikan tidak ada data pengguna yang tertinggal di layanan yang akan ditutup.

4\. Simpan source dan dokumentasi yang diperlukan untuk audit internal.

5\. Nonaktifkan domain atau layanan sesuai rencana.

6\. Catat versi terakhir dan alasan retirement.

Karena asumsi MVP adalah tidak menyimpan data tagihan di server, penghentian layanan tidak seharusnya membutuhkan migrasi data transaksi.

12\. Artifact ownership

Artefak	Pemilik utama	Status

Project Blueprint	Product Owner / Architect	ACC

PRD	Product Owner / Analyst	ACC

SDLC	Architect / Engineering Lead	Draft v1.0

Architecture \& Tech Stack	Solution Architect	Belum dimulai

UX Architecture	UX / Product Designer	Belum dimulai

DESIGN.md	UX / Design Owner	Belum dimulai

Test plan dan test vectors	QA / Developer	Dikembangkan bersama PRD

Release notes	Developer / Release Owner	Dibuat per release

Master Handoff	Architect / Product Owner	Tahap akhir



Perubahan pada artefak harus menyertakan nomor versi, tanggal, ringkasan perubahan, dan dampak pada artefak terkait.

13\. Definition of Ready dan Definition of Done

13.1 Definition of Ready (DoR)

Sebuah backlog item siap dikerjakan bila:

\- \[x] Tujuan dan requirement ID jelas.

\- \[x] Acceptance criteria dapat diuji.

\- \[x] Dependency dan keputusan bisnis yang dibutuhkan telah diselesaikan.

\- \[x] Desain atau spesifikasi interaksi tersedia bila diperlukan.

\- \[x] Data input, output, dan error state ditentukan.

\- \[x] Risiko keamanan dan privasi telah ditinjau.

\- \[x] Estimasi dan prioritas disepakati.

13.2 Definition of Done (DoD)

Sebuah backlog item selesai bila:

\- \[x] Implementasi memenuhi requirement dan acceptance criteria.

\- \[x] Automated tests relevan lulus.

\- \[x] Perubahan kalkulasi memiliki regression test.

\- \[x] Code review selesai.

\- \[x] Aksesibilitas dan tampilan responsif diperiksa.

\- \[x] Tidak ada secret atau data sensitif dalam source.

\- \[x] Dokumentasi dan traceability diperbarui.

\- \[x] Fitur telah lolos verifikasi pada environment yang ditentukan.

14\. Risiko dan keputusan terbuka

14.1 Risiko SDLC

ID	Risiko	Mitigasi

RISK-101	Implementasi dimulai sebelum formula disepakati	Jadikan aturan kalkulasi sebagai blocker G1

RISK-102	Test hanya menguji hasil normal	Tambahkan edge case dan test vector pembulatan

RISK-103	UI dan mesin kalkulasi memakai formula berbeda	Gunakan satu modul kalkulasi sebagai sumber kebenaran

RISK-104	Perubahan kecil merusak hasil lama	Jalankan regression test pada setiap perubahan

RISK-105	Tim terlalu cepat memilih teknologi	Evaluasi stack setelah kebutuhan dan batasan tim diketahui

RISK-106	Rilis tidak dapat dipulihkan dengan cepat	Simpan versi stabil dan dokumentasikan rollback



14.2 Keputusan terbuka

ID	Keputusan	Status

OD-101	Formula final diskon, service charge, pajak, dan tip	Belum disepakati

OD-102	Framework frontend dan testing	Tahap Architecture

OD-103	Hosting dan metode deployment	Tahap Architecture

OD-104	Target browser dan ambang performa	Ditentukan berdasarkan stack dan kebutuhan

OD-105	Analytics	Tidak wajib untuk MVP

OD-106	Aturan penyimpanan sesi	Asumsi: tidak disimpan permanen



15\. Ringkasan dan status proyek

Rekomendasi SDLC: iterative Agile, trunk-based development, pengujian otomatis, dan release gates. Pendekatan ini menjaga proses tetap ringan untuk MVP tanpa mengorbankan ketepatan perhitungan dan kontrol rilis.

