# Milestone_FCS Gantt 逐格抽出（cross-check 對照檔）

> 來源 = `Education MTK8189 schedule_-06122026_M151.xlsx` 的兩張情境 sheet：
> **MTK-FCS0924**（= golden / §11 D-E 欄，KS FCS 9/24）與 **MTK-FCS1016-A**（替代情境，FCS 10/16）。
> 兩張共用同一條日期 header（row 3：欄 → 日期）。每個 task 從某欄開始、往右 `1,2,3…` 數格 = 該 task 的天數。
> 用途：交叉驗證 anchor-independent 的 Days，供 Chrome_Spec §12 dependency 公式校核。

## 結論（一致性）

- **Proto(DB) + EVT(SI) 段**（row 13 的 G.O/FAB/SMT、row 21–33 的 ID→…→SI ME parts）：
  **兩情境逐格完全相同** → 這些 Days 是 anchor-independent 的 ground truth。
- **DVT(PV) + PVT(MV) 段**：底層 Days 一致（MV FAB 兩者皆 16 天；PV/ME parts ±1），
  calendar 差異 = (a) FCS 錨點不同、(b) 各 phase 視窗壓到的假日不同（如 PV 0924 壓到 Dragon 6/19–6/21）。

---

## 第 13 列 — G.O.(Gerber) / PCB FAB / SMT 鏈

| 段 | FCS0924 | FCS1016-A | Days（格數）|
|---|---|---|---|
| Layout | G(1/6) → AN(2/8) | 同 | 34（相同）|
| DB Gerber | G-eMMC 2/9 · **G-UFS 2/12** | 同 | 里程碑（相同）|
| DB PCB FAB | BE(2/25) → BR(3/10) | 同 | **14**（相同）|
| DB SMT start | BS(3/11) | 同 | = FAB end +1 |
| DB Phase exit | DJ(4/23) | 同 | 相同 |
| SI Gerber=FAB d1 | DN(4/27) | 同 | （G 即 FAB 第1天）|
| SI PCB FAB | DN(4/27) → EB(5/11) | 同 | **15**（相同）|
| SI SMT start | EC(5/12) | 同 | = FAB end +1 |
| PV Gerber=FAB d1 | FN(6/18) | FT(6/24) | 錨點不同 |
| PV PCB FAB | FN(6/18) → GF(7/6) = **19** | FT(6/24) → GH(7/8) = **15** | 差 4 = Dragon 6/19–6/21 假日延展 |
| PV SMT start | GG(7/7) | GI(7/9) | = FAB end +1 |
| MV Gerber=FAB d1 | HV(8/16) | IJ(8/31) | 錨點不同 |
| MV PCB FAB | HV(8/16) → IK(9/1) = **16** | IJ(8/31) → IY(9/15) = **16** | **16（相同長度）** |
| MV SMT start | IL(9/2) | IZ(9/16) | = FAB end +1 |
| FCS | JH(9/24) | KD(10/16) | 錨點 |

要點：
- **PCB FAB 第 1 天 = Gerber(G.O.) 當天**（SI/PV/MV 的 `G` 就是 FAB 格 1）。
- DB 看似有 2/12→2/25 空檔 = **CNY 2/14–2/22 把 FAB span 推到年後**，非額外 offset。
- **SMT start = PCB FAB end + 1**（DB 3/10→3/11、SI 5/11→5/12 皆成立）。
- Ship PCBA ETA **不在本列**；在 row 15（SVTP/NSDD），= SVTP test start（DB 3/23）。

---

## 第 21–36 列 — ME 鏈

| ME task | 列 | FCS0924 | FCS1016-A | Days |
|---|---|---|---|---|
| ID/ME (ID Lock) | R21 | 1/6 | 同 | 起點 |
| ME design | R22 | G(1/6) → AJ(2/4) | 同 | **30**（相同）|
| Mockup build/release | R25 | AK(2/5) → AS(2/13) | 同 | **9**（相同）|
| Mockup review | R26 | BE(2/25) | 同 | 里程碑（相同，CNY 後）|
| DFM review | R28 | BJ(3/2) | 同 | 相同（跨 228 假日）|
| EC modification | R29 | BL(3/4) | 同 | 相同 |
| Tooling Release | R30/31 | BO(3/7) → DD(4/17) | 同 | **42**（相同）|
| T1 & T2 | R32 | DE(4/18) → DL(4/25) | 同 | **8**（相同）|
| SI(EVT) ME parts | R33 | DM(4/26) → EC(5/12) | 同 | **17**（相同）|
| SI(EVT) Pre-build | R14 | EF(5/15) | 同 | = SI ME parts end +1 |
| PV ME parts | R34 | FR(6/22) → GG(7/7) = 16 | FS(6/23) → GJ(7/10) = 17 | ±1（anchor）|
| PV-R ME parts | R35 | HG(8/2) → HT(8/15) = 14 | HP(8/11) → ID(8/25) = 15 | ±1（anchor）|
| MV ME parts | R36 | IA(8/22) → IO(9/5) = 15 | IM(9/3) → JB(9/18) = 16 | ±1（anchor）|

接法（gap 觀察）：ME design→Mockup→Tooling→T1+T2→SI ME parts→SI Pre-build 多為 **前一 end +1 工作日**；
Mockup review / DFM 的較大 gap 來自 CNY、228 假日（holiday-aware），非固定 offset。

---

## 第 14 列 (FATP) × 第 13 列 (SMT) × 第 17 列 (ME ETA) — Pre-Build 雙閘

> 第 14 列 `FATP` 的 `Pre build` 需**同時**等到 第13列 SMT 完成（PCBA 備妥）與 第17列 `ME ETA`（ME parts 交件）。
> 規則：`Pre-Build = MAX(SMT 完成, ME ETA) + build lead`。

| Phase | SMT(R13) | ME ETA(R17) | Pre-Build(R14) | 卡關的 gate |
|---|---|---|---|---|
| SI(EVT) | EC 5/12 起 | EC **5/12** | EF **5/15** | 兩者約同期 |
| PV(DVT) | GG 7/7 起 → **7/10 end** | GH 7/8 | GK **7/10** | **SMT end 7/10**（ME ETA 7/8 較早）|
| MV(PVT) | IL 9/2 | —（改用 RTM）| 9/5 | `MAX(SMT+1, RTM+1)` |

- PV 證明 **SMT 必須是 gate**：Pre-Build 7/10 = SMT end，晚於 ME ETA 7/8。
- MV 的第二閘是 **RTM**（非 ME ETA）：`MV Pre-Build = MAX(MV SMT+1, RTM+1)`。

---

## Pre-Build 下游：OOBIP / 雙 Ship ETA / Phase exit（§11 + 第14/15/16列）

| Task | SI golden | PV golden | 接法 |
|---|---|---|---|
| Main build | 5/19→5/20 | 7/14→7/15 | = Pre-Build end +1 |
| OOBIP | 5/20→5/27 | 7/11→7/31 | holiday-aware span，起點 anchor 兩 phase 不一致（golden offset 近似）|
| Ship → NSDD (PCBA Only) | 5/22 | 7/15 | = Main build end + buffer（PCBA-only，早）|
| Ship → QAD/TPE (整機) | 5/27 | 7/22 | 整機備妥（晚）= test start −1 |
| SVTP/Google test start | 5/28 | 7/23 | = Ship(QAD/TPE) +1（**非** NSDD）|
| Phase exit | 7/2 | 9/3 | SI = test end +≈6wd；PV 改錨 PV Regression/CFZ（anchor-driven）|

要點：`Ship unit ETA` 是**兩個獨立 gate** — NSDD(PCBA-only) 早、QAD/TPE(整機) 晚且驅動 test。

---

## Region(VN) 線（第18/19列）— 簡化

golden：PV `VN SMT 7/21 → VN Pre-build 7/27 → VN Main-build 7/29`；MV `VN SMT 9/11 → 9/15 → 9/17`。
正解應與 KS 同雙閘 `MAX(region SMT, region ME)`，但目前實作用「lead site + 每階段 offset」近似平移（known limitation）。
TLD（第14列多個 Tooling Lock Down，如 VN PV-R TLD 9/2）未建模。
