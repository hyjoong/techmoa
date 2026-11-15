# 북마크부터 백엔드 배우기

이번 단계의 목표는 기존 북마크를 `화면 → Next.js API → Supabase PostgreSQL` 흐름으로 옮기는 것이다. 로그인과 DB는 그대로 활용한다. 별도 유료 서버를 만들지 않지만 기존 Vercel/Supabase 이용 조건과 사용량 한도는 적용된다. 읽음 표시와 메모는 다음 과제다.

## 이번에 바뀌는 책임

웹 클라이언트가 북마크 테이블을 직접 조회/수정하던 일을 서버로 옮긴다. 클라이언트는 현재 세션의 access token을 `Authorization: Bearer <token>`으로 전달한다. 서버는 Supabase Auth로 토큰을 검증하고, 검증 결과의 사용자 ID로만 DB에 접근한다. 클라이언트가 넘긴 `user_id`를 신뢰하지 않는다.

요청 처리와 DB 접근을 분리하되 이번 단계의 저장소 구현은 사용자 토큰을 설정한 Supabase JS 클라이언트다. 별도 SQL 드라이버나 service-role 키를 쓰지 않으므로 **DB의 RLS도 계속 적용**된다. 브라우저에서 Supabase에 직접 접근하더라도 같은 격리가 적용돼야 한다. API에서만 사용자를 검사하고 DB를 공개해두는 것으로는 충분하지 않다.

Flutter WebView의 저장/삭제/상태 확인은 기존 앱 브리지를 유지한다. 웹 로그인과 앱의 별도 북마크 저장소를 합치는 작업은 하지 않는다.

| 요청 | 응답 | 의미 |
| --- | --- | --- |
| `GET /api/me/bookmarks?offset=0&limit=100` | `{ blogs, nextOffset }` | 내 북마크와 글 정보. 저장 시간 내림차순, ID로 동률 정렬 |
| `GET /api/me/bookmarks/ids?offset=0&limit=100` | `{ ids, nextOffset }` | 메인 목록 버튼에 표시할 내 북마크 글 ID |
| `PUT /api/me/bookmarks/:blogId` | `{ bookmark }` | 이미 저장했어도 같은 북마크 반환 |
| `DELETE /api/me/bookmarks/:blogId` | 본문 없는 `204` | 이미 없어도 성공 |

`nextOffset`이 있으면 다음 페이지를 요청하고, `null`이면 끝이다. 빈 페이지에서 종료하므로 마지막에 추가 요청이 한 번 발생할 수 있다. API의 페이지 크기는 제한된다. 인증 실패는 `401`, 잘못된 입력은 `400`이며, 토큰과 개인 북마크를 로그에 남기지 않는다. 기존 화면 검색은 모든 페이지를 가져온 결과를 대상으로 한다.

## 먼저 로컬 DB 규칙을 확인하기

Docker 없이도 PGlite의 PostgreSQL 엔진에서 같은 준비 SQL을 실행할 수 있다. 다음 테스트는 임시 메모리 DB만 쓰며 환경 파일이나 운영 DB 연결 정보가 필요 없다.

```bash
pnpm install
node --test tests/bookmark-db.test.mjs
```

테스트는 두 사용자를 만든 뒤 A/B 조회·입력·삭제 격리, 익명 접근 차단, 중복 저장, 반복 삭제, 잘못된 글 참조, 사용자/글 삭제 시 cascade, 테스트 후 rollback을 확인한다. 중복 데이터·알 수 없는 기존 정책·형식 불일치·예상과 다른 외래키가 있으면 준비 작업이 실패하고 기존 데이터가 유지되는지도 검사한다. PGlite는 단일 연결이므로 여기서 동시에 호출한 저장 요청은 내부적으로 직렬 처리된다. 별도 연결이 경쟁하는 운영 DB 부하 테스트나 Supabase Auth 검증을 대신하지 않는다.

직접 SQL을 바꿔보고 싶다면 별도의 빈 PostgreSQL DB에서 아래 순서로 실행한다. `00-local-fixture.sql`은 작은 학습용 `blogs`, `auth.users`, `bookmarks`를 만든다. 실제 서비스의 전체 스키마나 Supabase Auth를 복제한 것은 아니다. 운영 DB에는 실행하지 않는다.

```bash
# Docker가 실행 중일 때만 필요하다. 로컬 접속만 허용하는 폐기용 DB다.
docker run --name techmoa-bookmark-lab -e POSTGRES_PASSWORD=local-only -e POSTGRES_DB=bookmark_lab -p 127.0.0.1:55432:5432 -d postgres:17
docker exec techmoa-bookmark-lab pg_isready -U postgres -d bookmark_lab
# accepting connections가 나온 뒤 순서대로 실행한다.
docker exec -i techmoa-bookmark-lab psql -U postgres -d bookmark_lab -v ON_ERROR_STOP=1 < scripts/sql/bookmarks/00-local-fixture.sql
docker exec -i techmoa-bookmark-lab psql -U postgres -d bookmark_lab -v ON_ERROR_STOP=1 < scripts/sql/bookmarks/02-prepare.sql
docker exec -i techmoa-bookmark-lab psql -U postgres -d bookmark_lab -v ON_ERROR_STOP=1 < scripts/sql/bookmarks/03-verify-local.sql
docker exec -it techmoa-bookmark-lab psql -U postgres -d bookmark_lab
```

마지막 명령으로 들어간 SQL 콘솔에서 직접 확인한다.

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
SELECT * FROM public.bookmarks; -- B의 북마크는 보이지 않는다.
INSERT INTO public.bookmarks (user_id, blog_id) VALUES (auth.uid(), 1);
INSERT INTO public.bookmarks (user_id, blog_id) VALUES (auth.uid(), 1); -- 유일 제약 오류
ROLLBACK; -- 오류 난 트랜잭션을 끝내고 원래 상태로 돌아간다.
```

로컬 fixture에서는 DB 세션에 설정한 사용자 ID를 `auth.uid()`가 읽는다. 실제 Supabase에서는 검증된 JWT에서 사용자 ID를 읽으므로 클라이언트가 임의로 사용자 ID를 선택하는 방식과 다르다.

## 기존 Supabase DB 적용 순서

저장소에는 실제 북마크 테이블의 전체 생성 이력이 없으며, **운영 DB 구조/데이터/정책을 아직 확인하지 않았다.** 아래 SQL은 적용 준비 파일이다. `CLAUDE.md`에 따라 SQL Editor에서 수동 실행하며 앱 시작이나 빌드 시 자동 실행하지 않는다. 기존 웹 클라이언트가 지원되지 않는 DB 구조에 연결되기 전에 준비를 마쳐야 한다.

1. `01-audit.sql`을 읽고 SQL Editor에서 실행한다. 열·제약·인덱스·RLS 정책·권한과 집계 숫자를 확인한다. 행의 사용자 ID나 글 내용은 출력하지 않는다. `bookmarks`, `blogs`, `auth.users`가 없다면 마지막 집계를 실행하지 말고 실제 구조를 먼저 확인한다.
2. 기존 데이터와 정책 정의를 백업한다. 아래 전제와 다르면 운영 테이블을 자동으로 형변환하거나 삭제하지 않고 별도의 보정 내용을 결정한다.
3. 기존 정책을 검토한다. 준비 SQL이 관리하는 `bookmarks_api_select_own`, `bookmarks_api_insert_own`, `bookmarks_api_delete_own` 외의 정책이 있으면 적용을 중단한다. 안전한 기존 정책이어도 검토가 필요하다. 모르는 permissive 정책을 남기면 `OR` 결합 때문에 새 정책의 사용자 격리가 무효화될 수 있다. 교체가 필요하면 해당 정책의 정확한 이름/정의를 기록하고 검토한 `DROP POLICY`와 준비 SQL을 **같은 트랜잭션 안에서** 실행한다. 정책을 일괄 삭제하지 않는다.
4. `02-prepare.sql`을 수동 적용한다. 중복·NULL·잘못된 참조는 원인을 확인한 뒤 별도로 보정한다. 스크립트는 기존 행을 삭제하지 않는다. 잠금 대기 5초/실행 60초를 넘으면 중단하므로 사용량이 적을 때 진행한다.
5. 다시 감사 SQL을 실행하고 별도 테스트 계정 두 개로 API를 확인한다. 사용자 A 토큰으로 사용자 B 데이터가 보이지 않는지, 중복 저장과 반복 삭제가 성공하는지 확인한다. 앱 WebView의 저장/삭제도 별도로 확인한 후 전환한다.

준비 SQL의 전제는 다음과 같다.

- `bookmarks.id`: 기본값과 단일 열 PK가 있는 UUID. `user_id`: UUID. `created_at`: timestamptz.
- `bookmarks.blog_id`: `blogs.id`와 정확히 같은 integer/bigint 형식. 사용자와 글은 이미 존재한다.
- API가 입력하지 않는 추가 필수 열에는 기본값이 있어야 한다.
- `(user_id, blog_id)`는 즉시 검사하는 유일 제약. 중복 요청의 마지막 방어선이다.
- `user_id → auth.users.id`, `blog_id → blogs.id`는 검증된 단일 열 외래키와 `ON DELETE CASCADE`. 기존 참조 규칙이 다르면 자동 교체하지 않는다.
- `authenticated` 역할은 DB 소유자·superuser·BYPASSRLS 역할이 아니어야 한다. 공개 읽기 가능한 글의 기존 접근 정책도 유지돼야 JOIN 조회가 가능하다.

SQL은 유일 제약·외래키·NOT NULL·목록 인덱스와 사용자별 SELECT/INSERT/DELETE 정책을 준비한다. UPDATE 정책은 만들지 않는다. 기존 사용자의 ID, 글 ID, 북마크 ID는 바꾸지 않는다. 스크립트 실패 시 트랜잭션 전체가 취소된다. 앱 전환에 문제가 생기면 먼저 이전 앱 버전으로 되돌리고, 새 제약/정책을 무작정 제거하지 않는다.

## 학습 순서

1. **오늘:** 로컬 SQL 테스트를 실행하고 위 콘솔 예제의 사용자 ID를 B로 바꿔본다. `WHERE user_id = ...`와 RLS가 각각 어디서 동작하는지 설명해본다.
2. **조회:** 토큰 검증 → 사용자 ID 결정 → DB 필터 → 페이지 응답을 코드에서 따라간다. 로그인 없는 요청이 DB까지 가지 않는지 확인한다.
3. **저장/삭제:** 미리 SELECT하는 것만으로 중복 저장을 막을 수 없는 이유와 유일 제약 충돌 후 기존 행을 읽는 이유를 확인한다. DELETE를 반복해도 성공하는 이유를 설명해본다.
4. **화면/운영:** 저장 도중 로그아웃하거나 계정을 바꿔보고 이전 계정의 결과가 화면을 덮지 않는지 확인한다. API 실패 때 버튼이 원상 복구되는지도 본다.

이 흐름을 설명하고 직접 수정할 수 있게 된 뒤 `read_at`과 안 읽은 글 필터를 다음 과제로 진행한다.
