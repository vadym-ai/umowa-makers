const descriptions = [
  "wykonanie unikalnego projektu graficznego interfejsu użytkownika dla aplikacji mobilnej, obejmującego ekrany główne, nawigację oraz elementy interaktywne",
  "stworzenie autorskich ilustracji wektorowych do kampanii marketingowej w mediach społecznościowych, uwzględniających identyfikację wizualną marki",
  "zaprojektowanie key visuala dla nowych materiałów promocyjnych, w tym banerów, ulotek i grafik do mediów społecznościowych",
  "opracowanie autorskiego projektu identyfikacji wizualnej dla nowej linii produktowej, obejmującego logotyp, paletę kolorów i typografię",
  "stworzenie oryginalnej koncepcji kreatywnej kampanii reklamowej, w tym scenariuszy spotów i layoutów graficznych",
  "wykonanie autorskiego projektu layoutu strony internetowej landing page, wraz z makietami responsywnymi na urządzenia mobilne",
  "przygotowanie unikalnych materiałów graficznych do prezentacji korporacyjnej, w tym szablonów slajdów i infografik",
  "opracowanie autorskiej strategii komunikacji wizualnej marki w kanałach cyfrowych, wraz z zestawem szablonów graficznych",
  "stworzenie oryginalnego projektu opakowania produktu, uwzględniającego aspekty wizualne, typograficzne i kolorystyczne",
  "wykonanie autorskiego projektu animacji motion design do wykorzystania w materiałach promocyjnych online",
  "przygotowanie unikalnego zestawu ikon i elementów graficznych interfejsu użytkownika dla platformy webowej",
  "opracowanie koncepcji kreatywnej i wykonanie autorskich grafik do newslettera firmowego",
  "stworzenie oryginalnego projektu graficznego materiałów szkoleniowych, w tym podręcznika i certyfikatów",
  "wykonanie autorskiej sesji retuszowej i obróbki fotografii produktowej do katalogu firmowego",
  "zaprojektowanie unikalnego systemu wizualnej nawigacji i oznaczeń dla przestrzeni biurowej klienta",
];

export function getRandomDescription(): string {
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}
