"use strict";

// Integration test: clean Brave profile, real extension, synthetic CSFD pages.
// Network requests to CSFD are intercepted; no live site or user profile is used.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("real Brave loads extension and redirects only unambiguous extension searches", { timeout: 25000 }, async () => {
  const root = path.resolve(__dirname, "..");
  const profile = fs.mkdtempSync("/tmp/opencode/csfd-integration-");
  const browser = spawn(process.env.BRAVE_BINARY || "/usr/bin/brave-browser", [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${profile}`, `--load-extension=${root}`,
    "--remote-debugging-port=0", "about:blank",
  ]);
  let socket;
  let call;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let log = "";
      const timer = setTimeout(() => reject(new Error("Brave startup timeout")), 10000);
      browser.once("error", (error) => { clearTimeout(timer); reject(error); });
      browser.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Brave exited: ${code}`)); });
      browser.stderr.on("data", (data) => {
        log += data;
        const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const pending = new Map();
    let duplicate = false;
    let foreignTitle = false;
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const request = pending.get(message.id);
        pending.delete(message.id);
        if (request) {
          message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
        }
      } else if (message.method === "Fetch.requestPaused") {
        const request = message.params;
        const url = new URL(request.request.url);
        const card = (filmId) => foreignTitle
          ? `<article><div class="article-content"><header class="article-header"><h3><a class="film-title-name" href="/film/${filmId}-shawshank/prehled/">Vykoupení z věznice Shawshank</a><span class="film-title-info"><span class="info">(1994)</span></span></h3><p class="search-name">(The Shawshank Redemption)</p></header></div></article>`
          : `<article><h3><a class="film-title-name" href="/film/${filmId}-verity/prehled/">Verity</a><span class="film-title-info"><span class="info">(2026)</span></span></h3></article>`;
        const unrelatedEpisode = foreignTitle
          ? '<div class="main-series"><article><a class="film-title-name" href="/film/50-series/51-episode/prehled/">Jiný seriál - Epizoda</a><span class="film-title-info"><span class="info">(2000)</span></span></article></div>'
          : "";
        const mayday = () => {
          const article = (path, title, year) => `<article class="article article-poster-50"><div class="article-content"><header class="article-header"><h3 class="film-title-nooverflow"><i class="icon"></i><a href="${path}" class="film-title-name">${title}</a> <span class="film-title-info"><span class="info">(${year})</span></span></h3></header></div></article>`;
          const more = (kind) => `<div id="snippet--more${kind}" class="box-content-more-gray"><a href="/hledat/?page${kind}=2&amp;q=Mayday" data-no-ads data-ajax-url="/hledat/?page${kind}=2&amp;q=Mayday&amp;do=load${kind}">Další nalezené</a></div>`;
          return `<!doctype html><title>Hledání</title><section class="main-box" id="films"><div class="box main-movies"><header class="box-header"><h2>Filmy</h2></header><div class="box-content"><div id="snippet--containerFilms">${article("/film/1-mayday/prehled/", "Mayday", 2021)}${article("/film/2-mayday/prehled/", "Mayday", 2010)}${article("/film/1727692-mayday/prehled/", "Mayday", 2026)}</div>${more("Films")}</div></div></section><section class="main-box" id="series"><div class="box main-series"><div id="snippet--containerSeries">${article("/film/3-letecke-katastrofy/4-mayday/prehled/", "Letecké katastrofy - Mayday", 2005)}</div>${more("Series")}</div></section>`;
        };
        const html = url.pathname.startsWith("/film/")
          ? "<!doctype html><title>Detail</title><h1>Verity</h1>"
          : url.searchParams.get("q") === "Mayday"
            ? mayday()
            : `<!doctype html><title>Hledání</title><div class="main-movies">${card(1)}${duplicate ? card(2) : ""}</div>${unrelatedEpisode}`;
        call("Fetch.fulfillRequest", {
          requestId: request.requestId,
          responseCode: 200,
          responseHeaders: [{ name: "Content-Type", value: "text/html; charset=utf-8" }],
          body: Buffer.from(html).toString("base64"),
        }, message.sessionId).catch(() => {});
      }
    };
    call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const requestId = ++id;
      pending.set(requestId, { resolve, reject });
      socket.send(JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

    let worker;
    for (let attempt = 0; attempt < 30 && !worker; attempt++) {
      const targets = await call("Target.getTargets");
      worker = targets.targetInfos.find((target) => target.type === "service_worker" && target.url.endsWith("/background.js"));
      if (!worker) await sleep(100);
    }
    assert.ok(worker, "extension service worker loaded");
    const workerSession = (await call("Target.attachToTarget", { targetId: worker.targetId, flatten: true })).sessionId;
    const workerState = await call("Runtime.evaluate", {
      expression: "chrome.runtime.getManifest().version", returnByValue: true,
    }, workerSession);
    assert.equal(workerState.result.value, "1.10.0");

    const target = await call("Target.createTarget", { url: "about:blank" });
    const session = (await call("Target.attachToTarget", { targetId: target.targetId, flatten: true })).sessionId;
    await call("Fetch.enable", { patterns: [{ urlPattern: "https://www.csfd.cz/*" }] }, session);
    const searchUrl = "https://www.csfd.cz/hledat/?q=Verity";
    const markedUrl = `${searchUrl}#csfd-direct=Verity%20(2026)`;
    async function navigate(url, expected, stable = false) {
      await call("Page.navigate", { url }, session);
      for (let attempt = 0; attempt < 60; attempt++) {
        const value = await call("Runtime.evaluate", { expression: "location.href", returnByValue: true }, session);
        if (value.result.value === expected) {
          if (stable) {
            await sleep(500);
            const after = await call("Runtime.evaluate", { expression: "location.href", returnByValue: true }, session);
            assert.equal(after.result.value, expected);
          }
          return;
        }
        await sleep(50);
      }
      assert.fail(`Navigation did not settle on ${expected}`);
    }
    await navigate(markedUrl, "https://www.csfd.cz/film/1-verity/prehled/");
    duplicate = true;
    await navigate(markedUrl, searchUrl, true);
    duplicate = false;
    foreignTitle = true;
    const foreignSearch = "https://www.csfd.cz/hledat/?q=Shawshank+Redemption#csfd-direct=Shawshank%20Redemption";
    await navigate(foreignSearch, "https://www.csfd.cz/film/1-shawshank/prehled/");
    duplicate = true;
    await navigate(foreignSearch, "https://www.csfd.cz/hledat/?q=Shawshank+Redemption", true);
    duplicate = false;
    foreignTitle = false;
    const maydayUrl = "https://www.csfd.cz/hledat/?q=Mayday";
    await navigate(`${maydayUrl}#csfd-direct=Mayday%202026`, "https://www.csfd.cz/film/1727692-mayday/prehled/");
    await navigate("about:blank", "about:blank");
    await navigate(`${maydayUrl}#csfd-direct=Mayday%20(2026)`, "https://www.csfd.cz/film/1727692-mayday/prehled/");
    await navigate("about:blank", "about:blank");
    await navigate(`${maydayUrl}#csfd-direct=Mayday`, maydayUrl, true);
    await navigate("about:blank", "about:blank");
    await navigate(searchUrl, searchUrl, true);
    await call("Runtime.evaluate", {
      expression: "chrome.storage.local.set({options:{autoOpen:false}})", awaitPromise: true,
    }, workerSession);
    await navigate("about:blank", "about:blank");
    await navigate(markedUrl, searchUrl, true);
    console.log("PASS: extension loaded; main and original English titles redirect; unrelated episodes do not block; ambiguity, manual search and disabled option stay on results.");
  } finally {
    if (call) {
      await Promise.race([call("Browser.close").catch(() => {}), sleep(1500)]);
    }
    if (socket) socket.close();
    browser.kill();
    browser.stdin.destroy();
    browser.stdout.destroy();
    browser.stderr.destroy();
    browser.unref();
  }
});
