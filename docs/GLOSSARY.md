# IWMS Domain Glossary

Canonical terminology for the **Inventory & Warehouse Management System (`pj2`)**, grounded in `@iwms/shared`, `@iwms/db`, `apps/api`, and `apps/web`.

## 1. Inventory & Ledger Concepts

| Term | Definition |
| :--- | :--- |
| **Stock Movement (`stock_movements`)** | Append-only, immutable ledger record representing every inventory change (`PURCHASE_RECEIPT`, `SALE_RESERVE`, `SALE_RELEASE`, `SALE_SHIPMENT`, `TRANSFER_OUT`, `TRANSFER_IN`, `DAMAGE`, `DAMAGE_WRITE_OFF`, `RETURN_TO_SUPPLIER`, `CUSTOMER_RETURN`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `REVERSAL`, `OPENING`). Protected against `UPDATE`/`DELETE` at the database level. |
| **Stock Level (`stock_levels`)** | Live balance cache per `(product_id, warehouse_id)`, updated atomically inside the same database transaction as the corresponding `stock_movements` insert. |
| **`on_hand`** | Total physical sellable/usable quantity currently in the warehouse (`on_hand >= 0`). Must always equal `SUM(qty_on_hand_delta)` in `stock_movements`. |
| **`reserved`** | Quantity allocated to confirmed Sales Orders awaiting shipment (`0 <= reserved <= on_hand`). |
| **`available`** | Computed sellable quantity: `on_hand - reserved`. All reservation checks validate against `available`, never raw `on_hand`. |
| **`damaged`** | Quarantined quantity (`damaged >= 0`) segregated from `on_hand` so defective units cannot be sold. |
| **`avg_cost`** | Weighted moving-average unit cost stored in `stock_levels` (`precision: 14, scale: 4`) and used for stock valuation. |
| **Deterministic Lock Ordering** | Concurrency rule requiring multi-line inventory transactions to lock `(product_id, warehouse_id)` rows in ascending order (`ORDER BY product_id ASC, warehouse_id ASC`) to prevent deadlocks. |
| **Ledger Reconciliation** | Verification comparing `stock_levels.on_hand` against `SUM(stock_movements.qty_on_hand_delta)` to confirm zero discrepancy. |

## 2. Documents & State Machines

| Term | Definition |
| :--- | :--- |
| **Purchase Order (PO)** | Inbound procurement document (`purchase_orders`) from a `Supplier` to a `Warehouse`. Lifecycle: `DRAFT` → `SUBMITTED` → `APPROVED` → `PARTIALLY_RECEIVED` → `RECEIVED` (or `CLOSED` / `CANCELLED`). |
| **Goods Receipt (GR)** | Receiving document (`goods_receipts`) linked to an `APPROVED` or `PARTIALLY_RECEIVED` PO, recording `qty_received` and `qty_damaged` and appending `PURCHASE_RECEIPT` / `DAMAGE` movements. |
| **Sales Order (SO)** | Outbound customer order (`sales_orders`). Lifecycle: `DRAFT` → `CONFIRMED` (reserves stock) → `PARTIALLY_SHIPPED` → `SHIPPED` (or `CANCELLED`, releasing reserved stock). |
| **Transfer** | Inter-warehouse stock movement (`transfers`) from `source_warehouse_id` to `target_warehouse_id`. Lifecycle: `DRAFT` → `DISPATCHED` (`TRANSFER_OUT`) → `RECEIVED` (`TRANSFER_IN`) or `CANCELLED`. |
| **Damage Report** | Quarantine record (`damage_reports`) moving units from `on_hand` to `damaged`. Lifecycle: `REPORTED` → `APPROVED` / `REJECTED` → `RESOLVED`. |
| **Disposition** | Resolution action on a `damage_lines` item: `WRITE_OFF` (permanently write off damaged stock) or `RETURN_TO_SUPPLIER`. |
| **Stock Count (Cycle Count)** | Periodic physical inventory count (`stock_counts`). Lifecycle: `DRAFT` → `COUNTING` → `SUBMITTED` → `APPROVED` / `REJECTED`. Approval posts `ADJUSTMENT_IN` or `ADJUSTMENT_OUT` for `variance = counted_qty - system_qty`. |

## 3. Replenishment, Analytics & Platform

| Term | Definition |
| :--- | :--- |
| **Reorder Point (`reorder_point`)** | Minimum `available` threshold in `product_warehouse_settings` that triggers a low-stock alert and suggested PO quantity (`max(reorder_qty, max_stock - available)`). |
| **Pareto ABC Analysis** | Classification of SKUs by shipped value: Group **A** (~80% cumulative value), Group **B** (~15%), Group **C** (~5%). |
| **Idempotency Key (`idempotency_keys`)** | Client-supplied `Idempotency-Key` header persisted with a request hash and cached response to prevent duplicate ledger writes on network retries. |
| **RBAC & Warehouse Scope** | Role-Based Access Control (`ADMIN`, `MANAGER`, `PURCHASING`, `WAREHOUSE`, `SALES`, `VIEWER`) combined with per-user warehouse assignments in `user_warehouses`. |
| **Optimistic Locking (`version`)** | Integer version column on mutable entities (`products`, `stock_levels`, `purchase_orders`, `sales_orders`, `transfers`) to detect concurrent updates (`VERSION_CONFLICT`). |
