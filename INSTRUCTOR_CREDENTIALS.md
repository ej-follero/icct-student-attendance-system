# Instructor Credentials

## Active Instructor with Password Set

**✅ Ready to Login:**

- **Email:** `mabelle.rowe1@icct.edu.ph`
- **Employee ID:** `EMP-6` (or `6`)
- **Password:** `Instructor123!`
- **Name:** Mabelle Skyler Rowe
- **Department:** College of Arts & Sciences (CAS)
- **RFID Tag:** INSTRCAS001
- **Phone:** (345) 262-2611 x95013
- **Office:** College of Arts & Sciences Building, Room 150
- **Office Hours:** 10:00 AM - 4:00 PM
- **Specialization:** Networking
- **Type:** FULL_TIME

## Login Instructions

You can log in using either:
1. **Email:** `mabelle.rowe1@icct.edu.ph`
2. **Employee ID:** `EMP-6` or `6`
3. **Password:** `Instructor123!`

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

## Default Password

The default password used in the system is: **`Instructor123!`**

## Notes

- All instructors have email addresses in the format: `[name]@icct.edu.ph`
- Employee IDs are in the format: `EMP-[number]`
- All instructors are currently ACTIVE
- All instructors have email verification enabled
- Failed login attempts are reset to 0


