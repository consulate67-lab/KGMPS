import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

async function checkMatrixColumns() {
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
        
        console.log("--- Model_PDS2R Column Names ---");
        let res1 = await pool.request().query("SELECT TOP 1 * FROM Model_PDS2R");
        console.log(Object.keys(res1.recordset[0]));

        console.log("--- Model_PDS2X Column Names ---");
        let res2 = await pool.request().query("SELECT TOP 1 * FROM Model_PDS2X");
        console.log(Object.keys(res2.recordset[0]));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkMatrixColumns();
