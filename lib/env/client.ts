import { z } from "zod";

const clientEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY && !data.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"],
        message: "Provide either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      });
    }
  });

const parsedClientEnv = clientEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
});

if (!parsedClientEnv.success) {
  const issues = parsedClientEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid client environment variables. ${issues}`);
}

const parsedData = parsedClientEnv.data;

export const clientEnv = {
  ...parsedData,
  SUPABASE_PUBLIC_KEY:
    parsedData.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? parsedData.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};
