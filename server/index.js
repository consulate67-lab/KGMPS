import express from 'express';
// Deployment Status: Active - Production Ready
import mssql from 'mssql';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;
import Redis from 'ioredis';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;

app.use(express.json());
app.use(cors());



console.log('--- MPS Server Başlatılıyor ---');
console.log('PORT:', PORT);
console.log('DB:', !!(process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL));
console.log('REDIS:', !!process.env.REDIS_URL);

// Production'da built dosyaları sunmak için
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

if (fs.existsSync(distPath)) {
    console.log('✅ "dist" klasörü bulundu.');
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
        console.log('✅ "index.html" mevcut.');
    } else {
        console.error('❌ "index.html" BULUNAMADI!');
    }
} else {
    console.error('❌ "dist" klasörü BULUNAMADI! Build işlemi başarısız olmuş olabilir.');
}

// --- Railway Entegrasyonu ---

// 1. Merkezi Veritabanı (PostgreSQL)
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    ssl: { rejectUnauthorized: false }
});



pgPool.on('error', (err) => {
    console.error('PostgreSQL Beklenmedik Hata:', err);
});

// Veritabanı Otomatik Migrasyon (Eksik Sütunları Ekle)
async function runMigrations() {
    try {
        console.log('Veritabanı kontrol ediliyor...');
        await pgPool.query(`
            ALTER TABLE system_tenants ADD COLUMN IF NOT EXISTS email VARCHAR(255);
            ALTER TABLE system_tenants ADD COLUMN IF NOT EXISTS admin_user VARCHAR(255);
            ALTER TABLE system_tenants ADD COLUMN IF NOT EXISTS admin_pass VARCHAR(255);
            ALTER TABLE system_tenants ADD COLUMN IF NOT EXISTS processes TEXT[];
        `);
        console.log('✅ Veritabanı migrasyonu tamamlandı.');
    } catch (err) {
        console.error('❌ Migrasyon Hatası:', err.message);
    }
}
runMigrations();

// 2. Önbellek (Redis) - URL yoksa hata vermemesi için koruma
let redis;
if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
    redis.on('error', (err) => console.error('Redis Bağlantı Hatası:', err));
} else {
    console.warn('UYARI: REDIS_URL tanımlanmamış, cache devre dışı kalabilir.');
}

// 3. Dinamik MSSQL Connection Pool Önbelleği (Bellekte tutulmaya devam edebilir, bağlantılar hafiftir)
const tenantPools = new Map();

/**
 * Tenant ID'ye göre Uzaktaki (Müşteri) SQL Server'a bağlanma
 */
async function getTenantPool(tenantID) {
    if (tenantPools.has(tenantID)) return tenantPools.get(tenantID);

    // Redis'te tenant ayarlarını kontrol et (Sürekli PG'ye gitmemek için)
    const cacheKey = `tenant:${tenantID}`;
    let tenantData = await redis.get(cacheKey);
    
    if (tenantData) {
        tenantData = JSON.parse(tenantData);
    } else {
        // PG'den oku
        const result = await pgPool.query(
            'SELECT db_host, db_name, db_user, db_pass, license_end, is_active FROM system_tenants WHERE tenant_id = $1',
            [tenantID]
        );
        
        if (result.rows.length === 0) throw new Error('Firma bulunamadı.');
        tenantData = result.rows[0];
        
        // Redis'e yaz (1 saatlik cache)
        await redis.set(cacheKey, JSON.stringify(tenantData), 'EX', 3600);
    }

    // Lisans Kontrolü
    if (!tenantData.is_active || new Date(tenantData.license_end) < new Date()) {
        throw new Error('Firma lisansı dolmuş veya pasif durumda.');
    }

    // Uzak MSSQL Yapılandırması
    const tenantConfig = {
        user: tenantData.db_user,
        password: tenantData.db_pass,
        server: tenantData.db_host,
        database: tenantData.db_name,
        options: { encrypt: false, trustServerCertificate: true },
        pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
    };

    const newPool = new mssql.ConnectionPool(tenantConfig);
    await newPool.connect();
    
    tenantPools.set(tenantID, newPool);
    return newPool;
}

// --- Routes ---

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password, tenantID } = req.body;
    try {
        const result = await pgPool.query(
            'SELECT user_id, password, role FROM system_users WHERE username = $1 AND tenant_id = $2 AND is_active = true',
            [username, tenantID]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Hatalı kullanıcı veya firma seçimi.' });
        }
        
        const user = result.rows[0];
        if (password !== user.password) {
            return res.status(401).json({ error: 'Hatalı şifre.' });
        }

        const token = jwt.sign({ 
            userId: user.user_id, 
            tenantId: tenantID, 
            role: user.role 
        }, process.env.JWT_SECRET || 'mps_secret_key', { expiresIn: '1d' });

        res.json({ token, role: user.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Şirketleri Getir (Admin Paneli İçin)
app.get('/api/admin/tenants', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT tenant_id as id, firma_adi as name, db_host as host, db_name as db, license_end as "licenseEnd", is_active as status, email, admin_user as "adminUser", admin_pass as "adminPass", processes FROM system_tenants ORDER BY tenant_id');
        
        // Frontend formatına dönüştür
        const tenants = result.rows.map(t => ({
            ...t,
            status: t.status ? 'Aktif' : 'Pasif',
            processes: t.processes || ['Enjeksiyon', 'Montaj'], // Varsayılan süreçler
            users: []
        }));
        
        res.json(tenants);
    } catch (err) {
        console.error('Liste çekme hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// Yeni Şirket Ekle (Admin Yetkisi)
app.post('/api/admin/tenants', async (req, res) => {
    const { name, host, db, dbUser, dbPass, email, licenseEnd } = req.body;
    try {
        console.log('Firma ekleme isteği:', req.body);
        const result = await pgPool.query(
            'INSERT INTO system_tenants (firma_adi, db_host, db_name, db_user, db_pass, email, license_end, processes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING tenant_id',
            [name, host, db, dbUser || 'sa', dbPass, email, licenseEnd, ['Enjeksiyon', 'Montaj']]
        );
        res.json({ success: true, tenantId: result.rows[0].tenant_id });
    } catch (err) {
        console.error('Firma ekleme hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// Şirket Personellerini Getir
app.get('/api/admin/tenants/:id/users', async (req, res) => {
    try {
        const result = await pgPool.query(
            'SELECT user_id as id, username, role FROM system_users WHERE tenant_id = $1',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Personel Ekle (Admin Yetkisi)
app.post('/api/admin/users', async (req, res) => {
    const { username, password, tenantId, role } = req.body;
    try {
        const result = await pgPool.query(
            'INSERT INTO system_users (tenant_id, username, password, role) VALUES ($1, $2, $3, $4) RETURNING user_id',
            [tenantId, username, password, role || 'Planlamaci']
        );
        res.json({ success: true, userId: result.rows[0].user_id });
    } catch (err) {
        console.error('Kullanıcı ekleme hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// Firma Lokasyonlarını Getir
app.get('/api/locations', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send('Yetkisiz.');

    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'mps_secret_key');
        const pool = await getTenantPool(decoded.tenantId);
        const result = await pool.request().query('SELECT DISTINCT Location FROM si_gchar WHERE Location <> \'\' ORDER BY Location');
        res.json(result.recordset.map(r => r.Location));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Master Production Schedule & MRP Optimization
app.get('/api/production/mrp', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send('Yetkisiz.');

    const { location } = req.query;

    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'mps_secret_key');
        const pool = await getTenantPool(decoded.tenantId);
        
        const mpsSql = `
            DECLARE @Loc nvarchar(20) = @location;
            WITH PurchaseTermins AS (
                SELECT 
                    sh.SKod, sh.RKod, sh.BedKod,
                    MIN(sh.TerminTarihi) as EnYakinTermin,
                    SUM(isNull(sh.Miktar,0) - isNull(sh.TeslimMiktar,0)) as BekleyenMik
                FROM siparis_kay sk
                JOIN siparis_har sh ON sk.SipNo = sh.SipNo
                WHERE sk.SipTip = 'A' 
                  AND sk.Location = @Loc
                  AND (sh.Durum = '' OR sh.Durum IS NULL)
                  AND (sh.Miktar > isNull(sh.TeslimMiktar,0))
                GROUP BY sh.SKod, sh.RKod, sh.BedKod
            ),
            CurrentStock AS (
                SELECT 
                    SKod, RKod, BedKod,
                    SUM(isNull(Giren,0) - isNull(Cikan,0)) as NetStok
                FROM si_gchar
                WHERE Location = @Loc
                GROUP BY SKod, RKod, BedKod
            )
            SELECT 
                sk.SipNo, sh.SipHarinx, sk.CariKod, cr.CName as Musteri,
                sh.SKod as UrunKod, st1.Tanim as UrunAd,
                pd.SKod as HamKod, st2.Tanim as HamAd,
                pd.Miktar * (sh.Miktar - isNull(sh.SevkMiktar,0)) as GerekenMik,
                isNull(cs.NetStok, 0) as HamStok,
                pt.EnYakinTermin as TedarikTarihi,
                pt.BekleyenMik as YoldakiMik
            FROM siparis_kay sk
            JOIN siparis_har sh ON sk.SipNo = sh.SipNo
            JOIN model_PD pd ON sh.SKod = pd.ModelKod 
            LEFT JOIN StokKart st1 ON sh.SKod = st1.SKod
            LEFT JOIN StokKart st2 ON pd.SKod = st2.SKod
            LEFT JOIN Cari_Kart cr ON sk.CariKod = cr.CKod
            LEFT JOIN PurchaseTermins pt ON pd.SKod = pt.SKod
            LEFT JOIN CurrentStock cs ON pd.SKod = cs.SKod
            WHERE sk.SipTip = 'S' 
              AND sk.Location = @Loc
              AND (sh.Durum = '' OR sh.Durum IS NULL)
              AND (sh.Miktar > isNull(sh.SevkMiktar,0))
        `;

        const result = await pool.request()
            .input('location', mssql.NVarChar, location)
            .query(mpsSql);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// React SPA Catch-all (Express 5 ve Bulut Uyumlu En Güvenli Yöntem)
// Hiçbir rotaya uymayan tüm istekleri index.html'e yönlendirir.
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`MPS Server is LIVE on port ${PORT}`);
});
