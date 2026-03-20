"use client";

import { useSnackbar } from "notistack";

export function useSnackbarBridge() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  return {
    enqueueSnackbar,
    closeSnackbar,
  };
}
