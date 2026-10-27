import * as XLSX from 'xlsx';
import { ProductionRow, FilterState, ComputedData, GroupedMetric } from './types';
import { DEFAULT_ROWS } from './sampleData';

export const DEFAULT_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vStOPoBnHm-C_F6quv4JItMXOk6DkeFnWd5anw1dUef76cCQt7fbOl8QjdfQcSukGsU_1auHWTQbaeU/pub?output=csv';

export const REFRESH_SECONDS = 30;
export const DEFAULT_MONTHLY_TARGET = 60000;

export const REJ_GREEN = 3.5;
export const REJ_AMBER = 4.5;

export const SHIFT_INFO: Record<string, { label: string; hours: string }> = {
  A: { label: 'Shift A', hours: '06:00 - 14:00' },
  B: { label: 'Shift B', hours: '14:00 - 22:00' },
  C: { label: 'Shift C', hours: '22:00 - 06:00' },
};

export const DEFECT_COLORS = [
  '#38bdf8', // Sky
  '#f59e0b', // Amber
  '#34d399', // Emerald
  '#a855f7', // Purple
  '#f43f5e', // Rose
  '#e2e8f0', // Slate light
  '#ec4899', // Pink
  '#06b6d4', // Cyan
];

export const shiftOf = (h: number): string => (h >= 6 && h < 14 ? 'A' : h >= 14 && h < 22 ? 'B' : 'C');

let DATE_ORDER: 'DMY' | 'MDY' = 'DMY';

interface ParsedDate {
  y: number;
  mo: number;
  d: number;
  h: number | null;
}

export function parseStr(s: any): ParsedDate | null {
  s = String(s).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ]+(\d{1,2}):(\d{2}))?/);
  if (m) {
    return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] != null ? +m[4] : null };
  }

  m = s.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?)?/
  );
  if (m) {
    const a = +m[1];
    const b = +m[2];
    let d: number;
    let mo: number;
    if (DATE_ORDER === 'MDY') {
      mo = a;
      d = b;
    } else {
      d = a;
      mo = b;
    }
    let h = m[4] != null ? +m[4] : null;
    if (h != null && m[6]) {
      const p = m[6].toLowerCase();
      if (p === 'pm' && h < 12) h += 12;
      if (p === 'am' && h === 12) h = 0;
    }
    let y = +m[3];
    if (y < 100) y += 2000;
    return { y, mo, d, h };
  }

  const dt = new Date(s);
  return isNaN(dt.getTime())
    ? null
    : { y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate(), h: dt.getHours() };
}

export function detectOrder(raw: any[]) {
  const vals: number[][] = [];
  for (const r of raw) {
    for (const k in r) {
      if (!/date|time/i.test(k)) continue;
      const m = String(r[k]).match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
      if (m) vals.push([+m[1], +m[2], +m[3]]);
    }
  }
  for (const [a, b] of vals) {
    if (a > 12) {
      DATE_ORDER = 'DMY';
      return;
    }
    if (b > 12) {
      DATE_ORDER = 'MDY';
      return;
    }
  }

  const now = new Date();
  const fut = (o: 'MDY' | 'DMY') =>
    vals.filter(([a, b, y]) => {
      y = y < 100 ? 2000 + y : y;
      const mo = o === 'MDY' ? a : b;
      const d = o === 'MDY' ? b : a;
      return new Date(y, mo - 1, d) > now;
    }).length;

  DATE_ORDER = fut('MDY') < fut('DMY') ? 'MDY' : 'DMY';
}

export function keyOf(v: any): string | null {
  if (v === '' || v == null) return null;
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim())) {
    v = parseFloat(v);
  }
  if (typeof v === 'number') {
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  const p = parseStr(v);
  if (!p || p.mo < 1 || p.mo > 12) return null;
  return p.y + '-' + String(p.mo).padStart(2, '0') + '-' + String(p.d).padStart(2, '0');
}

export function shiftFrom(v: any): string {
  if (v === '' || v == null) return '—';
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim())) {
    v = parseFloat(v);
  }
  if (typeof v === 'number') {
    return shiftOf(Math.floor((v % 1) * 24));
  }
  const p = parseStr(v);
  return p && p.h != null ? shiftOf(p.h) : '—';
}

export const dn = (k: string): number => {
  const [a, b, c] = k.split('-').map(Number);
  return Date.UTC(a, b - 1, c) / 864e5;
};

export const num = (v: any): number => {
  const s = String(v ?? '')
    .replace(/,/g, '')
    .trim();
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : 0;
};

export const fmt = (n: number): string => Math.round(n || 0).toLocaleString('en-IN');

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dlab = (k: string): string => {
  if (!k || !k.includes('-')) return k || '—';
  const parts = k.split('-');
  if (parts.length < 3) return k;
  const [, b, c] = parts;
  return `${c}-${MON[+b - 1] || b}`;
};

export const pad2 = (n: number) => String(n).padStart(2, '0');
export const localKey = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const fromDn = (d: number) => new Date(d * 864e5).toISOString().slice(0, 10);

export function normalize(raw: any[]): ProductionRow[] {
  detectOrder(raw);
  const N = (s: any) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  return raw
    .map((r, idx) => {
      const keys = Object.keys(r).map((k) => [N(k), k]);
      const g = (...names: string[]) => {
        for (const n of names) {
          const f = keys.find((x) => x[0] === n);
          if (f && String(r[f[1]]).trim() !== '') return r[f[1]];
        }
        return '';
      };

      const start = g('timestamp', 'starttime');
      let date = String(g('date')).trim();
      const tsKey = keyOf(start);
      if (/^\d{1,2}[\/.-]\d{1,2}$/.test(date)) {
        date += '/' + (tsKey ? tsKey.slice(0, 4) : new Date().getFullYear());
      }
      let dk = keyOf(date);
      if (!dk || dn(dk) > dn(localKey(new Date()))) {
        dk = tsKey || dk;
      }
      const sh = String(g('shift')).trim();
      const rawShift = sh
        ? ((sh.match(/([ABC])\s*$/i) || [])[1] || sh.charAt(0)).toUpperCase()
        : shiftFrom(start);

      const stageRaw = String(g('stage')).trim();
      const stage = /\d[\/.-]\d/.test(stageRaw) ? '' : stageRaw;

      // Extract Part / Model. Note some sheets have multiple model columns (Liquid line model vs Powder line model)
      const partFound = String(
        g('partno', 'partno2', 'model', 'model1', 'model2', 'partnumber', 'part')
      ).trim();

      const load = num(g('loadingqty', 'loadingquantity', 'loadqty'));
      let insp = num(g('totalinspectionqty', 'inspectionqty', 'inspectedqty'));
      let ok = num(g('okpartqty', 'okqty', 'okparts'));
      let nok = num(g('notokpartqty', 'notokpart', 'notokqty'));
      const rework = num(
        g(
          'totalreworkparts',
          'totalreworkpart',
          'totalreworkqty',
          'reworkparts',
          'reworkpart',
          'reworkqty',
          'totalrework',
          'rework'
        )
      );
      const rej = num(g('rejectedpart', 'rejectedpartqty', 'rejectedqty', 'rejectionqty'));
      const defect = String(g('defect', 'defects', 'defecttype', 'defect1', 'defects1') || '');

      if (!insp && ok + nok > 0) insp = ok + nok;
      nok = Math.max(0, nok - rework);

      return {
        ID: g('id') || `ROW-${idx + 1}`,
        Line: String(g('line')).trim() || 'Coating Line',
        Part: partFound || 'Standard',
        Stage: stage || (load > 0 ? 'Loading' : 'Unloading'),
        Load: load,
        Insp: insp,
        OK: ok,
        NOK: nok,
        Rework: rework,
        Rej: rej,
        Defect: defect,
        DateKey: dk || localKey(new Date()),
        Shift: rawShift || 'A',
        Timestamp: start ? String(start) : undefined,
        RawDate: date || undefined,
      };
    })
    .filter((r) => r.DateKey);
}

export const sum = (rows: ProductionRow[], f: keyof ProductionRow): number =>
  rows.reduce((a, r) => a + (typeof r[f] === 'number' ? (r[f] as number) : 0), 0);

export function grp(rows: ProductionRow[], kf: (r: ProductionRow) => string): GroupedMetric[] {
  const m: Record<string, GroupedMetric> = {};
  rows.forEach((r) => {
    const k = kf(r);
    m[k] = m[k] || { k, load: 0, insp: 0, ok: 0, nok: 0, rej: 0, rw: 0, n: 0 };
    m[k].load += r.Load;
    m[k].insp += r.Insp;
    m[k].ok += r.OK;
    m[k].nok += r.NOK;
    m[k].rej += r.Rej || 0;
    m[k].rw += r.Rework || 0;
    m[k].n++;
  });
  const out = Object.values(m);
  out.forEach((o) => {
    o.nok = Math.max(0, o.nok - o.rej);
  });
  return out;
}

export const rej = (o: { insp: number; rej?: number }): number =>
  o.insp ? ((o.rej || 0) / o.insp) * 100 : 0;

export const byKey = (a: { k: string }, b: { k: string }) =>
  a.k < b.k ? -1 : a.k > b.k ? 1 : 0;

export const rc = (p: number): string =>
  p <= REJ_GREEN ? 'text-emerald-400' : p <= REJ_AMBER ? 'text-amber-400' : 'text-rose-400';

export const rcBadge = (p: number): string =>
  p <= REJ_GREEN
    ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
    : p <= REJ_AMBER
    ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
    : 'text-rose-300 border-rose-500/30 bg-rose-500/10';

export function defects(rows: ProductionRow[], top: number = 0): [string, number][] {
  const d: Record<string, number> = {};
  rows.forEach((r) => {
    const t = r.Defect.split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!t.length || !r.NOK) return;
    t.forEach((n) => {
      d[n] = (d[n] || 0) + r.NOK / t.length;
    });
  });

  let e = Object.entries(d).sort((a, b) => b[1] - a[1]);
  if (top && e.length > top + 1) {
    const rest = e.slice(top).reduce((a, x) => a + x[1], 0);
    e = [...e.slice(0, top), ['Others', rest]];
  }
  return e;
}

export function computeData(
  rows: ProductionRow[],
  filters: FilterState
): ComputedData {
  const sv = filters.shift;
  const mv = filters.model;
  const lv = filters.line;

  const b = rows.filter(
    (r) =>
      (sv === 'All' || r.Shift === sv) &&
      (mv === 'All' || r.Part === mv) &&
      (lv === 'All' || r.Line === lv)
  );

  const tk = localKey(new Date());
  const T = dn(tk);
  const [y, m] = tk.split('-').map(Number);
  const opt = filters.dateRange;

  let lo: number;
  let hi: number;
  let plo: number;
  let phi: number;
  let lbl: string;

  if (opt === 'today') {
    lo = hi = T;
    plo = phi = T - 1;
    lbl = 'vs yesterday';
  } else if (opt === 'yesterday') {
    lo = hi = T - 1;
    plo = phi = T - 2;
    lbl = 'vs previous day';
  } else if (opt === 'last7') {
    lo = T - 6;
    hi = T;
    plo = lo - 7;
    phi = lo - 1;
    lbl = 'vs previous 7 days';
  } else if (opt === 'lastweek') {
    const dow = (new Date(T * 864e5).getUTCDay() + 6) % 7;
    const mon = T - dow;
    lo = mon - 7;
    hi = mon - 1;
    plo = lo - 7;
    phi = lo - 1;
    lbl = 'vs previous week';
  } else if (opt === 'lastmonth') {
    lo = Date.UTC(y, m - 2, 1) / 864e5;
    hi = Date.UTC(y, m - 1, 0) / 864e5;
    plo = Date.UTC(y, m - 3, 1) / 864e5;
    phi = lo - 1;
    lbl = 'vs previous month';
  } else if (opt === 'all') {
    const ks = rows.map((r) => dn(r.DateKey));
    lo = ks.length ? Math.min(...ks) : T;
    hi = ks.length ? Math.max(...ks) : T;
    plo = lo - 1;
    phi = lo - 2;
    lbl = 'all data';
  } else if (opt === 'custom') {
    const f = filters.customFrom;
    const t = filters.customTo;
    lo = f ? dn(f) : T;
    hi = t ? dn(t) : T;
    if (hi < lo) {
      const x = lo;
      lo = hi;
      hi = x;
    }
    const n = hi - lo + 1;
    plo = lo - n;
    phi = lo - 1;
    lbl = 'vs previous period';
  } else {
    // default 'month': This month
    lo = Date.UTC(y, m - 1, 1) / 864e5;
    hi = T;
    plo = Date.UTC(y, m - 2, 1) / 864e5;
    phi = lo - 1;
    lbl = 'vs last month';
  }

  const inR = (r: ProductionRow, a: number, z: number) => {
    const d = dn(r.DateKey);
    return d >= a && d <= z;
  };

  const lo2 = Math.min(lo, hi - 9);

  return {
    b,
    cur: b.filter((r) => inR(r, lo, hi)),
    prev: b.filter((r) => inR(r, plo, phi)),
    trend: b.filter((r) => inR(r, lo2, hi)),
    opt,
    lbl,
    lo,
    hi,
  };
}

export function convertToCsvUrl(u: string): string {
  u = u.trim();
  const m = u.match(/spreadsheets\/d\/([^\/?#]+)/);
  if (m && m[1] !== 'e') {
    const gid = (u.match(/gid=(\d+)/) || [])[1];
    return `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv${gid ? `&gid=${gid}` : ''}`;
  }
  return u;
}

export async function fetchCsvString(u: string): Promise<string> {
  const targetUrl = convertToCsvUrl(u);
  const cacheBust = (targetUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
  const fullTarget = targetUrl + cacheBust;

  const endpoints = [
    fullTarget,
    `https://corsproxy.io/?url=${encodeURIComponent(fullTarget)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(fullTarget)}`,
  ];

  let lastError = new Error('Could not fetch CSV from any endpoint');
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep);
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}: Sheet might not be publicly published`);
        continue;
      }
      const text = await res.text();
      if (!text.trim() || /^\s*<(!doctype|html)/i.test(text)) {
        lastError = new Error('Received HTML instead of CSV - ensure sheet is published as CSV');
        continue;
      }
      return text;
    } catch (e: any) {
      lastError = e;
    }
  }

  throw lastError;
}

export async function parseCsvOrExcel(data: string | ArrayBuffer): Promise<ProductionRow[]> {
  const wb =
    typeof data === 'string'
      ? XLSX.read(data, { type: 'string', raw: true })
      : XLSX.read(data, { type: 'array' });

  const sheet = wb.Sheets[wb.SheetNames[0]];
  const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return normalize(jsonRows);
}

export function exportToCsv(rows: ProductionRow[], filename: string = 'baxy_paintshop_report.csv') {
  const headers = [
    'ID',
    'Date',
    'Shift',
    'Line',
    'Part',
    'Stage',
    'Loaded',
    'Inspected',
    'OK',
    'Rework',
    'Not OK',
    'Rejected',
    'Defects',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.ID,
        r.DateKey,
        r.Shift,
        `"${r.Line}"`,
        `"${r.Part}"`,
        `"${r.Stage}"`,
        r.Load,
        r.Insp,
        r.OK,
        r.Rework,
        r.NOK,
        r.Rej,
        `"${r.Defect.replace(/"/g, '""')}"`,
      ].join(',')
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
