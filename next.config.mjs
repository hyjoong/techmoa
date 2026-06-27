/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint 미설정 상태라 빌드 단계 린트는 보류 (후속: next lint 설정 후 false로 전환)
    ignoreDuringBuilds: true,
  },
  images: {
    // 썸네일 출처가 임의의 외부 블로그 도메인이라 와일드카드 허용
    // (새 피드/글마다 새 도메인이 생기므로 명시적 목록은 곧 깨짐)
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // 변환 결과를 31일간 캐시해 동일 이미지 재변환(쿼터 소모)을 최소화
    minimumCacheTTL: 2678400,
    // 썸네일/로고만 사용 → 큰 사이즈(1920/2048/3840) 변환 불필요. 변환 조합 수 축소
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
}

export default nextConfig