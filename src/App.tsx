/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Plus, Phone, MessageSquare, Mail, Building2, 
  MapPin, DollarSign, Calendar, Edit2, Trash2, CheckCircle2, 
  Clock, XCircle, AlertCircle, Sparkles, Download, Upload, 
  ChevronRight, ExternalLink, Filter, ArrowUpDown, RefreshCw, X, Check, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  city: string;
  state: string;
  status: 'novo' | 'contatado' | 'proposta' | 'fechado' | 'perdido';
  value: number;
  notes: string;
  createdAt: string;
}

const INITIAL_LEADS: Lead[] = [];

const STATUS_CONFIG = {
  novo: { label: 'Novo Lead', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800', dot: 'bg-blue-500' },
  contatado: { label: 'Em Contato', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800', dot: 'bg-amber-500' },
  proposta: { label: 'Proposta Enviada', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800', dot: 'bg-purple-500' },
  fechado: { label: 'Fechado (Cliente)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-500' },
  perdido: { label: 'Perdido', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800', dot: 'bg-rose-500' }
};

export default function App() {
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('crm_leads_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Erro ao carregar leads:', e);
      }
    }
    return INITIAL_LEADS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'value'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);

  // AI Message Modal State
  const [aiModalLead, setAiModalLead] = useState<Lead | null>(null);
  const [aiPromptType, setAiPromptType] = useState<'initial' | 'followup' | 'closing'>('initial');
  const [aiMessage, setAiMessage] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    city: '',
    state: '',
    status: 'novo' as Lead['status'],
    value: 0,
    notes: ''
  });

  useEffect(() => {
    localStorage.setItem('crm_leads_v3', JSON.stringify(leads));
  }, [leads]);

  // Filtered and sorted leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm);

      const matchesStatus = statusFilter === 'todos' || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      let comp = 0;
      if (sortBy === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (sortBy === 'value') {
        comp = a.value - b.value;
      } else {
        comp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [leads, searchTerm, statusFilter, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const total = leads.length;
    const totalValue = leads.reduce((acc, l) => acc + (l.status !== 'perdido' ? Number(l.value) || 0 : 0), 0);
    const closedCount = leads.filter(l => l.status === 'fechado').length;
    const conversionRate = total > 0 ? ((closedCount / total) * 100).toFixed(1) : '0';
    return { total, totalValue, closedCount, conversionRate };
  }, [leads]);

  const handleOpenAddModal = () => {
    setEditingLead(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      company: '',
      city: '',
      state: '',
      status: 'novo',
      value: 0,
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (lead: Lead, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      company: lead.company,
      city: lead.city || '',
      state: lead.state || '',
      status: lead.status,
      value: lead.value,
      notes: lead.notes
    });
    setIsAddModalOpen(true);
  };

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingLead) {
      setLeads(leads.map(l => l.id === editingLead.id ? {
        ...l,
        ...formData
      } : l));
    } else {
      const newLead: Lead = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
        ...formData,
        createdAt: new Date().toISOString()
      };
      setLeads([newLead, ...leads]);
    }
    setIsAddModalOpen(false);
  };

  const handleDeleteLead = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setLeads(prev => prev.filter(l => l.id !== id));
    if (selectedLeadForDetail?.id === id) {
      setSelectedLeadForDetail(null);
    }
  };

  const getCleanPhone = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const openWhatsApp = (phone: string, name: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const cleanNumber = getCleanPhone(phone);
    if (!cleanNumber) {
      alert('Este lead não possui um número de telefone válido.');
      return;
    }
    const message = encodeURIComponent(`Olá ${name}, tudo bem? Estou entrando em contato referente aos nossos serviços.`);
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const handleOpenAiModal = (lead: Lead, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setAiModalLead(lead);
    setAiPromptType('initial');
    setAiMessage('');
    generateAiMessage(lead, 'initial');
  };

  const generateAiMessage = async (lead: Lead, type: 'initial' | 'followup' | 'closing') => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: lead.name,
          leadCompany: lead.company,
          leadCity: lead.city,
          leadNotes: lead.notes,
          leadStatus: STATUS_CONFIG[lead.status].label,
          promptType: type
        })
      });
      const data = await res.json();
      if (data.message) {
        setAiMessage(data.message);
      } else {
        setAiMessage('Olá ' + lead.name + ', tudo bem? Gostaria de retomar nosso contato.');
      }
    } catch (err) {
      console.error(err);
      setAiMessage('Olá ' + lead.name + ', tudo bem? Gostaria de falar sobre nossos serviços.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const sendAiMessageOnWhatsApp = () => {
    if (!aiModalLead) return;
    const cleanNumber = getCleanPhone(aiModalLead.phone);
    if (!cleanNumber) {
      alert('Número de telefone inválido.');
      return;
    }
    const encoded = encodeURIComponent(aiMessage);
    window.open(`https://wa.me/${cleanNumber}?text=${encoded}`, '_blank');
    setAiModalLead(null);
  };

  const exportToJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leads, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `leads_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportToExcel = () => {
    const worksheetData = leads.map(l => ({
      Nome: l.name,
      Telefone: l.phone,
      Email: l.email,
      Empresa: l.company,
      Cidade: l.city,
      Estado: l.state,
      Status: STATUS_CONFIG[l.status]?.label || l.status,
      Valor: l.value,
      Anotacoes: l.notes,
      DataCadastro: l.createdAt
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, `leads_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.json')) {
      const fileReader = new FileReader();
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            const formatted: Lead[] = parsed.map((item, idx) => ({
              id: item.id || (Date.now() + idx).toString(),
              name: item.name || item.Nome || item.nome || 'Sem Nome',
              phone: String(item.phone || item.Telefone || item.telefone || item.Celular || item.celular || item.WhatsApp || ''),
              email: item.email || item.Email || item.EMAIL || '',
              company: item.company || item.Empresa || item.empresa || '',
              city: item.city || item.Cidade || item.cidade || '',
              state: item.state || item.Estado || item.estado || item.UF || item.uf || '',
              status: ['novo', 'contatado', 'proposta', 'fechado', 'perdido'].includes(item.status) ? item.status : 'novo',
              value: Number(item.value || item.Valor || item.valor || 0) || 0,
              notes: item.notes || item.Anotacoes || item.observacoes || item.obs || '',
              createdAt: item.createdAt || new Date().toISOString()
            }));
            setLeads(prev => [...formatted, ...prev]);
            alert(`${formatted.length} leads importados com sucesso!`);
          } else {
            alert('Formato de arquivo JSON inválido.');
          }
        } catch (err) {
          alert('Erro ao processar o arquivo JSON.');
        }
      };
    } else {
      // Excel (.xlsx, .xls) or CSV (.csv)
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Read as header-object objects if header exists, plus 2D array fallback
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          const rows2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!rows2D || rows2D.length === 0) {
            alert('A planilha está vazia.');
            return;
          }

          const importedLeads: Lead[] = [];

          // Intelligent Header detection
          let hasHeader = false;
          let headerMap: Record<string, number> = {};

          if (rows2D.length > 0) {
            const firstRow = rows2D[0].map(cell => String(cell).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
            const hasNameHeader = firstRow.some(h => h.includes('nome') || h.includes('name') || h.includes('cliente'));
            const hasPhoneHeader = firstRow.some(h => h.includes('telefone') || h.includes('phone') || h.includes('celular') || h.includes('whatsapp') || h.includes('fone'));

            if (hasNameHeader || hasPhoneHeader) {
              hasHeader = true;
              firstRow.forEach((colName, index) => {
                if (colName.includes('nome') || colName.includes('name') || colName.includes('cliente')) headerMap['name'] = index;
                else if (colName.includes('telefone') || colName.includes('phone') || colName.includes('celular') || colName.includes('whatsapp') || colName.includes('fone')) headerMap['phone'] = index;
                else if (colName.includes('cidade') || colName.includes('city') || colName.includes('municipio')) headerMap['city'] = index;
                else if (colName.includes('estado') || colName.includes('state') || colName.includes('uf')) headerMap['state'] = index;
                else if (colName.includes('empresa') || colName.includes('company')) headerMap['company'] = index;
                else if (colName.includes('email') || colName.includes('e-mail')) headerMap['email'] = index;
                else if (colName.includes('valor') || colName.includes('value') || colName.includes('preco')) headerMap['value'] = index;
                else if (colName.includes('anotacoes') || colName.includes('observacoes') || colName.includes('notes') || colName.includes('obs')) headerMap['notes'] = index;
              });
            }
          }

          const startIndex = hasHeader ? 1 : 0;

          for (let i = startIndex; i < rows2D.length; i++) {
            const row = rows2D[i];
            if (!row || row.length === 0) continue;

            let name = '';
            let phone = '';
            let city = '';
            let state = '';
            let company = '';
            let email = '';
            let value = 0;
            let notes = '';
            let status: Lead['status'] = 'novo';

            if (hasHeader && Object.keys(headerMap).length > 0) {
              name = headerMap['name'] !== undefined ? String(row[headerMap['name']] || '').trim() : String(row[0] || '').trim();
              phone = headerMap['phone'] !== undefined ? String(row[headerMap['phone']] || '').trim() : String(row[1] || '').trim();
              city = headerMap['city'] !== undefined ? String(row[headerMap['city']] || '').trim() : String(row[2] || '').trim();
              state = headerMap['state'] !== undefined ? String(row[headerMap['state']] || '').trim() : String(row[3] || '').trim();
              company = headerMap['company'] !== undefined ? String(row[headerMap['company']] || '').trim() : '';
              email = headerMap['email'] !== undefined ? String(row[headerMap['email']] || '').trim() : '';
              
              if (headerMap['value'] !== undefined) {
                value = Number(String(row[headerMap['value']] || 0).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
              }
              if (headerMap['notes'] !== undefined) {
                notes = String(row[headerMap['notes']] || '').trim();
              }
            } else {
              // Positional fallback (Col A: Name, Col B: Phone, Col C: City, Col D: State, etc.)
              name = String(row[0] || '').trim();
              phone = row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : '';
              city = row[2] !== undefined && row[2] !== null ? String(row[2]).trim() : '';
              state = row[3] !== undefined && row[3] !== null ? String(row[3]).trim() : '';
              company = row[4] !== undefined && row[4] !== null ? String(row[4]).trim() : '';
              notes = row[5] !== undefined && row[5] !== null ? String(row[5]).trim() : '';
            }

            if (!name) continue;

            importedLeads.push({
              id: (Date.now() + i + Math.random()).toString(),
              name,
              phone,
              email,
              company,
              city,
              state,
              status,
              value,
              notes,
              createdAt: new Date().toISOString()
            });
          }

          if (importedLeads.length > 0) {
            setLeads(prev => [...importedLeads, ...prev]);
            alert(`${importedLeads.length} lead(s) importado(s) com sucesso!`);
          } else {
            alert('Nenhum lead válido foi encontrado na planilha. Verifique se há nomes preenchidos.');
          }
        } catch (err) {
          console.error(err);
          alert('Erro ao ler a planilha. Verifique se o arquivo está correto.');
        }
      };
      reader.readAsArrayBuffer(file);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-sm flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Banco de Leads
                {stats.total > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {stats.total}
                  </span>
                )}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Importar Planilha</span>
              <input type="file" accept=".xlsx, .xls, .csv, .json" onChange={handleFileUpload} className="hidden" />
            </label>

            <button 
              onClick={exportToExcel}
              title="Exportar para Excel"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden md:inline">Exportar Excel</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-md transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Lead</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium">Total de Leads</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium">Valor Potencial</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              R$ {stats.totalValue.toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium">Fechados</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold">{stats.closedCount}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium">Conversão</span>
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            
            {/* Search Input - Instant search by name/phone/company/city */}
            <div className="relative w-full md:w-96">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Busque pelo nome, cidade, estado ou telefone..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  statusFilter === 'todos' 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Todos ({leads.length})
              </button>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const count = leads.filter(l => l.status === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                      statusFilter === key 
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
                    <span>{config.label}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Sort options */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Exibindo <strong>{filteredLeads.length}</strong> de {leads.length} leads</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" /> Ordenar:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="date">Data de cadastro</option>
                <option value="name">Nome</option>
                <option value="value">Valor</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              >
                {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
              </button>
            </div>
          </div>
        </div>

        {/* Leads List / Grid */}
        {filteredLeads.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Nenhum lead encontrado</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              {searchTerm ? `Nenhum resultado para "${searchTerm}".` : 'Sua base de leads está limpa. Importe uma planilha (.xlsx/.csv) contendo nome, telefone, cidade e estado ou cadastre manualmente!'}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs font-medium text-emerald-600 hover:underline"
              >
                Limpar busca
              </button>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-md">
                  <Upload className="w-4 h-4" />
                  <span>Importar Planilha</span>
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Lead</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeads.map(lead => {
              const statusInfo = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;
              const hasPhone = Boolean(lead.phone && lead.phone.trim().length > 3);

              return (
                <div 
                  key={lead.id}
                  onClick={() => setSelectedLeadForDetail(lead)}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Status badge & Actions */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></span>
                        {statusInfo.label}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => handleOpenEditModal(lead, e)}
                          title="Editar"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteLead(lead.id, e)}
                          title="Excluir"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Lead Name */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-emerald-600 transition">
                      {lead.name}
                    </h3>

                    {/* Company, City & State */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                      {lead.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" /> {lead.company}
                        </span>
                      )}
                      {(lead.city || lead.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          {lead.city}{lead.city && lead.state ? ' - ' : ''}{lead.state}
                        </span>
                      )}
                    </div>

                    {/* Contact info */}
                    <div className="space-y-1.5 mb-4 text-xs text-slate-600 dark:text-slate-300">
                      {lead.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes preview */}
                    {lead.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl mb-4">
                        {lead.notes}
                      </p>
                    )}
                  </div>

                  {/* Footer: Value & Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        R$ {Number(lead.value || 0).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* AI Assistant Button */}
                      <button
                        onClick={(e) => handleOpenAiModal(lead, e)}
                        title="Gerar Mensagem com IA"
                        className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded-xl transition flex items-center gap-1 text-xs font-medium px-2.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">IA</span>
                      </button>

                      {/* WhatsApp Button */}
                      <button
                        onClick={(e) => openWhatsApp(lead.phone, lead.name, e)}
                        disabled={!hasPhone}
                        title={hasPhone ? "Conversar no WhatsApp" : "Sem telefone cadastrado"}
                        className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                          hasPhone 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' 
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add / Edit Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingLead ? 'Editar Lead' : 'Adicionar Novo Lead'}
              </h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Carlos Silva"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ex: +55 11 99999-9999"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="carlos@email.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Empresa"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Sorocaba"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="SP"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="novo">Novo Lead</option>
                    <option value="contatado">Em Contato</option>
                    <option value="proposta">Proposta Enviada</option>
                    <option value="fechado">Fechado (Cliente)</option>
                    <option value="perdido">Perdido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Anotações / Observações
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalhes sobre interesse ou histórico..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition"
                >
                  {editingLead ? 'Salvar Alterações' : 'Cadastrar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLeadForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_CONFIG[selectedLeadForDetail.status]?.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[selectedLeadForDetail.status]?.dot}`}></span>
                  {STATUS_CONFIG[selectedLeadForDetail.status]?.label}
                </span>
              </div>
              <button 
                onClick={() => setSelectedLeadForDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                  {selectedLeadForDetail.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                  {selectedLeadForDetail.company && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" /> {selectedLeadForDetail.company}
                    </span>
                  )}
                  {(selectedLeadForDetail.city || selectedLeadForDetail.state) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      {selectedLeadForDetail.city}{selectedLeadForDetail.city && selectedLeadForDetail.state ? ' - ' : ''}{selectedLeadForDetail.state}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Telefone</span>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    {selectedLeadForDetail.phone || 'Não informado'}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block mb-1">E-mail</span>
                  <div className="text-sm font-semibold flex items-center gap-2 truncate">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{selectedLeadForDetail.email || 'Não informado'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block mb-1">Valor</span>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {Number(selectedLeadForDetail.value || 0).toLocaleString('pt-BR')}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block mb-1">Data</span>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    {new Date(selectedLeadForDetail.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>

              {selectedLeadForDetail.notes && (
                <div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Anotações</span>
                  <div className="text-sm bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedLeadForDetail.notes}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      const l = selectedLeadForDetail;
                      setSelectedLeadForDetail(null);
                      handleOpenEditModal(l);
                    }}
                    className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={(e) => {
                      const id = selectedLeadForDetail.id;
                      setSelectedLeadForDetail(null);
                      handleDeleteLead(id, e);
                    }}
                    className="px-3 py-2 text-xs font-medium text-rose-600 border border-rose-200 dark:border-rose-900/50 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      const l = selectedLeadForDetail;
                      setSelectedLeadForDetail(null);
                      handleOpenAiModal(l, e);
                    }}
                    className="px-3.5 py-2 text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> IA
                  </button>

                  <button
                    onClick={(e) => openWhatsApp(selectedLeadForDetail.phone, selectedLeadForDetail.name, e)}
                    disabled={!selectedLeadForDetail.phone}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${
                      selectedLeadForDetail.phone 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      {aiModalLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Assistente de IA para WhatsApp
                </h3>
              </div>
              <button 
                onClick={() => setAiModalLead(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block">Lead:</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{aiModalLead.name}</strong>
                </div>
                {aiModalLead.city && (
                  <div className="text-right">
                    <span className="text-slate-400 block">Cidade:</span>
                    <strong className="text-slate-900 dark:text-white">{aiModalLead.city}</strong>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Objetivo da Mensagem
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setAiPromptType('initial'); generateAiMessage(aiModalLead, 'initial'); }}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition ${
                      aiPromptType === 'initial'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Primeiro Contato
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAiPromptType('followup'); generateAiMessage(aiModalLead, 'followup'); }}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition ${
                      aiPromptType === 'followup'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAiPromptType('closing'); generateAiMessage(aiModalLead, 'closing'); }}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition ${
                      aiPromptType === 'closing'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Fechamento
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Mensagem (Editável)
                  </label>
                  <button
                    onClick={() => generateAiMessage(aiModalLead, aiPromptType)}
                    disabled={isGeneratingAi}
                    className="text-xs text-purple-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className={`w-3 h-3 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                    Regenerar
                  </button>
                </div>
                {isGeneratingAi ? (
                  <div className="h-32 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
                    <span className="text-xs">Criando mensagem com IA...</span>
                  </div>
                ) : (
                  <textarea
                    rows={5}
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={sendAiMessageOnWhatsApp}
                  disabled={isGeneratingAi || !aiMessage.trim()}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Enviar no WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
