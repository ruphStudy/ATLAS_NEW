import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as zlib from 'zlib';
import * as csv from 'csv-parser';
import { ReportFormat, ReportType, ParsedReportData } from '../interfaces';

@Injectable()
export class ReportParser {
  private readonly logger = new Logger(ReportParser.name);

  async parse(params: {
    filePath: string;
    format: ReportFormat;
    reportType: ReportType;
  }): Promise<ParsedReportData> {
    const { filePath, format, reportType } = params;

    try {
      let actualFormat = format;
      let actualFilePath = filePath;

      // Handle compressed files
      if (format === ReportFormat.GZIP || format === ReportFormat.ZIP) {
        const decompressed = await this.decompress(filePath, format);
        actualFilePath = decompressed.filePath;
        actualFormat = decompressed.format;
      }

      // Parse based on format
      switch (actualFormat) {
        case ReportFormat.CSV:
        case ReportFormat.TSV:
          return await this.parseCsv(actualFilePath, reportType, actualFormat === ReportFormat.TSV ? '\t' : ',');
        case ReportFormat.JSON:
          return await this.parseJson(actualFilePath, reportType);
        case ReportFormat.XML:
          return await this.parseXml(actualFilePath, reportType);
        default:
          throw new Error(`Unsupported report format: ${format}`);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to parse report ${filePath}: ${err.message}`);
      return {
        reportId: filePath,
        reportType,
        recordCount: 0,
        records: [],
        errors: [{ error: err.message }],
        metadata: {},
      };
    }
  }

  private async parseCsv(filePath: string, reportType: ReportType, delimiter: string = ','): Promise<ParsedReportData> {
    const records: Array<Record<string, any>> = [];
    const errors: Array<{ row?: number; field?: string; error: string }> = [];
    let rowNumber = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ separator: delimiter }))
        .on('data', (row) => {
          rowNumber++;
          try {
            records.push(this.normalizeRow(row, reportType));
          } catch (error) {
            errors.push({ row: rowNumber, error: (error as Error).message });
          }
        })
        .on('end', () => {
          resolve({
            reportId: filePath,
            reportType,
            recordCount: records.length,
            records,
            errors,
            metadata: {},
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  private async parseJson(filePath: string, reportType: ReportType): Promise<ParsedReportData> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const errors: Array<{ row?: number; field?: string; error: string }> = [];

    let records: Array<Record<string, any>> = [];

    if (Array.isArray(data)) {
      records = data.map((item, index) => {
        try {
          return this.normalizeRow(item, reportType);
        } catch (error) {
          errors.push({ row: index, error: (error as Error).message });
          return null;
        }
      }).filter((r): r is Record<string, any> => r !== null);
    } else if (data.records || data.items || data.data) {
      const items = data.records || data.items || data.data;
      records = items.map((item: any, index: number) => {
        try {
          return this.normalizeRow(item, reportType);
        } catch (error) {
          errors.push({ row: index, error: (error as Error).message });
          return null;
        }
      }).filter((r: Record<string, any> | null): r is Record<string, any> => r !== null);
    } else {
      records = [this.normalizeRow(data, reportType)];
    }

    return {
      reportId: filePath,
      reportType,
      recordCount: records.length,
      records,
      errors,
      metadata: data.metadata || {},
    };
  }

  private async parseXml(filePath: string, reportType: ReportType): Promise<ParsedReportData> {
    // Simplified XML parsing - in production, use a proper XML parser like xml2js
    const content = fs.readFileSync(filePath, 'utf-8');
    
    return {
      reportId: filePath,
      reportType,
      recordCount: 0,
      records: [],
      errors: [{ error: 'XML parsing not fully implemented' }],
      metadata: { rawContent: content.substring(0, 1000) },
    };
  }

  private async decompress(filePath: string, format: ReportFormat): Promise<{ filePath: string; format: ReportFormat }> {
    const outputPath = filePath.replace(/\.(gz|gzip|zip)$/i, '');
    
    if (format === ReportFormat.GZIP) {
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(outputPath);
      
      await new Promise<void>((resolve, reject) => {
        input
          .pipe(zlib.createGunzip())
          .pipe(output)
          .on('finish', resolve)
          .on('error', reject);
      });
    }

    // Detect actual format from decompressed file
    const detectedFormat = this.detectFormat(outputPath);
    
    return { filePath: outputPath, format: detectedFormat };
  }

  private detectFormat(filePath: string): ReportFormat {
    if (filePath.endsWith('.csv')) return ReportFormat.CSV;
    if (filePath.endsWith('.json')) return ReportFormat.JSON;
    if (filePath.endsWith('.xml')) return ReportFormat.XML;
    if (filePath.endsWith('.tsv')) return ReportFormat.TSV;
    return ReportFormat.CSV;
  }

  private normalizeRow(row: any, reportType: ReportType): Record<string, any> {
    // Basic normalization - can be extended per report type
    const normalized: Record<string, any> = {};
    
    for (const key in row) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
      normalized[normalizedKey] = row[key];
    }
    
    return normalized;
  }
}
