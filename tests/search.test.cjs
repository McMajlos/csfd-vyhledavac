"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const root = path.join(__dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");
const context = vm.createContext({ URL });
vm.runInContext(source("search.js"), context);
const search = context.CsfdSearch;
const film = (id, title, year) => ({
  id,
  title,
  year,
  url: `https://www.csfd.cz/film/${id}-film/prehled/`,
});

test("recognizes year in parentheses, brackets and bare form", () => {
  for (const text of ["  Verity (2026)  ", "Verity [2026]", "Verity 2026", "Verity - 2026", "Verity, 2026"]) {
    const parsed = search.parseQuery(text);
    assert.equal(parsed.title, "Verity", text);
    assert.equal(parsed.year, 2026, text);
  }
  assert.equal(search.parseQuery("Verity (2026)").bareYear, false);
  assert.equal(search.parseQuery("Verity 2026").bareYear, true);
});

test("a lone number is a title; numeric endings also try the whole text", () => {
  for (const title of ["1917", "2012", "Verity"]) {
    assert.equal(search.parseQuery(title).title, title);
    assert.equal(search.parseQuery(title).year, null);
  }
  const blade = search.parseQuery("Blade Runner 2049");
  const candidates = [film("1", "Blade Runner", 1982), film("2", "Blade Runner 2049", 2017)];
  assert.equal(search.findUniqueMatch(blade, candidates), candidates[1].url);
  assert.equal(search.findUniqueMatch(search.parseQuery("Blade Runner 1982"), candidates), candidates[0].url);
});

test("bare year finds the film; year off by one still matches only uniquely", () => {
  const mayday = film("1727692", "Mayday", 2026);
  const others = [film("1", "Mayday", 2021), film("2", "Mayday", 2010), mayday];
  assert.equal(search.findUniqueMatch(search.parseQuery("Mayday 2026"), others), mayday.url);
  assert.equal(search.findUniqueMatch(search.parseQuery("Mayday 2025"), others), mayday.url);
  assert.equal(search.findUniqueMatch(search.parseQuery("Mayday 2023"), others), null);
  assert.equal(search.findUniqueMatch(search.parseQuery("Mayday 2026"), [film("1", "Mayday", 2025)]), "https://www.csfd.cz/film/1-film/prehled/");
  assert.equal(search.findUniqueMatch(search.parseQuery("Mayday 2026"), [film("1", "Mayday", 2024)]), null);
});

test("incomplete list blocks only yearless queries", () => {
  const candidates = [{ ...film("1", "Mayday", 2026), incomplete: true }];
  assert.equal(search.findUniqueMatch(search.parseQuery("Mayday 2026"), candidates), candidates[0].url);
  assert.equal(search.findUniqueMatch(search.parseQuery("Mayday"), candidates), null);
});

test("unique exact title opens, partial or missing title does not", () => {
  const candidates = [film("1", "Verity", 2026), film("2", "Verity: Behind the Scenes", 2026)];
  assert.equal(search.findUniqueMatch(search.parseQuery("Verity"), candidates), candidates[0].url);
  assert.equal(search.findUniqueMatch(search.parseQuery("Ver"), candidates), null);
  assert.equal(search.findUniqueMatch(search.parseQuery(""), candidates), null);
});

test("year distinguishes remakes but never guesses same-year matches", () => {
  const candidates = [film("1", "Verity", 2026), film("2", "Verity", 2000)];
  assert.equal(search.findUniqueMatch(search.parseQuery("Verity"), candidates), null);
  assert.equal(search.findUniqueMatch(search.parseQuery("Verity (2026)"), candidates), candidates[0].url);
  assert.equal(search.findUniqueMatch(search.parseQuery("Verity (2024)"), candidates), null);
  candidates.push(film("3", "Verity", 2026));
  assert.equal(search.findUniqueMatch(search.parseQuery("Verity (2026)"), candidates), null);
});

test("unknown year prevents year-based redirect", () => {
  const candidates = [film("1", "Verity", 2026), film("2", "Verity", null)];
  assert.equal(search.findUniqueMatch(search.parseQuery("Verity (2026)"), candidates), null);
});

test("matches original English title independently of localized title", () => {
  const candidate = {
    ...film("2294", "Vykoupení z věznice Shawshank", 1994),
    aliases: ["The Shawshank Redemption"],
  };
  for (const title of ["Shawshank Redemption", "The Shawshank Redemption", "Shawshank Redemption, The"]) {
    assert.equal(search.findUniqueMatch(search.parseQuery(title), [candidate]), candidate.url);
  }
  assert.equal(search.findUniqueMatch(search.parseQuery("Shawshank"), [candidate]), null);
  assert.equal(search.findUniqueMatch(search.parseQuery("Shawshank Redemption (1994)"), [candidate]), candidate.url);
  assert.equal(search.findUniqueMatch(search.parseQuery("Shawshank Redemption (1996)"), [candidate]), null);
});

test("alternative titles never hide ambiguity or permit arbitrary substrings", () => {
  const first = { ...film("1", "Český název", 1994), aliases: ["The Shawshank Redemption"] };
  const second = { ...film("2", "Jiný název", 1994), aliases: ["Shawshank Redemption"] };
  assert.equal(search.findUniqueMatch(search.parseQuery("Shawshank Redemption"), [first, second]), null);
  assert.equal(search.findUniqueMatch(search.parseQuery("Redemption"), [first]), null);
});

test("normalizes case, accents, whitespace and deduplicates film IDs", () => {
  const candidates = [film("1", "Čert a Káča", 1955), film("1", "Čert a Káča", 1955)];
  assert.equal(search.findUniqueMatch(search.parseQuery(" CERT  A KACA "), candidates), candidates[0].url);
  assert.equal(search.normalizeTitle("Wall-E"), search.normalizeTitle("Wall E"));
  assert.equal(search.normalizeTitle("Ocean's Eleven"), search.normalizeTitle("Oceans Eleven"));
});

function background(options) {
  let clicked;
  const tabs = [];
  const chrome = {
    runtime: { onInstalled: { addListener() {} } },
    contextMenus: { onClicked: { addListener(fn) { clicked = fn; } } },
    storage: { local: { get(key, fn) { fn({ options }); } } },
    tabs: { create(tab) { tabs.push(tab); } },
  };
  const ctx = vm.createContext({ chrome, URL });
  ctx.importScripts = (file) => vm.runInContext(source(file), ctx);
  vm.runInContext(source("background.js"), ctx);
  return { tabs, click: (info) => clicked(info) };
}

test("background searches title without year and preserves original query in marker", () => {
  const bg = background(undefined);
  bg.click({ menuItemId: "searchCSFD", selectionText: "Verity (2026)" });
  const url = new URL(bg.tabs[0].url);
  assert.equal(url.origin, "https://www.csfd.cz");
  assert.equal(url.searchParams.get("q"), "Verity");
  assert.equal(new URLSearchParams(url.hash.slice(1)).get("csfd-direct"), "Verity (2026)");
});

test("disabled auto-open retains ordinary search and Slovak choice", () => {
  const bg = background({ pageVer: true, autoOpen: false });
  const text = "Čert & Káča #1 + 100% (2026)";
  bg.click({ menuItemId: "searchCSFD", selectionText: text });
  const url = new URL(bg.tabs[0].url);
  assert.equal(url.origin, "https://www.csfd.sk");
  assert.equal(url.searchParams.get("q"), text);
  assert.equal(url.hash, "");
  assert.equal([...url.searchParams].length, 1);
  bg.click({ menuItemId: "other", selectionText: text });
  bg.click({ menuItemId: "searchCSFD" });
  assert.equal(bg.tabs.length, 1);
});

test("special characters round-trip in automatic search and marker", () => {
  const bg = background({ pageVer: true });
  const text = "Čert & Káča #1 + 100% / 日本語? (2026)";
  bg.click({ menuItemId: "searchCSFD", selectionText: text });
  const url = new URL(bg.tabs[0].url);
  assert.equal(url.searchParams.get("q"), search.parseQuery(text).title);
  assert.equal(new URLSearchParams(url.hash.slice(1)).get("csfd-direct"), text);
});

test("popup migrates old settings, saves both switches and preserves other keys", () => {
  for (const initial of [undefined, { pageVer: true, other: 42 }, { autoOpen: false }]) {
    let saved;
    const controls = {};
    for (const id of ["siteSwitch", "autoOpenSwitch"]) {
      controls[id] = { disabled: true, addEventListener(event, fn) { this.change = fn; } };
    }
    vm.runInNewContext(source("options.js"), {
      document: { getElementById(id) { return controls[id]; } },
      chrome: { storage: { local: {
        get(key, fn) { fn({ options: initial }); },
        set(value) { saved = value.options; },
      } } },
    });
    assert.equal(controls.siteSwitch.checked, Boolean(initial?.pageVer));
    assert.equal(controls.autoOpenSwitch.checked, initial?.autoOpen !== false);
    assert.equal(controls.siteSwitch.disabled, false);
    assert.equal(controls.autoOpenSwitch.disabled, false);
    controls.autoOpenSwitch.checked = false;
    controls.autoOpenSwitch.change();
    assert.equal(saved.autoOpen, false);
    assert.equal(saved.pageVer, controls.siteSwitch.checked);
    if (initial?.other) assert.equal(saved.other, 42);
    controls.siteSwitch.checked = !controls.siteSwitch.checked;
    controls.siteSwitch.change();
    assert.equal(saved.autoOpen, false);
    assert.equal(saved.pageVer, controls.siteSwitch.checked);
  }
});

test("manifest includes only search pages and all referenced files exist", () => {
  const manifest = JSON.parse(source("manifest.json"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["contextMenus", "storage"]);
  assert.equal(manifest.content_scripts[0].matches.length, 3);
  assert.ok(manifest.content_scripts[0].matches.every((url) => /^https:\/\/www\.csfd\.(cz|sk)\/(hledat|hladat)\/\*$/.test(url)));
  for (const file of [manifest.background.service_worker, manifest.action.default_popup,
    ...manifest.content_scripts[0].js, ...Object.values(manifest.icons)]) {
    assert.ok(fs.statSync(path.join(root, file)).size > 0);
  }
});
