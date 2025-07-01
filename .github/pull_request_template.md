## 🆕 새로운 블로그 추가

### 📋 블로그 정보

- **블로그명**:
- **블로그 URL**:
- **RSS 피드 URL**:
- **블로그 타입**:
  - [ ] `company` (기업 블로그)
  - [ ] `personal` (개인 블로그)
- **카테고리** (개인 블로그인 경우):
  - [ ] `FE` (프론트엔드)
  - [ ] `BE` (백엔드)
  - [ ] `AI` (AI/ML)
  - [ ] `APP` (앱 개발)

### 🔍 검증 완료

- [ ] 블로그 타입이 올바르게 설정되었습니다
- [ ] 개인 블로그인 경우 카테고리가 올바르게 설정되었습니다
- [ ] 중복된 블로그가 아닙니다

### 📝 추가된 코드

```javascript
// scripts/rss-crawler.js에 추가
{
  name: "[블로그명]",
  url: "[RSS_URL]",
  type: "[company|personal]",
  category: "[FE|BE|AI|APP]" // 개인 블로그인 경우에만
},
```

---

**PR 제출 후 GitHub Actions가 자동으로 RSS 피드 유효성을 검사합니다.**
