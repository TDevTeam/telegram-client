import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  PORT: z.string().default("3001"),
  API_ID: z.number(),
  API_HASH: z.string(),
  JWT_SECRET: z.string(),
});

export const config = configSchema.parse({
  PORT: process.env.PORT,
  API_ID: Number(process.env.API_ID),
  API_HASH: process.env.API_HASH,
  JWT_SECRET: process.env.JWT_SECRET,
});