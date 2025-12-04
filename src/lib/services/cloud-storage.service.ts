import { put } from '@vercel/blob';
import { del } from '@vercel/blob';

export interface CloudStorageConfig {
  provider: 'vercel';
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface CloudStorageService {
  uploadFile(file: Buffer | Uint8Array, key: string, contentType: string, metadata?: Record<string, string>): Promise<UploadResult>;
  downloadFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  listFiles(prefix?: string): Promise<string[]>;
  getFileMetadata(key: string): Promise<Record<string, any>>;
}


export class VercelStorageService implements CloudStorageService {
  async uploadFile(file: Buffer | Uint8Array, key: string, contentType: string, metadata?: Record<string, string>): Promise<UploadResult> {
    // Normalize to Uint8Array so it matches the expected PutBody types
    const body: Uint8Array = Buffer.isBuffer(file) ? new Uint8Array(file) : file;

    // Cast to any to satisfy @vercel/blob typings across runtimes
    const blob = await put(key, body as any, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      key,
      size: file.length,
      contentType,
      metadata,
    };
  }

  async downloadFile(key: string): Promise<Buffer> {
    const response = await fetch(`https://blob.vercel-storage.com/${key}`);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteFile(key: string): Promise<void> {
    await del(key);
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // Vercel Blob URLs are public by default
    return `https://blob.vercel-storage.com/${key}`;
  }

  async listFiles(prefix?: string): Promise<string[]> {
    // Vercel Blob doesn't have a direct list API in the client
    // This would need to be implemented with a custom API endpoint
    throw new Error('List files not implemented for Vercel Blob');
  }

  async getFileMetadata(key: string): Promise<Record<string, any>> {
    const response = await fetch(`https://blob.vercel-storage.com/${key}`, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`Failed to get file metadata: ${response.statusText}`);
    }
    
    return {
      contentType: response.headers.get('content-type'),
      size: parseInt(response.headers.get('content-length') || '0'),
      lastModified: response.headers.get('last-modified'),
    };
  }
}



export class CloudStorageFactory {
  static createService(config: CloudStorageConfig): CloudStorageService {
    if (config.provider !== 'vercel') {
      throw new Error(`Only Vercel Blob is supported. Received: ${config.provider}`);
    }
    return new VercelStorageService();
  }
}

// Singleton instance
let cloudStorageService: CloudStorageService | null = null;

export function getCloudStorageService(): CloudStorageService {
  if (!cloudStorageService) {
    const config: CloudStorageConfig = {
      provider: 'vercel',
    };

    cloudStorageService = CloudStorageFactory.createService(config);
  }

  return cloudStorageService;
}
