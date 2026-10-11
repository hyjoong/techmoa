// 확인된 실행 환경·HTTP 상태에만 적용한다. 매 실행마다 실제 요청은 계속한다.
export function getFeedAccessWarning(
  feedConfig,
  httpStatus,
  environment = process.env,
) {
  if (
    environment.GITHUB_ACTIONS !== "true" ||
    !feedConfig?.githubActionsBlockedStatuses?.includes(httpStatus)
  ) {
    return null;
  }
  return `HTTP ${httpStatus}: 사이트에서 GitHub Actions의 접근을 차단해 이번 실행에서는 수집할 수 없습니다. 다음 실행에서 다시 확인합니다.`;
}
