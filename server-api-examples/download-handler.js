import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from 'crypto';
import PackageGenerator from "./zip-generator.js"; // Custom module for generating packages

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DownloadHandler {
  constructor() {
    this.packageGenerator = new PackageGenerator();
    this.downloadDir = path.join(__dirname, "../downloads");

    // Ensure download directory exists
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  // Generate download link for customer based on their purchase
  async generateDownloadLink(licenseType, customerEmail, orderId) {
    try {
      console.log(
        `Generating download for ${licenseType} license for ${customerEmail}`
      );

      // Map Stripe product IDs to package types
      const packageTypeMap = {
        prod_single_user: "single-user",
        prod_family_plan: "family-plan",
        prod_pro_license: "pro",
        prod_business_plan: "business-plan",
        single: "single-user",
        family: "family-plan",
        pro: "pro",
        business: "business-plan",
      };

      const packageType = packageTypeMap[licenseType] || "single-user";

      // Generate the package
      const packageInfo = await this.packageGenerator.generatePackage(
        packageType,
        this.downloadDir
      );

      // Create download record
      const downloadRecord = {
        orderId,
        customerEmail,
        packageType,
        fileName: packageInfo.fileName,
        filePath: packageInfo.filePath,
        size: packageInfo.size,
        createdAt: new Date().toISOString(),
        downloadCount: 0,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days
      };

      // Store download record (in production, use a database)
      this.storeDownloadRecord(downloadRecord);

      // Generate secure download URL
      const downloadToken = this.generateDownloadToken(downloadRecord);
      const downloadUrl = `/api/download/${downloadToken}`;

      console.log(
        `Download package created: ${packageInfo.fileName} (${(
          packageInfo.size /
          1024 /
          1024
        ).toFixed(2)} MB)`
      );

      return {
        downloadUrl,
        fileName: packageInfo.fileName,
        size: packageInfo.size,
        description: packageInfo.description,
        expiresAt: downloadRecord.expiresAt,
      };
    } catch (error) {
      console.error("Error generating download:", error);
      throw error;
    }
  }

  // Express middleware to handle download requests
  handleDownloadRequest() {
    return async (req, res) => {
      try {
        const { token } = req.params;

        if (!token) {
          return res.status(400).json({ error: "Download token required" });
        }

        // Verify and decode token
        const downloadRecord = this.verifyDownloadToken(token);
        if (!downloadRecord) {
          return res
            .status(404)
            .json({ error: "Invalid or expired download link" });
        }

        // Check if file exists
        if (!fs.existsSync(downloadRecord.filePath)) {
          console.log(
            `File not found, regenerating: ${downloadRecord.fileName}`
          );

          // Regenerate the package if it doesn't exist
          const packageInfo = await this.packageGenerator.generatePackage(
            downloadRecord.packageType,
            this.downloadDir
          );
          downloadRecord.filePath = packageInfo.filePath;
        }

        // Update download count
        downloadRecord.downloadCount++;
        this.updateDownloadRecord(downloadRecord);

        // Set headers for download
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${downloadRecord.fileName}"`
        );
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Length",
          fs.statSync(downloadRecord.filePath).size
        );

        // Stream the file
        const fileStream = fs.createReadStream(downloadRecord.filePath);
        fileStream.pipe(res);

        fileStream.on("error", (error) => {
          console.error("Error streaming file:", error);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error downloading file" });
          }
        });

        console.log(
          `Download served: ${downloadRecord.fileName} to ${downloadRecord.customerEmail}`
        );
      } catch (error) {
        console.error("Download request error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    };
  }

  // Generate secure download token
  generateDownloadToken(downloadRecord) {
    const data = JSON.stringify({
      orderId: downloadRecord.orderId,
      customerEmail: downloadRecord.customerEmail,
      packageType: downloadRecord.packageType,
      fileName: downloadRecord.fileName,
      filePath: downloadRecord.filePath,
      createdAt: downloadRecord.createdAt,
      expiresAt: downloadRecord.expiresAt,
    });

    return Buffer.from(data).toString("base64url");
  }

  // Verify download token
  verifyDownloadToken(token) {
    try {
      const data = Buffer.from(token, "base64url").toString("utf8");
      const downloadRecord = JSON.parse(data);

      // Check if expired
      if (new Date() > new Date(downloadRecord.expiresAt)) {
        return null;
      }

      return downloadRecord;
    } catch (error) {
      console.error("Error verifying download token:", error);
      return null;
    }
  }

  // Store download record (use database in production)
  storeDownloadRecord(record) {
    const recordsFile = path.join(this.downloadDir, "download-records.json");
    let records = [];

    if (fs.existsSync(recordsFile)) {
      try {
        records = JSON.parse(fs.readFileSync(recordsFile, "utf8"));
      } catch (error) {
        console.error("Error reading download records:", error);
      }
    }

    records.push(record);

    // Keep only last 1000 records
    if (records.length > 1000) {
      records = records.slice(-1000);
    }

    fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2));
  }

  // Update download record
  updateDownloadRecord(updatedRecord) {
    const recordsFile = path.join(this.downloadDir, "download-records.json");
    let records = [];

    if (fs.existsSync(recordsFile)) {
      try {
        records = JSON.parse(fs.readFileSync(recordsFile, "utf8"));
      } catch (error) {
        console.error("Error reading download records:", error);
        return;
      }
    }

    const index = records.findIndex((r) => r.orderId === updatedRecord.orderId);
    if (index !== -1) {
      records[index] = updatedRecord;
      fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2));
    }
  }

  // Clean up expired downloads
  cleanupExpiredDownloads() {
    const recordsFile = path.join(this.downloadDir, "download-records.json");

    if (!fs.existsSync(recordsFile)) return;

    try {
      const records = JSON.parse(fs.readFileSync(recordsFile, "utf8"));
      const now = new Date();

      // Remove expired records and their files
      const activeRecords = records.filter((record) => {
        const isExpired = now > new Date(record.expiresAt);
        if (isExpired) {
          // Delete the file if it exists
          if (fs.existsSync(record.filePath)) {
            fs.unlinkSync(record.filePath);
            console.log(`Cleaned up expired download: ${record.fileName}`);
          }
        }
        return !isExpired;
      });

      // Update records file
      fs.writeFileSync(recordsFile, JSON.stringify(activeRecords, null, 2));
    } catch (error) {
      console.error("Error cleaning up downloads:", error);
    }
  }

  // Get download statistics
  getDownloadStats() {
    const recordsFile = path.join(this.downloadDir, "download-records.json");

    if (!fs.existsSync(recordsFile)) {
      return { totalDownloads: 0, packageStats: {} };
    }

    try {
      const records = JSON.parse(fs.readFileSync(recordsFile, "utf8"));

      const stats = {
        totalDownloads: records.reduce((sum, r) => sum + r.downloadCount, 0),
        totalPackages: records.length,
        packageStats: {},
      };

      // Group by package type
      records.forEach((record) => {
        if (!stats.packageStats[record.packageType]) {
          stats.packageStats[record.packageType] = {
            count: 0,
            downloads: 0,
            totalSize: 0,
          };
        }

        stats.packageStats[record.packageType].count++;
        stats.packageStats[record.packageType].downloads +=
          record.downloadCount;
        stats.packageStats[record.packageType].totalSize += record.size || 0;
      });

      return stats;
    } catch (error) {
      console.error("Error getting download stats:", error);
      return { totalDownloads: 0, packageStats: {} };
    }
  }
}

export default DownloadHandler;
