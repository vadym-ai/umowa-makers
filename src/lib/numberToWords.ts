const ones = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
const teens = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
const tens = ['', 'dziesięć', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];
const hundreds = ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset', 'osiemset', 'dziewięćset'];

function thousandsForm(n: number): string {
  if (n === 1) return 'tysiąc';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastTwo >= 12 && lastTwo <= 14) return 'tysięcy';
  if (lastDigit >= 2 && lastDigit <= 4) return 'tysiące';
  return 'tysięcy';
}

function convertHundreds(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) parts.push(hundreds[h]);
  if (rest >= 10 && rest <= 19) {
    parts.push(teens[rest - 10]);
  } else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    if (t > 0) parts.push(tens[t]);
    if (o > 0) parts.push(ones[o]);
  }
  return parts.join(' ');
}

export function numberToPolishWords(num: number): string {
  if (num === 0) return 'zero';
  if (num < 0) return 'minus ' + numberToPolishWords(-num);

  const parts: string[] = [];
  const millions = Math.floor(num / 1000000);
  const thousandsPart = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  if (millions > 0) {
    if (millions === 1) {
      parts.push('milion');
    } else {
      parts.push(convertHundreds(millions));
      const lastDigit = millions % 10;
      const lastTwo = millions % 100;
      if (lastTwo >= 12 && lastTwo <= 14) parts.push('milionów');
      else if (lastDigit >= 2 && lastDigit <= 4) parts.push('miliony');
      else parts.push('milionów');
    }
  }

  if (thousandsPart > 0) {
    if (thousandsPart === 1) {
      parts.push('tysiąc');
    } else {
      parts.push(convertHundreds(thousandsPart));
      parts.push(thousandsForm(thousandsPart));
    }
  }

  if (remainder > 0) {
    parts.push(convertHundreds(remainder));
  }

  return parts.join(' ');
}

/** "2 800,00 zł" — non-breaking-space thousands separator, comma decimals. */
export function formatPln(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const negative = value < 0;
  const cents = Math.round(Math.abs(value) * 100);
  const int = Math.floor(cents / 100);
  const rest = cents % 100;
  const grouped = int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return `${negative ? '-' : ''}${grouped},${rest.toString().padStart(2, '0')} zł`;
}

/** "dwa tysiące osiemset złotych 00/100" */
export function amountInWordsPl(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const cents = Math.round(Math.abs(value) * 100);
  const int = Math.floor(cents / 100);
  const rest = cents % 100;
  const prefix = value < 0 ? 'minus ' : '';
  return `${prefix}${numberToPolishWords(int)} złotych ${rest.toString().padStart(2, '0')}/100`;
}
