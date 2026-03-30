import * as Yup from "yup";
import { IssueSchema } from "../../util/yupSchema";

const CreateIssueBodySchema = Yup.object({
  item: IssueSchema.required("Ausgabe wird benötigt"),
});

const EditIssueBodySchema = Yup.object({
  item: IssueSchema.required("Ausgabe wird benötigt"),
  old: IssueSchema.required("Bisherige Ausgabe wird benötigt"),
});

const DeleteIssueBodySchema = Yup.object({
  item: IssueSchema.required("Ausgabe wird benötigt"),
});

export async function validateCreateIssueBody(rawBody: unknown) {
  return CreateIssueBodySchema.validate(rawBody, { stripUnknown: true });
}

export async function validateEditIssueBody(rawBody: unknown) {
  return EditIssueBodySchema.validate(rawBody, { stripUnknown: true });
}

export async function validateDeleteIssueBody(rawBody: unknown) {
  return DeleteIssueBodySchema.validate(rawBody, { stripUnknown: true });
}
