# ☁️ Cloud Storage Migration Guide

## Overview
This guide helps you migrate from local Docker-based storage to cloud storage for the ICCT Smart Attendance System.

## Migration Strategy

### Phase 1: Preparation
1. **Choose Cloud Provider**
   - **Vercel Blob** (Recommended for Vercel deployment)
   - **AWS S3** (Most popular, industry standard)
   - **Google Cloud Storage** (Good for Google Workspace integration)
   - **Cloudinary** (Specialized for media files)

2. **Install Dependencies**
   ```bash
   # For AWS S3
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   
   # For Vercel Blob
   npm install @vercel/blob
   
   # For Google Cloud
   npm install @google-cloud/storage
   
   # For Cloudinary
   npm install cloudinary
   ```

3. **Set Up Cloud Storage Account**
   - Create account with chosen provider
   - Configure buckets/containers
   - Set up authentication credentials
   - Configure CORS policies (if needed)

### Phase 2: Configuration

#### Environment Variables Setup

1. **Copy environment template**
   ```bash
   cp env.template .env.local
   ```

2. **Configure cloud storage provider**
   ```env
   # Choose your provider
   CLOUD_STORAGE_PROVIDER="vercel" # or aws, google, cloudinary
   
   # Provider-specific configuration
   CLOUD_STORAGE_BUCKET="your-bucket-name"
   CLOUD_STORAGE_REGION="us-east-1"
   
   # AWS S3 credentials
   AWS_ACCESS_KEY_ID="your-access-key"
   AWS_SECRET_ACCESS_KEY="your-secret-key"
   
   # Google Cloud credentials
   GOOGLE_CLOUD_PROJECT_ID="your-project-id"
   GOOGLE_CLOUD_KEY_FILE="path/to/service-account.json"
   
   # Cloudinary credentials
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```

### Phase 3: Code Migration

#### 1. Update File Upload API

The system will automatically use cloud storage when configured. No code changes needed for basic functionality.

#### 2. Update File Download/Display

Files will be served from cloud URLs instead of local paths.

#### 3. Update Backup System

Backups will be stored in cloud storage instead of local directories.

### Phase 4: Data Migration

#### Migrate Existing Files

1. **Create migration script**
   ```bash
   node scripts/migrate-to-cloud-storage.js
   ```

2. **Run migration**
   ```bash
   npm run migrate:cloud
   ```

#### Migration Script Features
- Uploads all existing files to cloud storage
- Updates database records with new URLs
- Preserves file metadata and permissions
- Handles large files with progress tracking
- Rollback capability if migration fails

### Phase 5: Testing

#### 1. Test File Upload
```bash
# Test with curl
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-image.jpg"
```

#### 2. Test File Download
```bash
# Test file access
curl http://localhost:3000/api/files/[file-id]
```

#### 3. Test Backup System
```bash
# Create test backup
curl -X POST http://localhost:3000/api/backup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Backup","description":"Cloud storage test"}'
```

### Phase 6: Deployment

#### 1. Update Production Environment
- Set cloud storage environment variables in production
- Configure cloud storage buckets/containers
- Set up proper permissions and CORS

#### 2. Deploy Application
```bash
# Deploy to Vercel
vercel --prod

# Or deploy to your preferred platform
npm run deploy:prod
```

#### 3. Verify Deployment
- Test file uploads in production
- Verify cloud storage integration
- Check backup functionality

## Provider-Specific Setup

### AWS S3 Setup

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://your-bucket-name
   ```

2. **Configure CORS**
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

3. **Set up IAM User**
   - Create IAM user with S3 permissions
   - Generate access keys
   - Add to environment variables

### Vercel Blob Setup

1. **Enable Vercel Blob**
   ```bash
   vercel storage create blob
   ```

2. **Environment Variables**
   - `BLOB_READ_WRITE_TOKEN` is auto-configured
   - No additional setup required

### Google Cloud Storage Setup

1. **Create Storage Bucket**
   ```bash
   gsutil mb gs://your-bucket-name
   ```

2. **Set up Service Account**
   - Create service account
   - Download JSON key file
   - Set environment variables

### Cloudinary Setup

1. **Create Cloudinary Account**
   - Sign up at cloudinary.com
   - Get cloud name, API key, and secret

2. **Configure Environment**
   ```env
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```

## Migration Checklist

### Pre-Migration
- [ ] Choose cloud storage provider
- [ ] Set up cloud storage account
- [ ] Install required dependencies
- [ ] Configure environment variables
- [ ] Test cloud storage connection

### Migration
- [ ] Run migration script
- [ ] Verify file uploads work
- [ ] Test file downloads
- [ ] Check backup system
- [ ] Update any hardcoded file paths

### Post-Migration
- [ ] Remove local file storage
- [ ] Update documentation
- [ ] Monitor cloud storage usage
- [ ] Set up billing alerts
- [ ] Configure backup policies

## Rollback Plan

If migration fails:

1. **Restore from backup**
   ```bash
   # Restore database
   psql -d icct-sas < backup.sql
   
   # Restore files
   cp -r ./backups/uploads/* ./public/uploads/
   ```

2. **Revert environment variables**
   ```env
   CLOUD_STORAGE_PROVIDER="local"
   ```

3. **Restart application**
   ```bash
   npm run dev
   ```

## Cost Optimization

### AWS S3
- Use S3 Standard for frequently accessed files
- Use S3 Infrequent Access for backups
- Enable lifecycle policies
- Use CloudFront for CDN

### Vercel Blob
- Monitor bandwidth usage
- Use appropriate file formats
- Compress images before upload

### Google Cloud Storage
- Use appropriate storage classes
- Enable lifecycle management
- Use Cloud CDN for global distribution

### Cloudinary
- Use automatic image optimization
- Enable responsive images
- Use appropriate quality settings

## Security Considerations

1. **Access Control**
   - Set up proper IAM policies
   - Use signed URLs for sensitive files
   - Implement proper authentication

2. **Data Encryption**
   - Enable server-side encryption
   - Use HTTPS for all transfers
   - Consider client-side encryption for sensitive data

3. **Backup Strategy**
   - Regular backups to different regions
   - Test restore procedures
   - Monitor backup integrity

## Monitoring and Maintenance

### Cloud Storage Monitoring
- Set up billing alerts
- Monitor storage usage
- Track API usage and costs
- Monitor performance metrics

### Regular Maintenance
- Review and clean up old files
- Optimize storage classes
- Update security policies
- Monitor access patterns

## Troubleshooting

### Common Issues

1. **Upload Failures**
   - Check credentials and permissions
   - Verify bucket/container exists
   - Check file size limits
   - Review CORS configuration

2. **Download Issues**
   - Verify file URLs
   - Check signed URL expiration
   - Review access permissions
   - Test with different browsers

3. **Performance Issues**
   - Enable CDN
   - Optimize file sizes
   - Use appropriate storage classes
   - Monitor bandwidth usage

### Support Resources
- Provider documentation
- Community forums
- Support tickets
- Stack Overflow

## Next Steps

After successful migration:

1. **Optimize Performance**
   - Enable CDN
   - Implement caching
   - Optimize file formats

2. **Enhance Security**
   - Set up access controls
   - Implement encryption
   - Regular security audits

3. **Monitor and Scale**
   - Set up monitoring
   - Plan for scaling
   - Regular cost reviews
