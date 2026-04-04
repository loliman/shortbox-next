jest.mock("server-only", () => ({}), { virtual: true });

jest.mock("../prisma/client", () => ({
  prisma: {
    issue: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "../prisma/client";
import { readIssueDetailStories, readIssueDetails } from "./issue-details-read";

const findMany = prisma.issue.findMany as jest.Mock;
const findUnique = prisma.issue.findUnique as jest.Mock;

function createIssueRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: BigInt(101),
    fkSeries: BigInt(301),
    title: "Spider-Man",
    number: "1",
    legacyNumber: null,
    format: null,
    variant: null,
    releaseDate: null,
    pages: null,
    price: null,
    currency: null,
    isbn: null,
    limitation: null,
    addInfo: null,
    verified: false,
    collected: null,
    comicGuideId: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-02T00:00:00.000Z"),
    series: {
      id: BigInt(301),
      title: "Spider-Man",
      startYear: BigInt(2004),
      endYear: null,
      volume: BigInt(2),
      genre: null,
      addInfo: null,
      publisher: {
        id: BigInt(401),
        name: "Panini Marvel Icon",
        original: false,
        addInfo: null,
        startYear: null,
        endYear: null,
      },
    },
    stories: [],
    arcs: [],
    individuals: [],
    covers: [],
    ...overrides,
  };
}

describe("readIssueDetailsQuery", () => {
  beforeEach(() => {
    findMany.mockReset();
    findUnique.mockReset();
  });

  it("should_resolve_exact_series_matches_without_running_the_broad_slug_candidate_lookup", async () => {
    findMany
      .mockResolvedValueOnce([
        {
          id: BigInt(101),
          number: "1",
          format: null,
          variant: null,
          series: {
            title: "Spider Man",
            volume: BigInt(2),
            startYear: BigInt(2004),
            publisher: {
              name: "Panini Marvel Icon",
              original: false,
            },
          },
        },
      ])
      .mockResolvedValueOnce([createIssueRecord()]);
    findUnique.mockResolvedValue(createIssueRecord());

    await readIssueDetails({
      us: false,
      publisher: "Panini Marvel Icon",
      series: "Spider Man",
      volume: 2,
      startyear: 2004,
      number: "1",
    });

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          number: "1",
          series: expect.objectContaining({
            title: "Spider Man",
            volume: BigInt(2),
            startYear: BigInt(2004),
            publisher: {
              name: "Panini Marvel Icon",
              original: false,
            },
          }),
        }),
        select: expect.any(Object),
      })
    );
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          number: "1",
          fkSeries: BigInt(301),
        },
      })
    );
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: BigInt(101),
        },
      })
    );
  });

  it("should_return_no_story_items_when_no_story_owner_is_available", async () => {
    await expect(
      readIssueDetailStories({
        selectedIssueId: "101",
        storyOwnerId: null,
      })
    ).resolves.toEqual([]);

    expect(findUnique).not.toHaveBeenCalled();
  });

  it("should_skip_the_duplicate_selected_issue_lookup_when_the_selected_issue_owns_the_stories", async () => {
    findUnique.mockResolvedValue(
      createIssueRecord({
        stories: [],
      })
    );

    await readIssueDetailStories({
      selectedIssueId: "101",
      storyOwnerId: "101",
    });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: BigInt(101),
        },
        include: expect.objectContaining({
          stories: expect.any(Object),
          arcs: expect.any(Object),
          individuals: expect.any(Object),
          covers: expect.any(Object),
        }),
      })
    );
  });

  it("should_use_a_small_selected_issue_lookup_when_story_owner_and_selected_issue_differ", async () => {
    findUnique
      .mockResolvedValueOnce(createIssueRecord())
      .mockResolvedValueOnce(
        createIssueRecord({
          id: BigInt(202),
          stories: [],
        })
      );

    await readIssueDetailStories({
      selectedIssueId: "101",
      storyOwnerId: "202",
    });

    expect(findUnique).toHaveBeenCalledTimes(2);
    const selectedIssueCall = findUnique.mock.calls.find(
      ([arg]) => arg?.where?.id === BigInt(101)
    )?.[0];
    const storyOwnerCall = findUnique.mock.calls.find(
      ([arg]) => arg?.where?.id === BigInt(202)
    )?.[0];

    expect(selectedIssueCall).toEqual(
      expect.objectContaining({
        where: {
          id: BigInt(101),
        },
        include: expect.objectContaining({
          series: expect.any(Object),
          individuals: expect.any(Object),
          covers: expect.any(Object),
        }),
      })
    );
    expect(storyOwnerCall).toEqual(
      expect.objectContaining({
        where: {
          id: BigInt(202),
        },
        include: expect.objectContaining({
          stories: expect.any(Object),
          arcs: expect.any(Object),
          individuals: expect.any(Object),
          covers: expect.any(Object),
        }),
      })
    );
    expect(selectedIssueCall?.include).not.toHaveProperty("stories");
    expect(selectedIssueCall?.include).not.toHaveProperty("arcs");
    expect(selectedIssueCall?.include).not.toHaveProperty("_count");
  });

  it("should_sort_us_story_issue_relations_by_release_date", async () => {
    findUnique.mockResolvedValue(
      createIssueRecord({
        stories: [
          {
            id: BigInt(701),
            number: BigInt(1),
            title: "Main Story",
            addInfo: null,
            part: null,
            onlyApp: false,
            firstApp: false,
            onlyTb: false,
            otherOnlyTb: false,
            onlyOnePrint: false,
            collected: false,
            collectedMultipleTimes: false,
            issue: createIssueRecord({
              id: BigInt(101),
              releaseDate: new Date("2020-01-01T00:00:00.000Z"),
            }),
            parent: null,
            reprint: null,
            reprintedBy: [
              {
                id: BigInt(703),
                number: BigInt(3),
                title: null,
                addInfo: null,
                part: null,
                issue: createIssueRecord({
                  id: BigInt(203),
                  number: "7",
                  releaseDate: new Date("2021-03-01T00:00:00.000Z"),
                }),
                parent: null,
                individuals: [],
                appearances: [],
              },
              {
                id: BigInt(702),
                number: BigInt(2),
                title: null,
                addInfo: null,
                part: null,
                issue: createIssueRecord({
                  id: BigInt(202),
                  number: "5",
                  releaseDate: new Date("2020-02-01T00:00:00.000Z"),
                }),
                parent: null,
                individuals: [],
                appearances: [],
              },
            ],
            children: [
              {
                id: BigInt(705),
                number: BigInt(5),
                title: null,
                addInfo: null,
                part: null,
                issue: createIssueRecord({
                  id: BigInt(205),
                  number: "9",
                  releaseDate: new Date("2022-01-01T00:00:00.000Z"),
                }),
                parent: null,
                individuals: [],
                appearances: [],
              },
              {
                id: BigInt(704),
                number: BigInt(4),
                title: null,
                addInfo: null,
                part: null,
                issue: createIssueRecord({
                  id: BigInt(204),
                  number: "8",
                  releaseDate: new Date("2021-01-01T00:00:00.000Z"),
                }),
                parent: null,
                individuals: [],
                appearances: [],
              },
            ],
            individuals: [],
            appearances: [],
          },
        ],
      })
    );

    const stories = await readIssueDetailStories({
      selectedIssueId: "101",
      storyOwnerId: "101",
    });

    expect(stories[0]?.reprints?.map((entry: { issue: { number?: string } | null }) => entry.issue?.number)).toEqual([
      "5",
      "7",
    ]);
    expect(stories[0]?.children?.map((entry: { issue: { number?: string } | null }) => entry.issue?.number)).toEqual([
      "8",
      "9",
    ]);
  });

  it("should_not_require_exact_variant_text_matches_before_slug_equivalence_is_checked", async () => {
    findMany
      .mockResolvedValueOnce([
        {
          id: BigInt(102),
          number: "1",
          format: "Prestige",
          variant: "Open House '04",
          series: {
            title: "JLA / Die Raecher",
            volume: BigInt(1),
            startYear: BigInt(2004),
            publisher: {
              name: "Panini DC Vertigo Wildstorm",
              original: false,
            },
          },
        },
      ])
      .mockResolvedValueOnce([
        createIssueRecord({
          id: BigInt(102),
          fkSeries: BigInt(302),
          format: "Prestige",
          variant: "Open House '04",
          series: {
            id: BigInt(302),
            title: "JLA / Die Raecher",
            startYear: BigInt(2004),
            endYear: null,
            volume: BigInt(1),
            genre: null,
            addInfo: null,
            publisher: {
              id: BigInt(402),
              name: "Panini DC Vertigo Wildstorm",
              original: false,
              addInfo: null,
              startYear: null,
              endYear: null,
            },
          },
        }),
      ]);
    findUnique.mockResolvedValue(
      createIssueRecord({
        id: BigInt(102),
        fkSeries: BigInt(302),
        format: "Prestige",
        variant: "Open House '04",
        series: {
          id: BigInt(302),
          title: "JLA / Die Raecher",
          startYear: BigInt(2004),
          endYear: null,
          volume: BigInt(1),
          genre: null,
          addInfo: null,
          publisher: {
            id: BigInt(402),
            name: "Panini DC Vertigo Wildstorm",
            original: false,
            addInfo: null,
            startYear: null,
            endYear: null,
          },
        },
      })
    );

    await readIssueDetails({
      us: false,
      publisher: "Panini DC Vertigo Wildstorm",
      series: "JLA Die Raecher",
      volume: 1,
      startyear: 2004,
      number: "1",
      format: "Prestige",
      variant: "Open House 04",
    });

    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.not.objectContaining({
          format: expect.anything(),
          variant: expect.anything(),
        }),
      })
    );
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BigInt(102) },
      })
    );
  });
});
