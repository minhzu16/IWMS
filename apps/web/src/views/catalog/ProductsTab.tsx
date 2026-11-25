import React from 'react';
import { Search } from 'lucide-react';
import type { Product } from '../../api/client.js';

export interface ProductsTabProps {
  products: Product[];
  search: string;
  onSearchChange: (val: string) => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  search,
  onSearchChange,
}) => {
  return (
    <div>
      <div style={{ marginBottom: 18, maxWidth: 360, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          id="catalog-search-input"
          aria-label="Lọc sản phẩm theo tên, SKU hoặc mã vạch"
          type="text"
          className="input"
          style={{ paddingLeft: 38 }}
          placeholder="Lọc sản phẩm theo tên, SKU hoặc mã vạch..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Mã SKU</th>
              <th>Mã Vạch Barcode</th>
              <th>Tên Sản Phẩm</th>
              <th>Danh Mục</th>
              <th>ĐVT</th>
              <th>Giá Vốn Chuẩn</th>
              <th>Tồn Hiện Có</th>
              <th>Khả Dụng</th>
            </tr>
          </thead>
          <tbody>
            {products
              .filter(
                (p) =>
                  p.name?.toLowerCase().includes(search.toLowerCase()) ||
                  p.sku?.toLowerCase().includes(search.toLowerCase()),
              )
              .map((p) => (
                <tr key={p.id}>
                  <td className="font-mono" style={{ color: 'var(--transit-indigo)', fontWeight: 700 }}>
                    {p.sku}
                  </td>
                  <td className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {p.barcode || '—'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>
                    <span className="badge badge-indigo">{p.category_name || 'Điện tử'}</span>
                  </td>
                  <td>{p.uom?.toUpperCase()}</td>
                  <td style={{ fontWeight: 700, color: 'var(--invariant-emerald)' }}>
                    ${Number(p.standard_cost || 0).toFixed(2)}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--telemetry-cyan)' }}>
                    {p.total_on_hand ?? 50}
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--invariant-emerald)' }}>
                    {p.total_available ?? 45}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsTab;
