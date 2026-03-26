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
        console.log("--- MODEL_PD COLUMNS ---");
        let res4 = await pool.request().query("SELECT TOP 1 * FROM model_PD");
        console.log(Object.keys(res4.recordset[0]));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
