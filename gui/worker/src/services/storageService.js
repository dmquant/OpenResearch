export class StorageService {
  constructor(reportsBucket, assetsBucket) {
    this.reportsBucket = reportsBucket;
    this.assetsBucket = assetsBucket;
  }

  /**
   * Store report content in R2
   */
  async storeReport(projectId, report) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${projectId}/${report.language}/${timestamp}-${report.report_type}.mdx`;
      
      await this.reportsBucket.put(fileName, report.content, {
        httpMetadata: {
          contentType: 'text/markdown',
        },
        customMetadata: {
          projectId: projectId,
          language: report.language,
          reportType: report.report_type,
          title: report.title,
          createdAt: timestamp
        }
      });

      return fileName;
    } catch (error) {
      console.error('Error storing report:', error);
      throw new Error(`Failed to store report: ${error.message}`);
    }
  }

  /**
   * Store project export (ZIP data) in R2
   */
  async storeExport(projectId, exportData) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `exports/${projectId}/${timestamp}-export.zip`;
      
      await this.assetsBucket.put(fileName, exportData.zipBuffer, {
        httpMetadata: {
          contentType: 'application/zip',
          contentDisposition: `attachment; filename="${projectId}-export.zip"`
        },
        customMetadata: {
          projectId: projectId,
          exportType: 'full',
          createdAt: timestamp
        }
      });

      // Generate signed URL for download (valid for 1 hour)
      const downloadUrl = await this.assetsBucket.generateSignedUrl(fileName, {
        expiresIn: 3600
      });

      return downloadUrl;
    } catch (error) {
      console.error('Error storing export:', error);
      throw new Error(`Failed to store export: ${error.message}`);
    }
  }

  /**
   * Store research plan content in R2
   */
  async storePlan(projectId, planDocument, fileName) {
    try {
      const filePath = `plans/${projectId}/${fileName}`;
      
      await this.assetsBucket.put(filePath, JSON.stringify(planDocument, null, 2), {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: {
          projectId: projectId,
          planId: planDocument.id,
          title: planDocument.title,
          contentType: 'research_plan',
          createdAt: planDocument.metadata?.createdAt || new Date().toISOString()
        }
      });

      return filePath;
    } catch (error) {
      console.error('Error storing plan:', error);
      throw new Error(`Failed to store plan: ${error.message}`);
    }
  }

  /**
   * Store individual card content as backup
   */
  async storeCard(projectId, card) {
    try {
      const fileName = `cards/${projectId}/${card.id}.md`;
      const cardContent = `# ${card.title}\n\n${card.content}\n\n## Metadata\n\n\`\`\`json\n${JSON.stringify(card.metadata, null, 2)}\n\`\`\``;
      
      await this.assetsBucket.put(fileName, cardContent, {
        httpMetadata: {
          contentType: 'text/markdown',
        },
        customMetadata: {
          projectId: projectId,
          cardId: card.id,
          cardType: card.card_type,
          taskId: card.task_id,
          createdAt: card.created_at
        }
      });

      return fileName;
    } catch (error) {
      console.error('Error storing card:', error);
      throw new Error(`Failed to store card: ${error.message}`);
    }
  }

  /**
   * Retrieve report from R2
   */
  async getReport(reportPath) {
    try {
      const object = await this.reportsBucket.get(reportPath);
      if (!object) {
        throw new Error('Report not found');
      }

      return {
        content: await object.text(),
        metadata: object.customMetadata,
        lastModified: object.uploaded
      };
    } catch (error) {
      console.error('Error retrieving report:', error);
      throw new Error(`Failed to retrieve report: ${error.message}`);
    }
  }

  /**
   * List all reports for a project
   */
  async listProjectReports(projectId) {
    try {
      const objects = await this.reportsBucket.list({ prefix: `${projectId}/` });
      
      return objects.objects.map(obj => ({
        path: obj.key,
        size: obj.size,
        lastModified: obj.uploaded,
        metadata: obj.customMetadata
      }));
    } catch (error) {
      console.error('Error listing reports:', error);
      throw new Error(`Failed to list reports: ${error.message}`);
    }
  }

  /**
   * Delete report from R2
   */
  async deleteReport(reportPath) {
    try {
      await this.reportsBucket.delete(reportPath);
      return { success: true };
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error(`Failed to delete report: ${error.message}`);
    }
  }

  /**
   * Store execution logs as a file
   */
  async storeExecutionLogs(projectId, logs) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `logs/${projectId}/${timestamp}-execution.json`;
      
      await this.assetsBucket.put(fileName, JSON.stringify(logs, null, 2), {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: {
          projectId: projectId,
          logType: 'execution',
          createdAt: timestamp
        }
      });

      return fileName;
    } catch (error) {
      console.error('Error storing logs:', error);
      throw new Error(`Failed to store logs: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for client-side upload
   */
  async generateUploadUrl(projectId, fileName, contentType = 'application/octet-stream') {
    try {
      const key = `uploads/${projectId}/${fileName}`;
      
      // Note: This is a placeholder - actual implementation would depend on
      // Cloudflare's R2 presigned URL generation capabilities
      return {
        uploadUrl: `https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/r2/buckets/${this.assetsBucket.name}/objects/${key}`,
        key: key
      };
    } catch (error) {
      console.error('Error generating upload URL:', error);
      throw new Error(`Failed to generate upload URL: ${error.message}`);
    }
  }

  /**
   * Clean up old files (maintenance function)
   */
  async cleanupOldFiles(olderThanDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Clean up old exports
      const exportObjects = await this.assetsBucket.list({ prefix: 'exports/' });
      const oldExports = exportObjects.objects.filter(obj => 
        new Date(obj.uploaded) < cutoffDate
      );

      for (const obj of oldExports) {
        await this.assetsBucket.delete(obj.key);
      }

      // Clean up old logs
      const logObjects = await this.assetsBucket.list({ prefix: 'logs/' });
      const oldLogs = logObjects.objects.filter(obj => 
        new Date(obj.uploaded) < cutoffDate
      );

      for (const obj of oldLogs) {
        await this.assetsBucket.delete(obj.key);
      }

      return {
        deletedExports: oldExports.length,
        deletedLogs: oldLogs.length,
        cutoffDate: cutoffDate.toISOString()
      };
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw new Error(`Failed to cleanup old files: ${error.message}`);
    }
  }
}