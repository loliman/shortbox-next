/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";


const mocks = ({
  createEmptyIssueValuesMock: jest.fn(() => ({
    title: "",
    series: { title: "", volume: 1, publisher: { name: "", us: false } },
    number: "",
    variant: "",
    cover: "",
    format: "",
    releasedate: "",
    individuals: [],
    addinfo: "",
    stories: [],
    copyBatch: { count: 1, prefix: "" },
  })),
  buildIssueEditorStateMock: jest.fn((props: any, defaultValues: any) => ({
    defaultValues,
    header: props.edit ? "Ausgabe bearbeiten" : "Ausgabe erstellen",
    submitLabel: "Speichern",
    submitAndCopyLabel: "Speichern und kopieren",
    successMessage: " erfolgreich gespeichert",
    errorMessage: "Fehler",
    copy: false,
  })),
  buildIssueMutationVariablesMock: jest.fn((_values: any, _defaultValues: any, _edit?: boolean) => ({
    item: { title: "Issue" },
  })),
  updateIssueEditorCacheMock: jest.fn(),
  formContentSpy: jest.fn(),
  generateLabelMock: jest.fn(() => "Issue #1"),
  generateUrlMock: jest.fn(() => "/de/marvel/spider-man/1"),
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

jest.mock("../../../lib/routes/hierarchy", () => ({
  generateLabel: mocks.generateLabelMock,
  generateSeoUrl: mocks.generateUrlMock,
}));

jest.mock("../../../util/util", () => ({
  decapitalize: (value: string) => value.slice(0, 1).toLowerCase() + value.slice(1),
}));

jest.mock("../../../util/yupSchema", () => ({
  IssueSchema: undefined,
}));

jest.mock("./issue-editor/constants", () => ({
  createEmptyIssueValues: mocks.createEmptyIssueValuesMock,
  currencies: [],
  formats: [],
}));

jest.mock("./issue-editor/state", () => ({
  buildIssueEditorState: mocks.buildIssueEditorStateMock,
}));

jest.mock("./issue-editor/payload", () => ({
  buildIssueMutationVariables: mocks.buildIssueMutationVariablesMock,
}));

jest.mock("./issue-editor/cache", () => ({
  updateIssueEditorCache: mocks.updateIssueEditorCacheMock,
}));

jest.mock("./issue-editor/IssueEditorFormContent", () => ({
  default: (props: any) => {
    mocks.formContentSpy(props);
    return (
      <div>
        <button type="button" onClick={() => props.onSubmitMode(false)}>
          submit
        </button>
        <button type="button" onClick={() => props.onSubmitMode(true)}>
          submit-copy
        </button>
        <button type="button" onClick={props.onToggleUs}>
          toggle-us
        </button>
        <button type="button" onClick={(e) => props.onCancel(e)}>
          cancel
        </button>
      </div>
    );
  },
}));

import IssueEditor from "./IssueEditor";

describe.skip("IssueEditor", () => {
  beforeEach(() => {
    mocks.createEmptyIssueValuesMock.mockClear();
    mocks.buildIssueEditorStateMock.mockClear();
    mocks.buildIssueMutationVariablesMock.mockClear();
    mocks.updateIssueEditorCacheMock.mockReset();
    mocks.formContentSpy.mockClear();
    mocks.generateLabelMock.mockClear();
    mocks.generateUrlMock.mockClear();
    mocks.runMutationMock.mockClear();
    mocks.runMutationMock.mockImplementation(() => Promise.resolve({}));
    mocks.mutationOptions = null;
  });

  it("wires mutation callbacks and submit pipeline", async () => {
    const navigate = jest.fn();
    const enqueueSnackbar = jest.fn();

    render(
      <IssueEditor
        edit={true}
        mutation={{ definitions: [{ name: { value: "EditIssue" } }] } as any}
        navigate={navigate}
        enqueueSnackbar={enqueueSnackbar}
        selected={{ issue: { number: "1", series: { title: "Spider-Man", volume: 1 } } } as any}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => {
      expect(mocks.runMutationMock).toHaveBeenCalledTimes(1);
    });
    expect(mocks.buildIssueMutationVariablesMock).toHaveBeenCalledTimes(1);
    expect(mocks.runMutationMock).toHaveBeenCalledWith({ variables: { item: { title: "Issue" } } });

    mocks.mutationOptions?.update?.(
      {},
      { data: { editIssue: { number: "1", series: { publisher: {} } } } }
    );
    expect(mocks.updateIssueEditorCacheMock).toHaveBeenCalledTimes(1);

    mocks.mutationOptions?.onCompleted?.({
      editIssue: { number: "1", series: { publisher: { us: false } } },
    });
    expect(enqueueSnackbar).toHaveBeenCalledWith("Issue #1 erfolgreich gespeichert", {
      variant: "success",
    });
    expect(navigate).toHaveBeenCalledWith(null, "/de/marvel/spider-man/1");

    mocks.mutationOptions?.onError?.({ graphQLErrors: [{ message: "denied" }] });
    expect(enqueueSnackbar).toHaveBeenCalledWith("Fehler [denied]", { variant: "error" });
  });

  it("supports copy navigation and form content actions", async () => {
    const navigate = jest.fn();

    render(
      <IssueEditor
        edit={false}
        mutation={{ definitions: [{ name: { value: "CreateIssue" } }] } as any}
        navigate={navigate}
        enqueueSnackbar={jest.fn()}
        selected={
          {
            us: true,
            issue: {
              number: "1",
              series: { title: "Spider-Man", volume: 1, publisher: { us: true } },
            },
          } as any
        }
        lastLocation={{ pathname: "/de" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "toggle-us" }));
    fireEvent.click(screen.getByRole("button", { name: "submit-copy" }));

    await waitFor(() => {
      expect(mocks.runMutationMock).toHaveBeenCalledTimes(1);
    });
    const mutationArgs = mocks.buildIssueMutationVariablesMock.mock.calls[0];
    expect(mutationArgs).toBeDefined();
    const initialValues = mutationArgs?.[1] as
      | { series: { publisher: { us: boolean } } }
      | undefined;
    expect(initialValues?.series.publisher.us).toBe(true);

    mocks.mutationOptions?.onCompleted?.({
      createIssue: {
        number: "2",
        format: "A",
        variant: "B",
        series: { publisher: { us: true } },
      },
    });
    expect(navigate).toHaveBeenCalledWith(null, "/copy/issue/de/marvel/spider-man/1");

    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(navigate).toHaveBeenCalledWith(expect.anything(), "/de/marvel/spider-man/1");
  });
});
