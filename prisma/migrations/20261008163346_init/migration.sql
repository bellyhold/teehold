-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessName" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "bio" TEXT,
    "photoUrl" TEXT,
    "publicSlug" TEXT NOT NULL,
    "lessonDurationMin" INTEGER NOT NULL DEFAULT 60,
    "lessonPriceCents" INTEGER NOT NULL DEFAULT 10000,
    "depositType" TEXT NOT NULL DEFAULT 'fixed',
    "depositFixedCents" INTEGER NOT NULL DEFAULT 2500,
    "depositPercent" INTEGER NOT NULL DEFAULT 25,
    "bufferMin" INTEGER NOT NULL DEFAULT 15,
    "cancellationHours" INTEGER NOT NULL DEFAULT 24,
    "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeConnectAccountId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'trial',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AvailabilityRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "locationLabel" TEXT,
    CONSTRAINT "AvailabilityRule_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AvailabilityException" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "locationLabel" TEXT,
    CONSTRAINT "AvailabilityException_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LessonType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "LessonType_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "lessonTypeId" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "depositCents" INTEGER NOT NULL,
    "depositStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "cancelToken" TEXT NOT NULL,
    "notes" TEXT,
    "reminderSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_lessonTypeId_fkey" FOREIGN KEY ("lessonTypeId") REFERENCES "LessonType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientNote_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Coach_email_key" ON "Coach"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_publicSlug_key" ON "Coach"("publicSlug");

-- CreateIndex
CREATE INDEX "AvailabilityRule_coachId_idx" ON "AvailabilityRule"("coachId");

-- CreateIndex
CREATE INDEX "AvailabilityException_coachId_date_idx" ON "AvailabilityException"("coachId", "date");

-- CreateIndex
CREATE INDEX "LessonType_coachId_idx" ON "LessonType"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_cancelToken_key" ON "Booking"("cancelToken");

-- CreateIndex
CREATE INDEX "Booking_coachId_startsAt_idx" ON "Booking"("coachId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_clientEmail_idx" ON "Booking"("clientEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_coachId_startsAt_key" ON "Booking"("coachId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientNote_coachId_clientEmail_key" ON "ClientNote"("coachId", "clientEmail");
