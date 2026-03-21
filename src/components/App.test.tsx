import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const providersSpy = vi.fn();

vi.mock("./AppProviders", () => ({
  default: (props: { children?: unknown; changeRequestsCount?: number }) => {
    providersSpy(props);
    return <>{props.children}</>;
  },
}));

import App from "./App";

describe("App", () => {
  it("wraps children with app providers and forwards server props", () => {
    render(
      <App changeRequestsCount={7}>
        <div data-testid="content">content</div>
      </App>
    );

    expect(providersSpy).toHaveBeenCalled();
    expect(providersSpy.mock.calls[0][0].changeRequestsCount).toBe(7);
    expect(screen.getByTestId("content").textContent).toBe("content");
  });
});
