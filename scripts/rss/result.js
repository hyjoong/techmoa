import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { formatWithOptions } from "node:util";

const SENSITIVE_KEY =
  /(?:api[_-]?key|token|secret|password|credential|authorization|private[_-]?key|service[_-]?role|webhook)/i;
const ENV_CONFIG_KEY = /(?:SUPABASE|FIREBASE|FIREWORKS|DATABASE|^DB_)/i;

export function createRedactor(environment = {}, loaded = {}) {
  const values = new Set();
  function collect(value) {
    if (typeof value !== "string" || value.length === 0) return;
    values.add(value);
    values.add(JSON.stringify(value).slice(1, -1));
    values.add(encodeURIComponent(value));
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        for (const nested of Object.values(parsed)) collect(nested);
      }
    } catch {
      // 일반 문자열 설정도 그대로 마스킹한다.
    }
  }
  for (const [key, value] of Object.entries(environment)) {
    if (SENSITIVE_KEY.test(key) || ENV_CONFIG_KEY.test(key)) collect(value);
  }
  for (const value of Object.values(loaded)) collect(value);
  const secrets = [...values].sort((left, right) => right.length - left.length);
  return (value) => {
    let text = String(value);
    for (const secret of secrets) text = text.split(secret).join("[REDACTED]");
    return text
      .replace(/(Bearer\s+)[\w.+/=-]+/gi, "$1[REDACTED]")
      .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[REDACTED]@")
      .replace(
        /([?&](?:api[_-]?key|token|secret|password)=)[^\s&#]+/gi,
        "$1[REDACTED]",
      );
  };
}

export function serializeCrawlResult(result, redact = String) {
  // 글 본문과 반환된 새 글 객체는 운영 보고서에 보관하지 않는다.
  return (
    JSON.stringify(
      result,
      (key, value) => {
        if (key === "newArticles") return undefined;
        if (SENSITIVE_KEY.test(key) && value != null) return "[REDACTED]";
        if (typeof value === "string") return redact(value);
        return value;
      },
      2,
    ) + "\n"
  );
}

export async function writeCrawlResult(output, result, redact = String) {
  const destination = resolve(output);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await mkdir(dirname(destination), { recursive: true });
  try {
    await writeFile(temporary, serializeCrawlResult(result, redact), {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await rename(temporary, destination);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

export function maskConsole(logger, redact) {
  const originals = new Map();
  for (const method of ["log", "info", "warn", "error", "debug", "trace"]) {
    if (typeof logger[method] !== "function") continue;
    const original = logger[method];
    originals.set(method, original);
    logger[method] = (...args) =>
      original.call(
        logger,
        redact(formatWithOptions({ colors: false, depth: 5 }, ...args)),
      );
  }
  return () => {
    for (const [method, original] of originals) logger[method] = original;
  };
}
