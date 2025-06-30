import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommonHeader } from "@/components/common-header";

export const metadata: Metadata = {
  title: "개인정보 처리방침 - Techmoa",
  description: "Techmoa 개인정보 처리방침을 확인하세요.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <CommonHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            개인정보 처리방침
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            최종 업데이트: 2025년 7월 1일
          </p>
        </div>
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Techmoa 개인정보 처리방침
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-slate-700 dark:text-slate-300">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                1. 개인정보의 처리 목적
              </h2>
              <p className="leading-relaxed mb-3">
                Techmoa(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리하고
                있으며, 다음의 목적 이외의 용도로는 이용하지 않습니다.
              </p>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  <strong>• 서비스 제공:</strong> 기술 블로그 아그리게이터
                  서비스 제공, 서비스 이용 기록 분석
                </p>
                <p className="leading-relaxed">
                  <strong>• 서비스 개선:</strong> 서비스 품질 향상, 새로운 기능
                  개발
                </p>
                <p className="leading-relaxed">
                  <strong>• 통계 분석:</strong> 서비스 이용 통계, 트래픽 분석
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                2. 수집하는 개인정보 항목
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">
                    자동 수집 정보
                  </h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>IP 주소</li>
                    <li>브라우저 정보 (User-Agent)</li>
                    <li>접속 로그</li>
                    <li>쿠키 정보</li>
                    <li>서비스 이용 기록</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">
                    선택적 수집 정보
                  </h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>GitHub 계정 정보 (기여 시)</li>
                    <li>이메일 주소 (문의 시)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                3. 개인정보의 보유 및 이용기간
              </h2>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  <strong>• 서비스 이용 기록:</strong> 서비스 제공 기간 동안
                  보유
                </p>
                <p className="leading-relaxed">
                  <strong>• 접속 로그:</strong> 1년간 보유 후 자동 삭제
                </p>
                <p className="leading-relaxed">
                  <strong>• 쿠키 정보:</strong> 브라우저 세션 종료 시 또는
                  설정된 만료일까지
                </p>
                <p className="leading-relaxed">
                  <strong>• 기타 개인정보:</strong> 수집 목적 달성 후 즉시 삭제
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                4. 개인정보의 제3자 제공
              </h2>
              <p className="leading-relaxed">
                회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.
                다만, 아래의 경우에는 예외로 합니다.
              </p>
              <div className="mt-3 space-y-2">
                <p className="leading-relaxed">
                  <strong>• 이용자가 사전에 동의한 경우</strong>
                </p>
                <p className="leading-relaxed">
                  <strong>
                    • 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진
                    절차와 방법에 따라 수사기관의 요구가 있는 경우
                  </strong>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                5. 개인정보의 처리 위탁
              </h2>
              <p className="leading-relaxed mb-3">
                회사는 서비스 향상을 위해 아래와 같이 개인정보를 위탁하고
                있습니다.
              </p>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  <strong>• Supabase:</strong> 데이터베이스 서비스 제공
                </p>
                <p className="leading-relaxed">
                  <strong>• Vercel:</strong> 웹 호스팅 및 CDN 서비스
                </p>
                <p className="leading-relaxed">
                  <strong>• Google Analytics:</strong> 웹사이트 분석 서비스
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                6. 이용자 및 법정대리인의 권리와 그 행사방법
              </h2>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수
                  있습니다.
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>개인정보 열람요구</li>
                  <li>오류 등이 있을 경우 정정 요구</li>
                  <li>삭제요구</li>
                  <li>처리정지 요구</li>
                </ul>
                <p className="leading-relaxed mt-3">
                  위의 권리 행사는 이메일(hyjoong12@gmail.com)을 통해 요청하실
                  수 있습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                7. 개인정보의 안전성 확보 조치
              </h2>
              <p className="leading-relaxed mb-3">
                회사는 개인정보보호법 제29조에 따라 다음과 같은 안전성 확보
                조치를 취하고 있습니다.
              </p>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  <strong>• 개인정보의 암호화:</strong> 개인정보는 암호화되어
                  저장 및 전송됩니다.
                </p>
                <p className="leading-relaxed">
                  <strong>• 해킹 등에 대비한 기술적 대책:</strong> 해킹이나
                  컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 방지하기
                  위하여 보안프로그램을 설치하고 주기적인 갱신·점검을 하며
                  외부로부터 접근이 통제된 구역에 시스템을 설치하고
                  기술적/물리적으로 감시 및 차단하고 있습니다.
                </p>
                <p className="leading-relaxed">
                  <strong>• 개인정보에 대한 접근 제한:</strong> 개인정보를
                  처리하는 데이터베이스시스템에 대한 접근권한의 부여, 변경,
                  말소를 통하여 개인정보에 대한 접근통제를 위하여 필요한 조치를
                  하고 있으며 침입차단시스템을 이용하여 외부로부터의 무단 접근을
                  통제하고 있습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                8. 개인정보 보호책임자
              </h2>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
                  처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여
                  아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                </p>
                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="leading-relaxed">
                    <strong>▶ 개인정보 보호책임자</strong>
                    <br />
                    이메일: hyjoong12@gmail.com
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                9. 개인정보 처리방침 변경
              </h2>
              <p className="leading-relaxed">
                이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른
                변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행
                7일 전부터 공지사항을 통하여 고지할 것입니다.
              </p>
            </section>

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                본 개인정보 처리방침에 대한 문의사항이 있으시면
                이메일(hyjoong12@gmail.com) 또는 GitHub Issues를 통해 연락해
                주시기 바랍니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
