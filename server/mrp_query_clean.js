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
        (ISNULL(si.Giren, 0) - ISNULL(si.Cikan, 0)) as Miktar,
        RTRIM(sk.Location),
        ISNULL(upm.ModelKod, (SELECT TOP 1 c.ModelKod FROM stokmodel_c c WHERE c.SKod = sh.SKod ORDER BY c.insDT DESC))
    FROM siparis_kay sk
    JOIN siparis_har sh ON sk.SipNo = sh.SipNo
    JOIN si_gchar si ON si.skod = sh.skod AND si.Modul = 'i' AND si.FisNo = sk.SipNo AND si.FisHarInx = sh.Sipharinx
    LEFT JOIN Urt_Plan_Model upm ON upm.SipNo = sk.SipNo AND upm.SipHarinx = sh.Sipharinx AND upm.Activid = 0
    WHERE RTRIM(sk.SipTip) = 'S' 
      AND (RTRIM(sh.Durum) = '' OR sh.Durum IS NULL)
      AND RTRIM(sk.Location) IN (${pLocs})
      AND (ISNULL(si.Giren, 0) - ISNULL(si.Cikan, 0)) > 0;

    -- 2. HAMMADDE MEVCUT STOK (Fiziksel)
    DECLARE @StokBak TABLE (SKod VARCHAR(30), Mevcut FLOAT);
    INSERT INTO @StokBak
    SELECT SKod, SUM(ISNULL(Giren, 0) - ISNULL(Cikan, 0)) 
    FROM stok_bak 
    WHERE RTRIM(Location) IN (${rLocs})
    GROUP BY SKod;

    -- 3. BEKLEYEN SATIN ALMA (Yoldaki)
    DECLARE @SatinAlma TABLE (SKod VARCHAR(30), Bekleyen FLOAT);
    INSERT INTO @SatinAlma
    SELECT sh.SKod, SUM(ISNULL(sh.Miktar, 0))
    FROM siparis_kay sk 
    JOIN siparis_har sh ON sk.SipNo = sh.SipNo
    WHERE RTRIM(sk.SipTip) = 'A' 
      AND (RTRIM(sh.Durum) = '' OR sh.Durum IS NULL)
      AND RTRIM(sk.Location) IN (${rLocs})
    GROUP BY sh.SKod;

    -- 4. TAM MRP ANALİZİ
    SELECT 
        pd.SKod as hskod,
        st_ham.Tanim as HSKod_Tanim,
        ISNULL(rn.Tanim, '-') as HRKod_Tanim, -- Renk Detayı
        '-' as HBeden, -- Beden detayı şuan için boş
        RTRIM(pd.Birim) as HBirim,
        SUM(o.Miktar * pd.Miktar) as Miktar1, -- Brüt İhtiyaç (Siparişten Gelen)
        ISNULL(sb.Mevcut, 0) as Miktar2,       -- Mevcut Stok (StokBak)
        ISNULL(sa.Bekleyen, 0) as Miktar3,     -- Satın Alma (Bekleyen A Siparişleri)
        (SUM(o.Miktar * pd.Miktar) - (ISNULL(sb.Mevcut, 0) + ISNULL(sa.Bekleyen, 0))) as Miktar4, -- Net İhtiyaç
        SUM(o.Miktar * pd.Miktar) as MiktarTop
    FROM @Orders o
    JOIN model_PD pd ON RTRIM(pd.ModelKod) = RTRIM(o.ModelKod)
    JOIN StokKart st_ham ON st_ham.SKod = pd.SKod
    LEFT JOIN Model_PDS2R s2r ON s2r.ModelKod = pd.ModelKod AND s2r.Proses = pd.Proses AND s2r.Parcainx = pd.Parcainx AND s2r.SKod = pd.SKod
    LEFT JOIN Dbo.P_RNK_Tip rn ON rn.Renk_kod = s2r.RKod
    LEFT JOIN @StokBak sb ON sb.SKod = pd.SKod
    LEFT JOIN @SatinAlma sa ON sa.SKod = pd.SKod
    GROUP BY pd.SKod, st_ham.Tanim, rn.Tanim, pd.Birim, sb.Mevcut, sa.Bekleyen
    HAVING SUM(o.Miktar * pd.Miktar) > 0
    ORDER BY pd.SKod;
  `;
};

export default getMrpQuery;
