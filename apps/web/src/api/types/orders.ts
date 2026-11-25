// ---------------------------------------------------------------------------
// Purchase Order Types
// ---------------------------------------------------------------------------

export interface PurchaseOrderSummary {
  id: number;
  po_number: string;
  supplier_name: string;
  warehouse_name: string;
  status: string;
  expected_date?: string;
  item_count?: number;
  total_amount: number;
  received_amount?: number;
  version: number;
  created_by_name?: string;
}

export interface PurchaseOrderDetailLine {
  id: number;
  product_id: number;
  sku: string;
  product_name: string;
  uom: string;
  qty_ordered: number;
  qty_received: number;
  unit_price: number;
}

export interface PurchaseOrderReceipt {
  id: number;
  gr_number: string;
  received_by_name: string;
  received_at: string;
}

export interface PurchaseOrderDetail {
  id: number;
  po_number: string;
  supplier_name: string;
  warehouse_name: string;
  warehouse_id?: number;
  status: string;
  version: number;
  lines: PurchaseOrderDetailLine[];
  receipts: PurchaseOrderReceipt[];
}

export interface CreatePOLineInput {
  productId: number;
  qtyOrdered: number;
  unitPrice: number;
}

export interface CreatePOInput {
  supplierId: number;
  warehouseId: number;
  expectedDate?: string;
  lines: CreatePOLineInput[];
}

export interface ProcessReceiptLineInput {
  poLineId: number;
  qtyReceived: number;
  qtyDamaged?: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface ProcessReceiptInput {
  lines: ProcessReceiptLineInput[];
}

// ---------------------------------------------------------------------------
// Sales Order Types
// ---------------------------------------------------------------------------

export interface SalesOrderLine {
  id?: number;
  productId?: number;
  product_id?: number;
  product_name?: string;
  sku?: string;
  qty_ordered?: number;
  qtyOrdered?: number;
  unit_price?: number;
  unitPrice?: number;
}

export interface SalesOrder {
  id: number;
  so_number: string;
  customer_name: string;
  warehouse_name: string;
  status: string;
  item_count?: number;
  total_amount: number;
  created_by_name?: string;
  lines?: SalesOrderLine[];
}

export interface CreateSOLineInput {
  productId: number;
  qtyOrdered: number;
  unitPrice: number;
}

export interface CreateSOInput {
  customerName: string;
  warehouseId: number;
  lines: CreateSOLineInput[];
}

// ---------------------------------------------------------------------------
// Transfer Types
// ---------------------------------------------------------------------------

export interface StockTransferLine {
  id?: number;
  lineId?: number;
  productId?: number;
  product_id?: number;
  product_name?: string;
  qty_dispatched?: number;
  qtyDispatched?: number;
  qty_received?: number;
  qtyReceived?: number;
}

export interface StockTransfer {
  id: number;
  transfer_number: string;
  source_warehouse_name: string;
  target_warehouse_name: string;
  status: string;
  total_dispatched: number;
  total_received: number;
  created_by_name?: string;
  lines?: StockTransferLine[];
}

export interface CreateTransferLineInput {
  productId: number;
  qtyDispatched: number;
}

export interface CreateTransferInput {
  sourceWarehouseId: number;
  targetWarehouseId: number;
  notes?: string;
  lines: CreateTransferLineInput[];
}

export interface ReceiveTransferLineInput {
  lineId: number;
  qtyReceived: number;
  qtyDamaged?: number;
}

export interface ReceiveTransferInput {
  lines: ReceiveTransferLineInput[];
}

// ---------------------------------------------------------------------------
// Damage Report Types
// ---------------------------------------------------------------------------

export interface DamageReportLine {
  id?: number;
  productId?: number;
  product_id?: number;
  product_name?: string;
  qty?: number;
  reason?: string;
  disposition?: string;
}

export interface DamageReport {
  id: number;
  report_number: string;
  warehouse_name: string;
  status: string;
  total_qty?: number;
  created_by_name?: string;
  approved_by_name?: string | null;
  created_at: string;
  lines?: DamageReportLine[];
}

export interface CreateDamageReportLineInput {
  productId: number;
  qty: number;
  reason: string;
  disposition: string;
}

export interface CreateDamageReportInput {
  warehouseId: number;
  notes?: string;
  lines: CreateDamageReportLineInput[];
}

// ---------------------------------------------------------------------------
// Stock Count (Cycle Count) Types
// ---------------------------------------------------------------------------

export interface StockCountLine {
  id?: number;
  productId?: number;
  product_id?: number;
  product_name?: string;
  countedQty?: number;
  counted_qty?: number;
}

export interface StockCount {
  id: number;
  count_number: string;
  warehouse_name: string;
  status: string;
  total_variance?: number;
  created_by_name?: string;
  approved_by_name?: string | null;
  created_at: string;
  lines?: StockCountLine[];
}

export interface CreateStockCountLineInput {
  productId: number;
  countedQty: number;
}

export interface CreateStockCountInput {
  warehouseId: number;
  notes?: string;
  lines: CreateStockCountLineInput[];
}
