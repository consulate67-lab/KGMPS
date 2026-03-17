-- MPS SaaS Merkezi Yönetim (Admin) Veritabanı Kurulum Scripti
-- Bu script merkezi bir SQL Server üzerinde ADMIN olarak çalıştırılmalıdır.

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'MPS_Central')
BEGIN
    CREATE DATABASE MPS_Central;
END
GO

USE MPS_Central;
GO

-- 1. Firma (Tenant) Tanımları
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[System_Tenants]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[System_Tenants] (
        [TenantID] INT IDENTITY(1,1) PRIMARY KEY,
        [FirmaAdi] NVARCHAR(255) NOT NULL,
        [DB_Host] NVARCHAR(255) NOT NULL, -- Uzaktaki SQL Server IP/Host (örn: 92.110.x.x)
        [DB_Name] NVARCHAR(100) NOT NULL, -- ERP DB Adı (örn: KORGUN_2026)
        [DB_User] NVARCHAR(100) NOT NULL, -- SQL Kullanıcısı
        [DB_Pass] NVARCHAR(255) NOT NULL, -- SQL Şifresi (Sistem tarafında şifrelenecek)
        [LicenseStart] DATETIME DEFAULT GETDATE(),
        [LicenseEnd] DATETIME NOT NULL,
        [IsActive] BIT DEFAULT 1,
        [InsDT] DATETIME DEFAULT GETDATE(),
        [UpdDT] DATETIME DEFAULT GETDATE()
    );
END
GO

-- 2. Firma Kullanıcıları (Her firmanın içindeki kullanıcılar)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[System_Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[System_Users] (
        [UserID] INT IDENTITY(1,1) PRIMARY KEY,
        [TenantID] INT NOT NULL, -- Hangi firmaya ait?
        [Username] NVARCHAR(50) NOT NULL,
        [Password] NVARCHAR(255) NOT NULL, -- Hashlenmiş şifre
        [Role] NVARCHAR(20) DEFAULT 'Planlamaci', -- Admin, Planlamaci, Izleyici
        [IsActive] BIT DEFAULT 1,
        CONSTRAINT FK_User_Tenant FOREIGN KEY (TenantID) REFERENCES [dbo].[System_Tenants](TenantID)
    );
END
GO

-- 3. Örnek Firma Kaydı (Cabani Kundura)
INSERT INTO [dbo].[System_Tenants] (FirmaAdi, DB_Host, DB_Name, DB_User, DB_Pass, LicenseEnd) 
VALUES ('Cabani Kundura', '192.168.1.3', 'Uretim', 'selimkorgun', 'Korgun1992', '2026-12-31');

-- 4. Örnek Admin Girişi (Sistem Admini)
INSERT INTO [dbo].[System_Users] (TenantID, Username, Password, Role) 
VALUES (1, 'admin', '123456', 'SuperAdmin');
