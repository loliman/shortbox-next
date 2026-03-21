import { type ReactNode, Suspense } from "react";
import AppProviders from "./AppProviders";
import { AppPageLoader } from "./generic/loading";

type AppProps = {
  children?: ReactNode;
  changeRequestsCount?: number;
};

export default function App(props: Readonly<AppProps>) {
  return (
    <AppProviders changeRequestsCount={props.changeRequestsCount}>
      <Suspense fallback={<AppPageLoader />}>{props.children ?? null}</Suspense>
    </AppProviders>
  );
}
