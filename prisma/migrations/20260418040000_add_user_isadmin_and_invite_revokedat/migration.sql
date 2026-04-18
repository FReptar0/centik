-- Add isAdmin to User and revokedAt to InviteToken (Phase 28)
-- isAdmin gates the Invitaciones admin UI; revokedAt enables explicit token revocation

ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "InviteToken" ADD COLUMN "revokedAt" TIMESTAMP(3);
