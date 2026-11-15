import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const readSql = (name) =>
  readFile(new URL(`../scripts/sql/bookmarks/${name}.sql`, import.meta.url), "utf8");
const [fixture, prepare, verify, audit] = await Promise.all([
  readSql("00-local-fixture"),
  readSql("02-prepare"),
  readSql("03-verify-local"),
  readSql("01-audit"),
]);

async function withDatabase(run) {
  const db = new PGlite();
  try {
    await db.exec(fixture);
    await run(db);
  } finally {
    await db.close();
  }
}

test("실제 PostgreSQL에서 RLS·중복·외래키·반복 삭제·cascade·rollback 검증", async () => {
  await withDatabase(async (db) => {
    await db.exec(prepare);
    await db.exec(verify);
    // 이미 적용된 DB에서도 다시 실행할 수 있어야 한다.
    await db.exec(prepare);
    await db.exec(verify);
    await db.exec(audit);
  });
});

test("한꺼번에 요청한 동일 북마크 저장은 한 행만 생성", async () => {
  await withDatabase(async (db) => {
    await db.exec(prepare);
    await db.exec("SET ROLE authenticated; SET request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';");
    // PGlite는 단일 연결로 직렬 실행한다. 다중 연결 경쟁 테스트를 대신하지 않는다.
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => db.query(
        "INSERT INTO public.bookmarks (user_id, blog_id) VALUES (auth.uid(), 1) ON CONFLICT (user_id, blog_id) DO NOTHING RETURNING id",
      )),
    );
    assert.equal(responses.reduce((count, result) => count + result.rows.length, 0), 1);
    const result = await db.query("SELECT count(*)::int AS count FROM public.bookmarks");
    assert.equal(result.rows[0].count, 1);
  });
});

test("중복 데이터가 있으면 삭제하지 않고 준비 작업 전체를 취소", async () => {
  await withDatabase(async (db) => {
    await db.exec("INSERT INTO public.bookmarks (user_id, blog_id) VALUES ('00000000-0000-4000-8000-000000000002', 2)");
    await assert.rejects(db.exec(prepare), /중복 북마크/);
    await db.exec("ROLLBACK");
    const rows = await db.query("SELECT count(*)::int AS count FROM public.bookmarks");
    assert.equal(rows.rows[0].count, 2);
    const constraints = await db.query("SELECT conname FROM pg_constraint WHERE conrelid = 'public.bookmarks'::regclass AND contype IN ('u', 'f')");
    assert.deepEqual(constraints.rows, []);
  });
});

test("알 수 없는 허용 정책은 그대로 남기되 마이그레이션을 중단", async () => {
  await withDatabase(async (db) => {
    await db.exec("CREATE POLICY unsafe_legacy_policy ON public.bookmarks FOR SELECT TO authenticated USING (true)");
    await assert.rejects(db.exec(prepare), /기존 북마크 RLS 정책/);
    await db.exec("ROLLBACK");
    const policies = await db.query("SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookmarks'");
    assert.deepEqual(policies.rows, [{ policyname: "unsafe_legacy_policy" }]);
  });
});

test("존재하지 않는 참조는 자동 삭제하지 않고 중단", async () => {
  await withDatabase(async (db) => {
    await db.exec("INSERT INTO public.bookmarks (user_id, blog_id) VALUES ('00000000-0000-4000-8000-000000000001', 99999)");
    await assert.rejects(db.exec(prepare), /존재하지 않는 사용자\/글/);
    await db.exec("ROLLBACK");
    const result = await db.query("SELECT count(*)::int AS count FROM public.bookmarks WHERE blog_id = 99999");
    assert.equal(result.rows[0].count, 1);
  });
});

test("서로 다른 blog_id 형식은 데이터 형변환 없이 중단", async () => {
  await withDatabase(async (db) => {
    await db.exec("ALTER TABLE public.bookmarks ALTER COLUMN blog_id TYPE bigint");
    await assert.rejects(db.exec(prepare), /지원 구조/);
    await db.exec("ROLLBACK");
    const result = await db.query("SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookmarks' AND column_name = 'blog_id'");
    assert.equal(result.rows[0].data_type, "bigint");
  });
});

test("예상과 다른 기존 외래키가 있으면 앞서 만든 유일 제약도 rollback", async () => {
  await withDatabase(async (db) => {
    await db.exec("ALTER TABLE public.bookmarks ADD CONSTRAINT legacy_blog_fk FOREIGN KEY (blog_id) REFERENCES public.blogs(id)");
    await assert.rejects(db.exec(prepare), /기존 외래키/);
    await db.exec("ROLLBACK");
    const constraints = await db.query("SELECT conname FROM pg_constraint WHERE conrelid = 'public.bookmarks'::regclass AND contype IN ('u', 'f')");
    assert.deepEqual(constraints.rows, [{ conname: "legacy_blog_fk" }]);
  });
});
