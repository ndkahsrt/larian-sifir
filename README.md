# 🏛️ Larian Sifir: Temple Math Runner (Sifir 2 hingga 12)

Gamifikasi pendidikan matematik berkonsepkan **3D Endless Runner** (inspirasi permainan *Temple Run*). Pemain berlari menempuh kuil purba dan mesti memilih sama ada lorong **KIRI** atau **KANAN** yang mengandungi jawapan sifir yang betul untuk terus mara!

---

## 🎮 Cara Memulakan Permainan

1. Buka folder projek:
   ```
   C:\Users\SKPENDIDIKANKHASSELA\.gemini\antigravity\scratch\gamifikasi-sifir-runner\
   ```
2. Klik dua kali (double click) pada fail **`index.html`** untuk membukanya di mana-mana pelayar web (Google Chrome, Microsoft Edge, Firefox, atau Safari).
3. Pilih mod sifir yang ingin dilatih (contohnya Sifir 2 hingga 5, Sifir 6 hingga 9, atau Sifir Penuh 2 hingga 12).
4. Tekan butang **"🚀 MULA BERLARI!"** dan selamat mengembara!

---

## 🕹️ Kawalan Permainan

| Peranti | Kawalan Lorong Kiri | Kawalan Lorong Kanan |
| :--- | :--- | :--- |
| **Papan Kekunci (Komputer / Komputer Riba)** | Anak Panah Kiri `◄` atau Huruf `A` | Anak Panah Kanan `►` atau Huruf `D` |
| **Skrin Sentuh (Telefon Pintar / Tablet / Smartboard)** | Leret (Swipe) ke Kiri ATAU Tekan butang `◄ KIRI` | Leret (Swipe) ke Kanan ATAU Tekan butang `KANAN ►` |

---

## 🌟 Ciri-Ciri Utama Gamifikasi

1. **Grafik 3D Penuh (Three.js)**:
   - Watak pelari kembara (safari explorer) dengan animasi ayunan kaki dan tangan.
   - Lorong kuil purba berterusan dengan dinding batu, tiang kuil, obor api menyala, dan rimbunan pokok rimba.
   - Pintu gerbang matematik 3D yang megah dengan paparan soalan di bahagian atas dan papan jawapan di lorong kiri & kanan.

2. **Pedagogi Matematik Pintar (Smart Distractor)**:
   - Jawapan salah bukan sekadar nombor rawak, tetapi dijana berdasarkan miskonsepsi lazim murid (contohnya sifir jiran $\pm 1$, penambahan berbanding pendaraban, atau digit terbalik).
   - Memupuk kemahiran berfikir pantas dan kecekapan operasi darab congak.

3. **Maklum Balas Pembelajaran Segera (Instant Feedback Loop)**:
   - **Jawapan Betul**: Letupan partikel emas berkilauan, bunyi kemenangan ceria, peningkatan Kombo (`2x`, `3x`, `4x`), pertambahan skor, dan kata-kata perangsang ("HEBAT!", "BIJAK!", "TEPAT SEKALI!").
   - **Jawapan Salah**: Skrin bergegar, nyawa berkurang (3 Hati), dan notifikasi memaparkan jawapan sebenar serta-merta supaya murid dapat belajar dari kesilapan.

4. **Sistem Audio Sintesis (Web Audio API)**:
   - Kesan bunyi (SFX) yang dinamik (whoosh lorong, ping syiling, fanfare betul, thud salah).
   - Muzik latar gendang kembara purba tanpa memerlukan sebarang fail audio luaran.
   - Dilengkapi butang pasang/senyap suara (Mute toggle).

5. **Laporan & Ulang Kaji (Game Over Review)**:
   - Skor akhir, peratus ketepatan jawapan (Accuracy %), dan rekod kombo tertinggi.
   - **Senarai Semakan Kesilapan**: Menyenaraikan soalan-soalan yang tersilap jawab beserta jawapan yang betul untuk tindakan susulan guru atau murid.

---

## 📂 Struktur Fail

- **`index.html`** — Antara muka utama, paparan HUD, banner soalan, modal pemilihan sifir dan keputusan.
- **`style.css`** — Reka bentuk bertema kembara rimba & kuil purba (responsif untuk desktop & mobile).
- **`game.js`** — Enjin 3D Three.js, mekanik larian lorong, pergerakan gerbang, perlanggaran, dan zarah.
- **`mathEngine.js`** — Penjana soalan sifir 2 hingga 12 dan logik jawapan pengganggu.
- **`audio.js`** — Enjin bunyi dan muzik kembara Web Audio API tanpa kebergantungan luar.
