-- CreateTable
CREATE TABLE "Pick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bot" TEXT NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'NBA',
    "matchDate" DATETIME NOT NULL,
    "matchup" TEXT NOT NULL,
    "pickType" TEXT NOT NULL,
    "pickDetails" TEXT NOT NULL,
    "odds" INTEGER NOT NULL,
    "edge" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resultScore" TEXT,
    "profit" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "lastScan" DATETIME
);
