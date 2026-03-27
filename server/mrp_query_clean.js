const getMrpQuery = (prodLocs, rawLocs) => {
  const formatLocs = (locString) => {
    if (!locString) return "''";
    return locString.split(',').filter(l => l.trim() !== '').map(l => `'${l.trim()}'`).join(',');
  };

  const pLocs = formatLocs(prodLocs || 'K0001');
  const rLocs = formatLocs(rawLocs || 'K0001');

  return `
    -- Orijinal ve Tam Kapsamlı MRP Sorgu Motoru (Solariz / Korgün Standartı)
    DECLARE @Model_Pd_si Table (
        xskod varchar(15), xrkod int, xbkod int, xFisno int , xFinx int,
        ModelKod varchar(30), Proses varchar(2), Parcainx int, 
        SKod varchar(30), Miktar float, Birim varchar(10), 
        Tip varchar(1), Location varchar(5), Tanim varchar(250), 
        Resim varchar(100), HMikMod float, PrintOp varchar(1),
        r1 int, r2 int, r3 int, b1 int, b2 int, b3 int,
        uBedGrp varchar(4), hBedGrp varchar(4)
    );

    -- 1. BÖLÜM: SİPARİŞ ANALİZİ VE İHTİYAÇLAR (REÇETE MATRİSİ İLE)
    INSERT @Model_Pd_si 
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
    LEFT OUTER JOIN StokKart st1 ON (st1.SKod=sh.SKod)
    LEFT OUTER JOIN StokKart st2 ON (st2.SKod=pd.SKod)
    WHERE (sk.SipTip='S') 
      AND (sk.SipTur = 'N') 
      AND ((sk.Durum='') OR (sk.Durum IS NULL))
      AND (sk.Location IN (${pLocs}))
    GROUP BY si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, ISNULL(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, st1.bedkod, st2.bedkod;

    -- 2. BÖLÜM: RENK VE BEDEN MATRİS GÜNCELLEMELERİ (Model_PDS2R, Model_R2R vb.)
    UPDATE pd SET r1 = (SELECT RKod FROM Model_PDS2R s2r WHERE (s2r.ModelKod=pd.ModelKod) AND (s2r.Proses=pd.Proses) AND (s2r.Parcainx=pd.Parcainx) AND (s2r.skod=xSKod))
    FROM @Model_Pd_si pd
    WHERE (r1 is null) AND EXISTS((SELECT rkod FROM Model_PDS2R s2r WHERE (s2r.ModelKod=pd.ModelKod) AND (s2r.Proses=pd.Proses) AND (s2r.Parcainx=pd.Parcainx) AND (s2r.skod=xSKod)));

    UPDATE pd SET r1= (SELECT rkod2 FROM Model_R2R WHERE (ModelKod=pd.ModelKod) AND (Proses=pd.Proses) AND (Parcainx=pd.Parcainx) AND (RKod1=xRKod))
    FROM @Model_Pd_si pd
    WHERE (r1 is null) AND EXISTS((SELECT rkod2 FROM Model_R2R WHERE (ModelKod=pd.ModelKod) AND (Proses=pd.Proses) AND (Parcainx=pd.Parcainx) AND (RKod1=xRKod)));

    UPDATE pd SET b1= (SELECT xkod FROM Model_PDS2X s2x WHERE (s2x.ModelKod=pd.ModelKod) AND (s2x.Proses=pd.Proses) AND (s2x.Parcainx=pd.Parcainx) AND (s2x.skod=xSKod))
    FROM @Model_Pd_si pd
    WHERE (b1 is null) AND EXISTS((SELECT xkod FROM Model_PDS2X s2x WHERE (s2x.ModelKod=pd.ModelKod) AND (s2x.Proses=pd.Proses) AND (s2x.Parcainx=pd.Parcainx) AND (s2x.skod=xSKod)));

    -- 3. BÖLÜM: STOK VE SATIN ALMA TABLOSUNUN OLUŞTURULMASI
    DECLARE @TableHamGroup TABLE (
        hskod varchar(15), HSKod_Tanim varchar(100), HRKod int, HRKod_Tanim varchar(100), HBedKod int, HBeden varchar(10),
        Miktar1 float, Miktar2 float, Miktar3 float, Miktar4 float, HBirim varchar(10)
    );

    INSERT INTO @TableHamGroup
    SELECT 
        pd.skod as hskod, st2.Tanim as HSKod_Tanim, ISNULL(rn2.Renk_kod,0) as HRKod, ISNULL(rn2.Tanim,'') as HRKod_Tanim,
        Bed2.Bedinx as HBedKod, Bed2.Beden as HBeden,
        SUM(pd.Miktar * o.Miktar) as Miktar1, 0 as Miktar2, 0 as Miktar3, 0 as Miktar4, pd.Birim
    FROM @Model_Pd_si pd
    JOIN @Orders o ON o.xFisno = pd.xFisno AND o.xFinx = pd.xFinx -- Varsayılan eşleşme
    LEFT OUTER JOIN StokKart st2 ON (st2.SKod=pd.SKod)
    LEFT OUTER JOIN Dbo.P_RNK_Tip rn2 ON (rn2.Renk_kod=ISNULL(pd.r1, ISNULL(pd.r2, pd.r3)))
    LEFT OUTER JOIN Dbo.P_Beden_D Bed2 ON (Bed2.Bedinx=ISNULL(pd.b1, ISNULL(pd.b2, pd.b3)))
    GROUP BY pd.skod, st2.Tanim, rn2.Renk_kod, rn2.Tanim, Bed2.Bedinx, Bed2.Beden, pd.Birim;

    -- MEVCUT STOK GÜNCELLEMESİ (StokHareket TABLOSUNDAN)
    UPDATE th SET Miktar2 = ISNULL((SELECT SUM(Miktar) FROM StokHareket WHERE SKod=th.hskod AND RKod=th.HRKod AND (Location IN (${rLocs})) AND (FisTip<>'Siparis' OR FisTip IS NULL)), 0)
    FROM @TableHamGroup th;

    -- BEKLEYEN SATIN ALMA GÜNCELLEMESİ (StokHareket TABLOSUNDAN)
    UPDATE th SET Miktar3 = ISNULL((SELECT SUM(Miktar) FROM StokHareket WHERE SKod=th.hskod AND RKod=th.HRKod AND (Location IN (${rLocs})) AND (FisTip='Siparis' AND FisTur LIKE '%sa%')), 0)
    FROM @TableHamGroup th;

    -- NET İHTİYAÇ HESAPLAMA
    UPDATE @TableHamGroup SET Miktar4 = (Miktar1 - (Miktar2 + Miktar3));

    -- FİNAL SONUÇ SELECT
    SELECT 
        hskod, HSKod_Tanim, HRKod, HRKod_Tanim, HBedKod, HBeden, HBirim,
        Miktar1, Miktar2, Miktar3, Miktar4, Miktar1 as MiktarTop
    FROM @TableHamGroup
    WHERE Miktar1 > 0
    ORDER BY hskod;
  `;
};

export default getMrpQuery;
