import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { appEnvVariables } from "../env.ts";

/**
 * Schema for invitation JWT payload
 */
export const invitationTokenPayloadSchema = z.object({
  invitationId: z.string().uuid(),
  assessmentId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  matriculationNumber: z.string(),
  exp: z.number(),
  iat: z.number(),
});

export type InvitationTokenPayload = z.infer<
  typeof invitationTokenPayloadSchema
>;

/**
 * Get the secret key for JWT signing
 */
function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(appEnvVariables.SUPABASE_JWT_SECRET);
}

/**
 * Calculate expiration time at end of scheduled day (11:59:59 PM)
 * If no scheduled date, defaults to 7 days from now
 */
export function getInvitationExpiration(scheduledDate?: Date | null): number {
  if (scheduledDate) {
    const endOfDay = new Date(scheduledDate);
    endOfDay.setHours(23, 59, 59, 999);
    return Math.floor(endOfDay.getTime() / 1000);
  }

  // Default: 7 days from now
  const defaultExpiration = new Date();
  defaultExpiration.setDate(defaultExpiration.getDate() + 7);
  defaultExpiration.setHours(23, 59, 59, 999);
  return Math.floor(defaultExpiration.getTime() / 1000);
}

/**
 * Sign an invitation token
 */
export async function signInvitationToken(
  payload: Omit<InvitationTokenPayload, "iat" | "exp">,
  expirationTimestamp: number,
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    ...payload,
    iat,
    exp: expirationTimestamp,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(iat)
    .setExpirationTime(expirationTimestamp)
    .sign(getSecretKey());

  return token;
}

/**
 * Verify and decode an invitation token
 */
export async function verifyInvitationToken(
  token: string,
): Promise<InvitationTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    // Validate the payload structure
    const validatedPayload = invitationTokenPayloadSchema.parse(payload);

    return validatedPayload;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        throw new Error("Invitation link has expired");
      }
      throw new Error(`Invalid invitation token: ${error.message}`);
    }
    throw new Error("Invalid invitation token");
  }
}

/**
 * Generate a full invitation URL
 */
export function generateInvitationUrl(token: string): string {
  // Use provided baseUrl, or determine from NODE_ENV
  const url =
    process.env.NODE_ENV === "production"
      ? "https://queryproctor.com"
      : "http://localhost:5173";

  return `${url}/invitation/${token}`;
}
