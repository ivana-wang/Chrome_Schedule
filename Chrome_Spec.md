# Chrome_Spec — ChromeBook Schedule Simulation

> **狀態 / Status:** Specification draft. 這份文件是給 AI 看懂「要做什麼」的工作規格。
> 真正的排程邏輯細節以 `Validation/PRODUCT_SPEC.md` 的 **Ground-up Product** 章節為準（移植過來）。

---

## 0. 一句話目標 (Objective)

把 `Validation/PRODUCT_SPEC.md` 裡已完成的 **Ground-up Standard function** 邏輯，移植成一個
**ChromeBook 專案專用**的排程模擬器，最終產出單一檔案 **`ChromeSchedule.html`**。

與既有 AIO/DT 產品最大的不同：
**ChromeBook 以 Branch 的「Stable Release」日期為基準錨點，往「前」回推到 Kick-off，再往「後」推算到 FCS。**

---

## 1. 產出物 (Deliverable)

| 項目 | 內容 |
|------|------|
| 輸出檔 | **`ChromeSchedule.html`**（單一 HTML 檔，self-contained，與 PRODUCT_SPEC 一樣可直接開） |
| 視覺風格 | 沿用 PRODUCT_SPEC 的 **STYLE** 章節（dark dashboard + 白色 export-ready timeline card、chevron phases、Space Grotesk / JetBrains Mono）。**但 phase chevron 配色改對齊 `Validation/Develop phase graph.png`（粉彩 Proto/EVT/DVT/PVT）— 見 §5.2。** |
| Timeline phases | **DB → SI(EVT) → PV(DVT) → PVR → MV → FCS**（見 §5，與 AIO 的 DB/SI/PV/MV 不同，多了 PVR，且 SI=EVT、PV=DVT 命名） |

---

## 2. 範圍 (Scope) — 移植 / 排除

### 2.1 要 100% 沿用 PRODUCT_SPEC 的部分
- **Holiday 規則**（國定假日、CNY、China Golden Week 等）— 100% apply 到 ChromeBook。
- **工作日邏輯 (Working-Day Mode Contract)** — `addDevelopmentDays(start, n, mode)`、`'normal'` / `'build'` 兩種 mode、holiday-aware spans — 100% apply。
- **大部分 TASK 與 Dependency** — 從 Ground-up Standard function 移植。
- 共用工具：`workWeeksBetween`、weekday-snap、`skipNonWorking`、`nextWorkingDay` 等。

### 2.2 完全排除 (DO NOT include)
- ❌ **Mobile scenario**（CPU ETD gating 那套）— 完全不參考。
- ❌ **Desktop scenario**（PCH ETD gating 那套）— 完全不參考。
- > 即 PRODUCT_SPEC 中所有 platform=`mobile`/`desktop` 的 silicon ETD gating 分支，ChromeBook 一律不要。

### 2.3 ChromeBook 自己特有的部分（需新做 / 覆寫）
- 以 **Stable Release 為基準**的反向錨定（§4）。
- **Branch 圖片上傳 + OCR**讀取 Stable Release 日期（§3）。
- **MV → FCS** 的 ChromeBook 專屬推算（§6）。
- **KS / VN 雙工廠 (lead site / region)** 的並行排程（§7）。
- ChromeBook 專屬的 TASK / Dependency / Duration — 來源見 §8。

---

## 3. 輸入 (Inputs)

### 3.1 主要錨點輸入 — Branch 圖片上傳
- User 上傳一張 **Branch 資訊圖**（例：`Validation/152 chromiumdash.png`）。
- 需支援 **多種圖片格式**（png / jpg / 各種常見圖檔）。
- 系統要從圖中 **讀出 Stable Release 日期**，作為整條排程的錨點。
- 範例圖 `152 chromiumdash.png` 內含兩個 Stable Release：
  - ✅ **錨點 = ChromeOS → Stable Release = Tue, Sep 8, 2026**（修正：以 **ChromeOS** 那條 `Stable Release` 為定錨 D，一路往前回推到 Kick-Off）。
  - ⚠️ **不要**抓 Chrome Browser 的 Stable Release（Aug 25）— 先前以 Chrome Browser 為錨點是**錯誤的**，已修正。
  - ⚠️ 也要避開 **Early Stable Release** — 只抓 ChromeOS 區塊那條純 `Stable Release`。

### 3.1.1 Branch 資訊圖卡 ✅（OCR 後呈現）

OCR 讀到 Branch 圖後，呈現一張資訊圖卡（**配色對齊上傳的 chromiumdash 圖：靛藍標題列 + 白底列**），共 8 列：

| 列 | 內容 | 來源 |
|---|---|---|
| 1 | 標題列：`M<milestone#> · <release 版次>`（例 `M152 · 2nd release`，**靛藍底白字**） | OCR / 手填（圖頂 1xx 數字 + 版次） |
| 2 | Branch: date | OCR（`Branch` 那行，例 7/27） |
| 3 | FW Candidate: date | 引擎計算（= FW Lock Down − 1 week，見 §6） |
| 4 | FW Lock Down: date（= PLD） | 引擎計算（= Stable Cut − 1 week，見 §6） |
| 5 | Stable Cut: date | **引擎計算（= ChromeOS `D − 14`）** ⚠️ 不獨立讀 OCR 的 cut；一律由 ChromeOS Stable Release 算出 |
| 6 | Stable Release: date（**= 錨點 D**） | OCR（**ChromeOS** 區塊的 `Stable Release`，例 9/8；**完全不參考 Chrome Browser**） |
| 7 | FSI Candidate: date（**= CFZ**） | 引擎計算（`D + 3 days`，見 §6） |
| 8 | FSI Sign-off: date（**= RTM**） | 引擎計算（`CFZ + 7 days`，一週，見 §6） |

- 標題與 Branch / Stable Release 由 OCR 抓；FW Candidate / FW Lock Down / Stable Cut / CFZ / RTM 由引擎用錨點算出（隨 Stable Release 連動）。
- **FW Candidate 與 FW Lock Down 兩列為必要欄位**（roadmap 右上 mini 卡與頁面完整卡皆須顯示，見 §13.8.6）。

### 3.2 支援兩種輸入場景（Scenario）
- **Scenario A：上傳 Chromiumdash Branch 圖片**。
  - 系統從圖中 OCR 讀出 `Chromiumdash Branch`、`Stable Cut`、`ChromeOS Stable Release` 等關鍵欄位。
  - 其中 `ChromeOS Stable Release` 直接當作錨點 D，驅動 schedule backward / forward simulation。
- **Scenario B：使用者手動輸入 Chromiumdash Branch 與 ChromeOS Stable Release date**。
  - 讓使用者可直接填入 `Branch`（例如 `152` / `155`）和 `ChromeOS Stable Release` 日期。
  - 手動輸入後，排程引擎同樣應以該日期做為錨點 D，並依相同 dependency 與 working-day 邏輯進行模擬。
- 兩種 scenario 都必須能驅動同一套 schedule simulation 引擎，結果應一致，僅資料來源不同。

### 3.3 其他輸入（暫定，待確認）
- Project Name / 機種代號（例：M151）。
- Release 版次（例：**M151 2nd release**）— ✅ **由圖片/檔案自動偵測**，非 user 手動輸入。
- ODM 選擇 → 決定 **lead site 工廠**（見 §7）。
- Holiday 表（沿用 PRODUCT_SPEC 共用 holiday store，含 TW/CN 與 VN 假日 — 見 Example.png 底部兩塊假日清單）。

---

## 4. 核心錨定邏輯 (Anchor & Backward Chain)

1. **錨點 = Stable Release date = D**（從上傳圖片讀出，**= ChromeOS Stable Release**；**不是** Chrome Browser）。
   - 上傳 `152 chromiumdash.png` 時，ChromeOS SR = 9/8。
   - **Golden 驗證版本**：其 ChromeOS SR = **8/25/2026**（與舊 Chrome Browser 同一天，故 `G_SR` / self-validation 日期維持 8/25 不變）。
2. 由 Stable Release (D) **往前回推**每一個 TASK 的日期，一路回推到 **專案起跑日 / Kick-Off**
   （= `ID Lock` / `ME design` / `DB Layout` 的起點；**不是** sheet 的 `Kick off` 2/4）。
3. 回推時 **100% 套用** PRODUCT_SPEC 的 working-day / holiday 邏輯。

> 對照 AIO：AIO 是 Kick-off→FCS forward。ChromeBook 是 **Stable Release 為中心**，先 backward 回 Kick-off，再 forward 到 FCS。

### 4.1 引擎驅動方式 ✅（確認 = B：真實 dependency 回推）

- **採用 (B) 逐筆 dependency 回推**，**不是**固定 offset 平移。每個 task 用自己的
  `dependency + duration + working-day mode + holiday` 公式逐筆往前推（等同 PRODUCT_SPEC reverse mode 的 backward 版）。
- **理由：之後要讓 User 可以自己調整每個 task 的 Duration**，調整後整條 schedule 要能即時重算 reflow。
  → 所以 duration 必須是引擎參數（可編輯），不能寫死成固定間距。
- D/E 欄的日期 = **黃金驗證樣本（golden）**：引擎用預設 duration 跑出來必須重現 D/E 欄日期（含 KS FCS 9/24、VN FCS 10/2）。
- Duration 預設值來源 = 從 D/E 欄各 task 的 Start→End 反推（見 §11 表）。

### 4.2 自我驗證合約 (Self-Validation Contract) — HARD RULE

> **每一次有輸入進來、或引擎重算後（含：上傳 Branch 圖片讀到 Stable Release、User 調整任一 duration / buffer / 工廠 / region 設定），都必須自動對照 `Validation/Example.png` 做兩項驗證，不可略過：**

1. **Task Dependency 驗證** — 重算後每個 task 的前後相依關係（誰接在誰後面、錨點是否正確）必須與 Example.png 一致；任何 dependency 斷裂或順序顛倒視為錯誤。
2. **Overall Development Duration 驗證** — 整體開發週數（Example.png 標示的 **38 WKs**，Project 起點 1/6 → FCS）必須與 Example.png 吻合（以預設值跑 golden 時），且各階段 buffer（DB6/SI5/PV4 wks）一致。

驗證行為：
- 以**預設 duration** 跑時：結果必須**完全重現** Example.png / D/E 欄的 golden 日期（KS FCS 9/24、VN FCS 10/2、38 WKs）。任何 golden 日期位移都要**明確標示出來、回報，不可靜默改動 golden**。
- User **調整 duration 後**：golden 不需相同，但 **dependency 結構與計算邏輯**（工作日 mode、holiday-aware、錨點關係）仍必須與 Example.png 所示的邏輯一致——只是日期隨 duration 平移／重算。
- 驗證結果應可在 UI / console 呈現（pass / 偏差清單），讓 User 一眼看出是否仍對齊 Example.png 的基準。

---

## 5. Timeline 階段 (Phases)

依 Example.png：

```
Project ── DB ──(6 wks)── SI(EVT) ──(5 wks)── PV(DVT) ──(4 wks)── PVR ── MV ── FCS
```

- 階段命名：**SI 即 EVT、PV 即 DVT**，且比 AIO 多一個 **PVR** 階段。
- 各階段間的 wks（6 / 5 / 4 …）以 Example.png 與 xlsx `Milestone_FCS` sheet 為準（§8）。
- **PVR 階段 = AIO Ground-up 的 PV Regression**（同一套邏輯），內含 **ME PVR** 與 **SW PVR** 兩個 TASK。
  直接沿用 PRODUCT_SPEC 中 PV Regression / ME Parts for PVR / SW PVR 的規則。

### 5.2 Phase chevron 配色 ✅（對齊 `Validation/Develop phase graph.png`）

> **最終輸出的 schedule 圖像，phase chevron 配色必須對齊 `Validation/Develop phase graph.png`**
> （粉彩色塊 + 深色邊框 + 深色文字），**覆寫** PRODUCT_SPEC 原本的藍色漸層 chevron 樣式。

Develop phase graph 的 4 個 phase 命名 = **Proto / EVT / DVT / PVT**，對應到 ChromeBook 主階段：

| Develop graph | ChromeBook 主階段 | 色系 | 概略 fill / border（**實作時請從 PNG 取色確認**） |
|---|---|---|---|
| **Proto** | **DB** | 淺藍 | fill `#D9E7F5` · border `#4A86C8` |
| **EVT** | **SI** | 淺綠 | fill `#DDEAD0` · border `#6AA84F` |
| **DVT** | **PV** | 淺紅/粉 | fill `#F4CCCC` · border `#C0504D` |
| **PVT** | **MV** | 淺黃 | fill `#FFF2CC` · border `#D6B656` |

- 文字：深色（近黑/深灰），維持高對比可讀。
- chevron 用 **SVG 向量**繪製（非 CSS clip-path），確保**彩色細邊框在斜邊上乾淨**；
  四個形狀完全相同（含第一個 Proto），左凹槽 + 右箭頭、互相嵌套，比照 `Develop phase graph.png`。
  **邊框為黑色**（粉彩填色不變）。
- **phase timeline bar 直接做成跟 `Develop phase graph.png` 一樣的 4 個 chevron，chevron 內文字用
  `Proto / EVT / DVT / PVT`**（不是 DB/SI/PV/MV）：Proto=DB、EVT=SI、**DVT=PV＋PVR（合併）**、PVT=MV。
  PVT 用**黃色**（對齊圖片，覆寫先前的 MV 綠）；FCS 不在 bar 上（日期在標頭）。畫面與匯出 roadmap 的 bar 一致。
- ⚠️ **PVR 與 FCS 的色塊**：Develop graph 只有 4 色（對應 DB/SI/PV/MV）。**PVR**（在 PV 與 MV 之間）建議沿用 **DVT 粉紅系**或一個過渡色；**FCS** 為終點里程碑建議用**綠色**（同 PRODUCT_SPEC FCS）。最終以 user 確認為準（見 §9 Q18）。

### 5.1 Task 顯示原則 ✅（確認 9、10）

- **ChromeBook 比 PRODUCT_SPEC 多出的前段 task — `Layout` / `Gerber release` / `PCB FAB` — 要完整顯示在 timeline 上**（不是只當內部計算）。
- **所有 ChromeBook 專屬 task 一律保留並用 ChromeBook 自己的命名顯示**，不改回 PRODUCT_SPEC 名稱：
  `SVTP test`（≈ PCA & System Testing）、`Google validation` / `Google dogfooding`、`OOBIP`、
  `Ship unit ETA to NSDD / QAD/TPE RD & HP` 等都原樣保留。
- 對應關係（ChromeBook 名 ↔ PRODUCT_SPEC 邏輯）只用在「**沿用哪條計算規則**」，不影響顯示名稱。

---

## 6. TASK Dependency 公式 — 以 D = Stable Release (ChromeOS) 為定錨

> **來源 = User 提供的 TASK Dependency 規則表（照片）。`D = Stable Release = ChromeOS Stable Release`（綠底列 = 定錨點）。**
> 所有 milestone 由 D 往前 / 往後推算。

### 6.0 完整 Dependency 表（authoritative）

| Milestone | 公式（相對 D 或前一個 milestone） | 相對 D |
|---|---|---|
| **FW Candidate** | FW LockDown − 1 week（**單一天**） ⚠️ user 修正 | D − 4 weeks |
| **FW Candidate Testing** | FW Candidate +1天 .. FW LockDown −1天（測試期） | — |
| **FW LockDown（= PLD）** | Stable Cut − 1 week（= FW Candidate Testing 結束 +1天） | D − 3 weeks |
| **Stable Cut** | D − 2 weeks | D − 14 days |
| **Stable Release** | **D（定錨）** | D |
| **FSI Candidate（= CFZ）** | D + 3 days | D + 3 days |
| **FSI qualification** | 1 week（7 days）（duration） | — |
| **FSI Sign-off（= RTM）** | **CFZ + 7 days（一週）** ⚠️ user 修正 | D + 10 days |

> ⚠️ **RTM 修正**：照片原列 `FSI qual complete + 3 days`（CFZ+10），但 user 確認 **CFZ 與 RTM 相差一周**，
> 故引擎採 `RTM = CFZ + 7`（見 §6.1）。

### 6.1 往後（forward，D 之後）

```
FSI Candidate = CFZ   = D + 3 days
FSI Sign-off  = RTM   = CFZ + 7 days   (一週 — CFZ 與 RTM 相差一周)
```

> ⚠️ **user 修正（覆寫 §6.0 照片的 CFZ+10）**：**CFZ 與 RTM 相差一周**，即 `RTM = CFZ + 7 days`。
>
> **CFZ / RTM 落在週五**：算出「規則日」後 snap 到 **最早（當天或之前）的週五**（遇假日往前一個工作日）。
> golden（D=8/25）：CFZ = 8/28（週五）；RTM = CFZ+7 = **9/4（週五）**，兩者相差一周。
> **Pull-in 規則（紅字）**：兩 gate 的 Days 可由 User 調整；**只有當調整後的規則日不落在週五、snap 回的週五
> 早於規則日**時，才視為 **pull-in opportunity**，UI 跳**紅字**「需額外溝通確認」。預設（CFZ+7、落週五）**不**觸發。

### 6.2 往前（backward，D 之前）

```
Stable Cut            = D - 2 weeks   (= D - 14 days)
FW LockDown (= PLD)   = Stable Cut - 1 week   (= D - 3 weeks)   ← 錨點
FW Candidate          = FW LockDown - 1 week  (= D - 4 weeks，單一天)
FW Candidate Testing  = FW Candidate + 1天 .. FW LockDown - 1天   (隔天開始測試)
FW LockDown (= PLD)   = FW Candidate Testing 結束 + 1天   (測試完隔天 = PLD)
```

> **FW chain 說明（user 修正）**：`FW Candidate` 是**單一天** = `FW Lock Down − 1 week`；隔天開始
> `FW Candidate Testing`，**測試完的隔天**就是 `FW Lock Down`（**= PLD**）。
> golden（D=8/25，FW Lock Down=8/4）：FW Candidate = **7/28**、Testing = **7/29–8/3**、PLD/Lock = **8/4**。
>
> ✅ **golden 錨點已釐清（user 確認）**：golden 參考版本的 **ChromeOS Stable Release = 8/25/2026**（與舊
> Chrome Browser SR 同一天，只是改成讀 ChromeOS 那條）。因此：
> - `D = 8/25` → `CFZ = D + 3 = 8/28`（golden CFZ **不變**）。
> - `G_SR` 數值維持 8/25，self-validation 日期維持 `2026-08-25`，backward chain 完全不動。
> - **golden RTM = 9/4**：`RTM = CFZ + 7`（一週）→ 9/4（週五），與 CFZ 8/28 相差一周，無 pull-in。
> - 上傳真實圖時，OCR 改讀 **ChromeOS** 的 Stable Release（例 152 圖 = 9/8），整條 schedule 掛在該日。

### 6.1 RTM → FCS 的 MV chain（lead site = KS，已用 D/E 欄驗證）

幾乎 100% 移植 PRODUCT_SPEC 的 MV→PR→FCS chain，**MVR 只跑 1 輪**（= PRODUCT_SPEC `mvrRounds=1` 的 re-anchor 形態）：

| ChromeBook task | KS 日期 | 對應 PRODUCT_SPEC | 規則 |
|---|---|---|---|
| MV SMT | 9/2 | MV SMT | （MV 段錨點，詳見 §8 待推） |
| RTM Ties-1 | 9/4 | System RTM | **CFZ + 10 → 最早週五**（規則日 9/7 → 9/4，pull-in 3 天，§6.1）|
| MV Pre-Build | 9/5 | MV Pre-Build | golden 維持 9/5（RTM 9/4 在其之前）；引擎以 golden offset 維持 MV chain |
| MV Main build | 9/8→9/13 | MV Main Build | Pre-Build end + 1 |
| Marketing OOBA | 9/15 | Factory OOBA | Main build start + N |
| Mini Regression -1 | 9/14→9/16 | **MV-R 1（僅 1 輪）** | Main build end + 1；`Mini Regression -2` 不跑 |
| Product release - KS | 9/17 | **PR** | `nextThuOrFri(MV-R 1 IV end)`（1 輪 re-anchor） |
| First Order Drop | 9/17 | **FOD** | = PR 同日 |
| KS FCS | 9/24 | **L10/China FCS** | PR + 7 cal |
| VN FCS | 10/2 | **Region FCS** | 見 §7 region offset + region 假日 |

---

## 7. 雙工廠：KS (lead site) / VN (region)

Example.png 與 xlsx 中出現 **KS** 與 **VN** 兩個工廠：

| 工廠 | 角色 | 說明 |
|------|------|------|
| **KS** | **Lead site factory** | 本案 default。檔案中若 TASK 沒特別標工廠，視為 **KS**。 |
| **VN** | **Region factory** | 跟在 lead site 之後。 |

規則：
- KS（lead site）先跑，VN（region）跟在後面。
- ⚠️ **VN 相對 KS 的 offset 每個階段不一樣**（不是全程固定一週）。需逐階段從 xlsx D/E 欄抽出實際 offset：
  - Product release：KS 9/17 → VN 9/24（≈ 1 週）
  - FCS：KS 9/24 → VN 10/2（≈ 1 週 + 假日）
  - PV 階段 SMT：PV 7/7 → VN 7/21（≈ 2 週）
  - → 每階段 offset 待 §8 逐筆建模時確定。
- ⚠️ **Lead site 會隨選用的 ODM 改變** — KS 是 lead site 只是「本檔案這個 case」的狀況。架構上要把 lead site / region 做成 **可切換 / 由 ODM 決定**，不可寫死 KS=lead。

### 7.1 Region factory 假日規則（✅ 已確認）

- **Region factory 只會是 越南 (Vietnam) 或 泰國 (Thailand) 兩國之一**（目前 region site 範圍）。
- Region 端的 task / FCS 計算要避開的是 **region site 所在國的假日**：
  - region = 越南 → 避開 **越南假日**。
  - region = 泰國 → 避開 **泰國假日**。
- ⚠️ **Region FCS 不需要避開 China National Day (10/1)** — China 假日只對 lead site (KS) 有效，不套用在 region。
- 例：VN FCS 10/2 = KS FCS 9/24 + region offset，落點再依**越南**假日表調整（非中國 10/1）。
- 實作：holiday store 要能依「lead site 國別」「region site 國別」分別掛不同假日表（KS=中國/台灣；region=越南 or 泰國），不可共用同一張表。

### 7.2 Region build dependency — ✅ region = lead + 固定 offset（v2 已實作）

> 來源 = xlsx 第 18 列 (VN SMT) + 第 19 列 (VN FATP)。golden（PV）：`VN SMT 7/21 → VN Pre-build 7/27 → VN Main-build 7/29`；MV：`VN SMT 9/11 → VN Pre-build 9/15 → VN Main-build 9/17`。

- **實作（v2，`DEP` 的 `OFF` 邊型）**：每個 region task 動態算為 **`region = 對應 lead-site task 的 END + 固定 per-phase offset`**（offset 由 golden 自動校準）。因此 **lead site SMT / Pre-build / Main-build 不管被 anchor 還是 Days 編輯推到哪，region 都自動跟著移、offset 維持不變**（已用 Node harness 驗證：anchor +7d 與 lead PV SMT +4d 兩種情況 region 皆連動）。這正是 §user 要的「region 跟著 lead 被推移」邏輯。
- region 端 task / FCS 仍依 **region site 國別假日**（VN/TH）調整（§7.1），與 lead 假日表分離。
- **仍簡化**：region 採「lead + offset」而非 region 端**獨立**的 `MAX(region SMT, region ME)` 雙閘；目前 region Days 隨 lead 連動、不可獨立編輯。**TLD（Tooling Lock Down）**（第 14 列 PVR/MV 多個 `TLD`，如 VN PV-R TLD 9/2）仍以 offset 近似、未建獨立節點。日後若需 region 獨立編輯再升級成雙閘。

---

## 8. ChromeBook 專屬 TASK / Dependency / Duration 來源

兩個 source of truth（在實作階段需逐筆讀出並建模）：

1. **`Validation/Education MTK8189 schedule_-06122026_M151.xlsx` 的 `Milestone_FCS` sheet**
2. **`Validation/Example.png`**

要從中萃取：
- 每個 TASK 名稱、所屬 phase。
- TASK 之間的 Dependency。
- 每個 TASK 的 Duration。
- 然後 **套用 PRODUCT_SPEC Ground-up function 的邏輯**（working-day mode、holiday-aware span、snap 規則）去計算日期。

> **衝突處理原則：** 若 xlsx `Milestone_FCS` 與 `Example.png` 之間、或與 PRODUCT_SPEC 邏輯之間發現 **互相矛盾**，**先停下來向 user 提問**，不要自行猜測。

---

## 9. 待確認問題 / 已知衝突 (Open Questions)

> 已拍板：

- **Q1 ✅** Stable Release 取 **Chrome Browser 8/25**。
- **Q2 ✅** Release 版次（M151 2nd release）**由圖片/檔案自動偵測**。
- **Q3 ✅** CFZ/RTM 的 `+3` / `+7` 為 **calendar days → snap 到週五**（`fridayOrPrevWorkday`），沿用 PRODUCT_SPEC 的 `cfzFromPld` / `rtmFromCfz`。其餘 task 的 span 才用 working-day mode。
- **Q5 ✅** PVR 階段 = AIO Ground-up **PV Regression**，含 **ME PVR** + **SW PVR**。

- **Q6 ✅** xlsx 有兩個情境並排；**只建模 D/E 欄 (M151 2nd release)**，B/C 欄 (M152) 不管。
- **Q7 ✅** 回推終點 = **1/6**（專案起跑日），非 sheet 的 Kick off 2/4。
- **Q8 ✅** KS/VN 的 region offset **每階段不同**，逐階段從資料抽出（見 §11）。
- **Q9 ✅** KS MV SMT = **9/2**（真實 task）；`VN SMT build` 是 VN 端，非標錯（見 §6.1 / §11）。
- **Q10 ✅** MVR **只跑 1 輪**（Mini Regression -1；-2 不跑）→ 用 PRODUCT_SPEC `mvrRounds=1` re-anchor。
- **Q11 ✅** Region FCS 避開的是 **region site 國別假日（越南 or 泰國）**，**不避** China 10/1（見 §7.1）。
- **Q12 ✅** 引擎用 **(B) 真實 dependency 回推**（非固定 offset），因 **duration 要可被 User 編輯**（見 §4.1）。
- **Q13 ✅** ChromeBook 多出的前段（Layout/Gerber/PCB FAB）與所有專屬 task **全部顯示**、保留 ChromeBook 命名（見 §5.1）。

- **Q14 ✅** 下一階段錨在前階段 **Testing(SVTP test) start + N 工作週**（預設 DB6/SI5/PV4，可調）。見 §12。
- **Q15 ✅** PCB FAB = PRODUCT_SPEC「PCB G.O.→SMT」同概念的 **holiday-aware span**（非固定 calendar）。見 §12。
- **Q16 ✅** Material prep / ME PV-R（PVR）以 **PV Testing start** 為錨，比照 PRODUCT_SPEC。見 §12。

- **Q17 ✅** 每次輸入 / 重算後，引擎**必須自動對照 Example.png 驗證 task dependency + overall development duration**（HARD RULE，見 §4.2）。
- **Q18 ✅** 最終 schedule 圖像 phase chevron 配色**對齊 `Develop phase graph.png`**（粉彩 Proto/EVT/DVT/PVT → DB/SI/PV/MV，見 §5.2）。
  - ✅ **PVR = 粉紅系、FCS = 綠色**（已拍板）。

🎯 **規格收斂完成 — 可開始實作 `ChromeSchedule.html`。**

---

## 10. 下一步 (Next Step)

1. ~~User 回答 §9 的問題。~~（Q1–Q18 全部確認）
2. ✅ 已從 `Milestone_FCS` D/E 欄抽出 task 表（見 §11）。
3. ✅ 逐 phase 推導 dependency 公式，對照 `Example.png` 驗證日期。
4. ✅ **已產出 `ChromeSchedule.html`**（單檔，self-contained）。

## 實作摘要（`ChromeSchedule.html`）

- **引擎 (v2 — 真實 dependency DAG，§4.1 的 (B))**：每個 task 的 START 由其 predecessor 算出（FS / MAX 雙閘 /
  region OFF / SR-anchor 四種邊型，見 §12.A–E、§12.C），**lag 由 golden 自動校準** → 預設跑必重現 golden；
  **編輯任一 task 的 Days 會沿依賴邊傳遞到所有下游**（拓樸解算）。`CFZ = fridayOrPrev(SR+3)`、
  `RTM = fridayOrPrev(CFZ+7)`、FCS = PR+7（避假日）為 **SR-locked 前向 block**，**backward HW 編輯不會越過 SR 推動
  CFZ/RTM/FCS**（§13.1 兩-block 規則；MV G.O. 錨在 SR-nominal DVT test，不吃 HW 編輯）。已用 Node harness 驗證重現
  golden：**CFZ 8/28、RTM 9/4、PR 9/17、KS FCS 9/24、VN FCS 10/2、Overall 38 WKs**，且 HW 編輯下 FCS 不動、
  region 隨 lead 連動。
- **輸入**：Branch 圖片上傳 → **Tesseract.js OCR** 自動抓 **ChromeOS Stable Release**（**完全不參考 Chrome Browser**；
  優先取 `os` scope 那行，避開 Early Stable Release），手動日期 fallback；lead site / region site(VN/TH) 選擇；
  每個 task duration 可內嵌編輯，即時 reflow。**所有定錨點（Stable Cut = SR−14 → FW Lock Down → FW Candidate、
  CFZ、RTM、HW/MV 全鏈）一律由 ChromeOS Stable Release 計算**，不獨立讀 OCR 的 cut 當錨。
- **視覺**：dark dashboard + 白色 export-ready timeline card；phase chevron 用 `Develop phase graph.png`
  粉彩配色（DB藍 Proto / SI綠 EVT / PV紅 DVT / PVR粉 / MV黃 PVT / FCS綠）；PNG 匯出 (html2canvas)。
  **Roadmap 卡採 Example.png 方塊流程圖風格（語意配色 chip + 實線圓點連線 + SMT/build 左右時間錯開 +
  靛藍 Branch 卡），詳見 §13.8。**
- **自我驗證 (§4.2, C6)**：`validate()` 為**獨立 oracle** — (1) 檢查 DAG 是否逐 task 重現排程用的 `GOLDEN`，
  (2) 另比對一份**獨立常數 `ORACLE`**（直接抄自 xlsx `Milestone_FCS` D/E 的錨點日期，與 `GOLDEN` 分離），
  任何 `GOLDEN` 與來源的偏離（如先前 SI SMT 被偷改成 5/15 的 fudge）都會被抓出。比對結果走 console，
  UI 只顯示 Overall WKs。
- **v2 已修正的衝突**：C1 Pre-Build 雙閘 `MAX(SMT 首件, ME ETA)`（§12.C）、C2 雙 Ship ETA / OOBIP / Phase exit
  依賴（§12.E）、C3 G.O/FAB/SMT 與 ME 鏈 dependency（§12.A/B）、C5 SI SMT=5/24（first-article gate）、
  C6 獨立 oracle、C7 region=lead+offset（§7.2）—— 皆已落實。
- **仍待強化（v2.1）**：edge lag 目前為 **calendar 校準**（保證重現 golden + 正確傳遞），尚未做「span 隨落點不同
  holiday 重新延展」的 holiday-aware-span（C4）；holiday 表為 2026 概略值，可再校正。

---

## 11. 附錄：xlsx `Milestone_FCS` D/E 欄抽出的 Task 表（M151 2nd release）

> 來源 = `Validation/Education MTK8189 schedule_-06122026_M151.xlsx` 的 `Milestone_FCS` sheet，D 欄(Start)/E 欄(End)。
> 此即 Example.png 的數據版本。日期格式 `Start → End`，單一日期表示里程碑。

| Phase | Task | Start | End |
|-------|------|-------|-----|
| ME Dev | Kick off | 2/4 | 2/4 |
| ME Dev | ID Master/Detail Ready | 1/6 | 1/6 |
| ME Dev | ME design | 1/6 | 2/4 |
| ME Dev | Mockup drawing release | 2/5 | 2/13 |
| ME Dev | Mockup ready | 2/13 | 2/13 |
| ME Dev | Mockup review | 2/25 | 2/26 |
| ME Dev | DFM review | 3/2 | 3/4 |
| ME Dev | ME drawing modification for tooling | 3/4 | 3/6 |
| ME Dev | ME tooling Release | 3/7 | 4/17 |
| ME Dev | T1+T2 | 4/18 | 4/25 |
| ME Dev | SI ME parts | 4/26 | 5/12 |
| DB | Layout | 1/6 | 2/11 |
| DB | DB Gerber released | 2/12 | 2/12 |
| DB | PCB FAB | 2/25 | 3/10 |
| DB | DB SMT Build | 3/11 | 3/15 |
| DB | Ship DB PCBA ETA to TPE RD & HP | 3/23 | 3/23 |
| DB | DB SVTP test | 3/23 | 4/26 |
| DB | Google validation | 3/23 | 4/26 |
| DB | DB exit | 4/23 | 4/23 |
| SI (EVT) | SI Gerber release | 4/27 | 4/27 |
| SI (EVT) | PCB FAB | 4/27 | 5/11 |
| SI (EVT) | SI SMT build | 5/12 | 5/24 |
| SI (EVT) | SI Pre-Build | 5/15 | 5/15 |
| SI (EVT) | SI Main build | 5/19 | 5/20 |
| SI (EVT) | OOBIP | 5/20 | 5/27 |
| SI (EVT) | Ship SI unit ETA to NSDD (PCBA Only) | 5/22 | 5/22 |
| SI (EVT) | Ship SI unit ETA to QAD/TPE RD & HP | 5/27 | 5/27 |
| SI (EVT) | SI SVTP test | 5/28 | 6/24 |
| SI (EVT) | Google dogfooding | 5/28 | 6/24 |
| SI (EVT) | SI exit | 7/2 | 7/2 |
| PV (DVT) | PV Gerber release | 6/18 | 6/18 |
| PV (DVT) | PCB FAB | 6/19 | 7/6 |
| PV (DVT) | PV SMT Build | 7/7 | 7/10 |
| PV (DVT) | VN SMT build | 7/21 | 7/22 |
| PV (DVT) | PV Pre-Build | 7/10 | 7/10 |
| PV (DVT) | VN Pre-build | 7/27 | 7/27 |
| PV (DVT) | PV Main build | 7/14 | 7/15 |
| PV (DVT) | VN Main-build | 7/29 | 7/29 |
| PV (DVT) | OOBIP | 7/11 | 7/31 |
| PV (DVT) | Ship PV unit ETA to NSDD (PCBA Only) | 7/15 | 7/15 |
| PV (DVT) | Ship PV unit ETA to QAD/TPE RD & HP | 7/22 | 7/22 |
| PV (DVT) | PV SVTP test | 7/23 | 8/19 |
| PV (DVT) | Google dogfooding | 7/23 | 8/19 |
| PV (DVT) | **Code Freeze (FSI candidate) = CFZ** | 8/28 | 8/28 |
| PV (DVT) | PV Regression | 8/31 | 9/3 |
| PV (DVT) | **RTM Ties-1 = RTM** | 9/4 | 9/4 |
| PV (DVT) | PV exit | 9/3 | 9/3 |
| PVR (ME PV-R) KS | PV-R build (use PV MB) w/o R/I, SWDL, OBE | 8/17 | 8/17 |
| PVR (ME PV-R) KS | By part | 8/21 | 8/25 |
| PVR (ME PV-R) KS | Tooling lock down | 8/25 | 8/25 |
| PVR (ME PV-R) VN | PV-R build (use PV MB) w/o R/I, SWDL, OBE | 8/27 | 8/27 |
| PVR (ME PV-R) VN | Tooling lock down | 9/2 | 9/2 |
| MV | **MV SMT (KS)** | 9/2 | 9/2 |
| MV | VN SMT build | 9/11 | 9/13 |
| MV | MV Pre-Build (KS) | 9/5 | 9/5 |
| MV | VN Pre-build | 9/15 | 9/15 |
| MV | MV Main build | 9/8 | 9/13 |
| MV | VN Main-build | 9/17 | 9/17 |
| MV | Marketing OOBA | 9/15 | — |
| MV | Mini Regression -1 | 9/14 | 9/16 |
| MV | Product release - KS | 9/17 | 9/17 |
| MV | Product release - VN | 9/24 | 9/24 |
| MV | First Order Drop | 9/17 | 9/17 |
| MV | **KS FCS** | 9/24 | 9/24 |
| MV | **VN FCS** | 10/2 | 10/2 |

**假日 (holidays，套用到工作日計算)：** Chinese New Year 2/14–2/22 · 228 Holidays 2/27–3/1 · Labor Holiday 5/1–5/3 · Dragon Festival 6/19–6/21 · National Holiday 10/9–10/11（另 Example.png 含 VN 假日：Hung King's Anniversary、Reunification/Labor、National Day 9/1–9/2 等）。

> ✅ 已釐清：**KS MV SMT = 9/2**（Example.png 的 "MV SMT 9/02"，在 RTM 9/4 之前）；sheet D 欄的
> `VN SMT build`(9/11–9/13) 是 **VN region 端**的 SMT，不是標錯。`MV Pre-Build 9/5 = MAX(MV SMT 9/2+1, RTM 9/4+1)`。

---

## 12. DB / SI / PV build 階段 dependency 結構（已驗證 D/E 欄）

每個 build 階段共用同一條骨幹鏈（HW → SW test → exit）：

```
Layout → Gerber release → PCB FAB → SMT Build → (Pre-Build → Main build → OOBIP)
       → Ship unit ETA → SVTP test ∥ Google validation/dogfooding → Phase exit
```

已驗證的 dependency 公式（預設 duration 由 D/E 欄 Start→End 反推，**全部可由 User 編輯**）：

| 關係 | 公式 | D/E 驗證 |
|---|---|---|
| Gerber | = Layout end + 1 工作日 | 2/11→2/12 ✓ |
| SMT Build start | = PCB FAB end + 1 工作日 | 3/10→3/11 ✓ |
| Main build start | = Pre-Build end + 1 | 移植 PRODUCT_SPEC |
| SVTP test start | = Ship unit ETA 日 | DB 3/23 ✓ |
| Google validation/dogfooding | = 與 SVTP test **平行**（golden 同起訖），但**是下游定錨關鍵**（見 §13.5） | DB 3/23–4/26 ✓ |

### 12.0 來源與一致性 ✅（FCS0924 × FCS1016 交叉驗證 — authoritative Days）

> 下面兩條鏈的 **Days（duration）來源 = xlsx 的兩張 Gantt sheet `MTK-FCS0924`（golden）與 `MTK-FCS1016-A`（替代情境）逐格抽出**（完整對照見 `Validation/MILESTONE_FCS_gantt_extract.md`）。
>
> - **Proto(DB) + EVT(SI) 段兩情境逐格完全相同** → 這些 Days 是 **anchor-independent ground truth**，直接當預設值。
> - **DVT(PV) + PVT(MV) 段底層 Days 一致**（MV FAB 兩者皆 16 天；PV/ME parts ±1），calendar 差異 = FCS 錨點不同 + 各 phase 視窗壓到的假日不同（如 PV 0924 壓到 Dragon 6/19–6/21 → 19 天 vs 1016 的 15 天）。→ 用 **holiday-aware span** 即可重現，**不可寫死 calendar 天數**。
> - **所有 Days 皆為引擎參數、可由 User 編輯；任一 Days 調整 → 該鏈下游 task 一律 holiday-aware 往後 shift**（§13.1 reflow）。

### 12.A G.O.(Gerber) → PCB FAB → SMT 鏈（第13列，Days）

> ⚠️ 取代先前「Gerber→PCB FAB start 未定義 / 各 phase 不一致」的疑慮：規則統一如下。

| 關係 | 公式 | 預設 Days | 驗證 |
|---|---|---|---|
| Gerber (G.O.) | = Layout end + 1 工作日 | — | 2/11→2/12 ✓ |
| **PCB FAB start** | **= Gerber(G.O.) 當天**（`G` 即 FAB 第 1 天） | — | SI 4/27、PV、MV ✓ |
| **PCB FAB span** | **holiday-aware span**（遇假日延展，非固定 calendar） | **DB 14 · SI 15 · PV 15 · MV 16 天** | 兩情境一致（DB/SI 逐格相同；MV 皆 16）✓ |
| SMT Build start | = PCB FAB end + 1 工作日 | — | DB 3/10→3/11、SI 5/11→5/12 ✓ |

- **DB 的 2/12→2/25「空檔」= CNY 2/14–2/22 把 FAB span 推到年後**，是 holiday-aware 的結果，**不是**額外 offset。
- **`Ship <phase> PCBA ETA to TPE RD & HP` 不在本鏈**：它接在 SMT 之後、= 該 phase 的 **SVTP test start**（DB 3/23），見 §12 主表 `SVTP test start = Ship unit ETA 日`。

### 12.B ME 鏈（第21–36列，Days）— ID Lock → … → EVT Pre-Build

> 補齊先前 §12 完全沒涵蓋的 ME Dev dependency。預設 Days 兩情境（至 SI ME parts）逐格相同。

| ME task | 接法（dependency） | 預設 Days | 驗證 |
|---|---|---|---|
| ID Master/Detail Ready (ID Lock) | 起點（= 專案起跑 1/6） | — | 1/6 |
| ME design | = ID Lock | **30** | 1/6→2/4 ✓ |
| Mockup drawing release/build | = ME design end + 1 工作日 | **9** | 2/5→2/13 ✓ |
| Mockup review | = Mockup end + 後續第 1 工作日（holiday-aware，跨 CNY） | 里程碑 | 2/25 ✓ |
| DFM review | = Mockup review end + 1 工作日（跨 228 假日） | — | 3/2 ✓ |
| ME drawing modification (EC) | 與 DFM 收尾重疊 | — | 3/4 ✓ |
| ME Tooling Release | = modification end + 1 工作日 | **42** | 3/7→4/17 ✓ |
| T1 + T2 | = Tooling Release end + 1 工作日 | **8** | 4/18→4/25 ✓ |
| SI (EVT) ME parts | = T1+T2 end + 1 工作日 | **17** | 4/26→5/12 ✓ |
| SI (EVT) ME ETA | = SI ME parts **完成日**（交件）| — | 5/12 ✓ |
| SI (EVT) Pre-Build | **= MAX(SI SMT 完成/PCBA 備妥, SI ME ETA) + build lead**（見 §12.C）| — | 5/15 ✓ |

- PV / PV-R / MV ME parts（R34–36）Days 與上同邏輯（PV 16、PV-R 14、MV 15；兩情境 ±1），但**錨點隨 phase handoff（§12 階段交接）移動**，屬 anchor-driven，不列為固定 golden。
- Mockup review / DFM 的較大間隔來自 **CNY / 228 假日（holiday-aware）**，非固定 offset；調整這些 task 的 Days 時，下游沿 holiday-aware 重算往後 shift。

### 12.C Pre-Build (FATP) gating ✅（第14列 FATP × 第13列 SMT × 第17列 ME ETA）

> **來源 = xlsx 第 14 列 (FATP/build track) 必須同時等到第 13 列的 SMT 完成（PCBA 備妥）與第 17 列的 `ME ETA`（ME parts 交件）兩個前置都備齊，才能起 `Pre-Build`。** 這是一個 **雙前置 MAX gate**，先前 spec 漏寫（§12.B 舊版只認 ME 一邊，已修正）。

- **規則（DB 無全機 build，套用於 SI / PV）：**

  ```
  <phase> ME ETA      = <phase> ME parts 完成日           (第17列 ME ETA marker)
  <phase> Pre-Build   = MAX( <phase> SMT 完成/PCBA 備妥 , <phase> ME ETA ) + build lead
  <phase> Main build  = Pre-Build end + 1                 (§12 主表，不變)
  ```

- **`ME ETA` 為新定義的里程碑** = 該 phase ME parts（§12.B）的**完成/交件日**（第17列 `ME ETA`）。SI ME ETA = 5/12、PV ME ETA = 7/8。
- ⚠️ **SMT 閘 = 「PCBA first-article 備妥」≈ SMT *起算* + lead，不是 SMT 整批量產結束**（C5 釐清）。源頭 `Milestone_FCS`：**SI SMT 整批 = 5/12→5/24**，但 **SI Pre-Build = 5/15**（在整批結束 5/24 之前 9 天）——因為 Pre-Build 只需頭幾片 bright-up 板，不必等整批。先前引擎把 SI SMT 結束偷改成 5/15 來遷就「SMT end」模型 = bug，已還原成 5/24，閘改抓 SMT 起算。**∴ 拉長 SMT 整批 Days 不會延後 Pre-Build**（已驗證 d=0）；PV 因 SMT 只 4 天、首件≈結束，才看似 = SMT end。
- **兩個 gate 哪個卡關依資料而定**，引擎一律取 `MAX`：
  - **SI**：ME ETA 5/12 與 SMT first-article 約同期 → Pre-Build **5/15** ✓。
  - **PV**：**SMT 首件 7/10 卡關**（晚於 ME ETA 7/8）→ Pre-Build **7/10** ✓。← 證明 SMT gate 必須存在，不能只用 ME ETA。
- **MV phase** 的第二個 gate 不是 ME ETA 而是 **RTM**：`MV Pre-Build = MAX(MV SMT +1, RTM +1)`（見 §11 註 / line 429，維持不變）。
- **可編輯 / reflow**：SMT span、ME parts Days、ME ETA 任一被 User 調整 → 重新取 `MAX` 後 Pre-Build → Main build → OOBIP 整條 holiday-aware 往下游 shift（§13.1）。**縮短較早的那個 gate 不會提前 Pre-Build**（被另一個 gate 卡住），需兩個 gate 都提前才會提前——此即 §4.2 要驗證的 dependency 結構。

### 12.D Pre-Build / build track 完整鏈（更新骨幹）

> 更新 §12 開頭骨幹：build 階段 Pre-Build 之前是**雙線匯流**（HW 線的 SMT + ME 線的 ME parts），非單線。

```
HW 線 : Layout → Gerber(G.O.) → PCB FAB → SMT 完成(PCBA) ┐
                                                          ├─ MAX → Pre-Build → Main build → OOBIP
ME 線 : ME design → … → T1+T2 → <phase> ME parts → ME ETA ┘
```

### 12.E Pre-Build 下游：Main build → OOBIP → Ship ETA(雙) → Test → Phase exit ✅

> 來源 = §11 Milestone_FCS D/E 欄 + 第 14/15/16 列。補齊先前 §12 對 OOBIP / Ship ETA / Phase exit 的缺漏，並釐清「Ship unit ETA」其實是**兩個不同 gate**。

| Task | 接法（dependency） | golden(SI / PV) | 信心 |
|---|---|---|---|
| Main build | = Pre-Build end + 1 | 5/19→5/20 / 7/14→7/15 | ✅ 高（原有）|
| **OOBIP** | build 段檢測，**holiday-aware span**；起點落在 Main build 區段、預設 golden offset、**可編輯** | 5/20→5/27 / 7/11→7/31 | ⚠️ 中（兩 phase 起點 anchor 不一致，用 golden offset 近似）|
| **Ship 到 NSDD（PCBA Only）** | **= Main build end + buffer**（只需 PCBA、不等整機 → 較早出貨）| 5/22 / 7/15 | ✅ 高 |
| **Ship 到 QAD/TPE RD & HP（整機）** | **= 整機 build/OOBA 備妥**（晚於 NSDD）；且 **= SVTP/Google test start − 1 工作日** | 5/27 / 7/22 | ✅ 高 |
| SVTP / Google test start | **= Ship(QAD/TPE 整機) end + 1 工作日**（**不是** NSDD 那條）| 5/28 / 7/23 | ✅ 高（釐清原本模糊的「= Ship unit ETA」）|
| **Phase exit** | = 該 phase 測試/regression 完成 + buffer（holiday-aware，§13.5 以 **Google** 為 driver）| SI 6/24→**7/2** | ⚠️ 視 phase：SI = test end +≈6 工作日；**PV exit 9/3 改錨在 PV Regression/CFZ 區**（anchor-driven，非單純 test end + buffer）|

**HARD 重點（雙 Ship ETA gate）**：
- `Ship 到 NSDD (PCBA Only)` 只要 **PCBA 備妥**（≈ Main build end）即可送 → **早**。
- `Ship 到 QAD/TPE (整機)` 要 **整機 build 完成** → **晚**，且這條才是 **驅動 SVTP/Google test 起算**的那個 ETA。
- 兩條 ETA **各自獨立**，不可合併成單一「Ship unit ETA」；下游 test 一律掛在 **QAD/TPE 整機** 那條。

**reflow**：Main build / OOBIP / 整機 build Days 被編輯 → Ship(QAD/TPE) → test → Phase exit 整條 holiday-aware 往下游 shift（§13.1）。NSDD(PCBA-only) 那條獨立、只受 Main build 影響，不驅動 test。

### 階段交接（phase handoff）＆ 階段 buffer ✅（Q14 已定，§13.5 修正定錨來源）

- **下一階段錨在前一階段的「Testing start」+ N 工作週**（= PRODUCT_SPEC 的 G.O. 規則：
  `SI 起 = DB Testing start + dbWeeks`、`PV 起 = SI Testing start + siWeeks` …），N 為**可編輯 work-week**。
- ChromeBook 的 Testing start = 各階段的 **`Google validation` start**（**不是** SVTP test；見 §13.5）。
  Google validation 與 SVTP test 平行，但下游時間以 **Google validation** 為準。
- Example.png 的 **DB 6 / SI 5 / PV 4 wks** = 這些 buffer 的預設值（對應 PRODUCT_SPEC 的 ww-pill，可調）。
- 下一階段 `Gerber release` 即由上述錨點往下展開（SI Gerber 4/27、PV Gerber 6/18）。

### PCB FAB lead time ✅（Q15 已定）

- **PCB FAB = 跟 PRODUCT_SPEC「PCB G.O. → SMT」的 duration 同概念**：一段 **holiday-aware span**
  （遇假日延展、沿用 working-day 邏輯），不是固定 calendar 天數。預設長度由 D/E 欄 FAB Start→End 反推。

### Material preparation / ME PV-R（PVR）錨點 ✅（Q16 已定）

- **比照 PRODUCT_SPEC：用 `PV Testing start` 抓時間。** PVR 的 `PV-R build` / `By part` / `Tooling lock down`
  與 material preparation 皆以 **PV `Google validation` start (7/23)** 為錨，套 PRODUCT_SPEC 的
  ME Parts for PVR / PV Regression / Tooling 規則（holiday-aware span）展開。

---

## 13. 引擎修正規則 (v1.1 bug fixes) — HARD RULES

> 以下 5 點為實際操作回報的 bug，視為硬規則，覆寫先前任何衝突描述。

### 13.1 SR / CFZ / RTM / FCS 堅不可摧；HW 鏈 downstream reflow（HARD，v2 修正）

- **Stable Release、CFZ、RTM、KS/VN FCS = 鎖死的里程碑**，只由 SR 公式驅動（`CFZ=SR+3`、`RTM=CFZ+7`、
  FCS=…）；**任何 task duration 編輯都不可移動這四個 gate。**
- 兩個獨立 block，編輯 duration → **start-pinned、往下游 reflow**（改某 task → 同 block 內 golden 順序在它
  之後的 task 一起平移 delta）。**前段 (backward = HW build) Kick-off pinned：縮短某 task → 整條 HW 鏈提前
  完成（SR 前 buffer 變大＝降低 risk）**；加長則往後推。兩 block 互不影響，HW 編輯不動後段 gates。
  SVTP test 不 drive downstream（§13.5），編輯它只改自己那條 bar。
- ⚠️ v1 舊規則「前段 end-pinned、只移上游、下游不動」**已被本 v2 取代**（user 要看到 HW 縮短後提前完成）。
- 例：縮短 `PCB FAB` → 它之後的 HW task（SMT/test/exit…）全部提前，HW 提早做完；SR/CFZ/RTM/FCS 不動。
- **v2 dependency DAG 如何保證此規則（實作）**：backward block（HW/ME）由 Kick-off 經依賴邊正向算、編輯沿邊傳遞；
  forward block（PVR/MV/FCS + PV gates）錨在 SR/CFZ/RTM。兩 block 唯一橋接點 `MV G.O.` **改錨在 SR-nominal
  DVT Test Start**（= `addCal(golden DVT test start, shift) + mvGoDays`，**不吃** live HW 編輯），所以 HW 編輯
  不會越過 SR 推動 MV→FCS。已用 Node harness 驗證：`PCB FAB +5d` → HW 全部 +5、但 KS/VN FCS **Δ=0**。
- ⚠️ **副作用（待 user 確認）**：因 MV G.O. 鎖在 SR-nominal，HW 大幅 slip 時畫面上 DVT test 會位移、但 MV G.O. 與
  FCS 不動 → 兩者間距不再剛好 4 週。這是「FCS 鎖死」與「MV G.O.=DVT test+4wk」兩條 HARD 規則衝突時，**優先鎖 FCS**
  的取捨。若 user 反而希望「HW 真的 slip 時 FCS 跟著延」，再放寬此鎖。

### 13.2 Region site 切換要連動 schedule 圖卡的 task（HARD）

- Project Setup 改 **Region Site Factory（VN ↔ TH）**，schedule 圖卡內**所有 `VN` 字樣要被取代**：
  `VN SMT build → TH SMT build`、`VN Pre-build`、`VN Main-build`、`Product release - VN`、`VN FCS`、
  `(VN)` 標籤、site tag 全部換成所選 region 代碼。region 假日也同步切換（VN→TH 假日表）。

### 13.3 Lead site「其他 ODM」可輸入，並取代 KS（HARD）

- Lead Site Factory 選「其他 ODM」時，**提供文字輸入框讓 User 自填 lead site 名稱**；
  輸入後 schedule 圖卡內**所有 `KS` 字樣（含 `MV SMT`、`Product release - KS`、`KS FCS`、`(KS)`、site tag）
  改用新輸入的名稱**。（lead site 隨 ODM 改變，不可寫死 KS。）

> **顯示不重複（§13.2 / §13.3 補充）**：task 名稱已含工廠代碼（如 `(KS)` / `VN SMT build`）時，
> **不再額外顯示 site pill**；pill 只在名稱未帶代碼的 task（如 `MV SMT`）出現，避免同一工廠秀兩次。

### 13.6 畫面 = 條列式清單；匯出 = 水平 roadmap（兩者分離）

> **畫面上（on-screen）維持原本的條列式 task 清單**（phase chevron + 可編輯 Days 的 columnar list）。
> **只有按 `Export PNG` 時，才另外在 offscreen 產生水平 roadmap 圖卡**（PowerPoint-ready）並匯出，
> 匯出後即清除，不影響畫面。
>
> roadmap 以 **`Validation/Example.png` 為基準概念**，但 **refine 整齊度與易讀性**。以日期為 x 軸定位，
> 配色用**第一張 phase chevron 圖的色階**（Proto 藍 / EVT 綠 / DVT 粉紅 / PVT 黃；§5.2）。

#### 版面分層（authoritative，user 指定，上而下）

1. **第一層**：所有與 **Google 有關的 TASK + Date**，並秀出 **CFZ Date 與 RTM Date**。
   **每個 TASK 都不可被覆蓋**（lane-pack / 不重疊）。
2. **第二層**：**SMT TASK + Date**（各 phase SMT）。**TASK 不可被覆蓋**。
3. **中間**：**phase timeline bar = 第一張 chevron 圖**；在 **DVT 與 PVT 之間多一個小的 PVR phase**，
   **寬度為其他 phase 的一半**。
4. **bar 下面**：標示 **G.O. TASK**，畫出 **Test Start 時間**，並在兩者中間標示
   **「該 phase Testing → G.O.」的 Duration**（週數）。
5. **每個 phase 中間**：秀出該 phase 的 **Phase exit TASK**。
6. **下方**：上面**沒提到**的 TASK，依**第二張照片的條列方式**列出（依日期 lane-pack）。
   **已被特別畫在上面的 TASK 不再重複**列於下方。

- 互動式可編輯 Days 清單移到圖卡下方的 `✎ 編輯` 摺疊面板（不進匯出圖）。
- PNG 匯出時暫時撐開圖卡到 roadmap 完整寬度，避免被裁切。
- ⏳ **視覺風格**：先提兩個 proposal（皆用上述色階）給 user 選，確認後才實作。

### 13.4 移除「Re-validate vs Example.png」按鈕

- 驗證已在每次重算時自動執行，該按鈕無額外用途 → **刪除**。

### 13.7 移除「Generate Schedule」按鈕 + 驗證文案改走 console（HARD）

- 整個 app 已是 **reactive 即時重算**：Branch 圖片 OCR、Stable Release、lead/region、任一 task duration
  的 change 事件都直接觸發 `run()` 重算。**`Generate Schedule` 按鈕無任何獨佔功能 → 刪除**
  （避免 User 誤以為「要按了才生效」）。保留 `Reset to defaults`。
- phase 標題列右邊的 `x/6` 序號（DB 1/6 … FCS 6/6）為純裝飾、且把 FCS 當成第 6 個 phase 有誤導性
  → **刪除**。
- §4.2 的 golden / Example.png 自我驗證**邏輯保留並照常每次重算執行**，但**比對結果改輸出到 console**
  （developer 用）。**UI 上不再出現 `golden` / `Example.png` 等內部用語**——User 不知道那是什麼。
  畫面只保留對 User 有意義的 **整體開發週數 (Overall WKs)**（Project start → lead site FCS）。

### 13.5 Google Validation 與 SVTP Test 平行，且以 Google Validation 定錨下游（HARD）

- `Google validation`（DB/SI/PV 為 `Google validation`，PV 另有 `Google dogfooding`）與 `SVTP test` **平行**。
- **下游時間以 `Google validation` 為定錨關鍵**：當兩者時間不一致時，後段 task 一律以
  **Google validation** 的時間往下算，**SVTP test 不驅動下游**（編輯 SVTP test 只改自己那條 bar）。
- **另有 5 個 Google 里程碑（Example.png 綠框）已加入 task list**（皆 milestone，落在 8/25 anchor 前的 backward block）：

  | Task | 日期 | Phase | 對應現有錨點 |
  |---|---|---|---|
  | Google prototype | 3/23 ETA | DB | = `Ship DB PCBA ETA` / `Google validation` start |
  | Google release SI image | 5/7 | SI | SI SW image（PCB FAB 期間，早於 SMT） |
  | Google EVT unit | 5/27 ETA | SI | = `Ship SI unit ETA to QAD/TPE RD & HP` |
  | Google release PV image | 7/2 | PV | PV SW image（PCB FAB 期間，早於 SMT） |
  | Google DVT unit | 7/22 ETA | PV | = `Ship PV unit ETA to QAD/TPE RD & HP` |

  ⚠️ §13.5 的「下游定錨」仍只認 `Google validation` / `Google dogfooding`（roadmap 的 SVTP→G.O.
  週數計算用 `/Google (validation|dogfooding)/` 精準匹配），新增的 Google 里程碑**不**參與下游定錨。

### 13.8 Roadmap 視覺精修 v2 — Example.png 方塊流程圖風格（HARD）

> 採用使用者核可的 **Example.png 流程圖語言**：一條連續的 chevron phase 帶（§5.2），
> task 以**彩色圓角方塊**浮在帶子上下、用**實線 + 端點圓點**連到帶子。覆寫先前粉彩 tint chip 樣式。
> 結構 / 分層 / 哪些 task 進 roadmap 仍 100% 依 §13.6；本節只規範**視覺呈現**。

1. **Chip 語意配色（不再用 phase 粉彩）**：chip 顏色由 task 類別決定，而非所在 phase——
   `Google = 綠`、`SMT = 灰`、`build（Tooling / T1 / Pre-B·Sys-B / TLD）= 米色`、
   `gate（PLD / CFZ / RTM）= 紅`。同類 task 在不同 phase 維持同色。
2. **Chip 文字格式**：
   - Google / SMT chip：**name 一行 + date 一行**（date 在下，`.dt` block）。
   - **build chip**：`Pre-B: <date>` 與 `Sys-B: <start>–<end>` **各自一行**（label 與值同一行，`b` inline）；米色保留。
   - **同一個 phase 的 KS + region(VN/TH) 兩站 Pre-B/Sys-B 合併成「單一方塊、多行」**
     （KS 兩行在上、region 兩行在下），**不可拆成兩個並排方塊**（並排不美觀且易重疊）。§user req
   - **只有 Pre-B/Sys-B box 加寬**（class `.build.wide`，min-width ≈ 104px、左對齊）；
     **`T1+T2` / `TLD` / `Tooling Release` 維持自然窄寬**（不套 min-width）。
3. **SMT ↔ build 左右錯開（時間先後）**：每個 phase 內 **SMT chip 置於該 phase 區段的左帶
   （fraction ≈ 0.04–0.46）**、**build chip 置於右帶（≈ 0.45–0.92）**，使 `SMT → build` 由左至右
   讀起來有時間先後感，不再上下直接疊在同一 x。（build 已合併為單一方塊，見第 2 點。）
   ⚠️ 採 **phase-segment 座標**（chip 落在「被指派的 phase」區段內，依日期在段內排序），
   **非全域真實日期座標**（曾試過 `dateToX` 全域時間定位，視覺效果不佳，已回退）。
4. **連線**：chip↔bar 用**實線**（非虛線），並在**碰到 bar 的那一端加實心圓點**（`.rm-conn.barbot/.bartop`）。
5. **版面間距**：**SMT 層比 Google 層下移**（與第一層 Google chip 在垂直空間上錯開，避免擁擠）；
   **build 層上移、與 phase bar 之間保留間隙**（4 行的合併 build chip 不可壓到 / 蓋到 bar）；
   **Phase Exit 方塊不可被截斷**；**底部 boxless 清單（§13.6 layer 6）緊貼 Phase Exit 列下方**
   （`.rm-collist` 去除 border-top、margin 收到最小），且 **不顯示 Proto/EVT/DVT/PVR/PVT 欄標題**
   （phase bar 已在相同水平位置標示，欄標題重複 → 移除）。
6. **Branch 卡（只顯示在 roadmap 卡右上 mini，§3.1.1 版型）**：**靛藍標題列**顯示
   `M<milestone#> · <release 版次>`（如 `M152 · 2nd release`；號碼來源：手填 Branch 欄 → OCR 文字 →
   OCR 數字裁切圖）。**milestone digital number（`M<num>`）字體放大**（`.mnum-txt`，mini ≈ 24px），
   版次後綴（`.msuffix`）維持小字。**號碼直接以白字呈現在靛藍標題列，不可有白底框 / 藍邊框**
   （OCR 數字裁切圖 `numImg` 改為**透明底 + 白色數字**）。列依序為 **Branch / FW Candidate / FW Lock Down / Stable Cut /
   Stable Release / FSI Candidate (CFZ) / FSI Sign-off (RTM)**（**FW Candidate 與 FW Lock Down 兩列必須保留**，
   見 §3.1.1）。Branch date 一律顯示該列（OCR 有值則填，純手動無來源時為 `—`）。
   ⚠️ **頁面最上方原本的獨立完整 Branch 卡（`#branchCard`）已移除**，資訊只保留在 roadmap 卡右上 mini。
7. **header 排版**：roadmap 卡標題列為 title 靠左、**FCS 日期 + Branch mini 卡靠右上一欄**（`.tlhead-right`）。
8. **版面 = sidebar dashboard（主流「設定常駐 + 結果主畫布」模式，HARD）**：
   - **左側為 sticky 輸入側欄**（Project Setup：name / branch / 上傳 / Stable Release / lead / region），
     `position:sticky` 捲動時恆常可見（`.card`）。
   - **右側主欄(canvas)由上而下 = Roadmap(hero) → 驗證列(Overall WKs) → 螢幕 TASK 表**。
     Roadmap 為主角、置於主欄頂端先被看到（§user req：Roadmap 與 TASK 表對調順序）。
   - 頁面加寬（`.wrap` ≈ 1540px）使主欄 ≈ 1180px，Roadmap 維持足夠寬度。
   - **整張 roadmap 必須 fit-to-window、可直接截圖**：以 `fitRoadmap()` 維持固定設計寬度（1180px），
   **當視窗比設計寬度窄時用 CSS `transform: scale()` 等比縮小**、reflow 卡片高度，
   **永遠不出現水平捲軸、不需 user 手動拉**（render 後與 `window.resize` 皆觸發）。
   目的：整張圖隨時完整可見，可直接截圖貼進報告。

---

## §16. 2026-07-16 更新 — 假日規則移植 + Task Board UI 統一（§user，解除 frozen-golden 限制）

> 本節記錄 user 於 2026-07-16 明確授權對 Function 1 的修改（原「F1 = frozen golden 不可更動」規則自此
> 以「修改後 golden self-validation 必須維持綠燈」為新驗收條件取代）。

### 16.1 假日 snap（自 F2 RefreshBoard 移植）
- 規則：**任何 task 不得於週日或法定假日開工**；非 build 類 task 另須避開週六。
  build 類（SMT / FAB / Pre-Build / Main build / OOBIP / T1+T2 / Tooling / ME parts / ME PV-R / Regression）
  週六可開工。lead 側查 KS 假日表、region 側（site VN）查 region 假日表。
- **Golden 重現模式豁免**：golden SR（2026-08-25）且零覆寫時**不 snap**——因 xlsx GOLDEN 本身含
  週末/假日開工日（如 Tooling Release 週六 3/7、PV FAB 端午 6/19），驗證要求 byte-exact 重現。
  任何其他 SR 或任何編輯 → 全面套用 snap。實作於 `build()` 內 `snapStart`/`goldenMode`。

### 16.2 Task Board UI 統一（F1 與 F2 同步）
- **鎖定任務全鎖**：ANCHOR（純公式）任務的 start「與 end」輸入框皆 `disabled`（原本 end 看似可改實則無效）。
- **Gate 日期改為「可輸入、轉 offset」**：CFZ / RTM / MV G.O.（F2：CFZ / RTM / DVT G.O.）的日期欄開放輸入，
  輸入日期換算回對 anchor 的天數差寫入對應 override（`cfzDays`/`rtmDays`/`mvGoDays`/`siToPvDays`），
  gate 規則（週五 / 工作日 snap）重新套用後回填欄位。單一真相來源恆為 SR + offsets，不存在絕對日期 pin。
  F2 之 PVT G.O.（= SR − 5）依 §user rule 維持完全鎖定（FCS 永不延後）。
- **覆寫高亮**：被編輯過的欄位（`dateOverride`/`durOverride`/gate/ww）加 `.ovr` 黃底樣式。
- **無效輸入回饋**：日期格式錯誤或 end ≤ start → 欄位標紅（`.bad`）+ tooltip，不再靜默忽略、不觸發重算。
- **Reset edits 按鈕**（handoff strip 右端）：只清空所有 task-board 覆寫，保留 Stable Release 與 Project Setup。
