"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Paper from "@mui/material/Paper";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { type Theme } from "@mui/material/styles";
import { Form, Formik } from "formik";
import FormActions from "./FormActions";
import { createDefaultFilterValues } from "./defaults";
import { serializeFilterValues } from "./serialize";
import ContainsSection from "./sections/ContainsSection";
import ContributorsSection from "./sections/ContributorsSection";
import DetailsSection from "./sections/DetailsSection";
import type { FilterPageProps, FilterValues } from "./types";
import { buildRouteHref } from "../generic/routeHref";

type FilterFormClientProps = Pick<FilterPageProps, "us" | "query" | "selected" | "hasSession"> & {
  activeTab: number;
  initialValues: FilterValues;
  targetPath: string;
};

export default function FilterFormClient(props: Readonly<FilterFormClientProps>) {
  const router = useRouter();
  const { us } = props;
  const query = props.query as { filter?: string; from?: string; tab?: string } | null | undefined;
  const sectionSx = {
    px: { xs: 1.25, sm: 1.75 },
    py: { xs: 1.25, sm: 1.5 },
    borderRadius: 2,
    border: "1px solid",
    borderColor: "divider",
    boxShadow: (theme: Theme) => theme.shadows[1],
    backgroundColor: "background.paper",
  } as const;

  return (
    <Formik
      enableReinitialize
      initialValues={props.initialValues}
      onSubmit={async (values: FilterValues, actions) => {
        actions.setSubmitting(true);

        const payload = serializeFilterValues(values, us);
        router.push(
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
        <Form>
          <CardContent sx={{ pt: 1 }}>
            <Stack spacing={2.25}>
              <Paper elevation={0} sx={sectionSx}>
                <Stack spacing={2}>
                  {props.activeTab === 0 ? (
                    <DetailsSection
                      values={values}
                      us={us}
                      setFieldValue={setFieldValue}
                      hasSession={Boolean(props.hasSession)}
                    />
                  ) : null}

                  {props.activeTab === 1 ? (
                    <ContainsSection values={values} us={us} setFieldValue={setFieldValue} />
                  ) : null}

                  {props.activeTab === 2 ? (
                    <ContributorsSection values={values} us={us} setFieldValue={setFieldValue} />
                  ) : null}
                </Stack>
              </Paper>

              <Paper elevation={0} sx={sectionSx}>
                <FormActions
                  isSubmitting={isSubmitting}
                  onReset={() => resetForm({ values: createDefaultFilterValues() })}
                  onCancel={() => {
                    router.back();
                  }}
                  onSubmit={() => submitForm()}
                />
              </Paper>
            </Stack>
          </CardContent>
        </Form>
      )}
    </Formik>
  );
}
