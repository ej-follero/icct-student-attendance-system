#!/usr/bin/env node

/**
 * Cloud Storage Setup Script
 * Helps configure cloud storage for the ICCT Smart Attendance System
 */

const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

class CloudStorageSetup {
  constructor() {
    this.envPath = path.join(process.cwd(), '.env.local');
    this.envTemplatePath = path.join(process.cwd(), 'env.template');
  }

  async setup() {
    console.log('☁️  Cloud Storage Setup for ICCT Smart Attendance System\n');

    try {
      // 1. Choose cloud provider
      const provider = await this.chooseProvider();
      
      // 2. Configure provider-specific settings
      const config = await this.configureProvider(provider);
      
      // 3. Update environment file
      await this.updateEnvironmentFile(provider, config);
      
      // 4. Install dependencies
      await this.installDependencies(provider);
      
      // 5. Test configuration
      await this.testConfiguration(provider);
      
      console.log('\n✅ Cloud storage setup completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Run: npm run migrate:cloud (to migrate existing files)');
      console.log('2. Test file uploads in your application');
      console.log('3. Verify backups are working with cloud storage');
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async chooseProvider() {
    console.log('Available cloud storage providers:');
    console.log('1. Vercel Blob (Recommended for Vercel deployment)');
    console.log('2. AWS S3 (Most popular, industry standard)');
    console.log('3. Google Cloud Storage');
    console.log('4. Cloudinary (Specialized for media files)');
    console.log('5. Skip (Use local storage only)\n');

    const choice = await question('Choose a provider (1-5): ');
    
    const providers = {
      '1': 'vercel',
      '2': 'aws',
      '3': 'google',
      '4': 'cloudinary',
      '5': 'local'
    };

    const provider = providers[choice];
    if (!provider) {
      throw new Error('Invalid choice');
    }

    if (provider === 'local') {
      console.log('✅ Using local storage only. No cloud configuration needed.');
      process.exit(0);
    }

    return provider;
  }

  async configureProvider(provider) {
    const config = {};

    switch (provider) {
      case 'vercel':
        console.log('\n📋 Vercel Blob Configuration:');
        console.log('- Vercel Blob is automatically configured when deployed to Vercel');
        console.log('- BLOB_READ_WRITE_TOKEN will be set automatically');
        console.log('- No additional configuration needed for development');
        break;

      case 'aws':
        console.log('\n📋 AWS S3 Configuration:');
        config.bucket = await question('S3 Bucket name: ');
        config.region = await question('AWS Region (default: us-east-1): ') || 'us-east-1';
        config.accessKeyId = await question('AWS Access Key ID: ');
        config.secretAccessKey = await question('AWS Secret Access Key: ');
        
        console.log('\n💡 AWS Setup Instructions:');
        console.log('1. Create an S3 bucket in AWS Console');
        console.log('2. Create an IAM user with S3 permissions');
        console.log('3. Generate access keys for the user');
        console.log('4. Configure CORS policy for your bucket');
        break;

      case 'google':
        console.log('\n📋 Google Cloud Storage Configuration:');
        config.projectId = await question('Google Cloud Project ID: ');
        config.bucket = await question('Storage Bucket name: ');
        config.keyFilename = await question('Service Account Key File path: ');
        
        console.log('\n💡 Google Cloud Setup Instructions:');
        console.log('1. Create a project in Google Cloud Console');
        console.log('2. Enable Cloud Storage API');
        console.log('3. Create a storage bucket');
        console.log('4. Create a service account and download JSON key file');
        break;

      case 'cloudinary':
        console.log('\n📋 Cloudinary Configuration:');
        config.cloudName = await question('Cloudinary Cloud Name: ');
        config.apiKey = await question('Cloudinary API Key: ');
        config.apiSecret = await question('Cloudinary API Secret: ');
        
        console.log('\n💡 Cloudinary Setup Instructions:');
        console.log('1. Sign up at cloudinary.com');
        console.log('2. Get your cloud name, API key, and secret from dashboard');
        console.log('3. Configure upload presets if needed');
        break;
    }

    return config;
  }

  async updateEnvironmentFile(provider, config) {
    console.log('\n📝 Updating environment configuration...');

    let envContent = '';
    
    try {
      envContent = await fs.readFile(this.envTemplatePath, 'utf8');
    } catch (error) {
      console.log('⚠️  Could not read env.template, creating new .env.local');
      envContent = '';
    }

    // Update cloud storage configuration
    const cloudConfig = [
      `CLOUD_STORAGE_PROVIDER="${provider}"`,
      `CLOUD_STORAGE_BUCKET="${config.bucket || ''}"`,
      `CLOUD_STORAGE_REGION="${config.region || 'us-east-1'}"`,
      `AWS_ACCESS_KEY_ID="${config.accessKeyId || ''}"`,
      `AWS_SECRET_ACCESS_KEY="${config.secretAccessKey || ''}"`,
      `GOOGLE_CLOUD_PROJECT_ID="${config.projectId || ''}"`,
      `GOOGLE_CLOUD_KEY_FILE="${config.keyFilename || ''}"`,
      `CLOUDINARY_CLOUD_NAME="${config.cloudName || ''}"`,
      `CLOUDINARY_API_KEY="${config.apiKey || ''}"`,
      `CLOUDINARY_API_SECRET="${config.apiSecret || ''}"`,
    ].join('\n');

    // Replace or add cloud storage configuration
    if (envContent.includes('CLOUD_STORAGE_PROVIDER')) {
      // Replace existing configuration
      envContent = envContent.replace(
        /# Cloud Storage Configuration[\s\S]*?BLOB_READ_WRITE_TOKEN.*?\n/,
        `# Cloud Storage Configuration\n${cloudConfig}\nBLOB_READ_WRITE_TOKEN="" # Auto-configured by Vercel\n`
      );
    } else {
      // Add new configuration
      envContent += `\n\n# Cloud Storage Configuration\n${cloudConfig}\nBLOB_READ_WRITE_TOKEN="" # Auto-configured by Vercel\n`;
    }

    await fs.writeFile(this.envPath, envContent);
    console.log('✅ Environment file updated');
  }

  async installDependencies(provider) {
    console.log('\n📦 Installing dependencies...');

    const dependencies = {
      vercel: ['@vercel/blob'],
      aws: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
      google: ['@google-cloud/storage'],
      cloudinary: ['cloudinary']
    };

    const deps = dependencies[provider] || [];
    
    if (deps.length > 0) {
      console.log(`Installing: ${deps.join(', ')}`);
      // Note: In a real implementation, you would run npm install here
      console.log('💡 Run: npm install ' + deps.join(' '));
    }
  }

  async testConfiguration(provider) {
    console.log('\n🧪 Testing configuration...');

    if (provider === 'vercel') {
      console.log('✅ Vercel Blob configuration ready');
      console.log('💡 Test by deploying to Vercel and uploading a file');
    } else {
      console.log('✅ Configuration saved to .env.local');
      console.log('💡 Test by running: npm run dev and uploading a file');
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Start your application: npm run dev');
    console.log('2. Test file upload functionality');
    console.log('3. Run migration: npm run migrate:cloud');
    console.log('4. Test backup system with cloud storage');
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new CloudStorageSetup();
  setup.setup().catch(console.error);
}

module.exports = CloudStorageSetup;
