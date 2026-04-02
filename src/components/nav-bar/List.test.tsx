/** @jest-environment jsdom */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { getSelected } from "../../lib/routes/hierarchy";

const mockUseQueryMock = jest.fn();
const mockPushMock = jest.fn();
const mockReplaceMock = jest.fn();

jest.mock("@apollo/client", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/de",
  useRouter: () => ({
    push: pushMock,
    replace: mockReplaceMock,
    refresh: jest.fn(),
  }),
}));

jest.mock("../generic/usePendingNavigation", () => ({
  usePendingNavigation: () => ({
    isPending: false,
    push: pushMock,
    replace: mockReplaceMock,
    refresh: jest.fn(),
  }),
}));

import List from "./List";
import { parseNavOpenState } from "../../lib/routes/nav-open-state";

function toRect(top: number, height: number): DOMRect {
  return {
    x: 0,
    y: top,
    width: 320,
    height,
    top,
    right: 320,
    bottom: top + height,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

const PUBLISHER = "Panini - Star Wars & Generation";
const SERIES_TITLE = "Star Wars";
const SERIES_VOLUME = 2;
const KIOSK_VARIANT = "Kiosk Ausgabe";
const COMICSHOP_VARIANT = "Comicshop Ausgabe";

const KIOSK_URL =
  "http://localhost:5173/de/Panini%20-%20Star%20Wars%20%26%20Generation/Star%20Wars_Vol_2/126/Heft_Kiosk%20Ausgabe";
const COMICSHOP_URL =
  "http://localhost:5173/de/Panini%20-%20Star%20Wars%20%26%20Generation/Star%20Wars_Vol_2/126/Heft_Comicshop%20Ausgabe";

type RouteParams = {
  publisher?: string;
  series?: string;
  issue?: string;
  variant?: string;
};

function toRouteParams(issueUrl: string): RouteParams {
  const parts = new URL(issueUrl).pathname.split("/").filter(Boolean);
  return {
    publisher: parts[1],
    series: parts[2],
    issue: parts[3],
    variant: parts[4],
  };
}

function mockVariantOnlyIssueList(issueNumbers: string[] = ["126", "126"]) {
  useQueryMock.mockImplementation(
    (_query: unknown, options?: { variables?: Record<string, unknown> }) => {
      const variables = options?.variables || {};

      if (variables.series) {
        const [comicshopNumber, kioskNumber] = issueNumbers;
        return {
          data: {
            issueList: {
              edges: [
                {
                  node: {
                    title: "",
                    number: comicshopNumber,
                    format: "Heft",
                    variant: COMICSHOP_VARIANT,
                    collected: false,
                    series: {
                      title: SERIES_TITLE,
                      volume: SERIES_VOLUME,
                      publisher: { name: PUBLISHER, us: false },
                    },
                    variants: [{ variant: COMICSHOP_VARIANT }, { variant: KIOSK_VARIANT }],
                  },
                },
                {
                  node: {
                    title: "",
                    number: kioskNumber,
                    format: "Heft",
                    variant: KIOSK_VARIANT,
                    collected: false,
                    series: {
                      title: SERIES_TITLE,
                      volume: SERIES_VOLUME,
                      publisher: { name: PUBLISHER, us: false },
                    },
                    variants: [{ variant: COMICSHOP_VARIANT }, { variant: KIOSK_VARIANT }],
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
          error: null,
          loading: false,
          networkStatus: 7,
        };
      }

      if (variables.publisher) {
        return {
          data: {
            seriesList: {
              edges: [
                {
                  node: {
                    title: SERIES_TITLE,
                    volume: SERIES_VOLUME,
                    startyear: 2021,
                    publisher: { name: PUBLISHER, us: false },
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
          error: null,
          loading: false,
          networkStatus: 7,
        };
      }

      return {
        data: {
          publisherList: {
            edges: [{ node: { name: PUBLISHER, us: false } }],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
        error: null,
        loading: false,
        networkStatus: 7,
      };
    }
  );
}

describe("nav-bar List", () => {
  let originalScrollIntoView: unknown;

  beforeEach(() => {
    useQueryMock.mockReset();
    pushMock.mockReset();
    mockReplaceMock.mockReset();
    originalScrollIntoView = (HTMLElement.prototype as unknown as { scrollIntoView?: unknown })
      .scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  afterEach(() => {
    if (typeof originalScrollIntoView === "undefined") {
      delete (HTMLElement.prototype as unknown as { scrollIntoView?: unknown }).scrollIntoView;
      return;
    }

    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: originalScrollIntoView,
    });
  });

  it.each([KIOSK_URL, COMICSHOP_URL])(
    "highlights and auto-scrolls the selected issue number for %s",
    async (issueUrl) => {
      const scrollIntoViewMock = jest.fn();
      mockVariantOnlyIssueList();

      const getBoundingClientRectSpy = vi
        .spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockImplementation(function (this: HTMLElement) {
          if (this.classList.contains("MuiDrawer-paper")) return toRect(0, 220);
          if (this.textContent?.includes("[Comicshop Ausgabe]")) return toRect(620, 32);
          if (this.textContent?.includes("[Kiosk Ausgabe]")) return toRect(40, 32);
          return toRect(0, 32);
        });

      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        writable: true,
        value: scrollIntoViewMock,
      });

      const selected = getSelected(toRouteParams(issueUrl), false);

      render(
        <List
          compactLayout={false}
          drawerOpen={true}
          level={"ISSUE" as any}
          query={null}
          selected={selected as any}
          us={false}
        />
      );

      const comicshopLabel = await screen.findByText("#126 Star Wars [Comicshop Ausgabe]");
      const kioskLabel = await screen.findByText("#126 Star Wars [Kiosk Ausgabe]");
      const comicshopButton = comicshopLabel.closest("[role='button']") as HTMLElement | null;
      const kioskButton = kioskLabel.closest("[role='button']") as HTMLElement | null;

      expect(comicshopButton).not.toBeNull();
      expect(kioskButton).not.toBeNull();

      await waitFor(() => {
        expect(comicshopButton?.classList.contains("Mui-selected")).toBe(true);
        expect(kioskButton?.classList.contains("Mui-selected")).toBe(true);
      });

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      });
      const scrolledNode = scrollIntoViewMock.mock.instances[0] as HTMLElement;
      expect(scrolledNode.textContent).toContain("[Comicshop Ausgabe]");

      getBoundingClientRectSpy.mockRestore();
    }
  );

  it("keeps selection when list issue number carries variant suffix", async () => {
    mockVariantOnlyIssueList(["126A", "126A"]);

    const selected = getSelected(toRouteParams(KIOSK_URL), false);

    render(
      <List
        compactLayout={false}
        drawerOpen={true}
        level={"ISSUE" as any}
        query={null}
        selected={selected as any}
        us={false}
      />
    );

    const kioskLabel = await screen.findByText("#126A Star Wars [Kiosk Ausgabe]");
    const kioskButton = kioskLabel.closest("[role='button']") as HTMLElement | null;
    const comicshopLabel = await screen.findByText("#126A Star Wars [Comicshop Ausgabe]");
    const comicshopButton = comicshopLabel.closest("[role='button']") as HTMLElement | null;

    expect(kioskButton).not.toBeNull();
    expect(comicshopButton).not.toBeNull();
    await waitFor(() => {
      expect(kioskButton?.classList.contains("Mui-selected")).toBe(true);
      expect(comicshopButton?.classList.contains("Mui-selected")).toBe(true);
    });
  });

  it("navigates on row click but only expands on chevron click", async () => {
    render(
      <List
        initialPublisherNodes={[{ name: PUBLISHER, us: false }]}
        initialSeriesNodesByPublisher={{
          [PUBLISHER]: [{ title: SERIES_TITLE, volume: SERIES_VOLUME, publisher: { name: PUBLISHER, us: false } }],
        }}
        drawerOpen={true}
        phonePortrait={false}
        temporaryDrawer={false}
        query={null}
        selected={{} as any}
        us={false}
      />
    );

    fireEvent.click(screen.getByLabelText("Ausklappen"));

    expect(mockReplaceMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
    const replaceHref = mockReplaceMock.mock.calls[0][0] as string;
    expect(replaceHref.startsWith("/de?navOpen=")).toBe(true);
    const replaceNavOpen = parseNavOpenState(
      new URL(replaceHref, "http://localhost").searchParams.get("navOpen")
    );
    expect(replaceNavOpen.publishers).toEqual([PUBLISHER]);

    fireEvent.click(screen.getByText(PUBLISHER));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushHref = pushMock.mock.calls[0][0] as string;
    const pushUrl = new URL(pushHref, "http://localhost");
    expect(decodeURIComponent(pushUrl.pathname)).toBe(`/de/${PUBLISHER}`);
    const pushNavOpen = parseNavOpenState(pushUrl.searchParams.get("navOpen"));
    expect(pushNavOpen.publishers).toContain(PUBLISHER);
  });
});
