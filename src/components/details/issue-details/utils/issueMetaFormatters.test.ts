import { toIsbn10, toIsbn13, toShortboxDate } from "./issueMetaFormatters";

describe("issueMetaFormatters util", () => {
  it("formats shortbox dates for year-only, month-only and full dates", () => {
    expect(toShortboxDate("01.01.2020")).toBe("2020");
    expect(toShortboxDate("01.05.2020")).toBe("Mai 2020");
    expect(toShortboxDate("15.12.2020")).toBe("15. Dezember 2020");
  });

  it("converts ISBN-10 to ISBN-13 and applies output formatting", () => {
    expect(toIsbn13("3551752131")).toBe("978-3-55175-213-0");
    expect(toIsbn13("9783551752130")).toBe("978-3-55175-213-0");
  });

  it("converts ISBN-13 to ISBN-10 and applies output formatting", () => {
    expect(toIsbn10("9783551752130")).toBe("3-55175-213-3");
    expect(toIsbn10("3551752131")).toBe("3-55175-213-1");
  });
});
