import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
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
        console.log("--- SIPARIS_KAY COLUMNS ---");
        let res1 = await pool.request().query("SELECT TOP 1 * FROM siparis_kay");
        console.log(Object.keys(res1.recordset[0]));

        console.log("--- SIPARIS_HAR COLUMNS ---");
        let res2 = await pool.request().query("SELECT TOP 1 * FROM siparis_har");
        console.log(Object.keys(res2.recordset[0]));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
