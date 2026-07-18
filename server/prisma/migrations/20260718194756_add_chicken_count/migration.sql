-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "rateCents" INTEGER NOT NULL DEFAULT 100,
    "chickenCount" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("id", "rateCents", "updatedAt") SELECT "id", "rateCents", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
