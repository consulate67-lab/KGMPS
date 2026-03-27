const getMrpQuery = (prodLocs, rawLocs) => {
  const formatLocs = (locString) => {
    if (!locString) return "''";
    return locString.split(',').filter(l => l.trim() !== '').map(l => `'${l.trim()}'`).join(',');
  };

  const pLocs = formatLocs(prodLocs || 'K0001');
  const rLocs = formatLocs(rawLocs || 'K0001');

  return `
    -- 1. GEÇİCİ TABLO: AKTİF SİPARİŞLER (PRODÜKSİYON)
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
    WHERE sk.SipTip = 'S' 
      AND (sh.Durum = '' OR sh.Durum IS NULL)
      AND RTRIM(sk.Location) IN (${pLocs})
    GROUP BY sh.SipNo, sh.SipHarinx, sh.SKod, si.RKod, si.BedKod, sk.Location, upm.ModelKod
    HAVING SUM(ISNULL(si.Giren, 0) - ISNULL(si.Cikan, 0)) > 0;

    -- 2. HAMMADDE MEVCUT STOK (StokHareket - FisTip ile)
    DECLARE @MevcutStok TABLE (SKod VARCHAR(30), RKod INT, BedKod INT, Bakiye FLOAT);
    INSERT INTO @MevcutStok
    SELECT RTRIM(SKod), RKod, BedKod, SUM(ISNULL(Miktar, 0)) 
    FROM StokHareket 
    WHERE (FisTip <> 'Siparis' OR FisTip IS NULL) -- Stok bakiye oluşturanlar
      AND RTRIM(Location) IN (${rLocs})
    GROUP BY SKod, RKod, BedKod;

    -- 3. BEKLEYEN SATIN ALMA (StokHareket - FisTip = 'Siparis')
    -- 'ssa' (Satın Alma Siparişi) ve Miktar > 0 olanlar
    DECLARE @SatinAlmaStok TABLE (SKod VARCHAR(30), RKod INT, BedKod INT, Bekleyen FLOAT);
    INSERT INTO @SatinAlmaStok
    SELECT RTRIM(SKod), RKod, BedKod, SUM(ISNULL(Miktar, 0))
    FROM StokHareket 
    WHERE FisTip = 'Siparis' 
      AND (FisTur LIKE '%sa%') -- Satın Alma Siparişleri (ssa)
      AND Miktar > 0
    GROUP BY SKod, RKod, BedKod;

    -- 4. TAM MRP ANALİZİ (OUTER APPLY Renk/Beden Matrisi ile)
    SELECT 
        pd.SKod as hskod,
        st_ham.Tanim as HSKod_Tanim,
        ISNULL(rn_m.Tanim, ISNULL(rn_pd.Tanim, '-')) as HRKod_Tanim, 
        ISNULL(bd_m.Beden, ISNULL(bd_pd.Beden, '-')) as HBeden,
        RTRIM(pd.Birim) as HBirim,
        SUM(o.Miktar * pd.Miktar) as Miktar1, 
        MAX(ISNULL(ms.Bakiye, 0)) as Miktar2,
        MAX(ISNULL(sas.Bekleyen, 0)) as Miktar3,
        (SUM(o.Miktar * pd.Miktar) - (MAX(ISNULL(ms.Bakiye, 0)) + MAX(ISNULL(sas.Bekleyen, 0)))) as Miktar4,
        SUM(o.Miktar * pd.Miktar) as MiktarTop
    FROM @Orders o
    JOIN model_PD pd ON RTRIM(pd.ModelKod) = RTRIM(o.ModelKod)
    JOIN StokKart st_ham ON st_ham.SKod = pd.SKod
    
    -- Orijinal SQL CROSS APPLY Mantığına Uyarlama (Proses Kısıtıyla)
    OUTER APPLY (
        SELECT TOP 1 r.RKod 
        FROM Model_PDS2R r 
        WHERE r.ModelKod = o.ModelKod 
          AND r.RKod = o.RKod 
          AND r.Parcainx = pd.Parcainx
          AND r.Proses = pd.Proses -- Orijinal SQL'deki kritik kısıt
    ) as mat_r
    
    OUTER APPLY (
        SELECT TOP 1 x.xkod
        FROM Model_PDS2X x 
        WHERE x.ModelKod = o.ModelKod 
          AND x.xkod = o.BedKod 
          AND x.Parcainx = pd.Parcainx
          AND x.Proses = pd.Proses -- Orijinal SQL'deki kritik kısıt
    ) as mat_x

    -- Renk & Beden Tanımları (Matris Eşleşmesinden)
    LEFT JOIN Dbo.P_RNK_Tip rn_m ON rn_m.Renk_kod = mat_r.RKod
    LEFT JOIN Dbo.P_Beden_D bd_m ON bd_m.Bedinx = mat_x.xkod
    
    -- OzKod Yedek (Reçete Satırından)
    LEFT JOIN Dbo.P_RNK_Tip rn_pd ON rn_pd.Renk_kod = TRY_CAST(pd.OzKod1 AS INT)
    LEFT JOIN Dbo.P_Beden_D bd_pd ON bd_pd.Bedinx = TRY_CAST(pd.OzKod2 AS INT)

    -- Bakiye Eşleşmesi (StokHareket verileriyle)
    LEFT JOIN @MevcutStok ms ON ms.SKod = pd.SKod AND (ms.RKod = mat_r.RKod OR ms.RKod = 0)
    LEFT JOIN @SatinAlmaStok sas ON sas.SKod = pd.SKod AND (sas.RKod = mat_r.RKod OR sas.RKod = 0)
    
    GROUP BY pd.SKod, st_ham.Tanim, rn_m.Tanim, rn_pd.Tanim, bd_m.Beden, bd_pd.Beden, pd.Birim
    HAVING SUM(o.Miktar * pd.Miktar) > 0
    ORDER BY pd.SKod;
  `;
};

export default getMrpQuery;
