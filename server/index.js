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

// 1. CORS Middleware (GitHub Pages ve Yerel Geliştirme İçin)
const allowedOrigins = [
    'https://consulate67-lab.github.io',
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(cors({
    origin: (origin, callback) => {
        // Localhost, GitHub Pages veya boş originlere (Postman vb.) izin ver
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('github.io')) {
            callback(null, true);
        } else {
            // Hata ayıklama sürecinde tüm originlere izin verelim
            callback(null, true);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Manuel CORS Header Injection (Emniyet Kilidi)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    next();
});
app.options('*', cors());

// 2. Request Logging (Hata Ayıklama İçin)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 3. Body Parser
app.use(express.json());

// 4. Health & Root (CORS sonrası)
app.get('/', (req, res) => res.send('MPS API Server is Running...'));
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));



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

// Veritabanı Otomatik Migrasyon (Tablo ve Sütun Kontrolü)
async function runMigrations() {
    try {
        console.log('Veritabanı kontrol süreci başlatıldı...');

        // 1. Tabloları Oluştur
        const setupQueries = [
            `CREATE TABLE IF NOT EXISTS system_tenants (
                tenant_id SERIAL PRIMARY KEY,
                firma_adi VARCHAR(255) NOT NULL,
                db_host VARCHAR(255) NOT NULL,
                db_name VARCHAR(100) NOT NULL,
                db_user VARCHAR(100) NOT NULL,
                db_pass VARCHAR(255) NOT NULL,
                license_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                license_end TIMESTAMP NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                ins_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                upd_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS system_users (
                user_id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES system_tenants(tenant_id),
                username VARCHAR(50) NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'Planlamaci',
                is_active BOOLEAN DEFAULT TRUE
            )`
        ];

        for (let sql of setupQueries) {
            await pgPool.query(sql);
        }

        // 2. Eksik Sütunları Ekle
        const columnMigrations = [
            'ALTER TABLE system_tenants ADD COLUMN IF NOT EXISTS email VARCHAR(255)',
            'ALTER TABLE system_tenants ADD COLUMN IF NOT EXISTS admin_user VARCHAR(255)',
            'ALTER TABLE system_tenants ADD COLUMN IF NOT EXISTS admin_pass VARCHAR(255)',
            'ALTER TABLE system_tenants ADD COLUMN IF NOT EXISTS processes TEXT[]'
        ];

        for (let sql of columnMigrations) {
            await pgPool.query(sql);
        }

        console.log('✅ Veritabanı yapısı (Tablolar & Sütunlar) güncel.');
    } catch (err) {
        console.error('❌ Migrasyon Hatası:', err);
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
    let tenantData = null;
    
    if (redis) {
        try {
            tenantData = await redis.get(cacheKey);
            if (tenantData) tenantData = JSON.parse(tenantData);
        } catch (e) {
            console.warn('Redis read error:', e.message);
        }
    }

    if (!tenantData) {
        // PG'den oku
        const result = await pgPool.query(
            'SELECT db_host, db_name, db_user, db_pass, license_end, is_active FROM system_tenants WHERE tenant_id = $1',
            [tenantID]
        );

        if (result.rows.length === 0) throw new Error('Firma bulunamadı.');
        tenantData = result.rows[0];

        // Redis'e yaz (1 saatlik cache)
        if (redis) {
            try {
                await redis.set(cacheKey, JSON.stringify(tenantData), 'EX', 3600);
            } catch (e) {
                console.warn('Redis write error:', e.message);
            }
        }
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

// Şirketleri Getir (Login Ekranı İçin - Sadece Ad ve Id)
app.get('/api/public/tenants', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT tenant_id as id, firma_adi as name FROM system_tenants WHERE is_active = true ORDER BY firma_adi');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Şirketleri Getir (Admin Paneli İçin)
app.get('/api/admin/tenants', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT tenant_id as id, firma_adi as name, db_host as host, db_name as db, db_user as "dbUser", db_pass as "dbPass", license_end as "licenseEnd", is_active as status, email, admin_user as "adminUser", admin_pass as "adminPass", processes FROM system_tenants ORDER BY tenant_id');

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
        console.log('Firma ekleme isteği:', { name, host, db, email });

        if (!name || !host || !db) {
            return res.status(400).json({ error: 'Firma adı, host ve veritabanı adı zorunludur.' });
        }

        const result = await pgPool.query(
            'INSERT INTO system_tenants (firma_adi, db_host, db_name, db_user, db_pass, email, license_end, processes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING tenant_id',
            [name, host, db, dbUser || 'sa', dbPass || '', email, licenseEnd || '2026-12-31', ['Enjeksiyon', 'Montaj']]
        );
        res.json({ success: true, tenantId: result.rows[0].tenant_id });
    } catch (err) {
        console.error('❌ Firma ekleme hatası (Route):', err);
        res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
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

// Şirket Bilgilerini Güncelle
app.put('/api/admin/tenants/:id', async (req, res) => {
    const { name, host, db, dbUser, dbPass, email, licenseEnd, adminUser, adminPass, processes, status } = req.body;
    try {
        const isActive = status === 'Aktif' || status === true;
        await pgPool.query(
            `UPDATE system_tenants SET 
                firma_adi = $1, db_host = $2, db_name = $3, db_user = $4, db_pass = $5, 
                email = $6, license_end = $7, admin_user = $8, admin_pass = $9, 
                processes = $10, is_active = $11, upd_dt = CURRENT_TIMESTAMP 
             WHERE tenant_id = $12`,
            [name, host, db, dbUser, dbPass, email, licenseEnd, adminUser, adminPass, processes, isActive, req.params.id]
        );
        // Redis cache temizliği
        if (redis) await redis.del(`tenant:${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        console.error('Firma güncelleme hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// Şirketi Sil
app.delete('/api/admin/tenants/:id', async (req, res) => {
    try {
        // Önce kullanıcıları silmek gerekebilir (Eğer ON DELETE CASCADE yoksa)
        await pgPool.query('DELETE FROM system_users WHERE tenant_id = $1', [req.params.id]);
        await pgPool.query('DELETE FROM system_tenants WHERE tenant_id = $1', [req.params.id]);
        if (redis) await redis.del(`tenant:${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        console.error('Firma silme hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// Personeli Sil
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await pgPool.query('DELETE FROM system_users WHERE user_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Kullanıcı silme hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// Şirket Lokasyonlarını Getir (Parametre Havuzu)
app.get('/api/locations', async (req, res) => {
    const authHeader = req.headers.authorization;
    console.log(`[DEBUG] /api/locations Header:`, authHeader ? 'Mevcut' : 'EKSİK');
    if (!authHeader) return res.status(401).send('Yetkisiz.');
    let tenantId = null;
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'mps_secret_key');
        tenantId = decoded.tenantId;
        const pool = await getTenantPool(tenantId);
        // Projenin ERP yapısına uygun olarak lokasyon tablosu si_lok olarak güncellendi
        const result = await pool.request().query('SELECT location as id, LName as name FROM location ORDER BY Location');
        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Lokasyon listesi hatası (Detailed):', {
            message: err.message,
            stack: err.stack,
            tenantId: tenantId
        });
        res.status(500).json({ error: 'Lokasyonlar yüklenemedi: ' + err.message });
    }
});

import getMrpQuery from './mrp_query_clean.js';

// Production Orders for Planning
app.get('/api/production/orders', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send('Yetkisiz.');

    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'mps_secret_key');
        const pool = await getTenantPool(decoded.tenantId);

        // Canlı üretim emirlerini ve detaylarını çekelim
        const result = await pool.request().query(`
            SELECT TOP 50
                ue.EmirNo as id,
                ue.EmirNo as workOrderNo,
                ue.ModelKod as productName,
                'M1' as machineId, -- Şimdilik varsayılan makine
                DATEADD(hour, 8, CAST(CAST(GETDATE() AS DATE) AS DATETIME)) as startTime,
                DATEADD(hour, 12, CAST(CAST(GETDATE() AS DATE) AS DATETIME)) as endTime,
                isNull(ue.Goz, 1) as cavityCount,
                isNull(ue.Cevrim, 30) as cycleTime,
                30 as setupTime,
                isNull(ue.Miktar, 0) as orderQty,
                45 as progress,
                '#4facfe' as color
            FROM Urt_Emir ue
            ORDER BY ue.Ins_Date DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Orders Hatası:', err.message);
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
        console.log(`[MRP DEBUG] İstek Alındı. Lokasyon: ${location}, Tenant: ${decoded.tenantId}`);
        const pool = await getTenantPool(decoded.tenantId);
        
        console.log(`[DB INFO] Bağlanılan Sunucu: ${pool.config.server}, Veritabanı: ${pool.config.database}`);

        const mpsSql = getMrpQuery(location || 'K0001');
        
        console.log(`[QUERY START] SQL Batch gönderiliyor... (Sorgu uzunluğu: ${mpsSql.length} karakter)`);

        const result = await pool.request()
            .batch(mpsSql); 

        console.log(`[QUERY SUCCESS] Sorgu tamamlandı. Dönen satır sayısı: ${result.recordset?.length || 0}`);

        if (!result.recordset || result.recordset.length === 0) {
            console.warn('[MRP WARNING] Sorgu başarılı oldu ama hiç sonuç dönmedi (0 satır).');
        }

        res.json(result.recordset || []);
    } catch (err) {
        console.error('❌ MRP KRİTİK HATA:', {
            message: err.message,
            stack: err.stack,
            code: err.code
        });
        res.status(500).json({ error: 'MRP Sorgu Hatası: ' + err.message });
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

// Global Hata Yakalayıcılar (Process Crash Koruması)
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Yakalanamayan Promise Hatası:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Yakalanamayan Kritik Hata:', err);
    // Bazı durumlarda process'i kapatmak yerine hayatta tutmaya çalışalım
});
