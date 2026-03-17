-- MPS SaaS Merkezi Yönetim (Admin) Veritabanı Kurulum Scripti (PostgreSQL - Railway)
-- Bu script Railway üzerindeki PostgreSQL veritabanında çalıştırılmalıdır.

-- 1. Firma (Tenant) Tanımları
CREATE TABLE IF NOT EXISTS system_tenants (
    tenant_id SERIAL PRIMARY KEY,
    firma_adi VARCHAR(255) NOT NULL,
    db_host VARCHAR(255) NOT NULL, -- Uzaktaki SQL Server IP/Host
    db_name VARCHAR(100) NOT NULL, -- ERP DB Adı
    db_user VARCHAR(100) NOT NULL, -- SQL Kullanıcısı
    db_pass VARCHAR(255) NOT NULL, -- SQL Şifresi 
    license_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    license_end TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    ins_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    upd_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Firma Kullanıcıları (Her firmanın içindeki kullanıcılar)
CREATE TABLE IF NOT EXISTS system_users (
    user_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES system_tenants(tenant_id),
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL, -- Şifre
    role VARCHAR(20) DEFAULT 'Planlamaci', -- Admin, Planlamaci, Izleyici, SuperAdmin
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Örnek Firma Kaydı (Cabani Kundura)
INSERT INTO system_tenants (firma_adi, db_host, db_name, db_user, db_pass, license_end) 
VALUES ('Cabani Kundura', '192.168.1.3', 'Uretim', 'selimkorgun', 'Korgun1992', '2026-12-31 23:59:59')
ON CONFLICT DO NOTHING;

-- 4. Örnek Admin Girişi (Sistem Admini)
-- Not: İlk insert sonrası tenant_id 1 olacaktır.
INSERT INTO system_users (tenant_id, username, password, role) 
VALUES (1, 'admin', '123456', 'SuperAdmin')
ON CONFLICT DO NOTHING;
