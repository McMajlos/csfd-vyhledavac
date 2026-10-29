// ČSFD Vyhledávač
// Copyright (C) Sperhak (původní rozšíření ČSFD vyhladávač 1.8)
// Copyright (C) 2026 McMajlos (úpravy: Manifest V3, Chrome/Brave, automatické otevření filmu)
// SPDX-License-Identifier: GPL-3.0-only
// Tento program je svobodný software: podmínky viz soubor LICENSE.

"use strict";

importScripts("search.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "searchCSFD",
      title: "Hledat na ČSFD: %s",
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "searchCSFD" || !info.selectionText) {
    return;
  }

  chrome.storage.local.get("options", (result) => {
    const origin = result.options?.pageVer
      ? "https://www.csfd.sk"
      : "https://www.csfd.cz";
    const url = new URL("/hledat/", origin);
    const autoOpen = result.options?.autoOpen !== false;
    const query = CsfdSearch.parseQuery(info.selectionText);
    url.searchParams.set("q", autoOpen ? query.title : info.selectionText);
    if (autoOpen) {
      // Only searches started by this extension may redirect automatically.
      url.hash = `csfd-direct=${encodeURIComponent(info.selectionText)}`;
    }
    chrome.tabs.create({ url: url.href });
  });
});
