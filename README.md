# TokBuff public website

Static public pages for TokBuff in English, Chinese, and Japanese. This repository is the website source. It is not the private application, and this copy has not been deployed.

The pages are not live until someone publishes them and a public URL is checked in a browser. Nothing in this repository changes `tokbuff.com` DNS, the application, or a listing submission.

## Pages

| Path | Language | `lang` | Title |
| --- | --- | --- | --- |
| `/` | Language index | `en` | TokBuff |
| `/en/` | English | `en` | TokBuff — Creator marketing workspace for TikTok sellers |
| `/zh/` | Simplified Chinese | `zh-Hans` | TokBuff — 面向 TikTok 卖家的达人营销工作台 |
| `/ja/` | Japanese | `ja` | TokBuff — TikTok セラー向けクリエイターマーケティングワークスペース |

`/en`, `/zh`, and `/ja` redirect to the trailing-slash paths in `render.yaml`. Files live under `site/`, which is the publish directory. There is no compile step and no application dependency.

Each language page states the product facts from the three-language source: what TokBuff is, six functions already in the application (store dashboard, creator search, bulk outreach, AI creator communication, samples and product information, creator CRM), the start steps, support email, and privacy link. Language switching is a normal link. Pages do not require a login and do not store a language preference.

Application login is only the existing address `https://tokbuff.com/dashboard`. Privacy is `https://tokbuff.com/privacy`. Support is `mailto:tokbuff@greenwoodmcn.com`.

Access to the private application is enabled by the TokBuff team. Store authorization is started inside the application. These pages do not offer public self-service signup, account forms, or payment forms.

Diagrams are labeled as illustrative layouts and use placeholders such as “Store A”. They are not application screenshots and do not contain merchant or creator data.

## Copy limits

Keep the independence sentence as written on each page:

- English: TokBuff is a software service provided by an independent third party.
- Chinese: TokBuff 是由独立第三方提供的软件服务。
- Japanese: TokBuffは、独立した第三者が提供するソフトウェアサービスです。

Do not add other affiliation disclaimers. Do not put these phrases in page copy, titles, descriptions, or alt text, including inside a denial:

- TikTok Shop
- TikTok official
- official TikTok
- official product
- 抖音小店
- TikTok小店
- 官方
- 公式
- オフィシャル

Do not add TikTok logos. Do not add prices, testimonials, result metrics, or features that are not already in the source.

## Local preview

From the repository root:

```bash
python3 -m http.server 4173 --directory site
```

Open:

- http://127.0.0.1:4173/
- http://127.0.0.1:4173/en/
- http://127.0.0.1:4173/zh/
- http://127.0.0.1:4173/ja/

Opening the HTML files directly from disk will not resolve the root-absolute CSS and language links.

## Tests

```bash
cd tests
npm ci
node check_site.mjs
```

The script serves `site/`, follows the same trailing-slash redirects as the blueprint, and checks each language in a new browser context with empty storage. It checks titles, `lang`, required facts, the language switch, application and privacy and mail links, absence of forms, horizontal overflow at 320, 390, 768, 1280, and 1440 CSS pixels, and a forbidden-copy scan of `site/`. Chrome on the machine is required (`/usr/bin/google-chrome`). Test dependencies stay in `tests/` and are not part of the published site. `SKIP_INSTALL_DEPS` is set in the blueprint so Render does not install them.

## Render deployment

Do this only when a person who owns the Render workspace chooses to publish. Creating the service is a separate action from merging this repository. This blueprint does not set a custom domain, so it does not move `tokbuff.com`.

Static sites on Render are served from a CDN and do not use a web-service instance plan. The blueprint therefore omits `plan`. Render staff have noted that setting `plan: free` on `runtime: static` is invalid. Static sites still count against the workspace’s included outbound bandwidth and pipeline minutes. Confirm the Render confirmation screen before accepting it. Do not add a database, Key Value instance, web service, or disk.

`render.yaml` defines one service:

- `type: web`
- `runtime: static`
- `name: tokbuff-public-website`
- `buildCommand`: print a line; there is nothing to compile
- `staticPublishPath: ./site`
- `SKIP_INSTALL_DEPS=true`
- redirects from `/en`, `/zh`, and `/ja` to the trailing-slash paths
- response headers for content type, referrer, and framing

If a Render service is already named `tokbuff-public-website`, applying the blueprint updates that service. Rename the blueprint entry first if that name belongs to something else.

Steps:

1. Merge the reviewed branch into the branch you intend to publish. Render deploys the branch you select, not every branch.
2. In the Render Dashboard, choose **New → Blueprint**.
3. Connect the GitHub repository that contains this `render.yaml`.
4. Select the branch to publish. Leave the blueprint path as `render.yaml`.
5. Read the plan Render shows. It should be one static site, with publish directory `site`, and no paid instance, database, or custom domain.
6. Apply it only if that summary is what you want. Wait until that service’s deploy status is successful.
7. Open the `onrender.com` URL Render assigns, in a private window, at `/`, `/en/`, `/zh/`, and `/ja/`.
8. Call the site deployed only after those URLs show these pages. Do not describe a preview of this repository as the live site.

To publish without a blueprint, create a **Static Site** (not a Web Service), set the publish directory to `site`, the build command to `echo Static site has no compile step`, and add the same three redirects. Do not attach `tokbuff.com` unless a separate DNS change is intended.

Root-relative `hreflang` links work on whatever host serves the files. They are not absolute canonical URLs. Add absolute `hreflang` and canonical links only after the public host is verified. There is no sitemap, because a sitemap needs that host.

## Limitations

- No public URL was verified for this site while the pages were written.
- The existing application and privacy URLs are linked, not hosted here.
- Diagrams explain the layout of public facts. They are not the product interface.
- Account access is described as team-enabled. The pages do not claim that every visitor can register.
- Chinese pages use simplified Chinese (`zh-Hans`).
- The in-product flag “Needs a human” is kept in English on every language page, matching the source wording.
