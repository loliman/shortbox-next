import "server-only";
import * as Yup from "yup";

const envSchema = Yup.object({
  DATABASE_URL: Yup.string().optional(),
  DB_HOST: Yup.string().default("localhost"),
  DB_PORT: Yup.string().default("5432"),
  DB_NAME: Yup.string().default("shortbox"),
  DB_USER: Yup.string().default("shortbox"),
  DB_PASSWORD: Yup.string().default("shortbox"),
  NODE_ENV: Yup.string().oneOf(["development", "production", "test"]).default("development"),
  CLEANUP_DRY_RUN: Yup.boolean()
    .transform((value) => {
      if (typeof value === "string") return value.toLowerCase() === "true";
      return value;
    })
    .default(false),
  STORY_FILTER_BATCH_SIZE: Yup.number()
    .transform((value) => (value === "" ? undefined : Number(value)))
    .integer()
    .positive()
    .default(250),
  NEXT_PUBLIC_SITE_URL: Yup.string().default("https://shortbox.de"),
  LOGIN_MAX_ATTEMPTS: Yup.number()
    .transform((value) => (value === "" ? undefined : Number(value)))
    .integer()
    .positive()
    .default(5),
  LOGIN_WINDOW_SECONDS: Yup.number()
    .transform((value) => (value === "" ? undefined : Number(value)))
    .integer()
    .positive()
    .default(60),
  LOGIN_LOCK_SECONDS: Yup.number()
    .transform((value) => (value === "" ? undefined : Number(value)))
    .integer()
    .positive()
    .default(900),
  WORKER_CONCURRENCY: Yup.number()
    .transform((value) => (value === "" ? undefined : Number(value)))
    .integer()
    .positive()
    .default(5),
});

export type Env = Yup.InferType<typeof envSchema>;

let validatedEnv: Env;

try {
  validatedEnv = envSchema.validateSync(process.env, { abortEarly: false, stripUnknown: true });
} catch (error) {
  if (error instanceof Yup.ValidationError) {
    console.warn("Environment validation warning:", error.errors.join(", "));
  } else {
    console.warn("Failed to validate environment:", error);
  }
  validatedEnv = envSchema.cast(process.env) as Env;
}

export const env = validatedEnv;
