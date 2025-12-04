const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

// Known default passwords to test
const knownPasswords = ['admin123', 'admin456', 'Student123!', 'Instructor123!'];

async function findAdminCredentials() {
  try {
    console.log('🔍 Querying database for admin credentials...\n');

    // Get admin users only
    const adminUsers = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN'] }
      },
      select: {
        userId: true,
        userName: true,
        email: true,
        role: true,
        status: true,
        isEmailVerified: true,
        failedLoginAttempts: true,
        passwordHash: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' },
        { email: 'asc' }
      ]
    });

    console.log(`📊 Found ${adminUsers.length} admin users\n`);
    console.log('═'.repeat(80));

    for (const user of adminUsers) {
      console.log(`\n📧 Email: ${user.email}`);
      console.log(`   Username: ${user.userName || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Email Verified: ${user.isEmailVerified ? '✅' : '❌'}`);
      console.log(`   Failed Login Attempts: ${user.failedLoginAttempts}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);

      // Try to match password with known defaults
      let passwordFound = false;
      for (const password of knownPasswords) {
        try {
          const matches = await bcrypt.compare(password, user.passwordHash);
          if (matches) {
            console.log(`   🔑 Password: ${password} ✅`);
            passwordFound = true;
            break;
          }
        } catch (error) {
          // Skip if comparison fails
        }
      }

      if (!passwordFound) {
        console.log(`   🔑 Password: [HASHED - Unknown]`);
      }

      // Check if account is locked
      if (user.failedLoginAttempts >= 5) {
        console.log(`   ⚠️  WARNING: Account may be locked (${user.failedLoginAttempts} failed attempts)`);
      }
    }

    // Summary table
    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ LOGIN CREDENTIALS SUMMARY:\n');
    console.log('Role'.padEnd(15) + ' | ' + 'Email'.padEnd(35) + ' | Password');
    console.log('-'.repeat(80));

    for (const user of adminUsers) {
      if (user.status === 'ACTIVE' && user.isEmailVerified && user.failedLoginAttempts < 5) {
        let password = '[Unknown]';
        for (const pwd of knownPasswords) {
          try {
            if (await bcrypt.compare(pwd, user.passwordHash)) {
              password = pwd;
              break;
            }
          } catch (error) {
            // Skip
          }
        }

        console.log(user.role.padEnd(15) + ' | ' + user.email.padEnd(35) + ' | ' + password);
      }
    }

    console.log('\n' + '═'.repeat(80));

  } catch (error) {
    console.error('❌ Error querying database:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

findAdminCredentials();

