import { Injectable } from '@nestjs/common';
import { NormalizedReportItem, ReportType, ReportFormat, ReportStatus } from '../interfaces';

@Injectable()
export class ReportMapper {
  normalizeInbound(rawReport: any, providerKey: string, marketplaceKey: string): NormalizedReportItem {
    return {
      externalReportId: String(rawReport.id || rawReport.report_id || rawReport.reportId),
      externalRequestId: rawReport.request_id || rawReport.requestId
        ? String(rawReport.request_id || rawReport.requestId)
        : undefined,
      reportType: this.normalizeReportType(rawReport.type || rawReport.report_type || rawReport.reportType),
      reportFormat: this.normalizeReportFormat(rawReport.format || rawReport.file_format || rawReport.contentType),
      status: this.normalizeStatus(rawReport.status || rawReport.processing_status),
      requestedAt: rawReport.requested_at || rawReport.requestedAt || rawReport.createdAt
        ? new Date(rawReport.requested_at || rawReport.requestedAt || rawReport.createdAt)
        : undefined,
      generatedAt: rawReport.generated_at || rawReport.generatedAt || rawReport.completedAt
        ? new Date(rawReport.generated_at || rawReport.generatedAt || rawReport.completedAt)
        : undefined,
      availableUntil: rawReport.available_until || rawReport.availableUntil || rawReport.expiresAt
        ? new Date(rawReport.available_until || rawReport.availableUntil || rawReport.expiresAt)
        : undefined,
      downloadUrl: rawReport.download_url || rawReport.downloadUrl || rawReport.url || undefined,
      fileSize: rawReport.file_size || rawReport.fileSize || rawReport.size
        ? Number(rawReport.file_size || rawReport.fileSize || rawReport.size)
        : undefined,
      filePath: rawReport.file_path || rawReport.filePath || undefined,
      checksum: rawReport.checksum || rawReport.md5 || rawReport.hash || undefined,
      metadata: {
        startDate: rawReport.start_date || rawReport.startDate
          ? new Date(rawReport.start_date || rawReport.startDate)
          : undefined,
        endDate: rawReport.end_date || rawReport.endDate
          ? new Date(rawReport.end_date || rawReport.endDate)
          : undefined,
        recordCount: rawReport.record_count || rawReport.recordCount || rawReport.totalRecords
          ? Number(rawReport.record_count || rawReport.recordCount || rawReport.totalRecords)
          : undefined,
        compressed: Boolean(rawReport.compressed || rawReport.isCompressed),
        encoding: rawReport.encoding || rawReport.charset || 'UTF-8',
      },
      rawData: rawReport,
    };
  }

  private normalizeReportType(type: string): ReportType {
    if (!type) return ReportType.CUSTOM;
    const normalized = String(type).toUpperCase().replace(/[-_\s]/g, '');
    
    if (normalized.includes('SALES') || normalized.includes('SALE')) return ReportType.SALES;
    if (normalized.includes('ORDER')) return ReportType.ORDERS;
    if (normalized.includes('INVENTORY') || normalized.includes('STOCK')) return ReportType.INVENTORY;
    if (normalized.includes('LISTING') || normalized.includes('PRODUCT')) return ReportType.LISTINGS;
    if (normalized.includes('PRIC')) return ReportType.PRICING;
    if (normalized.includes('FEE') || normalized.includes('CHARGE')) return ReportType.FEES;
    if (normalized.includes('SETTLEMENT') || normalized.includes('PAYMENT')) return ReportType.SETTLEMENTS;
    if (normalized.includes('RETURN') || normalized.includes('REFUND')) return ReportType.RETURNS;
    if (normalized.includes('PERFORMANCE') || normalized.includes('METRIC')) return ReportType.PERFORMANCE;
    
    return ReportType.CUSTOM;
  }

  private normalizeReportFormat(format: string): ReportFormat {
    if (!format) return ReportFormat.CSV;
    const normalized = String(format).toUpperCase();
    
    if (normalized.includes('CSV')) return ReportFormat.CSV;
    if (normalized.includes('JSON')) return ReportFormat.JSON;
    if (normalized.includes('XML')) return ReportFormat.XML;
    if (normalized.includes('GZIP') || normalized.includes('GZ')) return ReportFormat.GZIP;
    if (normalized.includes('ZIP')) return ReportFormat.ZIP;
    if (normalized.includes('TSV') || normalized.includes('TAB')) return ReportFormat.TSV;
    
    return ReportFormat.CSV;
  }

  private normalizeStatus(status: string): ReportStatus {
    if (!status) return ReportStatus.REQUESTED;
    const normalized = String(status).toUpperCase().replace(/[-_\s]/g, '');
    
    if (normalized.includes('PENDING') || normalized.includes('QUEUED') || normalized.includes('SUBMITTED')) {
      return ReportStatus.REQUESTED;
    }
    if (normalized.includes('PROCESSING') || normalized.includes('GENERATING') || normalized.includes('INPROGRESS')) {
      return ReportStatus.PROCESSING;
    }
    if (normalized.includes('DONE') || normalized.includes('COMPLETE') || normalized.includes('READY')) {
      return ReportStatus.AVAILABLE;
    }
    if (normalized.includes('DOWNLOADED')) {
      return ReportStatus.DOWNLOADED;
    }
    if (normalized.includes('IMPORTED') || normalized.includes('PROCESSED')) {
      return ReportStatus.IMPORTED;
    }
    if (normalized.includes('FAILED') || normalized.includes('ERROR')) {
      return ReportStatus.FAILED;
    }
    if (normalized.includes('CANCEL')) {
      return ReportStatus.CANCELLED;
    }
    if (normalized.includes('EXPIRED')) {
      return ReportStatus.EXPIRED;
    }
    
    return ReportStatus.REQUESTED;
  }

  generateChecksum(report: NormalizedReportItem): string {
    const crypto = require('crypto');
    const data = JSON.stringify({
      externalReportId: report.externalReportId,
      reportType: report.reportType,
      generatedAt: report.generatedAt,
      fileSize: report.fileSize,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
