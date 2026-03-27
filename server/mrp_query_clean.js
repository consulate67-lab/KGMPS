const getMrpQuery = (prodLocs, rawLocs) => {
  const formatLocs = (locString) => {
    if (!locString) return "''";
    return locString.split(',').filter(l => l.trim() !== '').map(l => `'${l.trim()}'`).join(',');
  };

  const pLocs = formatLocs(prodLocs || 'K0001');
  const rLocs = formatLocs(rawLocs || 'K0001');

  return `
    -- 0. ANA TABLO DEKLARASYONLARI (HAFİFLETİLMİŞ)
    DECLARE @Model_Pd_si TABLE (
        xskod varchar(15), xrkod int, xbkod int, xFisno int, xFinx int,
        ModelKod varchar(30), Proses varchar(2), Parcainx int, 
        SKod varchar(30), Miktar float, Birim varchar(10), 
        r1 int, b1 int
    );

    DECLARE @TableHamGroup TABLE (
        hskod varchar(15), HSKod_Tanim varchar(100), HRKod int, 
        HRKod_Tanim varchar(100), HBedKod int, HBeden varchar(10), 
        Miktar1 float, Miktar2 float, Miktar3 float, Miktar4 float, 
        HBirim varchar(10)
    );

    -- 1. ADIM: AKTİF SİPARİŞLERDEN İHTİYAÇLARI TOPLA (FONKSİYONLARI ÇIKARDIK)
    INSERT INTO @Model_Pd_si (xskod, xrkod, xbkod, xFisno, xFinx, ModelKod, Proses, Parcainx, SKod, Miktar, Birim)
    SELECT 
        si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, 
        ISNULL(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, 
        pd.Miktar, pd.Birim
    FROM siparis_kay sk
    JOIN siparis_har sh ON sk.SipNo=sh.SipNo AND ((sh.Durum='') OR (sh.durum IS NULL))
    JOIN si_gchar si ON si.skod=sh.skod AND si.Modul='i' AND sk.SipNo=si.FisNo AND sh.SipHarinx=si.FisHarInx AND (si.location=sk.Location)
    LEFT OUTER JOIN Urt_Plan_Model upm ON (upm.SipNo=sk.SipNo) AND (upm.SipHarinx=sh.Sipharinx) AND (upm.Activid=0)
    JOIN model_PD pd ON (pd.ModelKod = ISNULL(upm.ModelKod,''))
    WHERE (sk.SipTip='S') AND (sk.SipTur='N') AND ((sk.Durum='') OR (sk.Durum IS NULL)) AND (sk.Location IN (${pLocs}))
    GROUP BY si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, ISNULL(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim;

    -- 2. ADIM: RENK/BEDEN MATRİS GÜNCELLEMESİ (HIZLI INDEXLİ JOIN)
    UPDATE pd SET r1 = (SELECT TOP 1 rkod FROM Model_PDS2R r WHERE r.ModelKod=pd.ModelKod AND r.Proses=pd.Proses AND r.Parcainx=pd.Parcainx AND r.skod=pd.xSKod AND r.RKod=pd.xRKod)
    FROM @Model_Pd_si pd;

    UPDATE pd SET b1 = (SELECT TOP 1 xkod FROM Model_PDS2X x WHERE x.ModelKod=pd.ModelKod AND x.Proses=pd.Proses AND x.Parcainx=pd.Parcainx AND x.skod=pd.xSKod AND x.xkod=pd.xbKod)
    FROM @Model_Pd_si pd;

    -- 3. ADIM: @TableHamGroup TABLOSUNA VERİLERİN ÖZETLENMESİ
    INSERT INTO @TableHamGroup (hskod, HSKod_Tanim, HRKod, HRKod_Tanim, HBedKod, HBeden, Miktar1, HBirim)
    SELECT 
        pd.skod as hskod, st2.Tanim as HSKod_Tanim, 
        ISNULL(pd.r1, 0) as HRKod, ISNULL(rn2.Tanim,'-') as HRKod_Tanim, 
        ISNULL(pd.b1, 0) as HBedKod, ISNULL(Bed2.Beden, '-') as HBeden,
        SUM(pd.Miktar * (ISNULL(si.Giren,0)-ISNULL(si.Cikan,0))) as Miktar1, 
        pd.Birim as HBirim
    FROM @Model_Pd_si pd
    JOIN si_gchar si ON si.skod=pd.xskod AND si.FisNo=pd.xFisno AND si.FisHarInx=pd.xFinx AND si.Modul='i'
    LEFT OUTER JOIN StokKart st2 ON st2.SKod=pd.SKod
    LEFT OUTER JOIN Dbo.P_RNK_Tip rn2 ON rn2.Renk_kod = pd.r1
    LEFT OUTER JOIN Dbo.P_Beden_D Bed2 ON Bed2.Bedinx = pd.b1
    GROUP BY pd.skod, st2.Tanim, pd.r1, rn2.Tanim, pd.b1, Bed2.Beden, pd.Birim;

    -- 4. ADIM: BAKİYE VE SATIN ALMA (JOIN İLE HIZLANDIRILDI)
    -- Mevcut Stok
    UPDATE th SET Miktar2 = ISNULL(stok.Bakiye, 0)
    FROM @TableHamGroup th
    LEFT JOIN (
        SELECT SKod, RKod, BedKod, SUM(Miktar) as Bakiye 
        FROM StokHareket 
        WHERE Location IN (${rLocs}) AND (FisTip<>'Siparis' OR FisTip IS NULL)
        GROUP BY SKod, RKod, BedKod
    ) stok ON stok.SKod = th.hskod AND stok.RKod = th.HRKod AND stok.BedKod = th.HBedKod;

    -- Satın Alma
    UPDATE th SET Miktar3 = ISNULL(sa.Bekleyen, 0)
    FROM @TableHamGroup th
    LEFT JOIN (
        SELECT SKod, RKod, BedKod, SUM(Miktar) as Bekleyen 
        FROM StokHareket 
        WHERE Location IN (${rLocs}) AND FisTip='Siparis' AND FisTur LIKE '%sa%'
        GROUP BY SKod, RKod, BedKod
    ) sa ON sa.SKod = th.hskod AND sa.RKod = th.HRKod AND sa.BedKod = th.HBedKod;

    -- 5. ADIM: FİNAL HESAPLAMA VE SONUÇ
    UPDATE @TableHamGroup SET Miktar4 = (Miktar1 - (Miktar2 + Miktar3));

    SELECT 
        hskod, HSKod_Tanim, HRKod, HRKod_Tanim, HBedKod, HBeden, HBirim,
        Miktar1, Miktar2, Miktar3, Miktar4, Miktar1 as MiktarTop
    FROM @TableHamGroup
    WHERE Miktar1 > 0
    ORDER BY hskod;
  `;
};

export default getMrpQuery;
