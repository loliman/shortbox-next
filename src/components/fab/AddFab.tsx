"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BookIcon from "@mui/icons-material/Book";
import ListIcon from "@mui/icons-material/List";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import { generateUrl, HierarchyLevel } from "../../util/hierarchy";
import type { SelectedRoot } from "../../types/domain";

interface AddFabProps {
  session?: unknown;
  onNavigate?: (href: string) => void;
  level?: string;
  selected?: SelectedRoot;
  us?: boolean;
}

interface AddFabState {
  open: boolean;
  mobileBottomBarHeight: number | null;
}

const DEFAULT_MOBILE_BOTTOM_BAR_HEIGHT = 64;
const MOBILE_BOTTOM_BAR_SELECTOR = '[data-testid="mobile-bottom-bar"]';

class AddFabBase extends React.Component<AddFabProps, AddFabState> {
  private resizeObserver?: ResizeObserver;
  private observedBottomBar?: HTMLElement;
  private rafId?: number;

  constructor(props: AddFabProps) {
    super(props);

    this.state = {
      open: false,
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
    const { session } = this.props;
    const selected = this.props.selected || { us: Boolean(this.props.us) };
    const us = Boolean(this.props.us);
    const mobileBottomOffset = this.getMobileBottomOffsetExpression();

    if (!session) return null;

    return (
      <ClickAwayListener onClickAway={this.handleClose}>
        <SpeedDial
          ariaLabel="Erstellen"
          icon={<SpeedDialIcon />}
          onClick={this.handleClick}
          open={this.state.open}
          sx={{
            position: "fixed",
            bottom: `calc(16px + ${mobileBottomOffset})`,
            right: { xs: 16, sm: 24 },
          }}
        >
          <SpeedDialAction
            key="publisher"
            icon={<AccountBalanceIcon />}
            tooltipTitle="Verlag"
            onClick={() => {
              this.props.onNavigate?.("/create/publisher");
              this.handleClose();
            }}
          />
          <SpeedDialAction
            key="series"
            icon={<ListIcon />}
            tooltipTitle="Serie"
            onClick={() => {
              this.props.onNavigate?.("/create/series");
              this.handleClose();
            }}
          />
          <SpeedDialAction
            key="issue"
            icon={<BookIcon />}
            tooltipTitle="Ausgabe"
            onClick={() => {
              this.props.onNavigate?.(getIssueCreatePath(this.props.level, selected, us));
              this.handleClose();
            }}
          />

          {this.props.level === HierarchyLevel.ISSUE && selected.issue ? (
            <SpeedDialAction
              key="variant"
              icon={<FileCopyIcon />}
              tooltipTitle="Variant"
              onClick={() => {
                const selectedCopy: SelectedRoot = {
                  ...selected,
                  issue: selected.issue
                    ? {
                        ...selected.issue,
                        format: undefined,
                        variant: undefined,
                      }
                    : undefined,
                };

                this.props.onNavigate?.("/copy/issue" + generateUrl(selectedCopy, us));
                this.handleClose();
              }}
            />
          ) : null}
        </SpeedDial>
      </ClickAwayListener>
    );
  }

  handleClick = () => {
    this.setState((state) => ({
      open: !state.open,
    }));
  };

  handleClose = () => {
    this.setState({ open: false });
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

function getIssueCreatePath(
  level: string | undefined,
  selected: SelectedRoot,
  us: boolean
): string {
  if (level === HierarchyLevel.PUBLISHER || level === HierarchyLevel.SERIES) {
    return "/create/issue" + generateUrl(selected, us);
  }

  if (level === HierarchyLevel.ISSUE && selected.issue) {
    return "/create/issue" + generateUrl({ series: selected.issue.series }, us);
  }

  return "/create/issue";
}

export default function AddFab(props: Readonly<AddFabProps>) {
  const router = useRouter();

  return (
    <AddFabView
      session={props.session}
      level={props.level}
      selected={props.selected}
      us={props.us}
      onNavigate={(href) => router.push(href)}
    />
  );
}

function AddFabView(props: Readonly<AddFabProps>) {
  return <AddFabBase {...props} />;
}
