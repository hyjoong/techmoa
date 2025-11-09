// 회사/블로그별 로컬 로고 파일 매핑
export const logoMap: Record<string, string> = {
  토스: "/logos/toss.ico",
  당근: "/logos/daangn.ico",
  카카오: "/logos/kakao.ico",
  카카오페이: "/logos/kakaopay.ico",
  무신사: "/logos/musinsa.ico",
  "29CM": "/logos/29cm.ico",
  올리브영: "/logos/oliveyoung.ico",
  우아한형제들: "/logos/woowahan.ico",
  마켓컬리: "/logos/kurly.ico",
  에잇퍼센트: "/logos/8percent.ico",
  쏘카: "/logos/socar.ico",
  하이퍼커넥트: "/logos/hyperconnect.ico",
  데브시스터즈: "/logos/devsisters.ico",
  뱅크샐러드: "/logos/banksalad.ico",
  왓챠: "/logos/watcha.ico",
  다나와: "/logos/danawa.ico",
  요기요: "/logos/yogiyo.ico",
  쿠팡: "/logos/coupang.ico",
  원티드: "/logos/wanted.ico",
  데이블: "/logos/dable.ico",
  직방: "/logos/zigbang.ico",
  콴다: "/logos/qanda.ico",
  네이버: "/logos/naver.ico",
  라인: "/logos/line.ico",
  레브잇: "/logos/levit.ico",
  여기어때: "/logos/gccompany.ico",
  AB180: "/logos/ab180.ico",
  사람인: "/logos/saramin.ico",
};

// 로고 URL을 가져오는 헬퍼 함수
export function getLogoUrl(author: string): string | null {
  return logoMap[author] || null;
}
