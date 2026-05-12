/**
 * Studio Zero — in-memory Supabase mock for M2 Batch 2 Verify specs.
 *
 * Lightweight stand-in for `@supabase/supabase-js` SupabaseClient sufficient
 * for the surface the M2 Batch 1 Forge routes actually call:
 *
 *   - .from(table).insert(row)
 *   - .from(table).upsert(row, { onConflict })
 *   - .from(table).update(patch).eq(col, val)[.eq(col, val)]
 *   - .from(table).select(cols).eq(...).maybeSingle()
 *   - .from(table).select(cols).in(...).order(...).limit(...).maybeSingle()
 *   - .from(table).select(cols).filter(path, op, val).limit(N)
 *   - .from(table).delete().eq(col, val)
 *   - .rpc(name, args)
 *   - .auth.getUser()
 *
 * We do NOT execute real Postgres semantics. Instead the mock records every
 * write to a per-table array and lets tests inject the "row(s) the DB would
 * have returned" for the next read on a given (table, predicate) tuple.
 *
 * UNIQUE-constraint simulation: tests register a (table, column) pair as a
 * UNIQUE key; subsequent inserts that violate it surface a Postgres-shaped
 * 23505 error (matching what the real client returns) so the webhook
 * handler's duplicate-detection path is exercised.
 *
 * Idempotent for one test: clear() between describe blocks. Tests should
 * call `makeMockSupabase()` to mint a fresh instance per spec.
 */

interface FilterPredicate {
  kind: "eq" | "in" | "is" | "filter" | "gte" | "neq";
  col: string;
  val: unknown;
}

interface QueryState {
  table: string;
  cols: string;
  filters: FilterPredicate[];
  isCount?: boolean;
}

interface InsertedRow {
  table: string;
  row: Record<string, unknown>;
}

export interface DeletedRow {
  table: string;
  filters: FilterPredicate[];
}

export interface UpdatedRow {
  table: string;
  patch: Record<string, unknown>;
  filters: FilterPredicate[];
}

export interface MockSupabase {
  /** All recorded INSERT (and UPSERT-as-insert) writes. */
  inserts: InsertedRow[];
  /** All recorded UPSERTS (also pushed to `inserts`). */
  upserts: InsertedRow[];
  /** All recorded UPDATEs. */
  updates: UpdatedRow[];
  /** All recorded DELETEs. */
  deletes: DeletedRow[];
  /** RPC call log. */
  rpcs: Array<{ name: string; args: Record<string, unknown> | undefined }>;
  /** Stub responses to inject for `.maybeSingle()` reads, keyed on table. */
  readResponses: Map<string, unknown[]>;
  /** Stub responses for RPC calls. */
  rpcResponses: Map<string, unknown>;
  /** UNIQUE-constraint registrations: "table:column" → Set of seen values. */
  uniqueIndex: Map<string, Set<string>>;
  /** Auth.getUser stub. */
  authUser: {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null;
  /** Supabase-shaped client. */
  client: SupabaseLikeClient;
  /** Register a UNIQUE column so duplicate inserts hit 23505. */
  registerUnique(table: string, column: string): void;
  /** Push a read response for `.from(table).select(...).maybeSingle()`. */
  pushRead(table: string, row: unknown): void;
  /** Set an RPC return value. */
  setRpc(name: string, value: unknown): void;
  /** Set the auth.getUser() result. */
  setUser(u: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null): void;
  /** Reset all recorded calls + injected responses. */
  reset(): void;
}

// Use intentionally loose types — the real SupabaseClient surface is huge
// and these tests need a structural shape, not a nominal one.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLikeClient = any;

export function makeMockSupabase(): MockSupabase {
  const state: MockSupabase = {
    inserts: [],
    upserts: [],
    updates: [],
    deletes: [],
    rpcs: [],
    readResponses: new Map(),
    rpcResponses: new Map(),
    uniqueIndex: new Map(),
    authUser: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: {} as any,
    registerUnique(table, column) {
      state.uniqueIndex.set(`${table}:${column}`, new Set());
    },
    pushRead(table, row) {
      const arr = state.readResponses.get(table) ?? [];
      arr.push(row);
      state.readResponses.set(table, arr);
    },
    setRpc(name, value) {
      state.rpcResponses.set(name, value);
    },
    setUser(u) {
      state.authUser = u;
    },
    reset() {
      state.inserts = [];
      state.upserts = [];
      state.updates = [];
      state.deletes = [];
      state.rpcs = [];
      state.readResponses.clear();
      state.rpcResponses.clear();
      state.uniqueIndex.clear();
      state.authUser = null;
    },
  };

  function popRead(table: string): unknown {
    const arr = state.readResponses.get(table);
    if (!arr || arr.length === 0) return null;
    return arr.shift();
  }

  function makeQuery(qs: QueryState): QueryChain {
    const chain: QueryChain = {
      eq(col, val) {
        qs.filters.push({ kind: "eq", col, val });
        return chain;
      },
      in(col, vals) {
        qs.filters.push({ kind: "in", col, val: vals });
        return chain;
      },
      is(col, val) {
        qs.filters.push({ kind: "is", col, val });
        return chain;
      },
      gte(col, val) {
        qs.filters.push({ kind: "gte", col, val });
        return chain;
      },
      neq(col, val) {
        qs.filters.push({ kind: "neq", col, val });
        return chain;
      },
      filter(col, _op, val) {
        qs.filters.push({ kind: "filter", col, val });
        return chain;
      },
      order(_col, _opts) {
        return chain;
      },
      // .limit(n) returns a query chain (NOT a terminal promise) so callers
      // can do `.limit(1).maybeSingle()` (portal route). It is ALSO awaitable
      // directly via .then for the `.filter().limit(N)` pattern used in
      // reconcile — that path goes through chain.then below.
      limit(_n) {
        return chain;
      },
      async maybeSingle() {
        const row = popRead(qs.table);
        return { data: row, error: null };
      },
      async single() {
        const row = popRead(qs.table);
        if (!row) return { data: null, error: { code: "PGRST116", message: "no rows" } };
        return { data: row, error: null };
      },
      then(resolve, reject) {
        // bare-await on a select chain (no terminal call) → return rows
        const row = popRead(qs.table);
        const data = row === null ? [] : Array.isArray(row) ? row : [row];
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return chain;
  }

  const fromImpl = (table: string) => ({
    select(cols = "*") {
      return makeQuery({ table, cols, filters: [] });
    },
    insert(row: Record<string, unknown> | Record<string, unknown>[]) {
      const rows = Array.isArray(row) ? row : [row];
      for (const r of rows) {
        // Check UNIQUE constraints
        for (const [key, seen] of state.uniqueIndex.entries()) {
          const [t, col] = key.split(":");
          if (t === table) {
            const v = r[col];
            if (v !== undefined && v !== null) {
              const k = String(v);
              if (seen.has(k)) {
                return Promise.resolve({
                  data: null,
                  error: {
                    code: "23505",
                    message: `duplicate key value violates unique constraint "${table}_${col}_key"`,
                  },
                });
              }
              seen.add(k);
            }
          }
        }
        state.inserts.push({ table, row: r });
      }
      return Promise.resolve({ data: rows, error: null });
    },
    upsert(
      row: Record<string, unknown> | Record<string, unknown>[],
      _opts?: { onConflict?: string; ignoreDuplicates?: boolean },
    ) {
      const rows = Array.isArray(row) ? row : [row];
      for (const r of rows) {
        state.upserts.push({ table, row: r });
        state.inserts.push({ table, row: r });
      }
      return Promise.resolve({ data: rows, error: null });
    },
    update(patch: Record<string, unknown>) {
      const filters: FilterPredicate[] = [];
      // V1.5 Batch 1 (Forge): the GitHub webhook handler chains
      //   .update(patch).eq(...).like(...).select("...")
      // to retrieve the updated rows. We extend the mock chain with
      // `.like()` (records a filter so tests can assert on it) and
      // `.select()` (returns a thenable that resolves to the most
      // recently pushed read response, mirroring the real client).
      const chain: UpdateChain = {
        eq(col, val) {
          filters.push({ kind: "eq", col, val });
          return chain;
        },
        in(col, val) {
          filters.push({ kind: "in", col, val });
          return chain;
        },
        is(col, val) {
          filters.push({ kind: "is", col, val });
          return chain;
        },
        like(col, val) {
          filters.push({ kind: "filter", col, val });
          return chain;
        },
        select(_cols) {
          // Record the update on terminal access.
          state.updates.push({ table, patch, filters });
          const selectChain: {
            then(
              r: (v: { data: unknown[]; error: unknown }) => unknown,
              j?: (e: unknown) => unknown,
            ): Promise<unknown>;
          } = {
            then(resolve, reject) {
              const row = popRead(table);
              const data = row === null ? [] : Array.isArray(row) ? row : [row];
              return Promise.resolve({ data, error: null }).then(resolve, reject);
            },
          };
          return selectChain as never;
        },
        then(resolve, reject) {
          state.updates.push({ table, patch, filters });
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        },
      };
      return chain;
    },
    delete() {
      const filters: FilterPredicate[] = [];
      const chain: DeleteChain = {
        eq(col, val) {
          filters.push({ kind: "eq", col, val });
          return chain;
        },
        then(resolve, reject) {
          state.deletes.push({ table, filters });
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        },
      };
      return chain;
    },
  });

  state.client.from = fromImpl;
  state.client.rpc = (name: string, args?: Record<string, unknown>) => {
    state.rpcs.push({ name, args });
    if (state.rpcResponses.has(name)) {
      return Promise.resolve({ data: state.rpcResponses.get(name), error: null });
    }
    return Promise.resolve({ data: null, error: null });
  };
  state.client.auth = {
    async getUser() {
      if (state.authUser) {
        return { data: { user: state.authUser }, error: null };
      }
      return { data: { user: null }, error: { message: "not_authenticated" } };
    },
  };

  return state;
}

interface QueryChain {
  eq(col: string, val: unknown): QueryChain;
  in(col: string, val: unknown[]): QueryChain;
  is(col: string, val: unknown): QueryChain;
  gte(col: string, val: unknown): QueryChain;
  neq(col: string, val: unknown): QueryChain;
  filter(col: string, op: string, val: unknown): QueryChain;
  order(col: string, opts?: unknown): QueryChain;
  limit(n: number): Promise<{ data: unknown[]; error: unknown }>;
  maybeSingle(): Promise<{ data: unknown; error: unknown }>;
  single(): Promise<{ data: unknown; error: unknown }>;
  then(resolve: (v: { data: unknown[]; error: unknown }) => unknown, reject?: (e: unknown) => unknown): Promise<unknown>;
}

interface UpdateChain {
  eq(col: string, val: unknown): UpdateChain;
  in(col: string, val: unknown[]): UpdateChain;
  is(col: string, val: unknown): UpdateChain;
  like(col: string, val: unknown): UpdateChain;
  select(cols: string): { then: (r: (v: { data: unknown[]; error: unknown }) => unknown, j?: (e: unknown) => unknown) => Promise<unknown> };
  then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown): Promise<unknown>;
}

interface DeleteChain {
  eq(col: string, val: unknown): DeleteChain;
  then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown): Promise<unknown>;
}
