import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

async function checkOzKods() {
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
        
        console.log("--- MODEL_PD OZKODS ---");
        let res1 = await pool.request().query("SELECT TOP 20 ModelKod, SKod, OzKod1, OzKod2, OzKod3 FROM model_PD WHERE ModelKod IS NOT NULL");
        console.table(res1.recordset);

        console.log("--- MODEL_PDS2R (SKod != ModelKod) ---");
        // Hammaddeye özel renk tanımlanmış mı?
        let res2 = await pool.request().query("SELECT TOP 20 * FROM Model_PDS2R WHERE RTRIM(SKod) <> RTRIM(ModelKod)");
        console.table(res2.recordset);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkOzKods();
