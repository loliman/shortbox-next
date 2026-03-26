/** @jest-environment jsdom */
import { Form, Formik } from "formik";
import { render, screen } from "@testing-library/react";

import IssueEditorRelations from "./IssueEditorRelations";
import IssueEditorSeriesFields from "./IssueEditorSeriesFields";

jest.mock("../../../generic/useAutocompleteQuery", () => ({
  useAutocompleteQuery: () => ({
    options: [],
    loading: false,
    error: null,
    isBelowMinLength: false,
    onListboxScroll: undefined,
  }),
}));

jest.mock("../../../generic/AutocompleteBase", () => ({
  default: ({ label }: { label: string }) => <div>{label}</div>,
}));

jest.mock("../IssueEditorSections", () => ({
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

describe.skip("Issue editor hints", () => {
  it("renders the parent hint for the issue title", () => {
    render(
      <Formik initialValues={issueValues} onSubmit={() => undefined}>
        <Form>
          <IssueEditorSeriesFields values={issueValues as any} setFieldValue={jest.fn()} />
        </Form>
      </Formik>
    );

    expect(
      screen.getByText("Hinweis: Titel wird vererbt. Für Variants leer lassen.")
    ).toBeTruthy();
  });

  it("renders the parent hint for stories", () => {
    render(<IssueEditorRelations values={issueValues as any} setFieldValue={jest.fn()} />);

    expect(
      screen.getByText("Hinweis: Geschichten werden vererbt. Für Variants leer lassen.")
    ).toBeTruthy();
    expect(screen.getByText("Stories Mock")).toBeTruthy();
  });
});
