/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";

import FooterLinks from "./FooterLinks";

describe("FooterLinks", () => {
  it("renders footer links and forwards navigation", () => {
    const navigate = jest.fn();
    render(<FooterLinks navigate={navigate} isPhonePortrait={false} />);

    expect(screen.getByText("Über")).toBeTruthy();
    expect(screen.getByText("Kontakt / Fehler melden / Unterstützen")).toBeTruthy();
    expect(screen.getByText("Impressum")).toBeTruthy();
    expect(screen.getByText("Datenschutz")).toBeTruthy();
    const githubLink = screen.getByRole("link", { name: "GitHub" });
    expect(githubLink.getAttribute("href")).toBe("https://github.com/loliman");

    fireEvent.click(screen.getByRole("button", { name: "Über" }));
    fireEvent.click(screen.getByRole("button", { name: "Kontakt / Fehler melden / Unterstützen" }));
    fireEvent.click(screen.getByRole("button", { name: "Impressum" }));
    fireEvent.click(screen.getByRole("button", { name: "Datenschutz" }));

    expect(navigate).toHaveBeenNthCalledWith(1, null, "/about");
    expect(navigate).toHaveBeenNthCalledWith(2, null, "/contact");
    expect(navigate).toHaveBeenNthCalledWith(3, null, "/impress");
    expect(navigate).toHaveBeenNthCalledWith(4, null, "/privacy");
  });

  it("uses short contact text on phone portrait", () => {
    render(<FooterLinks isPhonePortrait />);
    expect(screen.getByText("Kontakt")).toBeTruthy();
  });
});
