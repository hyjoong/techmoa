import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommonHeader } from "@/components/common-header";

export const metadata: Metadata = {
  title: "서비스 이용약관 - Techmoa",
  description: "Techmoa 서비스 이용약관을 확인하세요.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <CommonHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            서비스 이용약관
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            최종 업데이트: 2025년 6월 28일
          </p>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Techmoa 서비스 이용약관
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-slate-700 dark:text-slate-300">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                제1조 (목적)
              </h2>
              <p className="leading-relaxed">
                본 약관은 Techmoa(이하 "회사")가 제공하는 기술 블로그
                아그리게이터 서비스(이하 "서비스")의 이용과 관련하여 회사와
                이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                제2조 (정의)
              </h2>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  <strong>1.</strong> "서비스"란 회사가 제공하는 기술 블로그
                  글을 수집하고 분류하여 제공하는 웹 서비스를 의미합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2.</strong> "이용자"란 본 약관에 따라 회사와
                  이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 자를
                  의미합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3.</strong> "콘텐츠"란 서비스 내에 게시된 모든 정보,
                  텍스트, 이미지, 링크 등을 의미합니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                제3조 (서비스의 제공)
              </h2>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  <strong>1.</strong> 회사는 다음과 같은 서비스를 제공합니다:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>기술 블로그 글 수집 및 분류</li>
                  <li>블로그 글 검색 및 필터링</li>
                  <li>블로그 글 조회수 통계</li>
                  <li>기업/개인 블로그 분류</li>
                </ul>
                <p className="leading-relaxed">
                  <strong>2.</strong> 서비스는 연중무휴, 1일 24시간 제공함을
                  원칙으로 합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3.</strong> 회사는 서비스의 품질 향상을 위해 서비스의
                  내용을 변경하거나 중단할 수 있습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                제4조 (이용자의 의무)
              </h2>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  이용자는 다음 행위를 하여서는 안 됩니다:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>
                    서비스를 통해 얻은 정보를 회사의 사전 승낙 없이 복제, 배포,
                    전송하는 행위
                  </li>
                  <li>서비스의 정상적인 운영을 방해하는 행위</li>
                  <li>다른 이용자의 개인정보를 수집, 저장, 공개하는 행위</li>
                  <li>
                    서비스를 통해 얻은 정보를 상업적 목적으로 이용하는 행위
                  </li>
                  <li>기타 관련 법령에 위배되는 행위</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                제5조 (지적재산권)
              </h2>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  <strong>1.</strong> 서비스 내 콘텐츠에 대한 저작권은 원
                  저작자에게 있습니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2.</strong> 회사는 서비스의 구조, 디자인, 로고 등에
                  대한 지적재산권을 보유합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3.</strong> 이용자는 서비스를 통해 얻은 정보를
                  개인적인 용도로만 사용해야 합니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                제6조 (면책조항)
              </h2>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  <strong>1.</strong> 회사는 천재지변, 전쟁, 기타 불가항력적인
                  사유로 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2.</strong> 회사는 이용자가 서비스를 통해 얻은 정보의
                  정확성, 완전성, 유용성에 대해 보장하지 않습니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3.</strong> 회사는 이용자의 개인적인 판단에 따른
                  행위로 인한 손해에 대해 책임을 지지 않습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                제7조 (약관의 변경)
              </h2>
              <p className="leading-relaxed">
                회사는 필요하다고 인정되는 경우 본 약관을 변경할 수 있으며,
                변경된 약관은 서비스 내 공지사항을 통해 공지합니다. 변경된
                약관은 공지 후 7일이 경과한 날부터 효력이 발생합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                제8조 (준거법 및 관할법원)
              </h2>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  <strong>1.</strong> 본 약관은 대한민국 법률에 따라 해석됩니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2.</strong> 서비스 이용으로 발생한 분쟁에 대해 소송이
                  필요할 경우, 회사의 본사 소재지를 관할하는 법원을 관할법원으로
                  합니다.
                </p>
              </div>
            </section>

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                본 약관에 대한 문의사항이 있으시면 GitHub Issues를 통해 연락해
                주시기 바랍니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
