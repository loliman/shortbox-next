export function toShortboxDate(date: string) {
  if (date.includes("01.01.")) {
    return date.substring(6);
  }
  if (date.startsWith("01.")) {
    date = date.substring(2);
  }

  date = date
    .replace(".01.", ". Januar ")
    .replace(".02.", ". Februar ")
    .replace(".03.", ". März ")
    .replace(".04.", ". April ")
    .replace(".05.", ". Mai ")
    .replace(".06.", ". Juni ")
    .replace(".07.", ". Juli ")
    .replace(".08.", ". August ")
    .replace(".09.", ". September ")
    .replace(".10.", ". Oktober ")
    .replace(".11.", ". November ")
    .replace(".12.", ". Dezember ");

  if (date.startsWith(".")) date = date.substring(2).trim();

  return date;
}

/* convISBN.js : converter ISBN10 <-> ISBN13                 */
/*   Copyright (c) 2007 by H.Tsujimura  <tsupo@na.rim.or.jp> */
/*   Distributed by LGPL.                                    */
/*      this script written by H.Tsujimura  20 Jan 2007      */

export function toIsbn13(isbn: string) {
  let result = isbn;
  if (isbn.length < 13) {
    result = convISBN10toISBN13(isbn);
  }

  return (
    result.substring(0, 3) +
    "-" +
    result.substring(3, 4) +
    "-" +
    result.substring(4, 9) +
    "-" +
    result.substring(9, 12) +
    "-" +
    result.substring(12, 13)
  );
}

export function toIsbn10(isbn: string) {
  let result = isbn;
  if (isbn.length >= 13) {
    result = convISBN13toISBN10(isbn);
  }

  return (
    result.substring(0, 1) +
    "-" +
    result.substring(1, 6) +
    "-" +
    result.substring(6, 9) +
    "-" +
    result.substring(9, 10)
  );
}

function convISBN13toISBN10(str: string) {
  let s = "";
  let c = "";
  let checkDigit = 0;
  let result = "";

  s = str.substring(3, str.length);
  for (let i = 10; i > 1; i--) {
    c = s.charAt(10 - i);
    checkDigit += Number(c) * i;
    result += c;
  }
  checkDigit = (11 - (checkDigit % 11)) % 11;
  result += checkDigit === 10 ? "X" : checkDigit + "";

  return result;
}

function convISBN10toISBN13(str: string) {
  let c = "";
  let checkDigit = 0;
  let result = "";

  c = "9";
  result += c;
  checkDigit += Number(c);

  c = "7";
  result += c;
  checkDigit += Number(c) * 3;

  c = "8";
  result += c;
  checkDigit += Number(c);

  for (let i = 0; i < 9; i++) {
    c = str.charAt(i);
    if (i % 2 === 0) checkDigit += Number(c) * 3;
    else checkDigit += Number(c);
    result += c;
  }
  checkDigit = (10 - (checkDigit % 10)) % 10;
  result += checkDigit + "";

  return result;
}
