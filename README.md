# MPS SaaS Kaynak Planlama Platformu

Bu proje, Korgün ERP sistemi üzerinde çalışan, plastik enjeksiyon odaklı, çoklu firma (multi-tenant) destekli bir Master Production Schedule (MPS) uygulamasıdır.

## 🏗️ Proje Yapısı
- **Frontend:** React + Vite + TypeScript (Premium Glassmorphism UI)
- **Backend:** Node.js + Express (Dinamik SQL Server Bağlantı Yönetimi)
- **Database:** MSSQL (Merkezi SaaS DB + Uzak ERP DB'leri)

## 🚀 Hızlı Başlangıç

### 1. Veritabanı Kurulumu
Merkezi SQL Server üzerinde `sql/setup_central_db.sql` dosyasındaki scripti çalıştırarak `MPS_Central` veritabanını oluşturun.

### 2. Backend (Sunucu) Yapılandırması
`server` klasörü altında bir `.env` dosyası oluşturun ve aşağıdaki bilgileri firmanıza göre doldurun:
```env
PORT=5000
DB_HOST=localhost
DB_USER=sa
DB_PASSWORD=your_password
DB_CENTRAL_NAME=MPS_Central
JWT_SECRET=mps_super_secret_key
```

### 3. Uygulamayı Çalıştırma
Terminale aşağıdaki komutları sırasıyla yazın:

**Sunucuyu Başlatmak İçin:**
```powershell
node server/index.js
```

**Frontend'i Başlatmak İçin:**
```powershell
npm run dev
```

## 🛠️ Önemli Özellikler
1. **Multi-Tenancy:** Her firma kendi uzak SQL Server'ına bağlanır.
2. **Lisans Takibi:** Lisans süresi dolan firmalar otomatik engellenir.
3. **Audit Log:** Yapılan her sürükle-bırak işlemi merkezi log tablosuna yazılır.
4. **Premium UI:** Tamamen karanlık mod, cam efekti (glassmorphism) ve neon renklerle tasarlanmıştır.

---
© 2026 MPS Platform | Proje Analiz ve Tasarımı: Antigravity AI
