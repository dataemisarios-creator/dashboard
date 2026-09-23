import { borrarCookie } from './_comun.js';

export default function handler(req, res) {
  borrarCookie(res);
  return res.status(200).json({ ok: true });
}
