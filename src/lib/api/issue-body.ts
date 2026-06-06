import * as Yup from "yup";
import { IssueSchema } from "../../util/yupSchema";

const IssueBatchSchema = Yup.object({
  count: Yup.number()
    .typeError("Bitte geben Sie eine Zahl ein")
    .required("Anzahl wird benoetigt")
    .min(1, "Die Anzahl muss mindestens 1 sein")
    .max(26, "Die Anzahl darf nicht groesser als 26 sein")
    .integer("Bitte geben Sie eine Zahl ein"),
  prefix: Yup.string().max(255, "Maximal 255 Zeichen"),
}).default(undefined);

const CreateIssueBodySchema = Yup.object({
  item: IssueSchema.required("Ausgabe wird benötigt"),
  batch: IssueBatchSchema.optional(),
});

const EditIssueBodySchema = Yup.object({
  item: IssueSchema.required("Ausgabe wird benötigt"),
});

const DeleteIssueLookupSchema = Yup.object({
  id: Yup.mixed<string | number>().optional(),
  number: Yup.string().required("Pflichtfeld").max(255, "Maximal 255 Zeichen"),
  format: Yup.string().nullable().max(255, "Maximal 255 Zeichen"),
  variant: Yup.string().nullable().max(255, "Maximal 255 Zeichen"),
  series: Yup.object({
    title: Yup.string().required("Pflichtfeld").max(255, "Maximal 255 Zeichen"),
    volume: Yup.number()
      .typeError("Bitte geben Sie eine Zahl ein")
      .required("Pflichtfeld")
      .min(1, "Das Volume muss größer 0 sein")
      .integer("Bitte geben Sie eine Zahl ein"),
    publisher: Yup.object({
      name: Yup.string().required("Pflichtfeld").max(255, "Maximal 255 Zeichen"),
      us: Yup.boolean().nullable().optional(),
    }).required("Verlag wird benötigt"),
  }).required("Serie wird benötigt"),
});

const DeleteIssueBodySchema = Yup.object({
  item: DeleteIssueLookupSchema.required("Ausgabe wird benötigt"),
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
