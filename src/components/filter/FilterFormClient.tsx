"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Form, Formik } from "formik";
import FormActions from "./FormActions";
import { createDefaultFilterValues } from "./defaults";
import { serializeFilterValues } from "./serialize";
import ContainsSection from "./sections/ContainsSection";
import ContributorsSection from "./sections/ContributorsSection";
import DetailsSection from "./sections/DetailsSection";
import CollectionSection from "./sections/CollectionSection";
import type { FilterPageProps, FilterValues } from "./types";
import { buildRouteHref } from "../generic/routeHref";
import StickyActionBar from "../form-shell/StickyActionBar";
import { usePendingNavigation } from "../generic/usePendingNavigation";

type FilterFormClientProps = Pick<FilterPageProps, "us" | "query" | "selected" | "hasSession"> & {
  initialValues: FilterValues;
  targetPath: string;
};

const SECTIONS = [
  { id: "appearance", label: "Erscheinung" },
  { id: "content", label: "Inhalt" },
  { id: "contributors", label: "Mitwirkende" },
  { id: "collection", label: "Sammlung", requireSession: true },
] as const;

export default function FilterFormClient(props: Readonly<FilterFormClientProps>) {
  const router = useRouter();
  const { isPending, push } = usePendingNavigation();
  const { us, hasSession } = props;
  const query = props.query as { filter?: string; from?: string } | null | undefined;

  const [activeSection, setActiveSection] = useState<string>("appearance");
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>("appearance");

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const visibleSections = SECTIONS.filter((s) => !("requireSession" in s) || hasSession);

  return (
    <Formik
      enableReinitialize
      initialValues={props.initialValues}
      onSubmit={async (values: FilterValues, actions) => {
        actions.setSubmitting(true);

        const payload = serializeFilterValues(values, us);
        push(
          buildRouteHref(props.targetPath || `/${us ? "us" : "de"}`, query, {
            filter: payload ? JSON.stringify(payload) : null,
            from: null,
            tab: null,
          })
        );

        actions.setSubmitting(false);
      }}
    >
      {({ values, resetForm, submitForm, isSubmitting, setFieldValue }) => (
        <Form style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
          {/* Desktop Layout: Sidebar + main panel */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              gap: 3,
              alignItems: "flex-start",
              width: "100%",
              flex: 1,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                width: 240,
                position: "sticky",
                top: 88,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(30, 30, 30, 0.65)"
                    : "rgba(255, 255, 255, 0.65)",
                backdropFilter: "blur(20px)",
              }}
            >
              <List disablePadding>
                {visibleSections.map((sec) => (
                  <ListItemButton
                    key={sec.id}
                    selected={activeSection === sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    sx={{
                      py: 1.5,
                      px: 2.5,
                      borderLeft: "4px solid transparent",
                      "&.Mui-selected": {
                        borderLeftColor: "primary.main",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(0, 0, 0, 0.03)",
                      },
                    }}
                  >
                    <ListItemText
                      primary={sec.label}
                      primaryTypographyProps={{
                        fontWeight: activeSection === sec.id ? 700 : 500,
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(30, 30, 30, 0.45)"
                      : "rgba(255, 255, 255, 0.45)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <Stack spacing={3}>
                  <Typography variant="h6" fontWeight={700}>
                    {visibleSections.find((s) => s.id === activeSection)?.label}
                  </Typography>
                  {activeSection === "appearance" && (
                    <DetailsSection values={values} us={us} setFieldValue={setFieldValue} />
                  )}
                  {activeSection === "content" && (
                    <ContainsSection values={values} us={us} setFieldValue={setFieldValue} />
                  )}
                  {activeSection === "contributors" && (
                    <ContributorsSection values={values} us={us} setFieldValue={setFieldValue} />
                  )}
                  {activeSection === "collection" && (
                    <CollectionSection values={values} us={us} setFieldValue={setFieldValue} />
                  )}
                </Stack>
              </Paper>
            </Box>
          </Box>

          {/* Mobile Layout: Accordions */}
          <Box sx={{ display: { xs: "block", md: "none" } }}>
            <Stack spacing={1.5}>
              {visibleSections.map((sec) => (
                <Accordion
                  key={sec.id}
                  expanded={expandedAccordion === sec.id}
                  onChange={handleAccordionChange(sec.id)}
                  elevation={0}
                  sx={{
                    borderRadius: "8px !important",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(30, 30, 30, 0.45)"
                        : "rgba(255, 255, 255, 0.45)",
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ px: 2, py: 0.5 }}
                  >
                    <Typography fontWeight={700}>{sec.label}</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
                    {sec.id === "appearance" && (
                      <DetailsSection values={values} us={us} setFieldValue={setFieldValue} />
                    )}
                    {sec.id === "content" && (
                      <ContainsSection values={values} us={us} setFieldValue={setFieldValue} />
                    )}
                    {sec.id === "contributors" && (
                      <ContributorsSection values={values} us={us} setFieldValue={setFieldValue} />
                    )}
                    {sec.id === "collection" && (
                      <CollectionSection values={values} us={us} setFieldValue={setFieldValue} />
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Box>

          <Box sx={{ mt: 3 }}>
            <StickyActionBar>
              <FormActions
                isSubmitting={isSubmitting || isPending}
                onReset={() => resetForm({ values: createDefaultFilterValues() })}
                onCancel={() => {
                  if (isPending) return;
                  router.back();
                }}
                onSubmit={() => submitForm()}
              />
            </StickyActionBar>
          </Box>
        </Form>
      )}
    </Formik>
  );
}
