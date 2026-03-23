"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import { Form, Formik } from "formik";
import FormActions from "./FormActions";
import { createDefaultFilterValues } from "./defaults";
import { serializeFilterValues } from "./serialize";
import ContainsSection from "./sections/ContainsSection";
import ContributorsSection from "./sections/ContributorsSection";
import DetailsSection from "./sections/DetailsSection";
import type { FilterPageProps, FilterValues } from "./types";
import { buildRouteHref } from "../generic/routeHref";
import FormSection from "../form-shell/FormSection";
import StickyActionBar from "../form-shell/StickyActionBar";
import { usePendingNavigation } from "../generic/usePendingNavigation";

type FilterFormClientProps = Pick<FilterPageProps, "us" | "query" | "selected" | "hasSession"> & {
  activeTab: number;
  initialValues: FilterValues;
  targetPath: string;
};

export default function FilterFormClient(props: Readonly<FilterFormClientProps>) {
  const router = useRouter();
  const { isPending, push } = usePendingNavigation();
  const { us } = props;
  const query = props.query as { filter?: string; from?: string; tab?: string } | null | undefined;

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
          <Stack spacing={2.25}>
            <FormSection title="Kriterien">
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
            </FormSection>

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
          </Stack>
        </Form>
      )}
    </Formik>
  );
}
