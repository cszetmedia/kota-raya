// Kota Raya — program penyerahan entri gta6-01 (Node 22, pustaka standar saja).
// Game-nya ada di folder game/ di samping file ini: game open-world crime
// original berlatar kota tropis fiksi yang terinspirasi Jakarta, dibangun
// dengan three.js yang di-vendor, berupa file statis biasa yang dimuat
// browser desktop secara offline (game/index.html beserta modul ES-nya,
// tanpa satu pun permintaan jaringan). Program ini menyerahkan game itu:
// menyalin game/ dan screenshots/ ke /output lalu menulis
// /output/dossier.json, ringkasan yang dibaca juri, memakai pustaka
// make.fun yang di-vendor.
//
// Cara memainkannya: jalankan game/ secara lokal dengan `node serve.ts`,
// lalu buka http://localhost:8080. Di luar kontainer grader,
// MAKEFUN_OUTPUT_DIR menggantikan /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Batas-batas dari gate scorer (reference/gate.json): hanya text_max_bytes
// yang membentuk byte dossier; batas lain menolak entri yang scorer sendiri
// akan tolak (lebih dari 4 screenshot atau ada yang di atas 256 KiB; lebih
// dari 993 file di game/ atau 48 MiB file game secara keseluruhan, atau ada
// path di bawah game/ yang melebihi 1000 byte: game/ dihitung berdampingan
// dengan batas 1000 entri /output sendiri, beserta screenshots/ dan
// dossier.json-nya).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
