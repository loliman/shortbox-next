/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormActions from "./FormActions";

describe("FormActions", () => {
  it("invokes reset/cancel/submit handlers when enabled", async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();
    const onCancel = jest.fn();
    const onSubmit = jest.fn();

    render(
      <FormActions isSubmitting={false} onReset={onReset} onCancel={onCancel} onSubmit={onSubmit} />
    );

    await user.click(screen.getByRole("button", { name: "Zurücksetzen" }));
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    await user.click(screen.getByRole("button", { name: "Filtern" }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("keeps actions disabled while submitting", () => {
    const onReset = jest.fn();
    const onCancel = jest.fn();
    const onSubmit = jest.fn();

    render(
      <FormActions isSubmitting={true} onReset={onReset} onCancel={onCancel} onSubmit={onSubmit} />
    );

    expect(
      (screen.getByRole("button", { name: "Zurücksetzen" }) as HTMLButtonElement).disabled
    ).toBe(true);
    expect((screen.getByRole("button", { name: "Abbrechen" }) as HTMLButtonElement).disabled).toBe(
      true
    );
    expect((screen.getByRole("button", { name: "Filtern" }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });
});
