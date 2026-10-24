import React, { useState, useEffect, useMemo } from 'react';
import { History, Search, Shield, Filter, Calendar, FileSpreadsheet } from 'lucide-react';
import { AuditLog } from '../../types';
import { db } from '../../services/storage';
import { ExportService } from '../../services/exportService';

export const AuditScreen: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const loadData = () => {
    setLogs(db.getAuditLogs());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        l.description.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        (l.entityId && l.entityId.toLowerCase().includes(q));
      const matchEntity = entityFilter === 'all' || l.entity === entityFilter;
      return matchSearch && matchEntity;
    });
  }, [logs, searchQuery, entityFilter]);

  const handleExportExcel = () => {
    const rows = filteredLogs.map((l) => ({
      'التوقيت': new Date(l.timestamp).toLocaleString('ar-EG'),
      'المستخدم': l.userName,
      'نوع العملية': l.actionType,
      'القسم / السجل': l.entity,
      'البيان والتفاصيل': l.description,
      'معرف الكيان': l.entityId || '-',
    }));
    ExportService.exportToExcel(rows, `سجل_نشاط_وتدقيق_كاندي_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DC CE]">
        <div>
          <h2 className="text-xl font-bold text-[#341B11]">سجل النشاط والتدقيق والأمان</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            سجل تاريخي غير قابل للتعديل يوثق جميع العمليات، المبيعات، تعديلات الأسعار، والتسويات
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-3 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#2B7A4B] border border-[#C2DEC8] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Excel</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E6D9CC] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالبيان أو المستخدم أو المعرف..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
            />
          </div>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="text-xs p-1.5 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg text-[#542E1D] font-medium"
          >
            <option value="all">كافة العمليات</option>
            <option value="Sale">فواتير مبيعات (Sale)</option>
            <option value="Product">المنتجات والأسعار (Product)</option>
            <option value="Purchase">مشتريات وتوريدات (Purchase)</option>
            <option value="Expense">مصروفات (Expense)</option>
            <option value="Safe">الخزنة (Safe)</option>
            <option value="Spoilage">التالف والهالك (Spoilage)</option>
            <option value="Stocktake">تسويات الجرد (Stocktake)</option>
            <option value="Backup">النسخ الاحتياطي (Backup)</option>
          </select>
        </div>

        <div className="text-xs text-[#7A5E4F] font-semibold">
          عدد القيود المسجلة: {filteredLogs.length}
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
              <tr>
                <th className="py-3 px-4">التوقيت والتاريخ</th>
                <th className="py-3 px-4">المستخدم</th>
                <th className="py-3 px-4">نوع الإجراء</th>
                <th className="py-3 px-4">القسم</th>
                <th className="py-3 px-4">بيان وتفاصيل العملية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-[#FAF6F2] transition-colors">
                  <td className="py-2.5 px-4 font-mono text-[#6B5345]">
                    {new Date(l.timestamp).toLocaleString('ar-EG')}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-[#341B11]">{l.userName}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        l.actionType === 'CREATE'
                          ? 'bg-[#EDF8F1] text-[#2B7A4B] border border-[#BDE3CB]'
                          : l.actionType === 'UPDATE'
                          ? 'bg-[#FAF3EC] text-[#8C4A26] border border-[#E8C5A8]'
                          : l.actionType === 'DELETE'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-[#F0F4F8] text-[#2B547E] border border-[#CBDDEE]'
                      }`}
                    >
                      {l.actionType}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-bold text-[#542E1D]">{l.entity}</td>
                  <td className="py-2.5 px-4 text-[#2B170E]">{l.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
