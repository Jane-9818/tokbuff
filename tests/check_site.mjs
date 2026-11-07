import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync, statSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = join(root, "site");
const shotDir = "/tmp/tokbuff-shots";
const artifactDir = "/opt/cursor/artifacts";
const chromePath = "/usr/bin/google-chrome";

const pages = {
  "/en/": {
    lang: "en",
    title: "TokBuff — Creator marketing workspace for TikTok sellers",
    h1: "Creator marketing workspace for TikTok sellers",
    independent: "TokBuff is a software service provided by an independent third party.",
    features: [
      "Store Dashboard",
      "Creator Search",
      "Bulk Outreach",
      "AI Creator Communication",
      "Samples & Product library",
      "Creator CRM",
    ],
    facts: [
      "TokBuff brings creator discovery, outreach, messaging, sample handling, and store performance into one workspace, for TikTok sellers and operator teams managing one or many stores.",
      "Connect authorized stores, switch between them, and review GMV, orders, traffic, and conversion. Each store's data stays separate.",
      "Filter creators by category, followers, GMV, and more; save them to lists.",
      "Send targeted collaboration invites or messages in batches, within each store's platform limits.",
      "AI auto-replies answer everyday creator questions from your Product library; conversations that need a person are flagged \"Needs a human\".",
      "Review sample applications, set optional auto-approval rules, and maintain product facts used by AI replies.",
      "Group creators by partnership stage (sample in transit, sample received, video posted) to see who to follow up next.",
      "cross-border stores also set a sub-account email",
      "Check the dashboard, then search creators and create an outreach task.",
      "Add product info and turn on AI replies.",
      "Access to the private application is enabled by the TokBuff team. Store authorization is started inside the application. This website does not offer public self-service signup.",
      "Illustrative layout. No merchant or creator data.",
      "Application login is a separate destination from this public website.",
    ],
  },
  "/zh/": {
    lang: "zh-Hans",
    title: "TokBuff — 面向 TikTok 卖家的达人营销工作台",
    h1: "面向 TikTok 卖家的达人营销工作台",
    independent: "TokBuff 是由独立第三方提供的软件服务。",
    features: ["店铺看板", "达人搜索", "批量邀约", "AI 达人沟通", "样品与商品资料", "达人 CRM"],
    facts: [
      "把达人搜索、邀约、消息、样品处理和店铺表现放在同一个后台，适合管理一家或多家店铺的 TikTok 卖家和运营团队。",
      "授权绑定店铺，切换查看各店 GMV、订单、流量和转化，每家店数据分开统计。",
      "按类目、粉丝、GMV 等条件筛选达人并加入名单。",
      "按任务批量发送定向合作邀约或消息，发送量受各店平台额度限制。",
      "AI 按商品资料库回复达人常见问题，需要人工的对话标为 Needs a human。",
      "处理样品申请、设置可选的自动审样规则，维护 AI 使用的商品资料。",
      "按合作阶段（样品运输中、已收样、已发视频等）分组，方便跟进。",
      "跨境店还需配置子账号邮箱",
      "查看看板，搜索达人并创建邀约任务。",
      "完善商品资料，开启 AI 回复。",
      "私有应用的访问权限由 TokBuff 团队开通。店铺授权在应用内发起。本网站不提供公开自助注册。",
      "示意图。不含商家或达人数据。",
      "应用登录与本公开网站是分开的。",
    ],
  },
  "/ja/": {
    lang: "ja",
    title: "TokBuff — TikTok セラー向けクリエイターマーケティングワークスペース",
    h1: "TikTok セラー向けクリエイターマーケティングワークスペース",
    independent: "TokBuffは、独立した第三者が提供するソフトウェアサービスです。",
    features: [
      "ストアダッシュボード",
      "クリエイター検索",
      "一括アウトリーチ",
      "AI クリエイターコミュニケーション",
      "サンプルと商品情報",
      "クリエイター CRM",
    ],
    facts: [
      "クリエイター検索、招待、メッセージ、サンプル対応、ショップ実績をひとつの管理画面にまとめます。1 店舗または複数店舗を運営する TikTok セラーと運営チーム向けです。",
      "認可したショップを接続・切り替え、GMV・注文・トラフィック・転換率を確認。ショップごとにデータは分離されます。",
      "カテゴリ、フォロワー、GMV などで絞り込み、リストに保存。",
      "招待やメッセージをタスク単位でまとめて送信（各ショップのプラットフォーム上限に従います）。",
      "商品ライブラリの情報で AI が日常の質問に返信。人手が必要な会話は Needs a human に振り分け。",
      "サンプル申請の確認、任意の自動承認ルール、AI 用の商品情報を管理。",
      "サンプル配送中・受取済み・動画投稿済みなど、連携段階ごとにグループ化。",
      "越境ショップはサブアカウントのメールも設定",
      "ダッシュボードを確認し、クリエイターを検索して招待タスクを作成。",
      "商品情報を登録し、AI 返信をオン。",
      "非公開アプリへのアクセスは TokBuff チームが有効にします。ショップの認可はアプリ内から開始します。このウェブサイトでは、公開の自助登録は提供していません。",
      "図はレイアウトの例です。実際のショップやクリエイターのデータは含みません。",
      "アプリのログインは、この公開ウェブサイトとは別の行き先です。",
    ],
  },
};

const forbidden = [
  [/tiktok\s*shop/i, "TikTok Shop"],
  [/tiktok\s*official/i, "TikTok official"],
  [/official\s*tiktok/i, "official TikTok"],
  [/official\s+product/i, "official product"],
  [/抖音小店/, "抖音小店"],
  [/tiktok\s*小店/i, "TikTok小店"],
  [/官方/, "官方"],
  [/公式/, "公式"],
  [/オフィシャル/, "オフィシャル"],
  [/not\s+an?\s+official/i, "not official"],
  [/unofficial/i, "unofficial"],
  [/not\s+affiliated/i, "not affiliated"],
  [/非官方/, "非官方"],
  [/非公式/, "非公式"],
];

const invented = [
  [/coming soon/i, "coming soon"],
  [/即将推出|即将上线|即将发布/, "upcoming zh"],
  [/近日公開|近日リリース/, "upcoming ja"],
  [/testimonial/i, "testimonial"],
  [/客户评价|用户评价|お客様の声/, "testimonial local"],
  [/\bpricing\b/i, "pricing"],
  [/定价|价格方案|料金プラン|月額/, "price plan"],
  [/\$\s?\d/, "dollar amount"],
  [/\b\d+(?:\.\d+)?\s?%/, "percent metric"],
  [/sign up/i, "sign up"],
  [/create an account/i, "create an account"],
  [/免费注册|立即注册|免费试用/, "zh signup promo"],
  [/無料登録|無料で登録|無料トライアル/, "ja signup promo"],
];

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const log = [];
function record(status, name, detail = "") {
  const line = `${status} ${name}${detail ? " — " + detail : ""}`;
  log.push(line);
  console.log(line);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function startServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const pathOnly = decodeURIComponent(url.pathname);
    if (pathOnly === "/en" || pathOnly === "/zh" || pathOnly === "/ja") {
      res.writeHead(301, { Location: pathOnly + "/" });
      res.end();
      return;
    }
    let rel = pathOnly;
    if (rel.endsWith("/")) rel += "index.html";
    const file = normalize(join(siteDir, rel));
    if (!file.startsWith(siteDir)) {
      res.writeHead(403);
      res.end("forbidden path");
      return;
    }
    try {
      const body = readFileSync(file);
      res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      const missing = readFileSync(join(siteDir, "404.html"));
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(missing);
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, origin: `http://127.0.0.1:${port}` });
    });
  });
}

async function overflow(page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right > width + 1 || rect.left < -1) {
        offenders.push({
          tag: el.tagName,
          className: String(el.className).slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 60),
        });
      }
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: width,
      offenders: offenders.slice(0, 8),
    };
  });
}

async function cardOverlap(page) {
  return page.evaluate(() => {
    const problems = [];
    for (const el of document.querySelectorAll(".map a, .card-link, .mock, .feature-copy")) {
      if (el.scrollWidth > el.clientWidth + 2) {
        problems.push({
          kind: "scroll",
          className: String(el.className).slice(0, 40),
          scroll: el.scrollWidth,
          client: el.clientWidth,
          text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 50),
        });
      }
    }
    const links = [...document.querySelectorAll(".map a")];
    for (let i = 0; i < links.length; i += 1) {
      const a = links[i].getBoundingClientRect();
      for (let j = i + 1; j < links.length; j += 1) {
        const b = links[j].getBoundingClientRect();
        const hit = a.left < b.right - 4 && a.right > b.left + 4 && a.top < b.bottom - 4 && a.bottom > b.top + 4;
        if (hit) {
          problems.push({
            kind: "overlap",
            text: `${(links[i].innerText || "").slice(0, 24)} | ${(links[j].innerText || "").slice(0, 24)}`,
          });
        }
      }
    }
    return problems.slice(0, 8);
  });
}

async function readingSize(page) {
  return page.evaluate(() => {
    const selectors = "h1, h2, h3, .lede, .access, .feature-copy p, .steps li, figcaption, .section-intro, .independent";
    const small = [];
    for (const el of document.querySelectorAll(selectors)) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 16) {
        small.push({ tag: el.tagName, className: String(el.className).slice(0, 40), size, text: (el.innerText || "").slice(0, 40) });
      }
    }
    return small.slice(0, 8);
  });
}

async function inspect(page) {
  return page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    h1: [...document.querySelectorAll("h1")].map((el) => el.textContent.trim()),
    text: document.body.innerText,
    forms: document.querySelectorAll("form").length,
    inputs: document.querySelectorAll("input, textarea, select").length,
    scripts: document.querySelectorAll("script").length,
    images: [...document.querySelectorAll("img")].map((img) => ({ alt: img.alt, src: img.getAttribute("src") })),
    storageKeys: Object.keys(localStorage),
    cookie: document.cookie,
    dashboard: [...document.querySelectorAll('a[href="https://tokbuff.com/dashboard"]')].length,
    privacy: [...document.querySelectorAll('a[href="https://tokbuff.com/privacy"]')].length,
    mail: [...document.querySelectorAll('a[href="mailto:tokbuff@greenwoodmcn.com"]')].length,
    langs: {
      en: [...document.querySelectorAll('header a[href="/en/"]')].length,
      zh: [...document.querySelectorAll('header a[href="/zh/"]')].length,
      ja: [...document.querySelectorAll('header a[href="/ja/"]')].length,
    },
    descriptions: [...document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]')].map((el) => el.getAttribute("content")),
  }));
}

function assertPage(info, spec, failures) {
  const expectEqual = (name, actual, expected) => {
    if (actual !== expected) failures.push(`${name}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  };
  expectEqual("lang", info.lang, spec.lang);
  expectEqual("title", info.title, spec.title);
  expectEqual("h1 count", info.h1.length, 1);
  expectEqual("h1", info.h1[0], spec.h1);
  if (!info.text.includes(spec.independent)) failures.push("missing independence statement");
  for (const feature of spec.features) {
    if (!info.text.includes(feature)) failures.push(`missing feature ${feature}`);
  }
  for (const fact of spec.facts) {
    if (!info.text.includes(fact)) failures.push(`missing fact ${fact}`);
  }
  if (info.forms !== 0 || info.inputs !== 0) failures.push(`forms/inputs present forms=${info.forms} inputs=${info.inputs}`);
  if (info.scripts !== 0) failures.push(`script tags present ${info.scripts}`);
  if (info.images.length !== 0) failures.push(`img tags present ${JSON.stringify(info.images)}`);
  if (info.storageKeys.length !== 0) failures.push(`localStorage keys ${info.storageKeys.join(",")}`);
  if (info.cookie) failures.push(`cookie set ${info.cookie}`);
  if (info.dashboard < 2) failures.push(`dashboard links ${info.dashboard}`);
  if (info.privacy < 1) failures.push("missing privacy link");
  if (info.mail < 1) failures.push("missing mailto");
  if (info.langs.en < 1 || info.langs.zh < 1 || info.langs.ja < 1) failures.push(`language switch missing ${JSON.stringify(info.langs)}`);
  const metaBlob = `${info.title}\n${info.descriptions.join("\n")}`;
  for (const [re, name] of forbidden) {
    if (re.test(metaBlob) || re.test(info.text)) failures.push(`forbidden copy visible: ${name}`);
  }
}

async function fresh(browser, origin, path, viewport) {
  const context = await browser.newContext({
    viewport,
    locale: "en-US",
    deviceScaleFactor: 1,
  });
  const cookies = await context.cookies();
  if (cookies.length !== 0) throw new Error(`fresh context already had cookies for ${path}`);
  const page = await context.newPage();
  const response = await page.goto(origin + path, { waitUntil: "load" });
  return { context, page, status: response.status() };
}

async function main() {
  mkdirSync(shotDir, { recursive: true });
  const failures = [];
  const files = walk(siteDir);
  record("RUN", "forbidden-copy scan", `${files.length} files under site/`);
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const rel = file.slice(siteDir.length);
    for (const [re, name] of forbidden) {
      if (re.test(text)) failures.push(`${rel} contains ${name}`);
    }
    if (file.endsWith(".html")) {
      for (const [re, name] of invented) {
        if (re.test(text)) failures.push(`${rel} contains ${name}`);
      }
      if (/<form\b|<input\b|<textarea\b|<script\b/i.test(text)) failures.push(`${rel} has form, input, or script`);
    }
    if (/tiktok\.com/i.test(text)) failures.push(`${rel} links to tiktok.com`);
  }
  record(failures.length ? "FAIL" : "PASS", "static forbidden-copy and form scan", failures.join("; ") || "no matches");

  const yaml = readFileSync(join(root, "render.yaml"), "utf8");
  const yamlChecks = [
    [/runtime:\s*static/, "runtime static"],
    [/staticPublishPath:\s*\.\/site/, "publish ./site"],
    [/source:\s*\/en\b/, "redirect /en"],
    [/destination:\s*\/en\//, "destination /en/"],
    [/source:\s*\/zh\b/, "redirect /zh"],
    [/destination:\s*\/zh\//, "destination /zh/"],
    [/source:\s*\/ja\b/, "redirect /ja"],
    [/destination:\s*\/ja\//, "destination /ja/"],
    [/SKIP_INSTALL_DEPS/, "skip install"],
    [/name:\s*tokbuff-public-website/, "service name"],
  ];
  for (const [re, name] of yamlChecks) {
    if (!re.test(yaml)) failures.push(`render.yaml missing ${name}`);
  }
  if (/^\s*plan:/m.test(yaml) || /^databases:/m.test(yaml) || /^\s*-\s*type:\s*keyvalue/m.test(yaml) || /^\s*domains:/m.test(yaml)) {
    failures.push("render.yaml includes a paid or custom-domain resource");
  }
  record(failures.length ? "FAIL" : "PASS", "render.yaml shape");

  const { server, origin } = await startServer();
  const browser = await chromium.launch({
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const desktop = { width: 1280, height: 900 };
    const mobile = { width: 390, height: 844 };
    const widths = [320, 390, 768, 1280, 1440];

    for (const path of ["/", "/en", "/zh", "/ja", "/en/", "/zh/", "/ja/", "/en/index.html"]) {
      const response = await fetch(origin + path, { redirect: "manual" });
      const location = response.headers.get("location") || "";
      record("INFO", `anonymous fetch ${path}`, `status ${response.status} location ${location}`);
      if (path === "/en" || path === "/zh" || path === "/ja") {
        if (response.status !== 301 || location !== path + "/") failures.push(`${path} did not redirect to ${path}/`);
      } else if (response.status !== 200) {
        failures.push(`${path} status ${response.status}`);
      }
    }

    for (const [path, spec] of Object.entries(pages)) {
      for (const viewport of [desktop, mobile]) {
        const { context, page, status } = await fresh(browser, origin, path, viewport);
        const info = await inspect(page);
        const before = failures.length;
        if (status !== 200) failures.push(`${path} ${viewport.width} status ${status}`);
        assertPage(info, spec, failures);
        const flow = await overflow(page);
        if (flow.scrollWidth > flow.clientWidth + 1 || flow.offenders.length) {
          failures.push(`${path} ${viewport.width} overflow scroll ${flow.scrollWidth}/${flow.clientWidth} ${JSON.stringify(flow.offenders)}`);
        }
        const piled = await cardOverlap(page);
        if (piled.length) failures.push(`${path} ${viewport.width} card overlap ${JSON.stringify(piled)}`);
        const small = await readingSize(page);
        if (small.length) failures.push(`${path} ${viewport.width} small text ${JSON.stringify(small)}`);
        const label = `${path === "/en/" ? "en" : path === "/zh/" ? "zh" : "ja"}_${viewport.width === 1280 ? "desktop" : "mobile"}`;
        if (failures.length === before && (viewport.width === 1280 || viewport.width === 390)) {
          await page.screenshot({ path: join(shotDir, `screenshot_${label}.png`), fullPage: true });
          record("PASS", `screenshot ${label}`);
        }
        record(failures.length === before ? "PASS" : "FAIL", `fresh context ${path} @ ${viewport.width}`, `lang=${info.lang}`);
        await context.close();
      }

      for (const width of widths) {
        if (width === 390 || width === 1280) continue;
        const { context, page } = await fresh(browser, origin, path, { width, height: 900 });
        const flow = await overflow(page);
        const piled = await cardOverlap(page);
        const small = await readingSize(page);
        if (flow.scrollWidth > flow.clientWidth + 1 || flow.offenders.length || piled.length || small.length) {
          failures.push(`${path} ${width} layout ${JSON.stringify(flow.offenders)} ${JSON.stringify(piled)} ${JSON.stringify(small)}`);
          record("FAIL", `overflow/text ${path} @ ${width}`);
        } else {
          record("PASS", `overflow/text ${path} @ ${width}`);
        }
        await context.close();
      }
    }

    const switchOrder = [
      ["/en/", "中文", "/zh/", "zh-Hans"],
      ["/zh/", "日本語", "/ja/", "ja"],
      ["/ja/", "EN", "/en/", "en"],
    ];
    {
      const { context, page } = await fresh(browser, origin, "/en/", mobile);
      for (const [from, label, to, lang] of switchOrder) {
        if (!page.url().endsWith(from)) failures.push(`switch start expected ${from} got ${page.url()}`);
        await page.locator("header nav.lang").getByRole("link", { name: label, exact: true }).click();
        await page.waitForURL((url) => url.pathname === to);
        const info = await inspect(page);
        if (info.lang !== lang) failures.push(`after clicking ${label} lang=${info.lang}`);
        if (!info.title.startsWith("TokBuff —")) failures.push(`after clicking ${label} title=${info.title}`);
        if (info.cookie || info.storageKeys.length) failures.push("language switch stored state");
        record(info.lang === lang ? "PASS" : "FAIL", `language switch ${from} -> ${to}`, info.title);
      }
      await page.screenshot({ path: join(shotDir, "screenshot_switch_mobile.png"), fullPage: false });
      await context.close();
    }

    for (const path of ["/zh/", "/ja/"]) {
      const { context, page } = await fresh(browser, origin, path, desktop);
      const info = await inspect(page);
      const directOk = info.lang === pages[path].lang && !info.cookie && info.storageKeys.length === 0;
      if (!directOk) {
        failures.push(`direct anonymous ${path} failed lang=${info.lang} cookie=${info.cookie}`);
      }
      record(directOk ? "PASS" : "FAIL", `direct anonymous entry ${path}`, "new context, no prior language visit in that context");
      await context.close();
    }

    const rootVisit = await fresh(browser, origin, "/", desktop);
    const rootInfo = await inspect(rootVisit.page);
    const rootOk = rootVisit.status === 200 && rootInfo.lang === "en" && rootInfo.h1[0] === "TokBuff"
      && rootInfo.text.includes("TokBuff is a software service provided by an independent third party.")
      && rootInfo.forms === 0 && rootInfo.inputs === 0;
    if (!rootOk) {
      failures.push(`root index unexpected ${rootVisit.status} ${rootInfo.lang} ${rootInfo.h1.join("|")}`);
    }
    await rootVisit.page.screenshot({ path: join(shotDir, "screenshot_language_index_desktop.png"), fullPage: true });
    record(rootOk ? "PASS" : "FAIL", "language index /");
    await rootVisit.context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  if (failures.length) {
    record("FAIL", "suite", `${failures.length} failure(s)`);
    for (const failure of failures) record("FAIL", "detail", failure);
    writeFileSync("/tmp/tokbuff-test-evidence.txt", log.join("\n") + "\n");
    process.exitCode = 1;
    return;
  }

  mkdirSync(artifactDir, { recursive: true });
  for (const name of readdirSync(shotDir)) {
    copyFileSync(join(shotDir, name), join(artifactDir, name));
  }
  await new Promise((resolve, reject) => {
    const child = spawn("zip", ["-r", "-FS", join(artifactDir, "tokbuff-public-site.zip"), "."], { cwd: siteDir });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`zip exit ${code}`))));
  });
  record("PASS", "suite", "anonymous contexts, three languages, switches, overflow, forbidden copy");
  const evidence = log.join("\n") + "\n";
  writeFileSync(join(artifactDir, "test-evidence.txt"), evidence);
  writeFileSync("/tmp/tokbuff-test-evidence.txt", evidence);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
