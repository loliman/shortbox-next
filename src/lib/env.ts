import * as Yup from "yup";

const EnvSchema = Yup.object({
  DATABASE_URL: Yup.string()
    .required("DATABASE_URL is required in the environment")
    .url("DATABASE_URL must be a valid URL"),
  DB_HOST: Yup.string().optional().default("localhost"),
  DB_PORT: Yup.string().optional().default("5432"),
  DB_NAME: Yup.string().optional().default("shortbox"),
  DB_USER: Yup.string().optional().default("shortbox"),
  DB_PASSWORD: Yup.string().optional().default("shortbox"),
  WORKER_CONCURRENCY: Yup.number().optional().default(5),
  LOGIN_MAX_ATTEMPTS: Yup.number().optional().default(5),
  LOGIN_WINDOW_SECONDS: Yup.number().optional().default(60),
  LOGIN_LOCK_SECONDS: Yup.number().optional().default(300),
  STORY_FILTER_BATCH_SIZE: Yup.number().optional().default(100),
  CLEANUP_DRY_RUN: Yup.boolean().optional().default(false),
  NODE_ENV: Yup.string().optional().default("development"),
});

let parsedEnv: Yup.InferType<typeof EnvSchema>;

try {
  parsedEnv = EnvSchema.validateSync({
    DATABASE_URL: process.env.DATABASE_URL,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,
    LOGIN_MAX_ATTEMPTS: process.env.LOGIN_MAX_ATTEMPTS,
    LOGIN_WINDOW_SECONDS: process.env.LOGIN_WINDOW_SECONDS,
    LOGIN_LOCK_SECONDS: process.env.LOGIN_LOCK_SECONDS,
    STORY_FILTER_BATCH_SIZE: process.env.STORY_FILTER_BATCH_SIZE,
    CLEANUP_DRY_RUN: process.env.CLEANUP_DRY_RUN,
    NODE_ENV: process.env.NODE_ENV,
  }, { stripUnknown: true });
} catch (error) {
  if (error instanceof Yup.ValidationError) {
    throw new Error(`Environment validation failed: ${error.errors.join(", ")}`);
  }
  throw error;
}

export const env = parsedEnv;
