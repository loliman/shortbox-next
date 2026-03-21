import React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { generateLabel, generateUrl, HierarchyLevel } from "../../util/hierarchy";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VerifiedIcon from "@mui/icons-material/Verified";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import DeletionDialog from "./DeletionDialog";
import { stripItem } from "../../util/util";
import { AppContext } from "../generic/AppContext";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";
import { mutationRequest } from "../../lib/client/mutation-request";
import type { AppRouteContextValue } from "../../app/routeContext";

const actionButtonSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1.5,
  bgcolor: "action.hover",
  width: 34,
  height: 34,
  "&:hover": {
    bgcolor: "action.selected",
    borderColor: "text.disabled",
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
  routeContext: AppRouteContextValue;
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
    const isVerified = Boolean(selectedItem.verified);
    const isCollected = Boolean(selectedItem.collected);

    return (
      <>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
          {isIssueLevel && !isUsIssue ? (
            <CollectionActionButton
              item={selectedItem}
              collected={isCollected}
              onClose={this.props.handleClose}
              enqueueSnackbar={this.props.enqueueSnackbar}
            />
          ) : null}

          {isIssueLevel && !isUsIssue ? (
            <VerifyActionButton
              item={selectedItem}
              verified={isVerified}
              onClose={this.props.handleClose}
              enqueueSnackbar={this.props.enqueueSnackbar}
            />
          ) : null}

          <Tooltip title={canDelete ? "Löschen" : "Löschen nicht möglich"}>
            <span>
              <IconButton
                aria-label="Löschen"
                disabled={!canDelete}
                onClick={() => this.handleDelete()}
                sx={actionButtonSx}
              >
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Bearbeiten">
            <IconButton
              aria-label="Bearbeiten"
              onClick={() => {
                const us = resolveItemUs(selectedItem, this.props.level, Boolean(this.props.us));
                this.props.onNavigate?.(
                  "/edit" +
                    generateUrl(
                      selectedItem as unknown as import("../../types/domain").SelectedRoot,
                      us
                    )
                );
                this.props.handleClose?.();
              }}
              sx={actionButtonSx}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <DeletionDialog
          routeContext={this.props.routeContext}
          handleClose={this.handleDeletionClose}
          open={this.state.deletionOpen}
          item={selectedItem}
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

function VerifyActionButton(props: Readonly<ActionMenuItemProps>) {
  const label = props.verified ? "Falsifizieren" : "Verifizieren";

  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        onClick={async () => {
          const oldInput = buildIssueMutationInput(props.item);
          const nextInput = {
            ...oldInput,
            verified: !props.verified,
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

            props.enqueueSnackbar?.(
              `${generateLabel(props.item as never)} erfolgreich ${label.toLowerCase()}`,
              {
                variant: "success",
              }
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unbekannter Fehler";
            props.enqueueSnackbar?.(
              `Ausgabe konnte nicht ${label.toLowerCase()} werden: ${message}`,
              { variant: "error" }
            );
          } finally {
            props.onClose?.();
          }
        }}
        sx={actionButtonSx}
      >
        {props.verified ? <VerifiedIcon /> : <VerifiedOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}

function CollectionActionButton(props: Readonly<ActionMenuItemProps>) {
  const label = props.collected ? "Aus Sammlung entfernen" : "Zur Sammlung hinzufügen";

  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        onClick={async () => {
          const oldInput = buildIssueMutationInput(props.item);
          const nextInput = {
            ...oldInput,
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

            props.enqueueSnackbar?.(`${generateLabel(props.item as never)} ${label.toLowerCase()}`, {
              variant: "success",
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unbekannter Fehler";
            props.enqueueSnackbar?.(
              `Ausgabe konnte nicht ${label.toLowerCase()} werden: ${message}`,
              { variant: "error" }
            );
          } finally {
            props.onClose?.();
          }
        }}
        sx={actionButtonSx}
      >
        {props.collected ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
      </IconButton>
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

export default function Dropdown(props: Readonly<DropdownProps>) {
  const router = useRouter();
  const appContext = React.useContext(AppContext);
  const snackbarBridge = useSnackbarBridge();

  return (
    <DropdownBase
      {...appContext}
      {...props.routeContext}
      {...snackbarBridge}
      {...props}
      onNavigate={(href) => router.push(href)}
    />
  );
}
