import React, { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SalaryPageProps {
  businessId: string;
}

type Period = 'daily' | 'weekly' | 'monthly';

const SalaryPage: React.FC<SalaryPageProps> = ({ businessId }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('daily');
  const [rows, setRows] = useState<{ salary_date: string; amount: number; employee_id?: string; notes?: string }[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[SALARY PAGE] Loading salaries for business:', businessId);
      
      const { data, error } = await supabase
        .from('salaries')
        .select('salary_date, amount, employee_id, notes')
        .eq('business_id', businessId)
        .order('salary_date', { ascending: false });
      
      if (error) {
        console.error('[SALARY PAGE] Error loading salaries:', error);
        setError(`Failed to load salary data: ${error.message}`);
        setRows([]);
      } else {
        console.log('[SALARY PAGE] Loaded salaries:', data?.length || 0);
        setRows((data as any) || []);
      }
    } catch (err) {
      console.error('[SALARY PAGE] Exception loading salaries:', err);
      setError('Failed to load salary data. Please try again.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [businessId]);

  const summary = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let daily = 0, weekly = 0, monthly = 0;
    rows.forEach(r => {
      const d = new Date(r.salary_date);
      if (d.toDateString() === today.toDateString()) daily += Number(r.amount) || 0;
      if (d >= startOfWeek) weekly += Number(r.amount) || 0;
      if (d >= startOfMonth) monthly += Number(r.amount) || 0;
    });
    return { daily, weekly, monthly };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return rows.filter(r => {
      const d = new Date(r.salary_date);
      if (period === 'daily') return d.toDateString() === today.toDateString();
      if (period === 'weekly') return d >= startOfWeek;
      return d >= startOfMonth;
    });
  }, [rows, period]);

  const handleSave = async () => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      alert('Enter a valid salary amount');
      return;
    }
    
    if (!date) {
      alert('Please select a date');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      console.log('[SALARY PAGE] Saving salary:', { 
        businessId, 
        date, 
        amount: amt, 
        employeeId: employeeId || null, 
        notes: notes || null 
      });
      
      // Try using the safe database function first
      try {
        const { data: salaryId, error: rpcError } = await supabase.rpc('safe_add_salary', {
          p_business_id: businessId,
          p_salary_date: date,
          p_amount: amt,
          p_employee_id: employeeId || null,
          p_notes: notes || null
        });

        if (rpcError) {
          console.warn('[SALARY PAGE] RPC function failed, trying direct insert:', rpcError);
          throw new Error(`RPC failed: ${rpcError.message}`);
        }

        console.log('[SALARY PAGE] Salary saved successfully via RPC, ID:', salaryId);
      } catch (rpcError) {
        console.warn('[SALARY PAGE] RPC failed, trying direct insert:', rpcError);
        
        // Fallback to direct insertion
        const { error } = await supabase
          .from('salaries')
          .insert([{ 
            business_id: businessId, 
            salary_date: date, 
            amount: amt,
            employee_id: employeeId || null,
            notes: notes || null
          }]);
        
        if (error) {
          console.error('[SALARY PAGE] Direct insert error:', error);
          throw error;
        }
        
        console.log('[SALARY PAGE] Salary saved successfully via direct insert');
      }
      
      // Reset form
      setAmount('');
      setEmployeeId('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      
      // Reload data
      await load();
      alert('Salary saved successfully!');
    } catch (e: any) {
      console.error('[SALARY PAGE] Error saving salary:', e);
      const errorMessage = e?.message || 'Unknown error';
      setError(`Failed to save salary: ${errorMessage}`);
      alert(`Failed to save salary: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading salary data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Salary Page</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Salary Amount *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Employee ID</label>
          <input
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Optional"
          />
        </div>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={handleSave}
          disabled={saving || !amount || !date}
          className={`px-6 py-2 ${saving || !amount || !date ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg transition-colors`}
        >
          <Save className="inline mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Salary'}
        </button>
      </div>

      <div className="flex gap-2">
        {(['daily','weekly','monthly'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded ${period===p? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {p[0].toUpperCase()+p.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded border">
          <div className="text-sm text-blue-800">Day Total</div>
          <div className="text-2xl font-bold text-blue-900">₹{summary.daily.toFixed(2)}</div>
        </div>
        <div className="bg-green-50 p-4 rounded border">
          <div className="text-sm text-green-800">Week Total</div>
          <div className="text-2xl font-bold text-green-900">₹{summary.weekly.toFixed(2)}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded border">
          <div className="text-sm text-purple-800">Month Total</div>
          <div className="text-2xl font-bold text-purple-900">₹{summary.monthly.toFixed(2)}</div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Entries</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Date</th>
                <th className="border p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border p-2">{r.salary_date}</td>
                  <td className="border p-2 text-right">₹{Number(r.amount).toFixed(2)}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td className="border p-3 text-center text-gray-500" colSpan={2}>No entries</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalaryPage;


