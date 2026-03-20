import { IssueSchema, LoginSchema, PublisherSchema, SeriesSchema } from "./yupSchema";

describe("LoginSchema", () => {
  it("validates a complete payload", async () => {
    await expect(
      LoginSchema.validate({
        name: "admin",
        password: "secret",
      })
    ).resolves.toEqual({
      name: "admin",
      password: "secret",
    });
  });

  it("rejects missing fields", async () => {
    await expect(
      LoginSchema.validate(
        {
          name: "",
        },
        { abortEarly: false }
      )
    ).rejects.toMatchObject({
      errors: expect.arrayContaining(["Pflichtfeld"]),
    });
  });
});

describe("PublisherSchema", () => {
  it("validates open-ended endyear=0 branch", async () => {
    await expect(
      PublisherSchema.validate({
        name: "Marvel",
        startyear: 2020,
        endyear: 0,
        addinfo: "",
      })
    ).resolves.toMatchObject({ name: "Marvel", startyear: 2020, endyear: 0 });
  });

  it("validates bounded year comparison branch", async () => {
    await expect(
      PublisherSchema.validate({
        name: "Marvel",
        startyear: 1990,
        endyear: 2000,
      })
    ).resolves.toMatchObject({ startyear: 1990, endyear: 2000 });
  });
});

describe("SeriesSchema", () => {
  it("validates both endyear branches", async () => {
    await expect(
      SeriesSchema.validate({
        title: "Spider-Man",
        volume: 1,
        startyear: 1990,
        endyear: 0,
        publisher: { name: "Marvel" },
      })
    ).resolves.toBeTruthy();

    await expect(
      SeriesSchema.validate({
        title: "Spider-Man",
        volume: 1,
        startyear: 1990,
        endyear: 1999,
        publisher: { name: "Marvel" },
      })
    ).resolves.toBeTruthy();
  });
});

describe("IssueSchema", () => {
  it("accepts valid issue payload and limitation branches", async () => {
    await expect(
      IssueSchema.validate({
        title: "Issue 1",
        number: "1",
        format: "Heft",
        isbn: "1234567890",
        variant: "",
        limitation: "",
        pages: 44,
        releasedate: "2026-01-01",
        price: 4.99,
        currency: "EUR",
        addinfo: "",
        series: {
          title: "Spider-Man",
          volume: 1,
          publisher: { name: "Marvel" },
        },
        stories: [
          {
            number: 1,
            title: "Story",
            parent: {
              number: 1,
              issue: { number: "1", series: { title: "Spider-Man", volume: 1 } },
            },
            exclusive: false,
          },
        ],
      })
    ).resolves.toBeTruthy();

    await expect(
      IssueSchema.validate({
        series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } },
        number: "1",
        limitation: "100",
      })
    ).resolves.toBeTruthy();
  });

  it("rejects invalid ISBN and non-numeric limitation", async () => {
    await expect(
      IssueSchema.validate(
        {
          series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } },
          number: "1",
          isbn: "123",
          limitation: "abc",
        },
        { abortEarly: false }
      )
    ).rejects.toMatchObject({
      errors: expect.arrayContaining([
        "Die ISBN muss entweder 10 oder 13 Zeichen lang sein",
        "Bitte geben Sie eine Zahl ein",
      ]),
    });
  });
});
