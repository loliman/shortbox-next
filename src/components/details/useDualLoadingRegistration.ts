import React from "react";

type RegisterFn = (id: string) => void;
type UnregisterFn = (id: string) => void;

type UseDualLoadingRegistrationArgs = {
  registerLoadingComponent: RegisterFn;
  unregisterLoadingComponent: UnregisterFn;
  detailsKey: string;
  historyKey: string;
};

export function useDualLoadingRegistration(args: Readonly<UseDualLoadingRegistrationArgs>) {
  const {
    registerLoadingComponent,
    unregisterLoadingComponent,
    detailsKey,
    historyKey,
  } = args;
  const registrationRef = React.useRef({ history: false, details: false });

  const markDetailsLoaded = React.useCallback(() => {
    if (!registrationRef.current.details) return;
    registrationRef.current.details = false;
    unregisterLoadingComponent(detailsKey);
  }, [detailsKey, unregisterLoadingComponent]);

  const markHistoryLoaded = React.useCallback(() => {
    if (!registrationRef.current.history) return;
    registrationRef.current.history = false;
    unregisterLoadingComponent(historyKey);
  }, [historyKey, unregisterLoadingComponent]);

  React.useEffect(() => {
    registerLoadingComponent(historyKey);
    registerLoadingComponent(detailsKey);
    registrationRef.current.history = true;
    registrationRef.current.details = true;

    return () => {
      markHistoryLoaded();
      markDetailsLoaded();
    };
  }, [
    detailsKey,
    historyKey,
    registerLoadingComponent,
    markDetailsLoaded,
    markHistoryLoaded,
  ]);

  return { markDetailsLoaded, markHistoryLoaded };
}
