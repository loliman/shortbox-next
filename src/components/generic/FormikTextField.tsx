import React from "react";
import { getIn } from "formik";
import TextField from "@mui/material/TextField";
import type { FieldInputProps } from "formik";
import type { TextFieldProps } from "@mui/material/TextField";

interface FormBridge {
  touched: Record<string, unknown>;
  errors: Record<string, unknown>;
}

interface FormikTextFieldProps extends Omit<TextFieldProps, "name" | "value"> {
  field: FieldInputProps<unknown>;
  form: FormBridge;
  helperText?: React.ReactNode;
}

function FormikTextField({ field, form, helperText, ...props }: Readonly<FormikTextFieldProps>) {
  const touched = getIn(form.touched, field.name);
  const error = getIn(form.errors, field.name);
  const showError = Boolean(touched && error);

  return (
    <TextField
      {...field}
      {...props}
      value={field.value !== undefined && field.value !== null ? field.value : ""}
      error={showError}
      helperText={showError ? error : helperText}
      onChange={props.onChange || field.onChange}
      onBlur={props.onBlur || field.onBlur}
    />
  );
}

export { FormikTextField as TextField };
