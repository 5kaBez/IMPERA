-- CreateTable
CREATE TABLE "Backup"
(
  "id"         SERIAL       NOT NULL,
  "name"       TEXT         NOT NULL,
  "fileSize"   INTEGER      NOT NULL,
  "userCount"  INTEGER,
  "groupCount" INTEGER,
  "lessonCount" INTEGER,
  "source"     TEXT         NOT NULL DEFAULT E'manual',
  "filePath"   TEXT         NOT NULL,
  "restoredCount" INTEGER    NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Backup_name_key" ON "Backup"("name");
