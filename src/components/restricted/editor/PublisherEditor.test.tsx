import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addToCacheMock: vi.fn(),
  updateInCacheMock: vi.fn(),
  generateLabelMock: vi.fn(() => "Marvel"),
  generateUrlMock: vi.fn(() => "/de/marvel"),
  runMutationMock: vi.fn(() => Promise.resolve({})),
  mutationOptions: null as null | {
    update?: (cache: unknown, result: { data?: Record<string, unknown> }) => void;
    onCompleted?: (data: Record<string, unknown>) => void;
    onError?: (error: { graphQLErrors?: Array<{ message?: string }> }) => void;
  },
}));

vi.mock("@apollo/client", () => ({
  useMutation: (_doc: unknown, options: unknown) => {
    mocks.mutationOptions = options as typeof mocks.mutationOptions;
    return [mocks.runMutationMock];
  },
}));

vi.mock("../../../util/hierarchy", () => ({
  generateLabel: mocks.generateLabelMock,
  generateUrl: mocks.generateUrlMock,
}));

vi.mock("../../../util/util", () => ({
  decapitalize: (value: string) => value.slice(0, 1).toLowerCase() + value.slice(1),
  stripItem: (value: unknown) => value,
}));

vi.mock("./Editor", () => ({
  addToCache: mocks.addToCacheMock,
  updateInCache: mocks.updateInCacheMock,
}));

vi.mock("../../../graphql/queriesTyped", () => ({
  publisher: { kind: "publisherQuery" },
  publishers: { kind: "publishersQuery" },
}));

import PublisherEditor from "./PublisherEditor";

describe("PublisherEditor", () => {
  beforeEach(() => {
    mocks.addToCacheMock.mockReset();
    mocks.updateInCacheMock.mockReset();
    mocks.generateLabelMock.mockClear();
    mocks.generateUrlMock.mockClear();
    mocks.runMutationMock.mockClear();
    mocks.runMutationMock.mockImplementation(() => Promise.resolve({}));
    mocks.mutationOptions = null;
  });

  it("handles create flow with hook mutation callbacks", async () => {
    const navigate = vi.fn();
    const enqueueSnackbar = vi.fn();

    const defaultValues = {
      name: "Marvel",
      startyear: 1961,
      endyear: 2026,
      addinfo: "",
      us: true,
    };

    render(
      <PublisherEditor
        edit={false}
        defaultValues={defaultValues}
        mutation={{ definitions: [{ name: { value: "CreatePublisher" } }] } as any}
        navigate={navigate}
        enqueueSnackbar={enqueueSnackbar}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Erstellen" }));

    await waitFor(() => {
      expect(mocks.runMutationMock).toHaveBeenCalledTimes(1);
    });
    expect(mocks.runMutationMock).toHaveBeenCalledWith({
      variables: {
        item: defaultValues,
      },
    });

    mocks.mutationOptions?.update?.(
      {},
      { data: { createPublisher: { name: "Marvel", us: true } } }
    );
    expect(mocks.addToCacheMock).toHaveBeenCalledTimes(1);

    mocks.mutationOptions?.onCompleted?.({ createPublisher: { name: "Marvel", us: true } });
    expect(enqueueSnackbar).toHaveBeenCalledWith("Marvel erfolgreich erstellt", {
      variant: "success",
    });
    expect(navigate).toHaveBeenCalledWith(null, "/de/marvel");
  });

  it("handles edit flow cache updates and error messaging", async () => {
    const enqueueSnackbar = vi.fn();
    const navigate = vi.fn();

    const defaultValues = {
      name: "Marvel",
      startyear: 1961,
      endyear: 2026,
      addinfo: "",
      us: false,
    };

    render(
      <PublisherEditor
        edit={true}
        defaultValues={defaultValues}
        mutation={{ definitions: [{ name: { value: "EditPublisher" } }] } as any}
        navigate={navigate}
        enqueueSnackbar={enqueueSnackbar}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => {
      expect(mocks.runMutationMock).toHaveBeenCalledTimes(1);
    });
    expect(mocks.runMutationMock).toHaveBeenCalledWith({
      variables: {
        item: defaultValues,
        old: defaultValues,
      },
    });

    mocks.mutationOptions?.update?.({}, { data: { editPublisher: { name: "Marvel", us: false } } });
    expect(mocks.updateInCacheMock).toHaveBeenCalledTimes(2);

    mocks.mutationOptions?.onError?.({ graphQLErrors: [{ message: "denied" }] });
    expect(enqueueSnackbar).toHaveBeenCalledWith(
      "Marvel konnte nicht gespeichert werden [denied]",
      {
        variant: "error",
      }
    );
  });
});
