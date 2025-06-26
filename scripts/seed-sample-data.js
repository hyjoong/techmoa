import { createClient } from "@supabase/supabase-js"

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Supabase 환경변수가 설정되지 않았습니다.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 샘플 데이터
const sampleBlogs = [
  {
    title: "React 18의 새로운 기능들과 Concurrent Features 완벽 가이드",
    summary:
      "React 18에서 도입된 Concurrent Features와 Suspense, useTransition 등의 새로운 훅들을 실제 예제와 함께 살펴봅니다. 성능 최적화와 사용자 경험 개선을 위한 핵심 개념들을 다룹니다.",
    author: "토스 기술 블로그",
    category: "frontend",
    tags: ["React", "JavaScript", "성능최적화", "Concurrent"],
    external_url: "https://toss.tech/article/react-18-guide",
    published_at: "2024-01-15T09:00:00Z",
    views: 1250,
  },
  {
    title: "Node.js 성능 최적화: 메모리 누수 방지와 클러스터링",
    summary:
      "Node.js 애플리케이션의 성능을 향상시키기 위한 메모리 관리 기법과 클러스터링 전략을 다룹니다. 실제 프로덕션 환경에서 겪을 수 있는 문제들과 해결책을 제시합니다.",
    author: "우아한형제들 기술 블로그",
    category: "backend",
    tags: ["Node.js", "성능최적화", "메모리관리", "클러스터링"],
    external_url: "https://techblog.woowahan.com/nodejs-optimization",
    published_at: "2024-01-14T10:30:00Z",
    views: 890,
  },
  {
    title: "Kubernetes 운영 환경에서의 모니터링과 로깅 전략",
    summary:
      "프로덕션 환경에서 Kubernetes 클러스터를 효과적으로 모니터링하고 로그를 관리하는 방법을 소개합니다. Prometheus, Grafana, ELK 스택을 활용한 실무 가이드입니다.",
    author: "네이버 D2",
    category: "infra",
    tags: ["Kubernetes", "모니터링", "로깅", "DevOps"],
    external_url: "https://d2.naver.com/kubernetes-monitoring",
    published_at: "2024-01-13T14:20:00Z",
    views: 2100,
  },
  {
    title: "개발자 커리어 전환기: 스타트업에서 대기업으로",
    summary:
      "5년차 개발자가 스타트업에서 대기업으로 이직하면서 겪은 경험과 준비 과정을 공유합니다. 면접 준비부터 문화 적응까지의 실제 경험담을 담았습니다.",
    author: "LINE Engineering",
    category: "career",
    tags: ["이직", "커리어", "면접", "경험담"],
    external_url: "https://engineering.linecorp.com/career-transition",
    published_at: "2024-01-12T16:45:00Z",
    views: 3200,
  },
  {
    title: "TypeScript 5.0 새로운 기능과 마이그레이션 가이드",
    summary:
      "TypeScript 5.0의 주요 변경사항과 기존 프로젝트를 업그레이드하는 방법을 단계별로 설명합니다. 새로운 타입 시스템 기능과 성능 개선사항을 중심으로 다룹니다.",
    author: "카카오 기술 블로그",
    category: "frontend",
    tags: ["TypeScript", "마이그레이션", "타입시스템"],
    external_url: "https://tech.kakao.com/typescript-5-guide",
    published_at: "2024-01-11T11:15:00Z",
    views: 1800,
  },
]

async function seedData() {
  try {
    console.log("🌱 샘플 데이터 삽입 시작...")

    // 기존 데이터 확인
    const { data: existing } = await supabase.from("blogs").select("external_url")

    const existingUrls = new Set(existing?.map((item) => item.external_url) || [])

    // 중복되지 않는 데이터만 필터링
    const newBlogs = sampleBlogs.filter((blog) => !existingUrls.has(blog.external_url))

    if (newBlogs.length === 0) {
      console.log("📝 모든 샘플 데이터가 이미 존재합니다.")
      return
    }

    // 데이터 삽입
    const { data, error } = await supabase.from("blogs").insert(newBlogs).select()

    if (error) {
      console.error("❌ 샘플 데이터 삽입 실패:", error.message)
      return
    }

    console.log(`✅ ${newBlogs.length}개의 샘플 데이터가 성공적으로 삽입되었습니다.`)
  } catch (error) {
    console.error("❌ 샘플 데이터 삽입 중 오류:", error.message)
  }
}

seedData()
