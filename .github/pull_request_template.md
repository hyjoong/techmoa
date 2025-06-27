## 🆕 새로운 블로그 추가

### 📋 블로그 정보

- **블로그명**:
- **블로그 URL**:
- **RSS 피드 URL**:
- **블로그 타입**:
  - [ ] `company` (기업 블로그)
  - [ ] `personal` (개인 블로그)

### 🔍 검증 완료

- [ ] RSS 피드가 정상 작동합니다
- [ ] 블로그 타입이 올바르게 설정되었습니다
- [ ] 중복된 블로그가 아닙니다

### 📝 추가된 코드

```javascript
// scripts/rss-crawler.js에 추가
{
  name: "[블로그명]",
  url: "[RSS_URL]",
  type: "[company|personal]"
},
```

---

**PR 제출 후 GitHub Actions가 자동으로 RSS 피드 유효성을 검사합니다.**
