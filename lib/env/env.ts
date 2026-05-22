import { z } from "zod";

const publicEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
};

const publicEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  NEXT_PUBLIC_URL: z.url().startsWith("http"),
});

const validatedPublicEnv =
  process.env.NODE_ENV === "test" || process.env.SKIP_ENV_VALIDATION === "true"
    ? (publicEnv as z.infer<typeof publicEnvSchema>)
    : publicEnvSchema.parse(publicEnv);

export const { NODE_ENV, NEXT_PUBLIC_URL } = validatedPublicEnv;
