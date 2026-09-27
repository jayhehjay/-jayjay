// EA Transport rehber videoları: sahneleri telefon boyutunda çeker, altyazı + dokunma işareti ekler.
// Kullanım: node make.js <staff|chef> <tr|en|da>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const KIND = process.argv[2] || 'staff';
const LANG = process.argv[3] || 'tr';
const OUT = path.join(__dirname, `frames-${KIND}-${LANG}`);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ea-plan.html'), 'utf8');
const SKELETON = SRC.match(/const SKELETON = '(.*?)';/)[1];

/* ---------- Örnek veri (gerçek ekip değil) ---------- */
const TOURS = {
  tr: [['T1', 'Havalimanı'], ['T2', 'Şehir merkezi'], ['T3', 'Okul servisi']],
  en: [['T1', 'Airport'], ['T2', 'City centre'], ['T3', 'School run']],
  da: [['T1', 'Lufthavn'], ['T2', 'Centrum'], ['T3', 'Skolekørsel']]
};
const NOTE = { tr: 'Araç 12 · 06:45’te garajda ol', en: 'Vehicle 12 · be at the depot 06:45', da: 'Bil 12 · mød i garagen kl. 06:45' };
function demoPlan(lang) {
  const colors = ['#3b6fb6', '#1f8a86', '#c0702a'];
  const tours = TOURS[lang].map(([code, name], i) => ({ id: 't' + (i + 1), code, name, start: ['07:00', '12:00', '06:30'][i], end: ['15:00', '20:00', '10:30'][i], color: colors[i] }));
  const names = ['Ahmet', 'Can', 'Deniz', 'Elif', 'Kemal', 'Selin'];
  const employees = names.map((n, i) => ({ id: 'e' + (i + 1), name: n }));
  const entries = {};
  const pad = n => String(n).padStart(2, '0');
  const put = (e, y, m, d, v) => { entries[`${e}__${y}-${pad(m)}-${pad(d)}`] = v; };
  const W = (t, s, en, note = '') => ({ status: 'work', tour: t, start: s, end: en, note });
  const S = st => ({ status: st, tour: null, start: null, end: null, note: '' });
  // 31 Ağu – 27 Eyl arası; 28–30 Eyl boş (yönetici videosunda doldurulacak)
  const days = [];
  for (let d = new Date(2026, 7, 31); d <= new Date(2026, 8, 26); d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) days.push(new Date(d));
  employees.forEach((emp, i) => {
    days.forEach(d => {
      const wd = d.getDay(), y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate();
      const offDay = (i % 5) + 1;            // her kişinin haftalık izin günü farklı
      if (wd === offDay) return put(emp.id, y, m, dd, S('off'));
      if (wd === 6 && i % 2) return put(emp.id, y, m, dd, S('off'));
      const t = tours[(i + (wd >= 4 ? 1 : 0)) % 3];
      put(emp.id, y, m, dd, W(t.id, t.start, t.end));
    });
  });
  // Ahmet'in (örnek kişi) haftası: bugün 22 Eylül Salı, not var
  put('e1', 2026, 9, 21, W('t1', '07:00', '15:00'));
  put('e1', 2026, 9, 22, W('t1', '07:00', '15:00', NOTE[lang]));
  put('e1', 2026, 9, 23, S('off'));
  put('e1', 2026, 9, 24, W('t2', '12:00', '20:00'));
  put('e1', 2026, 9, 25, S('hol'));
  put('e1', 2026, 9, 26, S('hol'));
  put('e1', 2026, 9, 8, S('sick'));
  put('e3', 2026, 9, 22, S('sick'));
  return { v: 1, shareUrl: 'https://claude.ai/artifact/SXg1ahXMwkcWK6qSNAERhm', employees, tours, entries };
}

function pageHtml(lang) {
  const data = JSON.stringify(demoPlan(lang)).replace(/</g, '\\u003c');
  const body = SRC.replace(/(<script type="application\/json" id="plan-data">)[\s\S]*?(<\/script>)/, (_, a, b) => a + data + b);
  return SKELETON + '\n' + body + '</body></html>';
}

/* ---------- Altyazılar ---------- */
const TXT = {
  staff: {
    tr: {
      title: 'Çalışma planımı nasıl görürüm?', sub: 'EA Transport · Personel rehberi', tag: 'Örnek verilerle gösterim',
      msgLbl: 'Mesajlar', s1: 'Şefinden gelen mesajdaki bağlantıya dokun. Plan telefonunun tarayıcısında açılır.',
      s2: 'Dilini seç: TR, EN veya DA.', s3: '“Program” kutusuna dokun.', s4: 'Listeden adını seç.',
      s5: 'Bu senin programın. Üstte bu ayki saatlerin ve çalışma günlerin yazar.',
      s6: 'Sarı satır bugün: tur, başlangıç–bitiş saati ve toplam saat.',
      s7: '📝 ile başlayan satır şefinin notu: araç, buluşma yeri gibi.',
      s8: 'Renkler: gri izin, sarı tatil, kırmızı hastalık.',
      s9: 'Her haftanın toplam saati haftanın başında yazar.',
      s10: 'Diğer aylar için “Sonraki” ve “Önceki”ye dokun.',
      s11: 'Şef değiştirince plan kendiliğinden güncellenir. Hep aynı bağlantıyı aç.',
      endT: 'Sorun olursa şefine yaz.', endS: 'İyi çalışmalar!'
    },
    en: {
      title: 'How do I see my work schedule?', sub: 'EA Transport · Staff guide', tag: 'Shown with example data',
      msgLbl: 'Messages', s1: 'Tap the link in the message from your manager. The plan opens in your phone’s browser.',
      s2: 'Pick your language: TR, EN or DA.', s3: 'Tap the “Schedule” box.', s4: 'Pick your name from the list.',
      s5: 'This is your schedule. At the top: your hours and work days this month.',
      s6: 'The yellow row is today: route, start–end time and total hours.',
      s7: 'A line starting with 📝 is a note from your manager, such as the vehicle or meeting point.',
      s8: 'Colours: grey = day off, yellow = holiday, red = sick.',
      s9: 'Each week’s total hours are shown at the top of the week.',
      s10: 'Tap “Next” or “Previous” to see other months.',
      s11: 'When your manager makes changes, the plan updates by itself. Always open the same link.',
      endT: 'Questions? Message your manager.', endS: 'Have a good shift!'
    },
    da: {
      title: 'Hvordan ser jeg min arbejdsplan?', sub: 'EA Transport · Guide til medarbejdere', tag: 'Vist med eksempeldata',
      msgLbl: 'Beskeder', s1: 'Tryk på linket i beskeden fra din leder. Planen åbner i telefonens browser.',
      s2: 'Vælg sprog: TR, EN eller DA.', s3: 'Tryk på feltet “Plan”.', s4: 'Vælg dit navn på listen.',
      s5: 'Det er din plan. Øverst: dine timer og arbejdsdage i denne måned.',
      s6: 'Den gule række er i dag: tur, start–sluttid og timer i alt.',
      s7: 'En linje med 📝 er en note fra din leder, fx bil eller mødested.',
      s8: 'Farver: grå = fri, gul = ferie, rød = syg.',
      s9: 'Ugens timer i alt står øverst for hver uge.',
      s10: 'Tryk på “Næste” eller “Forrige” for at se andre måneder.',
      s11: 'Når din leder ændrer noget, opdateres planen af sig selv. Åbn altid det samme link.',
      endT: 'Spørgsmål? Skriv til din leder.', endS: 'God vagt!'
    }
  },
  chef: {
    tr: {
      title: 'Planı hazırla, tek tuşla gönder', sub: 'EA Transport · Yönetici rehberi', tag: 'Örnek verilerle gösterim', msgLbl: 'WhatsApp',
      c1: 'Sayfayı kendi Claude hesabınla açınca düzenleme butonları görünür. Çalışanlar bunları görmez.',
      c2: '“Çalışanlar”: isimleri bir kez yaz, ↑ ↓ ile sırala, Kaydet.',
      c3: '“Turlar”: kod (T1), güzergâh adı ve varsayılan saat.',
      c4: 'Tek gün için takvimde güne dokun: durum, tur, saat ve çalışanın göreceği not.',
      c5: 'Çok gün için “⚡ Hızlı giriş”: durumu, turu ve saati bir kez seç.',
      c6: 'Sonra günlere dokun, her dokunuş anında dolar.',
      c7: 'Gün başlığına dokunursan o gün tüm ekibe uygulanır. Yanlışsa “↶ Geri al”.',
      c8: 'Her değişiklik kendiliğinden kaydedilir. “Bitti” ile hızlı girişi kapat.',
      c9: 'Hazır olunca yeşil “📲 Ekibe gönder” butonuna dokun.',
      c10: 'WhatsApp açılır, mesaj hazırdır: ekip grubunu seç ve Gönder’e bas.',
      c11: '“Kişiye özel”: her çalışana doğrudan kendi programını açan bağlantı.',
      c12: 'Sonraki değişikliklerde tekrar göndermene gerek yok. Aynı bağlantı hep güncel kalır.',
      endT: 'Ekibe gönder → grubu seç → Gönder', endS: 'Hepsi bu kadar.'
    }
  }
}[KIND][LANG];

/* ---------- Sahne yardımcıları ---------- */
let n = 0;
const scenes = [];                              // [{file, dur}]
async function snap(page, dur) {
  const file = path.join(OUT, String(++n).padStart(3, '0') + '.png');
  await page.screenshot({ path: file });
  scenes.push({ file, dur });
}

// Altyazı + halka + dokunma noktası ekler. target: seçici, pos: 'bottom' | 'top'
async function cue(page, { text, target, pos = 'bottom', step, total, tap = true, scroll = true }) {
  await page.evaluate(({ text, target, pos, step, total, tap, scroll }) => {
    document.querySelectorAll('.vo').forEach(e => e.remove());
    const add = (css, html = '') => { const d = document.createElement('div'); d.className = 'vo'; d.style.cssText = css; d.innerHTML = html; document.body.appendChild(d); return d; };
    if (target) {
      const el = document.querySelector(target);
      if (el) {
        if (scroll) {
          el.scrollIntoView({ block: 'center', inline: 'center' });
          const r0 = el.getBoundingClientRect();
          const want = pos === 'bottom' ? window.innerHeight * 0.36 : window.innerHeight * 0.62;
          window.scrollBy(0, r0.top + r0.height / 2 - want);
        }
        const r = el.getBoundingClientRect();
        add(`position:fixed;z-index:9998;left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px;border:3px solid #e2b04a;border-radius:12px;box-shadow:0 0 0 9999px rgba(8,16,32,.38),0 0 18px rgba(226,176,74,.9);pointer-events:none`);
        if (tap) add(`position:fixed;z-index:9999;left:${r.left + r.width / 2 - 17}px;top:${r.top + r.height / 2 - 17}px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid #fff;box-shadow:0 0 0 6px rgba(226,176,74,.55),0 4px 10px rgba(0,0,0,.35);pointer-events:none`);
      }
    }
    if (text) {
      const edge = pos === 'bottom' ? 'bottom:18px' : 'top:18px';
      add(`position:fixed;z-index:10000;left:12px;right:12px;${edge};background:#0f1f3b;color:#fff;border:2px solid #e2b04a;border-radius:16px;padding:14px 16px;font:600 19px/1.35 Barlow,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);display:flex;gap:12px;align-items:flex-start`,
        (step ? `<span style="flex:none;background:#e2b04a;color:#0f1f3b;border-radius:10px;padding:2px 9px;font:700 16px/1.5 'IBM Plex Mono',monospace">${step}/${total}</span>` : '') + `<span>${text}</span>`);
    }
  }, { text, target, pos, step, total, tap, scroll });
  await page.waitForTimeout(150);
}
const clearCue = page => page.evaluate(() => document.querySelectorAll('.vo').forEach(e => e.remove()));

// Başlık / kapanış kartı
function cardHtml(big, small, tag, mark = true) {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@500;600&display=swap"></head>
  <body style="margin:0;height:100vh;background:linear-gradient(160deg,#13274a,#1d3864);color:#fff;font-family:Barlow,system-ui,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 30px;box-sizing:border-box;border-bottom:8px solid #b08a45">
  ${mark ? '<div style="width:70px;height:70px;border:3px solid #b08a45;border-radius:12px;display:grid;place-items:center;font:700 32px \'Barlow Condensed\',sans-serif;color:#b08a45;margin-bottom:26px">EA</div>' : ''}
  <div style="font:700 44px/1.08 'Barlow Condensed',sans-serif;letter-spacing:.02em">${big}</div>
  <div style="margin-top:14px;font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:#ecdcb8">${small}</div>
  ${tag ? `<div style="margin-top:34px;display:inline-block;align-self:flex-start;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:6px 14px;font-size:15px;opacity:.85">${tag}</div>` : ''}
  </body></html>`;
}
// Genel mesaj ekranı (markasız)
function chatHtml(label, msg) {
  const body = msg.split('\n').map(l => l.startsWith('https://') ? `<span style="color:#1a6fd1;text-decoration:underline;word-break:break-all">${l}</span>` : l).join('<br>');
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@500;600;700&display=swap"></head>
  <body style="margin:0;height:100vh;background:#e9e4dc;font-family:Barlow,system-ui,sans-serif">
  <div style="background:#1f3a33;color:#fff;padding:18px 16px;font-weight:700;font-size:19px;display:flex;gap:12px;align-items:center"><span style="width:38px;height:38px;border-radius:50%;background:#b08a45;display:grid;place-items:center;color:#13274a">EA</span>EA Transport · ${label}</div>
  <div style="padding:22px 14px"><div id="bubble" style="background:#fff;border-radius:4px 14px 14px 14px;padding:12px 14px;max-width:86%;font-size:17px;line-height:1.4;box-shadow:0 1px 1px rgba(0,0,0,.12)">${body}<div style="text-align:right;font-size:12px;color:#8a8a8a;margin-top:4px">09:02</div></div></div>
  </body></html>`;
}

(async () => {
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const loc = LANG === 'da' ? 'da_DK' : LANG === 'en' ? 'en_GB' : 'tr_TR';
  const browser = await chromium.launch({ proxy, args: ['--lang=' + loc.replace('_', '-')], env: { ...process.env, LANG: loc + '.UTF-8', LC_ALL: loc + '.UTF-8', LANGUAGE: LANG } });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true, locale: LANG === 'da' ? 'da-DK' : LANG === 'en' ? 'en-GB' : 'tr-TR' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-09-22T09:00:00'));
  const file = path.join(OUT, 'page.html');
  fs.writeFileSync(file, pageHtml(LANG));
  const card = async (html, dur) => { await page.setContent(html); await page.waitForTimeout(900); await snap(page, dur); };

  await card(cardHtml(TXT.title, TXT.sub, TXT.tag), 3.2);

  if (KIND === 'staff') {
    const T = 11;
    const MSG = (SRC.match(/const MSG_TEAM = '(.*?)';/)[1]).replace(/\\n/g, '\n').replace('{url}', 'https://claude.ai/artifact/SXg1ahXMwkcWK6qSNAERhm');
    await page.setContent(chatHtml(TXT.msgLbl, MSG)); await page.waitForTimeout(800);
    await cue(page, { text: TXT.s1, target: '#bubble', step: 1, total: T, scroll: false });
    await snap(page, 4.8);

    await page.addInitScript(l => { try { localStorage.setItem('ea.lang', l); localStorage.removeItem('ea.who'); } catch (e) {} }, LANG);
    await page.goto('file://' + file); await page.waitForTimeout(1500);
    await cue(page, { text: TXT.s2, target: '.langs', step: 2, total: T }); await snap(page, 3.6);
    await cue(page, { text: TXT.s3, target: '#who', step: 3, total: T }); await snap(page, 3.4);

    // Açılır listeyi taklit eden görünüm
    await clearCue(page);
    await page.evaluate(() => {
      const names = [...document.querySelectorAll('#who option')].map(o => o.textContent);
      const d = document.createElement('div'); d.className = 'vo';
      d.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(8,16,32,.45);display:flex;align-items:flex-end';
      d.innerHTML = `<div style="background:#fff;width:100%;border-radius:18px 18px 0 0;padding:10px 0 150px;font:500 20px Barlow,system-ui,sans-serif">` +
        names.map((x, i) => `<div style="padding:13px 22px;${i === 1 ? 'background:#e8eefb;font-weight:700;color:#13274a' : 'color:#14213a'};border-bottom:1px solid #eee">${i === 1 ? '✓ ' : ''}${x}</div>`).join('') + '</div>';
      document.body.appendChild(d);
    });
    await page.evaluate(() => { const d = document.createElement('div'); d.className = 'vo'; document.body.appendChild(d); });
    await cue(page, { text: TXT.s4, step: 4, total: T }).catch(() => {});
    // cue() temizlediği için listeyi yeniden çiz
    await page.evaluate(() => {
      const names = [...document.querySelectorAll('#who option')].map(o => o.textContent);
      const d = document.createElement('div'); d.className = 'vo';
      d.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(8,16,32,.45);display:flex;align-items:flex-end';
      d.innerHTML = `<div style="background:#fff;width:100%;border-radius:18px 18px 0 0;padding:10px 0 140px;font:500 20px Barlow,system-ui,sans-serif">` +
        names.map((x, i) => `<div style="padding:13px 22px;${i === 1 ? 'background:#e8eefb;font-weight:700;color:#13274a' : 'color:#14213a'};border-bottom:1px solid #eee">${i === 1 ? '✓ ' : ''}${x}</div>`).join('') + '</div>';
      document.body.appendChild(d);
    });
    await snap(page, 3.4);

    await clearCue(page);
    await page.selectOption('#who', 'e1'); await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await cue(page, { text: TXT.s5, target: '.kpis', step: 5, total: T, tap: false }); await snap(page, 4.2);
    await cue(page, { text: TXT.s6, target: '.day.is-today', step: 6, total: T, tap: false }); await snap(page, 4.4);
    await cue(page, { text: TXT.s7, target: '.day.is-today .note', step: 7, total: T, tap: false }); await snap(page, 4.4);
    await page.evaluate(() => { [...document.querySelectorAll('.day')].find(d => d.querySelector('.pill.st-hol'))?.setAttribute('id', 'holday'); });
    await cue(page, { text: TXT.s8, target: '#holday', step: 8, total: T, tap: false }); await snap(page, 4.2);
    await page.evaluate(() => { [...document.querySelectorAll('.wk-block')].find(b => b.querySelector('.day.is-today'))?.querySelector('.wk-title')?.setAttribute('id', 'curwk'); });
    await cue(page, { text: TXT.s9, target: '#curwk', step: 9, total: T, tap: false }); await snap(page, 3.8);
    await page.evaluate(() => window.scrollTo(0, 0));
    await cue(page, { text: TXT.s10, target: '[data-act="next"]', step: 10, total: T, scroll: false }); await snap(page, 3.6);
    await cue(page, { text: TXT.s11, target: '#chip', step: 11, total: T, tap: false, scroll: false }); await snap(page, 4.6);
  } else {
    const T = 12;
    await page.addInitScript(() => {
      window.claude = { use: async n => n === 'artifact' ? { publish: async () => ({}) } : n === 'user' ? { canEdit: async () => true } : null };
      try { localStorage.setItem('ea.lang', 'tr'); localStorage.removeItem('ea.who'); localStorage.setItem('ea.guideOk', '1'); sessionStorage.clear(); } catch (e) {}
    });
    await page.goto('file://' + file); await page.waitForTimeout(1500);
    // Videoda gerçek kayıt yapılmasın: kaydetme anında "Kaydedildi" göstersin
    await page.evaluate(() => { publishNow = async () => { pending = 0; renderChip(); }; });
    await cue(page, { text: TXT.c1, target: '#chefBar', step: 1, total: T, tap: false }); await snap(page, 4.6);

    await clearCue(page); await page.click('[data-act="emp-open"]'); await page.waitForTimeout(400);
    await cue(page, { text: TXT.c2, step: 2, total: T, pos: 'top' }); await snap(page, 4.0);
    await clearCue(page); await page.click('[data-act="dlg-close"]');
    await page.click('[data-act="tour-open"]'); await page.waitForTimeout(400);
    await cue(page, { text: TXT.c3, step: 3, total: T, pos: 'top' }); await snap(page, 4.0);
    await clearCue(page); await page.click('[data-act="dlg-close"]');

    await page.click('[data-act="cell"][data-emp="e2"][data-date="2026-09-24"]', { force: true }).catch(async () => {
      await page.evaluate(() => document.querySelector('[data-act="cell"][data-emp="e2"][data-date="2026-09-24"]').click());
    });
    await page.waitForTimeout(400);
    await cue(page, { text: TXT.c4, step: 4, total: T, pos: 'top' }); await snap(page, 4.4);
    await clearCue(page); await page.evaluate(() => closeDlg());

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('#brushBtn'); await page.waitForTimeout(300);
    await page.selectOption('#bTour', 't2'); await page.waitForTimeout(300);
    await cue(page, { text: TXT.c5, target: '#brush', step: 5, total: T, pos: 'top', tap: false, scroll: false }); await snap(page, 4.4);

    // Günlere dokunma: 28–30 Eylül, Can
    const tapCell = async (emp, date, text, step, dur) => {
      const sel = `[data-act="cell"][data-emp="${emp}"][data-date="${date}"]`;
      await clearCue(page);
      await page.evaluate(s => { const el = document.querySelector(s); el.scrollIntoView({ block: 'center', inline: 'center' }); window.scrollBy(0, el.getBoundingClientRect().top - 330); }, sel);
      await cue(page, { text, target: sel, step, total: T, pos: 'top', scroll: false }); await snap(page, 0.9);
      await clearCue(page); await page.evaluate(s => document.querySelector(s).click(), sel); await page.waitForTimeout(450);
      await cue(page, { text, target: sel, step, total: T, pos: 'top', scroll: false, tap: false }); await snap(page, dur);
    };
    await tapCell('e2', '2026-09-28', TXT.c6, 6, 0.9);
    await tapCell('e2', '2026-09-29', TXT.c6, 6, 0.9);
    await tapCell('e2', '2026-09-30', TXT.c6, 6, 2.0);

    // Gün başlığı: 30 Eylül → herkese
    await page.selectOption('#bTour', 't1');
    await clearCue(page);
    const head = '[data-act="dayhead"][data-date="2026-09-29"]';
    await page.evaluate(s => { const el = document.querySelector(s); el.scrollIntoView({ block: 'center', inline: 'center' }); window.scrollBy(0, el.getBoundingClientRect().top - 300); }, head);
    await cue(page, { text: TXT.c7, target: head, step: 7, total: T, pos: 'top', scroll: false }); await snap(page, 1.6);
    await clearCue(page); await page.evaluate(s => document.querySelector(s).click(), head); await page.waitForTimeout(500);
    await page.evaluate(s => { const el = document.querySelector(s); window.scrollBy(0, el.getBoundingClientRect().top - 300); }, head);
    await cue(page, { text: TXT.c7, target: '#bUndo', step: 7, total: T, pos: 'top', scroll: false }); await snap(page, 3.4);

    await page.evaluate(() => window.scrollTo(0, 0));
    await cue(page, { text: TXT.c8, target: '#chip', step: 8, total: T, pos: 'top', tap: false, scroll: false }); await snap(page, 3.8);
    await clearCue(page); await page.click('[data-act="brush-done"]'); await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, 0));
    await cue(page, { text: TXT.c9, target: '#sendTeam', step: 9, total: T, scroll: false }); await snap(page, 4.0);

    const MSG = (SRC.match(/const MSG_TEAM = '(.*?)';/)[1]).replace(/\\n/g, '\n').replace('{url}', 'https://claude.ai/artifact/SXg1ahXMwkcWK6qSNAERhm');
    await page.goto('about:blank'); await page.setContent(chatHtml(TXT.msgLbl, MSG)); await page.waitForTimeout(700);
    await cue(page, { text: TXT.c10, target: '#bubble', step: 10, total: T, scroll: false, tap: false }); await snap(page, 4.8);

    await page.goto('file://' + file); await page.waitForTimeout(1200);
    await page.evaluate(() => { publishNow = async () => { pending = 0; renderChip(); }; });
    await page.click('[data-act="share-open"]'); await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector('.plist')?.scrollIntoView({ block: 'center' }));
    await cue(page, { text: TXT.c11, target: '.prow', step: 11, total: T, pos: 'top', scroll: false }); await snap(page, 4.4);
    await clearCue(page); await page.evaluate(() => closeDlg());
    await page.evaluate(() => window.scrollTo(0, 0));
    await cue(page, { text: TXT.c12, target: '#sendTeam', step: 12, total: T, tap: false, scroll: false }); await snap(page, 4.4);
  }

  await card(cardHtml(TXT.endT, TXT.endS, '', true), 3.2);
  fs.writeFileSync(path.join(OUT, 'scenes.json'), JSON.stringify(scenes));
  await browser.close();
  console.log('frames:', scenes.length, 'seconds:', scenes.reduce((s, x) => s + x.dur, 0).toFixed(1));
})().catch(e => { console.error(e); process.exit(1); });
