/**
 * CSV 导出工具函数
 * 使用原生浏览器 API，零第三方依赖
 */

interface ColumnDef {
  /** 列标签（表头） */
  label: string;
  /** 从行数据中提取值的函数或字段名 */
  value: string | ((row: any) => string | number);
}

/**
 * 将表格数据导出为 CSV 文件并触发下载
 * @param data 行数据数组
 * @param columns 列定义
 * @param filename 文件名（不含扩展名）
 * @param maxRows 最大导出行数（默认 1000）
 */
export function exportToCSV(
  data: any[],
  columns: ColumnDef[],
  filename: string,
  maxRows = 1000,
): void {
  const rows = data.slice(0, maxRows);

  // 构建表头行
  const headerRow = columns.map((col) => escapeCSVCell(col.label)).join(',');

  // 构建数据行
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const raw =
          typeof col.value === 'function' ? col.value(row) : row[col.value];
        const str = raw == null ? '' : String(raw);
        return escapeCSVCell(str);
      })
      .join(','),
  );

  // 组合 CSV 内容（加 BOM 支持 Excel 中文）
  const bom = '\uFEFF';
  const csv = bom + [headerRow, ...dataRows].join('\n');

  // 创建 Blob 并触发下载
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 处理 CSV 单元格中的特殊字符（逗号、引号、换行）
 */
function escapeCSVCell(value: string): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 格式化日期时间为短格式
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr;
  }
}

/**
 * 格式化日期时间为完整格式
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
  } catch {
    return dateStr;
  }
}
