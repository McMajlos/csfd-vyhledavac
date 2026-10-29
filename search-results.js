// ČSFD Vyhledávač
// Copyright (C) Sperhak (původní rozšíření ČSFD vyhladávač 1.8)
// Copyright (C) 2026 McMajlos (úpravy: Manifest V3, Chrome/Brave, automatické otevření filmu)
// SPDX-License-Identifier: GPL-3.0-only
// Tento program je svobodný software: podmínky viz soubor LICENSE.

"use strict";

(() => {
  // Read the marker before the page's own scripts can touch the URL.
  const originalQuery = new URLSearchParams(location.hash.slice(1)).get("csfd-direct");
  if (!originalQuery) {
    return;
  }

  function run() {
    // Let the site's normal browser verification finish, without interfering.
    if (document.querySelector("#anubis_challenge")) {
      return;
    }

    const url = new URL(location.href);
    const query = CsfdSearch.parseQuery(originalQuery);
    url.hash = "";
    // Consume the marker so reloading/back navigation will not redirect again.
    history.replaceState(null, "", url.href);
    if (CsfdSearch.normalizeTitle(url.searchParams.get("q") ?? "") !== CsfdSearch.normalizeTitle(query.title)) {
      return;
    }

    chrome.storage.local.get("options", (data) => {
      if (chrome.runtime.lastError || data.options?.autoOpen === false) {
        return;
      }
      try {
        const result = CsfdSearch.analyze(document, url.origin, query);
        if (result.url) {
          location.assign(result.url);
        } else {
          console.info(
            `ČSFD Vyhledávač: film neotevřen (${result.reason}), nalezených kandidátů: ${result.candidates}.`,
            query
          );
        }
      } catch (error) {
        // Changed markup or an invalid URL must leave ordinary search usable.
        console.debug("ČSFD: automatické otevření přeskočeno.", error);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
