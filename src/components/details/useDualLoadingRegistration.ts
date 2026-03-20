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
  const registrationRef = React.useRef({ history: false, details: false });

  const markDetailsLoaded = React.useCallback(() => {
    if (!registrationRef.current.details) return;
    registrationRef.current.details = false;
    args.unregisterLoadingComponent(args.detailsKey);
  }, [args.detailsKey, args.unregisterLoadingComponent]);

  const markHistoryLoaded = React.useCallback(() => {
    if (!registrationRef.current.history) return;
    registrationRef.current.history = false;
    args.unregisterLoadingComponent(args.historyKey);
  }, [args.historyKey, args.unregisterLoadingComponent]);

  React.useEffect(() => {
    args.registerLoadingComponent(args.historyKey);
    args.registerLoadingComponent(args.detailsKey);
    registrationRef.current.history = true;
    registrationRef.current.details = true;

    return () => {
      markHistoryLoaded();
      markDetailsLoaded();
    };
  }, [
    args.detailsKey,
    args.historyKey,
    args.registerLoadingComponent,
    markDetailsLoaded,
    markHistoryLoaded,
  ]);

  return { markDetailsLoaded, markHistoryLoaded };
}
