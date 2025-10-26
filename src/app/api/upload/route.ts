import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { prisma } from '@/lib/prisma';
import { getCloudStorageService } from '@/lib/services/cloud-storage.service';

export async function POST(request: NextRequest) {
  try {
    // JWT Authentication - Admin only
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number((decoded as any)?.userId);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { userId }, select: { status: true, role: true } });
    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }
    const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (!adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (whitelist)
    const allowedTypes = ['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PNG, JPEG, WEBP, or SVG images are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(bytes);

    // Generate unique, sanitized filename
    const timestamp = Date.now();
    const inferredExt = (() => {
      switch (file.type) {
        case 'image/png': return 'png';
        case 'image/jpeg':
        case 'image/jpg': return 'jpg';
        case 'image/webp': return 'webp';
        case 'image/svg+xml': return 'svg';
        default: return 'img';
      }
    })();
    const fileName = `department-logo-${timestamp}.${inferredExt}`;

    // Check if cloud storage is configured
    const useCloudStorage = process.env.CLOUD_STORAGE_PROVIDER && 
                           process.env.CLOUD_STORAGE_PROVIDER !== 'local';

    let publicUrl: string;
    let savedFileName: string;

    if (useCloudStorage) {
      // Upload to cloud storage
      const cloudStorage = getCloudStorageService();
      const cloudKey = `uploads/${fileName}`;
      
      const result = await cloudStorage.uploadFile(
        fileBuffer,
        cloudKey,
        file.type,
        {
          uploadedBy: userId.toString(),
          uploadedAt: new Date().toISOString(),
          originalName: file.name
        }
      );

      publicUrl = result.url;
      savedFileName = fileName;
    } else {
      // Fallback to local storage
      const uploadsDir = join(process.cwd(), 'public', 'uploads');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      const filePath = join(uploadsDir, fileName);
      await writeFile(filePath, fileBuffer);

      publicUrl = `/uploads/${fileName}`;
      savedFileName = fileName;
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: savedFileName,
      storage: useCloudStorage ? 'cloud' : 'local'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 