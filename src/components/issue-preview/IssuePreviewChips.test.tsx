/** @jest-environment jsdom */
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { IssuePreviewChips } from "./IssuePreviewChips";
import type { IssuePreviewFlags, PreviewIssue } from "./utils/issuePreviewUtils";

const baseIssue = {} as PreviewIssue;

function renderChips(flags: Partial<IssuePreviewFlags>, us = false) {
  const fullFlags: IssuePreviewFlags = {
    collected: false,
    collectedMultipleTimes: false,
    sellable: 0,
    hasOnlyApp: false,
    hasFirstApp: false,
    hasOtherOnlyTb: false,
    hasExclusive: false,
    isPureReprintDe: false,
    hasNoStoriesDe: false,
    hasOnlyOnePrintUs: false,
    hasOnlyTbUs: false,
    notPublishedInDe: false,
    hasReprintOfUs: false,
    hasReprintsUs: false,
    ...flags,
  };

  render(<IssuePreviewChips issue={baseIssue} flags={fullFlags} us={us} />);
}

describe("IssuePreviewChips", () => {
  it("renders the relevant DE state chips and suppresses first publication when only publication applies", () => {
    renderChips({
      collected: true,
      collectedMultipleTimes: true,
      hasOnlyApp: true,
      hasFirstApp: true,
      hasExclusive: true,
      hasOtherOnlyTb: true,
      isPureReprintDe: true,
    });

    expect(screen.getByText("Gesammelt")).toBeInTheDocument();
    expect(screen.getByText("Mehrfach gesammelt")).toBeInTheDocument();
    expect(screen.getByText("Einzige Veröffentlichung")).toBeInTheDocument();
    expect(screen.getByText("Exklusiver Inhalt")).toBeInTheDocument();
    expect(screen.getByText("Sonst nur in Taschenbuch")).toBeInTheDocument();
    expect(screen.getByText("Nachdruck")).toBeInTheDocument();
    expect(screen.queryByText("Erstveröffentlichung")).not.toBeInTheDocument();
  });

  it("keeps collection chips in US mode but hides DE-only publication chips", () => {
    renderChips(
      {
        collected: true,
        collectedMultipleTimes: true,
        hasOnlyApp: true,
        hasFirstApp: true,
        hasExclusive: true,
        hasOtherOnlyTb: true,
        isPureReprintDe: true,
      },
      true
    );

    expect(screen.getByText("Gesammelt")).toBeInTheDocument();
    expect(screen.getByText("Mehrfach gesammelt")).toBeInTheDocument();
    expect(screen.queryByText("Einzige Veröffentlichung")).not.toBeInTheDocument();
    expect(screen.queryByText("Erstveröffentlichung")).not.toBeInTheDocument();
    expect(screen.queryByText("Exklusiver Inhalt")).not.toBeInTheDocument();
    expect(screen.queryByText("Sonst nur in Taschenbuch")).not.toBeInTheDocument();
    expect(screen.queryByText("Nachdruck")).not.toBeInTheDocument();
  });

  it("shows first publication only when no only-publication flag is present", () => {
    renderChips({
      hasFirstApp: true,
    });

    expect(screen.getByText("Erstveröffentlichung")).toBeInTheDocument();
    expect(screen.queryByText("Einzige Veröffentlichung")).not.toBeInTheDocument();
  });
});
