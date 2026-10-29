# ČSFD Vyhledávač

Neoficiální rozšíření pro Chrome a další prohlížeče postavené na Chromiu
(Brave a další). Vyhledá označený text na ČSFD.cz nebo ČSFD.sk.

## O tomto rozšíření

**Česky**

ČSFD Vyhledávač umožňuje vyhledat označený text na ČSFD přímo z nabídky
pravého tlačítka. Snadno tak najdete informace o filmech, seriálech nebo
hercích. Mezi českou ČSFD.cz a slovenskou ČSFD.sk můžete přepínat v nastavení.

Oproti původní verzi dokáže při rozpoznané shodě názvu a volitelného roku
automaticky otevřít detail filmu nebo seriálu, bez dalšího kliknutí. Při
nejasném výsledku zůstane běžné vyhledávání. Automatické otevření lze vypnout.

Neoficiální rozšíření pro Chrome a další prohlížeče postavené na Chromiu
(Brave a další). Vychází z rozšíření od autora Sperhak; úpravy a nové funkce:
McMajlos. Licence GNU GPLv3.

**English**

ČSFD Vyhledávač lets you search ČSFD for highlighted text directly from the
right-click menu. Quickly find information about movies, TV series, or actors,
and choose between the Czech ČSFD.cz and Slovak ČSFD.sk websites in the
settings.

Unlike the original version, it can automatically open a movie or series
detail page when it identifies a matching title and optional year, saving you
another click. If the result is ambiguous, it keeps the regular search results
open. Automatic navigation can be disabled.

An unofficial extension for Chrome and other Chromium-based browsers (Brave and
others). Based on the original extension by Sperhak; modifications and new
features by McMajlos. Licensed under GNU GPLv3.

## Autorství a licence

- **Původní rozšíření:** [ČSFD vyhladávač 1.8](https://addons.mozilla.org/cs/firefox/addon/%C4%8Dsfd-vyhlad%C3%A1va%C4%8D/)
  od autora **Sperhak**, licence GNU GPL v3.0.
- **Úpravy a nové funkce:** **McMajlos**, 2026.
- Toto rozšíření je odvozené dílo a šíří se pod licencí **GNU GPL v3.0**.
  Úplné znění je v souboru [`LICENSE`](LICENSE). Ikonu rozšíření vytvořil
  McMajlos; není převzatá z původního rozšíření ani z loga ČSFD.
- Rozšíření není oficiálním pokračováním ani aktualizací původního a autor
  původního rozšíření ho neschválil ani nepodporuje.
- Rozšíření nijak nesouvisí se službou ČSFD.

## Instalace

1. V Brave otevřete `brave://extensions` (v Chrome `chrome://extensions`).
2. Zapněte **Režim pro vývojáře**.
3. Klikněte na **Načíst rozbalené** (Load unpacked).
4. Vyberte složku `/home/majlos/Downloads/csfd-vyhledavac-brave`.

Složku po instalaci nemažte ani nepřesouvejte: Brave z ní rozšíření načítá.
Pokud ji chcete uložit jinam, přesuňte ji před instalací.

## Použití

Na webové stránce označte název filmu nebo seriálu. Pravým tlačítkem otevřete
nabídku a vyberte **Hledat na ČSFD**. Výsledky se otevřou v nové kartě.
Na interních stránkách prohlížeče nemusí být tato nabídka dostupná.

Kliknutím na ikonu rozšíření můžete přepnout z výchozí ČSFD.cz na ČSFD.sk.
Ikonu lze připnout přes nabídku rozšíření v liště prohlížeče.

## Automatické otevření filmu

Volba **Otevřít rovnou stránku filmu** je ve výchozím stavu zapnutá.
Rozšíření otevře hledání na ČSFD a po načtení výsledků automaticky přejde na
detail, pokud najde jedinou přesnou shodu hlavního nebo alternativního názvu
zobrazeného u výsledku. Při porovnání ignoruje velikost písmen, diakritiku,
nadbytečné mezery a anglický člen „The“ na začátku nebo za čárkou na konci.
Například **Shawshank Redemption** odpovídá alternativnímu názvu
**The Shawshank Redemption** u filmu **Vykoupení z věznice Shawshank**.
Výsledky tak mohou krátce probliknout,
ale není potřeba další kliknutí.

Rok může být v označeném textu v závorkách i bez nich: **Mayday (2026)**,
**Mayday 2026**, **Mayday [2026]**. Rozšíření hledá na ČSFD samotný název a rok ověří mezi
výsledky. Pokud číslo na konci patří k názvu (například **Blade Runner 2049**),
zkusí i celý text jako název. ČSFD uvádí rok výroby, proto se při neshodě
akceptuje i rok o 1 jiný, ale jen pokud je shoda jediná.

Zobrazený seznam bývá zkrácený odkazem „Další nalezené…“. U hledání s rokem
to automatické otevření neblokuje. U hledání bez roku blokuje jen tehdy,
když je neúplný seznam, ve kterém byla shoda nalezena.

Při více odpovídajících filmech/seriálech, neznámém roku nebo nerozpoznané
struktuře stránky zůstane běžné hledání. Porovnávají se pouze názvy zobrazené
ve výsledcích (hlavní i alternativní), nikoli všechny názvy na detailu filmu.
Libovolná část názvu nestačí. Běžné hledání otevřené mimo rozšíření se
nepřesměrovává. Když se film neotevře, důvod je v konzoli stránky
(F12 → Konzole), řádek „ČSFD Vyhledávač: film neotevřen“.

ČSFD používá ochranu proti botům. Rozšíření ji neobchází: pracuje až s běžně
načtenou stránkou v prohlížeči. Pokud ověření neproběhne, detail neotevře.

Po aktualizaci souborů otevřete `brave://extensions` a u rozšíření klikněte na
**Znovu načíst** (ikona kruhové šipky). Brave může požádat o potvrzení nového
přístupu ke stránkám hledání na ČSFD.cz a ČSFD.sk.

## Změny oproti původní (Firefox) verzi

- **Rovnou na detail filmu:** po vyhledání se při jednoznačné shodě názvu
  (a případného roku) automaticky otevře stránka filmu nebo seriálu na ČSFD.
  Funkci lze vypnout v nastavení rozšíření.
- Rozpoznání roku v závorkách i bez nich (`Mayday 2026`) a alternativních
  (např. původních anglických) názvů.
- Manifest V3 a service worker pro Chromium (Chrome, Brave).
- Použití API `chrome` místo `browser`.
- Oprávnění `contextMenus` a `storage`; skript pouze na stránkách hledání
  ČSFD.cz/sk. Bez přístupu k záložkám nebo čtení všech karet.
- Bezpečné kódování vyhledávaného textu, včetně znaků `&`, `#` a `+`.
- Zachována volba české/slovenské ČSFD.

Tato lokální úprava nemá automatické aktualizace z Firefox Add-ons.

## Testy

Vyžadují Node.js 22 nebo novější. Ze složky rozšíření spusťte:

```sh
node --test tests/search.test.cjs
node --test tests/brave.test.cjs
```

Druhý test používá nainstalovaný Brave a nový dočasný profil v `/tmp/opencode`.
Ověřuje skutečné načtení rozšíření a přesměrování na simulovaných výsledcích
ČSFD; nepoužívá osobní profil ani síťové požadavky na ČSFD. Cestu k Brave lze
změnit proměnnou `BRAVE_BINARY`.
