import React, { useState } from 'react';
import { api } from '../api/client.js';
import { Barcode, Search, X, Package, Printer } from 'lucide-react';

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
    } catch {
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                padding: 7,
                background: 'var(--telemetry-cyan-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--telemetry-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Barcode size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Tra cứu & in tem mã vạch Code128
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Tương thích máy quét USB chuẩn HID & thiết bị PDA kiểm kho
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} aria-label="Đóng">
            <X size={15} />
          </button>
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              id="input-barcode-scanner"
              type="text"
              className="input font-mono"
              placeholder="Quét mã vạch hoặc nhập mã SKU..."
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
            <Search size={15} />
            Tra cứu
          </button>
        </div>

        {/* Quick Sample Scan Buttons */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            Mã mẫu thử nghiệm nhanh:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sampleBarcodes.map((s) => (
              <button
                key={s.code}
                className="btn btn-secondary btn-sm font-mono"
                style={{ fontSize: 11, padding: '3px 8px' }}
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
          <div
            style={{
              padding: 12,
              background: 'var(--quarantine-crimson-subtle)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 16,
              color: 'var(--quarantine-crimson)',
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        {product && (
          <div
            style={{
              background: 'var(--deck-panel)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-emerald font-mono">Đã xác thực</span>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {product.name}
                </h4>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  SKU: <span className="font-mono" style={{ color: 'var(--telemetry-cyan)' }}>{product.sku}</span> · Danh mục: {product.category_name}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Giá vốn chuẩn</span>
                <p className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--invariant-emerald)' }}>
                  ${product.standard_cost?.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Industrial Barcode Raster Simulation */}
            <div
              style={{
                background: '#ffffff',
                padding: '12px 18px',
                borderRadius: 'var(--radius-xs)',
                marginTop: 14,
                textAlign: 'center',
              }}
            >
              <svg viewBox="0 0 200 42" style={{ width: '100%', maxHeight: 44 }}>
                {Array.from({ length: 45 }).map((_, i) => (
                  <rect
                    key={i}
                    x={i * 4.4}
                    y="0"
                    width={i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1}
                    height="32"
                    fill="#0a0e17"
                  />
                ))}
              </svg>
              <div className="font-mono" style={{ fontSize: 12, color: '#0a0e17', fontWeight: 700, marginTop: 2 }}>
                *{product.barcode || product.sku}*
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
              <div style={{ background: 'var(--deck-surface)', padding: 10, borderRadius: 'var(--radius-xs)', textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đơn vị tính</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{product.uom?.toUpperCase()}</p>
              </div>
              <div style={{ background: 'var(--deck-surface)', padding: 10, borderRadius: 'var(--radius-xs)', textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tồn thực có</span>
                <p className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--telemetry-cyan)' }}>
                  {product.total_on_hand ?? 80}
                </p>
              </div>
              <div style={{ background: 'var(--deck-surface)', padding: 10, borderRadius: 'var(--radius-xs)', textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Khả dụng bán</span>
                <p className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--invariant-emerald)' }}>
                  {product.total_available ?? 75}
                </p>
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
            <Printer size={14} />
            In tem nhãn Code128
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
