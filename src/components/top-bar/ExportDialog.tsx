import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import React from "react";
import Typography from "@mui/material/Typography";
import { useAppRouteContext } from "../generic";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";

type ExportType = "txt" | "csv";

type ExportDialogProps = {
  open?: boolean;
  us?: boolean;
  query?: { filter?: string | null } | null;
  handleClose: () => void;
  enqueueSnackbar?: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
};

async function triggerExport(
  props: Readonly<ExportDialogProps>,
  type: ExportType
) {
  let filter: Record<string, unknown> = { us: Boolean(props.us) };
  try {
    const parsed = props.query?.filter ? JSON.parse(props.query.filter) : {};
    filter = { us: Boolean(props.us), ...(parsed as Record<string, unknown>) };
  } catch {
    props.enqueueSnackbar?.("Ungültiger Filter, Export abgebrochen.", { variant: "error" });
    props.handleClose();
    return;
  }

  const response = await fetch("/api/public-export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filter, type }),
  });

  const data = response.ok ? ((await response.json()) as { content?: string }) : null;

  if (!response.ok || !data?.content) {
    props.enqueueSnackbar?.("Export fehlgeschlagen", { variant: "error" });
  } else {
    let a = document.createElement("a");
    document.body.appendChild(a);
    a.setAttribute("style", "display: none");

    let content = data.content;
    content = content.split(String.raw`\n`).join("\r\n");
    content = content.split(String.raw`\t`).join("\t");

    let blob = new Blob([content], {
      type: type === "txt" ? "text/plain" : "text/comma-separated-values",
    });
    let url = globalThis.URL.createObjectURL(blob);
    let filename = "shortbox." + type;

    a.href = url;
    a.download = filename;
    a.click();
    globalThis.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  props.handleClose();
}

export default function ExportDialog(props: Readonly<ExportDialogProps>) {
  const routeContext = useAppRouteContext();
  const snackbarBridge = useSnackbarBridge();

  return <ExportDialogContent {...routeContext} {...snackbarBridge} {...props} />;
}

function ExportDialogContent(props: Readonly<ExportDialogProps>) {
  return (
    <Dialog
      open={Boolean(props.open)}
      onClose={props.handleClose}
      aria-labelledby="form-delete-dialog-title"
    >
      <DialogTitle id="form-delete-dialog-title">
        <CloudDownloadIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        Format auswählen
      </DialogTitle>
      <DialogContent>
        <Typography component="p">
          <b>TXT:</b> Einfacher Export im Textformat. Beinhaltet Verlagsnamen, Serientitel und
          Ausgabennummern.
        </Typography>
        <Typography component="p" sx={{ mt: 1 }}>
          <b>CSV:</b> Detaillierter Export im CSV Format. Beinhaltet alle Metainformationen zu
          gefilterten Ausgaben.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button color="secondary" onClick={async () => triggerExport(props, "txt")}>
          txt
        </Button>

        <Button color="secondary" onClick={async () => triggerExport(props, "csv")}>
          csv
        </Button>

        <Button onClick={() => props.handleClose()} color="primary">
          Abbrechen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
