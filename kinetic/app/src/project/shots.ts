// Works On My Machine: bespoke compositions. The terminal is the stage: every set piece is a piece of developer UI
// (a certification stamp, an `agent doctor` log, a dotfile, two machines, a repo page, a new-issue form, a duplicate
// pile) that acts out the line being sung. Pure functions of s.t; words land on w.start; only signal/ember on s.g.
import { W, H } from '../engine/gl';
import { F } from '../engine/type';
import type { Line, Word } from '../engine/lyrics';
import { clamp, ease, hash, lerp, noise1, prog, pulse, TAU } from '../engine/util';
import { A, CAP, col, heat, mix, note, rule } from '../scenes/kit';
import { cam, fitRow, rows, slam, txt, word, type S } from '../scenes/shots';
import { row, snapVal, band, last } from '../scenes/typeset';
import { BRAND } from './brand';

type K = 'signal' | 'acid' | 'bone' | 'ash' | 'graphite' | 'ember' | 'ink' | 'ink2';
const SCREEN = { x: W / 2, y: H / 2, z: 1, r: 0 };
const MONO = F.mono(500);
const typed = (str: string, t: number, t0: number, dur: number) => str.slice(0, Math.ceil(prog(t, t0, t0 + dur) * str.length));
const cur = (L: Line[], t: number) => { let i = -1; L.forEach((l, j) => { if (t >= l.start - 0.12) i = j; }); return i; };
const wordIs = (ws: Word[], re: RegExp) => ws.find((w) => re.test(w.w.replace(/[^\w']/g, '')));

/** Apply a group transform to both layers (paint + glow), draw, restore. */
function grp(s: S, x: number, y: number, r: number, sc: number, fn: () => void) {
  for (const k of [s.c, s.g]) { k.save(); k.translate(x, y); k.rotate(r); k.scale(sc, sc); }
  fn();
  s.c.restore(); s.g.restore();
}
/** ✓ / ✗ drawn as strokes (Archivo has neither glyph). */
function mark(s: S, kind: 'ok' | 'err', x: number, y: number, sz: number, a: number, glow = 0) {
  if (a <= 0) return;
  const paint = (c: CanvasRenderingContext2D, colr: string, lw: number) => {
    c.strokeStyle = colr; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
    if (kind === 'ok') { c.moveTo(x - sz * 0.45, y + sz * 0.02); c.lineTo(x - sz * 0.12, y + sz * 0.36); c.lineTo(x + sz * 0.48, y - sz * 0.4); }
    else { c.moveTo(x - sz * 0.38, y - sz * 0.38); c.lineTo(x + sz * 0.38, y + sz * 0.38); c.moveTo(x + sz * 0.38, y - sz * 0.38); c.lineTo(x - sz * 0.38, y + sz * 0.38); }
    c.stroke();
  };
  paint(s.c, col(kind === 'ok' ? 'signal' : 'acid', a), Math.max(3, sz * 0.16));
  if (glow > 0 && kind === 'ok') paint(s.g, col('ember', a * glow), sz * 0.3);
}
/** A dark UI window with a title bar. */
function panel(s: S, x: number, y: number, w: number, h: number, title: string, a = 1, edge: K = 'graphite') {
  if (a <= 0) return;
  const c = s.c;
  c.fillStyle = col('ink2', 0.97 * a); c.fillRect(x, y, w, h);
  c.fillStyle = col('graphite', 0.35 * a); c.fillRect(x, y, w, 44);
  c.strokeStyle = col(edge, 0.9 * a); c.lineWidth = 2; c.strokeRect(x, y, w, h);
  (['acid', 'ash', 'signal'] as K[]).forEach((k, i) => { c.fillStyle = col(k, 0.7 * a); c.beginPath(); c.arc(x + 26 + i * 24, y + 22, 7, 0, TAU); c.fill(); });
  note(c, title, x + 110, y + 29, 0.85 * a, 19, 'ash');
}
/** A log line; a leading ✓/✗ becomes a drawn mark and colours the line. */
function logLine(s: S, text: string, x: number, y: number, size: number, a: number, k = 1) {
  if (a <= 0 || k <= 0) return;
  let kind: 'ok' | 'err' | null = null, body = text;
  if (text.startsWith('✓')) { kind = 'ok'; body = text.slice(1).trimStart(); }
  else if (text.startsWith('✗')) { kind = 'err'; body = text.slice(1).trimStart(); }
  const colr: K = kind === 'err' ? 'acid' : kind === 'ok' ? 'signal' : text.startsWith('$') ? 'bone' : 'ash';
  if (kind) mark(s, kind, x + size * 0.4, y - size * 0.33, size * 0.75, a * prog(k, 0, 0.2));
  note(s.c, body.slice(0, Math.ceil(k * body.length)), x + (kind ? size * 1.2 : 0), y, a, size, colr);
}
/** Lyric line set as Swiss rows (big content words, small function words), centred at (x, y). */
function lyric(s: S, l: Line, x: number, y: number, width: number, max: number, o: { alpha?: number; maxChars?: number; gap?: number; align?: 'l' | 'r' | 'c' } = {}) {
  const R = rows(l.words, o.maxChars ?? 18);
  const gap = o.gap ?? max * 1.08;
  R.forEach((r, i) => row(s, r, A(100, 900), width, max, x, y + (i - (R.length - 1) / 2) * gap, { alpha: o.alpha, align: o.align, anno: false }));
}
/** Visible while this line is current: fades in at its start, out as the next line begins. */
function lineAlpha(L: Line[], i: number, t: number) {
  const l = L[i]!, n = L[i + 1];
  return prog(t, l.start - 0.25, l.start - 0.02) * (n ? 1 - prog(t, n.start - 0.2, n.start - 0.05) : 1);
}
/** "WORKS ON MY MACHINE"-style certification stamp built from sung words. */
function stamp(s: S, ws: Word[], x: number, y: number, r: number, o: { width?: number; alpha?: number; colr?: 'signal' | 'acid'; label?: string; from?: number; kind?: 'ok' | 'err' } = {}) {
  const { t } = s;
  const w0 = ws[0]!;
  if (t < w0.start - 0.07) return;
  const a = o.alpha ?? 1, colr = o.colr ?? 'signal';
  const fam = A(100, 900);
  const fr = fitRow(ws.map(txt), fam, o.width ?? 1100, 200);
  const h = fr.size * CAP, pad = Math.max(28, fr.size * 0.42), ms = h * 1.05;
  const bw = fr.width + ms + pad * 3, bh = h + pad * 2 + (o.label ? 44 : 0);
  grp(s, x, y, r, slam(w0, t, o.from ?? 1.7), () => {
    const c = s.c;
    c.strokeStyle = col(colr, 0.95 * a); c.lineWidth = 9; c.strokeRect(-bw / 2, -bh / 2, bw, bh);
    c.lineWidth = 2.5; c.strokeRect(-bw / 2 + 15, -bh / 2 + 15, bw - 30, bh - 30);
    if (colr === 'signal') { s.g.strokeStyle = col('ember', 0.3 * a * (0.4 + heat(w0, t))); s.g.lineWidth = 18; s.g.strokeRect(-bw / 2, -bh / 2, bw, bh); }
    const cy = o.label ? -20 : 0;
    mark(s, o.kind ?? 'ok', -bw / 2 + pad * 1.5 + ms / 2, cy, ms, a, 0.5);
    const ox = -bw / 2 + pad * 2 + ms + fr.width / 2;
    ws.forEach((w, i) => word(s, w, txt(w), fam, fr.size, ox + fr.xs[i]!, cy, { alpha: a, hot: colr === 'acid' ? 'acid' : 'signal' }));
    if (o.label) note(c, o.label, 0, bh / 2 - 34, 0.85 * a, 22, 'ash', 'center');
  });
}

// ------------------------------------------------------------------ BOOT (intro): `npm start` → the hook stamps itself
function boot(s: S) {
  const { t, sh } = s;
  const L = sh.lines;
  const i = cur(L, t);
  cam(s, { x: W / 2, y: H / 2, z: snapVal(t, [sh.start, ...L.map((l) => l.start - 0.05)], [1.1, 1.0, 0.96, 0.92, 0.88]), r: 0 });
  // the terminal that started it all
  const ta = i < 0 ? 1 : 0.55;
  panel(s, 150, 690, 760, 250, 'zsh — ~/app', ta);
  logLine(s, '$ npm start', 186, 780, 26, ta, prog(t, 0.1, 0.6));
  logLine(s, '> app@1.0.0 start', 186, 822, 22, ta * 0.8, prog(t, 0.7, 0.9));
  logLine(s, '✓ ready on http://localhost:3000', 186, 864, 22, ta, prog(t, L[0]!.start - 0.4, L[0]!.start));
  if (Math.floor(t * 2.5) % 2) { s.c.fillStyle = col('signal', 0.8 * ta); s.c.fillRect(186, 890, 13, 24); }
  const P = [
    { x: W / 2, y: 410, r: -0.05, w: 1180 }, { x: 1380, y: 800, r: 0.06, w: 640 },
    { x: 560, y: 180, r: 0.05, w: 760 }, { x: 1400, y: 190, r: -0.07, w: 640 },
  ];
  L.forEach((l, j) => {
    const p = P[j % P.length]!;
    const older = j < i ? 0.38 : 1;
    stamp(s, l.words, p.x, p.y, p.r, { width: p.w, alpha: older, label: j === 0 ? 'CERTIFIED · BUILD PASSING · n=1' : undefined });
  });
  const hit = L.reduce((a, l) => a + pulse(t, l.start, 0.09), 0);
  s.post.flash = 0.06 * hit;
  s.post.shake = [noise1(t * 50, 1) * 8 * hit, noise1(t * 50, 2) * 8 * hit];
}

// ------------------------------------------------------------------ DOCTOR (verses): the agent diagnoses each line as it is sung
function doctor(s: S) {
  const { t, sh } = s;
  const L = sh.lines, logs = sh.o.logs as string[][];
  const i = Math.max(0, cur(L, t));
  cam(s, { x: W / 2 + snapVal(t, L.map((l) => l.start - 0.05), L.map((_, j) => (j % 2 ? -14 : 14))), y: H / 2, z: snapVal(t, [sh.start, ...L.map((l) => l.start - 0.05)], [1.04, 1, 1.01, 1.02, 1.03]), r: 0 });
  panel(s, 100, 120, 790, 840, `agent doctor — ${sh.o.host ?? 'your-laptop'}`, prog(s.lt, 0, 0.3, ease.outExpo), 'graphite');
  let y = 205;
  L.forEach((l, j) => {
    if (t < l.start - 0.15) return;
    (logs[j] ?? []).forEach((ln, k) => {
      const t0 = l.start - 0.1 + k * 0.42;
      logLine(s, ln, 136, y, 22, j === i ? 1 : 0.5, prog(t, t0, t0 + Math.max(0.18, ln.length * 0.012)));
      y += 38;
    });
    y += 22;
  });
  if (Math.floor(t * 2.5) % 2) { s.c.fillStyle = col('signal', 0.8); s.c.fillRect(136, y - 26, 13, 24); }
  L.forEach((l, j) => { const a = lineAlpha(L, j, t); if (a > 0.01) lyric(s, l, 1400, 540 - 30 * (1 - a), 860, 132, { alpha: a, maxChars: 14 }); });
  s.post.shake = [noise1(t * 40, 7) * 4 * pulse(t, L[i]!.start, 0.08), 0];
}

// ------------------------------------------------------------------ DOTFILE (pre 1): the shell keeps a secret
const ZSHRC = [
  '# ~/.zshrc', 'export ZSH="$HOME/.oh-my-zsh"', 'plugins=(git node nvm pyenv)', 'source $ZSH/oh-my-zsh.sh', 'export NVM_DIR="$HOME/.nvm"',
  '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"', 'eval "$(pyenv init -)"', 'alias python=python3',
  'alias node="~/old/node/bin/node"   # temp fix', 'export PATH="$HOME/old/bin:$PATH"  # TODO remove',
  'export NODE_OPTIONS=--openssl-legacy-provider', 'source ~/.secrets.local', 'export CC=gcc-9', 'ulimit -n 256', '# do not touch',
  'export LD_LIBRARY_PATH=/opt/lib:$LD_LIBRARY_PATH', 'setopt no_nomatch', 'unset HISTFILE',
];
function dotfile(s: S) {
  const { t, sh, c } = s;
  const L = sh.lines;
  const secret = wordIs(L[0]!.words, /secret/i) ?? L[0]!.words.at(-1)!;
  const whisp = wordIs(L[1]!.words, /whisper/i) ?? L[1]!.words.at(-1)!;
  cam(s, { x: W / 2, y: H / 2, z: snapVal(t, [sh.start, secret.start - 0.05, whisp.start - 0.05], [1, 1.04, 1.08]), r: 0 });
  panel(s, 100, 110, 860, 860, '~/.zshrc — last modified 2019', 1);
  const scroll = snapVal(t, [sh.start, L[0]!.start, secret.start - 0.1], [0, 40, 120], 0.6);
  c.save(); c.beginPath(); c.rect(100, 160, 860, 800); c.clip();
  ZSHRC.forEach((ln, j) => {
    const y = 230 + j * 44 - scroll + 120;
    const hot = j === 8 || j === 9;
    const k = hot ? prog(t, secret.start - 0.06, secret.start + 0.25, ease.outExpo) : 0;
    if (k > 0) { c.fillStyle = col('signal', 0.16 * k); c.fillRect(110, y - 30, 840, 42); s.g.fillStyle = col('signal', 0.12 * k); s.g.fillRect(110, y - 30, 840, 42); }
    note(c, String(j + 1).padStart(2, ' '), 124, y, 0.5, 19, 'graphite');
    note(c, ln, 168, y, hot ? 0.6 + 0.4 * k : 0.55, 21, hot && k > 0 ? 'signal' : ln.startsWith('#') ? 'graphite' : 'ash');
  });
  c.restore();
  const wk = prog(t, whisp.start - 0.05, whisp.start + 0.4, ease.outExpo);
  logLine(s, '✗ shadows /usr/bin/node and /usr/local/bin/node', 140, 1010, 22, wk, wk);
  L.forEach((l, j) => lyric(s, l, 1440, j ? 760 : 310, 780, 96, { maxChars: 17, alpha: prog(t, l.start - 0.25, l.start) }));
}

// ------------------------------------------------------------------ TWOBOX (chorus 1–2): my machine vs yours
function monitor(s: S, x: number, y: number, label: string, ok: boolean, a: number, glitch: number) {
  if (a <= 0) return;
  const { c, t } = s;
  const w = 620, h = 380;
  c.fillStyle = col('graphite', 0.8 * a); c.fillRect(x - 18, y + h / 2, 36, 70); c.fillRect(x - 110, y + h / 2 + 66, 220, 14);
  c.fillStyle = col('ink2', a); c.fillRect(x - w / 2, y - h / 2, w, h);
  c.strokeStyle = col(ok ? 'signal' : 'acid', 0.9 * a); c.lineWidth = 5; c.strokeRect(x - w / 2, y - h / 2, w, h);
  if (ok) { s.g.strokeStyle = col('ember', 0.25 * a); s.g.lineWidth = 14; s.g.strokeRect(x - w / 2, y - h / 2, w, h); }
  note(c, label, x, y - h / 2 - 26, a, 26, ok ? 'signal' : 'acid', 'center');
  const lines = ok ? ['$ npm start', '✓ ready on :3000', '✓ 0 errors'] : ['$ npm start', '✗ exit 1', '✗ Segmentation fault'];
  lines.forEach((ln, i) => {
    const dx = glitch * (hash(i, Math.floor(t * 24)) - 0.5) * 60;
    logLine(s, ln, x - w / 2 + 50 + dx, y - h / 2 + 90 + i * 70, 34, a);
  });
  mark(s, ok ? 'ok' : 'err', x + w / 2 - 90, y + h / 2 - 80, 90, a, 0.5);
  if (glitch > 0) for (let i = 0; i < 7; i++) {
    const yy = y - h / 2 + hash(i, Math.floor(t * 18)) * h;
    c.fillStyle = col('acid', 0.18 * glitch * a); c.fillRect(x - w / 2 + (hash(i, 3, Math.floor(t * 18)) - 0.5) * 50, yy, w, 6 + hash(i, 5) * 16);
  }
}
function twobox(s: S) {
  const { t, sh } = s;
  const L = sh.lines;
  const l1 = L[1] ?? L[0]!;
  const wont = wordIs(l1.words, /won't|wont/i) ?? l1.words[0]!;
  const wide = prog(t, l1.start - 0.1, l1.start + 0.4, ease.outExpo);
  cam(s, { x: lerp(560, W / 2, wide), y: 470, z: lerp(1.3, 0.98, wide), r: lerp(-0.02, 0, wide) });
  monitor(s, 520, 430, 'MY MACHINE', true, 1, 0);
  monitor(s, 1400, 430, 'YOUR MACHINE', false, prog(t, l1.start - 0.15, l1.start + 0.1), prog(t, wont.start - 0.05, wont.start + 0.1) * (0.4 + 0.6 * pulse(t, wont.start, 0.3)));
  cam(s, SCREEN);
  band(s, 900, 240, 0.7);
  L.forEach((l, j) => { const a = lineAlpha(L, j, t); if (a > 0.01) lyric(s, l, W / 2, 900, 1560, 120, { alpha: a, maxChars: 40 }); });
  const hit = pulse(t, wont.start, 0.1);
  s.post.shake = [noise1(t * 50, 3) * 12 * hit, noise1(t * 50, 4) * 12 * hit];
}

// ------------------------------------------------------------------ SCAN (chorus 3–4): the agent reads the box
const PARTS = [['PATH', 'node 18 first', 1], ['python3', '3 installs', 1], ['.zshrc', '2019 alias', 1], [':3000', 'zombie pid', 1],
  ['~/.cache', '2.3G stale', 1], ['glibc', '2.31 < 2.34', 1], ['token', 'expired', 1], ['disk', 'ok', 0]] as const;
function scan(s: S) {
  const { t, sh, c, g } = s;
  const L = sh.lines;
  const t0 = L[0]!.start, t1 = last(L).end + 0.2;
  cam(s, { x: W / 2, y: H / 2, z: snapVal(t, [sh.start, (L[1] ?? L[0]!).start - 0.05], [1.0, 1.06]), r: 0 });
  const bx = 420, by = 300, bw = 1080, bh = 480;
  c.strokeStyle = col('graphite', 0.9); c.lineWidth = 3; c.strokeRect(bx, by, bw, bh);
  note(c, 'YOUR BOX', bx, by - 18, 0.8, 20, 'ash');
  const sx = bx + bw * prog(t, t0, t1, ease.inOutCubic);
  PARTS.forEach(([name, val, bad], j) => {
    const x = bx + 40 + (j % 4) * 258, y = by + 40 + Math.floor(j / 4) * 220, w = 222, h = 180;
    const seen = prog(sx, x, x + 80);
    c.fillStyle = col('ink2', 1); c.fillRect(x, y, w, h);
    c.strokeStyle = seen > 0 ? col(bad ? 'acid' : 'signal', 0.4 + 0.6 * seen) : col('graphite', 0.7); c.lineWidth = seen > 0 ? 3 : 1.5; c.strokeRect(x, y, w, h);
    note(c, name, x + 20, y + 52, 0.95, 30, 'bone');
    note(c, val, x + 20, y + 96, 0.45 + 0.55 * seen, 21, seen > 0 && bad ? 'acid' : 'ash');
    if (seen > 0) mark(s, bad ? 'err' : 'ok', x + w - 40, y + h - 40, 34, seen, 0.4);
  });
  if (t >= t0 - 0.1 && t <= t1 + 0.3) {
    const a = 1 - prog(t, t1, t1 + 0.3);
    c.fillStyle = col('signal', 0.9 * a); c.fillRect(sx - 2, by - 30, 4, bh + 60);
    const gr = g.createLinearGradient(sx - 160, 0, sx, 0); gr.addColorStop(0, col('signal', 0)); gr.addColorStop(1, col('signal', 0.25 * a));
    g.fillStyle = gr; g.fillRect(sx - 160, by, 160, bh);
    c.fillStyle = col('signal', a); c.fillRect(sx - 62, by - 64, 124, 36);
    note(c, 'AGENT', sx, by - 38, a, 22, 'ink', 'center');
  }
  cam(s, SCREEN);
  band(s, 150, 200, 0.75); band(s, 930, 200, 0.75);
  L.forEach((l, j) => lyric(s, l, W / 2, j ? 935 : 148, 1600, 108, { maxChars: 50, alpha: prog(t, l.start - 0.25, l.start) }));
}

// ------------------------------------------------------------------ REPO (chorus 5 / bridge 3): point it at the repo
function repo(s: S) {
  const { t, sh, c } = s;
  const l = sh.lines[0]!;
  const url = 'https://' + BRAND.repo;
  const urlK = prog(t, l.start - 0.3, l.start + 0.7);
  cam(s, { x: W / 2, y: 520, z: snapVal(t, [sh.start, l.start + 0.6], [1.12, 1.0]), r: 0 });
  panel(s, 160, 150, 1600, 400, '', 1);
  c.fillStyle = col('ink', 1); c.fillRect(200, 200, 1520, 70); c.strokeStyle = col('graphite', 1); c.lineWidth = 2; c.strokeRect(200, 200, 1520, 70);
  note(c, url.slice(0, Math.ceil(urlK * url.length)), 236, 247, 1, 30, 'bone');
  if (urlK < 1 || Math.floor(t * 2.5) % 2) { const w = c.measureText(url.slice(0, Math.ceil(urlK * url.length))).width; c.fillStyle = col('signal', 0.9); c.fillRect(240 + w, 220, 3, 32); }
  const owner = BRAND.repo.split('/').slice(1).join(' / ');
  note(c, owner, 210, 340, prog(t, l.start + 0.2, l.start + 0.6), 40, 'bone');
  const TABS = [['Code', /repo|code/i, 'repo'], ['Issues', /issues?/i, 'issues'], ['Pull requests', /^PRs?$|^PR's$/i, 'prs']] as const;
  const want: string[] = sh.o.tabs ?? ['repo'];
  let x = 210;
  TABS.forEach(([lb, re, key]) => {
    const w = (wordIs(l.words, re) && want.includes(key)) ? wordIs(l.words, re)! : null;
    const k = w ? prog(t, w.start - 0.06, w.start + 0.2, ease.outExpo) : 0;
    c.font = `500 30px ${MONO}`;
    note(c, lb, x, 450, 0.55 + 0.45 * k, 30, k > 0 ? 'signal' : 'ash');
    const tw = lb.length * 18;
    if (k > 0) { rule(c, x, 476, x + tw, 476, k, col('signal', 1), 5); rule(s.g, x, 476, x + tw, 476, k, col('ember', 0.5), 10); }
    x += tw + 90;
  });
  if (sh.o.agent) {
    const pt = wordIs(l.words, /point/i) ?? l.words[0]!;
    const k = prog(t, pt.start - 0.05, pt.start + 0.5, ease.outExpo);
    c.fillStyle = col('signal', k); c.fillRect(220, 610, 200, 60); note(c, 'AGENT', 320, 650, k, 28, 'ink', 'center');
    rule(c, 320, 610, 320, 290, prog(t, pt.start + 0.1, pt.start + 0.6, ease.outExpo), col('signal', 0.9), 4);
  }
  cam(s, SCREEN);
  band(s, 800, 260, 0.6);
  lyric(s, l, W / 2, 800, 1560, 150, { maxChars: 30 });
}

// ------------------------------------------------------------------ BADGE (the hook): stamps pile up, more each chorus
function badge(s: S) {
  const { t, sh } = s;
  const L = sh.lines, n = sh.o.n ?? 1;
  const i = Math.max(0, cur(L, t));
  cam(s, { x: W / 2, y: H / 2, z: snapVal(t, [sh.start, ...L.map((l) => l.start - 0.05)], [1.05, 1, 0.94, 0.88, 0.84]), r: 0 });
  const ws0 = L[0]!.words;
  const crowd = 6 + 6 * n;
  for (let j = 0; j < crowd; j++) {
    const tj = sh.start + (j / crowd) * Math.max(0.5, sh.end - sh.start - 0.4);
    if (t < tj) continue;
    const x = 140 + hash(j, 1, n) * (W - 280), y = 110 + hash(j, 2, n) * (H - 220);
    stamp(s, ws0.map((w) => ({ ...w, start: tj, end: tj + 0.2 })), x, y, (hash(j, 3) - 0.5) * 0.5, { width: 380, alpha: 0.22 });
  }
  L.forEach((l, j) => {
    const nx = L[j + 1];
    const a = nx ? 1 - prog(t, nx.start - 0.1, nx.start + 0.05) : 1;
    if (a <= 0.01) return;
    const ang = (j % 2 ? 1 : -1) * (0.04 + 0.02 * n);
    stamp(s, l.words, W / 2, H / 2, ang, { width: 1240 + 60 * n, alpha: a, label: j === i ? `WORKS ON MY MACHINE · CERTIFIED · ${n === 3 ? 'FINAL' : 'n=' + n}` : undefined });
  });
  const hit = L.reduce((a, l) => a + pulse(t, l.start, 0.1), 0);
  s.post.flash = 0.07 * hit;
  s.post.shake = [noise1(t * 50, 5) * 10 * hit, noise1(t * 50, 6) * 10 * hit];
}

// ------------------------------------------------------------------ NEWISSUE (pre 2): titled "broke"… then scroll up
const OLD = [['#4412', 'broke', 0], ['#4389', 'app broke after update', 0], ['#4301', 'broke on my machine', 0], ['#4127', 'it doesn’t work', 0], ['#3990', 'broke', 0], ['#3712', 'won’t start — node version / PATH', 1]] as const;
function newissue(s: S) {
  const { t, sh, c } = s;
  const L = sh.lines;
  const l1 = L[1] ?? L[0]!;
  const broke = wordIs(L[0]!.words, /broke/i) ?? last(L[0]!.words);
  const hit = wordIs(L[0]!.words, /hit/i) ?? L[0]!.words[0]!;
  const spoke = wordIs(l1.words, /spoke/i) ?? last(l1.words);
  const up = prog(t, l1.start - 0.1, l1.start + 0.9, ease.inOutCubic);
  cam(s, { x: W / 2, y: H / 2, z: 1, r: 0 });
  // the form (slides down as you scroll up)
  const fy = 330 + up * 760;
  panel(s, 360, fy, 1200, 520, 'New issue', 1);
  note(c, 'Title', 400, fy + 100, 0.8, 22, 'ash');
  c.fillStyle = col('ink', 1); c.fillRect(400, fy + 120, 1120, 70); c.strokeStyle = col('graphite', 1); c.lineWidth = 2; c.strokeRect(400, fy + 120, 1120, 70);
  note(c, typed('broke', t, broke.start - 0.05, Math.max(0.2, broke.end - broke.start)), 424, fy + 168, 1, 34, 'bone');
  c.fillStyle = col('ink', 1); c.fillRect(400, fy + 220, 1120, 170); c.strokeRect(400, fy + 220, 1120, 170);
  note(c, 'it doesn’t work', 424, fy + 266, 0.35, 24, 'ash');
  const press = pulse(t, hit.start, 0.15);
  c.fillStyle = col('signal', 0.75 + 0.25 * press); c.fillRect(1250 - press * 6, fy + 420, 270 + press * 12, 64);
  note(c, 'Submit new issue', 1385, fy + 461, 1, 22, 'ink', 'center');
  // the issues that were already there
  if (up > 0) {
    const ly = -560 + up * 760;
    OLD.forEach(([num, title, ans], j) => {
      const y = ly + j * 92;
      const k = ans ? prog(t, spoke.start - 0.05, spoke.start + 0.3, ease.outExpo) : 0;
      c.fillStyle = col('ink2', 1); c.fillRect(360, y, 1200, 76);
      c.strokeStyle = k > 0 ? col('signal', 0.5 + 0.5 * k) : col('graphite', 0.8); c.lineWidth = k > 0 ? 4 : 1.5; c.strokeRect(360, y, 1200, 76);
      note(c, num, 392, y + 48, 0.7, 24, 'graphite');
      note(c, title, 510, y + 48, 0.95, 28, k > 0 ? 'signal' : 'bone');
      if (ans) { note(c, 'answered', 1520, y + 48, 0.4 + 0.6 * k, 22, k > 0 ? 'signal' : 'ash', 'right'); mark(s, 'ok', 1390, y + 38, 30, k, 0.6); }
    });
  }
  cam(s, SCREEN);
  band(s, 170, 230, 0.8);
  L.forEach((l, j) => { const a = lineAlpha(L, j, t); if (a > 0.01) lyric(s, l, W / 2, 170, 1620, 100, { alpha: a, maxChars: 34, gap: 104 }); });
}

// ------------------------------------------------------------------ QUERY (bridge 1–2): search the issues / read the PRs
const RESULTS: Record<string, [string, string][]> = {
  issues: [['open', 'App won’t start after update'], ['closed', 'Won’t start: node version mismatch'], ['closed', 'Fails on ARM: GLIBC_2.34 not found'], ['closed', 'EADDRINUSE :3000 on launch']],
  prs: [['merged', 'fix: check node engine before start'], ['merged', 'fix: free port 3000 on exit'], ['open', 'build: ship arm64 glibc 2.31 binary']],
};
function query(s: S) {
  const { t, sh, c } = s;
  const l = sh.lines[0]!;
  const q: string = sh.o.q ?? '';
  cam(s, { x: W / 2, y: H / 2, z: snapVal(t, [sh.start, l.end], [1.06, 1.0]), r: 0 });
  panel(s, 260, 110, 1400, 560, sh.o.kind === 'prs' ? 'Pull requests' : 'Issues', 1);
  c.fillStyle = col('ink', 1); c.fillRect(300, 180, 1320, 70); c.strokeStyle = col('signal', 0.8); c.lineWidth = 2; c.strokeRect(300, 180, 1320, 70);
  c.strokeStyle = col('ash', 0.9); c.lineWidth = 4; c.beginPath(); c.arc(342, 212, 14, 0, TAU); c.moveTo(352, 222); c.lineTo(364, 234); c.stroke();
  note(c, typed(q, t, l.start - 0.25, Math.max(0.4, 0.55 * (l.end - l.start))), 384, 228, 1, 28, 'bone');
  const r0 = l.start + 0.6 * (l.end - l.start);
  const rk = prog(t, r0 - 0.1, r0 + 0.2);
  note(c, sh.o.hits ?? '', 300, 300, rk * 0.8, 22, 'ash');
  (RESULTS[sh.o.kind] ?? []).forEach(([st, title], j) => {
    const k = prog(t, r0 + j * 0.1, r0 + 0.2 + j * 0.1, ease.outExpo);
    if (k <= 0) return;
    const y = 340 + j * 76;
    c.fillStyle = col(st === 'open' ? 'signal' : st === 'merged' ? 'ember' : 'graphite', 0.9 * k); c.beginPath(); c.arc(320, y + 26, 9, 0, TAU); c.fill();
    note(c, title, 350 + (1 - k) * 40, y + 34, k, 28, 'bone');
    note(c, st, 1600, y + 34, 0.6 * k, 20, 'ash', 'right');
  });
  cam(s, SCREEN);
  lyric(s, l, W / 2, 850, 1500, 230, { maxChars: 30 });
}

// ------------------------------------------------------------------ PIN (bridge 4): it already knows where you are
function pin(s: S) {
  const { t, sh, c, g } = s;
  const l = sh.lines[0]!;
  const k = prog(t, l.start - 0.1, l.end, ease.outCubic);
  cam(s, { x: W / 2, y: H / 2, z: lerp(1, 1.1, k), r: 0 });
  const field = BRAND.field ?? [];
  for (let j = 0; j < 90; j++) note(c, field[j % field.length]!, 120 + (j % 10) * 190, 110 + Math.floor(j / 10) * 76 + (j % 2) * 20, 0.16, 20, 'graphite');
  const px = W / 2, py = 380;
  for (let r = 0; r < 4; r++) {
    const rr = lerp(700 - r * 120, 60 + r * 40, k);
    c.strokeStyle = col('signal', 0.25 + 0.2 * r); c.lineWidth = 2 + r; c.beginPath(); c.arc(px, py, rr, 0, TAU); c.stroke();
  }
  rule(c, px - 900, py, px + 900, py, 1, col('graphite', 0.6), 1); rule(c, px, py - 500, px, py + 500, 1, col('graphite', 0.6), 1);
  const dk = prog(t, last(l.words).start - 0.05, last(l.words).start + 0.3, ease.outBack);
  c.fillStyle = col('signal', dk); c.beginPath(); c.arc(px, py, 18 * dk, 0, TAU); c.fill();
  g.fillStyle = col('ember', 0.6 * dk); g.beginPath(); g.arc(px, py, 40 * dk, 0, TAU); g.fill();
  note(c, 'you are here: ~/app · arm64 · node 18 · zsh · glibc 2.31', px + 40, py - 40, dk, 24, 'signal');
  cam(s, SCREEN);
  band(s, 840, 260, 0.75);
  lyric(s, l, W / 2, 840, 1560, 150, { maxChars: 30 });
}

// ------------------------------------------------------------------ DUPES (bridge 5–6): same ticket, again… scroll up, it was answered
function dupes(s: S) {
  const { t, sh, c } = s;
  const L = sh.lines;
  const l0 = L[0]!, l1 = L[1] ?? L[0]!;
  const N = 7, cy = (j: number) => 160 + j * 150;
  const marks = l0.words.filter((w) => /same|ticket|opened|again/i.test(w.w));
  const upW = wordIs(l1.words, /up/i) ?? l1.words[0]!;
  const ansW = wordIs(l1.words, /answered/i) ?? last(l1.words);
  const camY = snapVal(t, [sh.start, upW.start - 0.05], [cy(N - 1) - 120, cy(0) + 150], 0.9, ease.inOutCubic);
  cam(s, { x: W / 2, y: camY, z: 1, r: 0 });
  for (let j = N - 1; j >= 0; j--) {
    const y = cy(j), orig = j === 0;
    const mi = N - 1 - j; // bottom card first
    const at = orig ? sh.start - 1 : (marks[mi - 1]?.start ?? l0.start + mi * 0.25);
    const k = orig ? 1 : prog(t, at - 0.06, at + 0.15, ease.outExpo);
    if (k <= 0) continue;
    const ak = orig ? prog(t, ansW.start - 0.05, ansW.start + 0.3, ease.outExpo) : 0;
    c.fillStyle = col('ink2', 1); c.fillRect(360, y - 60 + (1 - k) * 60, 1200, 120);
    c.strokeStyle = ak > 0 ? col('signal', 0.5 + 0.5 * ak) : col('graphite', 0.8); c.lineWidth = ak > 0 ? 4 : 1.5; c.strokeRect(360, y - 60 + (1 - k) * 60, 1200, 120);
    note(c, orig ? '#1024' : `#${4400 + Math.floor(hash(j, 9) * 90)}`, 396, y + 12, 0.7, 26, 'graphite');
    note(c, 'App won’t start on my machine', 530, y + 12, 0.95, 32, ak > 0 ? 'signal' : 'bone');
    if (orig) { mark(s, 'ok', 1430, y, 40, ak, 0.6); note(c, 'answered', 1520, y + 10, ak, 22, 'signal', 'right'); }
    else {
      grp(s, 1340, y, -0.12, lerp(1.6, 1, k), () => {
        c.strokeStyle = col('acid', 0.9 * k); c.lineWidth = 4; c.strokeRect(-130, -32, 260, 64);
        note(c, 'DUPLICATE', 0, 11, k, 30, 'acid', 'center');
      });
    }
  }
  cam(s, SCREEN);
  band(s, 960, 200, 0.85);
  L.forEach((l, j) => { const a = lineAlpha(L, j, t); if (a > 0.01) lyric(s, l, W / 2, 960, 1620, 96, { alpha: a, maxChars: 60 }); });
  const hit = marks.reduce((a, w) => a + pulse(t, w.start, 0.08), 0);
  s.post.shake = [noise1(t * 50, 8) * 6 * hit, noise1(t * 50, 9) * 6 * hit];
}

// ------------------------------------------------------------------ ENDCARD (outro): search before you post
function endcard(s: S) {
  const { t, sh, c } = s;
  const L = sh.lines;
  const l0 = L[0]!, l1 = L[1];
  const card = l1 ? l1.start - 0.15 : l0.end + 0.5;
  const ck = prog(t, card, card + 0.6, ease.outExpo);
  cam(s, { x: W / 2, y: H / 2, z: lerp(1, 1.04, prog(t, sh.start, sh.end)), r: 0 });
  if (ck < 1) lyric(s, l0, W / 2, 540, 1500, 260, { maxChars: 13, alpha: 1 - ck, gap: 250 });
  if (ck > 0) {
    L.slice(1).forEach((l, j) => stamp(s, l.words, W / 2, 230, j ? 0.04 : -0.04, { width: 900, alpha: j === L.length - 2 || t < (L[j + 2]?.start ?? 1e9) - 0.1 ? 1 : 0 }));
    note(c, 'POINT YOUR AGENT AT', W / 2, 470, ck, 34, 'ash', 'center');
    const fam = A(100, 900), sz = Math.min(110, (1500 / Math.max(1, BRAND.repo.length)) * 1.6);
    word(s, null, BRAND.repo, fam, sz, W / 2, 570, { color: col('signal', ck), sc: lerp(1.1, 1, ck) });
    s.g.globalAlpha = 1;
    note(c, '/issues   ·   /pulls   ·   the code', W / 2, 680, ck * 0.9, 30, 'bone', 'center');
    rule(c, W / 2 - 600, 740, W / 2 + 600, 740, ck, col('signal', 0.7), 3);
    note(c, 'SEARCH BEFORE YOU POST.  SCROLL UP A LITTLE.', W / 2, 810, ck, 28, 'bone', 'center');
    note(c, 'your agent knows your machine better than you do.', W / 2, 860, ck * 0.7, 24, 'ash', 'center');
  }
  s.post.fade = prog(t, sh.end - 1.4, sh.end - 0.05, ease.inOutCubic);
}

void clamp; void mix;
export const EXTRA: Record<string, (s: S) => void> = { boot, doctor, dotfile, twobox, scan, repo, badge, newissue, query, pin, dupes, endcard };
