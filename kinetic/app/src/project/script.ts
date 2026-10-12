// The edit, by SECTION (see scenes/director.ts). Bespoke shots live in project/shots.ts.
export type Spec = [kind: string, lines: number, opts?: Record<string, any>];

const LOGS1 = [
  ['$ node -v', 'v18.19.1', '✗ engines: requires node >=22', '  PATH → /usr/local/bin/node (stale)'],
  ['$ which -a python3', '/usr/bin/python3        3.9', '~/.pyenv/shims/python3  3.11', '✗ .venv/bin/python3 3.12 — not activated'],
  ['$ git log -1 --format=%ad ~/.zshrc', 'Tue Mar 12 2019', '✗ alias node="~/old/node/bin/node"'],
  ['$ history | grep "| bash"', 'curl -fsSL get.example.sh | bash', '✗ overwrote /usr/local/lib/libssl.so'],
];
const LOGS2 = [
  ['$ lsof -i :3000', 'node  41337  started 6 days ago', '✗ EADDRINUSE: address already in use'],
  ['$ du -sh ~/.cache/app', '2.3G   last cleared: never', '✗ 401: token expired'],
  ['$ uname -m; ldd --version', 'aarch64 · glibc 2.31', '✗ GLIBC_2.34 not found'],
  ['$ agent diagnose', '✓ read 14,212 log lines', '✓ 3 root causes · fix ready'],
];

// chorus: my box vs yours → the agent scans it → the repo → the hook stamps (grow each time)
const chorus = (n: number, c: number, last?: Record<string, any>): Spec[] => [
  ['twobox', 2], ['scan', 2], ['repo', 1, { tabs: last?.tabs ?? (n === 2 ? ['issues', 'prs'] : ['repo']) }], ['badge', c - 5, { n }],
];

export const SECTIONS: Record<string, (occ: number, count: number) => Spec[]> = {
  intro: (_o, c) => [['boot', c]],
  verse: (o, c) => [['doctor', c, { logs: o === 1 ? LOGS1 : LOGS2, host: o === 1 ? 'your-laptop' : 'your-laptop' }]],
  pre: (o, c) => (o === 1 ? [['dotfile', c]] : [['newissue', c]]),
  chorus: (n, c) => chorus(n, c),
  final: (_n, c) => chorus(3, c, { tabs: ['repo', 'issues', 'prs'] }),
  bridge: (_o, c) => [
    ['query', 1, { q: 'is:issue  won’t start on my machine', kind: 'issues', hits: '23 open · 141 closed' }],
    ['query', 1, { q: 'is:pr  fix startup', kind: 'prs', hits: '7 open · 52 merged' }],
    ['repo', 1, { tabs: ['repo'], agent: true }],
    ['pin', 1],
    ['dupes', c - 4],
  ],
  outro: (_o, c) => [['endcard', c]],
};
