// Works On My Machine — 2.5D compositions. Every set piece is a developer object standing in perspective space
// (certification slabs, a log corridor, a dotfile crawl, two monitors on a grid floor, a component array, a repo
// page, an issue form under a tower of old issues, a pile of DUPLICATE tickets), and the sung words are solid,
// extruded objects that fly in and land on their onsets. Pure functions of s.t; only signal/ember on s.g.
import type { Line, Word } from '../engine/lyrics';
import { measure } from '../engine/type';
import { clamp, ease, hash, lerp, noise1, prog, pulse, TAU } from '../engine/util';
import { A, CAP, col, heat, mix } from '../scenes/kit';
import { txt, type S } from '../scenes/shots';
import { BRAND } from './brand';
import {
  add, basis, box3, camAt, cam3, dust, FACE, FLOOR, floor, flyLine, label3, mul, proj, punch, rect3, seg, setRows, text3,
  type Basis, type Cam3, type V3,
} from './d25';

const typed = (str: string, t: number, t0: number, dur: number) => str.slice(0, Math.ceil(prog(t, t0, t0 + dur) * str.length));
const wordIs = (ws: Word[], re: RegExp) => ws.find((w) => re.test(w.w.replace(/[^\w']/g, '')));
const lastW = (l: Line) => l.words[l.words.length - 1]!;
/** 0..1 visible while this line is current (in at its start, out as the next begins). */
const lineVis = (L: Line[], i: number, t: number) => {
  const l = L[i]!, n = L[i + 1];
  return prog(t, l.start - 0.3, l.start - 0.05) * (n ? 1 - prog(t, n.start - 0.25, n.start - 0.02) : 1);
};
const exitK = (L: Line[], i: number, t: number) => { const n = L[i + 1]; return n ? prog(t, n.start - 0.3, n.start, ease.inCubic) : 0; };
const P3 = (O: V3, b: Basis, u: number, v: number, n = 0): V3 => add(add(add(O, mul(b.R, u)), mul(b.U, v)), mul(b.N, n));
const FIELD = BRAND.field ?? ['PATH'];
const hits = (s: S, ts: number[], amt = 10, hl = 0.1) => {
  const h = ts.reduce((a, x) => a + pulse(s.t, x, hl), 0);
  s.post.shake = [noise1(s.t * 50, 1) * amt * h, noise1(s.t * 50, 2) * amt * h];
  return h;
};

// ------------------------------------------------------------------ shared 3D props
function mark3(s: S, c: Cam3, kind: 'ok' | 'err', O: V3, b: Basis, sz: number, a: number, glow = 0) {
  if (a <= 0.01) return;
  const p = proj(c, O); if (!p) return;
  const pts: [number, number][][] = kind === 'ok' ? [[[-0.45, 0.02], [-0.12, 0.36], [0.48, -0.4]]] : [[[-0.38, -0.38], [0.38, 0.38]], [[0.38, -0.38], [-0.38, 0.38]]];
  s.c.lineCap = 'round'; s.g.lineCap = 'round';
  for (const pl of pts) for (let i = 0; i + 1 < pl.length; i++) {
    const A2 = P3(O, b, pl[i]![0] * sz, pl[i]![1] * sz), B2 = P3(O, b, pl[i + 1]![0] * sz, pl[i + 1]![1] * sz);
    seg(s.c, c, A2, B2, col(kind === 'ok' ? 'signal' : 'acid', a), Math.max(2, sz * 0.16 * p.k));
    if (glow && kind === 'ok') seg(s.g, c, A2, B2, col('ember', a * glow), sz * 0.3 * p.k);
  }
}
/** Log line on a plane; leading ✓/✗ becomes a drawn mark. */
function log3(s: S, c: Cam3, text: string, O: V3, b: Basis, size: number, a: number, k = 1) {
  if (a <= 0.01 || k <= 0) return;
  let kind: 'ok' | 'err' | null = null, body = text;
  if (text.startsWith('✓')) { kind = 'ok'; body = text.slice(1).trimStart(); } else if (text.startsWith('✗')) { kind = 'err'; body = text.slice(1).trimStart(); }
  const colr = kind === 'err' ? 'acid' : kind === 'ok' ? 'signal' : text.startsWith('$') ? 'bone' : 'ash';
  if (kind) mark3(s, c, kind, P3(O, b, size * 0.4, -size * 0.3), b, size * 0.8, a * prog(k, 0, 0.2));
  label3(s, c, body.slice(0, Math.ceil(k * body.length)), P3(O, b, kind ? size * 1.2 : 0, 0), b, size, col(colr, a), 'l');
}
function panel3(s: S, c: Cam3, O: V3, b: Basis, hw: number, hh: number, title: string, a = 1, edge = 'graphite') {
  if (a <= 0.01) return;
  rect3(s.c, c, O, b, hw, hh, col('ink2', 0.97 * a), col(edge, 0.9 * a), 2);
  rect3(s.c, c, P3(O, b, 0, -hh + 22), b, hw, 22, col('graphite', 0.4 * a));
  (['acid', 'ash', 'signal'] as const).forEach((k, i) => rect3(s.c, c, P3(O, b, -hw + 26 + i * 24, -hh + 22), b, 7, 7, col(k, 0.8 * a)));
  label3(s, c, title, P3(O, b, -hw + 110, -hh + 22), b, 19, col('ash', 0.9 * a), 'l');
}
const halfW = (p: { w: Word; fam: string; size: number }) => measure(txt(p.w), p.fam, p.size) / 2;
/** Size of a certification slab for these words. */
function stampDims(ws: Word[], width: number, label: boolean) {
  const P = setRows(ws, width, 200, 999);
  const size = Math.max(...P.map((p) => p.size));
  const ms = size * CAP * 1.1, pad = Math.max(26, size * 0.38);
  const left = P[0]!.u - halfW(P[0]!), right = P[P.length - 1]!.u + halfW(P[P.length - 1]!);
  const textW = right - left;
  return { P, size, ms, pad, left, textW, hw: (textW + ms + pad * 3) / 2, hh: (size * CAP + pad * 2 + (label ? 44 : 0)) / 2 };
}
/** Certification slab: the sung words, raised on the front of a solid block with a ✓. C = block centre. */
function stamp3(s: S, c: Cam3, ws: Word[], C: V3, b: Basis, width: number, o: { alpha?: number; colr?: 'signal' | 'acid'; label?: string; kind?: 'ok' | 'err' } = {}) {
  const a = o.alpha ?? 1;
  if (a <= 0.01) return;
  const { P, ms, pad, left, textW, hw, hh } = stampDims(ws, width, !!o.label);
  const colr = o.colr ?? 'signal';
  const lit = 0.4 + 0.6 * Math.max(0, ...ws.map((w) => heat(w, s.t)));
  const face = box3(s, c, C, b, hw, hh, 34, { front: col('ink2', a), side: mix('ink', 'blood', colr === 'signal' ? 0.5 : 0, a), top: mix('ink2', 'blood', colr === 'signal' ? 0.6 : 0, a), edge: col(colr, 0.95 * a), lw: 3, glowEdge: colr === 'signal' ? 0.25 * a * lit : 0 });
  rect3(s.c, c, add(face.O, mul(b.N, -1)), b, hw - 16, hh - 16, undefined, col(colr, 0.7 * a), 2);
  const cy = o.label ? -20 : 0;
  mark3(s, c, o.kind ?? 'ok', P3(face.O, b, -hw + pad * 1.4 + ms / 2, cy, -2), b, ms, a, 0.5);
  const ox = -hw + pad * 2 + ms - left;
  for (const p of P) text3(s, c, txt(p.w), p.fam, p.size, P3(face.O, b, ox + p.u, cy + p.v, -16), b, { w: p.w, depth: 14, steps: 3, alpha: a * (s.t >= p.w.start - 0.06 ? 1 : 0.35), hot: colr });
  if (o.label) label3(s, c, o.label, P3(face.O, b, 0, hh - 32, -2), b, 20, col('ash', 0.9 * a), 'c');
  void textW;
}
/** Pivot-topple: a block of half-height hh standing on `base` (bottom-centre), falling backward by k (0 upright → 1 flat). */
function standing(base: V3, yaw: number, hh: number, k: number): { C: V3; b: Basis } {
  const b = basis(yaw, (-Math.PI / 2) * k);
  return { C: add(base, mul(b.U, -hh)), b };
}

// ------------------------------------------------------------------ BOOT (intro): `npm start` → the hook drops in as solid slabs
function boot(s: S) {
  const { t, sh } = s;
  const L = sh.lines;
  const FY = 360;
  const T: { base: V3; yaw: number; w: number }[] = [{ base: [0, FY, 0], yaw: -0.08, w: 1250 }, { base: [700, FY, 1000], yaw: -0.3, w: 1100 }, { base: [-650, FY, 2000], yaw: 0.28, w: 1100 }, { base: [450, FY, 3000], yaw: -0.2, w: 1000 }];
  const keyFor = (i: number): Partial<Cam3> => { const p = T[i % T.length]!.base; return { x: p[0] * 0.85, y: -60 - i * 30, z: p[2] - 1150, yaw: -p[0] / 6000, pitch: 0.1 + i * 0.02 }; };
  const times = [sh.start, ...L.map((l) => l.start - 0.3)];
  const keys: Partial<Cam3>[] = [{ x: -500, y: -150, z: -1900, yaw: 0.25, pitch: 0.06 }, ...L.map((_, i) => keyFor(i))];
  const c = punch(s, camAt(t, times, keys, 0.8, ease.inOutCubic));
  floor(s, c, FY, 1, { scroll: t * 60, hot: L.reduce((a, l) => a + pulse(t, l.start, 0.15), 0) });
  dust(s, c, FIELD, 36, 1, 0.3);
  // the terminal where it started
  const TB = basis(0.55, 0);
  const tc = box3(s, c, [-1500, 100, 2600], TB, 380, 160, 26, { front: col('ink2'), edge: col('graphite', 0.9) });
  log3(s, c, '$ npm start', P3(tc.O, TB, -340, -80, -1), TB, 34, 1, prog(t, 0.1, 0.7));
  log3(s, c, '> app@1.0.0 start', P3(tc.O, TB, -340, -20, -1), TB, 26, 0.8, prog(t, 0.8, 1.0));
  log3(s, c, '✓ ready on localhost:3000', P3(tc.O, TB, -340, 50, -1), TB, 30, 1, prog(t, L[0]!.start - 0.4, L[0]!.start));
  // far to near
  [...L.keys()].reverse().forEach((j) => {
    const l = L[j]!, tp = T[j % T.length]!, w0 = l.words[0]!;
    if (t < w0.start - 0.35) return;
    const drop = prog(t, w0.start - 0.35, w0.start, ease.inCubic);
    const base: V3 = [tp.base[0], tp.base[1] - (1 - drop) * 1400, tp.base[2]];
    const { hh } = stampDims(l.words, tp.w, j === 0);
    const st = standing(base, tp.yaw + pulse(t, w0.start, 0.12) * 0.03, hh, 0);
    stamp3(s, c, l.words, st.C, st.b, tp.w, { label: j === 0 ? 'CERTIFIED · BUILD PASSING · n=1' : undefined });
  });
  const h = hits(s, L.map((l) => l.start), 12);
  s.post.flash = 0.07 * h;
}

// ------------------------------------------------------------------ DOCTOR (verses): a corridor of logs; each line's words drop in as blocks
function doctor(s: S) {
  const { t, sh } = s;
  const L = sh.lines, logs = sh.o.logs as string[][];
  const Z = 1500, FY = 420;
  const times = [sh.start, ...L.map((l) => l.start - 0.28)];
  const keys: Partial<Cam3>[] = [{ x: -40, y: -140, z: -1500, yaw: 0.14, pitch: 0.05 }, ...L.map((_, i) => ({ x: i % 2 ? 60 : -60, y: -130, z: i * Z - 1250, yaw: i % 2 ? -0.02 : 0.12, pitch: 0.05, roll: i % 2 ? 0.015 : -0.015 }))];
  const c = punch(s, camAt(t, times, keys, 0.7));
  floor(s, c, FY, 1, { scroll: 0 });
  dust(s, c, FIELD, 30, 3, 0.25);
  const WB = basis(-1.05, 0);
  for (let i = L.length - 1; i >= 0; i--) {
    const l = L[i]!;
    const O: V3 = [-820, -40, i * Z + 420];
    panel3(s, c, O, WB, 560, 300, `agent doctor — ${sh.o.host ?? 'your-laptop'}`, 1);
    if (t >= l.start - 0.2) (logs[i] ?? []).forEach((ln, k) => {
      const t0 = l.start - 0.12 + k * 0.4;
      log3(s, c, ln, P3(O, WB, -520, -200 + k * 64, -1), WB, 32, 1, prog(t, t0, t0 + Math.max(0.18, ln.length * 0.012)));
    });
    // the line itself: content words as solid blocks flying in and landing on the beat
    const LB = basis(0.2 - (i % 2) * 0.05, 0.02);
    const nx = L[i + 1], gone = nx ? 1 - prog(t, nx.start - 0.45, nx.start - 0.3) : 1;
    if (gone > 0.01) flyLine(s, c, l.words, [230, -20, i * Z + 120], LB, 920, 140, { alpha: gone, maxChars: 14, from: i % 2 ? [0, -900, 0] : [600, -200, 900], depth: 46, spin: 0.9, tumble: 0.6 });
  }
  hits(s, L.flatMap((l) => l.words.filter((w) => !/^(a|the|in|from|you|and|on|your|or|of|but|that)$/i.test(w.w)).map((w) => w.start)), 3, 0.06);
}

// ------------------------------------------------------------------ DOTFILE (pre 1): the .zshrc crawls into the floor; the secret lines rise out of it
const ZSHRC = [
  '# ~/.zshrc', 'export ZSH="$HOME/.oh-my-zsh"', 'plugins=(git node nvm pyenv)', 'source $ZSH/oh-my-zsh.sh', 'export NVM_DIR="$HOME/.nvm"',
  '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"', 'eval "$(pyenv init -)"', 'alias python=python3',
  'alias node="~/old/node/bin/node"   # temp fix', 'export PATH="$HOME/old/bin:$PATH"  # TODO remove',
  'export NODE_OPTIONS=--openssl-legacy-provider', 'source ~/.secrets.local', 'export CC=gcc-9', 'ulimit -n 256', '# do not touch',
  'export LD_LIBRARY_PATH=/opt/lib:$LD_LIBRARY_PATH', 'setopt no_nomatch', 'unset HISTFILE', '# ~/.zshrc (2019)',
];
function dotfile(s: S) {
  const { t, sh } = s;
  const L = sh.lines;
  const secret = wordIs(L[0]!.words, /secret/i) ?? lastW(L[0]!);
  const whisp = wordIs(L[1]?.words ?? [], /whisper/i) ?? lastW(L[L.length - 1]!);
  const times = [sh.start, L[0]!.start, secret.start - 0.2, whisp.start - 0.2];
  const keys: Partial<Cam3>[] = [{ y: -700, z: -1300, pitch: 0.5 }, { y: -560, z: -1150, pitch: 0.42, yaw: 0.06 }, { y: -420, z: -900, pitch: 0.3, yaw: -0.05 }, { y: -380, z: -820, pitch: 0.26, roll: 0.03 }];
  const c = punch(s, camAt(t, times, keys, 0.8, ease.inOutCubic));
  const FB = basis(0, -1.25);
  const scroll = (t - sh.start) * 24;
  const O: V3 = [-60, 380, 1900];
  const rise = prog(t, secret.start - 0.05, secret.start + 0.7, ease.outBack);
  rect3(s.c, c, P3(O, FB, 0, 300), FB, 860, 1500, col('ink2', 0.9), col('graphite', 0.8));
  label3(s, c, '~/.zshrc — last modified 2019', P3(O, FB, -820, -1160), FB, 40, col('ash', 0.9));
  ZSHRC.forEach((ln, j) => {
    const v = -1050 + j * 120 - scroll;
    if ((j === 8 || j === 9) && rise > 0) return;
    label3(s, c, String(j + 1).padStart(2, ' '), P3(O, FB, -820, v), FB, 40, col('graphite', 0.9));
    label3(s, c, ln, P3(O, FB, -720, v), FB, 46, col(ln.startsWith('#') ? 'graphite' : 'ash', 0.9));
  });
  // the secret: two lines lift off the file and stand up, extruded, glowing
  if (rise > 0) [8, 9].forEach((j, q) => {
    const flat = P3(O, FB, -720, -1050 + j * 120 - scroll);
    const up: V3 = [-820, 110 + q * 90 + 20 * Math.sin(t * 2 + q), 520];
    const P: V3 = [lerp(flat[0], up[0], rise), lerp(flat[1], up[1], rise), lerp(flat[2], up[2], rise)];
    const b = basis(0.12 * (1 - rise), lerp(-1.25, 0.05, clamp(rise)));
    text3(s, c, ZSHRC[j]!, 'Plex-600', 52, P, b, { align: 'l', depth: 14, steps: 4, color: col('signal'), glow: 0.6, w: secret });
  });
  const wk = prog(t, whisp.start - 0.05, whisp.start + 0.4, ease.outExpo);
  if (wk > 0) log3(s, c, '✗ shadows /usr/bin/node and /usr/local/bin/node', [-820, 330, 520], FACE, 34, wk, wk);
  L.forEach((l, i) => {
    const a = lineVis(L, i, t), ex = exitK(L, i, t);
    if (a <= 0.01) return;
    flyLine(s, c, l.words, add([360, -230, 300], [0, -ex * 500, -ex * 900]), basis(-0.1, 0.12), 900, 110, { maxChars: 18, alpha: a, from: [0, 0, 1600], depth: 40, spin: 0.5 });
  });
}

// ------------------------------------------------------------------ TWOBOX (chorus 1–2): two machines on a grid floor
function monitor3(s: S, c: Cam3, C: V3, b: Basis, label: string, ok: boolean, a: number, glitch: number) {
  if (a <= 0.01) return;
  const { t } = s;
  box3(s, c, add(C, mul(b.U, 290)), b, 30, 70, 30, { front: col('graphite'), side: col('ink2') });
  box3(s, c, add(C, mul(b.U, 370)), b, 160, 10, 90, { front: col('graphite'), side: col('ink2'), top: col('graphite') });
  const f = box3(s, c, C, b, 360, 230, 36, { front: col('ink2', a), side: col('ink', a), top: mix('ink2', ok ? 'blood' : 'ink2', 0.6, a), edge: col(ok ? 'signal' : 'acid', 0.95 * a), lw: 4, glowEdge: ok ? 0.3 * a : 0 });
  label3(s, c, label, P3(f.O, b, 0, -275, 0), b, 40, col(ok ? 'signal' : 'acid', a), 'c', 'c', 700);
  const lines = ok ? ['$ npm start', '✓ ready on :3000', '✓ 0 errors'] : ['$ npm start', '✗ exit 1', '✗ Segmentation fault'];
  lines.forEach((ln, i) => log3(s, c, ln, P3(f.O, b, -310 + glitch * (hash(i, Math.floor(t * 24)) - 0.5) * 80, -120 + i * 80, -2), b, 40, a));
  mark3(s, c, ok ? 'ok' : 'err', P3(f.O, b, 260, 140, -2), b, 100, a, 0.5);
  if (glitch > 0) for (let i = 0; i < 6; i++) rect3(s.c, c, P3(f.O, b, (hash(i, 3, Math.floor(t * 18)) - 0.5) * 60, (hash(i, Math.floor(t * 18)) - 0.5) * 420, -3), b, 360, 4 + hash(i, 5) * 10, col('acid', 0.25 * glitch * a));
}
function twobox(s: S) {
  const { t, sh } = s;
  const L = sh.lines;
  const l1 = L[1] ?? L[0]!;
  const wont = wordIs(l1.words, /won't|wont/i) ?? l1.words[0]!;
  const FY = 420;
  const times = [sh.start, L[0]!.start + 0.6, l1.start - 0.3, wont.start + 0.3];
  const keys: Partial<Cam3>[] = [{ x: -760, y: -60, z: -350, yaw: 0.32, pitch: 0.02 }, { x: -520, y: -120, z: -700, yaw: 0.18, pitch: 0.05 }, { x: 80, y: -200, z: -1350, yaw: -0.04, pitch: 0.09 }, { x: 260, y: -180, z: -1150, yaw: -0.1, pitch: 0.08 }];
  const c = punch(s, camAt(t, times, keys, 0.8, ease.inOutCubic));
  floor(s, c, FY, 1, { scroll: -t * 40 });
  const ya = prog(t, l1.start - 0.4, l1.start, ease.outBack);
  const gl = prog(t, wont.start - 0.05, wont.start + 0.1) * (0.4 + 0.6 * pulse(t, wont.start, 0.3));
  monitor3(s, c, [600, FY - 520 - (1 - ya) * 900, 820], basis(-0.28), 'YOUR MACHINE', false, ya, gl);
  monitor3(s, c, [-560, FY - 520, 520], basis(0.22), 'MY MACHINE', true, 1, 0);
  if (L[1]) flyLine(s, c, l1.words, [560, 120, 280], basis(-0.2, 0.02), 950, 120, { maxChars: 16, alpha: lineVis(L, 1, t), from: [0, -900, 0], depth: 40, spin: 0.4 });
  flyLine(s, c, L[0]!.words, [-330, 110, 0], basis(0.2, 0.02), 1000, 120, { maxChars: 23, alpha: lineVis(L, 0, t), from: [-300, 0, 1300], depth: 40 });
  hits(s, [wont.start], 16, 0.12);
}

// ------------------------------------------------------------------ SCAN (chorus 3–4): the agent's scan plane sweeps an array of component blocks
const PARTS = [['PATH', 'node 18 first', 1], ['python3', '3 installs', 1], ['.zshrc', '2019 alias', 1], [':3000', 'zombie pid', 1],
  ['~/.cache', '2.3G stale', 1], ['glibc', '2.31 < 2.34', 1], ['token', 'expired', 1], ['disk', 'ok', 0]] as const;
function scan(s: S) {
  const { t, sh } = s;
  const L = sh.lines;
  const t0 = L[0]!.start, t1 = lastW(L[L.length - 1]!).end + 0.1;
  const k = prog(t, t0, t1, ease.inOutCubic);
  const FY = 300;
  const c = punch(s, cam3({ x: lerp(-380, 380, k), y: -820, z: -900, yaw: lerp(0.22, -0.22, k), pitch: 0.52 }));
  floor(s, c, FY + 70, 0.7);
  const sx = lerp(-1150, 1150, k);
  const cells = PARTS.map(([name, val, bad], j) => ({ name, val, bad, x: -690 + (j % 4) * 460, z: 380 + Math.floor(j / 4) * 440 }));
  cells.sort((a, b) => b.z - a.z || Math.abs(b.x - c.x) - Math.abs(a.x - c.x)).forEach((p) => {
    const seen = prog(sx, p.x - 40, p.x + 60);
    const pop = seen > 0 ? Math.sin(clamp((sx - p.x) / 260) * Math.PI) : 0;
    const y = FY - 70 * pop - (seen > 0 ? 20 : 0);
    box3(s, c, [p.x, y, p.z], FACE, 190, 70, 170, { front: col('ink2'), side: col('ink'), top: seen > 0 ? mix('ink2', p.bad ? 'acid' : 'blood', 0.35) : col('ink2'), edge: seen > 0 ? col(p.bad ? 'acid' : 'signal', 0.9) : col('graphite', 0.8), lw: seen > 0 ? 3 : 1.5, glowEdge: seen > 0 && !p.bad ? 0.3 : 0 });
    const top: V3 = [p.x, y - 71, p.z];
    label3(s, c, p.name, add(top, [-160, 0, 60]), FLOOR, 46, col('bone'), 'l', 'c', 700);
    label3(s, c, p.val, add(top, [-160, 0, -20]), FLOOR, 30, col(seen > 0 && p.bad ? 'acid' : 'ash', 0.5 + 0.5 * seen));
    if (seen > 0) mark3(s, c, p.bad ? 'err' : 'ok', add(top, [130, 0, -90]), FLOOR, 60, seen, 0.4);
  });
  if (t >= t0 - 0.1 && t <= t1 + 0.4) {
    const a = 1 - prog(t, t1, t1 + 0.4);
    rect3(s.g, c, [sx, FY - 200, 600], basis(Math.PI / 2, 0), 900, 300, col('signal', 0.08 * a));
    seg(s.c, c, [sx, FY + 70, -200], [sx, FY + 70, 1400], col('signal', 0.95 * a), 4);
    seg(s.g, c, [sx, FY + 70, -200], [sx, FY + 70, 1400], col('ember', 0.6 * a), 12);
    const tag = box3(s, c, [sx, FY - 560, 700], FACE, 90, 30, 20, { front: col('signal', a), side: col('blood', a), top: col('signal', a) });
    label3(s, c, 'AGENT', P3(tag.O, FACE, 0, 0, -1), FACE, 30, col('ink', a), 'c', 'c', 700);
  }
  L.forEach((l, i) => flyLine(s, c, l.words, [0, i ? -170 : -400, 1400], basis(0, 0.25), 2100, 160, { maxChars: 50, from: [0, 0, 1600], depth: 40, spin: 0.3 }));
}

// ------------------------------------------------------------------ REPO (chorus 5 / bridge 3): a repo page in space; tabs extrude when sung
function repo(s: S) {
  const { t, sh } = s;
  const l = sh.lines[0]!;
  const url = 'https://' + BRAND.repo;
  const urlK = prog(t, l.start - 0.3, l.start + 0.6);
  const c = punch(s, camAt(t, [sh.start, l.start + 0.4, lastW(l).start - 0.1], [{ x: -420, y: -260, z: -650, yaw: 0.3, pitch: 0.12 }, { x: -60, y: -120, z: -1200, yaw: 0.08, pitch: 0.06 }, { x: 60, y: -100, z: -1300, yaw: -0.03, pitch: 0.05 }], 0.9, ease.inOutCubic));
  floor(s, c, 520, 0.6);
  dust(s, c, FIELD, 30, 5, 0.25);
  const B = basis(0.16, 0.1);
  const f = box3(s, c, [0, -220, 400], B, 860, 250, 30, { front: col('ink2'), side: col('ink'), top: col('ink2'), edge: col('graphite', 0.9) });
  rect3(s.c, c, P3(f.O, B, 0, -150, -2), B, 800, 44, col('ink'), col('graphite'), 2);
  label3(s, c, url.slice(0, Math.ceil(urlK * url.length)), P3(f.O, B, -770, -150, -3), B, 36, col('bone'));
  label3(s, c, BRAND.repo.split('/').slice(1).join(' / '), P3(f.O, B, -790, -40, -2), B, 52, col('bone', prog(t, l.start + 0.2, l.start + 0.6)), 'l', 'c', 600);
  const TABS = [['Code', /repo|code/i, 'repo'], ['Issues', /issues?/i, 'issues'], ['Pull requests', /^PRs?$|^PR's$/i, 'prs']] as const;
  const want: string[] = sh.o.tabs ?? ['repo'];
  let x = -790;
  TABS.forEach(([lb, re, key]) => {
    const w = want.includes(key) ? wordIs(l.words, re) ?? null : null;
    const k = w ? prog(t, w.start - 0.08, w.start + 0.25, ease.outBack) : 0;
    const tw = lb.length * 24 + 50;
    const tb = box3(s, c, P3(f.O, B, x + tw / 2, 120, -4 - 70 * k), B, tw / 2, 34, 4 + 40 * k, { front: col('ink2'), side: mix('ink', 'blood', clamp(k)), top: mix('ink2', 'signal', 0.5 * clamp(k)), edge: k > 0 ? col('signal', 0.9) : col('graphite', 0.6), glowEdge: 0.3 * clamp(k) });
    label3(s, c, lb, P3(tb.O, B, 0, 0, -1), B, 34, col(k > 0 ? 'signal' : 'ash'), 'c', 'c', k > 0 ? 700 : 500);
    x += tw + 40;
  });
  if (sh.o.agent) {
    const pt = wordIs(l.words, /point/i) ?? l.words[0]!;
    const k = prog(t, pt.start - 0.05, pt.start + 0.6, ease.inOutCubic);
    const from: V3 = [-1100, 300, -100], to = P3(f.O, B, -700, -150, -60);
    const P: V3 = [lerp(from[0], to[0], k), lerp(from[1], to[1], k) - Math.sin(k * Math.PI) * 300, lerp(from[2], to[2], k)];
    seg(s.g, c, from, P, col('signal', 0.4), 6);
    const ab = box3(s, c, P, basis(0.2 + k, 0), 110, 40, 40, { front: col('signal'), side: col('blood'), top: col('signal') });
    label3(s, c, 'AGENT', P3(ab.O, ab.b, 0, 0, -1), ab.b, 36, col('ink'), 'c', 'c', 700);
  }
  flyLine(s, c, l.words, [0, 320, 0], basis(-0.06, 0.04), 1550, 150, { maxChars: 26, from: [0, 0, 1400], depth: 44, spin: 0.5 });
}

// ------------------------------------------------------------------ BADGE (hook): slabs slam down one after another; each knocks the last flat
function badge(s: S) {
  const { t, sh } = s;
  const L = sh.lines, n = sh.o.n ?? 1;
  const FY = 380;
  const times = [sh.start, ...L.map((l) => l.start - 0.25)];
  const keys: Partial<Cam3>[] = [{ y: -120, z: -1250, pitch: 0.1, yaw: 0.2 }, ...L.map((_, i) => ({ x: (i % 2 ? 1 : -1) * 160, y: -150 - i * 140, z: -1000 + i * 60, pitch: 0.12 + i * 0.09, yaw: (i % 2 ? -1 : 1) * 0.14, roll: (i % 2 ? 1 : -1) * 0.02 }))];
  const c = punch(s, camAt(t, times, keys, 0.6));
  floor(s, c, FY, 1, { scroll: t * 120, hot: L.reduce((a, l) => a + pulse(t, l.start, 0.15), 0) });
  // the carpet of earlier certifications, lying flat
  const crowd = 6 + 6 * n;
  for (let j = crowd - 1; j >= 0; j--) {
    const tj = sh.start + (j / crowd) * Math.max(0.5, sh.end - sh.start - 0.4);
    if (t < tj) continue;
    const base: V3 = [(hash(j, 1, n) - 0.5) * 3600, FY - 36, 300 + hash(j, 2, n) * 2600];
    const ws0 = L[0]!.words.map((w) => ({ ...w, start: tj, end: tj + 0.2 }));
    stamp3(s, c, ws0, base, basis((hash(j, 3, n) - 0.5) * 1.4, -Math.PI / 2), 560, { alpha: 0.5 * prog(t, tj, tj + 0.2) });
  }
  L.forEach((l, j) => {
    const w0 = l.words[0]!;
    if (t < w0.start - 0.3) return;
    const drop = prog(t, w0.start - 0.3, w0.start, ease.inCubic);
    const nx = L[j + 1];
    const fall = nx ? prog(t, nx.start - 0.05, nx.start + 0.45, ease.inQuad) : 0;
    const base: V3 = [0, FY - (1 - drop) * 1500, 200 + j * 60];
    const width = 1200 + 60 * n;
    const { hh } = stampDims(l.words, width, true);
    const st = standing(base, (j % 2 ? 1 : -1) * (0.05 + 0.02 * n), hh, fall);
    stamp3(s, c, l.words, st.C, st.b, width, { label: `WORKS ON MY MACHINE · CERTIFIED · ${n >= 3 ? 'FINAL' : 'n=' + n}` });
  });
  const h = hits(s, L.map((l) => l.start), 14);
  s.post.flash = 0.08 * h;
}

// ------------------------------------------------------------------ NEWISSUE (pre 2): "broke" drops into the title field… tilt up: the tower of old issues
const OLD = [['#3712', 'won’t start — node version / PATH', 1], ['#3990', 'broke', 0], ['#4127', 'it doesn’t work', 0], ['#4301', 'broke on my machine', 0], ['#4389', 'app broke after update', 0], ['#4412', 'broke', 0]] as const;
function newissue(s: S) {
  const { t, sh } = s;
  const L = sh.lines;
  const l1 = L[1] ?? L[0]!;
  const broke = wordIs(L[0]!.words, /broke/i) ?? lastW(L[0]!);
  const hit = wordIs(L[0]!.words, /hit/i) ?? L[0]!.words[0]!;
  const spoke = wordIs(l1.words, /spoke/i) ?? lastW(l1);
  const TOP = -620, GAP = 170;
  const topY = TOP - (OLD.length - 1) * GAP;
  const c = punch(s, camAt(t, [sh.start, hit.start - 0.1, l1.start - 0.15, spoke.start - 0.2],
    [{ y: -60, z: -1250, pitch: 0.04, yaw: 0.12 }, { y: -30, z: -1150, pitch: 0.06, yaw: -0.05 }, { y: TOP - 520, z: -1550, pitch: -0.12, yaw: 0.06 }, { y: topY + 80, z: -1300, pitch: -0.05, yaw: -0.04 }], 0.9, ease.inOutCubic));
  floor(s, c, 480, 0.6);
  // the tower of issues that were already there (oldest on top)
  OLD.forEach(([num, title, ans], j) => {
    const y = topY + j * GAP;
    const k = ans ? prog(t, spoke.start - 0.05, spoke.start + 0.35, ease.outExpo) : 0;
    const b = basis((j % 2 ? 1 : -1) * 0.05, 0);
    const f = box3(s, c, [0, y, 300], b, 680, 62, 26, { front: col('ink2'), side: col('ink'), top: col('ink2'), edge: k > 0 ? col('signal', 0.6 + 0.4 * k) : col('graphite', 0.8), lw: k > 0 ? 4 : 1.5, glowEdge: 0.4 * k });
    label3(s, c, num, P3(f.O, b, -640, 0, -1), b, 30, col('graphite'));
    label3(s, c, title, P3(f.O, b, -500, 0, -1), b, 36, col(k > 0 ? 'signal' : 'bone'));
    if (ans) { mark3(s, c, 'ok', P3(f.O, b, 470, 0, -2), b, 44, k, 0.6); label3(s, c, 'answered', P3(f.O, b, 640, 0, -1), b, 28, col('signal', 0.3 + 0.7 * k), 'r'); }
  });
  // the form
  const B = basis(0.05, 0.06);
  const f = box3(s, c, [0, 160, 300], B, 700, 320, 30, { front: col('ink2'), side: col('ink'), top: col('ink2'), edge: col('graphite', 0.9) });
  label3(s, c, 'New issue', P3(f.O, B, -650, -260, -1), B, 34, col('bone'), 'l', 'c', 600);
  label3(s, c, 'Title', P3(f.O, B, -650, -180, -1), B, 26, col('ash'));
  rect3(s.c, c, P3(f.O, B, 0, -100, -2), B, 650, 46, col('ink'), col('graphite'), 2);
  if (t > broke.start - 0.3) {
    const sp = Math.max(0.25, broke.end - broke.start);
    text3(s, c, 'broke', A(100, 900), 80, P3(f.O, B, -620, -100, -24), B, { align: 'l', w: broke, depth: 22, steps: 5, fx: (i) => { const k = prog(t, broke.start - 0.12 + (i * sp) / 6, broke.start + (i * sp) / 6, ease.inCubic); return { dy: -(1 - k) * 260, dz: -(1 - k) * 500, a: k > 0 ? 1 : 0, rot: (1 - k) * (i % 2 ? 0.6 : -0.6) }; } });
  }
  rect3(s.c, c, P3(f.O, B, 0, 60, -2), B, 650, 90, col('ink'), col('graphite'), 2);
  label3(s, c, 'it doesn’t work', P3(f.O, B, -620, 20, -3), B, 28, col('ash', 0.4));
  const press = pulse(t, hit.start, 0.18);
  const bt = box3(s, c, P3(f.O, B, 480, 230, -26 + 22 * press), B, 160, 38, 22 - 18 * press, { front: col('signal'), side: col('blood'), top: col('signal'), edge: col('ember', 0.6), glowEdge: 0.3 + 0.5 * press });
  label3(s, c, 'Submit new issue', P3(bt.O, B, 0, 0, -1), B, 26, col('ink'), 'c', 'c', 700);
  flyLine(s, c, L[0]!.words, [0, -330, 150], basis(0, 0.04), 1550, 92, { maxChars: 30, alpha: lineVis(L, 0, t), from: [0, 0, 1400], depth: 34 });
  if (L[1]) flyLine(s, c, l1.words, [0, topY - 260, 150], basis(0, -0.05), 1500, 110, { maxChars: 26, alpha: prog(t, l1.start - 0.3, l1.start), from: [0, 900, 0], depth: 36 });
  hits(s, [hit.start, broke.start], 10);
}

// ------------------------------------------------------------------ QUERY (bridge 1–2): a search slab; results fly out toward the camera
const RESULTS: Record<string, [string, string][]> = {
  issues: [['open', 'App won’t start after update'], ['closed', 'Won’t start: node version mismatch'], ['closed', 'Fails on ARM: GLIBC_2.34 not found'], ['closed', 'EADDRINUSE :3000 on launch']],
  prs: [['merged', 'fix: check node engine before start'], ['merged', 'fix: free port 3000 on exit'], ['open', 'build: ship arm64 glibc 2.31 binary']],
};
function query(s: S) {
  const { t, sh } = s;
  const l = sh.lines[0]!;
  const q: string = sh.o.q ?? '';
  const side = sh.o.kind === 'prs' ? -1 : 1;
  const c = punch(s, camAt(t, [sh.start, l.start + 0.2], [{ x: side * 300, y: -200, z: -1100, yaw: -side * 0.2, pitch: 0.1 }, { x: side * 120, y: -160, z: -1350, yaw: -side * 0.08, pitch: 0.08 }], 0.9, ease.inOutCubic));
  floor(s, c, 560, 0.6, { scroll: t * 200 });
  dust(s, c, FIELD, 26, 7, 0.22);
  const B = basis(side * 0.12, 0.05);
  const bar = box3(s, c, [0, -330, 600], B, 820, 62, 28, { front: col('ink'), side: col('ink2'), top: col('ink2'), edge: col('signal', 0.85), glowEdge: 0.2 });
  label3(s, c, typed(q, t, l.start - 0.25, Math.max(0.4, 0.55 * (l.end - l.start))), P3(bar.O, B, -760, 0, -1), B, 38, col('bone'));
  const r0 = l.start + 0.6 * (l.end - l.start);
  label3(s, c, sh.o.hits ?? '', P3(bar.O, B, -790, 100, -1), B, 28, col('ash', prog(t, r0 - 0.1, r0 + 0.2)));
  const R = RESULTS[sh.o.kind] ?? [];
  [...R.keys()].reverse().forEach((j) => {
    const [st, title] = R[j]!;
    const k = prog(t, r0 + j * 0.1, r0 + 0.35 + j * 0.1, ease.outBack);
    if (k <= 0) return;
    const P: V3 = [0, lerp(-330, -170 + j * 120, k), lerp(600, 540 - j * 30, k)];
    const cf = box3(s, c, P, B, 760, 48, 14, { front: col('ink2'), side: col('ink'), top: col('ink2'), edge: col('graphite', 0.8) });
    rect3(s.c, c, P3(cf.O, B, -720, 0, -1), B, 12, 12, col(st === 'open' ? 'signal' : st === 'merged' ? 'ember' : 'graphite'));
    label3(s, c, title, P3(cf.O, B, -680, 0, -1), B, 34, col('bone'));
    label3(s, c, st, P3(cf.O, B, 740, 0, -1), B, 26, col('ash', 0.7), 'r');
  });
  flyLine(s, c, l.words, [0, 300, 0], basis(-side * 0.08, 0.05), 1450, 230, { maxChars: 30, from: [0, 0, 2200], depth: 70, spin: 0.7 });
}

// ------------------------------------------------------------------ PIN (bridge 4): the camera descends onto a floor target; a marker drops where you are
function pin(s: S) {
  const { t, sh } = s;
  const l = sh.lines[0]!;
  const k = prog(t, sh.start, lastW(l).end + 0.2, ease.inOutCubic);
  const FY = 300;
  const c = punch(s, cam3({ x: lerp(300, 0, k), y: lerp(-1700, -820, k), z: lerp(-500, -900, k), yaw: lerp(-0.4, 0, k), pitch: lerp(1.05, 0.62, k) }));
  floor(s, c, FY, 1, { step: 160 });
  for (let j = 0; j < 40; j++) label3(s, c, FIELD[j % FIELD.length]!, [-1500 + (j % 8) * 420, FY - 1, 200 + Math.floor(j / 8) * 380], FLOOR, 42, col('graphite', 0.8), 'c');
  const ctr: V3 = [0, FY - 2, 700];
  for (let r = 0; r < 4; r++) {
    const rr = lerp(1500 - r * 250, 90 + r * 60, k);
    const pts: V3[] = Array.from({ length: 64 }, (_, i) => add(ctr, [Math.cos((i / 64) * TAU) * rr, 0, Math.sin((i / 64) * TAU) * rr]));
    pts.forEach((p, i) => seg(s.c, c, p, pts[(i + 1) % 64]!, col('signal', 0.3 + 0.18 * r), 2 + r));
  }
  const lw = lastW(l);
  const dk = prog(t, lw.start - 0.25, lw.start, ease.inCubic);
  if (dk > 0) {
    box3(s, c, add(ctr, [0, -110 - (1 - dk) * 1200, 0]), basis(t * 0.8), 26, 110, 26, { front: col('signal'), side: col('blood'), top: col('ember'), glowEdge: 0.5, edge: col('ember', 0.8) });
    label3(s, c, 'you are here: ~/app · arm64 · node 18 · zsh · glibc 2.31', add(ctr, [80, -260, 0]), FACE, 34, col('signal', prog(t, lw.start, lw.start + 0.3)));
  }
  flyLine(s, c, l.words, [0, FY - 40, 150], basis(0, -0.85), 1500, 170, { maxChars: 26, from: [0, -900, 0], depth: 50 });
  hits(s, [lw.start], 12);
}

// ------------------------------------------------------------------ DUPES (bridge 5–6): the same ticket, filed again and again… crane up to the answer
function dupes(s: S) {
  const { t, sh } = s;
  const L = sh.lines;
  const l0 = L[0]!, l1 = L[1] ?? L[0]!;
  const N = 7, GAP = 150, Y0 = -500;
  const marks = l0.words.filter((w) => /same|ticket|opened|again/i.test(w.w));
  const upW = wordIs(l1.words, /up/i) ?? l1.words[0]!;
  const ansW = wordIs(l1.words, /answered/i) ?? lastW(l1);
  const yAt = (j: number) => Y0 + j * GAP;
  const c = punch(s, camAt(t, [sh.start, ...marks.map((w) => w.start), upW.start - 0.1],
    [{ y: yAt(1) - 150, z: -1300, pitch: 0.12, yaw: 0.2 }, ...marks.map((_, i) => ({ y: yAt(Math.min(N - 1, i + 1)) - 120, z: -1350, pitch: 0.12, yaw: (i % 2 ? -1 : 1) * 0.16 })), { y: yAt(0) - 220, z: -1250, pitch: 0.06, yaw: -0.08 }], 0.45));
  for (let j = N - 1; j >= 0; j--) {
    const orig = j === 0;
    const at = orig ? -1 : (marks[j - 1]?.start ?? l0.start + j * 0.25);
    const k = orig ? 1 : prog(t, at - 0.22, at, ease.inCubic);
    if (k <= 0) continue;
    const ak = orig ? prog(t, ansW.start - 0.05, ansW.start + 0.35, ease.outExpo) : 0;
    const sgn = j % 2 ? 1 : -1;
    const b = basis(sgn * 0.07 + (1 - k) * sgn * 1.2, 0);
    const C: V3 = [(1 - k) * sgn * 2200, yAt(j), 300 - (1 - k) * 400];
    const f = box3(s, c, C, b, 640, 58, 24, { front: col('ink2'), side: col('ink'), top: col('ink2'), edge: ak > 0 ? col('signal', 0.6 + 0.4 * ak) : col('graphite', 0.8), lw: ak > 0 ? 4 : 1.5, glowEdge: 0.4 * ak });
    label3(s, c, orig ? '#1024' : `#${4400 + Math.floor(hash(j, 9) * 90)}`, P3(f.O, b, -610, 0, -1), b, 30, col('graphite'));
    label3(s, c, 'App won’t start on my machine', P3(f.O, b, -480, 0, -1), b, 38, col(ak > 0 ? 'signal' : 'bone'));
    if (orig) { mark3(s, c, 'ok', P3(f.O, b, 470, 0, -2), b, 46, ak, 0.6); label3(s, c, 'answered', P3(f.O, b, 620, 0, -1), b, 28, col('signal', ak), 'r'); }
    else if (k >= 1) {
      const sk = prog(t, at, at + 0.15, ease.outExpo);
      const sb = basis(sgn * 0.07, 0, -0.12);
      const st = box3(s, c, P3(f.O, b, 420, 0, -20 - (1 - sk) * 500), sb, 150, 38, 10, { front: col('ink2'), side: col('ink'), edge: col('acid', 0.95), lw: 3 });
      label3(s, c, 'DUPLICATE', P3(st.O, sb, 0, 0, -1), sb, 34, col('acid'), 'c', 'c', 700);
    }
  }
  L.forEach((l, i) => {
    const a = lineVis(L, i, t);
    if (a <= 0.01) return;
    flyLine(s, c, l.words, [0, i ? yAt(0) - 320 : yAt(N - 1) + 260, 60], basis(0, i ? -0.05 : 0.05), 1500, 100, { maxChars: 60, alpha: a, from: [0, 0, 1500], depth: 34 });
  });
  hits(s, marks.map((w) => w.start), 8, 0.08);
}

// ------------------------------------------------------------------ ENDCARD (outro): search before you post → the repo, as an object
function endcard(s: S) {
  const { t, sh } = s;
  const L = sh.lines;
  const l0 = L[0]!, l1 = L[1];
  const card = l1 ? l1.start - 0.2 : l0.end + 0.5;
  const ck = prog(t, card, card + 0.8, ease.outExpo);
  const c = punch(s, camAt(t, [sh.start, card], [{ x: -200, y: -150, z: -1250, yaw: 0.16, pitch: 0.06 }, { x: 0, y: -120, z: -1450, yaw: lerp(-0.12, 0.04, prog(t, card, sh.end)), pitch: 0.06 }], 1.2, ease.inOutCubic));
  floor(s, c, 520, 0.8, { scroll: t * 50 });
  dust(s, c, FIELD, 30, 9, 0.22);
  if (ck < 1) flyLine(s, c, l0.words, [0, 0, 0], basis(0.06, 0.04), 1500, 260, { maxChars: 13, alpha: 1 - ck, from: [0, 0, 2000], depth: 80, spin: 0.6 });
  if (ck > 0) {
    if (l1) {
      const w0 = l1.words[0]!;
      const drop = prog(t, w0.start - 0.3, w0.start, ease.inCubic);
      stamp3(s, c, l1.words, [0, -470 - (1 - drop) * 1200, 200], basis(-0.04), 900, { alpha: ck });
    }
    label3(s, c, 'POINT YOUR AGENT AT', [0, -230, 100], FACE, 40, col('ash', ck), 'c');
    const fam = A(100, 900), sz = Math.min(110, (1700 / Math.max(1, BRAND.repo.length)) * 1.55);
    text3(s, c, BRAND.repo, fam, sz, [0, -110, 100 + (1 - ck) * 600], basis(0, 0.04), { color: col('signal'), depth: 36, steps: 8, glow: 0.6, w: { w: '', start: card, end: card + 1.5 } as Word, alpha: ck });
    label3(s, c, '/issues   ·   /pulls   ·   the code', [0, 20, 100], FACE, 36, col('bone', 0.9 * ck), 'c');
    seg(s.c, c, [-650, 80, 100], [lerp(-650, 650, ck), 80, 100], col('signal', 0.7), 3);
    label3(s, c, 'SEARCH BEFORE YOU POST.  SCROLL UP A LITTLE.', [0, 160, 100], FACE, 34, col('bone', ck), 'c', 'c', 600);
    label3(s, c, 'your agent knows your machine better than you do.', [0, 220, 100], FACE, 28, col('ash', 0.8 * ck), 'c');
  }
  s.post.fade = prog(t, sh.end - 1.4, sh.end - 0.05, ease.inOutCubic);
}

export const EXTRA: Record<string, (s: S) => void> = { boot, doctor, dotfile, twobox, scan, repo, badge, newissue, query, pin, dupes, endcard };
