# Chromebook_Product_Spec.md


---

## APPENDIX A — Progress Log

### v0.2 — Excel Normalizer Complete (2026-06-16)

**What was done:**

1. Parsed `Education MTK8189 schedule_-06122026_M151.xlsx` sheet `Milestone_FCS`.
2. Detected 6 section blocks: ME Development, DB Build, SI Phase, PV Phase, ME PV-R- KS, ME PV-R- VN.
3. Extracted **65 canonical task rows** using scenario_2 (M151 / 38WKs) as default.
4. Applied phase mapping, site inference, mode inference, holiday row exclusion.
5. Generated output files.

**Extraction Statistics:**

| Metric | Value |
|---|---|
| Total canonical rows | 65 |
| Phases | {"ME": 11, "DB": 8, "SI": 11, "PV": 17, "PV-R/MV": 18} |
| Sites | {"common": 44, "VN": 18, "KS": 3} |
| Modes | {"normal": 38, "build": 27} |
| Milestones | 32 |
| Ranges | 33 |
| Scenarios available | scenario_1 (M152/41WKs), scenario_2 (M151/38WKs) |
| Default scenario | scenario_2 |

**Generated Files:**

| File | Purpose | Location |
|---|---|---|
| `chromebook_excel_normalizer.js` | JS module for SheetJS-based Excel parsing | `C:\CODE\Chrome_Schedule\` |
| `chromebook_canonical_rows.json` | Full canonical rows with scenarios | `C:\CODE\Chrome_Schedule\` |
| `chromebook_canonical_rows.csv` | Flat CSV for quick review | `C:\CODE\Chrome_Schedule\` |
| `Chromebook_Product_Spec.md` | This spec (updated to v0.2) | `C:\CODE\Chrome_Schedule\` |

**Full Extracted Task Table (scenario_2 / M151):**

| # | ID | Phase | Section | Task | Start | End | Mode | Site | Type |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `ME_common_kick_off` | ME | ME Development | Kick off | 2026-02-04 | 2026-02-04 | normal | common | milestone |
| 2 | `ME_common_id_master_detail_ready` | ME | ME Development | ID Master/Detail Ready | 2026-01-06 | 2026-01-06 | normal | common | milestone |
| 3 | `ME_common_me_design` | ME | ME Development | ME design | 2026-01-06 | 2026-02-04 | normal | common | range |
| 4 | `ME_common_mockup_drawing_release` | ME | ME Development | Mockup drawing release | 2026-02-05 | 2026-02-13 | normal | common | range |
| 5 | `ME_common_mockup_ready` | ME | ME Development | Mockup ready | 2026-02-13 | 2026-02-13 | build | common | milestone |
| 6 | `ME_common_mockup_review` | ME | ME Development | Mockup review | 2026-02-25 | 2026-02-26 | normal | common | range |
| 7 | `ME_common_dfm_review` | ME | ME Development | DFM review | 2026-03-02 | 2026-03-04 | normal | common | range |
| 8 | `ME_common_me_drawing_modification_for_tooling` | ME | ME Development | ME drawing modification for tooling | 2026-03-04 | 2026-03-06 | normal | common | range |
| 9 | `ME_common_me_tooling_create` | ME | ME Development | ME tooling create | 2026-03-07 | 2026-04-17 | build | common | range |
| 10 | `ME_common_t1_t2` | ME | ME Development | T1+T2 | 2026-04-18 | 2026-04-25 | build | common | range |
| 11 | `ME_common_si_me_parts` | ME | ME Development | SI ME parts | 2026-04-26 | 2026-05-12 | normal | common | range |
| 12 | `DB_common_layout` | DB | DB Build | Layout | 2026-01-06 | 2026-02-11 | normal | common | range |
| 13 | `DB_common_db_gerber_released` | DB | DB Build | DB Gerber released | 2026-02-12 | 2026-02-12 | normal | common | milestone |
| 14 | `DB_common_pcb_fab` | DB | DB Build | PCB FAB | 2026-02-25 | 2026-03-10 | normal | common | range |
| 15 | `DB_common_db_smt_build` | DB | DB Build | DB SMT Build | 2026-03-11 | 2026-03-15 | build | common | range |
| 16 | `DB_common_ship_db_pcba_eta_to_tpe_rd_hp` | DB | DB Build | Ship DB PCBA ETA to TPE RD & HP | 2026-03-23 | 2026-03-23 | normal | common | milestone |
| 17 | `DB_common_db_svtp_test` | DB | DB Build | DB SVTP test | 2026-03-23 | 2026-04-26 | normal | common | range |
| 18 | `DB_common_google_validation` | DB | DB Build | Google validation | 2026-03-23 | 2026-04-26 | normal | common | range |
| 19 | `DB_common_db_exit` | DB | DB Build | DB exit | 2026-04-23 | 2026-04-23 | normal | common | milestone |
| 20 | `SI_common_si_gerber_release` | SI | SI Phase | SI Gerber release | 2026-04-27 | 2026-04-27 | normal | common | milestone |
| 21 | `SI_common_pcb_fab` | SI | SI Phase | PCB FAB | 2026-04-27 | 2026-05-11 | normal | common | range |
| 22 | `SI_common_si_smt_build` | SI | SI Phase | SI SMT build | 2026-05-12 | 2026-05-24 | build | common | range |
| 23 | `SI_common_si_pre_build` | SI | SI Phase | SI Pre-Build | 2026-05-15 | 2026-05-15 | build | common | milestone |
| 24 | `SI_common_si_main_build` | SI | SI Phase | SI Main build | 2026-05-19 | 2026-05-20 | build | common | range |
| 25 | `SI_common_oobip` | SI | SI Phase | OOBIP | 2026-05-20 | 2026-05-27 | build | common | range |
| 26 | `SI_common_ship_si_unit_eta_to_nsdd_pcba_only` | SI | SI Phase | Ship SI unit ETA to NSDD (PCBA Only) | 2026-05-22 | 2026-05-22 | normal | common | milestone |
| 27 | `SI_common_ship_si_unit_eta_to_qad_tpe_rd_hp` | SI | SI Phase | Ship SI unit ETA to QAD/TPE RD & HP | 2026-05-27 | 2026-05-27 | normal | common | milestone |
| 28 | `SI_common_si_svtp_test` | SI | SI Phase | SI SVTP test | 2026-05-28 | 2026-06-24 | normal | common | range |
| 29 | `SI_common_google_dogfooding` | SI | SI Phase | Google dogfooding | 2026-05-28 | 2026-06-24 | normal | common | range |
| 30 | `SI_common_si_exit` | SI | SI Phase | SI exit | 2026-07-02 | 2026-07-02 | normal | common | milestone |
| 31 | `PV_common_pv_gerber_release` | PV | PV Phase | PV Gerber release | 2026-06-18 | 2026-06-18 | normal | common | milestone |
| 32 | `PV_common_pcb_fab` | PV | PV Phase | PCB FAB | 2026-06-19 | 2026-07-06 | normal | common | range |
| 33 | `PV_common_pv_smt_build` | PV | PV Phase | PV SMT Build | 2026-07-07 | 2026-07-10 | build | common | range |
| 34 | `PV_VN_vn_smt_build` | PV | PV Phase | VN SMT build | 2026-07-21 | 2026-07-22 | build | VN | range |
| 35 | `PV_common_pv_pre_build` | PV | PV Phase | PV Pre-Build | 2026-07-10 | 2026-07-10 | build | common | milestone |
| 36 | `PV_VN_vn_pre_build` | PV | PV Phase | VN Pre-build | 2026-07-27 | 2026-07-27 | build | VN | milestone |
| 37 | `PV_common_pv_main_build` | PV | PV Phase | PV Main build | 2026-07-14 | 2026-07-15 | build | common | range |
| 38 | `PV_VN_vn_main_build` | PV | PV Phase | VN Main-build | 2026-07-29 | 2026-07-29 | build | VN | milestone |
| 39 | `PV_common_oobip` | PV | PV Phase | OOBIP | 2026-07-11 | 2026-07-31 | build | common | range |
| 40 | `PV_common_ship_pv_unit_eta_to_nsdd_pcba_only` | PV | PV Phase | Ship PV unit ETA to NSDD (PCBA Only) | 2026-07-15 | 2026-07-15 | normal | common | milestone |
| 41 | `PV_common_ship_pv_unit_eta_to_qad_tpe_rd_hp` | PV | PV Phase | Ship PV unit ETA to QAD/TPE RD & HP | 2026-07-22 | 2026-07-22 | normal | common | milestone |
| 42 | `PV_common_pv_svtp_test` | PV | PV Phase | PV SVTP test | 2026-07-23 | 2026-08-19 | normal | common | range |
| 43 | `PV_common_google_dogfooding` | PV | PV Phase | Google dogfooding | 2026-07-23 | 2026-08-19 | normal | common | range |
| 44 | `PV_common_code_freeze_fsi_candidate` | PV | PV Phase | Code Freeze(FSI candidate) | 2026-08-28 | 2026-08-28 | normal | common | milestone |
| 45 | `PV_common_pv_regression` | PV | PV Phase | PV Regression | 2026-08-31 | 2026-09-03 | build | common | range |
| 46 | `PV_common_rtm_ties_1` | PV | PV Phase | RTM Ties-1 | 2026-09-04 | 2026-09-04 | normal | common | milestone |
| 47 | `PV_common_pv_exit` | PV | PV Phase | PV exit | 2026-09-03 | 2026-09-03 | normal | common | milestone |
| 48 | `PV-R/MV_KS_pv_r_build_use_pv_mb_w_o_r_i_swdl_obe` | PV-R/MV | ME PV-R- KS | PV-R build (use PV MB) w/o R/I, SWDL, OBE | 2026-08-17 | 2026-08-17 | build | KS | milestone |
| 49 | `PV-R/MV_KS_by_part` | PV-R/MV | ME PV-R- KS | By part | 2026-08-21 | 2026-08-25 | build | KS | range |
| 50 | `PV-R/MV_KS_tooling_lock_down` | PV-R/MV | ME PV-R- KS | Tooling lock down | 2026-08-25 | 2026-08-25 | normal | KS | milestone |
| 51 | `PV-R/MV_VN_pv_r_build_use_pv_mb_w_o_r_i_swdl_obe` | PV-R/MV | ME PV-R- VN | PV-R build (use PV MB) w/o R/I, SWDL, OBE | 2026-08-27 | 2026-08-27 | build | VN | milestone |
| 52 | `PV-R/MV_VN_tooling_lock_down` | PV-R/MV | ME PV-R- VN | Tooling lock down | 2026-09-02 | 2026-09-02 | normal | VN | milestone |
| 53 | `PV-R/MV_VN_vn_smt_build` | PV-R/MV | ME PV-R- VN | VN SMT build | 2026-09-11 | 2026-09-13 | build | VN | range |
| 54 | `PV-R/MV_VN_mv_pre_build` | PV-R/MV | ME PV-R- VN | MV Pre-Build | 2026-09-05 | 2026-09-05 | build | VN | milestone |
| 55 | `PV-R/MV_VN_vn_pre_build` | PV-R/MV | ME PV-R- VN | VN Pre-build | 2026-09-15 | 2026-09-15 | build | VN | milestone |
| 56 | `PV-R/MV_VN_mv_main_build` | PV-R/MV | ME PV-R- VN | MV Main build | 2026-09-08 | 2026-09-13 | build | VN | range |
| 57 | `PV-R/MV_VN_vn_main_build` | PV-R/MV | ME PV-R- VN | VN Main-build | 2026-09-17 | 2026-09-17 | build | VN | milestone |
| 58 | `PV-R/MV_VN_mv_ifooba` | PV-R/MV | ME PV-R- VN | MV iFOOBA | 2026-09-13 | 2026-09-15 | build | VN | range |
| 59 | `PV-R/MV_VN_marketing_ooba` | PV-R/MV | ME PV-R- VN | Marketing OOBA | 2026-09-15 | 2026-09-17 | build | VN | range |
| 60 | `PV-R/MV_VN_mini_regression_1` | PV-R/MV | ME PV-R- VN | Mini Regression -1 | 2026-09-14 | 2026-09-16 | build | VN | range |
| 61 | `PV-R/MV_VN_product_release_ks` | PV-R/MV | ME PV-R- VN | Product release-KS | 2026-09-17 | 2026-09-17 | normal | VN | milestone |
| 62 | `PV-R/MV_VN_product_release_vn` | PV-R/MV | ME PV-R- VN | Product release-VN | 2026-09-24 | 2026-09-24 | normal | VN | milestone |
| 63 | `PV-R/MV_VN_first_order_drop` | PV-R/MV | ME PV-R- VN | First Order Drop | 2026-09-17 | 2026-09-17 | normal | VN | milestone |
| 64 | `PV-R/MV_VN_ks_fcs` | PV-R/MV | ME PV-R- VN | KS FCS | 2026-09-24 | 2026-09-24 | normal | VN | milestone |
| 65 | `PV-R/MV_VN_vn_fcs` | PV-R/MV | ME PV-R- VN | VN FCS | 2026-10-02 | 2026-10-02 | normal | VN | milestone |

**Site Track Summary:**

- **KS tasks (3):** PV-R build, By part, Tooling lock down — all in ME PV-R- KS section.
- **VN tasks (18):** VN SMT build, VN Pre-build, VN Main-build, PV-R build, Tooling lock down, MV Pre-Build, MV Main build, MV iFOOBA, Marketing OOBA, Mini Regression -1, Product release-KS, Product release-VN, First Order Drop, KS FCS, VN FCS — in ME PV-R- VN and PV Phase sections.
- **Common tasks (44):** All ME Development, DB Build, SI Phase tasks + most PV Phase tasks.

**Mode Assignment Summary:**

- **build (27):** SMT builds, Pre-Builds, Main builds, OOBIP, PV-R, By part, T1+T2, ME tooling, Mockup ready, iFOOBA, OOBA, Regression.
- **normal (38):** Layout, Gerber, PCB FAB, SVTP, Google validation/dogfooding, Code Freeze, RTM, releases, FCS, Ship, Kick off, ID Master, ME design, Mockup drawing/review, DFM, exit.

### Next Step — Commit 3: Dependency Engine

Build `inferChromebookDependencies(canonicalRows)` to:
1. Create predecessor rule table for DB / SI / PV / PV-R-MV / FCS chains.
2. Assign each task a predecessor or mark as anchor.
3. Compute forward-calculated dates using shared holiday-aware helpers.
4. Validate no endpoint lands on Sunday or holiday.
