/* Data project HidzProject untuk halaman bio (Cloudflare Pages Functions).

   Daftar project HidzProject disimpan terenkripsi (XOR + base64) di dalam
   halaman utamanya. Browser tidak bisa membacanya dari domain lain (diblokir
   CORS), jadi fungsi ini yang mengambil halaman tersebut lalu membuka
   datanya. Yang diteruskan ke pengunjung cuma nama dan deskripsi project,
   tidak ada URL atau data lain.

   File ini otomatis menjadi rute /api/projects. Halaman statis di public/
   dilayani langsung oleh Pages tanpa memanggil fungsi ini. */

const SOURCE_URL = 'https://hidzproject.my.id/';
const TIMEOUT_MS = 8000;
const MIN_GAP_MS = 30000; // jeda minimum antar pengambilan di satu isolate

let lastGood = null;      // salinan terakhir yang berhasil dibaca
let lastCheckAt = 0;
let lastUp = null;
let lastStatus = 0;       // kode HTTP terakhir dari HidzProject (0 = gagal tersambung)

/* Ambil isi string JavaScript dari deklarasi seperti: const _b = "....." */
function jsString(html, name) {
    const match = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*"').exec(html);
    if (!match) return null;
    const start = match.index + match[0].length;
    const end = html.indexOf('"', start);
    return end === -1 ? null : html.slice(start, end);
}

/* Buka data project HidzProject. Mengembalikan null kalau formatnya tidak dikenali. */
function extractProjects(html) {
    const blob = jsString(html, '_b');
    const key = jsString(html, '_k');
    if (!blob || !key) return null;

    let raw;
    try {
        raw = Uint8Array.from(atob(blob), (ch) => ch.charCodeAt(0));
    } catch (err) {
        return null;
    }
    if (raw.length === 0) return null;
    const plain = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
        plain[i] = raw[i] ^ key.charCodeAt(i % key.length);
    }

    let data;
    try {
        data = JSON.parse(new TextDecoder().decode(plain));
    } catch (err) {
        return null;
    }
    if (!data || !Array.isArray(data.projects)) return null;

    const projects = [];
    for (const item of data.projects) {
        if (!item || typeof item.name !== 'string') continue;
        const name = item.name.trim();
        if (!name) continue;
        projects.push({
            name,
            desc: typeof item.desc === 'string' ? item.desc.trim() : ''
        });
    }
    return projects;
}

async function hashOf(projects) {
    const bytes = new TextEncoder().encode(JSON.stringify(projects));
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return Array.from(digest.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchSource(sourceUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(sourceUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; HidzBio/1.0; +https://hidzproject.my.id)',
                'Accept': 'text/html'
            },
            redirect: 'follow',
            signal: controller.signal,
            cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 60, '300-599': 0 } }
        });
        const body = res.status === 200 ? await res.text() : '';
        return { status: res.status, body };
    } catch (err) {
        return { status: 0, body: '' };
    } finally {
        clearTimeout(timer);
    }
}

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    }

    const now = Date.now();
    if (lastUp === null || now - lastCheckAt >= MIN_GAP_MS) {
        const source = await fetchSource((env && env.HB_SOURCE_URL) || SOURCE_URL);
        lastCheckAt = Date.now();
        /* Situs dianggap hidup kalau menjawab dengan kode di bawah 500,
           termasuk 403/429 dari firewall. Yang mati: gagal tersambung atau 5xx. */
        lastUp = source.status > 0 && source.status < 500;
        lastStatus = source.status;

        if (source.status === 200) {
            const projects = extractProjects(source.body);
            if (projects) {
                lastGood = { projects, hash: await hashOf(projects), fetchedAt: lastCheckAt };
            }
        }
    }

    return new Response(JSON.stringify({
        ok: lastGood !== null,
        up: lastUp,
        sourceStatus: lastStatus,
        checkedAt: lastCheckAt,
        fetchedAt: lastGood ? lastGood.fetchedAt : 0,
        hash: lastGood ? lastGood.hash : '',
        count: lastGood ? lastGood.projects.length : 0,
        projects: lastGood ? lastGood.projects : []
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
            'X-Content-Type-Options': 'nosniff'
        }
    });
}

