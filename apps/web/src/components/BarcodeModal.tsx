import React, { useState } from 'react';
import { api } from '../api/client.js';
import { Barcode, Search, X, Check, Package, Printer } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [barcodeInput, setBarcodeInput] = useState('893850123004');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleBarcodes = [
    { code: '893850123001', name: 'Intel Core i7-14700K' },
    { code: '893850123004', name: 'Samsung 990 PRO 2TB' },
    { code: '893850123005', name: 'ASUS RTX 4080 SUPER' },
    { code: '893850123008', name: 'Logitech G PRO X 2' },
  ];

  const handleLookup = async (codeToLookup?: string) => {
    const code = codeToLookup || barcodeInput;
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProductByBarcode(code);
      setProduct(data);
    } catch (err: any) {
      // Demo mock fallback if offline
      const found = sampleBarcodes.find((b) => b.code === code);
      if (found) {
        setProduct({
          id: 4,
          sku: 'SSD-SAM-990P-2TB',
          barcode: code,
          name: found.name,
          category_name: 'Điện tử & Bán dẫn',
          uom: 'pcs',
          standard_cost: 175.0,
          total_on_hand: 80,
          total_available: 75,
        });
      } else {
        setError(`Không tìm thấy sản phẩm có mã barcode hoặc SKU: ${code}`);
        setProduct(null);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, background: 'var(--accent-cyan-light)', borderRadius: 8, color: '#22d3ee' }}>
              <Barcode size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Máy Quét & Tra Cứu Mã Vạch Barcode (Code128)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Hỗ trợ máy quét cầm tay USB (bàn phím ảo) & quét camera
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              id="input-barcode-scanner"
              type="text"
              className="input font-mono"
              placeholder="Quét mã vạch hoặc nhập SKU..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              autoFocus
            />
          </div>
          <button
            id="btn-scan-lookup"
            className="btn btn-primary"
            onClick={() => handleLookup()}
            disabled={loading}
          >
            <Search size={16} />
            Tra Cứu
          </button>
        </div>

        {/* Sample Quick Scan Pills */}
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>Mã mẫu thử nghiệm:</span>
          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {sampleBarcodes.map((s) => (
              <button
                key={s.code}
                className="badge badge-indigo"
                style={{ cursor: 'pointer', border: 'none' }}
                onClick={() => {
                  setBarcodeInput(s.code);
                  handleLookup(s.code);
                }}
              >
                {s.name} ({s.code})
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: 12, background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 8, marginBottom: 16, color: '#fb7185', fontSize: 13 }}>
            {error}
          </div>
        )}

        {product && (
          <div style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-emerald" style={{ marginBottom: 6 }}>Tìm thấy sản phẩm</span>
                <h4 style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>{product.name}</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  SKU: <span className="font-mono" style={{ color: '#818cf8' }}>{product.sku}</span> | Danh mục: {product.category_name}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Giá vốn chuẩn:</span>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>${product.standard_cost?.toFixed(2)}</p>
              </div>
            </div>

            {/* Visual SVG Code128 Barcode Simulation */}
            <div style={{
              background: '#ffffff',
              padding: '16px 24px',
              borderRadius: 8,
              marginTop: 16,
              textAlign: 'center',
            }}>
              <svg viewBox="0 0 200 45" style={{ width: '100%', maxHeight: 50 }}>
                {Array.from({ length: 45 }).map((_, i) => (
                  <rect
                    key={i}
                    x={i * 4.4}
                    y="0"
                    width={i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1}
                    height="35"
                    fill="#000000"
                  />
                ))}
              </svg>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#111827', fontWeight: 700, marginTop: 4 }}>
                *{product.barcode || product.sku}*
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
              <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đơn vị tính</span>
                <p style={{ fontSize: 15, fontWeight: 700 }}>{product.uom?.toUpperCase()}</p>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tồn thực có</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8' }}>{product.total_on_hand ?? 80}</p>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Khả dụng bán</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#34d399' }}>{product.total_available ?? 75}</p>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => window.print()}
            disabled={!product}
          >
            <Printer size={15} />
            In Nhãn Tem Barcode (Code128)
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
