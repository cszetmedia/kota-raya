# Kota Raya

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/competitions/gta6-01)
[![rank](https://make.fun/badge/gta6-01/cszetmedia/kota-raya/rank.svg)](https://make.fun/competitions/gta6-01)
[![reward](https://make.fun/badge/gta6-01/cszetmedia/kota-raya/reward.svg)](https://make.fun/competitions/gta6-01)

Entri untuk bounty [Make GTA 6 (gta6-01)](https://make.fun/competitions/gta6-01) di make.fun. Semua yang ada di sini — kota, tokoh, kendaraan, cerita, dan suara — dibuat sendiri dari nol, bukan dari game lain.

## Gamenya

**Kota Raya** adalah game open-world crime 3D yang berjalan di browser dari file statis. Raka, anak Kampung Melati, mencari nafkah di jalanan kota fiksi ala Jakarta: mengantar paket, menjemput penumpang, dan — kalau Bang Darma yang menyuruh — mencuri sedan merah pesanan, lalu kabur dari kejaran polisi.

Yang bisa dilakukan di dalam game:

- Jalan kaki dan mengemudi di kota seluas 480×480 meter dengan tujuh avenue, pantai di selatan, dan puluhan gedung.
- Lalu lintas hidup (14 mobil) dan pejalan kaki (26 orang) yang mondar-mandir di trotoar.
- Mencuri mobil: mobil traffic dan mobil parkir bisa diambil — tapi wanted naik dan polisi datang mengejar.
- Empat misi berurutan dengan cerita: Paket Kilat, Jemput Sari, Mobil Pesanan, dan Pelarian Terakhir.
- HUD lengkap dengan kecepatan, bintang wanted, uang, nyawa, objektif, dan minimap yang benar-benar tergambar.
- Simpanan progres di localStorage: tutup browser, buka lagi, misi dan uangmu tetap ada.
- Mode deterministik lewat `?seed=N` dan mode foto lewat `?shot=start|drive|chase|mission`.

## Cara main

Buka `game/index.html` lewat server statis apa saja (misalnya `node serve.ts`, lalu kunjungi http://127.0.0.1:8901). Kontrolnya:

- **WASD** — jalan kaki / mengemudi (W gas, S rem, A/D belok)
- **E** — masuk dan keluar mobil
- **Enter** — mulai game dan lanjut ke misi berikutnya

## Struktur

- `game/index.html` — halaman game (memuat Three.js vendored dan `src/main.js`)
- `game/src/` — 16 modul: konfigurasi, angka acak, state dunia, kota, input, pemain, kendaraan, pejalan kaki, polisi, misi, HUD, render, audio, simpanan, mode foto, dan perangkaian
- `game/vendor/three.min.js` — Three.js (vendored)
- `screenshots/` — 4 tangkapan layar asli dari game
- `main.ts` — entrypoint: menyalin game + screenshot ke output dan menulis `dossier.json`
- `serve.ts` — server statis untuk pengembangan
- `shots.json` — daftar 4 shot untuk tangkapan layar

## Lisensi

MIT — lihat `LICENSE`.
