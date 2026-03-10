import { vi } from "vitest";

type QueryOperation = "select" | "insert" | "update" | "delete" | "upsert";
type TerminalMethod = "single" | "maybeSingle" | "returns" | "execute";

type QueryState = {
  table: string;
  operation: QueryOperation;
  payload?: unknown;
  selectArgs?: unknown[];
  filters: Array<{ type: "eq" | "in" | "or"; column?: string; value?: unknown; values?: unknown[]; expression?: string }>;
  orderBy: Array<{ column: string; options?: unknown }>;
  limitValue?: number;
};

type QueryResult = {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
};

type QueryHandler = QueryResult | ((state: QueryState, terminal: TerminalMethod) => QueryResult | Promise<QueryResult>);

const normalizeResult = (result: QueryResult | undefined) => ({
  data: result?.data ?? null,
  error: result?.error ?? null,
  count: result?.count,
});

class MockQueryBuilder {
  constructor(
    private readonly state: QueryState,
    private readonly resolveHandler: (state: QueryState, terminal: TerminalMethod) => Promise<QueryResult>,
  ) {}

  select(...args: unknown[]) {
    if (this.state.operation === "select") {
      this.state.operation = "select";
    }
    this.state.selectArgs = args;
    return this;
  }

  insert(payload: unknown) {
    this.state.operation = "insert";
    this.state.payload = payload;
    return this;
  }

  update(payload: unknown) {
    this.state.operation = "update";
    this.state.payload = payload;
    return this;
  }

  delete() {
    this.state.operation = "delete";
    return this;
  }

  upsert(payload: unknown) {
    this.state.operation = "upsert";
    this.state.payload = payload;
    return this;
  }

  eq(column: string, value: unknown) {
    this.state.filters.push({ type: "eq", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.state.filters.push({ type: "in", column, values });
    return this;
  }

  or(expression: string) {
    this.state.filters.push({ type: "or", expression });
    return this;
  }

  order(column: string, options?: unknown) {
    this.state.orderBy.push({ column, options });
    return this;
  }

  limit(value: number) {
    this.state.limitValue = value;
    return this;
  }

  single<T>() {
    return this.resolve<T>("single");
  }

  maybeSingle<T>() {
    return this.resolve<T>("maybeSingle");
  }

  returns<T>() {
    return this.resolve<T>("returns");
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.resolve("execute").then(onfulfilled, onrejected);
  }

  private async resolve<T>(terminal: TerminalMethod) {
    const result = await this.resolveHandler(this.state, terminal);
    return normalizeResult(result) as { data: T | null; error: { message: string } | null; count?: number | null };
  }
}

export const createMockSupabase = () => {
  const handlers = new Map<string, QueryHandler[]>();
  const calls: QueryState[] = [];

  const resolveHandler = async (state: QueryState, terminal: TerminalMethod) => {
    calls.push({
      ...state,
      filters: [...state.filters],
      orderBy: [...state.orderBy],
    });
    const key = `${state.table}:${state.operation}`;
    const queue = handlers.get(key);
    const next = queue?.shift();

    if (!next) {
      return {};
    }

    if (typeof next === "function") {
      return next(state, terminal);
    }

    return next;
  };

  const from = (table: string) =>
    new MockQueryBuilder(
      {
        table,
        operation: "select",
        filters: [],
        orderBy: [],
      },
      resolveHandler,
    );

  return {
    supabaseAdmin: {
      from,
      auth: {
        admin: {
          createUser: vi.fn(),
          signOut: vi.fn(),
          getUserById: vi.fn(),
        },
      },
    },
    supabaseAuthClient: {
      auth: {
        signInWithPassword: vi.fn(),
        getUser: vi.fn(),
      },
    },
    queueResult(table: string, operation: QueryOperation, result: QueryHandler) {
      const key = `${table}:${operation}`;
      handlers.set(key, [...(handlers.get(key) ?? []), result]);
    },
    getCalls(table?: string, operation?: QueryOperation) {
      return calls.filter((call) => (!table || call.table === table) && (!operation || call.operation === operation));
    },
    reset() {
      handlers.clear();
      calls.length = 0;
      vi.clearAllMocks();
    },
  };
};

export type MockSupabase = ReturnType<typeof createMockSupabase>;
