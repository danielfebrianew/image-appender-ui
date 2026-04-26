# ContextClipper Frontend — TODO

Audit berdasarkan PRD, UI review, dan analisis codebase.
Diurutkan dari paling kritis ke polish.

---

## 🔴 P0 — Bug / Blocker

### B1. Render gagal 404
- [ ] Cek `api.ts` `startRender()` — pastikan endpoint URL cocok dengan backend (`/api/render` vs `/render`)
- [ ] Pastikan `NEXT_PUBLIC_API_URL` ada di `.env.local`
- [ ] Add `.env.local.example` agar dev baru tahu var apa yang dibutuhkan

### B2. Preview pane kosong meski durasi ke-detect
- [ ] Audit `PreviewPane.tsx` — pastikan `<video src>` di-set dari `videoMeta.url`
- [ ] Cek apakah CORS backend mengizinkan request dari dev server
- [ ] Cek `Content-Type` header dari backend untuk video file
- [ ] Jika URL-nya relatif path, resolusi ke absolute URL pakai `NEXT_PUBLIC_API_URL`

### B3. Floating "30%" badge muncul di preview kosong
- [ ] `PreviewPane.tsx` — kondisikan badge hanya tampil saat `videoMeta` ada dan video sudah loaded
- [ ] Anchor badge ke bottom-edge area overlay, bukan center canvas

### B4. Transport bar overlap dengan preview
- [ ] Cek z-index / spacing antara `PreviewPane` dan `Transport` di layout `EditorShell`
- [ ] Pastikan layout pakai flex column dengan gap yang tepat, bukan absolute positioning yang overlap

---

## 🟠 P1 — Missing Core Feature

### F1. Tidak ada UI untuk load / ganti video sumber
- [ ] Tambahkan video source picker di `Sidebar.tsx` — file input `<input type="file" accept="video/*">`
- [ ] Upload via `POST /api/projects/{id}/video` (atau endpoint yang sesuai backend)
- [ ] Update `videoMeta` di `useProjectStore` setelah upload sukses
- [ ] Empty state di `PreviewPane` — pesan "Drop a video file or click to upload" saat belum ada video

### F2. Tombol Render duplikat
- [ ] Ada tombol Render di header dan di `RenderPanel` — pilih satu
- [ ] Sesuai PRD: render button di header, `RenderPanel` hanya tampilkan status + log
- [ ] Saat render running, header button berubah jadi "Cancel" atau disabled dengan spinner

### F3. ImageLibrary — tombol `+` tidak berfungsi
- [ ] `ImageLibrary.tsx` — sambungkan tombol `+` ke `<input type="file">` tersembunyi untuk upload manual
- [ ] Reuse logic upload yang sudah ada di `EditorShell` (`handleFiles`)

### F4. ImageLibrary — tombol Refresh tidak berfungsi
- [ ] Tambahkan action `refreshImages` di `useProjectStore` — re-fetch images dari backend
- [ ] Sambungkan ke tombol refresh di `ImageLibrary.tsx`

### F5. Default zoom terlalu besar — ruler hanya tampil sampai 0:15 untuk video 47 detik
- [ ] `Timeline.tsx` atau `EditorShell.tsx` — saat project di-load, hitung zoom auto-fit:
  ```ts
  const autoZoom = (timelineWidthPx - LABEL_WIDTH) / videoDuration
  setZoom(clamp(autoZoom, MIN_ZOOM, MAX_ZOOM))
  ```
- [ ] Pastikan `TimelineRuler` interval marker menyesuaikan zoom (sudah ada logic, cek apakah triggered)

### F6. Page root redirect hardcode ke `/editor/demo`
- [ ] `app/page.tsx` saat ini redirect ke `/editor/demo`
- [ ] Untuk MVP: buat `/projects` page sederhana (list project atau "create new")
- [ ] Atau minimal: ubah flow agar demo project dibuat otomatis dari backend, bukan hardcode string "demo"

---

## 🟡 P2 — Layout & UX Bug

### L1. Save status indicator tidak akurat
- [ ] Saat ini bisa langsung tampil "Saved" di state awal
- [ ] Implementasi state machine yang benar di `EditorShell` / header:
  - `idle` → "—" atau kosong (project baru, belum ada edit)
  - `dirty` → "Unsaved changes"
  - `saving` → "Saving…"
  - `saved` → "Saved ✓"
  - `error` → "Error saving"
- [ ] Tipe `SaveStatus` sudah ada di `lib/types.ts`, tinggal pastikan UI-nya display dengan benar

### L2. Background color picker di sidebar tanpa label / hex value
- [ ] `Sidebar.tsx` — di sebelah `<input type="color">` tambahkan hex value display / text input
- [ ] Placeholder "Click to change" atau label eksplisit

### L3. Toggle Cover/Contain kontras rendah
- [ ] `Sidebar.tsx` — active state toggle pakai background `bg-purple-700` solid
- [ ] Inactive state: ghost dengan border tipis, bukan hanya text color change

### L4. Spacing sidebar section terlalu longgar
- [ ] Rapatkan gap antar section di `Sidebar.tsx` (12–16px, sesuai PRD §11)
- [ ] Pastikan volume slider click sound sudah tampil (ada di code tapi cek apakah di-render)

### L5. Label "Imgs" di timeline terpotong
- [ ] `Timeline.tsx` — pastikan label track row sejajar vertikal dengan track content-nya
- [ ] Empty state "Press Ctrl+V…" harus berada di dalam row track, bukan di luar area

### L6. RenderPanel — progress bar tampil saat idle
- [ ] `RenderPanel.tsx` — sembunyikan progress bar saat status `idle`
- [ ] Tampilkan saat `queued | running`
- [ ] Ganti dengan status badge saat `done | error`

### L7. Zoom level indicator "82 px/s" tidak user-friendly
- [ ] `Transport.tsx` — ubah display zoom dari `px/s` ke persentase relative, atau hapus saja
- [ ] Tombol +/- sudah cukup sebagai affordance zoom

---

## 🟢 P3 — Missing Polish (PRD §M4, §M5)

### P1. Keyboard shortcut reference tidak ada
- [ ] Tambahkan modal atau popover "Shortcuts" yang bisa dibuka dengan `?`
- [ ] List shortcut dari PRD §7.4 — cukup tabel sederhana

### P2. Paste image tidak ada feedback visual saat editor tidak focused
- [ ] `EditorShell.tsx` — saat editor focused/active, tampilkan subtle pulse outline atau indicator
- [ ] Ini sesuai catatan risiko PRD §18 ("User bingung paste tidak respond")

### P3. Tidak ada toast notification
- [ ] PRD §13: toast untuk save success, render done, network error
- [ ] Install `sonner` atau buat komponen toast minimal sendiri
- [ ] Wire ke: auto-save success, render done, upload error

### P4. Empty state halaman tidak ada video
- [ ] `PreviewPane.tsx` — empty state yang jelas: ikon video + teks "Upload a video to get started"
- [ ] Bukan blank area kosong

### P5. Context menu track di timeline belum ada
- [ ] Right-click di `ImageTrack.tsx` → menu: Delete, Duplicate, Split at playhead
- [ ] Saat ini Delete hanya via keyboard

### P6. Tidak ada loading skeleton saat project fetch
- [ ] `EditorShell.tsx` — saat `isLoading`, render skeleton layout bukan blank
- [ ] PRD §13: pakai skeleton, bukan spinner

### P7. `@dnd-kit/sortable` di-install tapi tidak dipakai
- [ ] Hapus dari `package.json` jika memang tidak akan dipakai (dead dependency)
- [ ] Atau gunakan untuk reorder tracks di image library

### P8. ImageLibrary — right-click delete saja, tidak ada rename
- [ ] PRD §10 menyebut right-click menu: Delete, Rename, "Use as default in current track"
- [ ] Minimal tambahkan Rename (inline edit nama)

### P9. Project list page belum ada
- [ ] PRD §M5: halaman `/projects` dengan list project
- [ ] Bisa sederhana: fetch `GET /api/projects`, render card grid

### P10. Export/import timeline JSON belum ada
- [ ] PRD §M5: export timeline sebagai JSON (untuk backup / share)
- [ ] Tombol di header atau sidebar: "Export JSON" / "Import JSON"

---

## 🔵 P4 — Code Quality

### C1. Magic numbers tidak ter-dokumentasi
- [ ] `store.ts` zoom default `82` — seharusnya `DEFAULT_ZOOM` di constants
- [ ] `EditorShell.tsx` debounce `800` — sudah bagus tapi bisa di-extract ke `lib/constants.ts`
- [ ] `timeline-math.ts` snap threshold `5` px — extract ke named constant

### C2. `RenderPanel` useEffect dependency array kosong
- [ ] `RenderPanel.tsx` — cek useEffect yang mungkin punya stale closure karena `[]` dependency
- [ ] Audit dan tambah deps yang seharusnya ada

### C3. Error display terlalu minimal
- [ ] `useProjectStore.lastError` ada tapi tidak jelas di-display di mana
- [ ] Pastikan ada error boundary atau inline error di komponen yang relevan

### C4. Tidak ada `.env.local.example`
- [ ] Buat file dengan isi:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8000
  NEXT_PUBLIC_WS_URL=ws://localhost:8000
  ```

### C5. `next.config.ts` kosong
- [ ] Tambahkan `images.remotePatterns` untuk domain backend agar `<Image>` Next.js bisa load dari backend
- [ ] Tambahkan `allowedDevOrigins` jika dev server port berbeda

---

## 📋 Checklist PRD Milestone Status

| Milestone | Status | Blocking Issues |
|---|---|---|
| M1 — Skeleton + connect backend | ⚠️ Partial | Preview kosong (B2), render 404 (B1) |
| M2 — Editing inti | ✅ Mostly done | Video source picker (F1), zoom default (F5) |
| M3 — Render flow | ⚠️ Partial | Render 404 (B1), WS mungkin belum tested |
| M4 — Polish UX | ❌ Not started | Shortcuts help, toast, snap polish |
| M5 — Quality of life | ❌ Not started | Project list, export/import |

---

## 🚫 Sengaja Di-Exclude (tidak perlu di-TODO)

Sesuai PRD §17, item berikut memang bukan scope MVP:
- Multi-user collaboration
- Mobile/tablet support
- Multiple simultaneous overlays
- Audio waveform di timeline
- Custom click sound upload
- Batch render
- Effects panel (rotate/opacity/filter)
- Theme switcher
