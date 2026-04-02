"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import type { SxProps, Theme } from "@mui/material/styles";
import { generateLabel, generateSeoUrl, HierarchyLevel } from "../../lib/routes/hierarchy";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import DeletionDialog from "./DeletionDialog";
import { stripItem } from "../../util/util";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";
import { mutationRequest } from "../../lib/client/mutation-request";
import type { SelectedRoot } from "../../types/domain";

function getActionButtonBackground(theme: Theme) {
  return theme.vars?.palette.background.paper ?? theme.palette.background.paper;
}

function getActionButtonHoverBackground(theme: Theme) {
  return theme.vars?.palette.action.hover ?? theme.palette.action.hover;
}

function getActionButtonDisabledBackground(theme: Theme) {
  return theme.vars?.palette.background.paper ?? theme.palette.background.paper;
}

const actionButtonSx: SxProps<Theme> = {
  minWidth: 40,
  width: 40,
  height: 40,
  p: 0,
  color: "text.primary",
  backgroundColor: (theme) => getActionButtonBackground(theme),
  borderColor: "divider",
  "&:hover": {
    backgroundColor: (theme) => getActionButtonHoverBackground(theme),
  },
  "&.Mui-disabled": {
    color: "text.disabled",
    backgroundColor: (theme) => getActionButtonDisabledBackground(theme),
    opacity: 0.72,
  },
  "& .MuiSvgIcon-root": {
    fontSize: 22,
  },
};

interface DropdownStory {
  children?: unknown[];
}

export interface DropdownItem {
  id?: string | number;
  series?: { publisher?: { us?: boolean; name?: string }; title?: string; volume?: number };
  publisher?: { us?: boolean; name?: string };
  title?: string;
  number?: string;
  format?: string;
  variant?: string;
  releasedate?: string;
  pages?: number;
  price?: number;
  currency?: string;
  isbn?: string;
  limitation?: string;
  addinfo?: string;
  verified?: boolean;
  collected?: boolean;
  us?: boolean | null;
  stories?: DropdownStory[];
  __typename?: string;
  [key: string]: unknown;
}

interface DropdownProps {
  session?: unknown;
  level?: string;
  onNavigate?: (href: string) => void;
  enqueueSnackbar?: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
  handleClose?: () => void;
  item?: DropdownItem | null;
  EditDropdown?: {
    anchorEl: HTMLElement | null;
    item?: DropdownItem | null;
  };
  us?: boolean;
}

interface DropdownState {
  deletionOpen: boolean;
}

type IssueMutationInput = {
  id?: string | number;
  title?: string;
  number?: string;
  format?: string;
  variant?: string;
  releasedate?: string;
  pages?: number;
  price?: number;
  currency?: string;
  isbn?: string;
  limitation?: string;
  addinfo?: string;
  series?: DropdownItem["series"];
  verified?: boolean;
  collected?: boolean;
};

class DropdownBase extends React.Component<DropdownProps, DropdownState> {
  constructor(props: DropdownProps) {
    super(props);

    this.state = {
      deletionOpen: false,
    };
  }

  render() {
    const selectedItem = this.props.item ?? this.props.EditDropdown?.item;
    if (!selectedItem || !this.props.session) return null;

    const itemUs = resolveItemUs(selectedItem, this.props.level, Boolean(this.props.us));
    const isUsIssue = this.props.level === HierarchyLevel.ISSUE && itemUs;
    const canDelete =
      !isUsIssue ||
      (selectedItem.stories || []).every((story) => (story.children?.length || 0) === 0);
    const isIssueLevel = this.props.level === HierarchyLevel.ISSUE;
    const isCollected = Boolean(selectedItem.collected);

    return (
      <>
        <Box sx={{ display: "inline-flex", alignItems: "center" }}>
          <ToggleButtonGroup
            size="small"
            aria-label="Detail Aktionen"
            sx={{
              backgroundColor: (theme) => getActionButtonBackground(theme),
              "& .MuiToggleButtonGroup-grouped": {
                borderColor: "divider",
              },
            }}
          >
            {isIssueLevel && !isUsIssue ? (
              <CollectionActionButton
                item={selectedItem}
                collected={isCollected}
                onClose={this.props.handleClose}
                enqueueSnackbar={this.props.enqueueSnackbar}
              />
            ) : null}

            <Tooltip title={canDelete ? "Löschen" : "Löschen nicht möglich"}>
              <span>
                <ToggleButton
                  value="delete"
                  aria-label="Löschen"
                  disabled={!canDelete}
                  onClick={() => this.handleDelete()}
                  sx={actionButtonSx}
                >
                  <DeleteIcon />
                </ToggleButton>
              </span>
            </Tooltip>

            <Tooltip title="Bearbeiten">
              <ToggleButton
                value="edit"
                aria-label="Bearbeiten"
                onClick={() => {
                  const us = resolveItemUs(selectedItem, this.props.level, Boolean(this.props.us));
                  this.props.onNavigate?.(
                    "/edit" + generateSeoUrl(toSelectedRoot(selectedItem, this.props.level), us)
                  );
                  this.props.handleClose?.();
                }}
                sx={actionButtonSx}
              >
                <EditIcon />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Box>

        <DeletionDialog
          handleClose={this.handleDeletionClose}
          open={this.state.deletionOpen}
          item={selectedItem}
          level={this.props.level}
          us={this.props.us}
        />
      </>
    );
  }

  handleDelete = () => {
    this.setState({
      deletionOpen: true,
    });

    this.props.handleClose?.();
  };

  handleDeletionClose = () => {
    this.setState({
      deletionOpen: false,
    });
  };
}

interface ActionMenuItemProps {
  item: DropdownItem;
  level?: string;
  verified?: boolean;
  collected?: boolean;
  onClose?: () => void;
  enqueueSnackbar?: DropdownProps["enqueueSnackbar"];
}

function buildIssueMutationInput(item: DropdownItem): IssueMutationInput {
  const stripped = stripItem(structuredClone(item));
  const input: IssueMutationInput = {
    id: stripped.id as string | number | undefined,
    title: String(stripped.title || ""),
    number: String(stripped.number || ""),
    format: String(stripped.format || ""),
    releasedate: (stripped.releasedate as string) || "",
    pages: Number(stripped.pages || 0),
    price: Number(stripped.price || 0),
    currency: String(stripped.currency || ""),
    isbn: String(stripped.isbn || ""),
    limitation: String(stripped.limitation || ""),
    addinfo: String(stripped.addinfo || ""),
    series: (stripped.series as DropdownItem["series"]) || undefined,
    verified: Boolean(stripped.verified),
    collected: Boolean(stripped.collected),
  };

  const variant = String(stripped.variant || "");
  if (variant !== "") input.variant = variant;

  return input;
}

function buildIssueLookupInput(item: DropdownItem): IssueMutationInput {
  const stripped = stripItem(structuredClone(item));
  const input: IssueMutationInput = {
    id: stripped.id as string | number | undefined,
    number: String(stripped.number || ""),
    format: String(stripped.format || ""),
    series: (stripped.series as DropdownItem["series"]) || undefined,
  };

  const variant = String(stripped.variant || "");
  if (variant !== "") input.variant = variant;

  return input;
}

function CollectionActionButton(props: Readonly<ActionMenuItemProps>) {
  const router = useRouter();
  const label = props.collected ? "Aus Sammlung entfernen" : "Zur Sammlung hinzufügen";
  const actionLabel = props.collected ? "aus Sammlung entfernen" : "zur Sammlung hinzufügen";

  return (
    <Tooltip title={label}>
      <ToggleButton
        value="collection"
        aria-label={label}
        onClick={async () => {
          const oldInput = buildIssueLookupInput(props.item);
          const currentInput = buildIssueMutationInput(props.item);
          const nextInput = {
            ...currentInput,
            collected: !props.collected,
          };

          try {
            await mutationRequest({
              url: "/api/issues",
              method: "PATCH",
              body: {
                old: oldInput,
                item: nextInput,
              },
            });
            router.refresh();

            props.enqueueSnackbar?.(`${generateLabel(props.item as never)} ${actionLabel}`, {
              variant: "success",
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unbekannter Fehler";
            props.enqueueSnackbar?.(
              `Ausgabe konnte nicht ${actionLabel} werden: ${message}`,
              { variant: "error" }
            );
          } finally {
            props.onClose?.();
          }
        }}
        sx={actionButtonSx}
      >
        {props.collected ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
      </ToggleButton>
    </Tooltip>
  );
}

function resolveItemUs(
  item: DropdownItem,
  level: string | undefined,
  fallbackUs: boolean
): boolean {
  switch (level) {
    case HierarchyLevel.ISSUE:
      return Boolean(item.series?.publisher?.us);
    case HierarchyLevel.SERIES:
      return Boolean(item.publisher?.us);
    default:
      return item.us === null || item.us === undefined ? fallbackUs : Boolean(item.us);
  }
}

function toSelectedRoot(item: DropdownItem, level: string | undefined): SelectedRoot {
  switch (level) {
    case HierarchyLevel.ISSUE:
      return { issue: item as SelectedRoot["issue"] };
    case HierarchyLevel.SERIES:
      return { series: item as SelectedRoot["series"] };
    case HierarchyLevel.PUBLISHER:
      return { publisher: item as SelectedRoot["publisher"] };
    default:
      return item as unknown as SelectedRoot;
  }
}

export default function Dropdown(props: Readonly<DropdownProps>) {
  const router = useRouter();
  const snackbarBridge = useSnackbarBridge();

  return (
    <DropdownBase
      session={props.session}
      level={props.level}
      us={props.us}
      handleClose={props.handleClose}
      item={props.item}
      EditDropdown={props.EditDropdown}
      enqueueSnackbar={props.enqueueSnackbar ?? snackbarBridge.enqueueSnackbar}
      onNavigate={(href) => router.push(href)}
    />
  );
}
