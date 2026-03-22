"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import WarningIcon from "@mui/icons-material/Warning";
import Typography from "@mui/material/Typography";
import { stripItem } from "../../util/util";
import {
  generateLabel,
  generateUrl,
  HierarchyLevel,
} from "../../util/hierarchy";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";
import { mutationRequest } from "../../lib/client/mutation-request";

type VariantLike = {
  number?: string;
  format?: string;
  variant?: string;
  series?: Record<string, unknown>;
  [key: string]: unknown;
};

type DeletionDialogItem = {
  __typename?: string;
  us?: boolean | null;
  number?: string;
  format?: string;
  variant?: string;
  series?: Record<string, unknown> & { publisher?: { us?: boolean } };
  publisher?: Record<string, unknown> & { us?: boolean };
  variants?: VariantLike[];
  [key: string]: unknown;
};

type DeletionDialogProps = {
  level?: string;
  item?: DeletionDialogItem | null;
  open?: boolean;
  us?: boolean;
  handleClose?: () => void;
  enqueueSnackbar?: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
};

function DeletionDialogView(props: Readonly<DeletionDialogProps>) {
  const router = useRouter();
  const level = props.level;
  const { item, open, handleClose, enqueueSnackbar } = props;
  const itemOrFallback: DeletionDialogItem = item ?? { us: Boolean(props.us) };
  const parent = toParent(itemOrFallback);
  const itemLabel = getItemLabel(itemOrFallback);

  if (!item) return null;

  return (
    <Dialog open={Boolean(open)} onClose={handleClose} aria-labelledby="form-delete-dialog-title">
      <DialogTitle id="form-delete-dialog-title">
        <WarningIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        Löschen bestätigen
      </DialogTitle>
      <DialogContent>{getDeleteConfimText(level, item)}</DialogContent>
      <DialogActions>
        <Button onClick={() => handleClose?.()} variant="text" color="inherit">
          Abbrechen
        </Button>

        <Button
          color="error"
          variant="contained"
          onClick={async () => {
            try {
              const url =
                level === HierarchyLevel.PUBLISHER
                  ? "/api/publishers"
                  : level === HierarchyLevel.SERIES
                    ? "/api/series"
                    : "/api/issues";
              const result = await mutationRequest<{ success?: boolean }>({
                url,
                method: "DELETE",
                body: {
                  item: stripItem(toDeletePayload(level, item)),
                },
              });

              router.push(generateUrl(parent as never, Boolean(props.us)));

              if (result.success) {
                enqueueSnackbar?.(itemLabel + " erfolgreich gelöscht", { variant: "success" });
              } else {
                enqueueSnackbar?.(itemLabel + " konnte nicht gelöscht werden", {
                  variant: "error",
                });
              }
              handleClose?.();
            } catch (error) {
              const message = error instanceof Error && error.message ? ` [${error.message}]` : "";
              enqueueSnackbar?.(itemLabel + " konnte nicht gelöscht werden" + message, {
                variant: "error",
              });
              handleClose?.();
            }
          }}
        >
          Löschen
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function toParent(item: DeletionDialogItem): Record<string, unknown> {
  if (item.__typename === "Issue") {
    const series = structuredClone(item.series || { publisher: {} }) as Record<string, unknown> & {
      publisher?: { us?: boolean };
    };
    if (!series.publisher) series.publisher = {};
    series.publisher.us = undefined;
    const parent = { series };
    return stripItem(parent);
  }

  if (item.__typename === "Series") {
    const publisher = structuredClone(item.publisher || {}) as Record<string, unknown> & {
      us?: boolean;
    };
    publisher.us = undefined;
    const parent = { publisher };
    return stripItem(parent);
  }

  return stripItem({ us: Boolean(item.us) });
}

function toDeletePayload(
  level: string | undefined,
  item: DeletionDialogItem
): Record<string, unknown> {
  if (level === HierarchyLevel.ISSUE) {
    return {
      number: item.number,
      series: item.series,
      format: item.format,
      variant: item.variant,
    };
  }

  const payload = structuredClone(item) as Record<string, unknown>;

  if (level === HierarchyLevel.SERIES) {
    payload.issueCount = undefined;
    payload.active = undefined;
    payload.lastEdited = undefined;
  } else if (level === HierarchyLevel.PUBLISHER) {
    payload.seriesCount = undefined;
    payload.issueCount = undefined;
    payload.active = undefined;
    payload.lastEdited = undefined;
  }

  return payload;
}

function getDeleteConfimText(l: string | undefined, item: DeletionDialogItem) {
  switch (l) {
    case HierarchyLevel.PUBLISHER:
      return (
        <Typography component="p">
          Wollen Sie den <b>{getItemLabel(item)}</b> Verlag wirklich löschen? Alle zugeordneten
          Serien, deren Ausgaben, zugeordnete Geschichten und US Ausgaben werden damit gelöscht. US
          Ausgaben und Geschichten, die anderen deutschen Ausgaben zugeordnet sind werden nicht
          gelöscht.
        </Typography>
      );
    case HierarchyLevel.SERIES:
      return (
        <Typography component="p">
          Wollen Sie die Serie <b>{getItemLabel(item)}</b> wirklich löschen? Alle zugeordneten
          Ausgaben, zugeordnete Geschichten und US Ausgaben werden damit gelöscht. US Ausgaben und
          Geschichten, die anderen deutschen Ausgaben zugeordnet sind werden nicht gelöscht.
        </Typography>
      );
    default:
      return (
        <Typography component="p">
          Wollen Sie die Ausgabe <b>{getItemLabel(item)}</b> wirklich löschen? Alle zugeordnete
          Geschichten und US Ausgaben werden damit gelöscht. US Ausgaben und Geschichten, die
          anderen deutschen Ausgaben zugeordnet sind werden nicht gelöscht.
        </Typography>
      );
  }
}

function getItemLabel(item: DeletionDialogItem): string {
  return generateLabel(item as unknown as import("../../types/domain").SelectedRoot);
}

export default function DeletionDialog(props: Readonly<DeletionDialogProps>) {
  const snackbarBridge = useSnackbarBridge();

  return <DeletionDialogView {...snackbarBridge} {...props} />;
}
