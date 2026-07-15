# RefreshBoard_Spec — Function 2 「Refresh Board」排程模擬（草稿 / DRAFT）

> **狀態 / Status:** 已實作於 `RefreshBoard.html`（獨立引擎，iframe 崁入 index.html）。以下 §0–§7 為原始 spec；**§8 為實作後追加功能（req1–8）**。
> ⚠️ **§9 為 authoritative v2 golden（`Validation/refreshboard_schedule.jpg`，Low-Touch 2-Phase，27 wks）——與 §4/§8 衝突處以 §9 為準**。
> 本文件是 Function 2（PCB Refresh Board）的工作規格，做法 = **沿用 Function 1（`ChromeSchedule.html` / `Chrome_Spec.md`）的引擎邏輯，但移除所有 ME 機構 task**。
> ⚠️ Function 1 (`ChromeSchedule.html`) 為 **frozen golden，不可更動**（見 memory `function1-do-not-touch`）。Function 2 另起**獨立引擎 / 獨立檔案**，不共用 Function 1 的 engine/renderer 程式碼。

---

## 0. 一句話目標 (Objective)

Refresh Board = **PCB 換板改版**，沿用現有機構（外殼 / 模具 / ID），因此排程**不含任何新的機構開發**。
把 Function 1 的 `GOLDEN` task 表與 `DEP` 依賴圖，**扣掉 ME（Mechanical）整條鏈**，得到一條純 **PCB / SW / 驗證** 的排程，其餘（working-day、holiday、KS/VN 雙站、FW chain、CFZ/RTM/FCS gate、self-validation）100% 沿用 Function 1。

---

## 1. 100% 沿用 Function 1 的部分 (Reuse as-is)

- Holiday 規則、working-day mode contract（`addDevelopmentDays` / `'normal'` / `'build'`）。
- KS (lead site) / VN(or TH) region 雙站並行 + region 假日分離（Chrome_Spec §7）。
- FW chain（FW Candidate / FW Candidate Testing / PLD）、`CFZ = SR+3→週五`、`RTM = CFZ+7→週五`、`FCS = PR+7`。
- SR / CFZ / RTM / FCS **鎖死 gate** + backward/forward 兩-block reflow（Chrome_Spec §13.1）。
- Google validation 定錨下游（SVTP test 不 drive downstream，Chrome_Spec §13.5）。
- 自我驗證 oracle（§4.2）— 但 refresh board 的 golden 來源待定，見 §6 Q-G1。
- Roadmap 視覺（phase chevron 粉彩 Proto/EVT/DVT/PVT、Example.png 方塊流程圖風格）。

---

## 2. 移除清單 (Removed — ME 機構 task)

以下 GOLDEN task **全部移除**（來源 = `ChromeSchedule.html` `GOLDEN` + `ME_KEY`；但 **`Layout` 屬 PCB layout，保留**，不算機構）：

| # | Phase | 移除的 ME task | golden 日期 |
|---|---|---|---|
| 1 | DB | **ID Lock** | 1/6（原 `['P']` 專案起點）|
| 2 | DB | **ME design** | 1/6→2/4 |
| 3 | DB | **Mockup review** | 2/25→2/26 |
| 4 | DB | **DFM review** | 3/2→3/4 |
| 5 | DB | **Tooling Release** | 3/7→4/17 |
| 6 | DB | **T1+T2** | 4/18→4/25 |
| 7 | SI | **SI ME parts** | 4/26→5/12 |
| 8 | PVR | **ME PV-R build (KS)** | 8/17 |
| 9 | PVR | **By part (KS)** | 8/21→8/25 |
| 10 | PVR | **Tooling lock down (KS)** | 8/25 |
| 11 | PVR | **ME PV-R build (VN)** | 8/27 |
| 12 | PVR | **Tooling lock down (VN)** | 9/2 |
| 13 | PV | **PV ME parts development（備料）** | xlsx `MTK-FCS0924` 有、Function 1 GOLDEN 未列 → 明確排除 |
| 14 | MV | **MV ME parts development（備料）** | xlsx `MTK-FCS0924` 有、Function 1 GOLDEN 未列 → 明確排除 |

→ **DB 段機構全清、SI 少一條 ME parts、整個 PVR phase（純 ME）拆掉 ME 半邊、PV/MV 的 ME parts 備料明確排除。**
> ⚠️ #13/#14 在 Function 1 `GOLDEN` 中**本來就不存在**（PV Pre-Build 早已 SMT 單閘、MV 第二閘 = RTM），故 **DEP 不需變更**；此處僅明列以確保 ME 移除完整。

---

## 3. 移除造成的 Dependency 斷點 (Ripples — 需 user 拍板)

移除 ME 會打斷 3 條依賴邊，這是本 spec 的核心待確認點：

### R1 — `Layout` 失去錨點 → 需要新的專案起點 ✅（Q-DB1 已定）
- Function 1：`DB/ID Lock = ['P']`（Kick-off），`DB/Layout = ['FS','DB/ID Lock']`。
- ID Lock 移除後 **Layout 沒有 predecessor**。golden 中 ID Lock / ME design / Layout **三者都是 1/6 起**。
- ✅ **user 決定：沿用「外部 Kick-off 日」** — Refresh Board 提供一個 **Kick-off 日期輸入欄**，Layout（及整條 backward 端點）錨在該 Kick-off。
  → ✅ **`DB/Layout = ['FS','@KICKOFF']`，offset = Kick-off + 20 工作日（4 週）**（Q-DB1a 已定）。

### R2 — `SI Pre-Build` 的雙閘少一邊 → 變 SMT 單閘 ✅（Q-SI1 已定）
- Function 1：`SI Pre-Build = MAX( SI SMT first-article , SI ME parts ETA )`（Chrome_Spec §12.C）。
- ✅ **user 決定：改 SMT 單閘** → `SI/SI Pre-Build = ['MAX',[['SI/SI SMT build','s']]]`（與 PV Pre-Build 同型）。golden 5/15 若微位移可接受。

### R3 — PVR phase：拆掉 ME、保留 SW-only regression ✅（Q-PVR1 已定）
- Function 1 的 PVR phase **只有 ME PV-R**（mechanical tooling regression）；phase bar `DVT = ['PV','PVR']`。
- ✅ **user 決定：拆掉 ME 半邊，但保留一個 SW-only regression 佔位** → **DVT band 仍保有 PVR 小段**（phase bar 不收成單一 PV）。
- ✅ **SW PVR = 新增一個獨立 `SW PVR` task**（不沿用 `PV Regression`；`PV Regression` 仍留在 PV 段不動）。
  ✅ **錨點 = CFZ 後**（`['FS','@CFZ']`），**duration ≈ 3~4 天**（Q-PVR1a 已定）。此 task 佔住 DVT band 的 PVR 小段。

---

## 4. Refresh Board GOLDEN task 表（ME 移除後 / 提案）

> 日期沿用 Function 1 golden（移除 ME 不動其餘 task 的預設日期，除 R1/R2 的錨點變更）。**這些日期是否要重新校準到一份 refresh-board 專屬 golden，見 Q-G1。**

### DB / Proto（純 PCB）
| Task | Start→End | Dep 變更 |
|---|---|---|
| **Layout** | 1/6→2/11 | **R1：改 `['P']`** |
| DB Gerber released | 2/12 | — (FS Layout) |
| PCB FAB | 2/25→3/10 | — |
| DB SMT Build | 3/11→3/15 | — |
| Ship DB PCBA ETA to TPE RD & HP | 3/23 | — |
| DB SVTP test | 3/23→4/26 | — |
| Google validation | 3/23→4/26 | — |
| Google prototype | 3/23 | — |
| DB exit | 4/23 | — |

### SI / EVT
| Task | Start→End | Dep 變更 |
|---|---|---|
| SI Gerber release | 4/27 | — (handoff off DB Google start) |
| PCB FAB | 4/27→5/11 | — |
| SI SMT build | 5/12→5/24 | — |
| **SI Pre-Build** | 5/15 | **R2：MAX 只剩 SMT 閘** |
| SI Main build | 5/19→5/20 | — |
| OOBIP | 5/20→5/27 | — |
| Ship SI unit ETA to NSDD (PCBA Only) | 5/22 | — |
| Ship SI unit ETA to QAD/TPE RD & HP | 5/27 | — |
| SI SVTP test | 5/28→6/24 | — |
| Google release SI image | 5/7 | — |
| Google EVT unit | 5/27 | — |
| Google dogfooding | 5/28→6/24 | — |
| SI exit | 7/2 | — |

### PV / DVT（含 FW / CFZ / RTM，全保留）
| Task | Start→End |
|---|---|
| PV Gerber release / PCB FAB / PV SMT Build / VN SMT build | 6/18 / 6/19→7/6 / 7/7→7/10 / 7/21→7/22 |
| PV Pre-Build / VN Pre-build / PV Main build / VN Main-build | 7/10 / 7/27 / 7/14→7/15 / 7/29 |
| OOBIP / Ship PV NSDD / Ship PV QAD/TPE | 7/11→7/31 / 7/15 / 7/22 |
| PV SVTP test / Google release PV image / Google DVT unit / Google dogfooding | 7/23→8/19 / 7/2 / 7/22 / 7/23→8/19 |
| FW Candidate / FW Candidate Testing / PLD | 7/28 / 7/29→8/3 / 8/4 |
| **CFZ** / PV Regression / **RTM** / PV exit | 8/28 / 8/31→9/3 / 9/4 / 9/3 |

### PVR / DVT-band
- ME PV-R（KS+VN，5 條）**全移除**；**新增 `SW PVR`** 佔住 PVR 小段。
| Task | Dep | Duration |
|---|---|---|
| **SW PVR**（new） | `['FS','@CFZ']` | ≈ 3~4 天 |

### MV / PVT + FCS（全保留）
| Task | Date |
|---|---|
| MV Gerber release (DVT test+4wk) / MV SMT / VN SMT build | 8/20 / 9/2 / 9/11→9/13 |
| MV Pre-Build `MAX(MV SMT+1, RTM+1)` / VN Pre-build / MV Main build / VN Main-build | 9/5 / 9/15 / 9/8→9/13 / 9/17 |
| Marketing OOBA / Mini Regression -1 / Product release KS / VN / First Order Drop | 9/15 / 9/14→9/16 / 9/17 / 9/24 / 9/17 |
| **KS FCS** / **VN FCS** | 9/24 / 10/2 |

---

## 5. Refresh Board DEP（ME 移除後，僅列變更）

沿用 Function 1 `DEP`，**刪除移除 task 的邊**，並套用 R1/R2：

```diff
- 'DB/ID Lock':['P'],
- 'DB/ME design':['FS','DB/ID Lock'],
- 'DB/Mockup review':['FS','DB/ME design'],
- 'DB/DFM review':['FS','DB/Mockup review'],
- 'DB/Tooling Release':['FS','DB/DFM review'],
- 'DB/T1+T2':['FS','DB/Tooling Release'],
- 'DB/Layout':['FS','DB/ID Lock'],
+ 'DB/Layout':['FS','@KICKOFF'],                       // R1: Layout = Kick-off + 20 工作日(4wk)

- 'SI/SI ME parts':['FS','DB/T1+T2'],
- 'SI/SI Pre-Build':['MAX',[['SI/SI SMT build','s'],['SI/SI ME parts','e']]],
+ 'SI/SI Pre-Build':['MAX',[['SI/SI SMT build','s']]], // R2: SMT 單閘

- 'PVR/ME PV-R build (KS)':['FS','PV/Google dogfooding','s'],
- 'PVR/By part (KS)':['FS','PVR/ME PV-R build (KS)'],
- 'PVR/Tooling lock down (KS)':['FS','PVR/By part (KS)'],
- 'PVR/ME PV-R build (VN)':['OFF','PVR/ME PV-R build (KS)'],
- 'PVR/Tooling lock down (VN)':['OFF','PVR/Tooling lock down (KS)'],
+ 'PVR/SW PVR':['FS','@CFZ'],                          // R3: 新 SW-only regression, ~3~4 天
```
其餘 DEP 邊（DB Gerber/FAB/SMT/Ship/test/exit、SI 下游、PV 全鏈含 PV Regression、MV 全鏈、FCS）**完全不動**。
> `@KICKOFF` = 新增的專案起點 scalar（user 輸入 Kick-off 日 + 20 工作日）；`@CFZ` 沿用 Function 1 的 SR-locked gate。

---

## 6. 待確認問題 (Open Questions — 逐階段 interview)

| # | Phase | 問題 |
|---|---|---|
| ~~Q-DB1~~ ✅ | DB | **外部 Kick-off 日**：提供 Kick-off 輸入欄，Layout 錨在 Kick-off。（R1） |
| **Q-DB1a** | DB | ✅ **Kick-off + N 工作日**（Layout 錨在 Kick-off 後 N 工作日）。N 值待給。 |
| ~~Q-DB2~~ ✅ | DB | **純 PCB** 確認（Layout→Gerber→FAB→SMT→Ship→test→exit），不含機構原型。 |
| ~~Q-SI1~~ ✅ | SI | `SI Pre-Build` 改 **SMT 單閘**（R2）。 |
| ~~Q-PV1~~ ✅ | PV | 變更 = 移除 **PV ME parts development（備料）**（xlsx 有、golden 無 → 已排除，見 §2 #13）。PV 其餘不動。 |
| ~~Q-PVR1~~ ✅ | PVR | **保留 SW-only regression**，**新增獨立 `SW PVR`**，DVT band 仍有 PVR 小段。 |
| ~~Q-PVR1a~~ ✅ | PVR | 新 `SW PVR` = `['FS','@CFZ']`，duration ≈ 3~4 天。 |
| ~~Q-MV1~~ ✅ | MV | 變更 = 移除 **MV ME parts development（備料）**（xlsx 有、golden 無 → 已排除，見 §2 #14）。MV/FCS 其餘不動。 |
| ~~Q-G1~~ ✅ | 全域 | **繼承 Function 1（扣 ME）** — 預設 duration 直接沿用 Function 1 golden，暫無獨立 golden 參考檔。 |
| ~~Q-G2~~ ✅ | 全域 | **新算的 overall** — 顯示 Kick-off → lead site FCS 的實際週數（refresh board 自算，非 38 WKs）。 |
| ~~Q-G3~~ ✅ | 全域 | **同 Function 1** — Branch 圖 OCR + ChromeOS Stable Release 當錨 D + lead/region 選擇；**另加 Kick-off 日輸入欄**。 |

> ✅ **spec 收斂完成** — 所有 Q-* 已拍板，可把 §4/§5 落地為 Refresh Board `GOLDEN` + `DEP`（獨立引擎，不碰 `ChromeSchedule.html`）。

---

## 7. 下一步 (Next Step)

1. ✅ 逐階段 dependency 已與 user 確認（DB / SI / PV / PVR / MV/FCS 全部拍板；見 §3、§6）。
2. ✅ 全域 Q-G1 / Q-G2 / Q-G3 已拍板（繼承 Function 1 扣 ME、新算 overall、輸入/錨點同 Function 1 + Kick-off 欄）。
3. ⏭ 把 §4/§5 收斂為 authoritative 的 Refresh Board `GOLDEN` + `DEP`。
4. ⏭ 於**獨立檔案 / 獨立引擎**實作（不碰 `ChromeSchedule.html`）。

### 收斂摘要 (Converged so far)
- **移除**：DB 全 ME（ID Lock / ME design / Mockup review / DFM review / Tooling Release / T1+T2）、SI ME parts、PVR 全 ME（5 條）、PV/MV ME parts 備料。
- **新錨點**：`DB/Layout = @KICKOFF (= Kick-off + 20 工作日)`；專案起點改由 user 輸入 Kick-off 日。
- **改閘**：`SI Pre-Build` → SMT 單閘。
- **新增**：`PVR/SW PVR = ['FS','@CFZ']`，~3~4 天（DVT band 保留 PVR 小段）。
- **不動**：PV 全鏈（含 PV Regression / FW chain / CFZ / RTM）、MV/FCS 全鏈、KS/VN 雙站、holiday、SR/CFZ/RTM/FCS gate。

---

## 8. 實作後追加功能 (req1–5) — 已落地於 `RefreshBoard.html`

### req1 — `MV G.O.` 顯示改名 `PVT G.O.`
- `dispName()` 加一條：`MV Gerber release` 的顯示（原本 `MV G.O.`）→ **`PVT G.O.`**（PVT = MV 階段）。內部 nm/key 不變。

### req2 — EVT Test Start → DVT G.O. 的 default duration（沿用 Function 1）
- 預設 **21 天（3 週）**＝ Function 1 golden（SI Google dogfooding start 5/28 → PV Gerber 6/18）。
- `PV Gerber (DVT G.O.)` 改為 **可編輯 handoff gate**：`PV Gerber = live EVT(SI) Test Start (Google dogfooding) + siToPvDays`（Kick-off 驅動，走 live HW 鏈）。UI 於 PV Gerber 列提供 `sipv` 輸入框。`SIPV_DEFAULT=21`。

### req3 — DVT Test Start → PVT G.O. 的 default duration（沿用 Function 1）
- 預設 **28 天（4 週）**＝ Function 1 golden（PV Google dogfooding start 7/23 → MV Gerber 8/20）。
- 沿用既有 `mvGoDays` gate（MV Gerber 列 `mvgo` 輸入框），`MVGO_DEFAULT=28`。`MV Gerber (PVT G.O.)` 仍錨在 **SR-nominal DVT Test Start**（two-block 規則，FCS 鎖死）。

### req4 — 可行性檢查 (feasibility)
- **junction = DVT Test Start**：`liveDvt`（Kick-off 驅動的 live PV Google dogfooding start）vs `nominalDvt`（SR-nominal＝`GKEY['PV/Google dogfooding'].gs + shift`）。
- `bufferDays = nominalDvt − liveDvt`；**≥0 可行**（HW 鏈提前備妥），**<0 不可行**（HW 太晚、`overflow = −buffer` 天不足）。
- 不可行時：畫面紅色 `vbar` + **跳 modal** 說明差幾天、列出 bottleneck TASK。
- ⚠️ **關鍵物理**：phase handoff 錨在**測試 START**（pipelined、測試與下一階段 build 重疊），故 **test 時長不在 critical path**；真正的 lever = **build 任務（Layout / PCB FAB / SMT / Pre-Build / Main build）＋ EVT→DVT G.O. handoff（siToPvDays）**。

### req5 — 最佳化機會 (optimization opportunity)
- lever 由 **數值敏感度** `feasLevers()` 算出：逐一把每個可編輯 duration −1 天、rebuild、看 `liveDvt` 是否提前（>0 才列入）→ 保證只列真正有效的 lever（test 任務自動不會出現）。
- 不可行 modal 內提示：把這些 critical-path build/handoff duration 合計縮 ~`overflow` 天即可成行；並註明「縮 test 時長無效（測試重疊）」。
- 當 User 調整後 **infeasible→feasible** 翻轉：跳**綠色成功 modal**（`_prevFeasible` 追蹤狀態，只在狀態變化時跳，不會每次 keystroke 都跳）。

### 驗證 (Node harness)
- fallback（無 Kick-off, SR 8/25）＝重現非-ME golden，feasible buffer 0，38 WKs。
- Kick-off 1/6 → Layout 2/3（+20 工作日）→ liveDvt 8/20 vs nominal 7/23 → **infeasible overflow 28**；levers＝Layout / handoff / PCB FAB / SMT（**無 test**）。
- 縮 handoff+build → buffer +30 **feasible**（翻轉成功）；只縮 test → 仍 −28（證明 test 不在 path）。
- `ChromeSchedule.html` 全程 `git diff` 為空。

### req6 — FCS 模式開關 (lock ↔ slip，可切換)
- Project Setup 加一個 segmented 開關 `fcsMode`（預設 `lock`）：
  - **`lock`（FCS locked）**：`MV Gerber (PVT G.O.) = SR-nominal DVT Test Start + mvGoDays`。MV/FCS 為固定目標日；Kick-off HW 鏈太長時走 req4/5 不可行警告 + modal。
  - **`slip`（FCS slips）**：`MV Gerber = live(Kick-off 驅動) DVT Test Start + mvGoDays`。MV/FCS 隨真實完成日浮動；**不跳不可行 modal**，改顯示藍色 info bar（FCS 日 + 比 SR-aligned 基準晚/早幾天）。
- **兩模式只差 MV Gerber 錨點**；其餘 MV→FCS 鏈自動跟著流。CFZ/RTM 兩模式都仍鎖 SR（Chrome 端固定日）。
- Node harness：lock 下三種 Kick-off FCS 恆為 9/24；slip 下 kick 1/6 → KS FCS **10/20**、VN FCS 10/30（順延 28 天），kick 12/1（提前）→ PVT G.O. 提前到 8/12 但 **FCS 仍 9/24**（被 RTM SW 閘卡住，不會早於軟體 sign-off）——皆正確。

### req7 — Kick-off task 顯示於 roadmap + task list
- GOLDEN 加一個 `T('DB','Kick-off',...,{mile:1})` 里程碑，列 ANCHOR_NAMES，`tryAnchor` 設其日期 = **kickoffDisp**。
- `kickoffDisp = 使用者輸入的 Kick-off；若未輸入則 = Layout − 20 工作日`（用新增的 `subWorkdays` 反推），所以 Kick-off task 一律有日期、且「Kick-off + 20 工作日 = Layout」的關係看得見。
- 排序：gs=1/5 使其在 DB 段排第一；roadmap 落在 Proto 欄的 boxless 清單（layer 6）。
- Overall WKs 改由 `kickoffDisp` 起算（label「Kick-off → FCS」一致）。Node harness：fallback Kick-off 2025-12-08→Layout 1/6（+20 工作日）、overall 42 WKs；kick 2/2→Layout 3/9、overall 36 WKs；unresolved 0。

### req8 — DB 前段 dependency 改為工作日鏈 (Kick-off → Layout → G.O. → PCB FAB → SMT)
- **Kick-off → Layout = 10 工作日**（原 20）；**Layout → G.O. = 10 工作日**（Layout 變 10 工作日活動，G.O. = Layout end）。兩者皆 **可編輯工作日 gate**（task list 的 Kick-off 列 `k2l`、Layout 列 `l2g`，預設 10）。
- 實作：`Layout` 與 `DB Gerber released` 改為 `tryAnchor` 工作日錨（`addWorkdays`）；`KICK_LAYOUT_WD=10 / LAYOUT_GO_WD=10`，override = `kickToLayoutOverride / layoutToGoOverride`。
- **G.O. 接著做 PCB FAB**：`DB PCB FAB` 改為 G.O. + 1 工作日起（消除原本 golden 的 13 天 CNY 空檔）。因 `PCB FAB` 名稱 DB/SI/PV 共用，`tryAnchor` 對非 DB 回傳 `'DEP'` sentinel、resolve loop fall-through 讓 SI/PV 仍走原 DEP。SMT 仍接在 FAB 之後（FS）。
- Node harness：fallback G.O. 1/20→FAB 1/21→SMT 2/4；mid-year(kick 5/4) G.O. 6/1→FAB 6/2→SMT 6/16;SI/PV PCB FAB 照常;unresolved 0。

---

## 9. Refresh Golden v2 — `Validation/refreshboard_schedule.jpg`（authoritative）

> **來源 = Burmilla2/Manx2/Himalayan2 Low-Touch Dev Schedule (2-Phases)**：Kick-off **2024/6/28** → FCS **2025/1/10**，M131 image（Stable cut 11/5、**OS Stable Release 12/3**），**Developing time = 27 wks**（vs ground-up 38 wks）。
> 這是真實 refresh-board 的 golden example；**總 lead time 縮短的來源是結構性的**，不只是單點 duration。

### 9.1 結構性優化（supersede 先前拍板）

| # | 變更 | 取代 |
|---|---|---|
| **S1** | **移除整個 SI/EVT phase** — 2-Phase 結構 `DB → PV → PVR → MV`，DB Test Start **+4 wks** 直接到 PV G.O. | §4 的 SI 段、req2 的 `siToPvDays`（EVT→DVT handoff 不存在了） |
| ~~S2~~ ❌ | ~~Kick-off = DB G.O. 同一天~~ — **user 否決（不合理）**。**維持原規則：Kick-off → DB G.O. 固定 4 週**（`Kick-off +10wd → Layout(10wd) → G.O.`，§8 req8 不變）。golden 圖的 6/28 同日視為該案 layout 已於 RFQ 期間預先完成的特例，不納入 rule。 | —（不取代） |
| **S3** | **單一工廠**（golden 無 KS/VN 分流、無 region offset 鏈） | §1 的 KS/VN 雙站（是否保留為選配待確認 Q-R3） |
| ~~S4~~ ❌ | ~~PLD = CFZ − 7~~ — **user 否決**。PLD 維持原規則 `SR − 21`。 | —（不取代） |
| ~~S5~~ ❌ | ~~FW chain 改 M-image 導向（FW Qual→FW Lock Down）~~ — **user 否決**。FW chain 維持原規則（FW Candidate 單日 → FW Candidate Testing → PLD）。 | —（不取代） |

> ✅ **user 拍板（總則）**：**SR-locked 前向 block 一律用原規則、不修改**——FW Candidate / Sign off、FW Qual/Lock Down（不採用）、CFZ、RTM、PLD、**MV 全鏈**、PR、FCS 全部維持現行引擎公式。**golden 圖只取 HW task duration**（見 §9.2 標 ✅HW 的列）。

### 9.2 Task duration 逐筆對照（§4 舊值 → golden 新值）

> ✅ **本次修改範圍 = 只有下面 DB / handoff / PV 三張表的 HW task duration**；Gate、MV 全鏈、PR、FCS 維持原規則（見表內標註）。

**DB / Proto（純 PCB；前段維持原 4 週規則 — S2 否決）**
| Task | 舊（§4/§8） | **新** | 依據 |
|---|---|---|---|
| Kick-off | 輸入欄，+10wd 到 Layout | **不變**（輸入欄；Kick-off +10wd → Layout） | ❌S2，keep §8 req8 |
| Layout | 10 wd 活動 | **不變**（10 工作日） | ❌S2 |
| DB G.O. | Layout end | **不變**（= Layout end；**Kick-off → G.O. 固定 4 週**） | ❌S2 |
| DB PCB FAB | 14 天（G.O.+1 起） | **17 天，從 G.O. 當天起跑**（6/28→7/15） | 圖 ✅fix |
| DB SMT | 3/11–3/15 span | **里程碑 = FAB end 同日** → **DB G.O.→DB SMT = 正好 17 天**（任何 Stable Release 輸入皆適用；FAB Days 可編輯即直接改此間隔） | 圖 ✅fix |
| **Bring Up**（新 task） | — | **SMT + 7 天**（7/22） | 圖 |
| DB Test Start | Ship ETA 隔日 | **= Bring Up + 1 wk**（7/29，圖上「1 wks」箭頭） | 圖 |
| Google photo type ETA | Google prototype 3/23 | **Test Start + 7 天**（8/5） | 圖 |
| DB Test span / Phase Exit | 4/26 / 4/23 | **Test 4 wks → DB Phase Exit ≈ PV G.O.（8/23）** | 圖 |

**DB → PV handoff**
| 邊 | 舊 | **新** |
|---|---|---|
| 下一 phase G.O. | DB Test +6wks→SI、SI Test +21d→PV | **DB Test Start + 4 wks = PV G.O.**（7/29→8/23） |

**PV / DVT（單輪 build）**
| Task | 舊 | **新（golden）** |
|---|---|---|
| PV G.O. | 6/18 | **8/23**（handoff 4wks） |
| PV PCB FAB | 15 天（G.O.+1 起） | **14 天，從 G.O. 當天起跑**（8/23→9/6） ✅fix |
| PV SMT | 7/7–7/10 | **里程碑 = FAB end 同日** → **PV G.O.→PV SMT = 正好 14 天**（任何 SR 輸入皆適用） ✅fix |
| PV Pre-B | 單日 | **SMT+3 起、3 天**（9/9–9/11） |
| PV Sys-B | 2 天 | **9 天**（9/12–9/20） |
| PV Test Start | Ship ETA 隔日 | **Sys-B end + 3 天**（9/23） |
| Google release DVT image | 7/2 | **8/30**（PV FAB 期間） |
| Google DVT unit ETA | 7/22 | **Test Start + 7 天**（9/30） |

**Gate — 全部維持原規則（user 拍板：SR-locked 前向 block 不修改）**
| Gate | 規則 | 狀態 |
|---|---|---|
| CFZ / FSI Candidate | SR + 3 → 週五 | **原規則 ✓ 不變**（golden 12/6 本來就吻合） |
| RTM / FSI Sign Off | CFZ + 7 → 週五 | **原規則 ✓ 不變**（golden 12/13 吻合） |
| PLD | SR − 21 | **原規則不變**（❌S4） |
| FW Candidate / FW Candidate Testing | PLD−7 單日 / 隔日起至 PLD−1 | **原規則不變**（❌S5；圖上 FW Qual/Lock Down 不採用） |
| SW PVR / PV Regression | 依 §3 R3（CFZ 錨、~3-4 天） | **不變** |

**PV → MV handoff — ✅ user 修正 v2（2026-07-16，SR 唯一定錨版）**
| 邊 | 規則 | 狀態 |
|---|---|---|
| MV G.O.（PVT G.O.） | **lock 模式：MV G.O. = SR − 5（`MVGO_SR_LAG`，原 F1 關係 8/20 vs 8/25），固定不動**；`mvGoDays`（**預設 40 工作日 = 8 ww，排除假日**，可編輯）定義的是 **DVT Test Start 必須提早的量**＝由 MV G.O. **往前推** `subWorkdays(8ww)` → 回推整條 HW 鏈與 Kick-off | **已改** — FCS 永不因 handoff 延後；調大 `mvGoDays` 只會讓回推的 Kick-off 更早（驗證：40→60wd 時 FCS 9/24 不動、Kick 2/13→1/15）。slip 模式才是 live test + 8ww 前推（FCS 浮動）。 |

> ✅ **SR 唯一定錨總則（user 拍板）**：往後 task 一律 SR + duration；往前 HW task 一律由 SR 回推。**驗證 case SR=2024/12/3**：Kick-off 回推 **2024/5/31**（提早、非延後 FCS）、DVT Test 10/3 → PVT G.O. 11/28 = 正好 40 工作日、CFZ 12/6 / RTM 12/13（**與 golden 卡 FSI candidate/sign-off 完全一致**）、FCS 2025/1/2。

**MV / PVT + FCS — 全鏈維持原規則（user 拍板；MV SMT 間隔除外）**
| Task | 狀態 |
|---|---|
| **MV SMT** | ✅ **user 修正（jpg）：MV G.O. → MV SMT = 正好 14 天**（11/29→12/13；任何 SR 輸入皆適用）。Pre-Build 仍 `MAX(SMT+1,RTM+1)` → FCS 不受影響。 |
| Pre-Build `MAX(SMT+1,RTM+1)` / Main build / Marketing OOBA / Mini Regression -1 | **原規則、原 duration 不變** |
| Product release / First Order Drop / **FCS = PR+7** | **原規則不變** |
| VN 系列（SMT/Pre/Main/PR/FCS） | 保留與否 = Q-R3（雙站選配），**非本次修改範圍** |

**假日（2024/2025，golden 圖列）**：Dragon Boat 6/8–6/10 · Moon Festival 9/15–9/17 · China Golden Week 10/1–10/7 · Double Tenth 10/10 · New Year 1/1–1/2 · CNY 1/28–2/2。⚠️ 引擎假日表需支援**跨年 + 依年份**（目前寫死 2026）。

### 9.3 Overall 驗證合約（S2/S4/S5 否決後修訂）
- **SR-locked 前向 block：原規則、原公式，不比對 golden 圖**——CFZ=SR+3→週五、RTM=CFZ+7→週五、PLD=SR−21、FW Candidate/Testing、MV 全鏈（MAX(SMT+1,RTM+1) 等）、PR、FCS=PR+7，全部照現行引擎跑（給 SR 12/3 時 CFZ 12/6、RTM 12/13 自然吻合圖）。
- **HW backward block（本次唯一修改）**：duration 合約 = §9.2 的 golden 值——`Kick-off +10wd → Layout(10wd) → G.O.`（原規則）→ **FAB 17d → SMT → Bring Up +7d → Test Start +7d → (+4wks) PV G.O. → FAB 14d → SMT → Pre-B（SMT+3 起、3d）→ Sys-B 9d → PV Test（Sys-B end +3）**；2-Phase（無 SI，S1）。
- **Overall WKs** = Kick-off → FCS 實算（HW 縮短反映在對 SR 的 buffer 變大；feasibility / FCS 模式照 req4–6 運作）。
- self-validation oracle：HW block 比對 §9.2 duration/間隔；前向 block 照原引擎 golden 規則自我檢查。

### 9.4 待確認（Q-R*，衝突須拍板）
| # | 問題 |
|---|---|
| **Q-R1** | 確認**移除整個 SI/EVT phase**（2-Phase 結構）？這 supersede 先前「SI 段保留」的拍板。 |
| ~~Q-R2~~ ✅ | **維持原規則**：Kick-off → DB G.O. 固定 4 週（+10wd → Layout 10wd → G.O.），user 已拍板否決「同日」。 |
| **Q-R3** | **KS/VN 雙站是否保留為選配**？golden 為單站；若拿掉，region 選單與 VN 系 task 一併移除。 |
| ~~Q-R4~~ ✅ | **維持原 FW chain / PLD 規則**（user 拍板：SR-locked 前向 block 全部不修改；FW Qual/Lock Down、PLD=CFZ−7 不採用）。 |

### 9.5 SR 回推 Kick-off（user 修正 — 實裝）
- **主基準 = Stable Release，HW task 往前回推**。User **未輸入 Kick-off 時，引擎自動回推出 just-in-time Kick-off**（`deriveKickFromSR`：迭代前向鏈直到 live DVT Test Start 落在 SR-nominal 目標、buffer→0 不為負），不再套用「golden 框架平移」的過早開跑。
- 連帶修正：①phase 帶起訖恢復合理（Proto/DVT 相接，無死縫）；②**DVT Test Start → PVT G.O. 恢復 4 wks**（原本 no-kick 時出現 17 wks 假縫）；③`DB exit` golden 對齊 spec = PV G.O. 日。
- **SR-nominal DVT test = SR − 33**（`DVT_SR_LAG`，取自 F1 原始關係 7/23 vs 8/25）：lock 模式 MV G.O. 與 feasibility 目標都以 SR 直接定義，與 HW golden 框架脫鉤。
- 驗證：SR 8/25 無 Kick-off → 回推 Kick-off **3/19**、Proto 3/19–6/20 → DVT 6/20–9/4（相接）、兩段 handoff 各 4wks、buffer 0、FCS 9/24、**Overall 27 wks（= jpg golden）**；SR 9/8 → Kick 4/1、28 wks；手動早 kick 1/6 → buffer +75、38 wks（gap 如實顯示為 slack）。

### 9.6 假日迴避規則（user 拍板 — 實裝）
- **任何 task 的 start 不可落在國定假日**：lead 端（工廠所在國，default China）避 **中國＋台灣** 合併假日表；region task（site=VN/TH，依 Project Setup 選擇）避**所選 region 國別假日**（越南或泰國），一律**順延到下一個工作日**。
- **週末規則沿用 F1 working-day contract**：build 類 task（SMT / Pre-Build / Main build / OOBIP / PCB FAB / Bring Up / Regression）**週六可作業**（只避週日＋假日）；其他 task（test / G.O. / gate 類）避整個週末。
- gate 端補強：PV/MV G.O. snap 到下一工作日；PLD / FW Candidate **往前** snap（不可越過 CFZ）；回推的 Kick-off 也落在工作日。
- 驗證（全 task 逐筆稽核，bad starts = 0）：SR 12/3 → DVT Test **9/21**（避開 Golden Week 10/1–7，修正原本落在 10/3 的錯誤）；SR 8/25 → FCS 9/24 不變（build 週六保留）；TH region、跨 CNY 情境皆乾淨。
- ⚠️ 已知限制：假日表目前為 2026 年值；跨到其他年份只避週末（年度假日表待擴充）。

### 9.7 8 ww 規則在假日跨越 case 的精確化（user 回報 M145 case — 實裝）
- **問題**：SR 2/24（M145）時 SR−5 落在 CNY → PVT G.O. snap 到 2/23,但 8ww 回推基準仍用未 snap 的 2/19;且回推 Kick-off 因鏈上假日量化殘留 buffer;箭頭標籤用日曆週 → 顯示 10 wks。
- **修正**：
  1. **8ww 基準 = snap 後的 PVT G.O.**（`mvGoNominal`）;
  2. **lock 模式 DVT Test Start 釘在 nominal**：`test = MAX(鏈上最早可測日, PVT G.O. − 8ww 工作日)`——料可以等、測試不會晚 → **任何 case 都精確 8 ww**;鏈上最早可測日（`chainReady`）保留給 feasibility 顯示真實 margin;
  3. 回推 Kick-off 加逐日 refine（收斂到 just-in-time）;
  4. **DVT→PVT 箭頭標籤改用工作週**（40wd/5 → 顯示 8 wks）,Proto→DVT 維持日曆週。
- 驗證：M145(SR 2/24, 跨 CNY)、SR 8/25(跨端午)、12/3、10/12(跨 Golden Week)、手動早 kick、slip 模式——**全部 DVT Test → PVT G.O. = 正好 40 工作日**;假日稽核 bad starts = 0。

### 9.8 移除 Kick-off 輸入欄（user 拍板）
- Kick-off 一律由 Stable Release 回推（§9.5 just-in-time），手動輸入已無意義 → **Project Setup 的 Kick-off date 輸入欄移除**（含 auto-format/監聽/reset 清理）。
- Kick-off 仍以 **task 形式**顯示在 task list 與 roadmap（標示 back-derived from SR）；`Kick-off→Layout(10wd)`、`Layout→G.O.(10wd)` 兩個工作日 gate 仍可在 task list 編輯（會連動回推結果）。

### 9.9 移除 FCS mode 開關（user 拍板）
- Kick-off 恆為 SR 回推後，**slip 模式已無適用情境**（不可行狀態不會發生、lock/slip 產出實質相同）→ **FCS mode 開關（req6）整組移除**，排程**永遠 SR-locked**。
- 引擎內 `fcsMode` 分支全數移除：PVT G.O. 恆 = `mvGoNominal`（SR−5 snap），DVT Test 恆釘 `MAX(chainReady, PVT G.O.−8ww)`。feasibility 機制保留（req4/5，含 modal），供日後 duration 編輯造成不可行時使用。
- Project Setup 最終輸入 = **Branch 圖/Stable Release（唯一錨）+ Lead/Region 工廠**。
