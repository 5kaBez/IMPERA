-- AlterTable: Add social features columns to Note
ALTER TABLE "Note" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Note" ADD COLUMN "groupId" INTEGER;

-- CreateIndex
CREATE INDEX "Note_groupId_date_idx" ON "Note"("groupId", "date");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: BlockedUser
CREATE TABLE "BlockedUser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "blockedUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedUser_userId_blockedUserId_key" ON "BlockedUser"("userId", "blockedUserId");
CREATE INDEX "BlockedUser_userId_idx" ON "BlockedUser"("userId");
