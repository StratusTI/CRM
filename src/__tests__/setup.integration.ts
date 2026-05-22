import { afterAll, beforeAll, beforeEach } from "vitest";
import { disconnect, ensureSchema, truncateAll } from "@/src/__tests__/db";

beforeAll(ensureSchema);
beforeEach(truncateAll);
afterAll(disconnect);
