import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEmptyIssueValuesMock: vi.fn(() => ({
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
  })),
  buildIssueEditorStateMock: vi.fn((props: any, defaultValues: any) => ({
    defaultValues,
    header: props.edit ? "Ausgabe bearbeiten" : "Ausgabe erstellen",
    submitLabel: "Speichern",
    submitAndCopyLabel: "Speichern und kopieren",
    successMessage: " erfolgreich gespeichert",
    errorMessage: "Fehler",
    copy: false,
  })),
  buildIssueMutationVariablesMock: vi.fn((_values: any, _defaultValues: any, _edit?: boolean) => ({
    item: { title: "Issue" },
  })),
  updateIssueEditorCacheMock: vi.fn(),
  formContentSpy: vi.fn(),
  generateLabelMock: vi.fn(() => "Issue #1"),
  generateUrlMock: vi.fn(() => "/de/marvel/spider-man/1"),
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
  generateSeoUrl: mocks.generateUrlMock,
}));

vi.mock("../../../util/util", () => ({
  decapitalize: (value: string) => value.slice(0, 1).toLowerCase() + value.slice(1),
}));

vi.mock("../../../util/yupSchema", () => ({
  IssueSchema: undefined,
}));

vi.mock("./issue-editor/constants", () => ({
  createEmptyIssueValues: mocks.createEmptyIssueValuesMock,
  currencies: [],
  formats: [],
}));

vi.mock("./issue-editor/state", () => ({
  buildIssueEditorState: mocks.buildIssueEditorStateMock,
}));

vi.mock("./issue-editor/payload", () => ({
  buildIssueMutationVariables: mocks.buildIssueMutationVariablesMock,
}));

vi.mock("./issue-editor/cache", () => ({
  updateIssueEditorCache: mocks.updateIssueEditorCacheMock,
}));

vi.mock("./issue-editor/IssueEditorFormContent", () => ({
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

describe("IssueEditor", () => {
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
    const navigate = vi.fn();
    const enqueueSnackbar = vi.fn();

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
    const navigate = vi.fn();

    render(
      <IssueEditor
        edit={false}
        mutation={{ definitions: [{ name: { value: "CreateIssue" } }] } as any}
        navigate={navigate}
        enqueueSnackbar={vi.fn()}
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
