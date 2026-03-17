import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function setup() {
    console.log('PostgreSQL (Railway) tabloları oluşturuluyor...');
    
    try {
        // 1. system_tenants Tablosu
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_tenants (
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
            )
        `);

        // 2. system_users Tablosu
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_users (
                user_id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES system_tenants(tenant_id),
                username VARCHAR(50) NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'Planlamaci',
                is_active BOOLEAN DEFAULT TRUE
            )
        `);

        // 3. Örnek Veriler (Varsa atla)
        // Cabani Kundura (Eğer yoksa ekle)
        const tenantRes = await pool.query("SELECT tenant_id FROM system_tenants WHERE firma_adi = 'Cabani Kundura'");
        let tenantId;
        
        if (tenantRes.rows.length === 0) {
            const insertTenant = await pool.query(`
                INSERT INTO system_tenants (firma_adi, db_host, db_name, db_user, db_pass, license_end)
                VALUES ('Cabani Kundura', '192.168.1.3', 'Uretim', 'selimkorgun', 'Korgun1992', '2026-12-31 23:59:59')
                RETURNING tenant_id
            `);
            tenantId = insertTenant.rows[0].tenant_id;
            console.log('Örnek firma (Cabani) oluşturuldu.');
        } else {
            tenantId = tenantRes.rows[0].tenant_id;
            console.log('Örnek firma zaten mevcut.');
        }

        // Admin Kullanıcısı (Eğer yoksa ekle)
        const userRes = await pool.query("SELECT user_id FROM system_users WHERE username = 'admin'");
        if (userRes.rows.length === 0) {
            await pool.query(`
                INSERT INTO system_users (tenant_id, username, password, role)
                VALUES ($1, 'admin', '123456', 'SuperAdmin')
            `, [tenantId]);
            console.log('Admin kullanıcısı oluşturuldu.');
        } else {
            console.log('Admin kullanıcısı zaten mevcut.');
        }

        console.log('Kurulum başarıyla tamamlandı.');
    } catch (err) {
        console.error('Hata oluştu:', err);
    } finally {
        await pool.end();
    }
}

setup();
