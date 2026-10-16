/**
 * In-memory mock of the Supabase API surface El Libro Gordo touches
 * (PostgREST subset + GoTrue /user + the project's RPCs), for local e2e runs
 * of the import wizard without real credentials. Fake data only.
 *
 * Run: node e2e/mock-supabase.mjs  (listens on 127.0.0.1:4545)
 * Introspection: GET /__state  ·  POST /__reset
 */
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.MOCK_PORT || 4545);
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export const OWNER_ID = "11111111-1111-4111-8111-111111111111";

function freshDb() {
  return {
    users: [
      {
        id: OWNER_ID,
        email: "owner@example.com",
        full_name: "Prueba Owner",
        role: "owner",
        totp_enabled: true,
        active: true,
        created_at: now(),
        updated_at: now(),
      },
    ],
    import_batches: [],
    import_mappings: [],
    households: [],
    clients: [],
    policies: [],
    carriers: [],
    tasks: [],
    audit_log: [],
    notes: [],
    documents: [],
    messages: [],
    verification_responses: [],
  };
}
let db = freshDb();
let payloads = new Map(); // batchId -> { payload, expiresAt }

// ---------------------------------------------------------------------------
// PostgREST query helpers
// ---------------------------------------------------------------------------

function matches(row, key, expr) {
  if (expr.startsWith("eq.")) return String(row[key]) === expr.slice(3);
  if (expr.startsWith("gte.")) return String(row[key] ?? "") >= expr.slice(4);
  if (expr.startsWith("lte.")) return String(row[key] ?? "") <= expr.slice(4);
  if (expr.startsWith("in.")) {
    const list = expr.slice(4, -1).split(",").map((s) => s.replace(/^"|"$/g, ""));
    return list.includes(String(row[key]));
  }
  if (expr === "is.null") return row[key] == null;
  if (expr === "not.is.null") return row[key] != null;
  if (expr.startsWith("ilike.")) {
    const pat = expr.slice(6).replace(/[*%]/g, "");
    return String(row[key] ?? "").toLowerCase().includes(pat.toLowerCase());
  }
  if (expr.startsWith("neq.")) return String(row[key]) !== expr.slice(4);
  return true;
}

function applyFilters(rows, params) {
  let out = rows;
  for (const [key, expr] of params.entries()) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns", "or"].includes(key)) continue;
    out = out.filter((r) => matches(r, key, expr));
  }
  const order = params.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    const sign = dir === "desc" ? -1 : 1;
    out = [...out].sort((a, b) => (String(a[col] ?? "") < String(b[col] ?? "") ? -sign : sign));
  }
  const limit = params.get("limit");
  if (limit) out = out.slice(0, Number(limit));
  return out;
}

/** Attach the handful of embeds the app actually uses. */
function withEmbeds(table, rows, select) {
  if (!select) return rows;
  return rows.map((row) => {
    const out = { ...row };
    if (table === "clients" && select.includes("households!clients_household_id_fkey(")) {
      out.households = db.households.find((h) => h.id === row.household_id) ?? null;
    }
    if (table === "import_batches" && select.includes("users!import_batches_uploaded_by_fkey(")) {
      out.users = db.users.find((u) => u.id === row.uploaded_by) ?? null;
    }
    if (table === "policies" && select.includes("carriers(")) {
      out.carriers = db.carriers.find((c) => c.id === row.carrier_id) ?? null;
    }
    if (table === "tasks" && select.includes("users(")) {
      out.users = db.users.find((u) => u.id === row.assigned_to) ?? null;
    }
    if (table === "notes" && select.includes("users(")) {
      out.users = db.users.find((u) => u.id === row.author_id) ?? null;
    }
    return out;
  });
}

// ---------------------------------------------------------------------------
// RPCs — faithful to supabase/migrations behavior at the API level
// ---------------------------------------------------------------------------

const rpcs = {
  import_cleanup_expired: () => ({ status: 204 }),
  import_stash_payload: (args) => {
    const batch = db.import_batches.find((b) => b.id === args.p_batch_id);
    if (!batch) return { status: 400, body: { code: "P0001", message: "batch not found" } };
    payloads.set(args.p_batch_id, { payload: args.p_payload, expiresAt: Date.now() + 30 * 60e3 });
    batch.expires_at = new Date(Date.now() + 30 * 60e3).toISOString();
    batch.payload_encrypted = "ENC"; // marker only; mock never stores a real key
    return { status: 204 };
  },
  import_read_payload: (args) => {
    const stash = payloads.get(args.p_batch_id);
    if (!stash || stash.expiresAt < Date.now()) {
      return { status: 400, body: { code: "P0001", message: "batch expired" } };
    }
    return { status: 200, body: stash.payload };
  },
  log_audit: (args) => {
    db.audit_log.push({ id: uuid(), action: args.p_action, entity_type: args.p_entity_type, occurred_at: now() });
    return { status: 204 };
  },
  set_client_ssn_admin: (args) => {
    const client = db.clients.find((c) => c.id === args.p_client_id);
    if (!client) return { status: 400, body: { code: "P0001", message: "not found" } };
    const digits = String(args.p_ssn).replace(/\D/g, "");
    if (digits.length !== 9) return { status: 400, body: { code: "P0001", message: "SSN must be 9 digits" } };
    client.ssn_last4 = digits.slice(-4);
    client.updated_at = now();
    return { status: 204 };
  },
  search_clients: (args) => {
    const q = String(args.q ?? "").toLowerCase();
    const rows = db.clients
      .filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(q))
      .map((c) => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        dob: c.dob,
        phone: c.phone,
        email: c.email,
        status: c.status,
        household_id: c.household_id,
        household_name: db.households.find((h) => h.id === c.household_id)?.household_name ?? "",
        rank: 1,
      }));
    return { status: 200, body: rows };
  },
  admin_undo_import: (args) => {
    const batch = db.import_batches.find((b) => b.id === args.p_batch_id);
    if (!batch) return { status: 400, body: { code: "P0001", message: "import not found" } };
    if (batch.status !== "imported") {
      return { status: 400, body: { code: "P0001", message: `this import cannot be undone (status: ${batch.status})` } };
    }
    const cut = (table) => {
      const before = db[table].length;
      db[table] = db[table].filter((r) => r.import_batch_id !== args.p_batch_id);
      return before - db[table].length;
    };
    const counts = { policies: cut("policies"), clients: cut("clients"), households: cut("households"), carriers: cut("carriers") };
    batch.status = "undone";
    batch.undone_at = now();
    db.audit_log.push({ id: uuid(), action: "import_undone", entity_type: "import_batch", occurred_at: now() });
    return { status: 200, body: counts };
  },
};

// Simulate one missing function (e.g. migration ran partially):
const DISABLED_RPCS = new Set((process.env.MOCK_DISABLE_RPCS ?? "").split(",").filter(Boolean));

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

function send(res, status, body, headers = {}) {
  const data = body == null ? "" : JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(raw ? JSON.parse(raw) : null);
      } catch {
        resolve(null);
      }
    });
  });
}

function decodeJwt(req) {
  const auth = req.headers.authorization ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  const log = (msg) => console.log(`[mock] ${req.method} ${path} ${msg}`);

  // --- harness introspection
  if (path === "/__state") return send(res, 200, { db, payloads: [...payloads.keys()] });
  if (path === "/__reset") {
    db = freshDb();
    payloads = new Map();
    return send(res, 200, { ok: true });
  }

  // --- GoTrue
  if (path === "/auth/v1/user") {
    const claims = decodeJwt(req);
    if (!claims) return send(res, 401, { message: "invalid token" });
    return send(res, 200, {
      id: claims.sub,
      aud: "authenticated",
      role: "authenticated",
      email: claims.email,
      email_confirmed_at: now(),
      app_metadata: { provider: "email" },
      user_metadata: {},
      factors: [{ id: uuid(), factor_type: "totp", status: "verified" }],
      created_at: now(),
      updated_at: now(),
    });
  }
  if (path === "/auth/v1/token") {
    return send(res, 200, {});
  }

  // --- RPCs
  if (path.startsWith("/rest/v1/rpc/")) {
    const name = path.slice("/rest/v1/rpc/".length);
    const args = (await readBody(req)) ?? {};
    if (DISABLED_RPCS.has(name) || !rpcs[name]) {
      log(`→ 404 (no function ${name})`);
      return send(res, 404, {
        code: "PGRST202",
        message: `Could not find the function public.${name} in the schema cache`,
      });
    }
    const result = rpcs[name](args);
    log(`→ ${result.status}`);
    return send(res, result.status, result.body ?? null);
  }

  // --- PostgREST tables
  if (path.startsWith("/rest/v1/")) {
    const table = path.slice("/rest/v1/".length);
    if (!(table in db)) return send(res, 404, { code: "42P01", message: `relation "${table}" does not exist` });
    const params = url.searchParams;
    const prefer = req.headers.prefer ?? "";
    const accept = req.headers.accept ?? "";
    const wantsSingle = accept.includes("vnd.pgrst.object");

    if (req.method === "GET" || req.method === "HEAD") {
      const rows = withEmbeds(table, applyFilters(db[table], params), params.get("select"));
      const headers = {};
      if (prefer.includes("count=exact")) headers["content-range"] = `0-${Math.max(rows.length - 1, 0)}/${rows.length}`;
      if (req.method === "HEAD") {
        res.writeHead(200, { "content-type": "application/json", ...headers });
        return res.end();
      }
      if (wantsSingle) {
        if (rows.length !== 1) {
          log(`→ 406 (${rows.length} rows for single)`);
          return send(res, 406, {
            code: "PGRST116",
            details: `The result contains ${rows.length} rows`,
            message: "JSON object requested, multiple (or no) rows returned",
          });
        }
        log("→ 200 single");
        return send(res, 200, rows[0], headers);
      }
      log(`→ 200 (${rows.length})`);
      return send(res, 200, rows, headers);
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const inserts = (Array.isArray(body) ? body : [body]).map((r) => ({
        id: uuid(),
        created_at: now(),
        updated_at: now(),
        ...r,
      }));
      db[table].push(...inserts);
      log(`→ 201 (+${inserts.length})`);
      if (wantsSingle) return send(res, 201, inserts[0]);
      return send(res, 201, prefer.includes("return=representation") ? inserts : null);
    }

    if (req.method === "PATCH") {
      const body = await readBody(req);
      const targets = applyFilters(db[table], params);
      for (const row of targets) Object.assign(row, body, { updated_at: now() });
      log(`→ 200 (~${targets.length})`);
      if (wantsSingle) {
        if (targets.length !== 1) {
          return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" });
        }
        return send(res, 200, targets[0]);
      }
      return send(res, prefer.includes("return=representation") ? 200 : 204,
        prefer.includes("return=representation") ? targets : null);
    }

    if (req.method === "DELETE") {
      const targets = new Set(applyFilters(db[table], params).map((r) => r.id));
      const before = db[table].length;
      db[table] = db[table].filter((r) => !targets.has(r.id));
      log(`→ 204 (-${before - db[table].length})`);
      return send(res, 204, null);
    }
  }

  send(res, 404, { message: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock] Supabase mock listening on http://127.0.0.1:${PORT}` +
    (DISABLED_RPCS.size ? ` (disabled RPCs: ${[...DISABLED_RPCS].join(",")})` : ""));
});
