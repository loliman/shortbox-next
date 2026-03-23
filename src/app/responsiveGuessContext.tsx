"use client";

import React from "react";
import type { InitialResponsiveGuess } from "./responsiveGuess";

const ResponsiveGuessContext = React.createContext<InitialResponsiveGuess | null>(null);

type ResponsiveGuessProviderProps = {
  children?: React.ReactNode;
  initialGuess: InitialResponsiveGuess;
};

export function ResponsiveGuessProvider(props: Readonly<ResponsiveGuessProviderProps>) {
  return (
    <ResponsiveGuessContext.Provider value={props.initialGuess}>
      {props.children ?? null}
    </ResponsiveGuessContext.Provider>
  );
}

export function useInitialResponsiveGuess() {
  return React.useContext(ResponsiveGuessContext);
}
