-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EggCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "eggCount" INTEGER,
    "isHelper" BOOLEAN NOT NULL DEFAULT false,
    "rateCents" INTEGER NOT NULL DEFAULT 100,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EggCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EggCollection" ("createdAt", "date", "eggCount", "id", "isHelper", "note", "userId") SELECT "createdAt", "date", "eggCount", "id", "isHelper", "note", "userId" FROM "EggCollection";
DROP TABLE "EggCollection";
ALTER TABLE "new_EggCollection" RENAME TO "EggCollection";
CREATE UNIQUE INDEX "EggCollection_userId_date_key" ON "EggCollection"("userId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
