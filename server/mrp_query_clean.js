/* 
  MRP Analysis Query - Ported from User Snippet
  Supports dynamic @location parameter
  Consolidated Declarations to prevent "Must declare table variable" errors
*/
const getMrpQuery = (location) => {
  const loc = location || 'K0001';
  return `
    DECLARE @locationParam nvarchar(50) = '${loc}';

    -- TÜM TABLO DEKLARASYONLARI EN BAŞTA
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

    -- 1. VERİ TOPLAMA VE İŞLEME BLOKLARI
    insert @Model_Pd_si 
    select si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, isnull(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, null, Null, Null, null, Null, Null, st1.bedkod, st2.bedkod 
    From (siparis_kay sk join siparis_har sh on (sk.SipNo=sh.SipNo) and ((sh.Durum='')or(sh.durum is null)))
    join si_gchar si on (si.skod=sh.skod) and (si.Modul='i') and (sk.SipNo=si.FisNo) and (sh.SipHarinx=si.FisHarInx) and (si.location=sk.Location)
    left outer join Urt_Plan_Model upm on (upm.SipNo=sk.SipNo) and (upm.SipHarinx=sh.Sipharinx) and (upm.Activid=0)
    left outer join Urt_Plan_ozdur upo on (upo.SipNo=sk.SipNo) and (upo.SipHarinx=sh.Sipharinx) and (upo.urkod=si.rkod) and (upo.ubedkod=si.Bedkod) and (upo.Activid=0) and (upo.HEvent='*')
    join model_PD pd on (pd.ModelKod = isnull(upm.ModelKod,'')) and (upo.proses=pd.proses) and (upo.parcainx=pd.parcainx)
    Left Outer join StokKart st1 on (st1.SKod=sh.SKod)
    Left Outer Join Model_M MoMa On (MoMa.ModelKod=pd.ModelKod)
    Left Outer Join Dbo.P_RNK_Tip rn1 On (rn1.Renk_kod=si.Rkod)
    Left Outer Join Dbo.P_Beden_D Bed1 on (Bed1.Bedinx=si.Bedkod)
    Left Outer Join StokKart st2 on (st2.SKod=pd.SKod)
    Left Outer Join Dbo.P_RNK_Tip rn2 On (rn2.Renk_kod=(case when not exists(select top 1 1 from s_gchar sgrr where sgrr.skod=si.SKod and sgrr.modul='X' and FisNo=0 and FisHarInx=0 and Location='') then isnull((select rkod from Model_PDS2R s2r Where (s2r.ModelKod=pd.ModelKod) and (s2r.Proses=pd.Proses) and (s2r.Parcainx=pd.Parcainx) and (s2r.skod=si.SKod)), (select top 1 isnull(RKod,0) from s_gchar sghh where (sghh.skod=pd.SKod) and (sghh.BedKod=0) and (sghh.Modul='X') and FisNo=0 and FisHarInx=0 and Location='')) else isnull((select rkod2 From Model_R2R Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (Proses=pd.Proses Collate turkish_ci_as) and (Parcainx=pd.Parcainx) and (RKod1=si.RKod)), isnull((Select RKod From S_GCHar dx Where (dx.skod=pd.SKod) and (dx.RKod=si.RKod) and (dx.BedKod=0) and (dx.Modul='X') and FisNo=0 and FisHarInx=0 and Location=''), (Select min(isnull(RKod,0)) From S_GCHar gc Where (skod=pd.SKod) and (BedKod=0) and (Modul='X') and FisNo=0 and FisHarInx=0 and Location=''))) end))
    Left Outer Join Dbo.P_Beden_D Bed2 on (Bed2.Bedinx=(case when (isnull(st1.bedkod,'')='') then isnull((select xkod from Model_PDS2X s2x Where (s2x.ModelKod=pd.ModelKod) and (s2x.Proses=pd.Proses) and (s2x.Parcainx=pd.Parcainx) and (s2x.skod=si.SKod)), (select min(bedinx) From Dbo.P_Beden_D dd Where dd.BedKod=st2.bedkod)) else isnull((select Bedkod2 From Model_B2B Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (Proses=pd.Proses Collate turkish_ci_as) and (Parcainx=pd.Parcainx) and (BedKod1=si.BedKod)), (case when st1.bedkod=st2.bedkod then si.BedKod else (select min(bedinx) From Dbo.P_Beden_D dd Where dd.BedKod=st2.bedkod) end)) end))
    Left Outer Join Cari_Kart cr on (cr.CKod=sk.CariKod)
    Where (sk.SipTip='S') and isnull(si.giren,0)-isnull(si.cikan,0)-isNull((Select Sum(isNull(Mik,0)) from (Select (isNull(Giren,0)-isNull(Cikan,0)) as Mik from Urt_plan_gch aaa where skod=sh.skod and rkod=si.rkod and bedkod=si.bedkod and FisNo=sk.SipNo and FisHarinx=sh.SipHarinx and (aaa.RKod=si.RKod) and (aaa.BedKod=si.BedKod) union all Select isNull(Giren,0) from Urt_Em_gch aaa where FisNo=sk.SipNo and skod=sh.skod and rkod=si.rkod and bedkod=si.bedkod and FisHarinx=sh.SipHarinx and (aaa.RKod=si.RKod) and (aaa.BedKod=si.BedKod) union all Select isNull(Giren,0) from UrtX_Em_gch aaa where FisNo=sk.SipNo and skod=sh.skod and rkod=si.rkod and bedkod=si.bedkod and FisHarinx=sh.SipHarinx and (aaa.RKod=si.RKod) and (aaa.BedKod=si.BedKod)) as Sas),0)>0 AND (sk.SipTur = 'N') AND ((sk.Durum='')or(sk.Durum is Null)) AND ((sh.Durum='')or(sh.durum is null)) AND (sk.Location = @locationParam) and exists(select top 1 1 from Urt_Plan_Model upmxx Where upmxx.sipno=si.fisno and upmxx.sipharinx=si.fisharInx and upmxx.activid=0)
    Group by si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, isnull(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, st1.bedkod, st2.bedkod;

    insert @Model_Pd_si 
    select si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, isnull(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, null, Null, Null, null, Null, Null, st1.bedkod, st2.bedkod 
    From (siparis_kay sk join siparis_har sh on (sk.SipNo=sh.SipNo) and ((sh.Durum='')or(sh.durum is null)))
    join si_gchar si on (si.skod=sh.skod) and (si.Modul='i') and (sk.SipNo=si.FisNo) and (sh.SipHarinx=si.FisHarInx) and (si.location=sk.Location)
    left outer join Urt_Plan_Model upm on (upm.SipNo=sk.SipNo) and (upm.SipHarinx=sh.Sipharinx) and (upm.Activid=0)
    left outer join Urt_Plan_ozdur upo on (upo.SipNo=sk.SipNo) and (upo.SipHarinx=sh.Sipharinx) and (upo.urkod=si.rkod) and (upo.ubedkod=si.Bedkod) and (upo.Activid=0) and (upo.HEvent='+')
    join (select upm2.modelkod, upo2.proses, upo2.parcainx, upo2.hskod as skod, upo2.HMiktar as Miktar, upo2.HBirim as Birim, 'G' as Tip, upo2.HLocation as Location, '' as Tanim, '' as Resim, Null as HMikMod, 'E' as PrintOp, upm2.sipno, upm2.sipharinx, upm2.activid, upo2.URKod, upo2.UBedKod, upo2.HRKod, upo2.HBedKod from Urt_Plan_Model upm2 left outer join Urt_Plan_ozdur upo2 on upm2.sipno=upo2.sipno and upm2.sipharinx=upo2.sipharinx and upm2.activid=upo2.activid) pd on pd.sipno=sk.sipno and pd.sipharinx=sh.sipharinx and pd.modelkod=upm.modelkod and pd.activid=upm.activid and pd.URKod=upo.URKod and pd.UBedKod=upo.UBedkod and pd.Proses=upo.proses and pd.Parcainx=upo.Parcainx and pd.SKod=upo.HSKod and pd.HRKod=upo.HRKod and pd.HBedKod=upo.HBedKod
    Left Outer join StokKart st1 on (st1.SKod=sh.SKod)
    Left Outer Join Model_M MoMa On (MoMa.ModelKod=pd.ModelKod)
    Left Outer Join Dbo.P_RNK_Tip rn1 On (rn1.Renk_kod=si.Rkod)
    Left Outer Join Dbo.P_Beden_D Bed1 on (Bed1.Bedinx=si.Bedkod)
    Left Outer Join StokKart st2 on (st2.SKod=pd.SKod)
    Left Outer Join Dbo.P_RNK_Tip rn2 On (rn2.Renk_kod=(case when not exists(select top 1 1 from s_gchar sgrr where sgrr.skod=si.SKod and sgrr.modul='X' and FisNo=0 and FisHarInx=0 and Location='') then isnull((select rkod from Model_PDS2R s2r Where (s2r.ModelKod=pd.ModelKod) and (s2r.Proses=pd.Proses) and (s2r.Parcainx=pd.Parcainx) and (s2r.skod=si.SKod)), (select top 1 isnull(RKod,0) from s_gchar sghh where (sghh.skod=pd.SKod) and (sghh.BedKod=0) and (sghh.Modul='X') and FisNo=0 and FisHarInx=0 and Location='')) else isnull((select rkod2 From Model_R2R Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (Proses=pd.Proses Collate turkish_ci_as) and (Parcainx=pd.Parcainx) and (RKod1=si.RKod)), isnull((Select RKod From S_GCHar dx Where (dx.skod=pd.SKod) and (dx.RKod=si.RKod) and (dx.BedKod=0) and (dx.Modul='X') and FisNo=0 and FisHarInx=0 and Location=''), (Select min(isnull(RKod,0)) From S_GCHar gc Where (skod=pd.SKod) and (BedKod=0) and (Modul='X') and FisNo=0 and FisHarInx=0 and Location=''))) end))
    Left Outer Join Dbo.P_Beden_D Bed2 on (Bed2.Bedinx=(case when (isnull(st1.bedkod,'')='') then isnull((select xkod from Model_PDS2X s2x Where (s2x.ModelKod=pd.ModelKod) and (s2x.Proses=pd.Proses) and (s2x.Parcainx=pd.Parcainx) and (s2x.skod=si.SKod)), (select min(bedinx) From Dbo.P_Beden_D dd Where dd.BedKod=st2.bedkod)) else isnull((select Bedkod2 From Model_B2B Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (Proses=pd.Proses Collate turkish_ci_as) and (Parcainx=pd.Parcainx) and (BedKod1=si.BedKod)), (case when st1.bedkod=st2.bedkod then si.BedKod else (select min(bedinx) From Dbo.P_Beden_D dd Where dd.BedKod=st2.bedkod) end)) end))
    Left Outer Join Cari_Kart cr on (cr.CKod=sk.CariKod)
    Where (sk.SipTip='S') and isnull(si.giren,0)-isnull(si.cikan,0)-isNull((Select Sum(isNull(Mik,0)) from (Select (isNull(Giren,0)-isNull(Cikan,0)) as Mik from Urt_plan_gch aaa where skod=sh.skod and rkod=si.rkod and bedkod=si.bedkod and FisNo=sk.SipNo and FisHarinx=sh.SipHarinx and (aaa.RKod=si.RKod) and (aaa.BedKod=si.BedKod) union all Select isNull(Giren,0) from Urt_Em_gch aaa where FisNo=sk.SipNo and skod=sh.skod and rkod=si.rkod and bedkod=si.bedkod and FisHarinx=sh.SipHarinx and (aaa.RKod=si.RKod) and (aaa.BedKod=si.BedKod) union all Select isNull(Giren,0) from UrtX_Em_gch aaa where FisNo=sk.SipNo and skod=sh.skod and rkod=si.rkod and bedkod=si.bedkod and FisHarinx=sh.SipHarinx and (aaa.RKod=si.RKod) and (aaa.BedKod=si.BedKod)) as Sas),0)>0 AND (sk.SipTur = 'N') AND ((sk.Durum='')or(sk.Durum is Null)) AND ((sh.Durum='')or(sh.durum is null)) AND (sk.Location = @locationParam) and exists(select top 1 1 from Urt_Plan_Model upmxx Where upmxx.sipno=si.fisno and upmxx.sipharinx=si.fisharInx and upmxx.activid=0)
    Group by si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, isnull(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, st1.bedkod, st2.bedkod;

    insert @Model_Pd_si 
    select si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, isnull(pd.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, null, Null, Null, null, Null, Null, st1.bedkod, st2.bedkod 
    From (siparis_kay sk join siparis_har sh on (sk.SipNo=sh.SipNo) and ((sh.Durum='')or(sh.durum is null)))
    join si_gchar si on (si.skod=sh.skod) and (si.Modul='i') and (sk.SipNo=si.FisNo) and (sh.SipHarinx=si.FisHarInx) and (si.location=sk.Location)
    join model_PD pd on (pd.ModelKod = (select top 1 ModelKod From StokModel_C c Where (c.skod=si.skod) and (Active='*'))) and ((not exists(select top 1 1 From Model_PDS a Where (a.ModelKod=pd.ModelKod Collate turkish_ci_as) and (a.Proses=pd.Proses Collate turkish_ci_as) and (a.Parcainx=pd.parcainx)) or exists(select top 1 1 From Model_PDS a Where (a.ModelKod=pd.ModelKod Collate turkish_ci_as) and (a.Proses=pd.Proses Collate turkish_ci_as) and (a.Parcainx=pd.parcainx) and (a.SKod=si.SKod)))) and ((not exists(select top 1 1 From Model_PDR a Where (a.ModelKod=pd.ModelKod Collate turkish_ci_as) and (a.Proses=pd.Proses Collate turkish_ci_as) and (a.Parcainx=pd.parcainx)) or exists(select top 1 1 From Model_PDR a Where (a.ModelKod=pd.ModelKod Collate turkish_ci_as) and (a.Proses=pd.Proses Collate turkish_ci_as) and (a.Parcainx=pd.parcainx) and (a.RKod=si.RKod)))) and ((not exists(select top 1 1 From Model_PDX a Where (a.ModelKod=pd.ModelKod Collate turkish_ci_as) and (a.Proses=pd.Proses Collate turkish_ci_as) and (a.Parcainx=pd.parcainx)) or exists(select top 1 1 From Model_PDX a Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (a.Proses=pd.Proses Collate turkish_ci_as) and (a.Parcainx=pd.parcainx) and (a.XKod=si.BedKod))))
    Left Outer join StokKart st1 on (st1.SKod=sh.SKod)
    Left Outer Join Model_M MoMa On (MoMa.ModelKod=pd.ModelKod)
    Left Outer Join Dbo.P_RNK_Tip rn1 On (rn1.Renk_kod=si.Rkod)
    Left Outer Join Dbo.P_Beden_D Bed1 on (Bed1.Bedinx=si.Bedkod)
    Left Outer Join StokKart st2 on (st2.SKod=pd.SKod)
    Left Outer Join Dbo.P_RNK_Tip rn2 On (rn2.Renk_kod=(case when not exists(select top 1 1 from s_gchar sgrr where sgrr.skod=si.SKod and sgrr.modul='X' and FisNo=0 and FisHarInx=0 and Location='') then isnull((select rkod from Model_PDS2R s2r Where (s2r.ModelKod=pd.ModelKod) and (s2r.Proses=pd.Proses) and (s2r.Parcainx=pd.Parcainx) and (s2r.skod=si.SKod)), (select top 1 isnull(RKod,0) from s_gchar sghh where (sghh.skod=pd.SKod) and (sghh.BedKod=0) and (sghh.Modul='X') and FisNo=0 and FisHarInx=0 and Location='')) else isnull((select rkod2 From Model_R2R Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (Proses=pd.Proses Collate turkish_ci_as) and (Parcainx=pd.Parcainx) and (RKod1=si.RKod)), isnull((Select RKod From S_GCHar dx Where (dx.skod=pd.SKod) and (dx.RKod=si.RKod) and (dx.BedKod=0) and (dx.Modul='X') and FisNo=0 and FisHarInx=0 and Location=''), (Select min(isnull(RKod,0)) From S_GCHar gc Where (skod=pd.SKod) and (BedKod=0) and (Modul='X') and FisNo=0 and FisHarInx=0 and Location=''))) end))
    Left Outer Join Dbo.P_Beden_D Bed2 on (Bed2.Bedinx=(case when (isnull(st1.bedkod,'')='') then isnull((select xkod from Model_PDS2X s2x Where (s2x.ModelKod=pd.ModelKod) and (s2x.Proses=pd.Proses) and (s2x.Parcainx=pd.Parcainx) and (s2x.skod=si.SKod)), (select min(bedinx) From Dbo.P_Beden_D dd Where dd.BedKod=st2.bedkod)) else isnull((select Bedkod2 From Model_B2B Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (Proses=pd.Proses Collate turkish_ci_as) and (Parcainx=pd.Parcainx) and (BedKod1=si.BedKod)), (case when st1.bedkod=st2.bedkod then si.BedKod else (select min(bedinx) From Dbo.P_Beden_D dd Where dd.BedKod=st2.bedkod) end)) end))
    Left Outer Join Cari_Kart cr on (cr.CKod=sk.CariKod)
    Where (sk.SipTip='S') and isnull(si.giren,0)-isnull(si.cikan,0)-isNull((Select Sum(isNull(Mik,0)) from (Select (isNull(Giren,0)-isNull(Cikan,0)) as Mik from Urt_plan_gch aaa where skod=sh.skod and rkod=si.rkod and bedkod=si.bedkod and FisNo=sk.SipNo and FisHarinx=sh.SipHarinx and (aaa.RKod=si.RKod) and (aaa.BedKod=si.BedKod) union all Select isNull(Giren,0) from Urt_Em_gch aaa where FisNo=sk.SipNo and skod=sh.skod and rkod=si.rkod and bedkod=si.bedkod and FisHarinx=sh.SipHarinx and (aaa.RKod=si.RKod) and (aaa.BedKod=si.BedKod) union all Select isNull(Giren,0) from UrtX_Em_gch aaa where FisNo=sk.SipNo and skod=sh.skod and rkod=si.rkod and bedkod=si.bedkod and FisHarinx=sh.SipHarinx and (aaa.RKod=si.RKod) and (aaa.BedKod=si.BedKod)) as Sas),0)>0 AND (sk.SipTur = 'N') AND ((sk.Durum='')or(sk.Durum is Null)) AND ((sh.Durum='')or(sh.durum is null)) AND (sk.Location = @locationParam) and ((pd.Tip='X') or (pd.Tip='E') or (pd.Tip='U') or (not exists(select top 1 1 from Urt_Plan_ozdur upmxx Where upmxx.sipno=si.fisno and upmxx.sipharinx=si.fisharInx and upmxx.activid=0 AND upmxx.proses=pd.proses AND (upmxx.parcainx=pd.Parcainx) AND (upmxx.HSKod=pd.SKod)))) and (exists (Select top 1 1 from model_pd pdx2 where pdx2.ModelKod=pd.ModelKod and pdx2.Parcainx=pd.Parcainx and isnull(pdx2.PrintOp,'')='E'))
    Group by si.skod, si.Rkod, si.BedKod, si.FisNo, si.FisHarInx, isnull(pd.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, st1.bedkod, st2.bedkod;

    update pd set r1 = (select rkod from Model_PDS2R s2r Where (s2r.ModelKod=pd.ModelKod) and (s2r.Proses=pd.Proses) and (s2r.Parcainx=pd.Parcainx) and (s2r.skod=xSKod)) from @Model_Pd_si pd where (r1 is null) and not exists(select top 1 1 from s_gchar sgrr where sgrr.skod=xSKod and sgrr.modul='X' and sgrr.FisNo=0 and sgrr.FisHarInx=0 and sgrr.Location='') and exists((select rkod from Model_PDS2R s2r Where (s2r.ModelKod=pd.ModelKod) and (s2r.Proses=pd.Proses) and (s2r.Parcainx=pd.Parcainx) and (s2r.skod=xSKod)));
    update pd set r1= (select top 1 isnull(RKod,0) from s_gchar sghh where (sghh.skod=pd.SKod) and (sghh.BedKod=0) and (sghh.Modul='X') and FisNo=0 and FisHarInx=0 and Location='') from @Model_Pd_si pd where (r1 is null) and not exists(select top 1 1 from s_gchar sgrr where sgrr.skod=xSKod and sgrr.modul='X' and sgrr.FisNo=0 and sgrr.FisHarInx=0 and sgrr.Location='');
    update pd set r1= (select rkod2 From Model_R2R Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (Proses=pd.Proses Collate turkish_ci_as) and (Parcainx=pd.Parcainx) and (RKod1=xRKod)) from @Model_Pd_si pd where (r1 is null) and exists(select top 1 1 from s_gchar sgrr where sgrr.skod=xSKod and sgrr.modul='X' and sgrr.FisNo=0 and sgrr.FisHarInx=0 and sgrr.Location='') and exists((select rkod2 From Model_R2R Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (Proses=pd.Proses Collate turkish_ci_as) and (Parcainx=pd.Parcainx) and (RKod1=xRKod)));
    update pd set r1 = (Select RKod From S_GCHar dx Where (dx.skod=pd.SKod) and (dx.RKod=xRKod) and (dx.BedKod=0) and (dx.Modul='X') and FisNo=0 and FisHarInx=0 and Location='') from @Model_Pd_si pd where (r1 is null) and exists(select top 1 1 from s_gchar sgrr where sgrr.skod=xSKod and sgrr.modul='X' and sgrr.FisNo=0 and sgrr.FisHarInx=0 and sgrr.Location='');
    update pd set r1= (Select min(isnull(RKod,0)) From S_GCHar gc Where (skod=pd.SKod) and (BedKod=0) and (Modul='X') and FisNo=0 and FisHarInx=0 and Location='') from @Model_Pd_si pd where (r1 is null) and exists(select top 1 1 from s_gchar sgrr where sgrr.skod=xSKod and sgrr.modul='X' and sgrr.FisNo=0 and sgrr.FisHarInx=0 and sgrr.Location='');
    update pd set b1= (select xkod from Model_PDS2X s2x Where (s2x.ModelKod=pd.ModelKod) and (s2x.Proses=pd.Proses) and (s2x.Parcainx=pd.Parcainx) and (s2x.skod=xSKod)) from @Model_Pd_si pd Where (b1 is null) and (isnull(uBedGrp,'')='') and exists(select xkod from Model_PDS2X s2x Where (s2x.ModelKod=pd.ModelKod) and (s2x.Proses=pd.Proses) and (s2x.Parcainx=pd.Parcainx) and (s2x.skod=xSKod));
    update pd set b1= (select min(bedinx) From Dbo.P_Beden_D dd Where dd.BedKod=hBedGrp) from @Model_Pd_si pd Where (b1 is null) and (isnull(uBedGrp,'')='');
    update pd set b1= (select Bedkod2 From Model_B2B Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (Proses=pd.Proses Collate turkish_ci_as) and (Parcainx=pd.Parcainx) and (BedKod1=xbKod)) from @Model_Pd_si pd Where (b1 is null) and exists(select Bedkod2 From Model_B2B Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (Proses=pd.Proses Collate turkish_ci_as) and (Parcainx=pd.Parcainx) and (BedKod1=xbKod));
    update pd set b1= (case when uBedGrp=hBedGrp then xbKod else (select min(bedinx) From Dbo.P_Beden_D dd Where dd.BedKod=hBedGrp) end) from @Model_Pd_si pd Where (b1 is null);

    -- 2. DİĞER TABLO VERİLERİNİ ÇEKME
    insert into @urtln select xskod, xrkod, xbkod, xFisNo, xFinx, ModelKod, sum(Mik), sum(Tmik), sum(PMik) from (
        select ii.xskod, ii.xrkod, ii.xbkod, ii.xFisno, ii.xFinx, ii.ModelKod, sum(isNull(xx.Giren,0)-isNull(xx.Cikan,0)) as Mik, 0 as TMik, sum(isNull(xx.Giren,0)-isNull(xx.Cikan,0)) as PMik from (select xskod, xrkod, xbkod, xfisno, xfinx, modelkod from @Model_Pd_si group by xskod, xrkod, xbkod, xfisno, xfinx, modelkod) ii left outer join Urt_plan_gch xx on xx.skod=ii.xskod and xx.rkod=ii.xrkod and xx.bedkod=ii.xbkod and xx.FisNo=ii.xFisNo and xx.Fisharinx=ii.xFinx Group by ii.xskod, ii.xrkod, ii.xbkod, ii.xFisNo, ii.xFinx, ii.ModelKod
        union all select ii.xskod, ii.xrkod, ii.xbkod, ii.xFisno, ii.xFinx, ii.ModelKod, 0 as Mik, sum(isNull(xx.Giren,0)) as TMik, 0 as PMik from (select xskod, xrkod, xbkod, xfisno, xfinx, modelkod from @Model_Pd_si group by xskod, xrkod, xbkod, xfisno, xfinx, modelkod) ii left outer join si_gchar xx on xx.skod=ii.xskod and xx.rkod=ii.xrkod and xx.bedkod=ii.xbkod and xx.FisNo=ii.xFisNo and xx.FisharInx=ii.xFinx Group by ii.xskod, ii.xrkod, ii.xbkod, ii.xFisNo, ii.xFinx, ii.ModelKod
        union all select skod, rkod, bedkod, FisNo, Fisharinx, em.ModelKod, sum(isNull(Giren,0)) as mik, 0 as TMik, 0 as PMik from Urt_Em_gch xx left outer join Urt_Emir em on em.EmirNo=xx.EmirNo Where exists(select fisno from @Model_Pd_si x Where x.xFisNo=xx.FisNo and x.xFinx=xx.FisHarinx and x.xrkod=xx.rkod and x.xbkod=xx.bedkod) Group by skod, rkod, bedkod, FisNo, Fisharinx, em.ModelKod
        union all select skod, rkod, bedkod, FisNo, Fisharinx, em.ModelKod, sum(isNull(Giren,0)) as mik, 0 as TMik, 0 as PMik from UrtX_Em_gch xx left outer join Urtx_Emir em on em.EmirNo=xx.EmirNo Where exists(select fisno from @Model_Pd_si x Where x.xFisNo=xx.FisNo and x.xFinx=xx.FisHarinx and x.xrkod=xx.rkod and x.xbkod=xx.bedkod) Group by skod, rkod, bedkod, FisNo, Fisharinx, em.ModelKod
    ) xx Group by xskod, xrkod, xbkod, xFisNo, xFinx, ModelKod;

    insert @Model_Pd 
    select su.skod, su.Rkod, su.BedKod, su.FisNo, su.FisHarinx, isnull(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, null, Null, Null, null, Null, Null, st1.bedkod, st2.bedkod 
    From (siparis_kay sk join siparis_har sh on (sk.SipNo=sh.SipNo) and ((sh.Durum='')or(sh.durum is null)))
    join Urt_Plan_gch su on (su.skod=sh.skod) and (sk.SipNo=su.FisNo) and (sh.SipHarinx=su.FisHarinx) and (sk.location=su.Location)
    left outer join Urt_Plan_Model upm on (upm.SipNo=sk.SipNo) and (upm.SipHarinx=sh.Sipharinx) and (upm.Activid=0)
    left outer join Urt_Plan_ozdur upo on (upo.SipNo=sk.SipNo) and (upo.SipHarinx=sh.Sipharinx) and (upo.urkod=su.rkod) and (upo.ubedkod=su.Bedkod) and (upo.Activid=0) and (upo.HEvent='*')
    join model_PD pd on (pd.ModelKod = isnull(upm.ModelKod,'')) and (upo.proses=pd.proses) and (upo.parcainx=pd.parcainx)
    Left Outer join StokKart st1 on (st1.SKod=sh.SKod)
    Left Outer Join Model_M MoMa On (MoMa.ModelKod=pd.ModelKod)
    Left Outer Join Dbo.P_RNK_Tip rn1 On (rn1.Renk_kod=su.Rkod)
    Left Outer Join Dbo.P_Beden_D Bed1 on (Bed1.Bedinx=si.Bedkod) -- si referansı varsa su ile değiştirilmeli
    Left Outer Join StokKart st2 on (st2.SKod=pd.SKod)
    Left Outer Join Dbo.P_RNK_Tip rn2 On (rn2.Renk_kod=(case when not exists(select top 1 1 from s_gchar sgrr where sgrr.skod=su.SKod and sgrr.modul='X' and FisNo=0 and FisHarInx=0 and Location='') then isnull((select rkod from Model_PDS2R s2r Where (s2r.ModelKod=pd.ModelKod) and (s2r.Proses=pd.Proses) and (s2r.Parcainx=pd.Parcainx) and (s2r.skod=su.SKod)), (select top 1 isnull(RKod,0) from s_gchar sghh where (sghh.skod=pd.SKod) and (sghh.BedKod=0) and (sghh.Modul='X') and FisNo=0 and FisHarInx=0 and Location='')) else isnull((select rkod2 From Model_R2R Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (Proses=pd.Proses Collate turkish_ci_as) and (Parcainx=pd.Parcainx) and (RKod1=su.RKod)), isnull((Select RKod From S_GCHar dx Where (dx.skod=pd.SKod) and (dx.RKod=su.RKod) and (dx.BedKod=0) and (dx.Modul='X') and FisNo=0 and FisHarInx=0 and Location=''), (Select min(isnull(RKod,0)) From S_GCHar gc Where (skod=pd.SKod) and (BedKod=0) and (Modul='X') and FisNo=0 and FisHarInx=0 and Location=''))) end))
    Left Outer Join Dbo.P_Beden_D Bed2 on (Bed2.Bedinx=(case when (isnull(st1.bedkod,'')='') then isnull((select xkod from Model_PDS2X s2x Where (s2x.ModelKod=pd.ModelKod) and (s2x.Proses=pd.Proses) and (s2x.Parcainx=pd.Parcainx) and (s2x.skod=su.SKod)), (select min(bedinx) From Dbo.P_Beden_D dd Where dd.BedKod=st2.bedkod)) else isnull((select Bedkod2 From Model_B2B Where (ModelKod=pd.ModelKod Collate turkish_ci_as) and (Proses=pd.Proses Collate turkish_ci_as) and (Parcainx=pd.Parcainx) and (BedKod1=su.BedKod)), (case when st1.bedkod=st2.bedkod then su.BedKod else (select min(bedinx) From Dbo.P_Beden_D dd Where dd.BedKod=st2.bedkod) end)) end))
    Left Outer Join Cari_Kart cr on (cr.CKod=sk.CariKod)
    Where (sk.SipTip='S') and ((isNull(su.giren,0)-isNull(su.cikan,0))>0) AND (sk.SipTur = 'N') AND ((sk.Durum='')or(sk.Durum is Null)) AND ((sh.Durum='')or(sh.durum is null)) AND (sk.Location = @locationParam) and exists(select top 1 1 from Urt_Plan_Model upmxx Where upmxx.sipno=su.fisno and upmxx.sipharinx=su.fisharinx and upmxx.activid=0)
    Group by su.skod, su.Rkod, su.BedKod, su.FisNo, su.FisHarinx, isnull(upm.ModelKod,''), pd.Proses, pd.Parcainx, pd.SKod, pd.Miktar, pd.Birim, pd.Tip, pd.Location, pd.Tanim, pd.Resim, pd.HMikMod, pd.PrintOp, st1.bedkod, st2.bedkod;

    -- 3. ANA TABLOYA AKTARIM
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
    Where (sk.SipTip='S') and (isnull(upo.HEvent,'')<>'-') and (xxxx.FisNo is not null) and ((isnull(si.giren,0)-isnull(si.cikan,0)-isNull(xxxx.Mik,0))>0) AND (sk.SipTur = 'N') AND ((sk.Durum='')or(sk.Durum is Null)) AND ((sh.Durum='')or(sh.durum is null)) AND (sk.Location = @locationParam)
    Group by MoMa.ModelKod, pd.Proses, st1.skod, st1.Tanim, isnull(upo.HSKod,pd.skod), st2.Tanim, sk.SipTar, sk.TeslimTar, sh.TerminTarihi, sh.Tanim, sk.SipNo, sk.CariKod, cr.CName, sk.BelgeNo, st1.GrupKod, st1.StokTip, si.RKod, rn1.Tanim, bed1.bedinx, Bed1.Beden, st2.StokSekli, st2.GrupKod, st2.StokTip, st2.BEDKod, isnull(rn2.Renk_kod,0), isnull(rn2.Tanim,''), Bed2.Bedinx, Bed2.Beden, (isnull(upo.HBirim,pd.Birim));

    -- SONUÇ
    Select * from @TableHamGroup;
  `;
};

export default getMrpQuery;
