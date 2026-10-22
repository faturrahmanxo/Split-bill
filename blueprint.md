Project Blueprint v1.0 — Status

Rancangan awal sudah disusun berdasarkan keputusan yang Anda konfirmasi. Namun, pembuatan file Markdown untuk diunduh belum berhasil, jadi dokumen ini belum tersedia sebagai file terlampir. Fitur Data Analysis diperkirakan tersedia kembali dalam sekitar 14 jam 50 menit, tetapi waktu tersebut bukan jaminan.



Berikut ringkasan keputusan dan rancangan yang menjadi dasar dokumen.

Kalkulator Split Bill \& Pajak

Draft v1.0



Project Blueprint · 22 Oktober 2026



Platform



Web responsif, mobile-first, tanpa login.





Mesin kalkulasi



Split rata dan berdasarkan pesanan, dengan konfigurasi pajak, service charge, tip, dan diskon.





Hasil



Rincian tagihan per orang, pembulatan konsisten, salin hasil, dan berbagi melalui fitur browser yang didukung.





Privasi



Rekomendasi kalkulasi di browser, tanpa penyimpanan server pada MVP.







Keputusan dan asumsi utama

ID	Keputusan

KAU-001–005	Platform, mode split, pengaturan tarif, tanpa login, dan fitur tambahan sudah dikonfirmasi

KAU-006	Bahasa Indonesia dan Rupiah menjadi default sementara

KAU-007	Data kalkulasi tidak disimpan permanen di server

BR-001	Perhitungan uang harus menghindari kesalahan floating-point

BR-008	Pembulatan harus memastikan total bagian sama dengan total tagihan

RISK-001	Basis dan urutan pajak serta service charge harus diperjelas



Keputusan yang masih terbuka: urutan kalkulasi diskon, pajak, service charge, dan tip; cara membagi biaya global secara proporsional; serta pilihan framework dan hosting.

Struktur dokumen yang disiapkan

1\. Document Control

2\. Executive Summary

3\. Problem dan Opportunity

4\. Vision, Goals, dan Success

5\. Target Users dan Actors

6\. Scope MVP dan Post-MVP

7\. Feature Map dengan ID requirement

8\. Core User Journeys

9\. Page and Screen Inventory

10\. Business Model and Rules

11\. Conceptual Data Model

12\. Integration Needs

13\. Nonfunctional Baseline

14\. Security, Privacy, dan Trust

15\. Architecture Direction

16\. Delivery Estimate and Dependencies

17\. Risks and Mitigations

18\. Open Decisions

19\. Next Stage Recommendation

