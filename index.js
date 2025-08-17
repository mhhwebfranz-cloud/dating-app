// file: package.json
{
  "name": "dating-app",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}

// file: next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;

// file: utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Hilfreiche Fehlermeldung im Build/Runtime
  console.warn('[Config] Bitte setze NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel > Settings > Environment Variables.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// file: utils/selfTest.js
export function runSelfTest() {
  const issues = []
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) issues.push('Fehlt: NEXT_PUBLIC_SUPABASE_URL')
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) issues.push('Fehlt: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return issues
}

// file: pages/_app.js
export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      {/* Globale, einfache Styles ohne Tailwind/Decorator-Syntax */}
      <style jsx global>{`
        html, body, #__next { height: 100%; margin: 0; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, sans-serif; color: #111827; }
        .center { min-height: 100%; display: flex; align-items: center; justify-content: center; background: #f3f4f6; padding: 24px; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 1px 2px rgba(0,0,0,.05); max-width: 480px; width: 100%; }
        .title { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
        .btn { cursor: pointer; border: 0; border-radius: 10px; padding: 12px 16px; font-weight: 600; }
        .btn-primary { background: #111827; color: #fff; }
        .btn-primary:hover { filter: brightness(0.95); }
        .btn-danger { background: #ef4444; color: #fff; }
        .btn-danger:hover { filter: brightness(0.95); }
        .muted { color: #6b7280; font-size: 14px; margin-top: 8px; }
        .stack { display: grid; gap: 12px; }
        .issues { background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; padding:12px; border-radius:10px; }
        .ok { background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; padding:12px; border-radius:10px; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      `}</style>
    </>
  )
}

// file: pages/index.js
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { runSelfTest } from '../utils/selfTest'

export default function Home() {
  const [session, setSession] = useState(null)
  const issues = runSelfTest()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) setSession(session)
      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (mounted) setSession(newSession)
      })
    })()
    return () => { mounted = false }
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="center">
      <div className="card stack">
        <h1 className="title">Lovebird – Login</h1>

        {issues.length > 0 && (
          <div className="issues">
            <b>Konfiguration unvollständig:</b>
            <ul>
              {issues.map((i) => <li key={i}>{i}</li>)}
            </ul>
            <div className="muted">Setze die Variablen in Vercel → Project → Settings → Environment Variables.</div>
          </div>
        )}

        {!session ? (
          <>
            <button className="btn btn-primary" onClick={signInWithGoogle}>Mit Google einloggen</button>
            <p className="muted">Du wirst zu Google weitergeleitet und dann zurück in die App.</p>
          </>
        ) : (
          <>
            <div>Willkommen, <b>{session.user.email}</b></div>
            <button className="btn btn-danger" onClick={signOut}>Ausloggen</button>
          </>
        )}

        <div className="muted">Testfälle: Prüfe Login/Logout & ob in Supabase unter <i>auth.users</i> ein neuer Eintrag erscheint.</div>
        <div className="muted">Weitere Tests unter <span className="mono">/tests</span>.</div>
      </div>
    </div>
  )
}

// file: pages/tests.js
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'

export default function Tests() {
  const [results, setResults] = useState([])

  useEffect(() => {
    async function run() {
      const r = []

      // Test 1: Env Vars gesetzt
      const envOk = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      r.push({ name: 'Env Vars vorhanden', pass: envOk, details: envOk ? 'OK' : 'Fehlend: NEXT_PUBLIC_SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_ANON_KEY' })

      // Test 2: Supabase Client erzeugt
      try {
        const url = supabase.storage?.getPublicUrl ? 'client-ok' : 'client-missing'
        r.push({ name: 'Supabase Client initialisiert', pass: url === 'client-ok', details: url })
      } catch (e) {
        r.push({ name: 'Supabase Client initialisiert', pass: false, details: String(e) })
      }

      // Test 3: API /api/self-test antwortet
      try {
        const res = await fetch('/api/self-test')
        const json = await res.json()
        r.push({ name: 'API /api/self-test', pass: json.ok === true, details: JSON.stringify(json) })
      } catch (e) {
        r.push({ name: 'API /api/self-test', pass: false, details: String(e) })
      }

      setResults(r)
    }
    run()
  }, [])

  return (
    <div className="center">
      <div className="card">
        <h1 className="title">Lovebird – Tests</h1>
        <ul>
          {results.map((t) => (
            <li key={t.name} style={{marginBottom: 8}}>
              <b>{t.name}:</b> {t.pass ? '✅ PASS' : '❌ FAIL'}
              <div className="muted mono">{t.details}</div>
            </li>
          ))}
        </ul>
        <p className="ok">Diese Seite enthält einfache Smoke-Tests. Sie ändern keine Daten.</p>
      </div>
    </div>
  )
}

// file: pages/api/self-test.js
export default function handler(_req, res) {
  const ok = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  res.status(200).json({ ok, url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing', anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing' })
}

// file: README.md
# Dating-App (Minimal, ohne Tailwind)

**Fix für Fehler:** `Missing semicolon (3:8)` in `next.config.js` – es fehlte ein Semikolon nach der Deklaration. Wurde ergänzt: `const nextConfig = {};`.

**Vorheriger Fix:** Der Decorators-Fehler wurde vermieden, indem wir auf einfache CSS-Styles via **styled-jsx** umgestellt haben (kein Tailwind, keine Babel-Plugins nötig).

## Einrichten
1. In Vercel unter *Environment Variables* setzen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. In Supabase unter *Authentication → Providers* ggf. **Google** aktivieren (Redirect-URL: `https://<dein-vercel-host>/` oder lokal `http://localhost:3000`).

## Start
- Lokal: `npm i` → `npm run dev` (optional)
- Vercel: Repo importieren → Deploy

## Tests
- **Bestehender Test**: `/api/self-test` → sollte `{ ok: true }` liefern, wenn die Variablen gesetzt sind.
- **Neue Tests**: Seite `/tests` im Browser öffnen. Sie prüft:
  1) Env-Variablen vorhanden
  2) Supabase-Client initialisiert
  3) API `/api/self-test` erreichbar

## Erwartetes Verhalten (bitte bestätigen)
Nach erfolgreichem Login: Soll die App aktuell **A)** nur „Willkommen + Logout“ zeigen (Status-Quo), **B)** direkt in ein **Profil-Setup** (Alter, Bio, Interessen) führen, oder **C)** in eine **Swipe/Explore**-Ansicht springen? Bitte A/B/C nennen, dann baue ich die nächste Ansicht.
