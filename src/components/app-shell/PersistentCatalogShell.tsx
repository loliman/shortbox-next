import { headers } from "next/headers";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import type { CSSProperties } from "react";
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
            backgroundColor: "background.default",
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
              data-shortbox-shell-content-frame
              sx={{
                flexGrow: 1,
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
                  background:
                    "radial-gradient(circle at 100% 100%, rgba(17,17,17,0.08), rgba(17,17,17,0) 58%)",
                  opacity: 1,
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
