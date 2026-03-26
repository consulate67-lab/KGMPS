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
        
        console.log("--- Model_PDS2R COLUMNS ---");
        let res1 = await pool.request().query("SELECT TOP 1 * FROM Model_PDS2R");
        if (res1.recordset.length > 0) console.log(Object.keys(res1.recordset[0]));

        console.log("--- Model_PDS2X COLUMNS ---");
        let res2 = await pool.request().query("SELECT TOP 1 * FROM Model_PDS2X");
        if (res2.recordset.length > 0) console.log(Object.keys(res2.recordset[0]));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
