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
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Production'da built dosyaları sunmak için
app.use(express.static(path.join(__dirname, '../dist')));

// --- Railway Entegrasyonu ---

// 1. Merkezi Veritabanı (PostgreSQL)
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    ssl: { rejectUnauthorized: false } // Railway için gerekli
});

// 2. Önbellek (Redis)
const redis = new Redis(process.env.REDIS_URL);

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

// Routes
app.post('/api/auth/login', async (req, res) => {
    const { username, password, tenantID } = req.body;
    try {
        // PostgreSQL üzerinden kullanıcı doğrula
        const result = await pgPool.query(
            'SELECT user_id, password, role FROM system_users WHERE username = $1 AND tenant_id = $2 AND is_active = true',
            [username, tenantID]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Hatalı kullanıcı veya firma seçimi.' });
        }
        
        const user = result.rows[0];
        // TODO: bcrypt.compare kullanılmalı
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

// Firma Lokasyonlarını Getir
app.get('/api/locations', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send('Yetkisiz.');

    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'mps_secret_key');
        const pool = await getTenantPool(decoded.tenantId);
        
        // Genellikle Korgün'de lokasyonlar bu tablo veya cari_kart içinde tutulur
        // Burada basitçe hareket görmüş lokasyonları getirelim
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
        
        // Kullanıcı talebine göre: 
        // 1. Sipariş tarihi filtresi kaldırıldı.
        // 2. Lokasyon; sipariş, stok mevcudu ve satınalma terminleri için ortak kriter yapıldı.
        const mpsSql = `
            DECLARE @Loc nvarchar(20) = @location;

            -- 1. Lokasyon Bazlı Satınalma Terminleri (Hammaddeler için)
            WITH PurchaseTermins AS (
                SELECT 
                    sh.SKod, sh.RKod, sh.BedKod,
                    MIN(sh.TerminTarihi) as EnYakinTermin,
                    SUM(isNull(sh.Miktar,0) - isNull(sh.TeslimMiktar,0)) as BekleyenMik
                FROM siparis_kay sk
                JOIN siparis_har sh ON sk.SipNo = sh.SipNo
                WHERE sk.SipTip = 'A' -- Alınan (Satınalma) Sipariş
                  AND sk.Location = @Loc -- Sadece seçili lokasyona gelecek olanlar
                  AND (sh.Durum = '' OR sh.Durum IS NULL)
                  AND (sh.Miktar > isNull(sh.TeslimMiktar,0))
                GROUP BY sh.SKod, sh.RKod, sh.BedKod
            ),
            -- 2. Lokasyon Bazlı Anlık Hammadde Stoğu
            CurrentStock AS (
                SELECT 
                    SKod, RKod, BedKod,
                    SUM(isNull(Giren,0) - isNull(Cikan,0)) as NetStok
                FROM si_gchar
                WHERE Location = @Loc
                GROUP BY SKod, RKod, BedKod
            )
            -- 3. Ana Liste (Siparişler + Gereken Hammaddeler + Durum)
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
            -- Reçete (BOM) bağlantısı - model_PD üzerinden
            JOIN model_PD pd ON sh.SKod = pd.ModelKod 
            LEFT JOIN StokKart st1 ON sh.SKod = st1.SKod
            LEFT JOIN StokKart st2 ON pd.SKod = st2.SKod
            LEFT JOIN Cari_Kart cr ON sk.CariKod = cr.CKod
            LEFT JOIN PurchaseTermins pt ON pd.SKod = pt.SKod
            LEFT JOIN CurrentStock cs ON pd.SKod = cs.SKod
            WHERE sk.SipTip = 'S' -- Satış Siparişleri (Planlanacak olanlar)
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

// React Router için tüm istekleri index.html'e yönlendir
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`MPS Server running on port ${PORT}`));
