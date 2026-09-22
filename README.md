# website-admin

Radicle's website, built with Next.js (App Router). `next build` does a static export into `out/`, which you can serve from any static host.

```
npm install
npm run dev      # http://localhost:3000 and http://localhost:3000/admin/
npm run build    # static site in out/
```

## Structure

- `content/site.json` holds the editable content: events, menu (carta), farms and the photos. Image paths in it are relative to `public/`, e.g. `img/sopa-calabaza.jpg`.
- `app/(site)/` is the public page. `app/admin/` is the admin. They're two separate root layouts, so neither page loads the other's CSS.
- `components/` holds the interactive parts of the page: roots canvas, events, carta, opening hours and the booking form.

## Admin (`/admin`)

Nothing on the site links to it, and it has `noindex` set. It edits the events, the menu (carta) and the dish photos. Each save becomes a single commit to `main` through the GitHub API, containing `content/site.json` plus any new images in `public/img/`. Your host then rebuilds and redeploys.

**First-time setup** (only one person can do this, once):
1. On GitHub, go to Settings → Developer settings → Fine-grained tokens and create a token for **this repo only** with **Contents: Read and write**.
2. Open `https://your-site/admin/`, paste the token and choose a password (12+ characters).
3. The token is encrypted in the browser with that password (PBKDF2-SHA256 with 600k iterations, then AES-GCM) and committed as `public/admin/credentials.json`. From then on, the password is the only login.

To change the password or rotate the token, use "Cambiar credenciales" inside the admin. To lock everyone out, revoke the token on GitHub.

The repo owner, name and branch are set in `app/admin/github.ts`.
