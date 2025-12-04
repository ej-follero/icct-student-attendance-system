const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

// Known default passwords to test
const knownPasswords = {
  'admin123': 'admin123',
  'admin456': 'admin456',
  'Student123!': 'Student123!',
  'Instructor123!': 'Instructor123!'
};

async function findLoginCredentials() {
  try {
    console.log('🔍 Querying database for user credentials...\n');

    // Get all users
    const users = await prisma.user.findMany({
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

    console.log(`📊 Found ${users.length} users in database\n`);
    console.log('═'.repeat(80));

    // Group by role
    const usersByRole = {};
    users.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });

    // Display users by role
    for (const [role, roleUsers] of Object.entries(usersByRole)) {
      console.log(`\n👥 ${role} (${roleUsers.length} users):`);
      console.log('-'.repeat(80));

      for (const user of roleUsers) {
        console.log(`\n📧 Email: ${user.email}`);
        console.log(`   Username: ${user.userName || 'N/A'}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Email Verified: ${user.isEmailVerified ? '✅' : '❌'}`);
        console.log(`   Failed Login Attempts: ${user.failedLoginAttempts}`);
        console.log(`   Created: ${user.createdAt.toLocaleString()}`);

        // Try to match password with known defaults
        let passwordFound = false;
        for (const [key, password] of Object.entries(knownPasswords)) {
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
    }

    // Summary of active accounts ready to use
    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ ACTIVE ACCOUNTS READY TO USE:\n');
    
    const activeUsers = users.filter(u => 
      u.status === 'ACTIVE' && 
      u.isEmailVerified && 
      u.failedLoginAttempts < 5
    );

    for (const user of activeUsers) {
      let password = '[Unknown]';
      for (const [key, pwd] of Object.entries(knownPasswords)) {
        try {
          if (await bcrypt.compare(pwd, user.passwordHash)) {
            password = pwd;
            break;
          }
        } catch (error) {
          // Skip
        }
      }

      console.log(`   ${user.role.padEnd(15)} | ${user.email.padEnd(30)} | Password: ${password}`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`\n📝 Total Users: ${users.length}`);
    console.log(`✅ Active & Verified: ${activeUsers.length}`);
    console.log(`❌ Inactive/Locked: ${users.length - activeUsers.length}`);

  } catch (error) {
    console.error('❌ Error querying database:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

findLoginCredentials();

