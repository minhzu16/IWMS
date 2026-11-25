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

export interface SupplierOption {
  id: number;
  name: string;
  code: string;
}

export interface ProductOption {
  id: number;
  name: string;
  sku: string;
}

export interface CreatePOLineDraft {
  productId: number;
  qtyOrdered: number;
  unitPrice: number;
}

export interface ReceiptLineDraft {
  poLineId: number;
  productName: string;
  qtyOrdered: number;
  qtyAlreadyReceived: number;
  qtyReceived: number;
  qtyDamaged: number;
}
