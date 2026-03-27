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
        SipNo INT, SipHarinx INT, SKod VARCHAR(30), RKod INT, BedKod INT,
        Miktar FLOAT, Location VARCHAR(10), ModelKod VARCHAR(30)
    );

    INSERT INTO @Orders
    SELECT 
        sh.SipNo, sh.SipHarinx, sh.SKod, si.RKod, si.BedKod,
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
    GROUP BY sh.SipNo, sh.SipHarinx, sh.SKod, si.RKod, si.BedKod, sk.Location, upm.ModelKod
    HAVING SUM(ISNULL(si.Giren, 0) - ISNULL(si.Cikan, 0)) > 0;

    -- 2. HAMMADDE MEVCUT STOK (StokHareket TABLOSUNDAN)
    DECLARE @MevcutStok TABLE (SKod VARCHAR(30), RKod INT, BedKod INT, Bakiye FLOAT);
    INSERT INTO @MevcutStok
    SELECT RTRIM(SKod), RKod, BedKod, SUM(ISNULL(Miktar, 0)) 
    FROM StokHareket 
    WHERE Modul = 'X' -- Anlık bakiye
      AND RTRIM(Location) IN (${rLocs})
    GROUP BY SKod, RKod, BedKod;

    -- 3. BEKLEYEN SATIN ALMA (StokHareket TABLOSUNDAN)
    DECLARE @SatinAlmaStok TABLE (SKod VARCHAR(30), RKod INT, BedKod INT, Bekleyen FLOAT);
    INSERT INTO @SatinAlmaStok
    SELECT RTRIM(SKod), RKod, BedKod, SUM(ISNULL(Miktar, 0))
    FROM StokHareket 
    WHERE Modul = 'S' -- Satın Alma Siparişleri
      AND RTRIM(Location) IN (${rLocs})
    GROUP BY SKod, RKod, BedKod;

    -- 4. TAM MRP ANALİZİ (stokharekets ve Matris Uyumluluğu)
    SELECT 
        pd.SKod as hskod,
        st_ham.Tanim as HSKod_Tanim,
        ISNULL(rn_mat.Tanim, ISNULL(rn_pd.Tanim, '-')) as HRKod_Tanim, 
        ISNULL(bd_mat.Beden, ISNULL(bd_pd.Beden, '-')) as HBeden,
        RTRIM(pd.Birim) as HBirim,
        SUM(o.Miktar * pd.Miktar) as Miktar1, 
        MAX(ISNULL(ms.Bakiye, 0)) as Miktar2,
        MAX(ISNULL(sas.Bekleyen, 0)) as Miktar3,
        (SUM(o.Miktar * pd.Miktar) - (MAX(ISNULL(ms.Bakiye, 0)) + MAX(ISNULL(sas.Bekleyen, 0)))) as Miktar4,
        SUM(o.Miktar * pd.Miktar) as MiktarTop
    FROM @Orders o
    JOIN model_PD pd ON RTRIM(pd.ModelKod) = RTRIM(o.ModelKod)
    JOIN StokKart st_ham ON st_ham.SKod = pd.SKod
    -- Renk & Beden Matris Bağlantıları (Sipariş Bazlı)
    LEFT JOIN Model_PDS2R s2r ON RTRIM(s2r.ModelKod) = RTRIM(pd.ModelKod) AND RTRIM(s2r.SKod) = RTRIM(pd.SKod) AND s2r.RKod = o.RKod AND s2r.Parcainx = pd.Parcainx
    LEFT JOIN Model_PDS2X s2x ON RTRIM(s2x.ModelKod) = RTRIM(pd.ModelKod) AND RTRIM(s2x.SKod) = RTRIM(pd.SKod) AND s2x.xkod = o.BedKod AND s2x.Parcainx = pd.Parcainx
    -- Tanımları Getir
    LEFT JOIN Dbo.P_RNK_Tip rn_mat ON rn_mat.Renk_kod = s2r.RKod
    LEFT JOIN Dbo.P_Beden_D bd_mat ON bd_mat.Bedinx = s2x.xkod
    -- Reçetedeki OzKod Yedek
    LEFT JOIN Dbo.P_RNK_Tip rn_pd ON rn_pd.Renk_kod = TRY_CAST(pd.OzKod1 AS INT)
    LEFT JOIN Dbo.P_Beden_D bd_pd ON bd_pd.Bedinx = TRY_CAST(pd.OzKod2 AS INT)
    -- Stok & Satın Alma Bakiye Eşleşmesi
    LEFT JOIN @MevcutStok ms ON ms.SKod = pd.SKod AND (ms.RKod = s2r.RKod OR ms.RKod = 0)
    LEFT JOIN @SatinAlmaStok sas ON sas.SKod = pd.SKod AND (sas.RKod = s2r.RKod OR sas.RKod = 0)
    GROUP BY pd.SKod, st_ham.Tanim, rn_pd.Tanim, rn_mat.Tanim, bd_pd.Beden, bd_mat.Beden, pd.Birim
    HAVING SUM(o.Miktar * pd.Miktar) > 0
    ORDER BY pd.SKod;
  `;
};

export default getMrpQuery;
