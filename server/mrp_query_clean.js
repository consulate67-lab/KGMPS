const getMrpQuery = (prodLocs, rawLocs) => {
  const formatLocs = (locString) => {
    if (!locString) return "''";
    return locString.split(',').filter(l => l.trim() !== '').map(l => `'${l.trim()}'`).join(',');
  };

  const pLocs = formatLocs(prodLocs || 'K0001');
  const rLocs = formatLocs(rawLocs || 'K0001');

  return `
    -- 1. GEÇİCİ TABLO: AKTİF SİPARİŞLER VE BOM EŞLEŞMELERİ
    DECLARE @Orders TABLE (
        SipNo INT, SipHarinx INT, SKod VARCHAR(30),
        Miktar FLOAT, Location VARCHAR(10), ModelKod VARCHAR(30)
    );

    INSERT INTO @Orders
    SELECT 
        sh.SipNo, sh.SipHarinx, sh.SKod, 
        SUM(ISNULL(si.Giren, 0) - ISNULL(si.Cikan, 0)) as Miktar,
        RTRIM(sk.Location),
        ISNULL(upm.ModelKod, (SELECT TOP 1 c.ModelKod FROM stokmodel_c c WHERE c.SKod = sh.SKod ORDER BY c.insDT DESC))
    FROM siparis_kay sk
    JOIN siparis_har sh ON sk.SipNo = sh.SipNo
    JOIN si_gchar si ON si.skod = sh.skod AND si.Modul = 'i' AND si.FisNo = sk.SipNo AND si.FisHarInx = sh.Sipharinx
    LEFT JOIN Urt_Plan_Model upm ON upm.SipNo = sk.SipNo AND upm.SipHarinx = sh.Sipharinx AND upm.Activid = 0
    WHERE RTRIM(sk.SipTip) = 'S' 
      AND (RTRIM(sh.Durum) = '' OR sh.Durum IS NULL)
      AND RTRIM(sk.Location) IN (${pLocs})
    GROUP BY sh.SipNo, sh.SipHarinx, sh.SKod, sk.Location, upm.ModelKod
    HAVING SUM(ISNULL(si.Giren, 0) - ISNULL(si.Cikan, 0)) > 0;

    -- 2. HAMMADDE MEVCUT STOK (Orijinal s_gchar mantığı)
    DECLARE @MevcutStok TABLE (SKod VARCHAR(30), RKod INT, BedKod INT, Bakiye FLOAT);
    INSERT INTO @MevcutStok
    SELECT SKod, RKod, BedKod, SUM(ISNULL(Giren, 0) - ISNULL(Cikan, 0)) 
    FROM s_gchar 
    WHERE Modul = 'X' AND FisNo = 0 AND FisHarInx = 0
      AND RTRIM(Location) IN (${rLocs})
    GROUP BY SKod, RKod, BedKod;

    -- 3. BEKLEYEN SATIN ALMA (Eksi Bakiye Korumalı)
    DECLARE @SatinAlmaStok TABLE (SKod VARCHAR(30), RKod INT, BedKod INT, Bekleyen FLOAT);
    INSERT INTO @SatinAlmaStok
    SELECT SKod, RKod, BedKod, 
           SUM(CASE WHEN (ISNULL(Giren, 0) - ISNULL(Cikan, 0)) < 0 THEN 0 ELSE (ISNULL(Giren, 0) - ISNULL(Cikan, 0)) END)
    FROM s_gchar 
    WHERE Modul = 'S' 
      AND RTRIM(Location) IN (${rLocs})
    GROUP BY SKod, RKod, BedKod;

    -- 4. TAM MRP ANALİZİ (Hammadde Kodu + Renk + Beden + Mevcut + Satın Alma)
    SELECT 
        pd.SKod as hskod,
        st_ham.Tanim as HSKod_Tanim,
        ISNULL(rn.Tanim, '-') as HRKod_Tanim,
        ISNULL(bd.Beden, '-') as HBeden,
        RTRIM(pd.Birim) as HBirim,
        SUM(o.Miktar * pd.Miktar) as Miktar1, 
        MAX(ISNULL(ms.Bakiye, 0)) as Miktar2,
        MAX(ISNULL(sas.Bekleyen, 0)) as Miktar3,
        (SUM(o.Miktar * pd.Miktar) - (MAX(ISNULL(ms.Bakiye, 0)) + MAX(ISNULL(sas.Bekleyen, 0)))) as Miktar4,
        SUM(o.Miktar * pd.Miktar) as MiktarTop
    FROM @Orders o
    JOIN model_PD pd ON RTRIM(pd.ModelKod) = RTRIM(o.ModelKod)
    JOIN StokKart st_ham ON st_ham.SKod = pd.SKod
    LEFT JOIN Model_PDS2R s2r ON s2r.ModelKod = pd.ModelKod AND s2r.Proses = pd.Proses AND s2r.Parcainx = pd.Parcainx AND s2r.SKod = pd.SKod
    LEFT JOIN Model_PDS2X s2x ON s2x.ModelKod = pd.ModelKod AND s2x.Proses = pd.Proses AND s2x.Parcainx = pd.Parcainx AND s2x.SKod = pd.SKod
    LEFT JOIN Dbo.P_RNK_Tip rn ON rn.Renk_kod = s2r.RKod
    LEFT JOIN Dbo.P_Beden_D bd ON bd.Bedinx = s2x.xkod
    LEFT JOIN @MevcutStok ms ON ms.SKod = pd.SKod AND (ms.RKod = s2r.RKod OR s2r.RKod IS NULL)
    LEFT JOIN @SatinAlmaStok sas ON sas.SKod = pd.SKod AND (sas.RKod = s2r.RKod OR s2r.RKod IS NULL)
    GROUP BY pd.SKod, st_ham.Tanim, rn.Tanim, bd.Beden, pd.Birim
    HAVING SUM(o.Miktar * pd.Miktar) > 0
    ORDER BY pd.SKod, rn.Tanim, bd.Beden;
  `;
};

export default getMrpQuery;
