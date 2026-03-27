const getMrpQuery = (prodLocs, rawLocs) => {
  const formatLocs = (locString) => {
    if (!locString) return "'SU001','SU002','YN002'"; 
    return locString.split(',').filter(l => l.trim() !== '').map(l => `'${l.trim()}'`).join(',');
  };

  const pLocs = formatLocs(prodLocs);
  const rLocs = formatLocs(rawLocs);

  return `
    -- 0. USER ORIGINAL SQL ENGINE (STEP 973)
    DECLARE @Model_Pd_si Table (  
        xskod varchar(15), xrkod int, xbkod int,xFisno int ,xFinx int,    
        ModelKod varchar(30) , Proses varchar(2) , Parcainx int ,    
        SKod varchar(30) , Miktar float , Birim varchar(10) ,    
        Tip varchar(1) , Location varchar(5) , Tanim varchar(250) ,    
        Resim varchar(100) , HMikMod float , PrintOp varchar(1) , 
        r1 int, r2 int, r3 int, b1 int, b2 int, b3 int, 
        uBedGrp varchar(4), hBedGrp varchar(4) 
    );
    
    DECLARE @urtln table (
        skod varchar(15), rkod int, bkod int, Fisno int, Finx int,
        MKod varchar(30), mik float, Tmik float, PMik float
    );

    -- 1. ADIM: SİPARİŞLER VE REÇETELER (HEVENT '*')
    INSERT @Model_Pd_si 
    SELECT si.skod, si.Rkod, si.BedKod,si.FisNo, si.FisHarInx, isnull(upm.ModelKod,''), pd.Proses,pd.Parcainx,pd.SKod, pd.Miktar,pd.Birim,pd.Tip,pd.Location,pd.Tanim,pd.Resim,pd.HMikMod,pd.PrintOp,null,Null,Null,null,Null,Null,st1.bedkod,st2.bedkod 
    FROM (siparis_kay sk join siparis_har sh on (sk.SipNo=sh.SipNo) and ((sh.Durum='')or(sh.durum is null))) 
    JOIN si_gchar si on (si.skod=sh.skod) and (si.Modul='i') and (sk.SipNo=si.FisNo) and (sh.SipHarinx=si.FisHarInx) and (si.location=sk.Location) 
    LEFT OUTER JOIN Urt_Plan_Model upm on (upm.SipNo=sk.SipNo) and (upm.SipHarinx=sh.Sipharinx) and (upm.Activid=0) 
    LEFT OUTER JOIN Urt_Plan_ozdur upo on (upo.SipNo=sk.SipNo) and (upo.SipHarinx=sh.Sipharinx) and (upo.urkod=si.rkod) and (upo.ubedkod=si.Bedkod) and (upo.Activid=0) and (upo.HEvent='*') 
    JOIN model_PD pd on (pd.ModelKod = isnull(upm.ModelKod,'')) and (upo.proses=pd.proses) and (upo.parcainx=pd.parcainx) 
    LEFT OUTER JOIN StokKart st1 on (st1.SKod=sh.SKod) 
    LEFT OUTER JOIN StokKart st2 on (st2.SKod=pd.SKod) 
    WHERE (sk.SipTip='S') AND (sk.SipTur='N') AND ((sk.Durum='')or(sk.Durum is Null)) AND (sk.Location in (${pLocs}))
    GROUP BY si.skod, si.Rkod, si.BedKod,si.FisNo, si.FisHarInx, isnull(upm.ModelKod,''), pd.Proses,pd.Parcainx,pd.SKod, pd.Miktar,pd.Birim,pd.Tip,pd.Location,pd.Tanim,pd.Resim,pd.HMikMod,pd.PrintOp, st1.bedkod, st2.bedkod;

    -- 2. ADIM: RENK/BEDEN MATRİS GÜNCELLEMELERİ (r1, r2, r3, b1, b2, b3)
    UPDATE pd SET r1 = (SELECT rkod from Model_PDS2R s2r Where (s2r.ModelKod=pd.ModelKod) and(s2r.Proses=pd.Proses)and(s2r.Parcainx=pd.Parcainx) and (s2r.skod=xSKod)) FROM @Model_Pd_si pd Where (r1 is null) AND EXISTS((SELECT rkod from Model_PDS2R s2r Where (s2r.ModelKod=pd.ModelKod) and (s2r.Proses=pd.Proses) and (s2r.Parcainx=pd.Parcainx) and (s2r.skod=xSKod)));
    UPDATE pd SET r1= (select rkod2 From Model_R2R Where (ModelKod=pd.ModelKod) and (Proses=pd.Proses) and (Parcainx=pd.Parcainx) and (RKod1=xRKod)) FROM @Model_Pd_si pd Where (r1 is null) AND EXISTS((select rkod2 From Model_R2R Where (ModelKod=pd.ModelKod) and (Proses=pd.Proses) and (Parcainx=pd.Parcainx) and (RKod1=xRKod)));
    UPDATE pd SET b1= (select xkod from Model_PDS2X s2x Where (s2x.ModelKod=pd.ModelKod) and (s2x.Proses=pd.Proses) and (s2x.Parcainx=pd.Parcainx) and (s2x.skod=xSKod)) FROM @Model_Pd_si pd Where (b1 is null);
    
    -- 3. ADIM: @urtln TABLOSUNUN DOLDURULMASI
    INSERT INTO @urtln (skod, rkod, bkod, Fisno, Finx, MKod, mik, Tmik, PMik)
    SELECT xskod, xrkod, xbkod, xFisNo, xFinx, ModelKod, sum(Mik), sum(Tmik), sum(PMik) FROM (
        select ii.xskod, ii.xrkod, ii.xbkod, ii.xFisno, ii.xFinx, ii.ModelKod, sum(isNull(xx.Giren,0)-isNull(xx.Cikan,0)) as Mik, 0 as TMik, sum(isNull(xx.Giren,0)-isNull(xx.Cikan,0)) as PMik from (select xskod,xrkod,xbkod,xfisno,xfinx,modelkod from @Model_Pd_si group by xskod,xrkod,xbkod,xfisno,xfinx,modelkod) ii left outer join Urt_plan_gch xx on xx.skod=ii.xskod and xx.rkod=ii.xrkod and xx.bedkod=ii.xbkod and xx.FisNo=ii.xFisNo and xx.Fisharinx=ii.xFinx Group by ii.xskod,ii.xrkod,ii.xbkod,ii.xFisNo,ii.xFinx,ii.ModelKod 
        union all select ii.xskod,ii.xrkod,ii.xbkod,ii.xFisno,ii.xFinx,ii.ModelKod,0 as Mik, sum(isNull(xx.Giren,0)) as TMik,0 as PMik from (select xskod,xrkod,xbkod,xfisno,xfinx,modelkod from @Model_Pd_si group by xskod,xrkod,xbkod,xfisno,xfinx,modelkod) ii left outer join si_gchar xx on xx.skod=ii.xskod and xx.rkod=ii.xrkod and xx.bedkod=ii.xbkod and xx.FisNo=ii.xFisNo and xx.FisharInx=ii.xFinx Group by ii.xskod,ii.xrkod,ii.xbkod,ii.xFisNo,ii.xFinx,ii.ModelKod
    ) xx Group by xskod,xrkod,xbkod,xFisNo,xFinx,ModelKod;

    -- 4. ADIM: @TableHamGroup TABLOSUNA VERİLERİN TOPLANMASI (SON SELECT İÇİN)
    DECLARE @TableHamGroup TABLE (
        hskod varchar(15), HSKod_Tanim varchar(250), HRKod int, HRKod_Tanim varchar(100), HBedKod int, HBeden varchar(10), 
        Miktar1 float, Miktar2 float, Miktar3 float, Miktar4 float, HBirim varchar(10)
    );

    INSERT INTO @TableHamGroup (hskod, HSKod_Tanim, HRKod, HRKod_Tanim, HBedKod, HBeden, Miktar1, HBirim)
    SELECT isnull(upo.HSKod,pd.skod) as hskod, st2.Tanim as HSKod_Tanim, ISNULL(rn2.Renk_kod,0) as HRKod, isnull(rn2.Tanim,'') as HRKod_Tanim, Bed2.Bedinx as HBedKod, Bed2.Beden as HBeden, Sum(isnull(upo.HMiktar,pd.Miktar)*fn_SiparisMik.Sonuc) as Miktar1, isnull(upo.HBirim,pd.Birim) as HBirim
    FROM siparis_kay sk 
    JOIN siparis_har sh on (sk.SipNo=sh.SipNo) and ((sh.Durum='')or(sh.durum is null))
    JOIN si_gchar si on (si.skod=sh.skod) and (si.Modul='i') and (sk.SipNo=si.FisNo) and (sh.SipHarinx=si.FisHarInx) and (si.location=sk.Location) 
    JOIN @Model_Pd_si pd on pd.xskod=si.SKOD and pd.xrkod=si.rkod and pd.xbkod=si.bedkod and pd.xFisNo=si.FisNo and pd.xFinx=si.FisHarInx
    LEFT OUTER JOIN @urtln xxxx on xxxx.skod=pd.xSKOD and xxxx.rkod=pd.xrkod and xxxx.bkod=pd.xbkod and xxxx.FisNo=pd.xFisNo and xxxx.Finx=pd.xFinx
    LEFT OUTER JOIN Urt_Plan_ozdur upo on (upo.SipNo=sk.SipNo) and (upo.SipHarinx=sh.Sipharinx) and (upo.urkod=si.rkod) and (upo.ubedkod=si.Bedkod) and (upo.proses=pd.proses) and (upo.parcainx=pd.parcainx) and (upo.Activid=0)
    LEFT OUTER JOIN StokKart st2 on (st2.SKod=isnull(upo.hskod,pd.SKOD))
    LEFT OUTER JOIN Dbo.P_RNK_Tip rn2 on (rn2.Renk_kod=isnull(upo.hrkod, isnull(pd.r1, isnull(pd.r2, isnull(pd.r3, 0)))))
    LEFT OUTER JOIN Dbo.P_Beden_D Bed2 on (Bed2.Bedinx=isnull(upo.hbedkod, isnull(pd.b1, isnull(pd.b2, 0))))
    CROSS APPLY dbo.kg_ifn_GetConvStkMik(si.skod, isnull(si.giren,0)-isnull(si.cikan,0)-isnull(xxxx.mik,0), sh.Birim, (SELECT Birim FROM StokKart WHERE SKod=sh.SKod)) as fn_SiparisMik
    WHERE (sk.SipTip='S') AND (sk.Location in (${pLocs}))
    GROUP BY isnull(upo.HSKod,pd.skod), st2.Tanim, rn2.Renk_kod, rn2.Tanim, Bed2.Bedinx, Bed2.Beden, isnull(upo.HBirim,pd.Birim);

    -- 5. ADIM: STOK VE BEKLEYEN SATIN ALMA (STOKHAREKET TABLOSUNDAN)
    -- Stok Bakiye (MevcutStok)
    UPDATE th SET Miktar2 = ISNULL(st.Bakiye, 0) FROM @TableHamGroup th LEFT JOIN (SELECT SKod, RKod, SUM(Miktar) as Bakiye FROM StokHareket WHERE Location IN (${rLocs}) AND (FisTip<>'Siparis' OR FisTip IS NULL) GROUP BY SKod, RKod) st ON st.SKod = th.hskod AND (st.RKod = th.HRKod OR st.RKod = 0);
    
    -- Satın Alma (ssa)
    UPDATE th SET Miktar3 = ISNULL(sa.Bekleyen, 0) FROM @TableHamGroup th LEFT JOIN (SELECT SKod, RKod, SUM(Miktar) as Bekleyen FROM StokHareket WHERE Location IN (${rLocs}) AND FisTip='Siparis' AND FisTur LIKE '%sa%' GROUP BY SKod, RKod) sa ON sa.SKod = th.hskod AND (sa.RKod = th.HRKod OR sa.RKod = 0);

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
