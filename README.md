# MejaKita Frontend 🍽️

Self-ordering & Kitchen Display System — dibangun dengan **React + Vite + Tailwind CSS**.

## Stack

| Layer     | Tech                          |
|-----------|-------------------------------|
| Framework | React 18 + Vite 5             |
| Styling   | Tailwind CSS v3 + Custom CSS  |
| State     | useState / useEffect (no Redux) |
| Auth      | JWT via localStorage          |
| Backend   | Node.js + Express + MySQL     |

## Struktur Folder

```
src/
├── components/         # Shared/reusable components
│   ├── BottomNav.jsx
│   ├── Confetti.jsx
│   ├── Loader.jsx
│   ├── MenuCard.jsx
│   ├── Navbar.jsx
│   ├── SkelCard.jsx
│   ├── Toast.jsx
│   └── VariantModal.jsx
├── pages/              # Halaman utama (1 file per page)
│   ├── AdminPage.jsx
│   ├── AkunPage.jsx
│   ├── AuthPage.jsx
│   ├── CartPage.jsx
│   ├── HomePage.jsx
│   ├── MenuPage.jsx
│   └── ProtectedAdmin.jsx
├── utils/
│   └── auth.js         # API config, auth helpers, formatters
├── styles/
│   └── index.css       # Global CSS + Tailwind directives
├── App.jsx             # Root component, routing, global state
└── main.jsx            # Entry point
```

## Cara Jalankan

```bash
# 1. Install dependencies
npm install

# 2. Pastikan backend berjalan di localhost:3000
# (lihat folder backend MejaKita)

# 3. Dev server
npm run dev

# 4. Build production
npm run build
```

## Halaman & Fitur

| Page       | Path (state) | Fitur                                     |
|------------|-------------|-------------------------------------------|
| Home       | `home`       | Hero, Loyalty stamp, Banner promo, Menu pilihan |
| Menu       | `menu`       | Grid menu, search, filter kategori, skeleton loader |
| Cart       | `cart`       | Cart items, ringkasan, checkout flow multi-step |
| Checkout   | (step dalam Cart) | Nomor meja → Metode bayar → QRIS/Tunai → Tracking |
| Akun       | `akun`       | Profil, riwayat pesanan, loyalty, logout  |
| Auth       | `login`/`register` | JWT login & register                |
| Admin      | `admin`      | KDS, Kasir, Menu CRUD, Promo, Ulasan      |

## Catatan UAS

- ✅ RESTful API (GET/POST/PUT/DELETE)
- ✅ JWT Auth (`verifyToken` + `isAdmin`)
- ✅ Database Transaction (checkout)
- ✅ Dynamic Promo System (`promo_settings`)
- ✅ Multer file upload
- ✅ Real-time order tracking (polling 5 detik)
- ✅ Varian menu (level kepedasan / suhu)
- ✅ QRIS & Tunai flow
- ⭐ Loyalty stamp card (5 pesanan → diskon 50%)
