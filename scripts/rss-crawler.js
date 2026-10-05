import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runRssCli } from "./rss/cli.js";

export { runRssCli } from "./rss/cli.js";

// import만으로 dotenv·서비스·크롤러를 실행하지 않는다.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  process.exitCode = await runRssCli(process.argv.slice(2));
}
