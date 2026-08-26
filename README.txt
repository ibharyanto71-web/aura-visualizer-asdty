AURA VISUALIZER ASDTY V16 — PWA FINAL TEST BUILD
Tujuan: pengujian nyata di HP/Chrome.

Checklist:
1. Host folder di HTTPS (atau localhost).
2. Buka index.html melalui server, bukan file://.
3. Install dari tombol/browser Add to Home Screen.
4. Izinkan kamera.
5. Ambil foto atau pilih galeri.
6. Jalankan Scan & Analisis.
7. Uji Profile, Journal, Before → After, dan Aura Report.
8. Tutup aplikasi lalu buka lagi untuk menguji cache PWA.

Catatan:
- Service Worker/cache bekerja pada HTTPS atau localhost.
- Model MediaPipe dan model pose masih berasal dari CDN; scan pertama membutuhkan internet.
- Riwayat scan disimpan di localStorage perangkat.
- Hasil adalah visualisasi interpretatif berbasis foto/pose AI, bukan pengukuran aura/energi astral atau diagnosis medis.
