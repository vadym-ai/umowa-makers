# Umowa Generator

Act as an expert React & Tailwind developer. Build a single-page web application for generating a Polish "Umowa o dzieło" (Task Contract with copyright transfer) and exporting it as a formatted PDF.

Here are the strict requirements for the app:

1. CORE LIBRARIES & SETUP:

- Use React, Tailwind CSS for styling, and `lucide-react` for icons.

- Use a library like `html2pdf.js` to export a specific HTML `<div>` as an A4 PDF document.

2. UI DASHBOARD & NAVIGATION:

- Create a clean, professional dashboard.

- Top or Sidebar navigation with two tabs/views: "Generator Umowy" (Main App) and "Dane Stron" (Settings).

3. "DANE STRON" TAB (Local Storage Logic):

- Create a form to manage the contracting parties. 

- Client (Zamawiający) fields: Nazwa firmy, Adres firmy, Reprezentowany przez.

- Contractor (Wykonawca) fields: Imię i Nazwisko, Adres zamieszkania.

- LOGIC: Use React `useState` and `useEffect` to save all these fields to the browser's `localStorage` automatically. On initial load, fetch them from `localStorage`. 

- Provide these default fallback values if empty:

  Client: "GREENCARE CLINIC SP. Z O.O.", "ul. Złota 7/28, 00-019 Warszawa", "Taras Kravchuk".

  Contractor: "Vadym Moskalenko", "ul. Holzera 3/66, 02-972 Warszawa".

4. "GENERATOR UMOWY" TAB (Inputs & Logic):

Divide this view into two columns: Control Panel (left) and Live A4 Preview (right).

Control Panel Inputs:

- "Kwota netto (PLN)" (number input).

- "Miesiąc rozliczeniowy" (Month and Year picker).

- "Przedmiot umowy" (Textarea).

Automated Logic for variables:

- Contract Number: Format as "W-01/MM/YY" based on the selected month/year.

- Dates: "Data zawarcia" = 2nd day of selected month; "Termin wykonania" = last day of selected month. Format: DD.MM.YYYY.

- Number to Words: Create a JS utility function to convert 'Kwota netto' into Polish words (e.g., 8000 -> "osiem tysięcy").

- Button "Zaproponuj unikalne dzieło": When clicked, randomly fills the "Przedmiot umowy" textarea with highly specific, non-repetitive task descriptions (e.g., "wykonanie unikalnego projektu graficznego interfejsu dla aplikacji", "stworzenie autorskich ilustracji wektorowych do kampanii", "zaprojektowanie key visuala dla nowych materiałów promocyjnych").

5. DOCUMENT PREVIEW & PDF TEMPLATE:

Create an A4-styled `<div>` (font: serif, e.g., Times New Roman, text-justify, tight line height, appropriate padding). Inject the dynamic variables from the states exactly where the brackets [ ] are. 

--- START OF EXACT TEMPLATE ---

UMOWA O DZIEŁO [Contract Number]

wraz z przeniesieniem praw autorskich

Umowa zawarta w dniu [Data zawarcia] r., w Warszawie, pomiędzy:

[Client Nazwa firmy], [Client Adres firmy]

Reprezentowanym przez p. [Client Reprezentowany przez] zwanym dalej Zamawiającym, a

p. [Contractor Imię i Nazwisko], [Contractor Adres zamieszkania]

zwanym dalej Wykonawcą, o następującej treści:

§ 1

Zamawiający powierza wykonanie, a Wykonawca zobowiązuje się wykonać dzieło polegające na: [Przedmiot umowy]

§ 2

1. Wykonawca oświadcza, iż posiada wiedzę, kwalifikacje i umiejętności niezbędne dla wykonania dzieła.

2. Wykonawca oświadcza, że wykona dzieło w sposób staranny, sumienny i prawidłowy, zgodnie ze specyfiką dzieła oraz informacjami i wytycznymi ze strony Zamawiającego.

3. Wykonawca oświadcza, że dzieło będzie wynikiem jego oryginalnej twórczości i nie będzie naruszać praw osób trzecich. 

§ 3

1. W razie stwierdzenia nieprawidłowości oświadczeń z § 2 lub wad prawnych dzieła, Zamawiający będzie uprawniony do odstąpienia od umowy lub żądania zwrotu wypłaconego wynagrodzenia. 

2. Dzieło ma charakter indywidualny i jest przedmiotem prawa autorskiego.

§ 4

Termin rozpoczęcia dzieła strony ustaliły na dzień [Data zawarcia] r., a wykonania na dzień [Termin wykonania] r.

§ 5

Wykonawcy przysługuje wynagrodzenie za wykonanie dzieła w wysokości [Kwota netto],00 zł netto (słownie: [Kwota słownie] złotych) i jest płatne z góry.

§ 6

1. Wykonawca zobowiązuje się przenieść na Zamawiającego całość autorskich praw majątkowych do dzieła, bez ograniczeń czasowych i terytorialnych.

2. Wykonawca upoważnia Zamawiającego do rozporządzania i korzystania z opracowań dzieła.

3. Przejście praw autorskich nastąpi z momentem przekazania dzieła Zamawiającemu.

§ 7

1. W sprawach nieuregulowanych mają zastosowanie przepisy Kodeksu cywilnego oraz ustawy o prawie autorskim.

2. Spory rozpoznawane będą przez sąd właściwy dla siedziby Zamawiającego.

§ 8

Umowę sporządzono w 2 jednobrzmiących egzemplarzach.

............................................                                  ............................................

Zamawiający                                                                   Wykonawca

Wyrażam zgodę na przetwarzanie moich danych osobowych dla potrzeb niezbędnych do realizacji procesu zatrudnienia zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO).

............................................

Podpis Wykonawcy

--- END OF EXACT TEMPLATE ---

6. EXPORT FUNCTIONALITY:

Add a primary "Pobierz PDF" button in the Generator tab. Clicking it triggers the PDF generation of the hidden or visible A4 template div, preserving styling, and downloads it as "UOD-[Month]-[Year].pdf". 

Ensure the UI language is strictly Polish.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://umowa-makers.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/717f3279-cc14-491d-a4a5-6980d7d4d4d3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
