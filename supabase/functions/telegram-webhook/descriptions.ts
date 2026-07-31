// SINGLE SOURCE OF TRUTH (edge function copy).
// Keep this file byte-identical with src/lib/contractDescriptions.ts
// (apart from the header comment). Update both whenever entries change.

export interface ContractDescription {
  text: string;
  min: number;
  max: number;
}

const descriptions: ContractDescription[] = [
  // 300–1500
  { text: "przygotowanie unikalnego zestawu ikon i elementów graficznych interfejsu użytkownika dla platformy webowej", min: 300, max: 1500 },
  { text: "opracowanie koncepcji kreatywnej i wykonanie autorskich grafik do newslettera firmowego", min: 300, max: 1500 },
  { text: "wykonanie autorskiej sesji retuszowej i obróbki fotografii produktowej do katalogu firmowego", min: 300, max: 1500 },
  { text: "wykonanie autorskiego zestawu grafik na posty w mediach społecznościowych wraz z szablonami edycyjnymi", min: 300, max: 1200 },
  { text: "opracowanie autorskiego projektu wizytówek i papieru firmowego wraz z przygotowaniem plików do druku", min: 300, max: 1200 },
  { text: "wykonanie autorskiego projektu banerów reklamowych w zestawie formatów displayowych", min: 400, max: 1500 },
  { text: "przygotowanie autorskiego projektu ulotki informacyjnej wraz ze składem tekstu i przygotowaniem do druku", min: 300, max: 1000 },
  { text: "wykonanie autorskich grafik nagłówkowych i miniatur do materiałów publikowanych w serwisach wideo", min: 300, max: 1000 },

  // 1000–4000
  { text: "wykonanie autorskiego projektu layoutu strony internetowej landing page, wraz z makietami responsywnymi na urządzenia mobilne", min: 1000, max: 4000 },
  { text: "przygotowanie unikalnych materiałów graficznych do prezentacji korporacyjnej, w tym szablonów slajdów i infografik", min: 1000, max: 4000 },
  { text: "stworzenie oryginalnego projektu opakowania produktu, uwzględniającego aspekty wizualne, typograficzne i kolorystyczne", min: 1000, max: 4000 },
  { text: "zaprojektowanie key visuala dla nowych materiałów promocyjnych, w tym banerów, ulotek i grafik do mediów społecznościowych", min: 1200, max: 4500 },
  { text: "stworzenie autorskich ilustracji wektorowych do kampanii marketingowej w mediach społecznościowych, uwzględniających identyfikację wizualną marki", min: 1000, max: 3500 },
  { text: "stworzenie oryginalnego projektu graficznego materiałów szkoleniowych, w tym podręcznika i certyfikatów", min: 1000, max: 3000 },
  { text: "wykonanie autorskiego projektu graficznego stoiska targowego wraz z materiałami towarzyszącymi", min: 1500, max: 5000 },
  { text: "opracowanie autorskiego zestawu infografik prezentujących dane i procesy biznesowe klienta", min: 1000, max: 3000 },
  { text: "zaprojektowanie unikalnego systemu wizualnej nawigacji i oznaczeń dla przestrzeni biurowej klienta", min: 1500, max: 6000 },

  // 3000–8000
  { text: "wykonanie autorskiego projektu animacji motion design do wykorzystania w materiałach promocyjnych online", min: 3000, max: 9000 },
  { text: "opracowanie autorskiej strategii komunikacji wizualnej marki w kanałach cyfrowych, wraz z zestawem szablonów graficznych", min: 3000, max: 9000 },
  { text: "wykonanie autorskiego projektu graficznego serwisu internetowego wraz z biblioteką komponentów interfejsu", min: 3500, max: 10000 },
  { text: "stworzenie oryginalnej koncepcji kreatywnej kampanii reklamowej, w tym scenariuszy spotów i layoutów graficznych", min: 3000, max: 12000 },
  { text: "opracowanie autorskiego projektu serii ilustracji redakcyjnych do publikacji wydawniczej", min: 3000, max: 8000 },
  { text: "wykonanie autorskiego projektu graficznego katalogu produktowego wraz ze składem i przygotowaniem do druku", min: 3000, max: 8000 },
  { text: "przygotowanie autorskiego projektu graficznego aplikacji webowej w zakresie widoków analitycznych i raportowych", min: 4000, max: 12000 },

  // 8000–20000
  { text: "wykonanie unikalnego projektu graficznego interfejsu użytkownika dla aplikacji mobilnej, obejmującego ekrany główne, nawigację oraz elementy interaktywne", min: 6000, max: 18000 },
  { text: "opracowanie autorskiego projektu identyfikacji wizualnej dla nowej linii produktowej, obejmującego logotyp, paletę kolorów i typografię", min: 6000, max: 20000 },
  { text: "opracowanie kompleksowego autorskiego systemu identyfikacji wizualnej marki wraz z księgą znaku i zasadami stosowania", min: 8000, max: 25000 },
  { text: "wykonanie autorskiego projektu designu produktu cyfrowego obejmującego badania, makiety i finalne widoki interfejsu", min: 8000, max: 25000 },
  { text: "stworzenie autorskiej oprawy graficznej wydarzenia firmowego wraz z materiałami drukowanymi, cyfrowymi i animowanymi", min: 8000, max: 20000 },
  { text: "opracowanie autorskiego rebrandingu marki obejmującego nowy logotyp, system wizualny i wdrożeniowe materiały wzorcowe", min: 10000, max: 30000 },
];

function pickRandom(list: ContractDescription[]): string {
  return list[Math.floor(Math.random() * list.length)].text;
}

export function getRandomDescription(amount?: number | null): string {
  if (amount === undefined || amount === null || !Number.isFinite(amount) || amount <= 0) {
    return pickRandom(descriptions);
  }
  const matching = descriptions.filter((d) => d.min <= amount && amount <= d.max);
  if (matching.length > 0) return pickRandom(matching);

  const distance = (d: ContractDescription) =>
    amount < d.min ? d.min - amount : amount - d.max;
  const closest = [...descriptions].sort((a, b) => distance(a) - distance(b)).slice(0, 5);
  return pickRandom(closest);
}
