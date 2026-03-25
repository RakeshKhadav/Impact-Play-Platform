import "server-only";
import { z } from "zod";

const serverEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),

    LEMONSQUEEZY_API_KEY: z.string().min(1),
    LEMONSQUEEZY_WEBHOOK_SECRET: z.string().min(1),
    LEMONSQUEEZY_STORE_ID: z.string().min(1),
    LEMONSQUEEZY_MONTHLY_VARIANT_ID: z.string().min(1),
    LEMONSQUEEZY_YEARLY_VARIANT_ID: z.string().min(1),
    LEMONSQUEEZY_TEST_MODE: z
      .string()
      .optional()
      .transform((value) => (value ? value.toLowerCase() === "true" : undefined)),
  })
  .superRefine((data, ctx) => {
    if (!data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY && !data.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"],
        message: "Provide either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      });
    }

    if (!data.SUPABASE_SECRET_KEY && !data.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SUPABASE_SECRET_KEY"],
        message: "Provide either SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.",
      });
    }
  });

const parsedServerEnv = serverEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,

  LEMONSQUEEZY_API_KEY: process.env.LEMONSQUEEZY_API_KEY,
  LEMONSQUEEZY_WEBHOOK_SECRET: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
  LEMONSQUEEZY_STORE_ID: process.env.LEMONSQUEEZY_STORE_ID,
  LEMONSQUEEZY_MONTHLY_VARIANT_ID: process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID,
  LEMONSQUEEZY_YEARLY_VARIANT_ID: process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID,
  LEMONSQUEEZY_TEST_MODE: process.env.LEMONSQUEEZY_TEST_MODE,
});

if (!parsedServerEnv.success) {
  const issues = parsedServerEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid server environment variables. ${issues}`);
}

const parsedData = parsedServerEnv.data;

export const serverEnv = {
  ...parsedData,
  SUPABASE_PUBLIC_KEY:
    parsedData.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? parsedData.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_ADMIN_KEY: parsedData.SUPABASE_SECRET_KEY ?? parsedData.SUPABASE_SERVICE_ROLE_KEY!,
};

export function getSupabaseProjectRef(supabaseUrl = serverEnv.NEXT_PUBLIC_SUPABASE_URL): string {
  const { hostname } = new URL(supabaseUrl);
  return hostname.split(".")[0] ?? "";
}
