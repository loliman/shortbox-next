import React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import BugReportIcon from "@mui/icons-material/BugReport";
import { generateUrl, HierarchyLevel } from "../../util/hierarchy";
import type { SelectedRoot } from "../../types/domain";
import { useAppRouteContext } from "../generic";

interface ErrorFabProps {
  onNavigate?: (href: string) => void;
  level?: string;
  selected?: SelectedRoot;
  us?: boolean;
}

interface ErrorFabState {
  isHovered: boolean;
  mobileBottomBarHeight: number | null;
}

const DEFAULT_MOBILE_BOTTOM_BAR_HEIGHT = 64;
const MOBILE_BOTTOM_BAR_SELECTOR = '[data-testid="mobile-bottom-bar"]';

class ErrorFabBase extends React.Component<ErrorFabProps, ErrorFabState> {
  private resizeObserver?: ResizeObserver;
  private observedBottomBar?: HTMLElement;
  private rafId?: number;

  constructor(props: ErrorFabProps) {
    super(props);

    this.state = {
      isHovered: false,
      mobileBottomBarHeight: null,
    };
  }

  componentDidMount(): void {
    this.observeBottomBar();
    this.updateBottomBarHeight();
    this.addViewportListeners();

    if (typeof window !== "undefined") {
      this.rafId = window.requestAnimationFrame(() => {
        this.observeBottomBar();
        this.updateBottomBarHeight();
      });
    }
  }

  componentWillUnmount(): void {
    this.removeViewportListeners();
    this.resizeObserver?.disconnect();
    if (typeof window !== "undefined" && this.rafId !== undefined) {
      window.cancelAnimationFrame(this.rafId);
    }
  }

  componentDidUpdate(): void {
    this.observeBottomBar();
    this.updateBottomBarHeight();
  }

  render() {
    const selected = this.props.selected || { us: Boolean(this.props.us) };
    const us = Boolean(this.props.us);
    const mobileBottomOffset = this.getMobileBottomOffsetExpression();

    if (this.props.level !== HierarchyLevel.ISSUE || !selected.issue) return null;

    return (
      <Box
        sx={{
          position: "fixed",
          bottom: `calc(16px + ${mobileBottomOffset})`,
          right: { xs: 16, sm: 24 },
          zIndex: (theme) => theme.zIndex.speedDial,
        }}
      >
        {this.state.isHovered ? (
          <Box
            sx={{
              position: "absolute",
              right: { xs: -4, sm: 8 },
              bottom: "calc(100% + 18px)",
              maxWidth: 280,
              minWidth: 220,
              px: 2.25,
              py: 1.75,
              borderRadius: "28px",
              backgroundColor: "#fff",
              color: "#111",
              border: "3px solid #111",
              fontSize: 16,
              fontWeight: 500,
              lineHeight: 1.35,
              textAlign: "center",
              transformOrigin: "calc(100% - 34px) 100%",
              animation: "errorFabBubbleEnter 180ms cubic-bezier(0.22, 1, 0.36, 1)",
              "@keyframes errorFabBubbleEnter": {
                "0%": {
                  opacity: 0,
                  transform: "translateY(10px) scale(0.92)",
                },
                "100%": {
                  opacity: 1,
                  transform: "translateY(0) scale(1)",
                },
              },
              "&::after": {
                content: '""',
                position: "absolute",
                right: 28,
                top: "100%",
                width: 0,
                height: 0,
                borderStyle: "solid",
                borderWidth: "18px 14px 0 14px",
                borderColor: "#111 transparent transparent transparent",
              },
              "&::before": {
                content: '""',
                position: "absolute",
                right: 31,
                top: "100%",
                width: 0,
                height: 0,
                borderStyle: "solid",
                borderWidth: "13px 11px 0 11px",
                borderColor: "#fff transparent transparent transparent",
                zIndex: 1,
              },
            }}
          >
            Mit mir kannst du Fehler melden!
          </Box>
        ) : null}

        <Fab
          aria-label="Fehler melden"
          color="primary"
          onClick={this.handleClick}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
          onFocus={this.handleMouseEnter}
          onBlur={this.handleMouseLeave}
          sx={{
            position: "relative",
          }}
        >
          <BugReportIcon />
        </Fab>
      </Box>
    );
  }

  handleClick = (_event: React.MouseEvent<HTMLButtonElement>) => {
    const selected = this.props.selected || { us: Boolean(this.props.us) };
    const us = Boolean(this.props.us);
    this.props.onNavigate?.("/report" + generateUrl(selected, us));
  };

  handleMouseEnter = () => {
    this.setState({ isHovered: true });
  };

  handleMouseLeave = () => {
    this.setState({ isHovered: false });
  };

  private getMobileBottomOffsetExpression(): string {
    if (this.state.mobileBottomBarHeight === null) {
      return `${DEFAULT_MOBILE_BOTTOM_BAR_HEIGHT}px + env(safe-area-inset-bottom)`;
    }
    if (this.state.mobileBottomBarHeight > 0) {
      return `${this.state.mobileBottomBarHeight}px`;
    }
    return "env(safe-area-inset-bottom)";
  }

  private getBottomBarHeight(): number {
    if (typeof document === "undefined") return 0;
    const bottomBar = document.querySelector<HTMLElement>(MOBILE_BOTTOM_BAR_SELECTOR);
    if (!bottomBar) return 0;

    return Math.ceil(bottomBar.getBoundingClientRect().height || bottomBar.offsetHeight || 0);
  }

  private updateBottomBarHeight = () => {
    const nextHeight = this.getBottomBarHeight();
    if (nextHeight === this.state.mobileBottomBarHeight) return;
    this.setState({ mobileBottomBarHeight: nextHeight });
  };

  private addViewportListeners() {
    if (typeof window === "undefined") return;
    window.addEventListener("resize", this.handleViewportChange);
    window.addEventListener("orientationchange", this.handleViewportChange);
  }

  private removeViewportListeners() {
    if (typeof window === "undefined") return;
    window.removeEventListener("resize", this.handleViewportChange);
    window.removeEventListener("orientationchange", this.handleViewportChange);
  }

  private handleViewportChange = () => {
    this.observeBottomBar();
    this.updateBottomBarHeight();
  };

  private observeBottomBar() {
    if (typeof ResizeObserver === "undefined" || typeof document === "undefined") return;

    const bottomBar = document.querySelector<HTMLElement>(MOBILE_BOTTOM_BAR_SELECTOR) || undefined;
    if (bottomBar === this.observedBottomBar) return;

    this.resizeObserver?.disconnect();
    this.observedBottomBar = bottomBar;

    if (!bottomBar) return;
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateBottomBarHeight();
      });
    }
    this.resizeObserver.observe(bottomBar);
  }
}

export default function ErrorFab() {
  const router = useRouter();
  const routeContext = useAppRouteContext();

  return <ErrorFabView {...routeContext} onNavigate={(href) => router.push(href)} />;
}

function ErrorFabView(props: Readonly<ErrorFabProps>) {
  return <ErrorFabBase {...props} />;
}
