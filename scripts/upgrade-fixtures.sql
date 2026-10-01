-- Fixtures for scripts/rehearse-upgrade.mjs. Inserted into the schema production runs before upgrading,
-- so use only columns that exist on the base release. Synthetic data only.
-- Not a real bcrypt hash; the column is required on releases before OAuth support.
INSERT INTO "User" ("id", "email", "hashedPassword", "tier", "updatedAt")
VALUES ('rehearsal-user', 'rehearsal@example.com', 'rehearsal-not-a-hash', 'FREE', now());
INSERT INTO "InventoryItem" ("id", "name", "alertEmail", "qrCodeId", "userId", "updatedAt")
VALUES ('rehearsal-item', 'Rehearsal soap', 'rehearsal@example.com', 'rehearsal-qr', 'rehearsal-user', now());
