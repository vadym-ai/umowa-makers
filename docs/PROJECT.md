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
