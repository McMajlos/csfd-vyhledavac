// ČSFD Vyhledávač
// Copyright (C) Sperhak (původní rozšíření ČSFD vyhladávač 1.8)
// Copyright (C) 2026 McMajlos (úpravy: Manifest V3, Chrome/Brave, automatické otevření filmu)
// SPDX-License-Identifier: GPL-3.0-only
// Tento program je svobodný software: podmínky viz soubor LICENSE.

"use strict";

const siteSwitch = document.getElementById("siteSwitch");
const autoOpenSwitch = document.getElementById("autoOpenSwitch");
let options = {};

chrome.storage.local.get("options", (data) => {
  options = data.options ?? {};
  siteSwitch.checked = Boolean(options.pageVer);
  autoOpenSwitch.checked = options.autoOpen !== false;
  siteSwitch.disabled = false;
  autoOpenSwitch.disabled = false;
});

function saveOptions() {
  options.pageVer = siteSwitch.checked;
  options.autoOpen = autoOpenSwitch.checked;
  chrome.storage.local.set({ options });
}

siteSwitch.addEventListener("change", saveOptions);
autoOpenSwitch.addEventListener("change", saveOptions);
