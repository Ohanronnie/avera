CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

ALTER TABLE "Message" ADD COLUMN "offerStatus" "OfferStatus";

UPDATE "Message"
SET "offerStatus" = 'PENDING'
WHERE "offerAmount" IS NOT NULL;
