/** @jest-environment jsdom */
import { act, render } from "@testing-library/react";

import ThemeModeProvider, {
  ThemeModeContext,
} from "./AppContext";

describe("ThemeModeProvider", () => {
  it("provides theme helpers", () => {
    const toggleTheme = jest.fn();
    let themeValue: any;

    function TestConsumer() {
      themeValue = React.useContext(ThemeModeContext);
      return <div>ctx</div>;
    }

    render(
      <ThemeModeProvider themeMode="dark" toggleTheme={toggleTheme}>
        <TestConsumer />
      </ThemeModeProvider>
    );

    expect(themeValue.themeMode).toBe("dark");
    act(() => themeValue.toggleTheme());
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });
});
