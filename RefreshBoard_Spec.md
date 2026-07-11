# RefreshBoard_Spec — Function 2 「Refresh Board」排程模擬（草稿 / DRAFT）

> **狀態 / Status:** 已實作於 `RefreshBoard.html`（獨立引擎，iframe 崁入 index.html）。以下 §0–§7 為原始 spec；**§8 為實作後追加的 5 項功能（req1–5）**。
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
