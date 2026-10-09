import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";

const transportUrl = new URL("../scripts/rss/http.js", import.meta.url).href;
const parserUrl = new URL(
  "../node_modules/rss-parser/index.js",
  import.meta.url,
).href;

// 외부 접속 없이 자식 프로세스의 자연 종료까지 검증한다.
// 서버와 서버 소켓은 unref하며, 남은 클라이언트 소켓이 있으면 5초 제한에 실패한다.
function runLocalScenario(scenario) {
  const source = `
    import http from 'node:http';
    import { fetchTextWithTimeout } from ${JSON.stringify(transportUrl)};
    import Parser from ${JSON.stringify(parserUrl)};
    const scenario = ${JSON.stringify(scenario)};
    const server = http.createServer((req, res) => {
      if (scenario === 'headers-timeout') return;
      if (scenario === '403') {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.write('Forbidden');
        return;
      }
      if (scenario === 'redirect-limit' || (scenario.startsWith('redirect') && req.url === '/start')) {
        res.writeHead(302, { Location: '/rss' });
        res.write('Moved');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
      if (scenario === 'body-timeout' || scenario === 'redirect-body-timeout') {
        res.write('<rss>');
        return;
      }
      res.end('<rss version="2.0"><channel><title>offline</title><description>offline</description><link>http://localhost/</link></channel></rss>');
    });
    server.keepAliveTimeout = 30000;
    server.on('connection', (socket) => socket.unref());
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    server.unref();
    const started = Date.now();
    try {
      const xml = await fetchTextWithTimeout('http://127.0.0.1:' + server.address().port + '/start', {
        timeoutMs: scenario.endsWith('timeout') ? 250 : 2000,
        maxRedirects: 2,
      });
      const feed = await new Parser().parseString(xml);
      console.log(JSON.stringify({ success: true, title: feed.title, elapsedMs: Date.now() - started }));
    } catch (error) {
      console.log(JSON.stringify({ success: false, error: error.message, elapsedMs: Date.now() - started }));
    }
    // 의도적으로 process.exit(), agent.destroy(), server.close()를 호출하지 않는다.
    // 완료한 HTTP 작업만으로 프로세스가 종료되어야 한다.
  `;
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--input-type=module", "--eval", source],
      {
        env: {},
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    const guard = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, 5000);
    child.on("close", (code) => {
      clearTimeout(guard);
      if (timedOut)
        return reject(
          new Error(
            `${scenario}: HTTP 완료 후 프로세스가 종료되지 않았습니다. ${stdout}`,
          ),
        );
      if (code !== 0)
        return reject(new Error(`${scenario}: child exit ${code}: ${stderr}`));
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (error) {
        reject(error);
      }
    });
  });
}

for (const scenario of ["ok", "redirect"]) {
  test(`RSS 본문을 읽고 파싱한 뒤 자연 종료한다 (${scenario})`, async () => {
    const result = await runLocalScenario(scenario);
    assert.equal(result.success, true);
    assert.equal(result.title, "offline");
  });
}

for (const scenario of ["403", "redirect-limit"]) {
  test(`HTTP 오류·리다이렉트 응답을 정리하고 자연 종료한다 (${scenario})`, async () => {
    const result = await runLocalScenario(scenario);
    assert.equal(result.success, false);
    assert.match(result.error, scenario === "403" ? /HTTP 403/ : /리다이렉트/);
  });
}

for (const scenario of [
  "headers-timeout",
  "body-timeout",
  "redirect-body-timeout",
]) {
  test(`요청부터 본문 끝까지 시간 제한을 적용하고 자연 종료한다 (${scenario})`, async () => {
    const result = await runLocalScenario(scenario);
    assert.equal(result.success, false);
    assert.match(result.error, /250ms/);
    assert.ok(result.elapsedMs < 1500, `시간 제한 초과: ${result.elapsedMs}ms`);
  });
}
