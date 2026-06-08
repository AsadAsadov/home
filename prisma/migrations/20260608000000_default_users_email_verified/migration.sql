-- New normal email/password accounts are active and verified by default.
ALTER TABLE "users" ALTER COLUMN "email_verified" SET DEFAULT true;
