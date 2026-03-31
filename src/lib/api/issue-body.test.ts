import * as Yup from "yup";
import { validateCreateIssueBody, validateDeleteIssueBody, validateEditIssueBody } from "./issue-body";

const validIssue = {
  title: "",
  series: {
    title: "Batman",
    volume: 1,
    publisher: {
      name: "Panini",
      us: false,
    },
  },
  number: "1",
  format: "Softcover",
  variant: "",
  releasedate: "2026-03-30",
  pages: 48,
  price: 6.99,
  currency: "EUR",
  addinfo: "",
  stories: [],
};

describe("issue-body validation", () => {
  it("accepts create bodies without old", async () => {
    await expect(
      validateCreateIssueBody({
        item: validIssue,
      })
    ).resolves.toMatchObject({
      item: expect.objectContaining({
        number: "1",
      }),
    });
  });

  it("requires old only for edit bodies", async () => {
    await expect(
      validateEditIssueBody({
        item: validIssue,
      })
    ).rejects.toBeInstanceOf(Yup.ValidationError);
  });

  it("accepts delete bodies with only item", async () => {
    await expect(
      validateDeleteIssueBody({
        item: validIssue,
      })
    ).resolves.toMatchObject({
      item: expect.objectContaining({
        number: "1",
      }),
    });
  });

  it("accepts optional batch create configuration", async () => {
    await expect(
      validateCreateIssueBody({
        item: validIssue,
        batch: {
          count: 3,
          prefix: "Panini Exclusive",
        },
      })
    ).resolves.toMatchObject({
      batch: {
        count: 3,
        prefix: "Panini Exclusive",
      },
    });
  });

  it("rejects batch counts beyond Z", async () => {
    await expect(
      validateCreateIssueBody({
        item: validIssue,
        batch: {
          count: 27,
        },
      })
    ).rejects.toBeInstanceOf(Yup.ValidationError);
  });
});
