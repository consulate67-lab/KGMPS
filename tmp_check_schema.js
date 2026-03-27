import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

async function checkStokHareketS() {
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
        
        console.log("--- STOKHAREKETS Columns ---");
        let res1 = await pool.request().query("SELECT TOP 1 * FROM stokharekets");
        console.table(res1.recordset);

        console.log("--- STOKHAREKETS Modul Check ---");
        let res2 = await pool.request().query("SELECT TOP 20 Modul, COUNT(*) as RowCount FROM stokharekets GROUP BY Modul");
        console.table(res2.recordset);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkStokHareketS();
