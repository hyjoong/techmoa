#!/usr/bin/env node

/**
 * RSS 피드 유효성 검사 스크립트
 *
 * 사용법:
 *   node scripts/validate-rss.js                    # 모든 피드 검사
 *   node scripts/validate-rss.js --url <URL>        # 특정 URL만 검사
 *   node scripts/validate-rss.js --verbose          # 상세 정보 출력
 */

import fs from "fs";
import axios from "axios";
import xml2js from "xml2js";

// 커맨드 라인 인수 파싱
const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const urlIndex = args.indexOf("--url");
const specificUrl = urlIndex !== -1 ? args[urlIndex + 1] : null;

// RSS 피드 목록에서 URL 추출
function extractRssUrls() {
  try {
    const content = fs.readFileSync("scripts/rss-crawler.js", "utf8");
    const rssFeedsMatch = content.match(/const RSS_FEEDS = \[([\s\S]*?)\];/);

    if (!rssFeedsMatch) {
      throw new Error("RSS_FEEDS 배열을 찾을 수 없습니다.");
    }

    const feedsContent = rssFeedsMatch[1];
    const urlMatches = Array.from(
      feedsContent.matchAll(/^(?!\s*\/\/).*url:\s*["']([^"']+)["']/gm)
    );

    if (!urlMatches || urlMatches.length === 0) {
      throw new Error("RSS URL을 찾을 수 없습니다.");
    }

    return urlMatches.map((match) => match[1]);
  } catch (error) {
    console.error("❌ RSS 피드 URL 추출 실패:", error.message);
    process.exit(1);
  }
}

// RSS 피드 유효성 검사 (재시도 로직 포함)
async function validateRssFeed(url, retryCount = 0) {
  const maxRetries = 2;
  const retryDelay = 3000; // 3초 (429 에러 시에만 적용)

  try {
    if (verbose) {
      console.log(
        `🔍 검사 중: ${url}${
          retryCount > 0 ? ` (재시도 ${retryCount}/${maxRetries})` : ""
        }`
      );
    }

    const response = await axios.get(url, {
      timeout: 15000, // 타임아웃 증가
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (response.status !== 200) {
      // 429 에러인 경우 재시도
      if (response.status === 429 && retryCount < maxRetries) {
        console.log(
          `⚠️  ${url}: 429 에러 발생, ${retryDelay / 1000}초 후 재시도...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return validateRssFeed(url, retryCount + 1);
      }

      return {
        url,
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const contentType = response.headers["content-type"] || "";

    // XML 파싱 테스트 (Content-Type 체크보다 우선)
    try {
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);

      // RSS/Atom 구조 확인
      const hasRssStructure = result.rss || result.feed;
      if (!hasRssStructure) {
        return {
          url,
          valid: false,
          error: "유효한 RSS/Atom 구조가 아닙니다.",
        };
      }

      // Content-Type 경고 (GitHub raw 파일 등의 경우)
      const isValidContentType =
        contentType.includes("xml") ||
        contentType.includes("rss") ||
        contentType.includes("atom");

      return {
        url,
        valid: true,
        status: response.status,
        contentType: contentType,
        structure: result.rss ? "RSS" : "Atom",
        warning: !isValidContentType
          ? `Content-Type이 ${contentType}이지만 유효한 RSS 피드입니다.`
          : null,
      };
    } catch (parseError) {
      // XML 파싱 실패 시 Content-Type 체크
      if (
        !contentType.includes("xml") &&
        !contentType.includes("rss") &&
        !contentType.includes("atom")
      ) {
        return {
          url,
          valid: false,
          error: `잘못된 Content-Type: ${contentType}`,
        };
      }

      return {
        url,
        valid: false,
        error: `XML 파싱 실패: ${parseError.message}`,
      };
    }
  } catch (error) {
    // 429 에러인 경우 재시도
    if (
      error.response &&
      error.response.status === 429 &&
      retryCount < maxRetries
    ) {
      console.log(
        `⚠️  ${url}: 429 에러 발생, ${retryDelay / 1000}초 후 재시도...`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return validateRssFeed(url, retryCount + 1);
    }

    return {
      url,
      valid: false,
      error: error.message,
    };
  }
}

// 메인 실행 함수
async function main() {
  try {
    console.log("🚀 RSS 피드 유효성 검사 시작...\n");

    let urls;
    if (specificUrl) {
      urls = [specificUrl];
      console.log(`📊 특정 URL 검사: ${specificUrl}\n`);
    } else {
      urls = extractRssUrls();
      console.log(`📊 총 ${urls.length}개의 RSS 피드를 검사합니다.\n`);

      // GitHub Actions 환경에서 우아한형제들 RSS 피드 제외
      if (process.env.GITHUB_ACTIONS) {
        const originalCount = urls.length;
        urls = urls.filter((url) => !url.includes("techblog.woowahan.com"));
        const excludedCount = originalCount - urls.length;
        if (excludedCount > 0) {
          console.log(
            `🔧 GitHub Actions 환경: 우아한형제들 RSS 피드 ${excludedCount}개 제외됨`
          );
        }
      }
    }

    const results = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const url of urls) {
      const result = await validateRssFeed(url);
      results.push(result);

      if (result.valid) {
        validCount++;
        console.log(`✅ ${url}`);
        if (verbose && result.structure) {
          console.log(
            `   └─ 구조: ${result.structure}, Content-Type: ${result.contentType}`
          );
          if (result.warning) {
            console.log(`   ⚠️  ${result.warning}`);
          }
        }
      } else {
        invalidCount++;
        console.log(`❌ ${url} - ${result.error}`);
      }

      // API 부하 방지를 위한 간격
      if (urls.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 기존 1초 유지
      }
    }

    console.log("\n📊 검사 결과:");
    console.log(`✅ 유효한 피드: ${validCount}개`);
    console.log(`❌ 유효하지 않은 피드: ${invalidCount}개`);

    // 실패한 피드가 있으면 상세 정보 출력
    const invalidFeeds = results.filter((r) => !r.valid);
    if (invalidFeeds.length > 0) {
      console.log("\n❌ 유효하지 않은 피드 상세:");
      invalidFeeds.forEach((feed) => {
        console.log(`  - ${feed.url}: ${feed.error}`);
      });
    }

    // 결과를 파일로 저장
    fs.writeFileSync(
      "rss-validation-results.json",
      JSON.stringify(results, null, 2)
    );
    console.log(
      "\n💾 검사 결과가 rss-validation-results.json에 저장되었습니다."
    );

    // 실패한 피드가 있으면 에러로 종료 (단, 429 에러만 있는 경우는 성공으로 처리)
    const non429Errors = invalidFeeds.filter(
      (feed) => !feed.error.includes("429")
    );

    if (invalidCount > 0) {
      if (non429Errors.length === 0) {
        console.log(
          "\n⚠️  429 에러만 발생했습니다. 이는 일시적인 문제로 간주하여 성공으로 처리합니다."
        );
        process.exit(0);
      } else {
        console.log("\n❌ 일부 RSS 피드가 유효하지 않습니다.");
        process.exit(1);
      }
    } else {
      console.log("\n🎉 모든 RSS 피드가 유효합니다!");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ 검사 중 오류 발생:", error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateRssFeed, extractRssUrls };
