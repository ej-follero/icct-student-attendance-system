// Simple ExportService for report generation
export interface ExportOptions {
  filename: string;
  format: 'csv' | 'pdf' | 'excel';
  data: any[];
  columns: Array<{
    key: string;
    label: string;
    type?: 'text' | 'number' | 'date' | 'percentage' | 'status';
    format?: (value: any) => string;
  }>;
  title: string;
  description?: string;
  // Optional chart images (base64 data URLs) to embed in PDFs
  chartImages?: Record<string, string>;
  // Selected columns for filtering export data
  selectedColumns?: string[];
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  filePath?: string;
  fileSize?: number;
  data?: string | Uint8Array; // For client-side downloads
  error?: string;
}

// Note: This module performs filesystem operations and should be imported only from server code (API routes or server components)

export class ExportService {
  static async export(options: ExportOptions): Promise<ExportResult> {
    try {
      const { filename, format, data, columns, title, description } = options;
      
      // Validate input data
      if (!data || data.length === 0) {
        return { success: false, error: 'No data provided for export' };
      }
      
      if (!columns || columns.length === 0) {
        return { success: false, error: 'No columns defined for export' };
      }
      
      // Ensure reports directory exists and write a simple CSV for demo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const relPath = `reports/${filename}_${timestamp}.${format}`; // relative to /public

      // CSV
      if (format === 'csv') {
        const headers = columns.map(c => c.label);
        
        // Process data in chunks to avoid memory issues with large datasets
        const chunkSize = 1000;
        const chunks: string[] = [];
        
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          const chunkRows = chunk.map(row => columns.map(c => {
            const raw = row[c.key];
            const val = c.format ? c.format(raw) : raw;
            return `"${String(val ?? '').replace(/"/g, '""')}"`;
          }).join(','));
          chunks.push(chunkRows.join('\n'));
        }
        
        const csv = [headers.join(','), ...chunks].join('\n');

        // For client-side, return the CSV data for download
        const fileSize = new Blob([csv]).size;

        return {
          success: true,
          filename: `${filename}.${format}`,
          data: csv,
          fileSize
        };
      }

      // PDF
      if (format === 'pdf') {
        try {
          // For client-side, prepare PDF data for download
          const { jsPDF } = await import('jspdf');
          const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF({ orientation: 'landscape' });
        // Academic header (institution — report, subtitle/period)
        const meta: any = options as any;
        const left = 14;
        const topTitle = 16;
        const institution = meta.institution ? String(meta.institution) + ' — ' : '';
        let nextY = topTitle;
        if (meta.showTitle !== false && options.title) {
          const mainTitle = `${institution}${options.title}`;
          doc.setFontSize(14);
          doc.setFont(undefined as any, 'normal');
          doc.text(mainTitle, left, topTitle);
          nextY = topTitle + 8;
        }
        const subtitleParts: string[] = [];
        if (meta.period) subtitleParts.push(String(meta.period));
        if (meta.dateRange) subtitleParts.push(String(meta.dateRange));
        if (meta.subtitle) subtitleParts.push(String(meta.subtitle));
        if (options.description && !meta.subtitle) subtitleParts.push(String(options.description));
        if (subtitleParts.length && meta.showSubtitle !== false) {
          doc.setFontSize(10);
          try { doc.setFont(undefined as any, 'italic'); } catch {}
          doc.text(subtitleParts.join('  •  '), left, nextY, { maxWidth: 270 });
          try { doc.setFont(undefined as any, 'normal'); } catch {}
          nextY += 10;
        }

        // Chart images are now handled by the backend PDF generation
        let currentY = Math.max(nextY, 22);

        const head = [columns.map(c => c.label)];
        const body = data.map(row => columns.map(c => {
          const raw = row[c.key];
          const val = c.format ? c.format(raw) : raw;
          return String(val ?? '');
        }));

        autoTable(doc, {
          head,
          body,
          startY: Math.max(currentY, 20),
          tableWidth: 'auto',
          styles: { 
            fontSize: 8, 
            cellPadding: 2, 
            overflow: 'linebreak', 
            cellWidth: 'wrap',
            halign: 'left',
            valign: 'middle'
          },
          headStyles: { 
            fillColor: [41, 128, 185], 
            textColor: 255, 
            fontStyle: 'bold', 
            fontSize: 8,
            cellPadding: 4,
            minCellHeight: 12,
            halign: 'center'
          },
          columnStyles: { 
            0: { cellWidth: 35, fontSize: 8, halign: 'center' }, // Student Name
            1: { cellWidth: 20, fontSize: 8, halign: 'center' }, // Student ID
            2: { cellWidth: 35, fontSize: 8, halign: 'center' }, // Department
            3: { cellWidth: 35, fontSize: 8, halign: 'left' }, // Course
            4: { cellWidth: 18, fontSize: 8, halign: 'center' }, // Year Level
            5: { cellWidth: 20, fontSize: 8, halign: 'center' }, // Status
            6: { cellWidth: 10, fontSize: 8, halign: 'center' }, // Attendance Rate
            7: { cellWidth: 10, fontSize: 8, halign: 'center' }, // Total Classes
            8: { cellWidth: 25, fontSize: 8, halign: 'center' }, // Present
            9: { cellWidth: 20, fontSize: 8, halign: 'center' }, // Late
            10: { cellWidth: 20, fontSize: 8, halign: 'center' } // Absent
          },
          margin: { left: 14, right: 14, bottom: 30 },
          didDrawPage: (data) => {
            // Footer with timestamp and page number
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(6);
            const stamp = `Generated on ${new Date().toLocaleString()}  •  Page ${data.pageNumber}`;
            doc.text(stamp, pageWidth - 14, pageHeight - 18, { align: 'right' });
          }
        });

        const pdfData = doc.output('datauristring');
        
          return {
            success: true,
            filename: `${filename}.pdf`,
            data: pdfData,
            fileSize: new Blob([pdfData]).size
          };
        } catch (error) {
          console.error('PDF generation error:', error);
          return { success: false, error: 'Failed to generate PDF' };
        }
      }

      // Excel (XLSX)
      if (format === 'excel') {
        try {
          const XLSX = await import('xlsx');
          // For client-side, prepare Excel data for download

        // Convert data to sheet with selected columns
        const rows = data.map(row => {
          const obj: Record<string, any> = {};
          columns.forEach(c => {
            const raw = row[c.key];
            obj[c.label] = c.format ? c.format(raw) : raw;
          });
          return obj;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Report');

        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const excelData = new Uint8Array(wbout);

          return {
            success: true,
            filename: `${filename}.xlsx`,
            data: excelData,
            fileSize: excelData.length
          };
        } catch (error) {
          console.error('Excel generation error:', error);
          return { success: false, error: 'Failed to generate Excel file' };
        }
      }

      // Fallback
      return { success: false, error: `Unsupported format: ${format}` };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }
  
  // Client-safe wrapper used by analytics pages to generate and download reports
  static async exportAnalytics(
    exportData: { type: string; data: any[]; analytics?: any; tableView?: any[]; filtersSnapshot?: Record<string, any>; filters?: Record<string, any>; timeRange?: any },
    options: { format: 'csv' | 'pdf' | 'excel'; filename: string; includeCharts?: boolean; includeFilters?: boolean; includeSummary?: boolean; includeTable?: boolean; selectedColumns?: string[]; chartElements?: Record<string, any>; chartImages?: Record<string, string> }
  ): Promise<void> {
    // Derive columns from the first row of data or use selected columns
    const sample = exportData?.data?.[0] ?? {};
    const keys: string[] = Object.keys(sample);
    
    // Use selected columns if provided, otherwise derive from data
    let finalKeys: string[];
    if (options.selectedColumns && options.selectedColumns.length > 0) {
      finalKeys = options.selectedColumns.filter(col => keys.includes(col));
    } else {
      // Preferred column order for simplified student exports
      const preferredOrder = exportData?.type === 'student'
        ? ['Student Name', 'Student ID', 'Department', 'Course', 'Year Level', 'Status', 'Attendance Rate', 'Total Classes', 'Present', 'Late', 'Absent']
        : [];
      finalKeys = [
        ...preferredOrder.filter(k => keys.includes(k)),
        ...keys.filter(k => !preferredOrder.includes(k))
      ];
    }
    
    const columns = finalKeys.map(key => ({
      key,
      label: key, // Keep original labels since they're already human-friendly
      type: key.includes('Rate') || key.includes('Classes') ? 'number' : 'text'
    }));

    // If Excel is requested, generate client-side to avoid server encoding issues
    if (options.format === 'excel') {
      const XLSX = await import('xlsx');
      // Build rows with human-friendly headers using the computed columns
      const rows = (exportData?.data ?? []).map((row: any) => {
        const obj: Record<string, any> = {};
        columns.forEach(c => {
          obj[c.label] = row[c.key];
        });
        return obj;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      // Compact column widths (min 8, max 24) based on header length
      const headerLabels = columns.map(c => c.label);
      const colWidths = headerLabels.map(lbl => ({ wch: Math.max(8, Math.min(24, Math.ceil((lbl || '').length * 0.9))) }));
      (ws as any)['!cols'] = colWidths;
      // Compact header row height
      (ws as any)['!rows'] = [{ hpt: 18 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      const wbout: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = options.filename.toLowerCase().endsWith('.xlsx') ? options.filename : `${options.filename}.xlsx`;
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // If CSV is requested, generate client-side for reliability
    if (options.format === 'csv') {
      const headerLabels = columns.map(c => c.label);
      const rows = (exportData?.data ?? []).map((row: any) =>
        columns.map(c => {
          const v = row[c.key];
          const s = v == null ? '' : String(v);
          return '"' + s.replace(/"/g, '""') + '"';
        }).join(',')
      );
      const csv = [headerLabels.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = options.filename.toLowerCase().endsWith('.csv') ? options.filename : `${options.filename}.csv`;
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // Send enhanced analytics payload to the backend generator
    const payload = {
      reportType: `${exportData?.type || 'analytics'}_report`,
      reportName: options.filename,
      data: exportData?.data ?? [],
      analytics: exportData?.analytics ?? undefined,
      // Ensure tableView is populated when table export is requested
      tableView: (options.includeTable ? (exportData?.tableView ?? exportData?.data ?? []) : undefined),
      filtersSnapshot: exportData?.filtersSnapshot ?? exportData?.filters ?? undefined,
      timeRange: exportData?.timeRange ?? undefined,
      columns,
      format: options.format,
      chartImages: options.chartImages,
      includeFlags: {
        includeFilters: !!options.includeFilters,
        includeSummary: !!options.includeSummary,
        includeTable: !!options.includeTable,
        includeCharts: !!options.includeCharts
      }
    };

    console.log('Sending export request to API:', {
      reportType: payload.reportType,
      format: payload.format,
      dataLength: payload.data?.length || 0
    });

    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({} as any));
      console.error('Export API error:', err);
      throw new Error(err?.error || `Export failed (HTTP ${res.status})`);
    }

    const result = await res.json();
    console.log('Export API response:', result);
    
    const downloadUrl: string | undefined = result?.data?.downloadUrl || (result?.data?.filePath ? `/` + result.data.filePath : undefined);

    if (downloadUrl && typeof window !== 'undefined') {
      console.log('Triggering download:', downloadUrl);
      // Trigger browser download
      const a = document.createElement('a');
      a.href = downloadUrl;
      // Ensure correct file extension on download attribute (excel/csv handled earlier)
      const ext = 'pdf';
      const filenameWithExt = options.filename.toLowerCase().endsWith(`.${ext}`)
        ? options.filename
        : `${options.filename}.${ext}`;
      a.download = filenameWithExt;
      a.rel = 'noopener';
      // (No need to set Excel MIME type here; excel path returns earlier)
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      console.error('No download URL provided:', { downloadUrl, result });
      throw new Error('No download URL provided by server');
    }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Client-side CSV export for simple data
  static async exportToCSV(
    exportData: { type: string; data: any[]; filters?: any; studentInfo?: any },
    options: { filename: string; includeHeaders?: boolean }
  ): Promise<void> {
    if (!exportData.data || exportData.data.length === 0) {
      throw new Error('No data to export');
    }

    // Get column headers from the first data item
    const sample = exportData.data[0];
    const headers = Object.keys(sample);
    
    // Create CSV content
    const csvRows: string[] = [];
    
    // Add headers if requested
    if (options.includeHeaders !== false) {
      csvRows.push(headers.map(header => 
        `"${header.replace(/"/g, '""')}"`
      ).join(','));
    }
    
    // Add data rows
    exportData.data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        const stringValue = value !== null && value !== undefined ? String(value) : '';
        return `"${stringValue.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', options.filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}