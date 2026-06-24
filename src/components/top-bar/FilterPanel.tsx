"use client";

import React from "react";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { alpha } from "@mui/material/styles";
import { Form, Formik } from "formik";

import { parseFilterValues, createDefaultFilterValues } from "../filter/defaults";
import { serializeFilterValues } from "../filter/serialize";
import DetailsSection from "../filter/sections/DetailsSection";
import ContainsSection from "../filter/sections/ContainsSection";
import ContributorsSection from "../filter/sections/ContributorsSection";
import CollectionSection from "../filter/sections/CollectionSection";
import type { FilterValues } from "../filter/types";

interface FilterPanelProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  us: boolean;
  filterQuery?: string | null;
  hasSession?: boolean;
  onFilterChange: (filterJson: string | null) => void;
}

const SECTIONS = [
  { id: "appearance", label: "Erscheinung" },
  { id: "content", label: "Inhalt" },
  { id: "contributors", label: "Mitwirkende" },
  { id: "collection", label: "Sammlung", requireSession: true },
] as const;

export default function FilterPanel({
  anchorEl,
  open,
  onClose,
  us,
  filterQuery,
  hasSession,
  onFilterChange,
}: Readonly<FilterPanelProps>) {
  const initialValues = React.useMemo(
    () => parseFilterValues(filterQuery ?? undefined),
    [filterQuery]
  );

  const visibleSections = SECTIONS.filter(
    (s) => !("requireSession" in s) || Boolean(hasSession)
  );

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      transformOrigin={{ vertical: "top", horizontal: "center" }}
      disableAutoFocus
      disableEnforceFocus
      slotProps={{
        paper: {
          sx: (theme) => ({
            mt: 1,
            width: { xs: "min(96vw, 420px)", md: "fit-content" },
            maxWidth: "96vw",
            maxHeight: "min(90vh, 860px)",
            overflowY: "auto",
            borderRadius: 2.5,
            border: "1.5px solid",
            borderColor: alpha(theme.palette.common.black, 0.1),
            boxShadow: `0 24px 64px ${alpha(theme.palette.common.black, 0.42)}`,
            backdropFilter: "blur(16px)",
            backgroundColor: "rgba(255, 255, 255, 0.96)",
            ...theme.applyStyles("dark", {
              borderColor: alpha(theme.palette.common.white, 0.14),
              backgroundColor: "rgba(13, 17, 23, 0.96)",
            }),
          }),
        },
      }}
    >
      <Formik
        enableReinitialize
        initialValues={initialValues}
        onSubmit={(values: FilterValues, actions) => {
          actions.setSubmitting(true);
          const payload = serializeFilterValues(values, us);
          onFilterChange(payload ? JSON.stringify(payload) : null);
          onClose();
          actions.setSubmitting(false);
        }}
      >
        {({ values, resetForm, submitForm, isSubmitting, setFieldValue }) => (
          <Form>
            {/* Header */}
            <Box
              sx={(theme) => ({
                px: 2.5,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid",
                borderColor: "divider",
                position: "sticky",
                top: 0,
                zIndex: 1,
                backgroundColor: "rgba(255, 255, 255, 0.97)",
                ...theme.applyStyles("dark", {
                  backgroundColor: "rgba(13, 17, 23, 0.97)",
                }),
              })}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontSize: "0.72rem",
                  color: "text.secondary",
                }}
              >
                Filter
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="text"
                  disabled={isSubmitting}
                  onClick={() => {
                    resetForm({ values: createDefaultFilterValues() });
                    onFilterChange(null);
                    onClose();
                  }}
                  sx={{ fontSize: "0.78rem", textTransform: "none", color: "error.main" }}
                >
                  Zurücksetzen
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={isSubmitting}
                  onClick={() => submitForm()}
                  sx={{ fontSize: "0.78rem", textTransform: "none", borderRadius: 1.5 }}
                >
                  Anwenden
                </Button>
              </Stack>
            </Box>

            {/* Accordion sections */}
            <Box sx={{ px: 0 }}>
              {visibleSections.map((section, idx) => (
                <React.Fragment key={section.id}>
                  <Accordion
                    defaultExpanded={idx === 0}
                    disableGutters
                    elevation={0}
                    sx={{
                      "&:before": { display: "none" },
                      backgroundColor: "transparent",
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
                      sx={(theme) => ({
                        px: 2.5,
                        py: 0,
                        minHeight: 40,
                        "&.Mui-expanded": { minHeight: 40 },
                        "& .MuiAccordionSummary-content": { my: 0 },
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.02)",
                          ...theme.applyStyles("dark", {
                            backgroundColor: "rgba(255, 255, 255, 0.04)",
                          }),
                        },
                      })}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          letterSpacing: "0.03em",
                          color: "text.primary",
                        }}
                      >
                        {section.label}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 2.5, pt: 1, pb: 2 }}>
                      {section.id === "appearance" && (
                        <DetailsSection values={values} us={us} setFieldValue={setFieldValue} />
                      )}
                      {section.id === "content" && (
                        <ContainsSection values={values} us={us} setFieldValue={setFieldValue} />
                      )}
                      {section.id === "contributors" && (
                        <ContributorsSection values={values} us={us} setFieldValue={setFieldValue} />
                      )}
                      {section.id === "collection" && Boolean(hasSession) && (
                        <CollectionSection values={values} us={us} setFieldValue={setFieldValue} />
                      )}
                    </AccordionDetails>
                  </Accordion>
                  {idx < visibleSections.length - 1 && (
                    <Divider sx={{ mx: 2.5 }} />
                  )}
                </React.Fragment>
              ))}
            </Box>

            {/* Sticky footer */}
            <Box
              sx={(theme) => ({
                px: 2.5,
                py: 1.5,
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                borderTop: "1px solid",
                borderColor: "divider",
                position: "sticky",
                bottom: 0,
                zIndex: 1,
                backgroundColor: "rgba(255, 255, 255, 0.97)",
                ...theme.applyStyles("dark", {
                  backgroundColor: "rgba(13, 17, 23, 0.97)",
                }),
              })}
            >
              <Button
                size="small"
                variant="text"
                disabled={isSubmitting}
                onClick={() => {
                  resetForm({ values: createDefaultFilterValues() });
                  onFilterChange(null);
                  onClose();
                }}
                sx={{ fontSize: "0.78rem", textTransform: "none", color: "error.main" }}
              >
                Zurücksetzen
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={isSubmitting}
                onClick={onClose}
                sx={{ fontSize: "0.78rem", textTransform: "none", borderRadius: 1.5 }}
              >
                Schließen
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={isSubmitting}
                onClick={() => submitForm()}
                sx={{ fontSize: "0.78rem", textTransform: "none", borderRadius: 1.5 }}
              >
                Anwenden
              </Button>
            </Box>
          </Form>
        )}
      </Formik>
    </Popover>
  );
}
