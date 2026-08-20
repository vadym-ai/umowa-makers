# DocGen

Generator umów i dokumentów (PL).

## Branding

Aplikacja występuje pod marką **DocGen**.

### Paleta (tokeny HSL w `src/index.css`)

| Token | Wartość | Zastosowanie |
|---|---|---|
| `--background` | 240 20% 98% | tło aplikacji |
| `--foreground` | 244 47% 20% | tekst podstawowy |
| `--primary` | 239 84% 67% | indygo, akcje główne |
| `--secondary` | 250 100% 97% | jasne powierzchnie |
| `--muted` | 252 24% 91% | tła pomocnicze |
| `--accent` | 250 86% 95% | jasny lawendowy tint — chipy, hover/focus shadcn |
| `--accent-foreground` | 244 55% 51% | ikony/tekst na akcencie |
| `--border` / `--input` | 252 24% 91% | obramowania |
| `--ring` | 239 84% 67% | focus ring |
| `--radius` | 0.75rem | zaokrąglenia |
| `--brand-indigo` | 239 84% 67% | gradient marki (start) |
| `--brand-violet` | 271 91% 65% | gradient marki (koniec) |

Tokeny sidebara są jasne (białe tło, indygo primary, lawendowy accent).

**Uwaga:** `--accent` musi pozostać jasnym lawendowym tintem — mocny fiolet
używany jest wyłącznie przez `--brand-violet` w gradientach.

### Klasy pomocnicze (`@layer components`)

- `.brand-gradient` — `linear-gradient(135deg, brand-indigo, brand-violet)`; używana na przyciskach głównych (`brand-gradient text-white border-0 hover:opacity-90`).
- `.brand-shadow` — miękki cień kart.
- `.brand-shadow-lg` — cień hover dla kart interaktywnych.

Typografia: **Inter** (400/500/600/700), importowana w `src/index.css`.

### Komponent `DocGenLogo`

`src/components/DocGenLogo.tsx` — logo marki: inline SVG dokumentu z gradientem
`#818cf8 → #a855f7` plus wordmark „Doc" (granat `#1e1b4b`) + „Gen" (fiolet `#a855f7`).

Props: `size?: 'sm' | 'lg'` (`sm` = ikona 24px / `text-lg`, `lg` = 40px / `text-3xl`).

Użycie: `sm` w nagłówku (`AppLayout`), `lg` wyśrodkowane nad kartą na stronach
logowania i rejestracji. Favicon (`public/favicon.svg`) pochodzi z tego samego
SVG, bez wordmarku.

### Zakres brandingu

Branding dotyczy wyłącznie interfejsu aplikacji. Dokumenty (podgląd A4 i eksport
PDF) pozostają czarno-białe, w kroju Times New Roman — reguły `.a4-page`
w `src/index.css` oraz `ContractPreview.tsx` nie są objęte motywem marki.

## Umowa o dzieło — szablon

### Dane stron (nowe pola)

`companies`: `krs`, `regon`, `city` (miejscowość zawarcia umowy).
`contractors`: `document_number` (paszport / karta pobytu), `tax_office`,
`bank_account` (IBAN, pod przyszły rachunek), `email`, `phone`.

Pole `representative` firmy jest wieloliniowe — jedna osoba w jednej linii,
np. `Vadym Moskalenko – Członek Zarządu`.

### Numeracja

Domyślny format to `{N}/{MM}/{YYYY}` przy pustym prefiksie (np. `1/07/2026`).
Funkcja `public.format_contract_number` obsługuje tokeny `{prefix}`, `{NNN}`,
`{NN}`, `{N}`, `{MM}`, `{YYYY}`, `{YY}`. Liczniki (`contract_counters`)
pozostały bez zmian.

### Treść umowy

Szablon odwzorowuje realnie podpisywaną umowę: tytuł „Umowa o dzieło nr …”,
podtytuł z datą i miejscowością (daty w formacie `DD.MM.YYYY`, bez „ r.”),
dwukolumnowa tabela stron (ZAMAWIAJĄCY / WYKONAWCA) z ramką 1px, paragrafy
§ 1 – § 9 oraz blok podpisów („Podpis zamawiającego” / „Podpis wykonawcy”).
Klauzula RODO została **usunięta**.

Kwoty: `formatPln` → `2 800,00 zł`, `amountInWordsPl` → `dwa tysiące osiemset
złotych 00/100` (`src/lib/numberToWords.ts`; renderer PDF ma własną kopię,
używającą zwykłej spacji zamiast twardej).

Snapshot umowy (`ContractSnapshot`) zawiera dodatkowo `city` i `paymentDays`
oraz nowe pola stron.

### Dwa renderery — muszą pozostać zgodne

`src/components/ContractPreview.tsx` (podgląd A4 / eksport przeglądarkowy) oraz
`supabase/functions/generate-contract-pdf/render.ts` (PDF serwerowy, pdf-lib)
generują ten sam tekst. **Każda zmiana treści musi trafić do obu plików.**
Test `supabase/functions/generate-contract-pdf/index.test.ts` sprawdza polskie
znaki diakrytyczne oraz brzmienie § 6.

Opisy dzieł (`src/lib/contractDescriptions.ts` i
`supabase/functions/telegram-webhook/descriptions.ts`) są w miejscowniku,
bo trafiają po zwrocie „polegające na …”; oba pliki pozostają identyczne.

## Rachunek

Rachunek jest **wyprowadzany z umowy** — brak zmian w schemacie. Opcje
zapisywane są w `contracts.data.rachunek`: `date`, `kupRate` (0.5 / 0.2),
`bankAccount`, `paymentTerm`.

### Wyliczenia (`src/lib/rachunek.ts`)

Umowa o dzieło bez ZUS: składki 0, podatek 12%, KUP 50% lub 20%.
Kwota netto (do wypłaty) jest wartością wejściową — brutto dobierane jest
tak, aby `brutto - round(round(brutto - round2(brutto*kup)) * 0.12)` równało
się kwocie netto. Podstawa opodatkowania i podatek do US są zaokrąglane do
pełnych złotych. Testy: `src/test/rachunek.test.ts`.

`amountInWordsGroszePl` (`src/lib/numberToWords.ts`) daje pełne słownie,
np. `Dwa tysiące osiemset złotych zero groszy`.

### Renderery — również muszą pozostać zgodne

- `src/components/RachunekPreview.tsx` (podgląd A4 / eksport przeglądarkowy)
- `supabase/functions/generate-contract-pdf/renderRachunek.ts` (PDF serwerowy)
- `supabase/functions/generate-contract-pdf/rachunekCalc.ts` — kopia
  `src/lib/rachunek.ts` (funkcje brzegowe nie importują z `src/`).

Tabela stron jest wspólna: `src/components/PartyTable.tsx`.

Edge function przyjmuje `{ contract_id, document: "umowa" | "rachunek" }`;
nazwa pliku to `UOD-…pdf` lub `RACHUNEK-…pdf`. W „Historii" dostępna jest
pozycja „Pobierz rachunek (serwer)".

## Zgoda na wykorzystanie wizerunku i materiałów wideo

Drugi typ dokumentu (`contracts.contract_type = 'zgoda_materialy'`), z własną
numeracją, własnym generatorem (`/generator/zgoda-materialy`) i własnym PDF-em
serwerowym.

### Numeracja per typ dokumentu

`numbering_rules` ma dodatkowe kolumny `zgoda_prefix` (domyślnie `Z-`) oraz
`zgoda_format` (domyślnie `{prefix}{NN}/{MM}/{YY}`).

`contract_counters` zachowuje PK `(org_id, period_key)`, więc klucz jest
namespace'owany typem dokumentu: dla `umowa` `period_key` pozostaje bez zmian
(np. `08/26`), dla pozostałych typów jest poprzedzony typem, np. `zgoda:08/26`.

Nowe RPC (atomowy `INSERT … ON CONFLICT … RETURNING`, ta sama kontrola
członkostwa co wcześniej):

- `public.next_document_number(_org_id, _month, _year, _doc_type)`
- `public.preview_document_number(_org_id, _month, _year, _doc_type)`

`next_contract_number`, `preview_contract_number` i
`next_contract_number_for_user` (używane przez bota Telegram) działają jak
wcześniej — są cienkimi wrapperami nad powyższymi.

### Frontend

- `src/lib/zgoda.ts` — `polishPeriodPhrase` (odmiana „miesiąc/miesiące/miesięcy”,
  „rok/lata/lat”), `addPeriod`, `representativeLines/Name`, `shortCompanyName`.
  Testy: `src/test/zgoda.test.ts`.
- `src/components/ZgodaTab.tsx` + `src/pages/ZgodaPage.tsx` — generator
  (firma, reprezentant, twórca, miejscowość, data, okres zgody, wynagrodzenie).
- `src/components/ZgodaPreview.tsx` — podgląd A4 (`.a4-page`).
- Snapshot zapisywany jest w `contracts.data.zgoda`
  (`representative`, `periodCount`, `periodUnit`, `paid`, `amount`, `endDate`).

### Renderer serwerowy

`supabase/functions/generate-contract-pdf/renderZgoda.ts` — routing w `index.ts`
odbywa się po `contract.contract_type`; nazwa pliku to `ZGODA-{numer}.pdf`.
Ten renderer musi pozostać zgodny z `ZgodaPreview.tsx`. Test w
`index.test.ts` sprawdza polskie znaki i frazę okresu z § 2.

### Historia

`HistoryTab` ma kolumnę i filtr „Typ dokumentu”; kliknięcie wiersza otwiera
właściwy generator w trybie edycji.

## Manual document editing

All three A4 previews (Umowa o dzieło, Rachunek, Zgoda na materiały) can be edited by hand.

- **Edit mode** — "Edytuj tekst" captures the current preview's `innerHTML` into
  `editedHtml` state and swaps the preview for `EditableDocument`, which renders its own
  `.a4-page` div with `contentEditable`. A banner warns that form changes no longer update
  the document text. "Zakończ edycję" keeps the edits, "Przywróć oryginał" drops them and
  regenerates the document from the form.
- **Caret/re-render constraint** — the editable div must mount exactly once per edit
  session. `EditableDocument` uses a stable `editSessionId` as React `key` and an inner
  surface that freezes the initial HTML in state, so React never rewrites
  `dangerouslySetInnerHTML` while typing (which would reset the caret to the start).
  State is synced from the DOM only on blur and immediately before export/save.
- **Paste** — `handlePlainTextPaste` (`src/lib/documentHtml.ts`) inserts
  `text/plain` only, so Word / Google Docs formatting never enters the document.
- **PDF export** — before `html2pdf` runs, the `contenteditable` attribute is removed
  (and restored afterwards) alongside the existing `min-height` collapse, so the dashed
  editing outline never lands in the PDF.
- **Storage** — `contracts.data.editedHtml` + `data.editedAt` for umowa/zgoda,
  `contracts.data.rachunek.editedHtml` + `.editedAt` for the rachunek (jsonb, no
  migration). Umowa and rachunek edits are kept separately and never leak into each other.
  Opening such a contract from Historia restores the edited wording in edit mode; HTML
  loaded from the database is sanitised with DOMPurify (`sanitizeDocumentHtml`, allowlist:
  p, div, span, br, strong, b, em, i, u, h2, h3, table, thead, tbody, tr, th, td, ul, ol,
  li and the `class`/`style` attributes only).
- **Limitation** — the server renderer (`generate-contract-pdf`, pdf-lib) and the Telegram
  bot build documents from the data snapshot and ignore manual edits. Historia marks such
  rows with an "edytowano ręcznie" badge and asks for confirmation before a server PDF.

## Responsive / mobile

- **Breakpoint rule** — "mobile" means below Tailwind `lg`. At `lg` and up the desktop
  layout and behaviour are unchanged. Prefer CSS-only responsive classes;
  `src/hooks/use-mobile.tsx` is used only where real logic (not styling) branches.
- **`DocumentPreviewFrame`** — the `.a4-page` is a fixed 210 mm ≈ 794 px, so the frame
  measures its available width with a `ResizeObserver` and applies
  `transform: scale(min(1, width / 794))` with `transform-origin: top left`. Because a
  transform does not change the layout box, the frame also sets its own height to
  `naturalContentHeight * scale` (recomputed on content changes) so no empty gap appears
  below the document. A corner control toggles "Dopasuj" (default on mobile) and "100%"
  (real size, frame becomes `overflow-x-auto`); desktop defaults to 100%.
- **Scale-reset-before-export contract** — every `handleDownloadPdf` (umowa, rachunek,
  zgoda) wraps the html2pdf call in the frame's imperative `runUnscaled()` handle, which
  forces scale 1 for the duration of the capture and restores the previous scale
  afterwards. Verified: a PDF exported at 390 px is byte-identical to the desktop export
  (A4 595×842 pt, same page count). Manual edit mode also forces 100%, because a scaled
  `contentEditable` breaks caret placement in mobile Safari.
- **Bottom tab bar** — below `lg`, `AppLayout` keeps only the logo (and org chip) in the
  header and renders a fixed bottom bar: Generator, Zgody, Historia, Dane, Więcej. "Więcej"
  opens a bottom Sheet with the user email, org name + role, "Organizacja" (owner only) and
  "Wyloguj". The bar is `bg-card border-t` with `padding-bottom: env(safe-area-inset-bottom)`;
  `--bottom-nav-h` in `index.css` drives both the `<main>` bottom padding and the offset of
  the sticky mobile action bar (`.mobile-action-bar`) that carries the primary buttons.
- **Other mobile screens** — Historia renders contract cards instead of the table,
  Ustawienia stacks party rows and counter controls, Start and Organizacja go single
  column. Inputs, textareas and select triggers use `text-base` below `md` to stop iOS
  zoom-on-focus, with `inputMode`/`autoCapitalize` hints on numeric and identifier fields,
  and toasts move to top-center on mobile so they clear the bottom bar.
- **PWA** — `public/manifest.webmanifest` (standalone, 192/512/maskable icons, theme
  `#6366F1`) plus apple-touch-icon and `viewport-fit=cover` in `index.html`. Install to
  home screen only — deliberately no service worker and no offline caching, since the app
  is database-driven and a stale cache would cause more harm than good.
