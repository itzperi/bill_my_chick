import React, { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PurchasePageProps {
  businessId: string;
}

interface Product { id: number; name: string; }
interface Supplier { id: number; name: string; }

const PurchasePage: React.FC<PurchasePageProps> = ({ businessId }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productId, setProductId] = useState<number | ''>('');
  const [supplierInput, setSupplierInput] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [quantityKg, setQuantityKg] = useState<string>('');
  const [pricePerKg, setPricePerKg] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from('products').select('id,name').eq('business_id', businessId).order('name'),
        supabase.from('suppliers').select('id,name').eq('business_id', businessId).order('name')
      ]);
      setProducts(p || []);
      setSuppliers(s || []);
    };
    load();
  }, [businessId]);

  const billAmount = useMemo(() => {
    const q = parseFloat(quantityKg) || 0;
    const r = parseFloat(pricePerKg) || 0;
    return q * r;
  }, [quantityKg, pricePerKg]);

  const filteredSuppliers = useMemo(() => {
    const term = supplierInput.toLowerCase();
    return term ? suppliers.filter(s => s.name.toLowerCase().includes(term)) : suppliers;
  }, [supplierInput, suppliers]);

  const handleSave = async () => {
    if (!productId || !selectedSupplier) {
      alert('Select product and supplier');
      return;
    }
    if (!quantityKg || !pricePerKg) {
      alert('Enter quantity and price per KG');
      return;
    }
    setSaving(true);
    try {
      const insertData = {
        business_id: businessId,
        purchase_date: date,
        product_id: Number(productId),
        supplier_id: selectedSupplier.id,
        quantity_kg: parseFloat(quantityKg),
        price_per_kg: parseFloat(pricePerKg),
        paid_amount: parseFloat(paidAmount) || 0
      } as any;
      const { error } = await supabase.from('purchases').insert([insertData]);
      if (error) throw error;
      // reset form
      setProductId('');
      setSelectedSupplier(null);
      setSupplierInput('');
      setQuantityKg('');
      setPricePerKg('');
      setPaidAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      alert('Purchase saved');
    } catch (e: any) {
      console.error('Error saving purchase', e);
      alert('Failed to save purchase: ' + (e?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Purchase Page</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Supplier</label>
          <input
            type="text"
            value={supplierInput}
            onChange={(e) => {
              setSupplierInput(e.target.value);
              setSelectedSupplier(null);
            }}
            placeholder="Type supplier name"
            className="w-full p-2 border border-gray-300 rounded"
          />
          {supplierInput && !selectedSupplier && (
            <div className="mt-1 max-h-40 overflow-y-auto border rounded">
              {filteredSuppliers.map(s => (
                <div
                  key={s.id}
                  className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                  onClick={() => {
                    setSelectedSupplier(s);
                    setSupplierInput(s.name);
                  }}
                >
                  {s.name}
                </div>
              ))}
              {filteredSuppliers.length === 0 && (
                <div className="p-2 text-sm text-gray-500">No matching suppliers</div>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : '')}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select product</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Quantity (KG)</label>
          <input
            type="number"
            step="0.01"
            value={quantityKg}
            onChange={(e) => setQuantityKg(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Price per KG</label>
          <input
            type="number"
            step="0.01"
            value={pricePerKg}
            onChange={(e) => setPricePerKg(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Bill Amount</label>
          <input
            type="number"
            value={billAmount.toFixed(2)}
            readOnly
            className="w-full p-2 border border-gray-300 rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Paid Amount</label>
          <input
            type="number"
            step="0.01"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 ${saving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg`}
        >
          <Save className="inline mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Entry'}
        </button>
      </div>
    </div>
  );
};

export default PurchasePage;


