import React from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Tooltip from "@mui/material/Tooltip";
import { ContrastSwitch } from "../../../generic/ContrastSwitch";
import TitleLine from "../../../generic/TitleLine";
import { editorSectionSx } from "../editorLayout";

interface IssueEditorHeaderProps {
  header: string;
  id?: string | number;
  session?: unknown;
  edit?: boolean;
  us: boolean;
  onToggle: () => void;
}

function IssueEditorHeader({ header, id, session, edit, us, onToggle }: IssueEditorHeaderProps) {
  return (
    <Paper elevation={0} sx={editorSectionSx}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            <TitleLine title={header} id={id} session={session} />
          </Typography>
        </Box>

        <FormControlLabel
          sx={{ m: 0 }}
          control={
            <Tooltip title={(us ? "Deutsche" : "US") + " Ausgabe"}>
              <ContrastSwitch disabled={edit} checked={us} onChange={onToggle} color="secondary" />
            </Tooltip>
          }
          label="US"
        />
      </Stack>
    </Paper>
  );
}

export default IssueEditorHeader;
