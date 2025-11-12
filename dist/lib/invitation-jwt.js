import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { appEnvVariables } from "../env.js";
const invitationTokenPayloadSchema = z.object({
  invitationId: z.string().uuid(),
  assessmentId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  matriculationNumber: z.string(),
  exp: z.number(),
  iat: z.number()
});
function getSecretKey() {
  return new TextEncoder().encode(appEnvVariables.SUPABASE_JWT_SECRET);
}
function getInvitationExpiration(scheduledDate) {
  if (scheduledDate) {
    const endOfDay = new Date(scheduledDate);
    endOfDay.setHours(23, 59, 59, 999);
    return Math.floor(endOfDay.getTime() / 1e3);
  }
  const defaultExpiration = /* @__PURE__ */ new Date();
  defaultExpiration.setDate(defaultExpiration.getDate() + 7);
  defaultExpiration.setHours(23, 59, 59, 999);
  return Math.floor(defaultExpiration.getTime() / 1e3);
}
async function signInvitationToken(payload, expirationTimestamp) {
  const iat = Math.floor(Date.now() / 1e3);
  const token = await new SignJWT({
    ...payload,
    iat,
    exp: expirationTimestamp
  }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt(iat).setExpirationTime(expirationTimestamp).sign(getSecretKey());
  return token;
}
async function verifyInvitationToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"]
    });
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
function generateInvitationUrl(token) {
  const url = process.env.NODE_ENV === "production" ? "https://queryproctor.com" : "http://localhost:5173";
  return `${url}/invitation/${token}`;
}
export {
  generateInvitationUrl,
  getInvitationExpiration,
  invitationTokenPayloadSchema,
  signInvitationToken,
  verifyInvitationToken
};
