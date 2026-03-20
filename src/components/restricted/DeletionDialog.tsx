import React from "react";
import { useRouter } from "next/navigation";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import WarningIcon from "@mui/icons-material/Warning";
import { getDeleteMutation } from "../../graphql/mutationsTyped";
import { useMutation } from "@apollo/client";
import Typography from "@mui/material/Typography";
import { stripItem } from "../../util/util";
import { getListQuery, issue } from "../../graphql/queriesTyped";
import {
  generateLabel,
  generateUrl,
  getHierarchyLevel,
  HierarchyLevel,
} from "../../util/hierarchy";
import { removeFromCache, updateInCache } from "./editor/Editor";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";
import { useAppRouteContext } from "../generic";

type VariantLike = {
  number?: string;
  format?: string;
  variant?: string;
  series?: Record<string, unknown>;
  [key: string]: unknown;
};

type DeletionDialogItem = {
  __typename?: string;
  us?: boolean;
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

  const parentRef = React.useRef(toParent(itemOrFallback));
  const parent = toParent(itemOrFallback);
  parentRef.current = parent;

  const deleteMutation = getDeleteMutation(level || "");
  const listQuery = getListQuery(getHierarchyLevel(parent as never));
  const mutationName = getMutationName(deleteMutation);
  const itemLabel = getItemLabel(itemOrFallback);

  const [runDeleteMutation] = useMutation(deleteMutation, {
    update: (cache) => {
      if (
        level === HierarchyLevel.ISSUE &&
        Array.isArray(itemOrFallback.variants) &&
        itemOrFallback.variants.length > 1
      ) {
        const currentVariantKey = toVariantKey(itemOrFallback);
        const variants = itemOrFallback.variants.filter(
          (variant) => toVariantKey(variant) !== currentVariantKey
        );

        try {
          itemOrFallback.variants?.forEach((variant) => {
            let oldVariant: { issue: Record<string, unknown> } = { issue: {} };
            const variantSeries = structuredClone(variant.series || { publisher: {} }) as Record<
              string,
              unknown
            > & { publisher?: { us?: boolean } };
            if (!variantSeries.publisher) {
              variantSeries.publisher = {};
            }
            const oldSeries = stripItem(variantSeries) as {
              publisher?: { us?: boolean };
            } & Record<string, unknown>;
            oldVariant.issue.series = oldSeries;
            if (oldSeries.publisher) {
              oldSeries.publisher.us = undefined;
            }
            oldVariant.issue.number = variant.number;
            oldVariant.issue.format = variant.format;
            if (variant.variant !== "") oldVariant.issue.variant = variant.variant;

            let newVariant: { issue: Record<string, unknown> } = {
              issue: structuredClone(variant),
            };
            newVariant.issue.variants = variants;

            updateInCache(cache, issue, oldVariant, oldVariant, newVariant);
          });
        } catch {
          //ignore cache exception;
        }

        if (variants[0]) {
          parentRef.current = { issue: stripItem(variants[0]) };
        }
      } else {
        try {
          removeFromCache(cache, listQuery, parentRef.current, itemOrFallback);
        } catch {
          //ignore cache exception;
        }
      }
    },
    onCompleted: (data) => {
      router.push(generateUrl(parentRef.current as never, Boolean(props.us)));
      const mutationResult = mutationName
        ? (data as Record<string, unknown>)[mutationName]
        : undefined;

      if (mutationResult) {
        enqueueSnackbar?.(itemLabel + " erfolgreich gelöscht", { variant: "success" });
      } else {
        enqueueSnackbar?.(itemLabel + " konnte nicht gelöscht werden", {
          variant: "error",
        });
      }

      handleClose?.();
    },
    onError: (errors) => {
      const message =
        errors.graphQLErrors && errors.graphQLErrors.length > 0
          ? " [" + errors.graphQLErrors[0].message + "]"
          : "";
      enqueueSnackbar?.(itemLabel + " konnte nicht gelöscht werden" + message, {
        variant: "error",
      });
      handleClose?.();
    },
  });

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
          onClick={() => {
            runDeleteMutation({
              variables: {
                item: stripItem(toDeletePayload(level, item)),
              },
            });
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

function getMutationName(mutation: unknown) {
  const value =
    (
      mutation as {
        definitions?: ReadonlyArray<{ name?: { value?: string } }>;
      }
    ).definitions?.[0]?.name?.value || "";
  if (!value) return "";
  return value.slice(0, 1).toLowerCase() + value.slice(1);
}

function toVariantKey(item: { number?: string; format?: string; variant?: string }): string {
  return `${item.number || ""}|${item.format || ""}|${item.variant || ""}`.toLowerCase();
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
  const routeContext = useAppRouteContext();
  const snackbarBridge = useSnackbarBridge();

  return <DeletionDialogView {...routeContext} {...snackbarBridge} {...props} />;
}
