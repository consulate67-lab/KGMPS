const getMrpQuery = (prodLocs, rawLocs) => {
  const formatLocs = (locString) => {
    if (!locString) return "''";
    return locString.split(',').filter(l => l.trim() !== '').map(l => `'${l.trim()}'`).join(',');
  };

  const pLocs = formatLocs(prodLocs || 'K0001');
  const rLocs = formatLocs(rawLocs || 'K0001');

  return `
    -- 0. ANA TABLOLARIN DEKLARASYONU
    DECLARE @Model_Pd_si TABLE (
        xskod varchar(15), xrkod int, xbkod int, xFisno int, xFinx int,
        ModelKod varchar(30), Proses varchar(2), Parcainx int, 
        SKod varchar(30), Miktar float, Birim varchar(10), 
        Tip varchar(1), Location varchar(5), Tanim varchar(250), 
        Resim varchar(100), HMikMod float, PrintOp varchar(1),
        r1 int, r2 int, r3 int, b1 int, b2 int, b3 int,
        uBedGrp varchar(4), hBedGrp varchar(4)
    );

    DECLARE @urtln TABLE (
        skod varchar(15), rkod int, bkod int, Fisno int, Finx int, 
        MKod varchar(30), mik float, Tmik float, PMik float
    );

    DECLARE @TableHamGroup TABLE (
        hskod varchar(15), HSKod_Tanim varchar(100), HRKod int, 
        HRKod_Tanim varchar(100), HBedKod int, HBeden varchar(10), 
        Miktar1 float, Miktar2 float, Miktar3 float, Miktar4 float, 
        HBirim varchar(10)
    );

    -- 1. ADIM: SİPARİŞLERE GÖRE HAMMADDE İHTİYAÇLARININ TESPİTİ (HEVENT '*')
    INSERT INTO @Model_Pd_si 
    SELECT 
        si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, 
        ISNULL(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, 
        pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, 
        NULL, NULL, NULL, NULL, NULL, NULL, st1.bedkod, st2.bedkod
    FROM siparis_kay sk
    JOIN siparis_har sh ON sk.SipNo=sh.SipNo AND ((sh.Durum='') OR (sh.durum IS NULL))
    JOIN si_gchar si ON si.skod=sh.skod AND si.Modul='i' AND sk.SipNo=si.FisNo AND sh.SipHarinx=si.FisHarInx AND (si.location=sk.Location)
    LEFT OUTER JOIN Urt_Plan_Model upm ON (upm.SipNo=sk.SipNo) AND (upm.SipHarinx=sh.Sipharinx) AND (upm.Activid=0)
    LEFT OUTER JOIN Urt_Plan_ozdur upo ON (upo.SipNo=sk.SipNo) AND (upo.SipHarinx=sh.Sipharinx) AND (upo.urkod=si.rkod) AND (upo.ubedkod=si.Bedkod) AND (upo.Activid=0) AND (upo.HEvent='*')
    JOIN model_PD pd ON (pd.ModelKod = ISNULL(upm.ModelKod,'')) AND (upo.proses=pd.proses) AND (upo.parcainx=pd.parcainx)
    LEFT OUTER JOIN StokKart st1 ON st1.SKod=sh.SKod
    LEFT OUTER JOIN StokKart st2 ON st2.SKod=pd.SKod
    WHERE (sk.SipTip='S') AND (sk.SipTur='N') AND ((sk.Durum='') OR (sk.Durum IS NULL)) AND (sk.Location IN (${pLocs}))
    GROUP BY si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, ISNULL(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, st1.bedkod, st2.bedkod;

    -- 2. ADIM: RENK VE BEDEN MATRİS ATAMALARI
    UPDATE pd SET r1 = (SELECT TOP 1 rkod FROM Model_PDS2R s2r WHERE (s2r.ModelKod=pd.ModelKod) AND (s2r.Proses=pd.Proses) AND (s2r.Parcainx=pd.Parcainx) AND (s2r.skod=xSKod))
    FROM @Model_Pd_si pd WHERE (r1 IS NULL);

    UPDATE pd SET b1 = (SELECT TOP 1 xkod FROM Model_PDS2X s2x WHERE (s2x.ModelKod=pd.ModelKod) AND (s2x.Proses=pd.Proses) AND (s2x.Parcainx=pd.Parcainx) AND (s2x.skod=xSKod))
    FROM @Model_Pd_si pd WHERE (b1 IS NULL);

    -- 3. ADIM: @urtln TABLOSUNUN DOLDURULMASI
    INSERT INTO @urtln
    SELECT xskod, xrkod, xbkod, xFisNo, xFinx, ModelKod, SUM(Mik), SUM(Tmik), SUM(PMik)
    FROM (
        SELECT ii.xskod, ii.xrkod, ii.xbkod, ii.xFisno, ii.xFinx, ii.ModelKod, SUM(ISNULL(xx.Giren,0)-ISNULL(xx.Cikan,0)) as Mik, 0 as TMik, SUM(ISNULL(xx.Giren,0)-ISNULL(xx.Cikan,0)) as PMik
        FROM @Model_Pd_si ii
        LEFT OUTER JOIN Urt_plan_gch xx ON xx.skod=ii.xskod AND xx.rkod=ii.xrkod AND xx.bedkod=ii.xbkod AND xx.FisNo=ii.xFisNo AND xx.Fisharinx=ii.xFinx
        GROUP BY ii.xskod, ii.xrkod, ii.xbkod, ii.xFisNo, ii.xFinx, ii.ModelKod
        UNION ALL
        SELECT ii.xskod, ii.xrkod, ii.xbkod, ii.xFisno, ii.xFinx, ii.ModelKod, 0, SUM(ISNULL(xx.Giren,0)), 0
        FROM @Model_Pd_si ii
        LEFT OUTER JOIN si_gchar xx ON xx.skod=ii.xskod AND xx.rkod=ii.xrkod AND xx.bedkod=ii.xbkod AND xx.FisNo=ii.xFisNo AND xx.FisharInx=ii.xFinx
        GROUP BY ii.xskod, ii.xrkod, ii.xbkod, ii.xFisNo, ii.xFinx, ii.ModelKod
    ) xx GROUP BY xskod, xrkod, xbkod, xFisNo, xFinx, ModelKod;

    -- 4. ADIM: @TableHamGroup TABLOSUNA VERİLERİN TOPLANMASI
    INSERT INTO @TableHamGroup
    SELECT 
        ISNULL(upo.HSKod, pd.skod) as hskod, st2.Tanim as HSKod_Tanim, 
        ISNULL(rn2.Renk_kod,0) as HRKod, ISNULL(rn2.Tanim,'') as HRKod_Tanim, 
        Bed2.Bedinx as HBedKod, Bed2.Beden as HBeden,
        SUM(ISNULL(upo.HMiktar, pd.Miktar) * (ISNULL(si.Giren,0)-ISNULL(si.Cikan,0)-ISNULL(xxxx.mik,0))) as Miktar1, 
        0 as Miktar2, 0 as Miktar3, 0 as Miktar4, ISNULL(upo.HBirim, pd.Birim) as HBirim
    FROM siparis_kay sk
    JOIN siparis_har sh ON sk.SipNo=sh.SipNo AND ((sh.Durum='') OR (sh.durum IS NULL))
    JOIN si_gchar si ON si.skod=sh.skod AND si.Modul='i' AND sk.SipNo=si.FisNo AND sh.SipHarinx=si.FisHarInx AND (si.location=sk.Location)
    JOIN @Model_Pd_si pd ON pd.xskod=si.SKOD AND pd.xrkod=si.rkod AND pd.xbkod=si.bedkod AND pd.xFisNo=si.FisNo AND pd.xFinx=si.FisHarInx
    LEFT OUTER JOIN @urtln xxxx ON xxxx.skod=pd.xSKOD AND xxxx.rkod=pd.xrkod AND xxxx.bkod=pd.xbkod AND xxxx.FisNo=pd.xFisNo AND xxxx.Finx=pd.xFinx
    LEFT OUTER JOIN Urt_Plan_ozdur upo ON upo.SipNo=sk.SipNo AND upo.SipHarinx=sh.Sipharinx AND upo.urkod=si.rkod AND upo.ubedkod=si.Bedkod AND upo.proses=pd.proses AND upo.Activid=0
    LEFT OUTER JOIN StokKart st2 ON st2.SKod=ISNULL(upo.hskod, pd.SKod)
    LEFT OUTER JOIN Dbo.P_RNK_Tip rn2 ON rn2.Renk_kod = ISNULL(upo.hrkod, ISNULL(pd.r1, pd.r2))
    LEFT OUTER JOIN Dbo.P_Beden_D Bed2 ON Bed2.Bedinx = ISNULL(upo.hbedkod, ISNULL(pd.b1, pd.b2))
    WHERE (sk.SipTip='S') AND (sk.Location IN (${pLocs}))
    GROUP BY ISNULL(upo.HSKod, pd.skod), st2.Tanim, rn2.Renk_kod, rn2.Tanim, Bed2.Bedinx, Bed2.Beden, ISNULL(upo.HBirim, pd.Birim);

    -- 5. ADIM: MEVCUT STOK VE SATIN ALMA BİLGİLERİNİN STOKHAREKET TABLOSUNDAN ÇEKİLMESİ
    UPDATE th SET Miktar2 = ISNULL((SELECT SUM(Miktar) FROM StokHareket WHERE SKod=th.hskod AND RKod=th.HRKod AND BedKod=th.HBedKod AND Location IN (${rLocs}) AND (FisTip<>'Siparis')), 0)
    FROM @TableHamGroup th;

    UPDATE th SET Miktar3 = ISNULL((SELECT SUM(Miktar) FROM StokHareket WHERE SKod=th.hskod AND RKod=th.HRKod AND BedKod=th.HBedKod AND Location IN (${rLocs}) AND (FisTip='Siparis' AND FisTur LIKE '%sa%')), 0)
    FROM @TableHamGroup th;

    -- 6. ADIM: NET İHTİYAÇ HESAPLAMA
    UPDATE @TableHamGroup SET Miktar4 = (Miktar1 - (Miktar2 + Miktar3));

    -- FİNAL SELECT
    SELECT 
        hskod, HSKod_Tanim, HRKod, HRKod_Tanim, HBedKod, HBeden, HBirim,
        Miktar1, Miktar2, Miktar3, Miktar4, Miktar1 as MiktarTop
    FROM @TableHamGroup
    WHERE Miktar1 > 0
    ORDER BY hskod;
  `;
};

export default getMrpQuery;
