// ══════════════════════════════════════════════════════
// TRANSLATE → ENGLISH
// ══════════════════════════════════════════════════════
// Kiosk form (jaise Installation) me staff kisi bhi Indian language me likh
// sakte hain, par sheet me data hamesha ENGLISH me jaana chahiye. Google ka
// free web-translate endpoint (key nahi chahiye) — source language khud
// detect hoti hai. Fail ho (network/limit) to original text hi wapas — jawab
// kabhi gum nahi hota.
//
// Sirf wahi text translate hota hai jisme non-ASCII akshar ho; plain English,
// numbers, dates, links jaise ke taise rehte hain.

const NON_ASCII = /[^\u0000-\u007F]/;

async function toEnglish(text) {
  const t = String(text == null ? '' : text);
  if (!t.trim() || !NON_ASCII.test(t)) return t;
  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' + encodeURIComponent(t);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) return t;
    const data = await res.json();
    const out = Array.isArray(data && data[0]) ? data[0].map(seg => (seg && seg[0]) || '').join('') : '';
    return out.trim() ? out : t;
  } catch (e) {
    console.error('toEnglish failed, keeping original:', e.message);
    return t;
  }
}

module.exports = { toEnglish };
