import type { SocialConnection } from "@prisma/client";
import {
  socialConnectionNotFound,
  socialScopeMissing,
} from "@/src/errors/app-error";
import { err, type Result } from "@/src/lib/result";
import {
  fetchProfile,
  publishPost,
} from "@/src/lib/social/linkedin/client";
import type {
  LinkedInOverview,
  LinkedInPublishInput,
  LinkedInPublishOutput,
} from "@/src/schemas/linkedin.schema";
import { getFreshAccessToken } from "@/src/services/social-token";

const REQUIRED_SCOPES = {
  read: "r_liteprofile",
  write: "w_member_social",
} as const;

function hasScope(connection: SocialConnection, needle: string): boolean {
  return (connection.scope ?? "").includes(needle);
}

export const LinkedInService = {
  async getOverview(
    userId: string,
    slug: string,
  ): Promise<Result<LinkedInOverview>> {
    const fresh = await getFreshAccessToken(userId, slug, "LINKEDIN");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.read)) {
      return err(socialScopeMissing());
    }
    return fetchProfile(fresh.value.accessToken);
  },

  async publish(
    userId: string,
    slug: string,
    input: LinkedInPublishInput,
  ): Promise<Result<LinkedInPublishOutput>> {
    const fresh = await getFreshAccessToken(userId, slug, "LINKEDIN");
    if (!fresh.ok) return fresh;
    if (!hasScope(fresh.value.connection, REQUIRED_SCOPES.write)) {
      return err(socialScopeMissing());
    }

    const personId = fresh.value.connection.externalAccountId;
    if (!personId || personId === "unknown") {
      return err(socialConnectionNotFound());
    }

    const authorUrn = `urn:li:person:${personId}`;
    return publishPost(fresh.value.accessToken, authorUrn, input.text);
  },
};
