#!/usr/bin/env node

/**
 * Cloud Storage Migration Script
 * Migrates existing local files to cloud storage
 */

const fs = require('fs').promises;
const path = require('path');
const { getCloudStorageService } = require('../src/lib/services/cloud-storage.service.ts');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class CloudStorageMigration {
  constructor() {
    this.cloudStorage = getCloudStorageService();
    this.migratedFiles = [];
    this.failedFiles = [];
    this.totalFiles = 0;
    this.processedFiles = 0;
  }

  async migrate() {
    console.log('🚀 Starting cloud storage migration...\n');

    try {
      // 1. Migrate uploaded files
      await this.migrateUploadedFiles();
      
      // 2. Migrate backup files
      await this.migrateBackupFiles();
      
      // 3. Generate migration report
      await this.generateReport();
      
      console.log('\n✅ Migration completed successfully!');
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  async migrateUploadedFiles() {
    console.log('📁 Migrating uploaded files...');
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    try {
      const files = await this.getFilesRecursively(uploadsDir);
      this.totalFiles += files.length;
      
      for (const filePath of files) {
        await this.migrateFile(filePath, 'uploads');
      }
    } catch (error) {
      console.log('⚠️  No uploads directory found, skipping...');
    }
  }

  async migrateBackupFiles() {
    console.log('💾 Migrating backup files...');
    
    const backupsDir = path.join(process.cwd(), 'backups');
    
    try {
      const files = await this.getFilesRecursively(backupsDir);
      this.totalFiles += files.length;
      
      for (const filePath of files) {
        await this.migrateFile(filePath, 'backups');
      }
    } catch (error) {
      console.log('⚠️  No backups directory found, skipping...');
    }
  }

  async getFilesRecursively(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist, return empty array
    }
    
    return files;
  }

  async migrateFile(filePath, category) {
    try {
      this.processedFiles++;
      const progress = Math.round((this.processedFiles / this.totalFiles) * 100);
      
      console.log(`📤 [${progress}%] Migrating: ${path.basename(filePath)}`);
      
      // Read file
      const fileBuffer = await fs.readFile(filePath);
      const relativePath = path.relative(process.cwd(), filePath);
      const cloudKey = `${category}/${relativePath.replace(/\\/g, '/')}`;
      
      // Get file info
      const stats = await fs.stat(filePath);
      const contentType = this.getContentType(filePath);
      
      // Upload to cloud storage
      const result = await this.cloudStorage.uploadFile(
        fileBuffer,
        cloudKey,
        contentType,
        {
          originalPath: relativePath,
          category: category,
          migratedAt: new Date().toISOString()
        }
      );
      
      // Update database if it's a user upload
      if (category === 'uploads') {
        await this.updateDatabaseRecord(relativePath, result.url);
      }
      
      this.migratedFiles.push({
        originalPath: relativePath,
        cloudKey: cloudKey,
        cloudUrl: result.url,
        size: fileBuffer.length,
        category: category
      });
      
    } catch (error) {
      console.error(`❌ Failed to migrate ${filePath}:`, error.message);
      this.failedFiles.push({
        filePath: filePath,
        error: error.message
      });
    }
  }

  async updateDatabaseRecord(originalPath, cloudUrl) {
    try {
      // Update user profile images
      await prisma.user.updateMany({
        where: {
          profileImage: {
            contains: originalPath
          }
        },
        data: {
          profileImage: cloudUrl
        }
      });
      
      // Update any other file references in the database
      // Add more update queries as needed based on your schema
      
    } catch (error) {
      console.log(`⚠️  Could not update database record for ${originalPath}:`, error.message);
    }
  }

  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.sql': 'application/sql'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  async generateReport() {
    console.log('\n📊 Migration Report');
    console.log('==================');
    console.log(`Total files processed: ${this.processedFiles}`);
    console.log(`Successfully migrated: ${this.migratedFiles.length}`);
    console.log(`Failed migrations: ${this.failedFiles.length}`);
    
    if (this.failedFiles.length > 0) {
      console.log('\n❌ Failed files:');
      this.failedFiles.forEach(file => {
        console.log(`  - ${file.filePath}: ${file.error}`);
      });
    }
    
    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      totalFiles: this.totalFiles,
      processedFiles: this.processedFiles,
      migratedFiles: this.migratedFiles.length,
      failedFiles: this.failedFiles.length,
      migrated: this.migratedFiles,
      failed: this.failedFiles
    };
    
    await fs.writeFile(
      path.join(process.cwd(), 'migration-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📄 Detailed report saved to: migration-report.json');
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new CloudStorageMigration();
  migration.migrate().catch(console.error);
}

module.exports = CloudStorageMigration;
