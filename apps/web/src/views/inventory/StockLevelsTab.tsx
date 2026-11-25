import React from 'react';
import { Search, Sliders } from 'lucide-react';
import type { StockLevel } from '../../api/client.js';

export interface StockLevelsTabProps {
  levels: StockLevel[];
  search: string;
  filterLowStock: boolean;
  onSearchChange: (val: string) => void;
  onFilterLowStockChange: (checked: boolean) => void;
  onOpenAdjustment: (prod: StockLevel) => void;
}

export const StockLevelsTab: React.FC<StockLevelsTabProps> = ({
  levels,
  search,
  filterLowStock,
  onSearchChange,
  onFilterLowStockChange,
  onOpenAdjustment,
}) => {
  const filteredLevels = levels.filter(
    (l) =>
      l.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.sku?.toLowerCase().includes(search.toLowerCase()) ||
      l.barcode?.includes(search),
  );

  return (
    <div>
      {/* Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="inv-search-input"
              aria-label="Tìm theo tên, SKU hoặc mã vạch"
              type="text"
              className="input"
              style={{ paddingLeft: 34 }}
              placeholder="Tìm theo tên, SKU hoặc mã vạch..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <label
            htmlFor="inv-filter-low-stock"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}
          >
            <input
              id="inv-filter-low-stock"
              type="checkbox"
              checked={filterLowStock}
              onChange={(e) => onFilterLowStockChange(e.target.checked)}
            />
            <span style={{ color: filterLowStock ? 'var(--safety-amber)' : 'var(--text-secondary)', fontWeight: 600 }}>
              Chỉ hiện hàng dưới điểm đặt hàng
            </span>
          </label>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Hiển thị <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{filteredLevels.length}</strong> SKU
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Sản phẩm / SKU</th>
              <th>Kho hàng</th>
              <th style={{ textAlign: 'right' }}>Thực có (On Hand)</th>
              <th style={{ textAlign: 'right' }}>Đã giữ chỗ</th>
              <th style={{ textAlign: 'right' }}>Khả dụng bán</th>
              <th style={{ textAlign: 'right' }}>Hàng lỗi</th>
              <th style={{ textAlign: 'right' }}>Giá vốn bình quân</th>
              <th style={{ textAlign: 'right' }}>Tổng giá trị</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredLevels.map((item, idx) => {
              const isLow = Number(item.available) <= Number(item.reorder_point || 0);
              const totalVal = Number(item.on_hand) * Number(item.avg_cost || 0);
              return (
                <tr key={idx} style={{ background: isLow ? 'var(--safety-amber-subtle)' : undefined }}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{item.product_name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 1 }}>
                      <span className="font-mono" style={{ fontSize: 11, color: 'var(--telemetry-cyan)' }}>{item.sku}</span>
                      {item.barcode && (
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          [{item.barcode}]
                        </span>
                      )}
                      {isLow && (
                        <span className="badge badge-amber font-mono" style={{ fontSize: 10, padding: '1px 5px' }}>
                          Dưới ngưỡng ({item.reorder_point})
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-slate">{item.warehouse_name || item.warehouse_code}</span>
                  </td>
                  <td className="font-mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--telemetry-cyan)', textAlign: 'right' }}>
                    {item.on_hand} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{item.uom}</span>
                  </td>
                  <td className="font-mono" style={{ fontWeight: 600, color: 'var(--safety-amber)', textAlign: 'right' }}>
                    {item.reserved}
                  </td>
                  <td className="font-mono" style={{ fontWeight: 700, fontSize: 14, color: isLow ? 'var(--safety-amber)' : 'var(--invariant-emerald)', textAlign: 'right' }}>
                    {item.available}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'right' }}>
                    {Number(item.damaged) > 0 ? (
                      <span className="badge badge-rose font-mono">{item.damaged} lỗi</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>0</span>
                    )}
                  </td>
                  <td className="font-mono" style={{ fontWeight: 600, textAlign: 'right' }}>
                    ${Number(item.avg_cost || 0).toFixed(2)}
                  </td>
                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                    ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenAdjustment(item)}
                    >
                      <Sliders size={13} />
                      Điều chỉnh
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockLevelsTab;
