# 기여 가이드라인

Techmoa 프로젝트에 기여해주셔서 감사합니다! 🎉

## 🚀 빠른 시작

1. [Fork](https://github.com/hyjoong/techmoa/fork) the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 새로운 블로그 추가하기

가장 일반적인 기여 방법은 새로운 기술 블로그를 추가하는 것입니다.

### 1. RSS 피드 확인

먼저 추가하고 싶은 블로그의 RSS 피드 URL을 확인해주세요:

#### 일반적인 RSS 피드

- **RSS**: `https://blog.example.com/rss.xml`
- **Atom**: `https://blog.example.com/atom.xml`
- **Feed**: `https://blog.example.com/feed/`

#### 플랫폼별 RSS 피드

- **Medium**: `https://medium.com/feed/@username`
- **Velog**: `https://api.velog.io/rss/@username`
- **Tistory**: `https://blog.tistory.com/rss`
- **GitHub Pages**: `https://username.github.io/feed.xml`

### 2. RSS 피드 테스트

RSS 피드가 정상적으로 작동하는지 확인:

```bash
# curl로 RSS 피드 확인
curl -I https://blog.example.com/rss.xml

# 또는 브라우저에서 직접 접속
# https://blog.example.com/rss.xml
```

### 3. 코드 수정

`scripts/rss-crawler.js` 파일을 열고 `RSS_FEEDS` 배열에 추가:

```javascript
// 기업 블로그 추가 예시
{
  name: "회사명 블로그",
  url: "https://blog.example.com/rss.xml",
  type: "company"
},

// 개인 블로그 추가 예시
{
  name: "개발자명님 블로그",
  url: "https://api.velog.io/rss/@username",
  type: "personal"
},
```

### 4. 로컬 테스트

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 Supabase 정보 입력

# RSS 크롤러 테스트
node scripts/rss-crawler.js

# RSS 피드 유효성 검사 (추천!)
pnpm run validate-rss
```

### 5. CI/CD 검증

PR을 올리면 자동으로 다음 검사가 실행됩니다:

#### 🔍 RSS 피드 유효성 검사

- 모든 RSS 피드의 접근 가능성 확인
- XML 구조 유효성 검사
- Content-Type 검증
- 실패한 피드가 있으면 PR이 자동으로 실패

#### 📝 코드 품질 검사

- ESLint 규칙 준수 확인
- Prettier 포맷팅 검사
- TypeScript 타입 체크
- console.log 문 검사

#### 🏗️ 빌드 테스트

- Next.js 빌드 성공 여부 확인
- RSS 크롤러 문법 검사
- RSS_FEEDS 배열 구조 검증

### 6. PR 작성

#### 간단한 PR 템플릿

PR을 생성하면 자동으로 간단한 템플릿이 적용됩니다. 블로그 정보만 입력하면 됩니다!

#### PR 제목 형식

```
feat: Add [블로그명] to RSS crawler
```

#### PR 설명에 포함할 내용

```markdown
## 추가된 블로그 정보

- **블로그명**: [블로그명]
- **블로그 URL**: [블로그 URL]
- **RSS 피드**: [RSS 피드 URL]
- **블로그 타입**: [company/personal]

## 테스트 결과

- [x] RSS 피드 정상 작동 확인
- [x] 크롤러 테스트 완료
- [x] 데이터 정상 수집 확인

## 체크리스트

- [ ] RSS 피드가 정상적으로 작동하는지 확인
- [ ] 블로그 타입이 올바르게 설정되었는지 확인
- [ ] 블로그명이 명확하고 구분하기 쉬운지 확인
- [ ] 중복된 블로그가 아닌지 확인
```

## 🐛 버그 리포트

버그를 발견하셨다면 [GitHub Issues](https://github.com/hyjoong/techmoa/issues)에 등록해주세요.

### 버그 리포트 형식

```markdown
## 버그 설명

[버그에 대한 간단한 설명]

## 재현 방법

1. [단계 1]
2. [단계 2]
3. [단계 3]

## 예상 동작

[정상적으로 동작했을 때의 결과]

## 실제 동작

[실제로 발생한 결과]

## 환경 정보

- OS: [운영체제]
- Browser: [브라우저]
- Version: [버전]

## 스크린샷

[가능한 경우 스크린샷 첨부]
```

## 💡 기능 제안

새로운 기능을 제안하고 싶으시다면 [GitHub Discussions](https://github.com/hyjoong/techmoa/discussions)에 등록해주세요.

### 기능 제안 형식

```markdown
## 기능 제안

[제안하는 기능에 대한 설명]

## 문제점

[현재 겪고 있는 문제나 개선이 필요한 부분]

## 해결 방안

[제안하는 해결 방법]

## 예상 효과

[이 기능이 추가되면 얻을 수 있는 효과]

## 구현 난이도

[예상되는 구현 난이도]
```

## 🎨 UI/UX 개선

UI/UX 개선도 환영합니다!

### 개선 가이드라인

- **반응형 디자인**: 모바일과 데스크톱 모두 고려
- **접근성**: 키보드 네비게이션, 스크린 리더 지원
- **성능**: 불필요한 리렌더링 방지
- **일관성**: 기존 디자인 시스템과 일치

## 🔧 개발 환경 설정

### 필수 요구사항

- Node.js 18+
- pnpm
- Supabase 계정

### 로컬 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/hyjoong/techmoa.git
cd techmoa

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 Supabase 정보 입력

# 개발 서버 실행
pnpm dev

# RSS 크롤러 테스트
node scripts/rss-crawler.js
```

## 📋 코딩 컨벤션

### JavaScript/TypeScript

- **ESLint** 규칙 준수
- **Prettier** 포맷팅 사용
- **TypeScript** 타입 정의 명시

### 커밋 메시지

```
type: Add [기능 설명]

feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가
chore: 빌드 프로세스 수정
```

### 브랜치 명명 규칙

```
feature/기능명
fix/버그명
docs/문서명
```

## 🧪 테스트

### 테스트 실행

```bash
# 전체 테스트
pnpm test

# 특정 파일 테스트
pnpm test -- --testNamePattern="테스트명"
```

### 테스트 작성 가이드라인

- **단위 테스트**: 개별 함수/컴포넌트 테스트
- **통합 테스트**: API 연동 테스트
- **E2E 테스트**: 사용자 시나리오 테스트

## 📚 문서화

### 코드 주석

- **JSDoc** 형식 사용
- **복잡한 로직**에 대한 설명 추가
- **API 함수**에 대한 파라미터/반환값 설명

### README 업데이트

- **새로운 기능** 추가 시 README 업데이트
- **설치/실행 방법** 변경 시 문서 수정
- **스크린샷** 추가로 시각적 이해 도움

## 🎯 기여 우선순위

### 높은 우선순위

1. **새로운 기술 블로그 추가**
2. **RSS 피드 오류 수정**
3. **데이터 수집 성능 개선**
4. **보안 취약점 수정**

### 중간 우선순위

1. **UI/UX 개선**
2. **검색 기능 강화**
3. **필터링 옵션 추가**
4. **성능 최적화**

### 낮은 우선순위

1. **문서 개선**
2. **테스트 추가**
3. **코드 리팩토링**
4. **새로운 기능 제안**

## 🙏 감사의 말

기여해주신 모든 분들께 감사드립니다!

- **첫 기여자**: [@username](https://github.com/username)
- **주요 기여자**: [@username](https://github.com/username)

## 📞 연락처

- **이슈**: [GitHub Issues](https://github.com/hyjoong/techmoa/issues)
- **토론**: [GitHub Discussions](https://github.com/hyjoong/techmoa/discussions)
- **이메일**: [your-email@example.com](mailto:your-email@example.com)

---

**Happy Contributing! 🚀**
