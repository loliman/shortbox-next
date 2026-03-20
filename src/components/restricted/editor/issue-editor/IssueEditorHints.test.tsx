import { Form, Formik } from "formik";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import IssueEditorRelations from "./IssueEditorRelations";
import IssueEditorSeriesFields from "./IssueEditorSeriesFields";

vi.mock("../../../generic/useAutocompleteQuery", () => ({
  useAutocompleteQuery: () => ({
    options: [],
    loading: false,
    error: null,
    isBelowMinLength: false,
    onListboxScroll: undefined,
  }),
}));

vi.mock("../../../generic/AutocompleteBase", () => ({
  default: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("../IssueEditorSections", () => ({
  Stories: () => <div>Stories Mock</div>,
}));

const issueValues = {
  title: "",
  number: "1",
  variant: "",
  format: "",
  releasedate: "",
  individuals: [],
  addinfo: "",
  stories: [],
  cover: "",
  series: {
    title: "Spider-Man",
    volume: 1,
    publisher: {
      name: "Marvel",
      us: true,
    },
  },
};

describe("Issue editor hints", () => {
  it("renders the parent hint for the issue title", () => {
    render(
      <Formik initialValues={issueValues} onSubmit={() => undefined}>
        <Form>
          <IssueEditorSeriesFields values={issueValues as any} setFieldValue={vi.fn()} />
        </Form>
      </Formik>
    );

    expect(
      screen.getByText("Hinweis: Titel wird vererbt. Für Variants leer lassen.")
    ).toBeTruthy();
  });

  it("renders the parent hint for stories", () => {
    render(<IssueEditorRelations values={issueValues as any} setFieldValue={vi.fn()} />);

    expect(
      screen.getByText("Hinweis: Geschichten werden vererbt. Für Variants leer lassen.")
    ).toBeTruthy();
    expect(screen.getByText("Stories Mock")).toBeTruthy();
  });
});
