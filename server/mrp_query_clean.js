const getMrpQuery = (prodLocs, rawLocs) => {
  const formatLocs = (locString) => {
    if (!locString) return "''";
    return locString.split(',').filter(l => l.trim() !== '').map(l => `'${l.trim()}'`).join(',');
  };

  const pLocs = formatLocs(prodLocs || 'K0001');

  return `
    -- 1. GEÇİCİ TABLO: TÜM AKTİF SİPARİŞLER VE BOM EŞLEŞMELERİ
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

    -- 2. HAMMADDE İHTİYAÇ HESAPLAMA (HRKod Hatası Giderildi)
    SELECT 
        pd.SKod as hskod,
        st_ham.Tanim as HSKod_Tanim,
        '-' as HRKod_Tanim, -- Renk detayı bu tablo şemasına göre mevcut değil
        '-' as HBeden,
        RTRIM(pd.Birim) as HBirim,
        SUM(o.Miktar * pd.Miktar) as Miktar1, -- Sipariş İhtiyacı
        0 as Miktar2,
        0 as Miktar3,
        0 as Miktar4,
        SUM(o.Miktar * pd.Miktar) as MiktarTop
    FROM @Orders o
    JOIN model_PD pd ON RTRIM(pd.ModelKod) = RTRIM(o.ModelKod)
    JOIN StokKart st_ham ON st_ham.SKod = pd.SKod
    GROUP BY pd.SKod, st_ham.Tanim, pd.Birim
    HAVING SUM(o.Miktar * pd.Miktar) > 0
    ORDER BY pd.SKod;
  `;
};

export default getMrpQuery;
