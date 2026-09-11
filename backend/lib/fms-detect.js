// ══════════════════════════════════════════════════════
// FMS — SHEET SE STEP CONFIG KHUD PADHNA
// ══════════════════════════════════════════════════════
// Nayi FMS banate waqt admin ko har step haath se bharna padta tha — naam,
// Planned column, Actual column, doer, aur phir har extra input. Ye saari
// jaankari sheet me pehle se hoti hai, isliye yahan use padh kar form bhar
// dete hain.
//
// Soch ye hai ki galat andaaza lagane se accha hai khaali chhod dena. Admin
// isi screen par sudhaar sakta hai, to khaali field ki keemat ek click hai —
// par chupke se galat column ya galat aadmi bhar dena baad me pakda hi nahi
// jaata. Isliye har jagah shak hone par null/[] lautate hain.
//
// Ye file jaan-boojh kar Sheets API se nahi baat karti: input sirf arrays aur
// plain objects hain (headers, grid cells, users). Isse poora detection bina
// kisi asli sheet ke test ho jaata hai — aur wahi test suite me hota hai.

// ── Header naamon ki pehchan ──────────────────────────
// Sheet har company ki apni hoti hai, isliye naam thode alag hote hain:
// "Planned", "Plan Date", "Planned Date" — teenon ek hi cheez hain.
const _norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/[\s_\-.]+/g, ' ');

const PLAN_RE   = /^(planned|plan|planned date|plan date|target|target date)$/;
const ACTUAL_RE = /^(actual|actual date|done date|completion date|completed)$/;
// Ye teen app khud bharti hai jab step "Done" hota hai (server.js ka done route),
// isliye inhe extra input banana galat hoga — doer jo likhta wo turant dab jaata.
const AUTO_RE   = /^(status|delay|delay days|remarks|remark|note|notes)$/;
const DOER_RE   = /^(doer|done by|owner|responsible|assigned to|person|employee|user|name)$/;

const isPlanHeader   = h => PLAN_RE.test(_norm(h));
const isActualHeader = h => ACTUAL_RE.test(_norm(h));
const isAutoHeader   = h => AUTO_RE.test(_norm(h));
const isDoerHeader   = h => DOER_RE.test(_norm(h));

// ── Extra input ka type ──────────────────────────────
// Pehle cell ki apni gawaahi dekhte hain (data validation, number format), phir
// header ke naam ka ishara. Naam sabse kamzor sabooot hai, isliye sabse aakhir me.
const FILE_RE = /(photo|image|picture|attachment|upload|file|pdf|scan|proof)/;
const LINK_RE = /(link|url|drive|sheet|doc|website)/;
const DATE_RE = /(date|deadline|eta|day)/;
const NUM_RE  = /(qty|quantity|no of|number of|count|amount|price|cost|rate|weight|kg|pcs|total|value|percent|%)/;

// cells = us column ke kuch data cells (upar se, khaali chhod kar nahi).
// Har cell: { formula:bool, validation:{type,values[]}|null, numberFormat:'DATE'|'NUMBER'|... }
function detectFieldType(headerName, cells) {
  const list = Array.isArray(cells) ? cells.filter(Boolean) : [];

  // 1. Data validation sabse pakka saboot hai — sheet khud keh rahi hai ki
  //    yahan kya aa sakta hai.
  const withList = list.find(c => c.validation && Array.isArray(c.validation.values) && c.validation.values.length);
  if (withList) return { field_type: 'dropdown', dropdown_options: withList.validation.values.join(', ') };

  // 2. Number format — "12/03/2025" date hai ya text, ye sirf format batata hai.
  if (list.some(c => c.numberFormat === 'DATE' || c.numberFormat === 'DATE_TIME')) return { field_type: 'date' };

  const n = _norm(headerName);
  // 3. Naam ka ishara. File/link pehle, kyunki "Invoice PDF Link" dono se milta
  //    hai aur usme asli cheez file hi hai.
  if (FILE_RE.test(n)) return { field_type: 'file' };
  if (LINK_RE.test(n)) return { field_type: 'link' };
  if (DATE_RE.test(n)) return { field_type: 'date' };
  if (NUM_RE.test(n))  return { field_type: 'number' };

  // 4. Sab cells number hain to number, warna text.
  if (list.length && list.every(c => c.numberFormat === 'NUMBER')) return { field_type: 'number' };
  return { field_type: 'text' };
}

// Ye column sheet khud bharti hai? Aisa column doer ko dikhana bekaar hai —
// jo wo likhega wo formula ya auto-tick se dab jayega.
function isSheetFilled(cells) {
  const list = Array.isArray(cells) ? cells.filter(Boolean) : [];
  if (!list.length) return false;
  if (list.some(c => c.formula)) return true;                       // formula column
  // Checkbox (BOOLEAN validation) aksar kisi formula ya script se tick hota hai.
  if (list.some(c => c.validation && c.validation.type === 'BOOLEAN')) return true;
  return false;
}

// ── Doer ko app ke users se milao ────────────────────
// Sirf tab lautate hain jab naam THEEK ek user se mile. Do "Rahul" hon to
// khaali chhod dete hain — galat aadmi ko step de dena chup-chaap nuksaan hai.
function matchDoer(sheetName, users) {
  const t = _norm(sheetName);
  if (!t || !Array.isArray(users)) return null;
  const hits = users.filter(u => _norm(u.name) === t);
  if (hits.length === 1) return hits[0].id;
  return null;                       // 0 mile ya 1 se zyada -> khaali
}

// ── Step ka naam ─────────────────────────────────────
// Header row me naam nahi hota: wahan har step me bas "Planned"/"Actual" likha
// hota hai. Naam aksar upar wali row me hota hai, ek merged cell me jo poore
// step ke columns par phaili hoti hai. Merged cell ki value Sheets API sirf
// PEHLE cell me deti hai, baaki khaali aate hain — isliye step ke start se
// ulta chal kar sabse paas wali bhari hui cell dhoondhte hain.
function stepNameFrom(groupRow, startIdx, prevStartIdx) {
  if (!Array.isArray(groupRow)) return '';
  const floor = prevStartIdx == null ? 0 : prevStartIdx;   // pichhle step se pehle mat jao
  for (let i = startIdx; i >= floor; i--) {
    const v = String(groupRow[i] == null ? '' : groupRow[i]).trim();
    if (v) return v;
  }
  return '';
}

// ── Poora detection ──────────────────────────────────
// headers    : header row ke naam (array)
// groupRow   : header ke upar wali row (step ke naam ke liye) — na ho to []
// sampleCells: { [colIdx]: [cell, cell, ...] } — har column ke kuch data cells
// users      : [{ id, name }] app ke users
//
// Lautata hai steps ki list, us shakl me jo UI seedha form me daal sake.
function detectSteps({ headers, groupRow, sampleCells, users }) {
  const H = Array.isArray(headers) ? headers : [];
  const cellsAt = i => (sampleCells && sampleCells[i]) || [];

  // 1. Har Planned = ek naye step ki shuruaat.
  const starts = [];
  for (let i = 0; i < H.length; i++) if (isPlanHeader(H[i])) starts.push(i);
  if (!starts.length) return [];

  const steps = [];
  for (let s = 0; s < starts.length; s++) {
    const from = starts[s];
    const to = (s + 1 < starts.length) ? starts[s + 1] : H.length;   // agle step se pehle tak
    const step = {
      stepName: stepNameFrom(groupRow, from, s > 0 ? starts[s - 1] : 0),
      planCol: from, planColName: String(H[from] == null ? '' : H[from]).trim(),
      actualCol: null, actualColName: '',
      doerNameCol: null, doerNameColName: '',
      doers: [],
      extraRows: [],
    };

    for (let i = from + 1; i < to; i++) {
      const name = String(H[i] == null ? '' : H[i]).trim();
      if (!name) continue;                                  // bina naam ka column chhod do

      // Actual — step ka pehla Actual hi lete hain.
      if (step.actualCol == null && isActualHeader(name)) {
        step.actualCol = i; step.actualColName = name; continue;
      }
      // Status / Delay / Remarks app khud bharti hai (done route) — chhod do.
      if (isAutoHeader(name)) continue;
      // Doer ka naam jahan likha jaata hai.
      if (step.doerNameCol == null && isDoerHeader(name)) {
        step.doerNameCol = i; step.doerNameColName = name;
        // Sheet me pehle se koi naam pada ho to usse user match karne ki koshish.
        for (const c of cellsAt(i)) {
          const uid = matchDoer(c && c.value, users);
          if (uid) { step.doers = [uid]; break; }
        }
        continue;
      }
      // Baaki sab extra input — par sirf wo jo doer sach me bhar sakta hai.
      const cells = cellsAt(i);
      if (isSheetFilled(cells)) continue;                   // formula / auto checkbox
      const t = detectFieldType(name, cells);
      step.extraRows.push({
        label: name,
        col_index: i,
        col_name: name,
        field_type: t.field_type,
        dropdown_options: t.dropdown_options || '',
        required: 0,                                        // default optional — admin badal le
      });
    }
    steps.push(step);
  }
  return steps;
}

module.exports = {
  detectSteps, detectFieldType, isSheetFilled, matchDoer, stepNameFrom,
  isPlanHeader, isActualHeader, isAutoHeader, isDoerHeader,
};
