CREATE TABLE "SearchKeywordTrend" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchKeywordTrend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SearchKeywordTrend_keyword_day_key" ON "SearchKeywordTrend"("keyword", "day");
CREATE INDEX "SearchKeywordTrend_day_idx" ON "SearchKeywordTrend"("day");
