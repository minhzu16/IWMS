export interface SalesOrderItem {
  id: number;
  so_number: string;
  customer_name: string;
  warehouse_name: string;
  status: 'DRAFT' | 'CONFIRMED' | 'SHIPPED' | 'CANCELLED' | string;
  item_count?: number;
  total_amount?: number | string;
  created_by_name: string;
}

export interface TransferLine {
  id?: number;
  lineId?: number;
  productId?: number;
  qty_dispatched?: number;
  qtyDispatched?: number;
  qtyReceived?: number;
  qtyDamaged?: number;
}

export interface TransferItem {
  id: number;
  transfer_number: string;
  source_warehouse_name: string;
  target_warehouse_name: string;
  status: 'DRAFT' | 'DISPATCHED' | 'RECEIVED' | string;
  total_dispatched: number;
  total_received: number;
  created_by_name: string;
  lines?: TransferLine[];
}

export interface SOLineItem {
  productId: number;
  qtyOrdered: number;
  unitPrice: number;
}

export interface TransferCreateLine {
  productId: number;
  qtyDispatched: number;
}
