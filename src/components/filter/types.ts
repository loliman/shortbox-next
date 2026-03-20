import type { FieldItem } from "../../util/filterFieldHelpers";
import type { AppRouteContextValue } from "../../app/routeContext";

export type FilterFormatOption = { name: string };
export type FilterDateOption = { date: string; compare: string };
export type FilterNumberOption = { number: string; compare: string; variant: string };
export type FilterArcOption = { title: string; type?: string };
export type FilterAppearanceOption = { name: string; type?: string };
export type FilterRealityOption = { name: string };

export interface FilterValues {
  formats: FilterFormatOption[];
  withVariants: boolean;
  releasedateFrom: string;
  releasedateTo: string;
  releasedateExact: string;
  publishers: FieldItem[];
  series: FieldItem[];
  genres: FieldItem[];
  numberFrom: string;
  numberTo: string;
  numberExact: string;
  numberVariant: string;
  arcs: FilterArcOption[];
  individuals: FieldItem[];
  appearances: FilterAppearanceOption[];
  realities: FilterRealityOption[];
  firstPrint: boolean;
  notFirstPrint: boolean;
  onlyPrint: boolean;
  notOnlyPrint: boolean;
  onlyTb: boolean;
  notOnlyTb: boolean;
  exclusive: boolean;
  notExclusive: boolean;
  reprint: boolean;
  notReprint: boolean;
  otherOnlyTb: boolean;
  notOtherOnlyTb: boolean;
  onlyOnePrint: boolean;
  notOnlyOnePrint: boolean;
  noPrint: boolean;
  notNoPrint: boolean;
  onlyCollected: boolean;
  onlyNotCollected: boolean;
  onlyNotCollectedNoOwnedVariants: boolean;
  noComicguideId: boolean;
  noContent: boolean;
}

export interface FilterSubmitValues {
  formats?: string[];
  withVariants?: boolean;
  releasedates?: FilterDateOption[];
  publishers?: FieldItem[];
  series?: FieldItem[];
  genres?: string[];
  numbers?: FilterNumberOption[];
  arcs?: FilterArcOption[];
  individuals?: FieldItem[];
  appearances?: FilterAppearanceOption[];
  realities?: FilterRealityOption[];
  firstPrint?: boolean;
  notFirstPrint?: boolean;
  onlyPrint?: boolean;
  notOnlyPrint?: boolean;
  onlyTb?: boolean;
  notOnlyTb?: boolean;
  exclusive?: boolean;
  notExclusive?: boolean;
  reprint?: boolean;
  notReprint?: boolean;
  otherOnlyTb?: boolean;
  notOtherOnlyTb?: boolean;
  onlyOnePrint?: boolean;
  notOnlyOnePrint?: boolean;
  noPrint?: boolean;
  notNoPrint?: boolean;
  onlyCollected?: boolean;
  onlyNotCollected?: boolean;
  onlyNotCollectedNoOwnedVariants?: boolean;
  noComicguideId?: boolean;
  noContent?: boolean;
  us?: boolean;
}

export interface FilterPageProps {
  us: boolean;
  query?: { filter?: string } | null;
  session?: unknown;
  isDesktop?: boolean;
  routeContext: AppRouteContextValue;
}

export interface FilterFormikBag {
  values: FilterValues;
  setFieldValue: (field: string, value: unknown) => void;
}
