# Instructor Credentials

## Sample Instructor (Non-Production Example Only)

**✅ Example only (no real account):**

- **Email format:** `instructor@example.edu`
- **Employee ID format:** `EMP-<number>` (e.g., `EMP-6`)
- **Password:** `CHANGE_ME_INSTRUCTOR_PASSWORD` (set this securely in your own environment)
- **Name:** Example Instructor
- **Department:** College of Arts & Sciences (CAS)
- **RFID Tag:** `INSTR-CAS-<ID>`
- **Phone:** `(+63) 900-000-0000`
- **Office:** Example Building, Example Room
- **Office Hours:** 10:00 AM - 4:00 PM
- **Specialization:** Networking
- **Type:** FULL_TIME

## Login Instructions

You can log in using either (in your own environment):
1. **Email:** your configured instructor email (e.g., `instructor@example.edu`)
2. **Employee ID:** an ID like `EMP-6` or `6`
3. **Password:** the secure password you set (do **not** commit real passwords)

## Other Instructors

The database contains **50+ instructors**, but they don't have passwords set yet. To set passwords for other instructors, you can:

1. **Set password for the first instructor found:**
   ```bash
   node temp/set-sample-credentials.js
   ```

2. **Create a new instructor with credentials:**
   ```bash
   node scripts/create-instructor-user.js
   ```

3. **Set password for a specific instructor:**
   - Modify `temp/set-sample-credentials.js` to target a specific instructor
   - Or use the admin panel to reset passwords

## Default Password (Development Guidance Only)

Set a default instructor password **via environment variables or seed scripts**, and avoid hardcoding real passwords in the repository.  
You may use a placeholder like **`CHANGE_ME_INSTRUCTOR_PASSWORD`** locally, but do not commit actual credentials.

## Notes

- All instructors have email addresses in the format: `[name]@icct.edu.ph`
- Employee IDs are in the format: `EMP-[number]`
- All instructors are currently ACTIVE
- All instructors have email verification enabled
- Failed login attempts are reset to 0


