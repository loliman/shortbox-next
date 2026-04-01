import { headers } from "next/headers";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import FooterLinks from "../footer/FooterLinks";
import PersistentCatalogChromeClient from "./PersistentCatalogChromeClient";
import { COMPACT_BOTTOM_BAR_CLEARANCE, getNavDrawerWidth } from "../layoutMetrics";
import { getInitialResponsiveGuess } from "../../app/responsiveGuess";
import type { SessionData } from "../../app/session";

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
  const initialResponsiveGuess = getInitialResponsiveGuess(headerStore.get("user-agent"));
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
        backgroundColor: "background.default",
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
          backgroundColor: "background.default",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            backgroundColor: "background.default",
            pl: {
              xs: 0,
              sm: 2,
              lg: `calc((var(--shortbox-nav-gutter, ${initialNavGutter}) / 2) + 8px)`,
            },
            pr: {
              xs: 0,
              sm: 2,
              lg: `max(16px, calc((var(--shortbox-nav-gutter, ${initialNavGutter}) / 2) + 8px - (var(--shortbox-nav-offset, ${initialNavOffset}) / 2)))`,
            },
            pt: { xs: 0, sm: 2 },
            pb: { xs: COMPACT_BOTTOM_BAR_CLEARANCE, sm: COMPACT_BOTTOM_BAR_CLEARANCE, lg: 2 },
            ml: {
              xs: `var(--shortbox-nav-offset, ${initialNavOffset})`,
              lg: `calc(var(--shortbox-nav-offset, ${initialNavOffset}) / 2)`,
            },
            transition:
              "margin-left 225ms cubic-bezier(0.4, 0, 0.6, 1), padding 225ms cubic-bezier(0.4, 0, 0.6, 1)",
          }}
        >
          <Card
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              minWidth: 0,
              backgroundColor: "background.paper",
            }}
          >
            <Box
              sx={{
                flexGrow: 1,
                px: { xs: 0, sm: 2 },
                pt: { xs: 0, sm: 2 },
                pb: 0,
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  right: { xs: -12, sm: -16 },
                  bottom: { xs: -12, sm: -16 },
                  width: "min(100%, 70vw)",
                  height: "45%",
                  backgroundImage: "url('/background.png')",
                  backgroundPosition: "right bottom",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "contain",
                  opacity: 0.04,
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
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
                backgroundColor: "background.paper",
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
