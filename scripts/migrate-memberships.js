/**
 * Backfills the `memberships` collection for users created before
 * multi-organization support.
 *
 * Run with mongosh, NOT node — the production image is a Next.js standalone
 * build with no source tree and no full node_modules. See scripts/README.md.
 *
 *   mongosh "<connection string>" scripts/migrate-memberships.js
 *
 * Idempotent: safe to run repeatedly. Purely additive — it creates a new
 * collection and sets a new field, and touches nothing the pre-multi-org code
 * reads, so it can be run against a live database while the old version is
 * still serving traffic.
 */

// Created first so the unique constraint is live before any write.
db.memberships.createIndex({ userId: 1, organizationId: 1 }, { unique: true })
db.memberships.createIndex({ organizationId: 1, role: 1, createdAt: 1 })

let processed = 0
let created = 0

db.users
  .find(
    { organizationId: { $exists: true, $ne: null } },
    { organizationId: 1, role: 1, createdAt: 1 }
  )
  .forEach(function (u) {
    const now = new Date()

    const result = db.memberships.updateOne(
      { userId: u._id, organizationId: u.organizationId },
      {
        $setOnInsert: {
          userId: u._id,
          organizationId: u.organizationId,
          role: u.role || 'sales_rep',
          createdAt: u.createdAt || now,
          updatedAt: now,
        },
      },
      { upsert: true }
    )

    if (result.upsertedCount > 0) created += 1

    // lastOrganizationId seeds the login default so migrated users land where
    // they always have. membershipsBackfilledAt marks the user as migrated, which
    // stops the lazy backfill in lib/session.ts from ever re-creating a
    // membership that has since been revoked.
    db.users.updateOne(
      { _id: u._id },
      {
        $set: {
          lastOrganizationId: u.organizationId,
          membershipsBackfilledAt: now,
        },
      }
    )

    processed += 1
  })

print('users processed:     ' + processed)
print('memberships created: ' + created)
print('memberships total:   ' + db.memberships.countDocuments())
print(
  'users with no org:   ' +
    db.users.countDocuments({
      $or: [{ organizationId: { $exists: false } }, { organizationId: null }],
    })
)
