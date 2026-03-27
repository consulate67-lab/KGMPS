import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

async function checkFisTips() {
    const config = {
        user: 'sa',
        password: 'dgfceu',
        server: '192.168.1.3',
        database: 'Uretim',
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    try {
        let pool = await sql.connect(config);
        
        console.log("--- STOKHAREKET FisTip/FisTur Check ---");
        // Hangi fiş tipleri ve türleri stok bakiye oluşturuyor?
        let res1 = await pool.request().query("SELECT TOP 20 FisTip, FisTur, COUNT(*) as Count FROM StokHareket GROUP BY FisTip, FisTur");
        console.table(res1.recordset);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkFisTips();
