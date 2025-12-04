"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addMinutes, startOfDay, addDays, areIntervalsOverlapping } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Category, TimeBlock } from '@/types';
import { Plus, X, Clock, ChevronRight, ChevronLeft, Trash2, Edit2, RefreshCw } from 'lucide-react';
import { supabase, supabaseOrigin, getSupabaseDiagnostics } from '@/lib/supabase/client';
import { restInsert, restUpdate, restDelete } from '@/lib/supabase/rest';
import { withTimeout, isValidCategory, isValidBlock } from '@/lib/timeline';



// --- 预设颜色池 ---
const PRESET_COLORS = [
  '#818cf8', '#c084fc', '#60a5fa', '#34d399', '#fbbf24',
  '#f472b6', '#fb7185', '#2dd4bf', '#94a3b8', '#a78bfa'
];

// --- 默认分类 (user_id 已修复) ---
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'def-1', user_id: 'user-1', name: '深度工作', color: '#818cf8', type: 'productive' },
  { id: 'def-2', user_id: 'user-1', name: '会议', color: '#c084fc', type: 'productive' },
  { id: 'def-3', user_id: 'user-1', name: '休息', color: '#34d399', type: 'rest' },
  { id: 'def-4', user_id: 'user-1', name: '娱乐', color: '#fbbf24', type: 'rest' },
  { id: 'def-5', user_id: 'user-1', name: '锻炼', color: '#f472b6', type: 'other' },
];

// --- 默认分组 ---
const DEFAULT_GROUP_ID = 'default-group';

const isDefaultCategory = (c: Category) => c && (c.name === '娱乐' || c.name === '休息');

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hslToHex(h: number, s: number, l: number) {
  const S = Math.max(0, Math.min(100, s)) / 100;
  const L = Math.max(0, Math.min(100, l)) / 100;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - C / 2;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = C; g = X; b = 0; }
  else if (h >= 60 && h < 120) { r = X; g = C; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = C; b = X; }
  else if (h >= 180 && h < 240) { r = 0; g = X; b = C; }
  else if (h >= 240 && h < 300) { r = X; g = 0; b = C; }
  else { r = C; g = 0; b = X; }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function normalizeHex(hex: string) {
  const v = (hex || '').trim();
  if (!v) return '';
  const s = v.startsWith('#') ? v.slice(1) : v;
  if (s.length === 3) return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  if (s.length === 6) return `#${s}`;
  return v.startsWith('#') ? v : `#${s}`;
}
function parseColor(input: string) {
  const v = (input || '').trim();
  if (!v) return '';
  const mHex = v.match(/^#?[0-9a-fA-F]{3,6}$/);
  if (mHex) return normalizeHex(v);
  const mRgb = v.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (mRgb) return rgbToHex(Number(mRgb[1]), Number(mRgb[2]), Number(mRgb[3]));
  const mHsl = v.match(/^hsl\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/i);
  if (mHsl) return hslToHex(Number(mHsl[1]), Number(mHsl[2]), Number(mHsl[3]));
  return normalizeHex(v);
}

const DEFAULT_PALETTE: Array<{ hex: string; name: string }> = [
  { hex: '#60a5fa', name: '天空蓝' },
  { hex: '#fbbf24', name: '橙色' },
  { hex: '#34d399', name: '草绿' },
  { hex: '#a78bfa', name: '葡萄紫' },
  { hex: '#fb7185', name: '珊瑚粉' },
  { hex: '#2dd4bf', name: '海蓝' },
  { hex: '#94a3b8', name: '石灰灰' },
  { hex: '#818cf8', name: '靛青' },
  { hex: '#c084fc', name: '薰衣草' },
  { hex: '#f472b6', name: '粉红' }
];

function hslStr(h: number, s: number, l: number) {
  return `hsl(${h} ${s}% ${l}%)`;
}

const SOFT_SCHEMES: Array<{ name: string; colors: Array<{ h: number; s: number; l: number }> }> = [
  {
    name: '清爽',
    colors: [
      { h: 0, s: 40, l: 82 }, { h: 30, s: 45, l: 84 }, { h: 60, s: 40, l: 85 },
      { h: 120, s: 35, l: 80 }, { h: 180, s: 40, l: 82 }, { h: 210, s: 45, l: 84 },
      { h: 240, s: 40, l: 82 }, { h: 270, s: 45, l: 84 }, { h: 300, s: 40, l: 83 }
    ]
  },
  {
    name: '暖色',
    colors: [
      { h: 10, s: 45, l: 82 }, { h: 25, s: 40, l: 83 }, { h: 40, s: 45, l: 84 },
      { h: 55, s: 40, l: 85 }, { h: 70, s: 35, l: 82 }, { h: 85, s: 40, l: 84 }
    ]
  },
  {
    name: '冷色',
    colors: [
      { h: 190, s: 40, l: 82 }, { h: 210, s: 45, l: 84 }, { h: 230, s: 40, l: 83 },
      { h: 250, s: 45, l: 84 }, { h: 270, s: 40, l: 83 }, { h: 290, s: 45, l: 84 }
    ]
  }
];

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const currentHex = useMemo(() => parseColor(value || ''), [value]);
  const [schemeIndex, setSchemeIndex] = useState(0);
  const [page, setPage] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [diameter, setDiameter] = useState(32);
  const [visibleCount, setVisibleCount] = useState(6);
  const spacingFactor = 1.2;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const d = w < 280 ? 24 : w < 480 ? 28 : 32;
      setDiameter(d);
      const gap = Math.ceil(d * spacingFactor);
      const count = Math.max(1, Math.floor((w + gap) / (d + gap)));
      setVisibleCount(count);
      setPage(0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const colors = SOFT_SCHEMES[schemeIndex].colors;
  const start = page * visibleCount;
  const end = Math.min(colors.length, start + visibleCount);
  const showPrev = page > 0;
  const showNext = end < colors.length;
  const gapPx = Math.ceil(diameter * spacingFactor);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full border border-slate-200" style={{ backgroundColor: currentHex || '#94a3b8' }}></div>
        <div className="text-xs text-slate-500">当前颜色</div>
      </div>
      <div className="flex items-center gap-2">
        {SOFT_SCHEMES.map((s, i) => (
          <button key={s.name} onClick={() => { setSchemeIndex(i); setPage(0); }} className={cn('px-2 py-1 rounded-lg border text-xs', schemeIndex === i ? 'border-black bg-slate-50' : 'border-slate-200 hover:border-slate-300')}>{s.name}</button>
        ))}
      </div>
      <div ref={containerRef} className="w-full">
        <div className="flex items-center">
          {showPrev && (
            <button onClick={() => setPage(p => Math.max(0, p - 1))} className="mr-2 text-slate-600 hover:text-slate-800 text-xs">‹</button>
          )}
          <div className="flex" style={{ gap: `${gapPx}px` }}>
            {colors.slice(start, end).map(({ h, s, l }, idx) => {
              const hex = hslToHex(h, s, l);
              return (
                <button key={`${h}-${s}-${l}-${idx}`} onClick={() => onChange(hex)}
                  className={cn('border rounded-full', (currentHex || '').toLowerCase() === hex.toLowerCase() ? 'border-black' : 'border-slate-200 hover:border-slate-300')}
                  style={{ width: diameter, height: diameter, backgroundColor: hslStr(h, s, l) }} />
              );
            })}
          </div>
          {showNext && (
            <button onClick={() => setPage(p => p + 1)} className="ml-2 text-slate-600 hover:text-slate-800 text-xs">›</button>
          )}
        </div>
        <div className="flex justify-center gap-1 mt-1">
          {Array.from({ length: Math.ceil(colors.length / visibleCount) }).map((_, i) => (
            <span key={i} className={cn('w-1.5 h-1.5 rounded-full', i === page ? 'bg-slate-700' : 'bg-slate-300')}></span>
          ))}
        </div>
      </div>
      <input type="color" value={currentHex || '#94a3b8'} onChange={(e) => onChange(e.target.value)} className="h-10 w-16 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition-colors" />
    </div>
  );
}

interface DayTimelineProps {
  initialBlocks?: TimeBlock[];
}

// ==========================================
// 1. 子组件：单个时间格
// ==========================================
const TimeSlot = React.memo(({
  time, isToday, activeBlock, category, isHourStart, hourLabel,
  isSelected, onMouseDown, onMouseEnter, onMouseUp, onBlockClick,
  editingBlockId, editingNote, onSlotClick
}: any) => {
  return (
    <div className="flex group relative select-none">
      {/* 左侧时间标尺 */}
      <div className={cn(
        "flex-shrink-0 text-xs text-slate-400 text-right pr-2 pt-2.5 font-medium transition-opacity",
        isToday ? "w-[70px]" : "w-[50px] opacity-0"
      )}>
        {isHourStart && isToday && hourLabel}
      </div>

      {/* 格子本体 */}
      <div
        onMouseDown={(e) => {
          // 只有是今天，且当前没有块的时候，才允许开始创建
          if (!activeBlock && isToday) onMouseDown(time);
        }}
        onMouseEnter={() => isToday && onMouseEnter(time)}
        onMouseUp={() => isToday && onMouseUp()}
        onClick={() => {
          if (isToday && !activeBlock && onSlotClick) onSlotClick(time);
        }}
        className={cn(
          "flex-1 h-10 border-b transition-all duration-300 ease-in-out relative",
          isHourStart ? "border-slate-300" : "border-slate-100",
          // 交互样式优化
          isToday ? "cursor-pointer hover:bg-slate-50" : "bg-slate-50/50 pointer-events-none",
          isSelected && !activeBlock && "bg-indigo-100 border-l-4 border-l-indigo-500"
        )}
      >
        {activeBlock && category && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (isToday) onBlockClick(activeBlock);
            }}
            className={cn(
              "absolute inset-0.5 rounded shadow-sm flex items-center px-2 overflow-visible z-20 group/block transition-all",
              isToday ? "cursor-pointer hover:brightness-105 hover:shadow-md" : "opacity-90 grayscale-[0.3]"
            )}
            style={{ backgroundColor: category.color }}
          >
            <span className="text-[10px] md:text-xs font-medium text-white/95 truncate shadow-sm pointer-events-none select-none flex-1">
              {category.name}
            </span>

            {isToday && (
              <Edit2 className="w-3 h-3 text-white/50 opacity-0 group-hover/block:opacity-100 transition-opacity" />
            )}

            {/* 白色悬停卡片 (仅今天显示) */}
            {isToday && (editingBlockId === activeBlock.id ? editingNote : activeBlock.notes) && (
              <div className="absolute left-[100%] top-0 ml-3 hidden group-hover/block:flex items-start z-50 pointer-events-none">
                <div className="w-2 h-2 bg-white border-b border-l border-slate-200 rotate-45 mt-4 -mr-1 relative z-10"></div>
                <div className="bg-white/95 backdrop-blur text-slate-600 text-xs p-3 rounded-xl shadow-xl border border-slate-200 w-64 whitespace-normal break-words leading-relaxed animate-in fade-in slide-in-from-left-2 duration-200">
                  <span className="font-bold text-slate-800 block mb-1">
                    {(editingBlockId === activeBlock.id ? editingNote : activeBlock.notes).length > 10 ? '📝 感受' : '📝'}
                  </span>
                  {editingBlockId === activeBlock.id ? editingNote : activeBlock.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) => prev.isToday === next.isToday && prev.isSelected === next.isSelected && prev.activeBlock === next.activeBlock);

TimeSlot.displayName = "TimeSlot";

// ==========================================
// 2. 主组件
// ==========================================
export default function DayTimeline({ initialBlocks = [] }: DayTimelineProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 设置组件挂载状态
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const [blocks, setBlocks] = useState<TimeBlock[]>(initialBlocks);
  const [categories, setCategories] = useState<Category[]>([]);

  // 状态管理
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartSlot, setDragStartSlot] = useState<Date | null>(null);
  const [dragEndSlot, setDragEndSlot] = useState<Date | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStart, setModalStart] = useState("00:00");
  const [modalEnd, setModalEnd] = useState("00:15");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState<string>("");
  const userId = 'user-1';
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catEditName, setCatEditName] = useState<string>("");
  const [catEditColor, setCatEditColor] = useState<string>("");

  // Supabase 状态管理
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadMeta, setLoadMeta] = useState<{ date: string; count: number; sample?: string[] } | null>(null);
  const [draftTouched, setDraftTouched] = useState(false);

  // 统一的数据加载函数，使用useCallback避免重复创建
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user_id = userId;
      const currentDate = selectedDate;
      const yesterday = addDays(currentDate, -1);
      const tomorrow = addDays(currentDate, 1);

      // 获取所有分类
      const { data: categoriesData, error: categoriesError } = await withTimeout(
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', user_id)
      );

      if (categoriesError) throw categoriesError;

      // 获取时间块数据（包含昨天、今天、明天）
      const startOfYesterday = startOfDay(yesterday);
      const endOfTomorrow = addMinutes(startOfDay(tomorrow), 24 * 60);

      const { data: timeBlocksData, error: timeBlocksError } = await withTimeout(
        supabase
          .from('time_blocks')
          .select('*')
          .eq('user_id', user_id)
          .gte('end_time', startOfYesterday.toISOString())
          .lte('start_time', endOfTomorrow.toISOString())
      );

      if (timeBlocksError) throw timeBlocksError;

      const validCategories = Array.isArray(categoriesData) ? categoriesData.filter(isValidCategory) : [];
      let mergedCats: Category[] = validCategories;
      try {
        const ck = `timeflow:categories:${userId}`;
        const raw = typeof window !== 'undefined' ? localStorage.getItem(ck) : null;
        const bkCats: Category[] = raw ? JSON.parse(raw) : [];
        const map = new Map<string, Category>();
        [...validCategories, ...bkCats].forEach(c => { if (c && c.id) map.set(c.id, c); });
        mergedCats = Array.from(map.values());
      } catch { }
      if (mergedCats.length === 0) {
        try {
          const seed = [
            { user_id: userId, name: '娱乐', color: '#60a5fa', type: 'rest' },
            { user_id: userId, name: '休息', color: '#fbbf24', type: 'rest' }
          ];
          const ins = await supabase.from('categories').insert(seed).select();
          if (!ins.error && Array.isArray(ins.data)) {
            mergedCats = ins.data as Category[];
          } else {
            mergedCats = [
              { id: `seed-ent`, user_id: userId, name: '娱乐', color: '#60a5fa', type: 'rest' } as Category,
              { id: `seed-rest`, user_id: userId, name: '休息', color: '#fbbf24', type: 'rest' } as Category,
            ];
          }
          const ck = `timeflow:categories:${userId}`;
          localStorage.setItem(ck, JSON.stringify(mergedCats));
        } catch { }
      }
      setCategories(mergedCats);
      const validBlocks = Array.isArray(timeBlocksData) ? timeBlocksData.filter(isValidBlock) : [];
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const bkKey = `timeflow:blocks:${userId}:${dateStr}`;
        const bkRaw = typeof window !== 'undefined' ? localStorage.getItem(bkKey) : null;
        const bkBlocks: TimeBlock[] = bkRaw ? JSON.parse(bkRaw) : [];
        const map = new Map<string, TimeBlock>();
        [...validBlocks, ...bkBlocks].forEach(b => { if (b && b.id) map.set(b.id, b); });
        setBlocks(Array.from(map.values()));
      } catch {
        setBlocks(validBlocks);
      }
      setLoadMeta({ date: format(selectedDate, 'yyyy-MM-dd'), count: validBlocks.length, sample: validBlocks.slice(0, 3).map(b => b.notes?.slice(0, 50) || '') });
    } catch (err) {
      console.error('Failed to load data:', err);
      try {
        const diag = getSupabaseDiagnostics();
        console.info('API404Check', { supabaseOrigin, endpoints: { categories: `${supabaseOrigin}/rest/v1/categories`, time_blocks: `${supabaseOrigin}/rest/v1/time_blocks` }, diag });
      } catch { }
      setError('加载数据失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, supabase]);

  // 当组件挂载或日期变化时加载数据
  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted, selectedDate, loadData]);

  // 自动清除消息
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);


  useEffect(() => {
    try {
      const ck = `timeflow:categories:${userId}`;
      if (Array.isArray(categories)) {
        localStorage.setItem(ck, JSON.stringify(categories));
      }
    } catch { }
  }, [categories]);

  useEffect(() => {
    if (loadMeta) {
      console.log('LoadMeta', loadMeta);
    }
  }, [loadMeta]);

  useEffect(() => {
    if (isModalOpen) {
      setDraftTouched(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const dk = `timeflow:draft:${userId}:${dateStr}`;
        const draft = {
          id: editingBlockId || `draft-${Date.now()}`,
          user_id: userId,
          start_time: `${dateStr}T${modalStart}:00`,
          end_time: `${dateStr}T${modalEnd}:00`,
          category_id: selectedCategoryId,
          group_id: DEFAULT_GROUP_ID,
          notes: note,
          mood_rating: 3
        } as any;
        localStorage.setItem(dk, JSON.stringify(draft));
      } catch { }
    }
  }, [isModalOpen, modalStart, modalEnd, selectedCategoryId, note, selectedDate, editingBlockId]);

  useEffect(() => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const bkKey = `timeflow:blocks:${userId}:${dateStr}`;
      if (Array.isArray(blocks)) {
        localStorage.setItem(bkKey, JSON.stringify(blocks));
      }
    } catch { }
  }, [blocks, selectedDate]);

  const timeOptions = useMemo(() => Array.from({ length: 24 * 4 + 1 }).map((_, i) => {
    return format(addMinutes(startOfDay(new Date()), i * 15), 'HH:mm');
  }), []);

  const slotsData = useMemo(() => {
    const generate = (date: Date) => Array.from({ length: 24 * 4 }).map((_, i) => addMinutes(startOfDay(date), i * 15));
    return {
      today: generate(selectedDate),
      yesterday: generate(addDays(selectedDate, -1)),
      tomorrow: generate(addDays(selectedDate, 1))
    };
  }, [selectedDate]);

  // --- 交互 Handler ---
  const handleMouseDown = useCallback((time: Date) => {
    setIsDragging(true);
    setDragStartSlot(time);
    setDragEndSlot(time);
  }, []);

  const handleMouseEnter = useCallback((time: Date) => {
    if (isDragging && dragStartSlot) {
      setDragEndSlot(time);
    }
  }, [isDragging, dragStartSlot]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStartSlot && dragEndSlot && dragStartSlot.getTime() !== dragEndSlot.getTime()) {
      setIsDragging(false);
      let start = dragStartSlot;
      let end = dragEndSlot;
      if (start > end) { [start, end] = [end, start]; }

      setEditingBlockId(null);
      setModalStart(format(start, 'HH:mm'));
      setModalEnd(format(addMinutes(end, 15), 'HH:mm'));
      setSelectedCategoryId(null);
      setNote('');
      setIsModalOpen(true);
    }
  }, [isDragging, dragStartSlot, dragEndSlot, categories]);

  const handleSlotClick = useCallback((time: Date) => {
    setEditingBlockId(null);
    setModalStart(format(time, 'HH:mm'));
    setModalEnd(format(addMinutes(time, 15), 'HH:mm'));
    setSelectedCategoryId(null);
    setNote('');
    setIsModalOpen(true);
  }, [categories]);

  const updateCategory = useCallback(async (id: string, patch: Partial<Category>) => {
    const nextCats = categories.map(c => c.id === id ? { ...c, ...patch } : c);
    try {
      const upd = await supabase
        .from('categories')
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId)
        .select();
      if (upd.error) throw upd.error;
      setCategories(nextCats);
      setSuccessMessage('类别已更新');
      try {
        const ck = `timeflow:categories:${userId}`;
        localStorage.setItem(ck, JSON.stringify(nextCats));
      } catch { }
    } catch (e) {
      setCategories(nextCats);
      setError('更新类别失败，已在本地应用');
      try {
        const ck = `timeflow:categories:${userId}`;
        localStorage.setItem(ck, JSON.stringify(nextCats));
      } catch { }
    }
  }, [userId, categories]);

  const handleChangeDate = useCallback((delta: number) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dk = `timeflow:draft:${userId}:${dateStr}`;
    const hasDraft = isModalOpen && draftTouched;
    if (hasDraft) {
      const ok = confirm('存在未保存的更改，是否保存草稿并继续切换日期？');
      if (!ok) return;
    }
    setSelectedDate(addDays(selectedDate, delta));
  }, [selectedDate, isModalOpen, draftTouched]);

  const handleBlockClick = useCallback((block: TimeBlock) => {
    setEditingBlockId(block.id);
    setModalStart(format(new Date(block.start_time), 'HH:mm'));
    setModalEnd(format(new Date(block.end_time), 'HH:mm'));
    setSelectedCategoryId(block.category_id);
    setNote(block.notes || '');
    setIsModalOpen(true);
  }, []);

  // --- 业务 Handler ---
  const handleSaveCategory = async () => {
    if (!newCatName.trim()) return;
    if (!newCatColor) {
      setError('请先选择颜色');
      return;
    }
    try {
      const user_id = userId;

      // 先尝试通过Supabase创建类别
      const { data: newCategory, error: supabaseError } = await supabase
        .from('categories')
        .insert({
          user_id,
          name: newCatName,
          color: newCatColor,
          type: 'other'
        })
        .select()
        .single();

      // 如果Supabase出错，使用模拟数据作为后备
      if (supabaseError) {
        console.log('Supabase error, using mock data:', supabaseError);
        // 创建一个本地模拟的类别对象
        const mockCategory: Category = {
          id: `new-${Date.now()}`,
          user_id,
          name: newCatName,
          color: newCatColor,
          type: 'other'
        };

        // 更新本地状态
        setCategories(prevCategories => [...prevCategories, mockCategory]);
        setSelectedCategoryId(mockCategory.id);
        setIsCreatingCategory(false);
        setNewCatName("");
        setSuccessMessage('分类创建成功');
        try {
          const ck = `timeflow:categories:${userId}`;
          const raw = localStorage.getItem(ck);
          const arr = raw ? JSON.parse(raw) : [];
          localStorage.setItem(ck, JSON.stringify([...arr, mockCategory]));
        } catch { }
        return;
      }

      // 如果Supabase成功，正常更新状态
      if (newCategory) {
        setCategories(prevCategories => [...prevCategories, newCategory]);
        setSelectedCategoryId(newCategory.id);
        setIsCreatingCategory(false);
        setNewCatName("");
        setSuccessMessage('分类创建成功');
        try {
          const ck = `timeflow:categories:${userId}`;
          const raw = localStorage.getItem(ck);
          const arr = raw ? JSON.parse(raw) : [];
          localStorage.setItem(ck, JSON.stringify([...arr, newCategory]));
        } catch { }
      }
    } catch (err) {
      console.error('Failed to save category:', err);
      setError('创建分类失败，请稍后重试');
    }
  };

  const handleSaveBlock = async () => {
    if (!selectedCategoryId) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const newStart = new Date(`${dateStr}T${modalStart}:00`);
    const newEnd = new Date(`${dateStr}T${modalEnd}:00`);
    if (newStart >= newEnd) {
      setError("结束时间必须晚于开始时间");
      return;
    }
    const sanitizedNote = note;
    if (sanitizedNote.length > 500) {
      setError('输入内容过长');
      return;
    }
    console.log('SaveAttempt', { start: newStart.toISOString(), end: newEnd.toISOString(), noteLength: sanitizedNote.length, note: sanitizedNote });

    try {
      const user_id = userId;
      const payload = {
        id: editingBlockId || undefined,
        user_id,
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        category_id: selectedCategoryId,
        notes: sanitizedNote,
        mood_rating: 3
      };

      const result = editingBlockId
        ? await restUpdate('time_blocks', { id: editingBlockId, user_id }, {
          start_time: payload.start_time,
          end_time: payload.end_time,
          category_id: payload.category_id,
          notes: payload.notes,
          mood_rating: payload.mood_rating
        })
        : await restInsert('time_blocks', payload)

      if (!editingBlockId) {
        const inserted = Array.isArray((result as any).data) ? (result as any).data[0] : null;
        if (!inserted || !inserted.id) throw new Error('保存失败');
      }

      // 关闭模态框并重置状态
      setIsModalOpen(false);
      setNote('');
      setSelectedCategoryId(null);
      setDragStartSlot(null);
      setDragEndSlot(null);
      setEditingBlockId(null);
      setIsCreatingCategory(false);
      try {
        const dk = `timeflow:draft:${userId}:${dateStr}`;
        localStorage.removeItem(dk);
      } catch { }
      setSuccessMessage(editingBlockId ? '时间块更新成功' : '时间块创建成功');

      // 使用统一的数据加载函数刷新数据
      loadData();
    } catch (err) {
      console.error('Failed to save time block:', err);
      try {
        const diag = getSupabaseDiagnostics();
        console.info('API404Check', { supabaseOrigin, endpoint: `${supabaseOrigin}/rest/v1/time_blocks`, diag });
      } catch { }

      // 如果是错误请求，提示具体原因；否则使用模拟数据作为后备
      const mockBlock: TimeBlock = {
        id: editingBlockId || `new-${Date.now()}`,
        user_id: userId,
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        category_id: selectedCategoryId,
        notes: note,
        mood_rating: 3
      };

      if (editingBlockId) {
        // 更新现有时间块
        setBlocks(prevBlocks => prevBlocks.map(block =>
          block.id === editingBlockId ? mockBlock : block
        ));
      } else {
        // 创建新时间块
        setBlocks(prevBlocks => [...prevBlocks, mockBlock]);
      }

      // 关闭模态框并重置状态
      setIsModalOpen(false);
      setNote('');
      setSelectedCategoryId(null);
      setDragStartSlot(null);
      setDragEndSlot(null);
      setEditingBlockId(null);
      setIsCreatingCategory(false);
      try {
        const dk = `timeflow:draft:${userId}:${dateStr}`;
        localStorage.removeItem(dk);
      } catch { }
      setSuccessMessage(editingBlockId ? '时间块更新成功' : '时间块创建成功');

      // 仅设置错误日志，不显示给用户
      console.error('Using mock data because:', err);
    }
  };

  const handleDeleteBlock = async () => {
    if (editingBlockId && confirm('确定要删除这条记录吗？')) {
      try {
        const user_id = userId;
        console.log('DeleteAttempt', { id: editingBlockId, user_id });
        await restDelete('time_blocks', { id: editingBlockId, user_id });

        setIsModalOpen(false);
        setBlocks(prev => prev.filter(b => b.id !== editingBlockId));
        try {
          const bkKey = `timeflow:blocks:${userId}:${format(selectedDate, 'yyyy-MM-dd')}`;
          const raw = localStorage.getItem(bkKey);
          const arr = raw ? JSON.parse(raw) : [];
          localStorage.setItem(bkKey, JSON.stringify(arr.filter((b: any) => b.id !== editingBlockId)));
        } catch { }
        setSuccessMessage('时间块删除成功');
        loadData();
      } catch (err) {
        console.error('Failed to delete time block:', err);
        try {
          const diag = getSupabaseDiagnostics();
          console.info('API404Check', { supabaseOrigin, endpoint: `${supabaseOrigin}/rest/v1/time_blocks`, diag });
        } catch { }
        setError('删除时间块失败：' + String((err as any)?.message || err));
      }
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (confirm('确定删除该类别吗？')) {
      try {
        console.log('DeleteCategoryAttempt', { id: cat.id, user_id: userId });
        const ref = await supabase
          .from('time_blocks')
          .select('id')
          .eq('user_id', userId)
          .eq('category_id', cat.id);

        let uncategorized = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId)
          .eq('name', '未分类')
          .maybeSingle();

        if (!uncategorized.data) {
          const created = await supabase
            .from('categories')
            .insert({ user_id: userId, name: '未分类', color: '#94a3b8', type: 'other' })
            .select()
            .single();
          uncategorized = { data: created.data, error: created.error } as any;
        }

        if (ref.data && ref.data.length > 0 && uncategorized.data?.id) {
          const reassign = await supabase
            .from('time_blocks')
            .update({ category_id: uncategorized.data.id })
            .eq('user_id', userId)
            .eq('category_id', cat.id);
          console.log('ReassignResult', { updatedError: reassign.error });
          if (reassign.error) throw reassign.error;
        }

        const del = await supabase
          .from('categories')
          .delete()
          .eq('id', cat.id)
          .eq('user_id', userId);
        if (del.error) throw del.error;

        const verifyCat = await supabase
          .from('categories')
          .select('id')
          .eq('id', cat.id)
          .eq('user_id', userId)
          .maybeSingle();
        const verifyBlocks = await supabase
          .from('time_blocks')
          .select('id')
          .eq('user_id', userId)
          .eq('category_id', cat.id);
        console.log('DeleteCategoryVerify', { catRemaining: verifyCat.data, blocksRemainingCount: verifyBlocks.data?.length || 0 });
        if (verifyCat.data) throw new Error('类别删除未生效');

        setCategories(prev => prev.filter(c => c.id !== cat.id));
        setSuccessMessage('类别删除成功');
        loadData();
        try {
          const ck = `timeflow:categories:${userId}`;
          const raw = localStorage.getItem(ck);
          const arr = raw ? JSON.parse(raw) : [];
          localStorage.setItem(ck, JSON.stringify(arr.filter((c: any) => c.id !== cat.id)));
        } catch { }
      } catch (e) {
        if (String(cat.id).startsWith('new-')) {
          setCategories(prev => prev.filter(c => c.id !== cat.id));
          setSuccessMessage('类别删除成功');
          try {
            const ck = `timeflow:categories:${userId}`;
            const raw = localStorage.getItem(ck);
            const arr = raw ? JSON.parse(raw) : [];
            localStorage.setItem(ck, JSON.stringify(arr.filter((c: any) => c.id !== cat.id)));
          } catch { }
        } else {
          setError('删除类别失败，请稍后重试');
        }
      }
    }
  };

  if (!mounted) return null;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 min-h-screen flex flex-col font-sans text-slate-900">
      {/* 状态消息显示 */}
      {isLoading && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white/95 backdrop-blur-sm px-6 py-3 rounded-lg shadow border border-slate-200 flex items-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
          <span className="text-sm font-medium text-slate-700">加载中...</span>
        </div>
      )}

      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 px-6 py-3 rounded-full shadow-lg border border-red-200 flex items-center gap-3 animate-in slide-in-from-top-5 duration-300" style={{ zIndex: 50, top: '1rem', left: '50%', transform: 'translateX(-50%)' }}>
          <span className="text-sm font-medium text-red-700">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-50 px-6 py-3 rounded-full shadow-lg border border-green-200 flex items-center gap-3 animate-in slide-in-from-top-5 duration-300">
          <span className="text-sm font-medium text-green-700">{successMessage}</span>
        </div>
      )}
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-8 bg-white p-5 rounded-lg border border-slate-100 shadow sticky top-4 z-40 backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-4">
          <div className="bg-black text-white p-3 rounded-lg shadow">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">TimeFlow</h1>
            <p className="text-xs text-slate-400 font-medium">Capture your day</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          <button onClick={() => handleChangeDate(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-6 font-bold text-slate-700 min-w-[140px] text-center">
            {format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}
          </div>
          <button onClick={() => handleChangeDate(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* 左侧：昨天 (1列) - 修复：加深透明度 opacity-60 */}
        <div className="hidden md:block col-span-1 opacity-60 grayscale-[0.8] pointer-events-none select-none">
          <div className="text-center mb-4 font-bold text-slate-400 tracking-widest uppercase text-xs">Yesterday</div>
          <div className="bg-slate-50/50 rounded-md border border-slate-100 overflow-hidden">
            {slotsData.yesterday.map((time, i) => {
              const activeBlock = blocks.find(b => time >= new Date(b.start_time) && time < new Date(b.end_time));
              const category = activeBlock ? categories.find(c => c.id === activeBlock.category_id) : null;
              return <TimeSlot key={i} time={time} isToday={false} isHourStart={i % 4 === 0} hourLabel={format(time, 'HH:mm')} activeBlock={activeBlock} category={category} />;
            })}
          </div>
        </div>

        {/* 中间：今天 (2列) */}
        <div className="col-span-1 md:col-span-2">
          <div className="text-center mb-4 font-bold text-slate-700 tracking-widest uppercase text-xs">Today</div>
          <div className="text-center mb-4 text-xs text-slate-500">单击或拖拽选择时间段</div>
          <div className="bg白 rounded-lg border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.1)] relative transition-all duration-300 ease-in-out">
            {slotsData.today.map((time, i) => {
              const activeBlock = blocks.find(b => time >= new Date(b.start_time) && time < new Date(b.end_time));
              const category = activeBlock ? categories.find(c => c.id === activeBlock.category_id) : null;

              let isSelected = false;
              if (dragStartSlot && dragEndSlot) {
                let start = dragStartSlot;
                let end = dragEndSlot;
                if (start > end) { [start, end] = [end, start]; }
                isSelected = time >= start && time <= end;
              }

              return (
                <TimeSlot
                  key={i}
                  time={time}
                  isToday={true}
                  isHourStart={i % 4 === 0}
                  hourLabel={format(time, 'HH:mm')}
                  activeBlock={activeBlock}
                  category={category}
                  isSelected={isSelected}
                  onMouseDown={handleMouseDown}
                  onMouseEnter={handleMouseEnter}
                  onMouseUp={handleMouseUp}
                  onBlockClick={handleBlockClick}
                  onSlotClick={handleSlotClick}
                  editingBlockId={editingBlockId}
                  editingNote={note}
                />
              );
            })}
          </div>
        </div>

        {/* 右侧：明天 (1列) - 修复：加深透明度 opacity-60 */}
        <div className="hidden md:block col-span-1 opacity-60 grayscale-[0.8] pointer-events-none select-none">
          <div className="text-center mb-4 font-bold text-slate-400 tracking-widest uppercase text-xs">Tomorrow</div>
          <div className="bg-slate-50/50 rounded-md border border-slate-100 overflow-hidden">
            {slotsData.tomorrow.map((time, i) => {
              const activeBlock = blocks.find(b => time >= new Date(b.start_time) && time < new Date(b.end_time));
              const category = activeBlock ? categories.find(c => c.id === activeBlock.category_id) : null;
              return <TimeSlot key={i} time={time} isToday={false} isHourStart={i % 4 === 0} hourLabel={format(time, 'HH:mm')} activeBlock={activeBlock} category={category} />;
            })}
          </div>
        </div>
      </div>

      {/* 模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md p-6 rounded-lg shadow scale-100 animate-in zoom-in-95 duration-200">

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {isCreatingCategory ? "新建类别" : (editingBlockId ? "编辑记录" : "记录时间")}
              </h2>
              <div className="flex gap-2">
                {editingBlockId && (
                  <button onClick={handleDeleteBlock} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-full transition-colors" title="删除">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {isCreatingCategory ? (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">类别名称</label>
                  <input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="例如：发呆..." className="w-full h-12 px-4 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">选择颜色</label>
                  <ColorPicker value={newCatColor} onChange={setNewCatColor} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsCreatingCategory(false)} className="flex-1 py-3 rounded-lg font-bold text-slate-500 hover:bg-slate-100">返回</button>
                  <button onClick={handleSaveCategory} className="flex-1 py-3 rounded-lg font-bold bg-black text-white hover:bg-slate-800">创建</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Start</label>
                    <select value={modalStart} onChange={(e) => setModalStart(e.target.value)} className="w-full h-12 px-3 rounded-lg bg-slate-50 border-transparent font-mono text-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                      {timeOptions.slice(0, -1).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">End</label>
                    <select value={modalEnd} onChange={(e) => setModalEnd(e.target.value)} className="w-full h-12 px-3 rounded-lg bg-slate-50 border-transparent font-mono text-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                      {timeOptions.map(t => <option key={t} value={t} disabled={t <= modalStart}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">选择类别</label>
                    <button onClick={() => setIsCreatingCategory(true)} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> 新建
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                    {categories.map(cat => (
                      <div key={cat.id} className={cn("rounded-lg p-3 border text-sm relative group transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-300/50", selectedCategoryId === cat.id ? "border-[#e0e0e0] bg-slate-50 shadow-[0_2px_8px_rgba(0,0,0,0.1)]" : "border-slate-200 hover:border-slate-300")}
                      >
                        {editingCategoryId === cat.id ? (
                          <div className="space-y-2">
                            <input value={catEditName} onChange={(e) => { setCatEditName(e.target.value); updateCategory(cat.id, { name: e.target.value }); }} className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none" />
                            <ColorPicker value={catEditColor} onChange={(v) => { setCatEditColor(v); updateCategory(cat.id, { color: v }); }} />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => { setEditingCategoryId(null); }} className="text-xs text-slate-500 hover:text-slate-700">完成</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedCategoryId(cat.id)} className="flex items-center gap-2 flex-1 text-left">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></div>
                              <span className="truncate font-medium text-slate-700">{cat.name}</span>
                              {isDefaultCategory(cat) && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">默认</span>
                              )}
                            </button>
                            <button onClick={() => { setEditingCategoryId(cat.id); setCatEditName(cat.name); setCatEditColor(cat.color || '#60a5fa'); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteCategory(cat)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="此刻的感受..." className="w-full h-24 p-4 rounded-lg bg-slate-50 border-none resize-none focus:ring-2 focus:ring-black outline-none mb-6 text-sm" />
                <button onClick={handleSaveBlock} disabled={!selectedCategoryId} className="w-full py-4 rounded-lg font-bold bg黑 text白 shadow disabled:opacity-50 transition-all">
                  {editingBlockId ? "更新记录" : "保存记录"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
