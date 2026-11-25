import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import type { Product, Supplier, SupplierPerformance } from '../api/client.js';
import { Plus } from 'lucide-react';
import { ProductsTab } from './catalog/ProductsTab.js';
import { SuppliersTab } from './catalog/SuppliersTab.js';
import { CreateProductModal } from './catalog/CreateProductModal.js';
import {
  containerStyle,
  headerStyle,
  tabSwitcherStyle,
  createFallbackSupplierPerf,
} from './catalog/styles.js';

export const CatalogView: React.FC = () => {
  const [tab, setTab] = useState<'products' | 'suppliers'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierPerf, setSelectedSupplierPerf] = useState<SupplierPerformance | null>(null);
  const [search, setSearch] = useState('');
  const [, setLoading] = useState(true);

  // New Product Modal
  const [isNewProdOpen, setIsNewProdOpen] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newCost, setNewCost] = useState(100);
  const [newUom, setNewUom] = useState('pcs');

  const loadSupplierPerf = useCallback(async (supplierId: number) => {
    try {
      const perf = await api.getSupplierPerformance(supplierId);
      setSelectedSupplierPerf(perf);
    } catch {
      setSelectedSupplierPerf(createFallbackSupplierPerf(supplierId));
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'products') {
        const data = await api.getProducts();
        setProducts(data);
      } else {
        const data = await api.getSuppliers();
        setSuppliers(data);
        if (data.length > 0) {
          loadSupplierPerf(data[0].id);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [tab, loadSupplierPerf]);

  useEffect(() => {
    let ignore = false;
    if (tab === 'products') {
      api.getProducts()
        .then((data) => {
          if (!ignore) setProducts(data);
        })
        .catch(() => {})
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    } else {
      api.getSuppliers()
        .then((data) => {
          if (!ignore) {
            setSuppliers(data);
            if (data.length > 0) {
              loadSupplierPerf(data[0].id);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [tab, loadSupplierPerf]);

  const handleCreateProduct = async () => {
    if (!newSku || !newName) return;
    try {
      await api.createProduct({
        sku: newSku.toUpperCase(),
        name: newName,
        barcode: newBarcode || null,
        standardCost: Number(newCost),
        uom: newUom,
      });
      setIsNewProdOpen(false);
      setNewSku('');
      setNewName('');
      setNewBarcode('');
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi thêm sản phẩm');
    }
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Danh Mục Sản Phẩm & Đối Tác Nhà Cung Cấp</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Quản lý dữ liệu chủ (Master Data) và bảng chỉ số đánh giá năng lực nhà cung cấp
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={tabSwitcherStyle}>
            <button
              type="button"
              className={`btn btn-sm ${tab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab('products')}
            >
              Sản Phẩm ({products.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab('suppliers')}
            >
              Nhà Cung Cấp ({suppliers.length || 5})
            </button>
          </div>

          {tab === 'products' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsNewProdOpen(true)}
            >
              <Plus size={16} />
              Thêm Sản Phẩm Mới
            </button>
          )}
        </div>
      </div>

      {tab === 'products' && (
        <ProductsTab
          products={products}
          search={search}
          onSearchChange={setSearch}
        />
      )}

      {tab === 'suppliers' && (
        <SuppliersTab
          suppliers={suppliers}
          selectedSupplierPerf={selectedSupplierPerf}
          onSelectSupplier={loadSupplierPerf}
        />
      )}

      <CreateProductModal
        isOpen={isNewProdOpen}
        sku={newSku}
        name={newName}
        barcode={newBarcode}
        cost={newCost}
        uom={newUom}
        onSkuChange={setNewSku}
        onNameChange={setNewName}
        onBarcodeChange={setNewBarcode}
        onCostChange={setNewCost}
        onUomChange={setNewUom}
        onClose={() => setIsNewProdOpen(false)}
        onSubmit={handleCreateProduct}
      />
    </div>
  );
};

export default CatalogView;
