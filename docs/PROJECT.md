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
