/* 
  MRP Analysis Query - FULL Production Logic
  - Restored ALL original blocks (HEvent logic, updates, recipe functions)
  - Dynamic location support preserved
*/
const getMrpQuery = (prodLocs, rawLocs) => {
  const formatLocs = (locString) => {
    if (!locString) return "''";
    return locString.split(',').map(l => `'${l.trim()}'`).join(',');
  };

  const pLocs = formatLocs(prodLocs || 'K0001,K0003');

  return `
    -- 1. DEĞİŞKEN TANIMLARI
    declare @Model_Pd_si Table (  
        xskod varchar(15), xrkod int, xbkod int, xFisno int, xFinx int,
        ModelKod varchar(30), Proses varchar(2), Parcainx int,
        SKod varchar(30), Miktar float, Birim varchar(10),
        Tip varchar(1), Location varchar(5), Tanim varchar(250),
        Resim varchar(100), HMikMod float, PrintOp varchar(1),
        r1 int, r2 int, r3 int, b1 int, b2 int, b3 int,
        uBedGrp varchar(4), hBedGrp varchar(4)
    );

    declare @urtln table (
        skod varchar(15), rkod int, bkod int, Fisno int, Finx int, 
        MKod varchar(30), mik float, Tmik float, PMik float
    );

    declare @Model_Pd Table (  
        xskod varchar(15), xrkod int, xbkod int, xFisno int, xFinx int,
        ModelKod varchar(30), Proses varchar(2), Parcainx int,
        SKod varchar(30), Miktar float, Birim varchar(10),
        Tip varchar(1), Location varchar(5), Tanim varchar(250),
        Resim varchar(100), HMikMod float, PrintOp varchar(1),
        r1 int, r2 int, r3 int, b1 int, b2 int, b3 int,
        uBedGrp varchar(4), hBedGrp varchar(4)
    );

    declare @TableHamGroup TABLE (  
        EmirNo int, ModelKod varchar(30), Proses varchar(2), uskod varchar(15), USKod_Tanim varchar(100), 
        hskod varchar(15), HSKod_Tanim varchar(100), SipTar datetime, TeslimTar datetime, TerminTarihi datetime, 
        SipSatirAck varchar(150), Siparis_No int, CariKod varchar(15), CariKod_Tanim varchar(100), BelgeNo varchar(50), 
        UGrupKod varchar(3), UStokTip varchar(15), URKod int, URKod_Tanim varchar(100), ubedkod int, 
        UBeden varchar(10), HStokSekli varchar(1), HGrupKod varchar(3), HStokTip varchar(15), HBedGrp varchar(4), 
        HRKod int, HRKod_Tanim varchar(100), HBedKod int, HBeden varchar(10), Miktar1 float, Miktar2 float, 
        Miktar3 float, Miktar4 float, HBirim varchar(10)
    );

    -- 2. VERİ TOPLAMA (ORİJİNAL MANTIK)
    
    -- Blok 1: HEvent = '*'
    insert @Model_Pd_si 
    select si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, isnull(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, null, Null, Null, null, Null, Null, st1.bedkod, st2.bedkod 
    From (siparis_kay sk join siparis_har sh on (sk.SipNo=sh.SipNo) and ((sh.Durum='')or(sh.durum is null)))
    join si_gchar si on (si.skod=sh.skod) and (si.Modul='i') and (sk.SipNo=si.FisNo) and (sh.SipHarinx=si.FisHarInx) and (si.location=sk.Location)
    left outer join Urt_Plan_Model upm on (upm.SipNo=sk.SipNo) and (upm.SipHarinx=sh.Sipharinx) and (upm.Activid=0)
    left outer join Urt_Plan_ozdur upo on (upo.SipNo=sk.SipNo) and (upo.SipHarinx=sh.Sipharinx) and (upo.urkod=si.rkod) and (upo.ubedkod=si.Bedkod) and (upo.Activid=0) and (upo.HEvent='*')
    join model_PD pd on (pd.ModelKod = isnull(upm.ModelKod,'')) and (upo.proses=pd.proses) and (upo.parcainx=pd.parcainx)
    Left Outer join StokKart st1 on (st1.SKod=sh.SKod)
    Left Outer Join StokKart st2 on (st2.SKod=pd.SKod)
    Where (sk.SipTip='S') AND (sk.SipTur = 'N') AND ((sk.Durum='')or(sk.Durum is Null)) AND (sk.Location IN (${pLocs}))
    Group by si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, isnull(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, st1.bedkod, st2.bedkod;

    -- Blok 2: HEvent = '+'
    insert @Model_Pd_si 
    select si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, isnull(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, null, Null, Null, null, Null, Null, st1.bedkod, st2.bedkod 
    From (siparis_kay sk join siparis_har sh on (sk.SipNo=sh.SipNo) and ((sh.Durum='')or(sh.durum is null)))
    join si_gchar si on (si.skod=sh.skod) and (si.Modul='i') and (sk.SipNo=si.FisNo) and (sh.SipHarinx=si.FisHarInx) and (si.location=sk.Location)
    left outer join Urt_Plan_Model upm on (upm.SipNo=sk.SipNo) and (upm.SipHarinx=sh.Sipharinx) and (upm.Activid=0)
    left outer join Urt_Plan_ozdur upo on (upo.SipNo=sk.SipNo) and (upo.SipHarinx=sh.Sipharinx) and (upo.urkod=si.rkod) and (upo.ubedkod=si.Bedkod) and (upo.Activid=0) and (upo.HEvent='+')
    join (
        select upm2.modelkod, upo2.proses, upo2.parcainx, upo2.hskod as skod, upo2.HMiktar as Miktar, upo2.HBirim as Birim, 'G' as Tip, upo2.HLocation as Location, '' as Tanim, '' as Resim, Null as HMikMod, 'E' as PrintOp, upm2.sipno, upm2.sipharinx, upm2.activid, upo2.URKod, upo2.UBedKod, upo2.HRKod, upo2.HBedKod 
        from Urt_Plan_Model upm2 left outer join Urt_Plan_ozdur upo2 on upm2.sipno=upo2.sipno and upm2.sipharinx=upo2.sipharinx and upm2.activid=upo2.activid
    ) pd on pd.sipno=sk.sipno and pd.sipharinx=sh.sipharinx and pd.modelkod=upm.modelkod and pd.activid=upm.activid and pd.URKod=upo.URKod and pd.UBedKod=upo.UBedkod and pd.Proses=upo.proses and pd.Parcainx=upo.Parcainx and pd.SKod=upo.HSKod and pd.HRKod=upo.HRKod and pd.HBedKod=upo.HBedKod
    Left Outer join StokKart st1 on (st1.SKod=sh.SKod)
    Left Outer Join StokKart st2 on (st2.SKod=pd.SKod)
    Where (sk.SipTip='S') AND (sk.SipTur = 'N') AND ((sk.Durum='')or(sk.Durum is Null)) AND (sk.Location IN (${pLocs}))
    Group by si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, isnull(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, st1.bedkod, st2.bedkod;

    -- 3. GÜNCELLEMELER (Renk/Beden Mantığı)
    update pd set r1 = (select rkod from Model_PDS2R s2r Where (s2r.ModelKod=pd.ModelKod ) and(s2r.Proses=pd.Proses)and(s2r.Parcainx=pd.Parcainx) and (s2r.skod=xSKod)) from @Model_Pd_si pd where (r1 is null) and not exists(select top 1 1 from s_gchar sgrr where sgrr.skod=xSKod and sgrr.modul='X' and sgrr.FisNo=0 and sgrr.FisHarInx=0 and sgrr.Location='');
    update pd set r1= (select top 1 isnull(RKod,0) from s_gchar sghh where (sghh.skod=pd.SKod)and(sghh.BedKod=0)and(sghh.Modul='X') and FisNo=0 and FisHarInx=0 and Location='') from @Model_Pd_si pd where (r1 is null) and not exists(select top 1 1 from s_gchar sgrr where sgrr.skod=xSKod and sgrr.modul='X' and sgrr.FisNo=0 and sgrr.FisHarInx=0 and sgrr.Location='');
    
    update pd set b1= (select xkod from Model_PDS2X s2x Where (s2x.ModelKod=pd.ModelKod ) and(s2x.Proses=pd.Proses)and(s2x.Parcainx=pd.Parcainx) and (s2x.skod=xSKod)) from  @Model_Pd_si pd Where (b1 is null) and (isnull(uBedGrp,'')='');
    update pd set b1= (select min(bedinx) From Dbo.P_Beden_D dd Where dd.BedKod=hBedGrp) from  @Model_Pd_si pd Where (b1 is null) and (isnull(uBedGrp,'')='');

    -- 4. ARA TABLO HESAPLAMALARI (@urtln)
    insert into @urtln select xskod,xrkod,xbkod,xFisNo,xFinx,ModelKod,sum(Mik),sum(Tmik),sum(PMik) from (
        select ii.xskod,ii.xrkod,ii.xbkod,ii.xFisno ,ii.xFinx ,ii.ModelKod,sum(isNull(xx.Giren,0)-isNull(xx.Cikan,0)) as Mik, 0 as TMik, sum(isNull(xx.Giren,0)-isNull(xx.Cikan,0)) as PMik from (select xskod,xrkod,xbkod,xfisno,xfinx,modelkod from @Model_Pd_si group by xskod,xrkod,xbkod,xfisno,xfinx,modelkod) ii left outer join Urt_plan_gch xx on xx.skod=ii.xskod and xx.rkod=ii.xrkod and xx.bedkod=ii.xbkod and xx.FisNo=ii.xFisNo and xx.Fisharinx=ii.xFinx Group by ii.xskod,ii.xrkod,ii.xbkod,ii.xFisNo,ii.xFinx,ii.ModelKod
        union all select ii.xskod,ii.xrkod,ii.xbkod,ii.xFisno ,ii.xFinx ,ii.ModelKod, 0 as Mik, sum(isNull(xx.Giren,0)) as TMik, 0 as PMik from (select xskod,xrkod,xbkod,xfisno,xfinx,modelkod from @Model_Pd_si group by xskod,xrkod,xbkod,xfisno,xfinx,modelkod) ii left outer join si_gchar xx on xx.skod=ii.xskod and xx.rkod=ii.xrkod and xx.bedkod=ii.xbkod and xx.FisNo=ii.xFisNo and xx.FisharInx=ii.xFinx Group by ii.xskod,ii.xrkod,ii.xbkod,ii.xFisNo,ii.xFinx,ii.ModelKod
    ) xx Group by xskod,xrkod,xbkod,xFisNo,xFinx,ModelKod;

    -- 5. NİHAİ TABLO (@TableHamGroup)
    insert INTO @TableHamGroup 
    select 0 as EmirNo, MoMa.ModelKod, pd.Proses, st1.skod as uskod, st1.Tanim as USKod_Tanim, isnull(upo.HSKod,pd.skod) as hskod, st2.Tanim as HSKod_Tanim, sk.SipTar, sk.TeslimTar, sh.TerminTarihi, sh.Tanim, sk.SipNo as Siparis_No, sk.CariKod, cr.CName as CariKod_Tanim, sk.BelgeNo as BelgeNo, st1.GrupKod as GrupKod, st1.StokTip as StokTip, si.RKod as URKod, rn1.Tanim as URKod_Tanim, bed1.bedinx as ubedkod, Bed1.Beden as UBeden, st2.StokSekli as StokSekli, st2.GrupKod as GrupKod, st2.StokTip as StokTip, st2.BEDKod as BEDKod, isnull(rn2.Renk_kod,0) as HRKod, isnull(rn2.Tanim,'') as HRKod_Tanim, Bed2.Bedinx as HBedKod, Bed2.Beden as HBeden, Sum(isnull(upo.HMiktar,isnull(fn_ModelHamMik.Sonuc,0))*isnull(fn_SiparisMik.Sonuc,0)) as Miktar1, 0 as Miktar2, 0 as Miktar3, 0 as Miktar4, isnull(upo.HBirim,pd.Birim) as HBirim 
    From (siparis_kay sk join siparis_har sh on (sk.SipNo=sh.SipNo) and ((sh.Durum='')or(sh.durum is null)))
    join si_gchar si on (si.skod=sh.skod) and (si.Modul='i') and (sk.SipNo=si.FisNo) and (sh.SipHarinx=si.FisHarInx) and (si.location=sk.Location)
    left outer join Urt_Plan_Model upm on (upm.SipNo=sk.SipNo) and (upm.SipHarinx=sh.Sipharinx) and (upm.Activid=0)
    join @Model_Pd_si pd on pd.xskod=si.SKOD and pd.xrkod=si.rkod and pd.xbkod=si.bedkod and pd.xFisNo=si.FisNo and pd.xFinx=si.FisHarInx
    left outer join @urtln xxxx on xxxx.skod=pd.xSKOD and xxxx.rkod=pd.xrkod and xxxx.bkod=pd.xbkod and xxxx.FisNo=pd.xFisNo and xxxx.Finx=pd.xFinx and xxxx.MKod=pd.ModelKod
    left outer join Urt_Plan_ozdur upo on (upo.SipNo=sk.SipNo) and (upo.SipHarinx=sh.Sipharinx) and (upo.urkod=si.rkod) and (upo.ubedkod=si.Bedkod) and (upo.proses=pd.proses) and (isnull(upo.hskod,'')=isnull(pd.skod,'')) and (upo.parcainx=pd.parcainx) and (upo.Activid=0)
    Left Outer join StokKart st1 on (st1.SKod=sh.SKod)
    Left Outer Join Model_M MoMa On (MoMa.ModelKod=pd.ModelKod)
    Left Outer Join Dbo.P_RNK_Tip rn1 On (rn1.Renk_kod=si.Rkod)
    Left Outer Join Dbo.P_Beden_D Bed1 on (Bed1.Bedinx=si.Bedkod)
    Left Outer Join StokKart st2 on (st2.SKod=isnull(upo.hskod,pd.SKod))
    Left Outer Join Dbo.P_RNK_Tip rn2 On (rn2.Renk_kod=isnull(upo.hrkod, (isnull(pd.r1, isnull(pd.r2, pd.r3)))))
    Left Outer Join Dbo.P_Beden_D Bed2 On (Bed2.Bedinx=isnull(upo.hbedkod, (isnull(pd.b1, isnull(pd.b2, pd.b3)))))
    CROSS APPLY dbo.kg_ifn_GetConvStkMik(si.skod,isnull(si.giren,0)-isnull(si.cikan,0)-isnull(xxxx.mik,0) ,sh.Birim,st1.Birim ) as fn_SiparisMik
    CROSS APPLY dbo.kg_ifn_Model_HamMik (si.skod,si.rkod,si.BedKod,pd.ModelKod,pd.Proses,pd.Parcainx,sk.Sipno,sh.Sipharinx,isnull(upo.Activid,0)) as fn_ModelHamMik
    Left Outer Join Cari_Kart cr on (cr.CKod=sk.CariKod)
    Where (sk.SipTip='S') and (isnull(upo.HEvent,'')<>'-') and (xxxx.FisNo is not null) AND (sk.SipTur = 'N') AND ((sk.Durum='')or(sk.Durum is Null)) AND (sk.Location IN (${pLocs}))
    Group by MoMa.ModelKod, pd.Proses, st1.skod, st1.Tanim, isnull(upo.HSKod,pd.skod), st2.Tanim, sk.SipTar, sk.TeslimTar, sh.TerminTarihi, sh.Tanim, sk.SipNo, sk.CariKod, cr.CName, sk.BelgeNo, st1.GrupKod, st1.StokTip, si.RKod, rn1.Tanim, bed1.bedinx, Bed1.Beden, st2.StokSekli, st2.GrupKod, st2.StokTip, st2.BEDKod, isnull(rn2.Renk_kod,0), isnull(rn2.Tanim,''), Bed2.Bedinx, Bed2.Beden, (isnull(upo.HBirim,pd.Birim));

    -- FINAL OUTPUT (Detail level: Raw Material + Color + Size)
    Select 
        ma.hskod, 
        ma.HSKod_Tanim, 
        ma.HRKod_Tanim, 
        ma.HBeden, 
        ma.HBirim, 
        Sum(ma.Miktar1) as Miktar1, 
        Sum(ma.Miktar2) as Miktar2, 
        Sum(ma.Miktar3) as Miktar3, 
        Sum(ma.Miktar4) as Miktar4,
        Sum(isNull(ma.Miktar1,0)+isNull(ma.Miktar2,0)+isNull(ma.Miktar3,0)+isNull(ma.Miktar4,0)) as MiktarTop
    From @TableHamGroup ma
    Group By ma.hskod, ma.HSKod_Tanim, ma.HRKod_Tanim, ma.HBeden, ma.HBirim
    Having (Sum(isNull(ma.Miktar1,0)+isNull(ma.Miktar2,0)+isNull(ma.Miktar3,0)+isNull(ma.Miktar4,0)) > 0)
    Order By ma.hskod, ma.HRKod_Tanim, ma.HBeden;
  `;
};

export default getMrpQuery;
