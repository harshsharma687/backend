// Zero-dependency probe: if THIS fails, the problem is the Vercel platform /
// project config. If this works but /healthz fails, the problem is inside the
// app bundle — and /healthz (via api/index.js) will say exactly what.
export default function handler(_, res) {
  res.status(200).json({ ok: true, fn: "ping", time: new Date().toISOString() });
}
