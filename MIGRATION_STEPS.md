# Migration Steps for Archive vs Soft Delete

## Summary of Changes

We've implemented a distinction between **Archive** and **Soft Delete** for schedules:

- **Archive**: Sets `status: 'CANCELLED'` and `deletedAt: null` (archived records are kept for reference)
- **Soft Delete**: Sets `status: 'CANCELLED'` and `deletedAt: new Date()` (soft-deleted records have a timestamp)

## Steps to Apply Changes

1. **Stop all running processes** (dev server, any processes using Prisma)

2. **Apply the database migration:**
   ```bash
   npx prisma migrate dev --name add_deleted_at_to_schedules
   ```
   
   OR if you prefer to push without creating a migration:
   ```bash
   npx prisma db push
   ```

3. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

4. **Restart your dev server**

## Files Modified

- `prisma/schema.prisma` - Added `deletedAt` field to `SubjectSchedule` model
- `src/app/api/schedules/bulk/route.ts` - Updated archive and soft delete logic
- `src/app/api/schedules/[id]/route.ts` - Updated individual delete to soft delete
- `src/app/api/schedules/route.ts` - Updated query to filter by `deletedAt: null`
- `src/app/api/schedules/import/route.ts` - Updated conflict check
- `src/app/api/search/schedules/route.ts` - Updated to exclude soft-deleted
- `src/app/api/students/[id]/enrolled-schedules/route.ts` - Updated to exclude soft-deleted
- `src/app/api/schedules/instructor/route.ts` - Updated to exclude soft-deleted
- `src/app/api/schedules/filter-options/route.ts` - Updated to exclude soft-deleted

## Behavior

- **Archived schedules** (`status: 'CANCELLED'`, `deletedAt: null`): Still visible in queries, kept for reference
- **Soft-deleted schedules** (`status: 'CANCELLED'`, `deletedAt: <timestamp>`): Hidden from normal queries, can be restored
- All API routes now filter by `deletedAt: null` to exclude soft-deleted records

