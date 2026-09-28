/**
 * 数据导出工具
 */
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'

/**
 * 导出数据为 CSV
 */
export function exportToCsv(data, filename, columns) {
  if (!data || data.length === 0) {
    alert('没有数据可导出')
    return
  }

  // 构建 CSV 内容
  const headers = columns.map(col => col.label).join(',')
  const rows = data.map(item =>
    columns.map(col => {
      let value = item[col.key]
      // 处理特殊字符
      if (typeof value === 'string') {
        value = value.replace(/"/g, '""')
        if (value.includes(',') || value.includes('\n')) {
          value = `"${value}"`
        }
      }
      return value ?? ''
    }).join(',')
  )

  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([`\ufeff${  csv}`], { type: 'text/csv;charset=utf-8' })
  saveAs(blob, `${filename}.csv`)
}

/**
 * 导出数据为 Excel
 */
export function exportToExcel(data, filename, columns, sheetName = 'Sheet1') {
  if (!data || data.length === 0) {
    alert('没有数据可导出')
    return
  }

  // 转换数据
  const exportData = data.map(item => {
    const row = {}
    columns.forEach(col => {
      let value = item[col.key]
      // 格式化日期
      if (col.format === 'date' && value) {
        value = new Date(value).toLocaleString('zh-CN')
      }
      // 格式化状态
      if (col.format === 'status' && col.statusMap) {
        value = col.statusMap[value] || value
      }
      row[col.label] = value ?? ''
    })
    return row
  })

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)
  
  // 设置列宽
  ws['!cols'] = columns.map(() => ({ wch: 15 }))
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * 通用导出函数
 */
export function exportData(data, filename, options = {}) {
  const { format = 'csv', columns, sheetName } = options
  
  if (format === 'excel' || format === 'xlsx') {
    exportToExcel(data, filename, columns, sheetName)
  } else {
    exportToCsv(data, filename, columns)
  }
}
