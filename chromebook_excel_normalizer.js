/**
 * chromebook_excel_normalizer.js
 *
 * Converts the Chromebook Milestone_FCS section-block Excel format
 * into canonical rows ready for the dependency engine.
 *
 * Input:  SheetJS workbook object
 * Output: Array of canonical row objects
 *
 * Usage:
 *   const workbook = XLSX.read(buf, { type: 'array', cellDates: true });
 *   const rows = normalizeChromebookTemplateExcel(workbook, { scenario: 'scenario_2' });
 *
 * Each output row:
 * {
 *   id, phase, sourceSection, task,
 *   baselineStart, baselineEnd,   // ISO date strings
 *   mode,    // 'normal' | 'build'
 *   site,    // 'common' | 'KS' | 'VN'
 *   type,    // 'milestone' | 'range'
 *   source,  // { sheet, row, scenario }
 *   scenarios // { scenario_1: {...}, scenario_2: {...} }
 * }
 */

// ---------- constants ----------

const CB_SECTION_PHASE = {
  'ME Development': 'ME',
  'DB Build': 'DB',
  'SI Phase': 'SI',
  'PV Phase': 'PV',
  'ME PV-R- KS': 'PV-R/MV',
  'ME PV-R- VN': 'PV-R/MV',
};

const CB_SECTION_SITE = {
  'ME PV-R- KS': 'KS',
  'ME PV-R- VN': 'VN',
};

const CB_SECTION_HEADERS = Object.keys(CB_SECTION_PHASE);

const CB_HOLIDAY_RE =
  /(holiday|holidays|new year|dragon festival|chinese new year|labor|national)/i;

const CB_DATE_HEADER_RE = /^(start date|end date)$/i;

const CB_BUILD_RE =
  /(SMT|Pre[- ]?Build|Prebuild|Main[- ]?build|Main build|FOOBA|OOBA|OOBIP|PV-R|Regression|By part|T1\+T2|Tooling create|ME tooling|Mockup ready)/i;

const CB_NORMAL_RE =
  /(Layout|Gerber|PCB FAB|SVTP|validation|dogfooding|Product lock|Code Freeze|RTM|release|FCS|FOD|First Order|Ship|Kick off|ID Master|ME design|Mockup drawing|Mockup review|DFM|drawing modification|exit)/i;

// ---------- helpers ----------

function cbClean(v) {
  return v == null ? '' : String(v).replace(/\n/g, ' ').trim();
}

function cbSlug(v) {
  return cbClean(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'task';
}

function cbExcelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000);
}

function cbToDate(v) {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === 'number') return cbExcelSerialToDate(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function cbIso(v) {
  const d = cbToDate(v);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function cbInferSite(section, task) {
  if (CB_SECTION_SITE[section]) return CB_SECTION_SITE[section];
  const t = cbClean(task);
  if (/\bVN\b|VN /i.test(t)) return 'VN';
  if (/\bKS\b|Product release-KS|KS FCS/i.test(t)) return 'KS';
  return 'common';
}

function cbInferMode(task) {
  const t = cbClean(task);
  if (CB_BUILD_RE.test(t)) return 'build';
  if (CB_NORMAL_RE.test(t)) return 'normal';
  return 'normal';
}

function cbCell(rows, r, c) {
  return rows[r] && rows[r][c] != null ? rows[r][c] : null;
}

// ---------- section detection ----------

function detectChromebookSections(rows) {
  const sections = [];
  for (let r = 0; r < rows.length; r++) {
    const label = cbClean(cbCell(rows, r, 0));
    if (CB_SECTION_HEADERS.includes(label)) {
      sections.push({ name: label, startRow: r, endRow: null });
    }
  }
  sections.forEach((s, i) => {
    s.endRow = i + 1 < sections.length
      ? sections[i + 1].startRow - 1
      : rows.length - 1;
  });
  return sections;
}

// ---------- main function ----------

/**
 * @param {object} workbook  SheetJS workbook
 * @param {object} [options]
 * @param {string} [options.sheetName='Milestone_FCS']
 * @param {'scenario_1'|'scenario_2'} [options.scenario='scenario_2']
 * @returns {Array<object>} canonical rows
 */
function normalizeChromebookTemplateExcel(workbook, options = {}) {
  const sheetName = options.sheetName || 'Milestone_FCS';
  const scenarioKey = options.scenario || 'scenario_2';
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet not found: ${sheetName}`);

  /* globals XLSX */
  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
  });

  const sections = detectChromebookSections(rows);

  const scenarios = {
    scenario_1: {
      startCol: 1,
      endCol: 2,
      label: cbClean(cbCell(rows, 1, 1)),
    },
    scenario_2: {
      startCol: 3,
      endCol: 4,
      label: cbClean(cbCell(rows, 1, 3)),
    },
  };

  const selected = scenarios[scenarioKey] || scenarios.scenario_2;
  const canonicalRows = [];
  const seenIds = new Map();

  sections.forEach((section) => {
    const phase = CB_SECTION_PHASE[section.name];

    for (let r = section.startRow + 1; r <= section.endRow; r++) {
      const task = cbClean(cbCell(rows, r, 0));
      if (!task) continue;
      if (CB_SECTION_HEADERS.includes(task)) continue;
      if (CB_DATE_HEADER_RE.test(task)) continue;
      if (CB_HOLIDAY_RE.test(task)) continue;

      let start = cbToDate(cbCell(rows, r, selected.startCol));
      let end = cbToDate(cbCell(rows, r, selected.endCol));
      if (!start && !end) continue;
      if (!start) start = end;
      if (!end) end = start;

      const site = cbInferSite(section.name, task);
      const baseId = `${phase}_${site}_${cbSlug(task)}`;
      const seen = seenIds.get(baseId) || 0;
      seenIds.set(baseId, seen + 1);
      const id = seen === 0 ? baseId : `${baseId}_${seen + 1}`;

      const scenarioPayload = {};
      Object.entries(scenarios).forEach(([key, cfg]) => {
        let s = cbToDate(cbCell(rows, r, cfg.startCol));
        let e = cbToDate(cbCell(rows, r, cfg.endCol));
        if (!s && !e) return;
        if (!s) s = e;
        if (!e) e = s;
        scenarioPayload[key] = {
          baselineStart: cbIso(s),
          baselineEnd: cbIso(e),
          label: cfg.label,
        };
      });

      canonicalRows.push({
        id,
        phase,
        sourceSection: section.name,
        task,
        baselineStart: cbIso(start),
        baselineEnd: cbIso(end),
        mode: cbInferMode(task),
        site,
        type: cbIso(start) === cbIso(end) ? 'milestone' : 'range',
        source: { sheet: sheetName, row: r + 1, scenario: scenarioKey },
        scenarios: scenarioPayload,
      });
    }
  });

  return canonicalRows;
}

// ---------- exports ----------

if (typeof module !== 'undefined') {
  module.exports = {
    normalizeChromebookTemplateExcel,
    detectChromebookSections,
    cbInferMode,
    cbInferSite,
    CB_SECTION_PHASE,
    CB_SECTION_SITE,
  };
}
