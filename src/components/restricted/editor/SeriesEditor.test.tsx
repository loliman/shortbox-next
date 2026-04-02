/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";


const mocks = ({
  addToCacheMock: jest.fn(),
  removeFromCacheMock: jest.fn(),
  updateInCacheMock: jest.fn(),
  generateLabelMock: jest.fn(() => "Spider-Man"),
  generateUrlMock: jest.fn(() => "/de/marvel/spider-man"),
  runMutationMock: jest.fn(() => Promise.resolve({})),
  mutationOptions: null as null | {
    update?: (cache: unknown, result: { data?: Record<string, unknown> }) => void;
    onCompleted?: (data: Record<string, unknown>) => void;
    onError?: (error: { graphQLErrors?: Array<{ message?: string }> }) => void;
  },
});

jest.mock("@apollo/client", () => ({
  useMutation: (_doc: unknown, options: unknown) => {
    mocks.mutationOptions = options as typeof mocks.mutationOptions;
    return [mocks.runMutationMock];
  },
}));

jest.mock("../../generic/useAutocompleteQuery", () => ({
  useAutocompleteQuery: () => ({
    options: [],
    loading: false,
    error: null,
    isBelowMinLength: true,
    onListboxScroll: jest.fn(),
  }),
}));

jest.mock("../../../lib/routes/hierarchy", () => ({
  generateLabel: mocks.generateLabelMock,
  generateSeoUrl: mocks.generateUrlMock,
}));

jest.mock("../../../util/util", () => ({
  decapitalize: (value: string) => value.slice(0, 1).toLowerCase() + value.slice(1),
  stripItem: (value: unknown) => value,
  wrapItem: (value: unknown) => value,
}));

jest.mock("./Editor", () => ({
  addToCache: mocks.addToCacheMock,
  removeFromCache: mocks.removeFromCacheMock,
  updateInCache: mocks.updateInCacheMock,
}));

jest.mock("../../../graphql/queriesTyped", () => ({
  genres: { kind: "genres" },
  publishers: { kind: "publishers" },
  series: { kind: "series" },
  seriesd: { kind: "seriesd" },
}));

import SeriesEditor from "./SeriesEditor";

describe.skip("SeriesEditor", () => {
  beforeEach(() => {
    mocks.addToCacheMock.mockReset();
    mocks.removeFromCacheMock.mockReset();
    mocks.updateInCacheMock.mockReset();
    mocks.generateLabelMock.mockClear();
    mocks.generateUrlMock.mockClear();
    mocks.runMutationMock.mockClear();
    mocks.runMutationMock.mockImplementation(() => Promise.resolve({}));
    mocks.mutationOptions = null;
  });

  it("handles create flow with hook mutation callbacks", async () => {
    const navigate = jest.fn();
    const enqueueSnackbar = jest.fn();

    const defaultValues = {
      title: "Spider-Man",
      genre: "Superhero",
      publisher: { name: "Marvel", us: false },
      volume: 1,
      startyear: 1963,
      endyear: 1998,
      addinfo: "",
    };

    render(
      <SeriesEditor
        edit={false}
        defaultValues={defaultValues}
        mutation={{ definitions: [{ name: { value: "CreateSeries" } }] } as any}
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
      { data: { createSeries: { title: "Spider-Man", publisher: { us: false } } } }
    );
    expect(mocks.addToCacheMock).toHaveBeenCalledTimes(1);

    mocks.mutationOptions?.onCompleted?.({
      createSeries: { title: "Spider-Man", publisher: { us: false } },
    });
    expect(enqueueSnackbar).toHaveBeenCalledWith("Spider-Man erfolgreich erstellt", {
      variant: "success",
    });
    expect(navigate).toHaveBeenCalledWith(null, "/de/marvel/spider-man");
  });

  it("handles edit flow updates and error callbacks", async () => {
    const enqueueSnackbar = jest.fn();
    const navigate = jest.fn();

    const defaultValues = {
      title: "Spider-Man",
      genre: "Superhero",
      publisher: { name: "Marvel", us: false },
      volume: 1,
      startyear: 1963,
      endyear: 1998,
      addinfo: "",
    };

    render(
      <SeriesEditor
        edit={true}
        defaultValues={defaultValues}
        mutation={{ definitions: [{ name: { value: "EditSeries" } }] } as any}
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

    mocks.mutationOptions?.update?.(
      {},
      { data: { editSeries: { title: "Spider-Man", publisher: { us: true } } } }
    );

    expect(mocks.updateInCacheMock).toHaveBeenCalledTimes(1);
    expect(mocks.removeFromCacheMock).toHaveBeenCalledTimes(1);

    mocks.mutationOptions?.onError?.({ graphQLErrors: [{ message: "nope" }] });
    expect(enqueueSnackbar).toHaveBeenCalledWith(
      "Spider-Man konnte nicht gespeichert werden [nope]",
      {
        variant: "error",
      }
    );
  });

  it("submits changed publisher in edit mode", async () => {
    const enqueueSnackbar = jest.fn();
    const navigate = jest.fn();

    const defaultValues = {
      title: "Spider-Man",
      genre: "Superhero",
      publisher: { name: "Marvel", us: false },
      volume: 1,
      startyear: 1963,
      endyear: 1998,
      addinfo: "",
    };

    render(
      <SeriesEditor
        edit={true}
        defaultValues={defaultValues}
        mutation={{ definitions: [{ name: { value: "EditSeries" } }] } as any}
        navigate={navigate}
        enqueueSnackbar={enqueueSnackbar}
      />
    );

    fireEvent.change(screen.getByLabelText("Verlag"), {
      target: { value: "Panini - Marvel UK" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => {
      expect(mocks.runMutationMock).toHaveBeenCalledTimes(1);
    });

    expect(mocks.runMutationMock).toHaveBeenCalledWith({
      variables: {
        item: {
          ...defaultValues,
          publisher: { name: "Panini - Marvel UK", us: false },
        },
        old: defaultValues,
      },
    });
  });

  it("normalizes comma separated genre string on submit", async () => {
    const enqueueSnackbar = jest.fn();
    const navigate = jest.fn();

    const defaultValues = {
      title: "Spider-Man",
      genre: " Superhero , Noir ",
      publisher: { name: "Marvel", us: false },
      volume: 1,
      startyear: 1963,
      endyear: 1998,
      addinfo: "",
    };

    render(
      <SeriesEditor
        edit={true}
        defaultValues={defaultValues}
        mutation={{ definitions: [{ name: { value: "EditSeries" } }] } as any}
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
        item: {
          ...defaultValues,
          genre: "Superhero, Noir",
        },
        old: {
          ...defaultValues,
          genre: "Superhero, Noir",
        },
      },
    });
  });
});
