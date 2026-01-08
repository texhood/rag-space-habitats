// services/gridfsService.js - GridFS service for file storage
const { GridFSBucket, ObjectId } = require('mongodb');
const { getDB } = require('../config/mongodb');

class GridFSService {
  constructor() {
    this.bucket = null;
  }

  /**
   * Initialize GridFS bucket for project uploads
   */
  async initialize() {
    try {
      const db = getDB();

      this.bucket = new GridFSBucket(db, {
        bucketName: 'projectUploads'
      });

      console.log('✅ GridFS bucket "projectUploads" initialized');
    } catch (err) {
      console.error('❌ Failed to initialize GridFS:', err.message);
      throw err;
    }
  }

  /**
   * Upload a file to GridFS
   * @param {Buffer} fileBuffer - File content as buffer
   * @param {String} filename - Original filename
   * @param {Object} metadata - Additional metadata (mime_type, project_id, etc.)
   * @returns {Promise<String>} - GridFS file ID
   */
  async uploadFile(fileBuffer, filename, metadata = {}) {
    if (!this.bucket) {
      throw new Error('GridFS not initialized');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = this.bucket.openUploadStream(filename, {
        metadata: {
          ...metadata,
          uploadedAt: new Date()
        }
      });

      uploadStream.on('finish', () => {
        console.log(`[GridFS] File uploaded: ${filename} (${uploadStream.id})`);
        resolve(uploadStream.id.toString());
      });

      uploadStream.on('error', (error) => {
        console.error(`[GridFS] Upload error for ${filename}:`, error);
        reject(error);
      });

      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Download a file from GridFS
   * @param {String} fileId - GridFS file ID
   * @returns {Promise<Buffer>} - File content as buffer
   */
  async downloadFile(fileId) {
    if (!this.bucket) {
      throw new Error('GridFS not initialized');
    }

    return new Promise((resolve, reject) => {
      const chunks = [];
      const objectId = new ObjectId(fileId);

      const downloadStream = this.bucket.openDownloadStream(objectId);

      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });

      downloadStream.on('error', (error) => {
        console.error(`[GridFS] Download error for ${fileId}:`, error);
        reject(error);
      });
    });
  }

  /**
   * Delete a file from GridFS
   * @param {String} fileId - GridFS file ID
   */
  async deleteFile(fileId) {
    if (!this.bucket) {
      throw new Error('GridFS not initialized');
    }

    try {
      const objectId = new ObjectId(fileId);
      await this.bucket.delete(objectId);
      console.log(`[GridFS] File deleted: ${fileId}`);
    } catch (err) {
      console.error(`[GridFS] Delete error for ${fileId}:`, err.message);
      throw err;
    }
  }

  /**
   * Get file metadata from GridFS
   * @param {String} fileId - GridFS file ID
   * @returns {Promise<Object>} - File metadata
   */
  async getFileMetadata(fileId) {
    if (!this.bucket) {
      throw new Error('GridFS not initialized');
    }

    try {
      const objectId = new ObjectId(fileId);
      const files = await this.bucket.find({ _id: objectId }).toArray();

      if (files.length === 0) {
        throw new Error('File not found');
      }

      return files[0];
    } catch (err) {
      console.error(`[GridFS] Metadata error for ${fileId}:`, err.message);
      throw err;
    }
  }
}

// Export singleton instance
module.exports = new GridFSService();
