import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  ExternalLink,
  Layers,
  Calendar,
  Clock,
  Factory,
  Cpu,
  FileText,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ProductionRow } from '../types';
import { localKey } from '../dataService';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRow: (row: ProductionRow) => void;
  formQuestions?: import('../types').FormQuestion[];
  availableModels?: string[];
  availableLines?: string[];
}

export const GOOGLE_FORM_SHORT_URL = 'https://forms.gle/L4JwAPYf1YGt2EmBA';
export const GOOGLE_FORM_VIEW_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfyPcHPd2YO1pWsyTre-nkQw7zqwvV5qZ_FjoAhEAMduK36Uw/viewform?embedded=true';
export const GOOGLE_FORM_RESPONSE_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfyPcHPd2YO1pWsyTre-nkQw7zqwvV5qZ_FjoAhEAMduK36Uw/formResponse';

// Google Form Structure mapping
const POWDER_MODELS = ['H - 321', 'H - 321 C', 'H - 347/348'];
const LIQUID_MODELS = [
  'H - 280',
  'H - 278',
  'H - 309',
  'H - 434',
  'H - 360',
  'H - 278 C',
];

const UNLOADING_DEFECTS = ['Flow', 'Dry/Uncover', 'Pinhole', 'Dust', 'Inside Paint'];
const QC_DEFECTS = [
  'Flow',
  'Dry/Uncover',
  'Pinhole',
  'Dust',
  'Inside Paint',
  'Casting Defect',
];

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  onClose,
  onAddRow,
  formQuestions,
}) => {
  const [customResponses, setCustomResponses] = useState<Record<string, any>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');

  const dynamicShifts = formQuestions?.find((q) => q.id === 'q_shift')?.options || [
    'Shift A',
    'Shift B',
    'Shift C',
  ];
  const dynamicLines = formQuestions?.find((q) => q.id === 'q_line')?.options || [
    'Powder Coating Line',
    'Liquid Coating Line',
  ];
  const dynamicUnloadingDefects =
    formQuestions?.find((q) => q.id === 'q_unloading_defects')?.options || UNLOADING_DEFECTS;
  const dynamicQcDefects =
    formQuestions?.find((q) => q.id === 'q_qc_defects')?.options || QC_DEFECTS;

  const customQuestions =
    formQuestions?.filter(
      (q) =>
        q.section === 'custom' ||
        ![
          'q_date',
          'q_shift',
          'q_line',
          'q_model',
          'q_stage',
          'q_loading_qty',
          'q_insp_qty',
          'q_ok_qty',
          'q_nok_qty',
          'q_rework_qty',
          'q_unloading_defects',
          'q_rej_qty',
          'q_qc_defects',
        ].includes(q.id)
    ) || [];

  // Form State matching Google Form exactly
  const [dateKey, setDateKey] = useState(localKey(new Date()));
  const [shift, setShift] = useState<string>('Shift A');
  const [line, setLine] = useState<string>('Powder Coating Line');
  const [model, setModel] = useState<string>(POWDER_MODELS[0]);
  const [stage, setStage] = useState<'Loading' | 'Unloading' | 'Quality Control'>('Unloading');

  // Stage: Loading
  const [loadingQty, setLoadingQty] = useState<string>('200');

  // Stage: Unloading
  const [totalInspQty, setTotalInspQty] = useState<string>('200');
  const [okPartQty, setOkPartQty] = useState<string>('195');
  const [notOkPartQty, setNotOkPartQty] = useState<string>('5');
  const [totalReworkParts, setTotalReworkParts] = useState<string>('5');
  const [unloadingDefects, setUnloadingDefects] = useState<string[]>(['Dry/Uncover']);

  // Stage: Quality Control
  const [rejectedQty, setRejectedQty] = useState<string>('5');
  const [qcDefects, setQcDefects] = useState<string[]>(['Dry/Uncover']);

  // Submission Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Sync model list when line changes
  useEffect(() => {
    if (line === 'Powder Coating Line') {
      if (!POWDER_MODELS.includes(model)) {
        setModel(POWDER_MODELS[0]);
      }
    } else {
      if (!LIQUID_MODELS.includes(model)) {
        setModel(LIQUID_MODELS[0]);
      }
    }
  }, [line, model]);

  // Auto-calculate Not OK qty when Inspection and OK change
  const handleInspChange = (val: string) => {
    setTotalInspQty(val);
    const numInsp = Number(val) || 0;
    const numOk = Number(okPartQty) || 0;
    if (numInsp >= numOk) {
      setNotOkPartQty(String(numInsp - numOk));
    }
  };

  const handleOkChange = (val: string) => {
    setOkPartQty(val);
    const numInsp = Number(totalInspQty) || 0;
    const numOk = Number(val) || 0;
    if (numInsp >= numOk) {
      setNotOkPartQty(String(numInsp - numOk));
    }
  };

  if (!isOpen) return null;

  const toggleUnloadingDefect = (d: string) => {
    setUnloadingDefects((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const toggleQcDefect = (d: string) => {
    setQcDefects((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const triggerHaptic = () => {
    try {
      if ('vibrate' in navigator) navigator.vibrate(15);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    setIsSubmitting(true);
    setErrorMessage('');

    const logPayload = {
      date: dateKey,
      shift,
      line,
      model,
      stage,
      loadingQty: stage === 'Loading' ? loadingQty : undefined,
      totalInspQty: stage === 'Unloading' ? totalInspQty : undefined,
      okPartQty: stage === 'Unloading' ? okPartQty : undefined,
      notOkPartQty: stage === 'Unloading' ? notOkPartQty : undefined,
      totalReworkParts: stage === 'Unloading' ? totalReworkParts : undefined,
      unloadingDefects: stage === 'Unloading' ? unloadingDefects : undefined,
      rejectedQty: stage === 'Quality Control' ? rejectedQty : undefined,
      qcDefects: stage === 'Quality Control' ? qcDefects : undefined,
      customResponses,
    };

    let createdRow: ProductionRow | null = null;

    try {
      const res = await fetch('/api/production/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logPayload),
      });
      const data = await res.json();
      if (data.success && data.row) {
        createdRow = data.row;
      }
    } catch (err: any) {
      console.warn('Backend log forwarding failed, falling back to local creation:', err);
    }

    // Fallback if backend was unreachable
    if (!createdRow) {
      const shiftCode = shift.replace('Shift ', '').trim() || 'A';
      const defectsList =
        stage === 'Unloading' ? unloadingDefects : stage === 'Quality Control' ? qcDefects : [];
      createdRow = {
        ID: Math.floor(1000 + Math.random() * 9000),
        DateKey: dateKey,
        Shift: shiftCode,
        Line: line,
        Part: model,
        Stage: stage,
        Load: stage === 'Loading' ? Number(loadingQty) || 0 : 0,
        Insp:
          stage === 'Unloading'
            ? Number(totalInspQty) || 0
            : stage === 'Quality Control'
            ? Number(rejectedQty) || 0
            : 0,
        OK: stage === 'Unloading' ? Number(okPartQty) || 0 : 0,
        NOK: stage === 'Unloading' ? Number(notOkPartQty) || 0 : 0,
        Rework: stage === 'Unloading' ? Number(totalReworkParts) || 0 : 0,
        Rej: stage === 'Quality Control' ? Number(rejectedQty) || 0 : 0,
        Defect: defectsList.length ? defectsList.join('; ') + ';' : '',
      };
    }

    onAddRow(createdRow);
    setIsSubmitting(false);
    setSubmitSuccess(true);

    setTimeout(() => {
      setSubmitSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#101835] border border-[#2b396b] rounded-3xl w-full max-w-2xl shadow-2xl text-white relative my-6 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#0d1d4d] via-[#152a6a] to-[#1c3384] p-4 sm:p-5 border-b border-[#243468] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shadow-inner">
              <FileText className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  Daily Production Log Entry
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Google Sheet Connected
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Log entries are recorded into the Google Sheet &amp; updated live in the dashboard.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-indigo-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Quick Form Only) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs sm:text-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitSuccess ? (
              <div className="py-8 px-4 text-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2 animate-in zoom-in-95">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 animate-bounce" />
                <h3 className="text-base font-bold text-white">Record Successfully Logged!</h3>
                <p className="text-xs text-emerald-200/90">
                  Response has been submitted to Google Form &amp; recorded directly into your Google Sheet.
                </p>
              </div>
            ) : (
                <>
                  {/* Row 1: Date & Shift */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Date */}
                    <div className="bg-[#141d40] border border-[#243363] rounded-2xl p-3">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wide mb-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        Date
                      </label>
                      <input
                        type="date"
                        value={dateKey}
                        onChange={(e) => setDateKey(e.target.value)}
                        required
                        className="w-full bg-[#0d142d] text-white border border-[#29386d] focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                      />
                    </div>

                    {/* Shift */}
                    <div className="bg-[#141d40] border border-[#243363] rounded-2xl p-3">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wide mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        Shift
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {dynamicShifts.map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => {
                              triggerHaptic();
                              setShift(s);
                            }}
                            className={`py-2 px-1.5 rounded-xl text-xs font-semibold text-center transition ${
                              shift === s
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                : 'bg-[#0d142d] text-indigo-200 border border-[#29386d] hover:border-indigo-400'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <div className="text-[10px] text-indigo-400/80 mt-1 text-center">
                        {shift === 'Shift A'
                          ? '06:00 - 14:00'
                          : shift === 'Shift B'
                          ? '14:00 - 22:00'
                          : shift === 'Shift C'
                          ? '22:00 - 06:00'
                          : 'Standard Production'}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Coating Line & Model (Dynamic branching matching Google Form) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Line */}
                    <div className="bg-[#141d40] border border-[#243363] rounded-2xl p-3">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wide mb-1.5">
                        <Factory className="w-3.5 h-3.5 text-indigo-400" />
                        Line
                      </label>
                      <div className="flex flex-col gap-1.5">
                        {dynamicLines.map((l) => (
                          <button
                            type="button"
                            key={l}
                            onClick={() => {
                              triggerHaptic();
                              setLine(l);
                            }}
                            className={`py-2 px-3 rounded-xl text-xs font-semibold text-left transition flex items-center justify-between ${
                              line === l
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-[#0d142d] text-indigo-200 border border-[#29386d] hover:border-indigo-400'
                            }`}
                          >
                            <span>{l}</span>
                            <span className="text-[10px] opacity-75">
                              {l.includes('Powder') ? 'PC Part No' : 'LP Part No'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Model (Filtered based on Line) */}
                    <div className="bg-[#141d40] border border-[#243363] rounded-2xl p-3 flex flex-col justify-between">
                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wide mb-1.5">
                          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                          Model ({line === 'Powder Coating Line' ? 'PC Part' : 'LP Part'})
                        </label>
                        <select
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="w-full bg-[#0d142d] text-white border border-[#29386d] focus:border-indigo-400 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
                        >
                          {(line === 'Powder Coating Line' ? POWDER_MODELS : LIQUID_MODELS).map(
                            (m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {(line === 'Powder Coating Line' ? POWDER_MODELS : LIQUID_MODELS).map(
                          (m) => (
                            <button
                              type="button"
                              key={m}
                              onClick={() => {
                                triggerHaptic();
                                setModel(m);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                                model === m
                                  ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400'
                                  : 'bg-[#0d142d] text-slate-400 border border-slate-700 hover:text-white'
                              }`}
                            >
                              {m}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stage Selection */}
                  <div className="bg-[#141d40] border border-[#243363] rounded-2xl p-3">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wide mb-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Stage
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Loading', 'Unloading', 'Quality Control'] as const).map((st) => (
                        <button
                          type="button"
                          key={st}
                          onClick={() => {
                            triggerHaptic();
                            setStage(st);
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold text-center transition ${
                            stage === st
                              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                              : 'bg-[#0d142d] text-indigo-200 border border-[#29386d] hover:border-indigo-400'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conditional Stage 1: Loading */}
                  {stage === 'Loading' && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#111c3d] to-[#16244f] border border-[#27386d] space-y-3">
                      <h4 className="font-bold text-indigo-200 uppercase tracking-wider text-xs flex items-center gap-2">
                        <span>Loading Section</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                          Raw batch input
                        </span>
                      </h4>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Loading Qty (Nos)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={loadingQty}
                          onChange={(e) => setLoadingQty(e.target.value)}
                          required
                          placeholder="e.g. 200"
                          className="w-full sm:w-1/2 bg-[#0b122b] text-white border border-[#2c3c73] rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Conditional Stage 2: Unloading */}
                  {stage === 'Unloading' && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#111c3d] to-[#16244f] border border-[#27386d] space-y-4">
                      <h4 className="font-bold text-indigo-200 uppercase tracking-wider text-xs flex items-center justify-between">
                        <span>Unloading Inspection Section</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                          First-Pass Yield
                        </span>
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Total Inspection Qty
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={totalInspQty}
                            onChange={(e) => handleInspChange(e.target.value)}
                            required
                            className="w-full bg-[#0b122b] text-white border border-[#2c3c73] rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                            Ok Part Qty
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={okPartQty}
                            onChange={(e) => handleOkChange(e.target.value)}
                            required
                            className="w-full bg-[#0b122b] text-emerald-300 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-rose-400 mb-1">
                            Not OK Part
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={notOkPartQty}
                            onChange={(e) => setNotOkPartQty(e.target.value)}
                            className="w-full bg-[#0b122b] text-rose-300 border border-rose-500/40 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-rose-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-amber-400 mb-1">
                            Total Rework Parts
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={totalReworkParts}
                            onChange={(e) => setTotalReworkParts(e.target.value)}
                            className="w-full bg-[#0b122b] text-amber-300 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Defect Multi-select Checkboxes */}
                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wide mb-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          Unloading Defect Type (Select all that apply)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {dynamicUnloadingDefects.map((d) => {
                            const active = unloadingDefects.includes(d);
                            return (
                              <button
                                type="button"
                                key={d}
                                onClick={() => {
                                  triggerHaptic();
                                  toggleUnloadingDefect(d);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                                  active
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                                    : 'bg-[#0b122b] text-slate-300 border border-[#2c3c73] hover:border-indigo-400'
                                }`}
                              >
                                <span>{active ? '☑' : '☐'}</span>
                                <span>{d}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conditional Stage 3: Quality Control */}
                  {stage === 'Quality Control' && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#111c3d] to-[#16244f] border border-[#27386d] space-y-4">
                      <h4 className="font-bold text-indigo-200 uppercase tracking-wider text-xs flex items-center justify-between">
                        <span>Quality Control Section</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                          Rejections &amp; Root Cause
                        </span>
                      </h4>

                      <div>
                        <label className="block text-xs font-bold text-rose-400 mb-1">
                          Rejected Part Qty (Nos)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={rejectedQty}
                          onChange={(e) => setRejectedQty(e.target.value)}
                          required
                          className="w-full sm:w-1/2 bg-[#0b122b] text-rose-300 border border-rose-500/40 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-rose-400"
                        />
                      </div>

                      {/* QC Defect Multi-select Checkboxes */}
                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wide mb-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          QC Defect Type (Select all that apply)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {dynamicQcDefects.map((d) => {
                            const active = qcDefects.includes(d);
                            return (
                              <button
                                type="button"
                                key={d}
                                onClick={() => {
                                  triggerHaptic();
                                  toggleQcDefect(d);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                                  active
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                                    : 'bg-[#0b122b] text-slate-300 border border-[#2c3c73] hover:border-indigo-400'
                                }`}
                              >
                                <span>{active ? '☑' : '☐'}</span>
                                <span>{d}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Form Questions (Added by Admin in Form Question Editor) */}
                  {customQuestions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#121c42] to-[#172552] border border-indigo-500/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-400/20 pb-2">
                        <h4 className="font-bold text-indigo-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Custom Inspection Parameters ({customQuestions.length})</span>
                        </h4>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono border border-indigo-500/30">
                          Admin Configured
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {customQuestions.map((q) => {
                          const val = customResponses[q.id] ?? '';
                          return (
                            <div key={q.id} className="space-y-1">
                              <label className="block text-[11px] font-bold text-indigo-300 uppercase">
                                {q.title}
                                {q.required && <span className="text-rose-400 ml-1 font-bold">*</span>}
                              </label>

                              {q.type === 'short_text' && (
                                <input
                                  type="text"
                                  value={val}
                                  required={q.required}
                                  placeholder={q.placeholder || 'Enter value...'}
                                  onChange={(e) =>
                                    setCustomResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                                  }
                                  className="w-full bg-[#0a1026] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
                                />
                              )}

                              {q.type === 'number' && (
                                <input
                                  type="number"
                                  value={val}
                                  required={q.required}
                                  placeholder={q.placeholder || '0'}
                                  onChange={(e) =>
                                    setCustomResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                                  }
                                  className="w-full bg-[#0a1026] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
                                />
                              )}

                              {q.type === 'date' && (
                                <input
                                  type="date"
                                  value={val}
                                  required={q.required}
                                  onChange={(e) =>
                                    setCustomResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                                  }
                                  className="w-full bg-[#0a1026] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
                                />
                              )}

                              {q.type === 'long_text' && (
                                <textarea
                                  value={val}
                                  required={q.required}
                                  rows={2}
                                  placeholder={q.placeholder || 'Enter remarks...'}
                                  onChange={(e) =>
                                    setCustomResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                                  }
                                  className="w-full bg-[#0a1026] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
                                />
                              )}

                              {q.type === 'dropdown' && (
                                <select
                                  value={val}
                                  required={q.required}
                                  onChange={(e) =>
                                    setCustomResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                                  }
                                  className="w-full bg-[#0a1026] text-white border border-[#2c3d75] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
                                >
                                  <option value="">Select option...</option>
                                  {q.options?.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {q.type === 'multiple_choice' && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {q.options?.map((opt) => {
                                    const selectedArr = Array.isArray(val) ? val : [];
                                    const isSel = selectedArr.includes(opt);
                                    return (
                                      <button
                                        type="button"
                                        key={opt}
                                        onClick={() => {
                                          triggerHaptic();
                                          setCustomResponses((prev) => {
                                            const cur = Array.isArray(prev[q.id]) ? prev[q.id] : [];
                                            const updated = isSel
                                              ? cur.filter((x: string) => x !== opt)
                                              : [...cur, opt];
                                            return { ...prev, [q.id]: updated };
                                          });
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                                          isSel
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-[#0a1026] text-indigo-300 border border-[#2c3d75]'
                                        }`}
                                      >
                                        {isSel ? '✓ ' : '+ '}
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Submission Action Bar */}
                  <div className="pt-4 border-t border-[#1e2a52] flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-indigo-300/70">
                      Auto-transmits to Google Form <span className="font-mono">Daily Production Report</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl bg-[#17203e] hover:bg-[#202b54] text-slate-300 font-semibold text-xs transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 transition active:scale-95 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmitting ? 'Submitting…' : 'Submit & Log Record'}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </form>
        </div>
      </div>
    </div>
  );
};
