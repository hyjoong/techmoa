/**
 * RSS 피드 목록 (크롤러/검증 공용 단일 소스)
 *
 * 새로운 블로그를 추가하려면:
 * 1. RSS_FEEDS 배열에 다음 형식으로 추가:
 *    { name: "블로그명", url: "RSS_URL", type: "company" | "personal" }
 * 2. RSS 피드가 정상 작동하는지 확인
 * 3. 블로그 타입을 올바르게 설정 (company: 기업, personal: 개인)
 * 4. 중복되지 않는 블로그명 사용
 */

// RSS 피드 목록 (기업/개인 구분)
export const RSS_FEEDS = [
  { name: "토스", url: "https://toss.tech/rss.xml", type: "company" },
  {
    name: "당근",
    url: "https://medium.com/feed/daangn",
    type: "company",
  },
  {
    name: "카카오",
    url: "https://tech.kakao.com/feed/",
    type: "company",
  },
  {
    name: "카카오페이",
    url: "https://tech.kakaopay.com/rss",
    type: "company",
  },
  {
    name: "무신사",
    url: "https://medium.com/feed/musinsa-tech",
    type: "company",
  },
  { name: "29CM", url: "https://medium.com/feed/29cm", type: "company" },
  {
    name: "올리브영",
    url: "https://oliveyoung.tech/rss.xml",
    type: "company",
  },
  {
    name: "우아한형제들",
    url: "https://techblog.woowahan.com/feed/",
    type: "company",
  },
  { name: "네이버", url: "https://d2.naver.com/d2.atom", type: "company" },
  {
    name: "라인",
    url: "https://techblog.lycorp.co.jp/ko/feed/index.xml",
    type: "company",
  },
  {
    name: "마켓컬리",
    url: "https://helloworld.kurly.com/rss.xml",
    type: "company",
  },
  {
    name: "에잇퍼센트",
    url: "https://8percent.github.io/feed.xml",
    type: "company",
  },
  {
    name: "쏘카",
    url: "https://tech.socar.kr/rss.xml",
    type: "company",
  },
  {
    name: "하이퍼커넥트",
    url: "https://hyperconnect.github.io/feed.xml",
    type: "company",
  },
  {
    name: "데브시스터즈",
    url: "https://tech.devsisters.com/rss.xml",
    type: "company",
  },
  {
    name: "뱅크샐러드",
    url: "https://blog.banksalad.com/rss.xml",
    type: "company",
  },
  { name: "왓챠", url: "https://medium.com/feed/watcha", type: "company" },
  {
    name: "다나와",
    url: "https://danawalab.github.io/feed.xml",
    type: "company",
  },
  {
    name: "레브잇",
    url: "https://medium.com/feed/%EB%A0%88%EB%B8%8C%EC%9E%87-%ED%85%8C%ED%81%AC%EB%B8%94%EB%A1%9C%EA%B7%B8",
    type: "company",
  },
  {
    name: "요기요",
    url: "https://medium.com/feed/deliverytechkorea",
    type: "company",
  },
  {
    name: "쿠팡",
    url: "https://medium.com/feed/coupang-tech",
    type: "company",
  },
  {
    name: "원티드",
    url: "https://medium.com/feed/wantedjobs",
    type: "company",
  },
  {
    name: "데이블",
    url: "https://teamdable.github.io/techblog/feed.xml",
    type: "company",
  },
  {
    name: "사람인",
    url: "https://saramin.github.io/feed.xml",
    type: "company",
  },
  { name: "직방", url: "https://medium.com/feed/zigbang", type: "company" },
  {
    name: "콴다",
    url: "https://medium.com/feed/mathpresso/tagged/frontend",
    type: "company",
  },
  {
    name: "AB180",
    url: "https://raw.githubusercontent.com/ab180/engineering-blog-rss-scheduler/main/rss.xml",
    type: "company",
  },

  // 개인 블로그
  // FE
  {
    name: "문동욱",
    url: "https://evan-moon.github.io/feed.xml",
    type: "personal",
    category: "FE",
  },
  {
    name: "손수림",
    url: "https://api.velog.io/rss/@surim014",
    type: "personal",
    category: "FE",
  },
  {
    name: "스벨트전도사",
    url: "https://api.velog.io/rss/@k-svelte-master",
    type: "personal",
    category: "FE",
  },
  {
    name: "우혁",
    url: "https://api.velog.io/rss/@woogur29",
    type: "personal",
    category: "FE",
  },
  {
    name: "정현수",
    url: "https://junghyeonsu.com/rss.xml",
    type: "personal",
    category: "FE",
  },
  {
    name: "테오",
    url: "https://api.velog.io/rss/@teo",
    type: "personal",
    category: "FE",
  },
  {
    name: "황준일",
    url: "https://junilhwang.github.io/TIL/rss.xml",
    type: "personal",
    category: "FE",
  },
  // BE
  {
    name: "향로",
    url: "https://jojoldu.tistory.com/rss",
    type: "personal",
    category: "BE",
  },
  {
    name: "망나니개발자",
    url: "https://mangkyu.tistory.com/rss",
    type: "personal",
    category: "BE",
  },
  // AI
  {
    name: "멍개",
    url: "https://rss.blog.naver.com/pjt3591oo.xml",
    type: "personal",
    category: "AI",
  },
  // APP
  {
    name: "심야",
    url: "https://api.velog.io/rss/@ximya_hf",
    type: "personal",
    category: "APP",
  },
];
