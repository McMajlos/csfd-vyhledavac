// ČSFD Vyhledávač
// Copyright (C) Sperhak (původní rozšíření ČSFD vyhladávač 1.8)
// Copyright (C) 2026 McMajlos (úpravy: Manifest V3, Chrome/Brave, automatické otevření filmu)
// SPDX-License-Identifier: GPL-3.0-only
// Tento program je svobodný software: podmínky viz soubor LICENSE.

"use strict";

globalThis.CsfdSearch = (() => {
  const YEAR = "(?:18|19|20|21)\\d{2}";
  const WRAPPED_YEAR = new RegExp(`^(.*\\S)\\s*[(\\[]\\s*(${YEAR})\\s*[)\\]]$`, "u");
  const BARE_YEAR = new RegExp(`^(.*\\S)(?:\\s+|\\s*[-–—,:|]\\s*)(${YEAR})$`, "u");

  function normalizeTitle(title) {
    return title
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase("cs")
      .replace(/['’‘`´]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function titleKey(title) {
    // CSFD may list an English title with its article first or last.
    return normalizeTitle(title.trim().replace(/,\s*the$/iu, "")).replace(/^the /u, "");
  }

  function parseQuery(text) {
    const full = text.trim().replace(/\s+/gu, " ");
    const wrapped = full.match(WRAPPED_YEAR);
    const bare = wrapped ? null : full.match(BARE_YEAR);
    const match = wrapped ?? bare;
    const title = match?.[1].replace(/[\s\-–—,:|]+$/u, "");
    if (!match || !title) {
      return { title: full, year: null, fullTitle: full, bareYear: false };
    }
    // A bare number may belong to the title ("Blade Runner 2049"), so
    // matching also tries the complete text as a title.
    return { title, year: Number(match[2]), fullTitle: full, bareYear: Boolean(bare) };
  }

  function interpretations(query) {
    const list = [{ title: query.title, year: query.year }];
    if (query.bareYear) {
      list.push({ title: query.fullTitle, year: null });
    }
    return list;
  }

  const hit = (candidate) => ({ status: "hit", url: candidate.url });
  const AMBIGUOUS = { status: "ambiguous" };
  const NONE = { status: "none" };

  function decideOne(interpretation, candidates) {
    const key = titleKey(interpretation.title);
    if (!key) {
      return NONE;
    }
    const byId = new Map();
    for (const candidate of candidates) {
      const names = [candidate.title, ...(candidate.aliases ?? [])];
      if (!byId.has(candidate.id) && names.some((name) => titleKey(name) === key)) {
        byId.set(candidate.id, candidate);
      }
    }
    const matches = [...byId.values()];
    if (!matches.length) {
      return NONE;
    }

    if (interpretation.year === null) {
      // Hidden results of the same list could contain another film.
      return matches.length === 1 && !matches[0].incomplete ? hit(matches[0]) : AMBIGUOUS;
    }
    // An unknown year could hide another matching film: do not guess.
    if (matches.some((candidate) => candidate.year === null)) {
      return AMBIGUOUS;
    }
    const exact = matches.filter((candidate) => candidate.year === interpretation.year);
    if (exact.length) {
      return exact.length === 1 ? hit(exact[0]) : AMBIGUOUS;
    }
    // CSFD lists the production year, which may differ by one from the release year.
    const near = matches.filter((candidate) => Math.abs(candidate.year - interpretation.year) === 1);
    if (!near.length) {
      return NONE;
    }
    return near.length === 1 ? hit(near[0]) : AMBIGUOUS;
  }

  function decide(query, candidates) {
    const results = interpretations(query).map((item) => decideOne(item, candidates));
    if (results.some((result) => result.status === "ambiguous")) {
      return { url: null, reason: "ambiguous" };
    }
    const urls = new Set(results.filter((result) => result.status === "hit").map((result) => result.url));
    if (urls.size === 1) {
      return { url: [...urls][0], reason: "ok" };
    }
    return { url: null, reason: urls.size ? "ambiguous" : "no-match" };
  }

  function findUniqueMatch(query, candidates) {
    return decide(query, candidates).url;
  }

  function hasMoreResults(section) {
    return Boolean(section.querySelector(
      '[data-ajax-url], .box-content-more-gray a, a[href*="pageFilms="], a[href*="pageSeries="]'
    ));
  }

  function analyze(document, origin, query) {
    const wanted = new Set(interpretations(query).map((item) => titleKey(item.title)));
    const candidates = [];
    for (const section of document.querySelectorAll(".main-movies, .main-series")) {
      const incomplete = hasMoreResults(section);
      for (const article of section.querySelectorAll("article")) {
        const link = article.querySelector(".film-title-name[href]");
        if (!link) {
          continue;
        }
        const title = link.textContent.trim();
        // The matched alternative title is shown separately from the main one.
        const aliases = [...article.querySelectorAll(".search-name")]
          .map((node) => node.textContent.trim().replace(/^\((.*)\)$/su, "$1").trim())
          .filter(Boolean);
        if (![title, ...aliases].some((name) => wanted.has(titleKey(name)))) {
          continue;
        }
        const url = new URL(link.getAttribute("href"), origin);
        const film = url.pathname.match(/^\/film\/(\d+)-[^/]+\/(?:(\d+)-[^/]+\/)?(?:(?:prehled|prehlad)\/)?$/);
        if (url.origin !== origin || !film || url.search || url.hash) {
          return { url: null, reason: "unexpected-url", candidates: candidates.length };
        }
        const yearText = article.querySelector(".film-title-info .info")?.textContent.trim() ?? "";
        const year = yearText.match(/^\(?\s*((?:18|19|20|21)\d{2})\s*\)?$/);
        candidates.push({
          id: film[2] ? `${film[1]}/${film[2]}` : film[1],
          title,
          aliases,
          year: year ? Number(year[1]) : null,
          url: url.href,
          incomplete,
        });
      }
    }
    return { ...decide(query, candidates), candidates: candidates.length };
  }

  function findDetail(document, origin, query) {
    return analyze(document, origin, query).url;
  }

  return Object.freeze({ parseQuery, normalizeTitle, titleKey, findUniqueMatch, analyze, findDetail });
})();
