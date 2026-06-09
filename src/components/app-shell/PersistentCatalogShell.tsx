import { cookies, headers } from "next/headers";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import type { CSSProperties } from "react";
import FooterLinks from "../footer/FooterLinks";
import PersistentCatalogChromeClient from "./PersistentCatalogChromeClient";
import { COMPACT_BOTTOM_BAR_CLEARANCE, getNavDrawerWidth } from "../layoutMetrics";
import { getInitialResponsiveGuess, RESPONSIVE_GUESS_COOKIE_NAME } from "../../app/responsiveGuess";
import type { SessionData } from "../../types/session";

type PersistentCatalogShellProps = {
  children: React.ReactNode;
  us: boolean;
  session?: SessionData | null;
  changeRequestsCount?: number;
  previewImportActive?: boolean;
};

export default async function PersistentCatalogShell(
  props: Readonly<PersistentCatalogShellProps>
) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const initialResponsiveGuess = getInitialResponsiveGuess({
    userAgent: headerStore.get("user-agent"),
    secChUaMobile: headerStore.get("sec-ch-ua-mobile"),
    storedGuess: cookieStore.get(RESPONSIVE_GUESS_COOKIE_NAME)?.value,
  });
  const initialTablet = !initialResponsiveGuess.isPhone && !initialResponsiveGuess.isDesktop;
  const initialNavWide =
    initialResponsiveGuess.isDesktop || (initialTablet && initialResponsiveGuess.isLandscape);
  const initialNavOffset = initialNavWide ? `${getNavDrawerWidth(false)}px` : "0px";
  const initialNavGutter = initialResponsiveGuess.isDesktop ? `${getNavDrawerWidth(false)}px` : "0px";

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        '[data-theme="dark"] &': {
          background: "linear-gradient(135deg, #090b0f 0%, #1a1f29 100%)",
        },
        position: "relative",
        isolation: "isolate",
      }}
    >
      <PersistentCatalogChromeClient
        us={props.us}
        session={props.session}
        changeRequestsCount={props.changeRequestsCount}
        previewImportActive={props.previewImportActive}
      />

      <Box
        component="main"
        sx={{
          display: "flex",
          flexGrow: 1,
          minHeight: 0,
          backgroundColor: "transparent",
        }}
      >
        <Box
          data-shortbox-shell-rail
          style={
            {
              "--shortbox-shell-initial-nav-offset": initialNavOffset,
              "--shortbox-shell-initial-nav-gutter": initialNavGutter,
              "--shortbox-shell-compact-bottom-clearance": COMPACT_BOTTOM_BAR_CLEARANCE,
            } as CSSProperties
          }
          sx={{
            display: "flex",
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            backgroundColor: "transparent",
          }}
        >
          <Card
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              minWidth: 0,
              backgroundColor: "rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(20px)",
              backgroundImage: "none",
              border: "1px solid",
              borderColor: "rgba(0, 0, 0, 0.06)",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
              '[data-theme="dark"] &': {
                backgroundColor: "rgba(30, 30, 30, 0.65)",
                borderColor: "rgba(255, 255, 255, 0.08)",
                boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
              },
            }}
          >
            <Box
              data-shortbox-shell-content-frame
              sx={{
                flexGrow: 1,
                pb: 0,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                "&::before": {
                  content: '""',
                  position: "fixed",
                  right: { xs: 12, sm: 20, lg: 28 },
                  bottom: { xs: 12, sm: 20, lg: 24 },
                  width: { xs: 160, sm: 220, lg: 280 },
                  height: { xs: 160, sm: 220, lg: 280 },
                  backgroundImage: 'url("/background.png")',
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right bottom",
                  backgroundSize: "contain",
                  opacity: 0.12,
                  zIndex: 0,
                  pointerEvents: "none",
                },
              }}
            >
              <Box
                className="main-content"
                sx={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {props.children}
              </Box>
            </Box>

            <Box
              sx={{
                mt: "auto",
                px: { xs: 0, sm: 2 },
                pt: 1.25,
                pb: { xs: 0, sm: 1.25 },
                borderTop: 1,
                borderColor: "divider",
                backgroundColor: "transparent",
                position: "sticky",
                bottom: 0,
                zIndex: 1,
                display: "flex",
                justifyContent: { xs: "center", sm: "flex-end" },
              }}
            >
              <FooterLinks />
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
