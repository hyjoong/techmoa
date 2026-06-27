/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint 미설정 상태라 빌드 단계 린트는 보류 (후속: next lint 설정 후 false로 전환)
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig