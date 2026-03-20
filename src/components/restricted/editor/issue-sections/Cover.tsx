import React from "react";
import CardMedia from "@mui/material/CardMedia";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import DeleteIcon from "@mui/icons-material/Delete";
import { alpha } from "@mui/material/styles";

type CoverInput = { __typename?: string; url?: string } | string | null | undefined;

interface CoverProps {
  isDesktop?: boolean;
  cover?: CoverInput;
  onDelete?: () => void;
}

interface CoverState {
  isCoverOpen: boolean;
}

class Cover extends React.Component<CoverProps, CoverState> {
  constructor(props: CoverProps) {
    super(props);
    this.state = { isCoverOpen: false };
  }

  shouldComponentUpdate(nextProps: CoverProps, nextState: CoverState) {
    return this.props.cover !== nextProps.cover || this.state.isCoverOpen !== nextState.isCoverOpen;
  }

  render() {
    const previewSrc = this.createPreview(this.props.cover);

    return (
      <Box sx={{ width: this.props.isDesktop ? "50%" : "100%", position: "relative" }}>
        <CardMedia
          image={previewSrc}
          title="Cover Vorschau"
          sx={{
            width: "100%",
            aspectRatio: "1 / 1",
            borderRadius: 1,
            cursor: "pointer",
            backgroundSize: "cover",
          }}
          onClick={() => this.toggleCoverIsOpen()}
        />

        <Dialog
          open={this.state.isCoverOpen}
          onClose={() => this.toggleCoverIsOpen()}
          maxWidth="md"
        >
          <Box component="img" src={previewSrc} alt="Cover Vorschau" sx={{ maxWidth: "100%" }} />
        </Dialog>

        {this.props.onDelete ? (
          <IconButton
            aria-label="Entfernen"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: (theme) =>
                alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.7 : 0.82),
              "&:hover": {
                bgcolor: (theme) =>
                  alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.9 : 0.95),
              },
            }}
            onClick={this.props.onDelete}
          >
            <DeleteIcon />
          </IconButton>
        ) : null}
      </Box>
    );
  }

  private toggleCoverIsOpen() {
    this.setState((prev) => ({ isCoverOpen: !prev.isCoverOpen }));
  }

  private createPreview(file: CoverInput) {
    if (!file || file === "") return "/nocover.png";

    if (
      typeof file === "object" &&
      "__typename" in file &&
      file.__typename === "Cover" &&
      typeof file.url === "string"
    ) {
      return file.url;
    }

    if (typeof file === "string") return file;

    return "/nocover.png";
  }
}

export default Cover;
