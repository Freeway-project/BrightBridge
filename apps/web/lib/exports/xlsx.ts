import "server-only"

import ExcelJS from "exceljs"

/** Add a worksheet with a bold, frozen header row. Shared by all xlsx export routes. */
export function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  columns: Array<{ header: string; key: string; width?: number }>,
) {
  const ws = wb.addWorksheet(name)
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 24 }))
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: "frozen", ySplit: 1 }]
  return ws
}
