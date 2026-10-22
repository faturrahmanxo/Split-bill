02 — PRD Kalkulator Split Bill \& Pajak v1.0

Product Requirements Document

Draft v1.0



Tanggal: 22 Oktober 2026 · Bahasa: Indonesia · Mode: Guided



Tujuan dokumen: menjadi acuan desain, implementasi, pengujian, dan validasi produk. Aturan yang belum dikonfirmasi ditandai sebagai rekomendasi atau keputusan terbuka.



Daftar Isi

1\. Visi dan tujuan produk

2\. Pengguna dan kebutuhan

3\. Ruang lingkup dan prioritas

4\. Arsitektur informasi dan user journey

5\. Functional requirements

6\. Business rules dan spesifikasi kalkulasi

7\. Data dan state

8\. Nonfunctional requirements

9\. Security dan privacy

10\. Analytics dan operasional

11\. Edge cases

12\. Acceptance criteria dan testing

13\. Release plan

14\. Risiko dan keputusan terbuka

15\. Traceability dan status proyek

1\. Visi dan tujuan produk

1.1 Visi

Membantu kelompok teman membagi tagihan makan dengan cepat, transparan, dan konsisten, termasuk pajak restoran/PB1, service charge, tip, dan diskon.

1.2 Tujuan

ID	Tujuan	Indikator keberhasilan

GOAL-001	Mengurangi waktu menghitung tagihan	Pengguna uji menyelesaikan skenario utama tanpa bantuan

GOAL-002	Menghasilkan pembagian yang konsisten	Total semua bagian sama dengan total tagihan sesuai aturan pembulatan

GOAL-003	Mendukung dua pola pembagian	Mode rata dan mode berdasarkan pesanan lulus pengujian

GOAL-004	Memperjelas komponen biaya	Rincian setiap biaya terlihat sebelum hasil dibagikan

GOAL-005	Meminimalkan hambatan penggunaan	Kalkulasi dapat dimulai tanpa login

GOAL-006	Memudahkan koordinasi	Hasil bisa disalin atau dibagikan



1.3 Non-goals

\- Memproses pembayaran atau transfer uang.

\- Menentukan tarif pajak resmi untuk setiap restoran secara otomatis.

\- Membaca foto struk dengan OCR pada MVP.

\- Menyimpan riwayat di server atau mewajibkan akun.

\- Mengintegrasikan sistem POS restoran.

2\. Pengguna dan kebutuhan

ID	Pengguna	Kebutuhan

US-001	Penghitung/host	Memasukkan tagihan dan menghitung pembagian dengan cepat

US-002	Penghitung/host	Membagi rata saat semua peserta setuju membayar sama

US-003	Penghitung/host	Membagi berdasarkan item saat pesanan berbeda

US-004	Peserta	Melihat nominal dan rincian biaya yang menjadi bagiannya

US-005	Penghitung/host	Membagikan hasil ke grup tanpa mengetik ulang



3\. Ruang lingkup dan prioritas



P0 — Wajib untuk MVP



Kalkulasi, peserta, dua mode split, pajak, service charge, tip, diskon, rincian per orang, validasi, pembulatan, dan salin hasil.









P1 — Setelah MVP



Riwayat, preset tarif, ekspor PDF, OCR struk, tautan hasil persisten, dan mata uang lain.







3.1 Batas MVP

\- Bahasa Indonesia dan Rupiah (IDR).

\- Web responsif, mengutamakan penggunaan di ponsel.

\- Tidak memerlukan akun.

\- Satu sesi kalkulasi berjalan di browser.

\- Tidak mengirim nama peserta atau detail tagihan ke server untuk fungsi kalkulasi inti.

4\. Arsitektur informasi dan user journey

4.1 Struktur halaman

MVP dapat dibuat sebagai satu halaman dengan bagian-bagian berikut.

Screen ID	Bagian	Fungsi

SCR-001	Kalkulator utama	Memilih mode dan memasukkan data

SCR-002	Editor pesanan	Mengelola item dan peserta untuk mode pesanan

SCR-003	Pengaturan biaya	Mengatur pajak, service charge, tip, dan diskon

SCR-004	Hasil pembagian	Menampilkan rincian total dan nominal per orang

SCR-005	Bagikan hasil	Menyalin atau membagikan ringkasan

SCR-006	Validasi dan empty state	Menjelaskan input yang kurang atau tidak valid



4.2 FLOW-001 — Bagi rata

1\. Pengguna memilih mode Bagi rata.

2\. Pengguna memasukkan subtotal dan jumlah/nama peserta.

3\. Pengguna mengatur pajak, service charge, tip, dan diskon bila diperlukan.

4\. Sistem menghitung total akhir dan nominal masing-masing peserta.

5\. Pengguna memeriksa rincian.

6\. Pengguna menyalin atau membagikan hasil.

4.3 FLOW-002 — Berdasarkan pesanan

1\. Pengguna memilih mode Berdasarkan pesanan.

2\. Pengguna menambah peserta.

3\. Pengguna memasukkan item, harga, kuantitas, dan pemilik item.

4\. Pengguna mengatur biaya tambahan dan diskon.

5\. Sistem menghitung subtotal tiap peserta dan alokasi biaya bersama.

6\. Pengguna meninjau total tiap orang.

7\. Pengguna membagikan ringkasan.

4.4 FLOW-003 — Koreksi data

Setiap perubahan input yang valid harus menghitung ulang hasil terkait. Jika input menjadi tidak valid, hasil lama tidak boleh disajikan seolah-olah merupakan hasil terbaru.

5\. Functional requirements

5.1 Input dan peserta

ID	Requirement	Acceptance criteria

FR-001	Pengguna dapat memasukkan subtotal manual pada mode rata	Subtotal valid menghasilkan perhitungan

FR-002	Pengguna dapat menambah, mengubah, dan menghapus peserta	Perubahan peserta tercermin pada hasil

FR-003	Sistem memvalidasi jumlah peserta	Jumlah nol atau negatif ditolak

FR-004	Sistem memvalidasi nilai uang	Input kosong, tidak numerik, negatif, atau di luar batas ditangani dengan pesan jelas

FR-005	Pengguna dapat memilih mode split	UI dan aturan pembagian sesuai mode yang dipilih



5.2 Mode berdasarkan pesanan

ID	Requirement	Acceptance criteria

FR-006	Pengguna dapat menambah dan menghapus item	Daftar item diperbarui

FR-007	Setiap item memiliki nama, harga satuan, dan kuantitas	Subtotal item dihitung dari harga × kuantitas

FR-008	Item dapat dialokasikan ke peserta	Subtotal per peserta mencerminkan item yang dialokasikan

FR-009	Sistem menangani item yang belum memiliki pemilik	Hasil final tidak dianggap lengkap sampai alokasi diselesaikan

FR-010	Perubahan item atau pemilik memperbarui hasil	Hasil konsisten dengan data terbaru



5.3 Pajak dan biaya

ID	Requirement	Acceptance criteria

FR-011	Pajak dapat diatur sebagai persen atau nominal	Nilai yang dimasukkan tercermin pada rincian

FR-012	Service charge dapat diatur sebagai persen atau nominal	Nilai yang dimasukkan tercermin pada rincian

FR-013	Tip dapat ditambahkan sebagai persen atau nominal	Tip masuk ke total sesuai aturan yang dipilih

FR-014	Diskon dapat ditambahkan sebagai persen atau nominal	Diskon mengurangi total sesuai aturan yang dipilih

FR-015	Pengguna dapat melihat basis/urutan kalkulasi yang berlaku	UI menampilkan penjelasan aturan yang digunakan

FR-016	Sistem tidak mengunci satu tarif pajak universal	Pengguna dapat memasukkan nilai yang sesuai dengan tagihannya



5.4 Hasil dan berbagi

ID	Requirement	Acceptance criteria

FR-017	Sistem menampilkan subtotal dan setiap komponen biaya	Rincian dapat diperiksa sebelum dibagikan

FR-018	Sistem menampilkan total akhir	Total konsisten dengan komponen yang ditampilkan

FR-019	Sistem menampilkan total setiap peserta	Semua bagian menjumlah ke total akhir

FR-020	Sistem menampilkan penyesuaian pembulatan bila ada	Selisih pembulatan tidak tersembunyi

FR-021	Pengguna dapat menyalin hasil	Teks yang disalin memuat total dan nominal per orang

FR-022	Pengguna dapat membagikan hasil jika browser mendukung	Web Share API digunakan bila tersedia, dengan fallback salin teks

FR-023	Pengguna dapat mengubah data setelah melihat hasil	Kalkulasi diperbarui tanpa mengulang sesi



5.5 UX dan aksesibilitas

ID	Requirement	Acceptance criteria

FR-024	Semua input memiliki label yang jelas	Input dapat dikenali tanpa mengandalkan placeholder saja

FR-025	Kesalahan ditampilkan dekat input terkait	Pesan menyebutkan cara memperbaiki masalah

FR-026	Fungsi inti dapat digunakan dengan keyboard	Fokus terlihat dan urutan navigasi logis

FR-027	Tampilan responsif	Tidak ada fungsi inti yang hilang pada layar kecil

FR-028	Format nominal menggunakan format IDR yang konsisten	Contoh nominal ditampilkan dengan pemisah ribuan yang sesuai



6\. Business rules dan spesifikasi kalkulasi

Bagian ini menetapkan kontrak kalkulasi yang perlu dipastikan sebelum implementasi. Karena urutan pajak, service charge, diskon, dan tip dapat berbeda menurut struk atau kebijakan restoran, aplikasi tidak boleh menyamarkan asumsi sebagai aturan universal.

6.1 Variabel kalkulasi

\- \\(S\\): subtotal makanan/minuman sebelum komponen tambahan.

\- \\(D\\): diskon.

\- \\(C\\): service charge.

\- \\(T\\): pajak restoran/PB1 yang dimasukkan pengguna.

\- \\(G\\): tip.

\- \\(F\\): total akhir setelah semua komponen diterapkan.

Secara konseptual:

\\\[

F = S - D + C + T + G

\\]



Persamaan ini adalah ringkasan komponen, bukan penetapan urutan pengenaan pajak. Nilai \\(C\\) dan \\(T\\) harus dihitung menurut basis yang dipilih dan ditampilkan kepada pengguna.

6.2 BR-001 — Uang dan presisi

Nominal uang tidak boleh dihitung menggunakan floating-point biasa tanpa strategi presisi. Mesin kalkulasi harus memakai integer unit uang yang sesuai atau aritmetika desimal presisi.

6.3 BR-002 — Persentase dan nominal

Setiap komponen yang mendukung mode persen atau nominal harus memiliki tipe yang eksplisit. Nilai persen dihitung dari basis yang telah ditentukan, sedangkan nominal dipakai sebagai nilai langsung. Sistem tidak boleh mengubah diam-diam mode atau basisnya.

6.4 BR-003 — Pembagian rata

Jika total akhir dibagi kepada \\(n\\) peserta:

\\\[

\\text{Bagian dasar} = \\frac{F}{n}

\\]



Karena nominal Rupiah harus konsisten dengan presisi yang digunakan, sisa pembulatan dialokasikan menggunakan algoritme deterministik. Jumlah bagian akhir harus sama dengan total yang dibagi.

6.5 BR-004 — Pembagian berdasarkan item

Subtotal peserta \\(i\\) ditentukan dari total item yang dialokasikan kepada peserta tersebut:

\\\[

S\_i = \\sum\_{j \\in I\_i} (\\text{harga}\_j \\times \\text{kuantitas}\_{ij})

\\]



Untuk biaya global yang dibagi secara proporsional, rekomendasi awal:

\\\[

A\_i = A \\times \\frac{S\_i}{\\sum\_k S\_k}

\\]



dengan \\(A\\) adalah biaya global yang akan dialokasikan. Formula ini hanya digunakan setelah aturan alokasi proporsional disetujui, dan harus memiliki penanganan khusus bila subtotal total nol.

6.6 BR-005 — Diskon

Diskon harus diterapkan satu kali, sesuai basis yang ditentukan. Untuk diskon global pada mode item, rekomendasi awal adalah alokasi proporsional terhadap subtotal peserta. Diskon tidak boleh menyebabkan bagian akhir menjadi negatif tanpa aturan eksplisit yang disetujui.

6.7 BR-006 — Pajak dan service charge

\- Tarif dapat dimasukkan pengguna dalam bentuk persen atau nominal.

\- Basis pengenaan dan urutan perhitungan harus jelas.

\- Nilai yang ditampilkan harus sesuai dengan hasil mesin kalkulasi.

\- Aplikasi tidak boleh mengklaim bahwa tarif input merupakan tarif yang diwajibkan secara hukum.

6.8 BR-007 — Tip

Tip harus ditampilkan sebagai komponen tersendiri. Rekomendasi awal adalah tip dialokasikan proporsional terhadap subtotal peserta, tetapi pilihan ini masih menunggu persetujuan.

6.9 BR-008 — Pembulatan

\- Tentukan satu kebijakan pembulatan untuk seluruh mesin kalkulasi.

\- Terapkan kebijakan secara konsisten pada setiap mode.

\- Jika ada sisa pembulatan, distribusikan secara deterministik.

\- Pastikan jumlah akhir seluruh peserta sama dengan total akhir tagihan.

\- Jangan menyembunyikan penyesuaian yang berdampak pada nominal per orang.

7\. Data dan state

7.1 Model data konseptual

ID	Entitas	Data utama

DATA-001	BillSession	Mode, mata uang, pengaturan biaya, data sesi sementara

DATA-002	Participant	ID lokal, nama tampilan

DATA-003	BillItem	Nama item, harga satuan, kuantitas

DATA-004	ItemAllocation	ID item, ID peserta, kuantitas/bagian

DATA-005	FeeSetting	Jenis biaya, mode persen/nominal, nilai, basis

DATA-006	CalculationResult	Subtotal, rincian biaya, total, hasil per peserta, penyesuaian pembulatan

DATA-007	ShareSummary	Ringkasan teks hasil kalkulasi



7.2 State UI

State ID	Kondisi	Respons UI

STATE-001	Kosong	Tampilkan petunjuk untuk memulai

STATE-002	Input belum lengkap	Tampilkan field yang masih diperlukan

STATE-003	Input tidak valid	Tampilkan pesan kesalahan, jangan menganggap hasil valid

STATE-004	Kalkulasi valid	Tampilkan rincian dan total

STATE-005	Hasil memiliki penyesuaian rounding	Tampilkan penjelasan pembulatan

STATE-006	Share berhasil	Beri feedback bahwa tindakan selesai

STATE-007	Share tidak tersedia/gagal	Sediakan fallback salin teks

STATE-008	Tidak ada item teralokasi	Jelaskan bahwa alokasi item perlu diselesaikan



7.3 Penyimpanan

Asumsi MVP: data hanya digunakan selama sesi browser dan tidak disimpan permanen di server. Persistensi lokal atau cloud memerlukan keputusan terpisah.

8\. Nonfunctional requirements

ID	Requirement	Cara verifikasi

NFR-001	Web responsif pada ponsel dan desktop	Pengujian viewport

NFR-002	Hasil diperbarui tanpa jeda yang mengganggu untuk skenario normal	Uji perubahan input

NFR-003	Mesin kalkulasi deterministik	Unit test dan test vectors

NFR-004	Fungsi inti dapat digunakan dengan keyboard	Pengujian aksesibilitas

NFR-005	Input invalid tidak merusak sesi	Pengujian recovery

NFR-006	Kalkulasi inti tidak memerlukan backend	Inspeksi network request

NFR-007	Format IDR konsisten	Unit test formatter

NFR-008	Logika kalkulasi terpisah dari UI	Review struktur kode

NFR-009	Input pengguna tidak dieksekusi sebagai HTML	Review rendering dan uji input

NFR-010	Browser modern yang ditargetkan dapat menjalankan fungsi inti	Smoke test lintas browser



Target numerik performance dan daftar versi browser minimum ditetapkan setelah keputusan stack dan lingkungan deployment.

9\. Security dan privacy

ID	Requirement	Kriteria penerimaan

SEC-001	Tanpa login untuk fungsi inti	Pengguna langsung dapat menghitung

SEC-002	Tidak mengirim rincian tagihan ke server pada MVP	Tidak ada request berisi nama peserta, item, atau nominal tagihan

SEC-003	Input dirender dengan aman	Teks yang menyerupai HTML tidak dieksekusi

SEC-004	Berbagi memerlukan tindakan pengguna	Tidak ada pembagian otomatis

SEC-005	Status penyimpanan data dijelaskan	Pengguna memahami apakah sesi disimpan

SEC-006	Deployment menggunakan HTTPS	Tidak ada akses produksi melalui koneksi HTTP yang tidak aman



Aplikasi tidak memerlukan data rekening, kartu, kata sandi, atau informasi finansial sensitif. Nama peserta tetap diperlakukan sebagai data pengguna, walaupun aplikasi tidak meminta akun.

10\. Analytics dan operasional

Analytics belum wajib pada MVP.



Jika pengukuran ditambahkan setelah peluncuran, event yang dipertimbangkan antara lain:

\- calculator\_started

\- split\_mode\_selected

\- calculation\_completed

\- result\_copied

\- result\_shared

\- calculation\_validation\_error

Event tidak boleh membawa nama peserta, isi pesanan, atau nilai nominal tagihan. Penggunaan analytics dan kebijakan privasi harus dievaluasi sebelum diaktifkan.



Kebutuhan operasional minimum:

\- Hosting HTTPS.

\- Pemantauan ketersediaan halaman.

\- Pelaporan error frontend tanpa mengumpulkan detail tagihan.

\- Prosedur rollback jika rilis menimbulkan kesalahan kalkulasi.

\- Pengujian ulang mesin kalkulasi setiap kali aturan biaya berubah.

11\. Edge cases

ID	Skenario	Perilaku yang diwajibkan

EDGE-001	Jumlah peserta nol	Tolak kalkulasi dan minta peserta ditambahkan

EDGE-002	Harga atau kuantitas negatif	Tampilkan error input

EDGE-003	Diskon melebihi basis yang diperbolehkan	Tolak atau minta koreksi sesuai aturan yang disetujui

EDGE-004	Subtotal nol	Jangan menghasilkan pembagian proporsional dengan pembagi nol

EDGE-005	Persentase kosong atau tidak valid	Tampilkan error dan jangan menggunakan nilai lama secara diam-diam

EDGE-006	Item belum memiliki peserta	Minta alokasi diselesaikan sebelum hasil final

EDGE-007	Peserta tidak memiliki item	Tampilkan nominal nol atau status yang jelas sesuai aturan final

EDGE-008	Nilai tagihan sangat besar	Batasi input sesuai batas aman dan beri pesan yang dapat dipahami

EDGE-009	Sisa pembulatan	Distribusikan secara deterministik

EDGE-010	Browser tidak mendukung Web Share API	Sediakan salin teks

EDGE-011	Clipboard gagal	Tampilkan pesan dan sediakan cara alternatif untuk mengambil hasil

EDGE-012	Pengguna mengubah mode split	Pertahankan data yang relevan bila aman; jelaskan data yang perlu dilengkapi

EDGE-013	Peserta atau item dihapus	Hitung ulang dan validasi ulang seluruh alokasi terkait

EDGE-014	Diskon nominal pada subtotal nol	Tolak atau nonaktifkan sesuai aturan final; jangan menghasilkan angka tak terdefinisi



12\. Acceptance criteria dan testing

12.1 Acceptance test utama

Contoh di bawah menggunakan nilai nominal untuk menguji konsistensi pembagian. Ini merupakan test vector aritmetika, bukan rekomendasi tarif pajak.

TEST-001 — Bagi rata tanpa biaya tambahan

Given: subtotal Rp120.000, dua peserta, tanpa pajak, biaya layanan, tip, atau diskon.



When: pengguna menghitung tagihan.



Then:

\- Total akhir Rp120.000.

\- Peserta A membayar Rp60.000.

\- Peserta B membayar Rp60.000.

\- Jumlah seluruh bagian sama dengan total akhir.

&#x20; 

&#x20; TEST-002 — Bagi rata dengan sisa pembulatan

&#x20; Given: total Rp100.000, tiga peserta.

&#x20; 

&#x20; Then: sistem menghasilkan pembagian dengan nominal Rupiah bulat yang jumlahnya tepat Rp100.000. Dua peserta dapat menerima nominal yang sama dan satu peserta menerima selisih pembulatan, berdasarkan algoritme deterministik yang disetujui.

&#x20; 

&#x20; TEST-003 — Berdasarkan pesanan

&#x20; Given: peserta A memiliki item Rp40.000 dan peserta B memiliki item Rp60.000.

&#x20; 

&#x20; Then: subtotal A Rp40.000, subtotal B Rp60.000, dan total subtotal Rp100.000 sebelum komponen tambahan.

&#x20; 

&#x20; TEST-004 — Diskon dan biaya tambahan

&#x20; Given: subtotal dan komponen biaya telah dimasukkan.

&#x20; 

&#x20; Then: setiap komponen ditampilkan terpisah, urutan kalkulasi sesuai konfigurasi yang disetujui, dan total per peserta konsisten dengan total akhir.



12.2 Test coverage yang wajib

Test ID	Area	Pengujian

TEST-001–004	Kalkulasi utama	Bagi rata, rounding, split item, biaya

TEST-005	Persentase	Persen nol, nilai valid, nilai invalid

TEST-006	Nominal	Nilai nol, batas minimum/maksimum

TEST-007	Peserta	Tambah, hapus, ubah nama

TEST-008	Item	Tambah, ubah harga/kuantitas, alokasi

TEST-009	Diskon	Nominal dan persen, termasuk batas diskon

TEST-010	Tip	Nominal dan persen sesuai aturan alokasi

TEST-011	Konsistensi	Jumlah total per orang sama dengan total tagihan

TEST-012	Share	Clipboard, Web Share API, fallback

TEST-013	Aksesibilitas	Keyboard, label, fokus, pesan error

TEST-014	Privacy	Tidak ada payload tagihan pada request

TEST-015	Responsif	Ponsel, tablet, desktop

TEST-016	Recovery	Memperbaiki input invalid setelah error



12.3 Definition of Done

Sebuah fitur dianggap selesai jika:

\- \[x] Requirement terkait sudah diimplementasikan.

\- \[x] Acceptance criteria terpenuhi.

\- \[x] Unit test untuk kalkulasi terkait lulus.

\- \[x] Hasil diuji untuk nilai batas dan pembulatan.

\- \[x] Validasi dan pesan kesalahan tersedia.

\- \[x] Tampilan ponsel dan desktop diuji.

\- \[x] Tidak ada kebocoran data sesi ke server yang tidak direncanakan.

\- \[x] Perubahan kode telah direview dan tidak merusak fitur yang ada.

13\. Release plan

Tahap	Deliverable	Gate

R1 — Specification	PRD dan aturan kalkulasi disetujui	ACC PRD

R2 — Design	UX Architecture dan DESIGN.md	ACC desain

R3 — Build	Kalkulator, dua mode split, biaya, hasil, share	Feature tests lulus

R4 — QA	Test suite, aksesibilitas, responsif, privacy	Acceptance tests lulus

R5 — Release	Deployment awal dan pemeriksaan produksi	Smoke test lulus



Tidak ada komitmen tanggal rilis pada tahap ini karena framework, hosting, dan kapasitas tim belum ditentukan.

14\. Risiko dan keputusan terbuka

14.1 Risiko utama

ID	Risiko	Mitigasi

RISK-001	Basis pengenaan pajak salah diasumsikan	Jadikan aturan eksplisit dan verifikasi dengan sumber resmi yang relevan

RISK-002	Pembagian akhir tidak sama dengan total	Unit test dan algoritme rounding deterministik

RISK-003	Pengguna kesulitan memasukkan item di ponsel	Input ringkas dan pengujian usability

RISK-004	Pengguna mengira hasil sebagai ketetapan pajak resmi	Jelaskan bahwa kalkulasi mengikuti input dan aturan yang dipilih

RISK-005	Share tidak didukung browser	Fallback salin teks

RISK-006	Scope melebar	Tunda OCR, riwayat cloud, dan integrasi pembayaran



14.2 Open decisions

Rekomendasi berikut belum dianggap sebagai keputusan yang dikonfirmasi.

ID	Keputusan	Rekomendasi	Dampak

OD-001	Urutan diskon, service charge, pajak, dan tip	Definisikan urutan eksplisit yang bisa diperiksa pengguna	Akurasi total

OD-002	Basis pajak	Jangan mengasumsikan basis universal; sediakan pengaturan yang sesuai kebutuhan dan kebijakan struk	Perhitungan pajak

OD-003	Alokasi biaya global pada mode item	Proporsional terhadap subtotal masing-masing peserta	Keadilan pembagian

OD-004	Tip pada mode item	Proporsional terhadap subtotal peserta sebagai default	Pembagian tip

OD-005	Penyimpanan sesi	Tidak disimpan permanen pada MVP	Privasi dan kompleksitas

OD-006	Preset tarif	Tidak wajib pada MVP	Menghindari tarif usang

OD-007	Framework dan hosting	Evaluasi di tahap Architecture \& Tech Stack	Biaya dan maintainability

OD-008	Batas input	Tetapkan berdasarkan pengujian dan kebutuhan produk	Validasi dan keamanan



15\. Traceability dan status proyek

15.1 Mapping requirement ke screen dan test

Requirement	Screen	Test

FR-001–005	SCR-001	TEST-001, 005–007

FR-006–010	SCR-002	TEST-003, 008

FR-011–016	SCR-003	TEST-004–010

FR-017–020	SCR-004	TEST-001–004, 011

FR-021–023	SCR-005	TEST-012

FR-024–028	Seluruh screen	TEST-013, 015–016

SEC-001–006	Seluruh aplikasi	TEST-014



15.2 Ringkasan keputusan

Sudah dikonfirmasi

\- Web responsif.

\- Split rata dan berdasarkan pesanan.

\- Tarif pajak dan service charge dapat diatur.

\- Tanpa login.

\- Tip, diskon, dan fitur berbagi hasil termasuk MVP.

Masih asumsi

\- Bahasa Indonesia dan Rupiah sebagai default.

\- Kalkulasi dilakukan di browser tanpa penyimpanan permanen.

\- Biaya bersama dibagi proporsional terhadap subtotal peserta sebagai rekomendasi awal.

Belum diputuskan

\- Formula dan urutan pajak, diskon, service charge, dan tip.

\- Kebijakan pembulatan final.

\- Framework, hosting, domain, dan batas input.

