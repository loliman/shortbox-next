export const HEADER_HEIGHT_MOBILE = 56;
export const HEADER_HEIGHT_DESKTOP = 64;
export const NAV_DRAWER_WIDTH = 360;
export const NAV_DRAWER_WIDTH_COMPACT = 320;
export const COMPACT_BOTTOM_BAR_CLEARANCE = "calc(64px + env(safe-area-inset-bottom))";
export const HIDE_IN_COMPACT_LAYOUT_MEDIA_QUERY =
  "@media (max-width:599.95px), (min-width:600px) and (max-width:1199.95px) and (orientation: portrait)";

export const drawerHeaderTopOffset = {
  xs: `${HEADER_HEIGHT_MOBILE}px`,
  sm: `${HEADER_HEIGHT_DESKTOP}px`,
} as const;

export const drawerHeaderAdjustedHeight = {
  xs: `calc(100% - ${HEADER_HEIGHT_MOBILE}px)`,
  sm: `calc(100% - ${HEADER_HEIGHT_DESKTOP}px)`,
} as const;

export function getNavDrawerWidth(compactLayout: boolean): number {
  return compactLayout ? NAV_DRAWER_WIDTH_COMPACT : NAV_DRAWER_WIDTH;
}
