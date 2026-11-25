import type {
  StockValuationItem,
  LowStockAlert,
  ABCAnalysisItem,
} from '../../api/client.js';

export const FALLBACK_VALUATION: StockValuationItem[] = [
  { warehouse_name: 'Kho Tổng Miền Bắc', total_valuation: 84520, sku_count: 12, total_on_hand: 520 },
  { warehouse_name: 'Kho Phân Phối Miền Nam', total_valuation: 49300, sku_count: 12, total_on_hand: 340 },
  { warehouse_name: 'Kho Trung Chuyển Miền Trung', total_valuation: 0, sku_count: 0, total_on_hand: 0 },
];

export const FALLBACK_LOW_STOCK: LowStockAlert[] = [
  {
    product_id: 1,
    sku: 'CPU-INT-14700K',
    product_name: 'Intel Core i7-14700K 20-Core',
    warehouse_name: 'Kho Tổng Miền Bắc',
    available: 12,
    reorder_point: 15,
    suggested_po_qty: 35,
    preferred_supplier_name: 'Samsung Electronics VN',
  },
  {
    product_id: 3,
    sku: 'RAM-COR-DDR5-32G',
    product_name: 'Corsair Vengeance DDR5 32GB',
    warehouse_name: 'Kho Phân Phối Miền Nam',
    available: 8,
    reorder_point: 10,
    suggested_po_qty: 25,
    preferred_supplier_name: 'Foxconn Technology',
  },
];

export const FALLBACK_MOVEMENTS = {
  data: [
    {
      id: 104,
      product_name: 'Samsung 990 PRO 2TB',
      movement_type: 'PURCHASE_RECEIPT',
      qty_on_hand_delta: 40,
      balance_after: 80,
      source_doc_type: 'GOODS_RECEIPT',
      created_by_name: 'Phạm Thủ Kho',
      created_at: new Date().toISOString(),
    },
    {
      id: 103,
      product_name: 'Intel Core i7-14700K',
      movement_type: 'SALE_SHIPMENT',
      qty_on_hand_delta: -5,
      balance_after: 45,
      source_doc_type: 'SALES_ORDER',
      created_by_name: 'Phạm Thủ Kho',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 102,
      product_name: 'Logitech G PRO X 2',
      movement_type: 'TRANSFER_IN',
      qty_on_hand_delta: 15,
      balance_after: 35,
      source_doc_type: 'TRANSFER',
      created_by_name: 'Phạm Thủ Kho',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 101,
      product_name: 'Cisco Catalyst WiFi 6',
      movement_type: 'DAMAGE',
      qty_on_hand_delta: -2,
      balance_after: 28,
      source_doc_type: 'DAMAGE_REPORT',
      created_by_name: 'Phạm Thủ Kho',
      created_at: new Date(Date.now() - 14400000).toISOString(),
    },
  ],
};

export const FALLBACK_ABC: ABCAnalysisItem[] = [
  { sku: 'GPU-RTX-4080S', product_name: 'ASUS TUF RTX 4080S', total_shipped_value: 39600, abc_class: 'A' },
  { sku: 'CPU-INT-14700K', product_name: 'Intel Core i7-14700K', total_shipped_value: 19000, abc_class: 'A' },
  { sku: 'SSD-SAM-990P-2TB', product_name: 'Samsung 990 PRO 2TB', total_shipped_value: 14000, abc_class: 'B' },
  { sku: 'SW-CIS-24P-POE', product_name: 'Cisco 24P PoE Switch', total_shipped_value: 9000, abc_class: 'B' },
  { sku: 'BOX-CARTON-M', product_name: 'Thùng carton 40x30', total_shipped_value: 800, abc_class: 'C' },
];
