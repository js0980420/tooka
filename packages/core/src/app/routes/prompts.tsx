import { Check, Copy, Edit3, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PromptItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  isBuiltIn?: boolean;
};

const BUILT_IN_PROMPTS: PromptItem[] = [
  {
    id: 'carousel-p1',
    title: '圖卡 1：科技風封面 (Hook)',
    category: '開源圖卡實例',
    isBuiltIn: true,
    content:
      '幫我設計一張 IG 圖卡封面，標題是「我開發了一個開源圖文卡片工具」，副標題為「這篇輪播圖就是用這個工具做的」，風格採用現代科技風，主色調為深藍色，加上一個 Canva 式拖曳和防 IG 裁切的標籤按鈕。',
  },
  {
    id: 'carousel-p2',
    title: '圖卡 2：功能痛點與介紹 (Describe)',
    category: '開源圖卡實例',
    isBuiltIn: true,
    content:
      '幫我建立一張功能介紹卡。大標題為「解決 AI 生圖隨機性太高、容易跑版痛點」，下方列出三個圓圈數字點，標題與子說明分別是：「1. 元素可自由拖曳，像 Canva 一樣 (直接拖動元素，微調位置與留白)」、「2. 防 IG 裁切，提供安全區域 (提供 IG 尺寸，上下左右適度留白)」、「3. 固定視覺風格，維持品牌一致性 (固定視覺風格，保持品牌一致性)」。',
  },
  {
    id: 'carousel-p3',
    title: '圖卡 3：自然語言修圖功能 (Refine)',
    category: '開源圖卡實例',
    isBuiltIn: true,
    content:
      '建立一張介紹修圖功能的卡片，大標題是「用自然語言修圖」，副標題是「不只拖曳，開口說就能改」，下方有兩個介紹點：「1. 整張卡下提示詞 (一句話調整整體版面與風格)」、「2. 選取元素再下提示詞 (只針對選中的區塊，精準修改)」。',
  },
  {
    id: 'carousel-p4',
    title: '圖卡 4：下載版型規格說明 (Export)',
    category: '開源圖卡實例',
    isBuiltIn: true,
    content:
      '幫我設計一張規格說明卡。標題為「下載時，選對版型」，副標題為「兩種都是 4:5，差別在重要資訊的安全距離」。下方用兩個卡片框展示規格：「IG 直式 (左右 72px、上下 60px)」與「IG 正方 (左右至少 144px、上下 220px)」，並在底部附上一句警示語「為什麼？4:5 置中裁成正方形時，上下各會少 135px」。',
  },
  {
    id: 'carousel-p5',
    title: '圖卡 5：互動與留言引流 (Cta)',
    category: '開源圖卡實例',
    isBuiltIn: true,
    content:
      '建立一張結尾 CTA 卡片。中間有一個白色圓角底框作為焦點，底框上方有一個藍色膠囊標籤寫著「GET LINK」，底框內大標題是「底下留言圖文卡片」，副標題是「我把工具連結傳給你」。',
  },
];

export function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [activeId, setActiveId] = useState('');
  const [copiedId, setCopiedId] = useState('');

  // 新增/編輯狀態
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('常用提示詞');
  const [formContent, setFormContent] = useState('');

  // 載入資料
  useEffect(() => {
    const stored = localStorage.getItem('open-cards-prompts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PromptItem[];
        setPrompts(parsed);
        if (parsed.length > 0) setActiveId(parsed[0].id);
      } catch {
        setPrompts(BUILT_IN_PROMPTS);
        setActiveId(BUILT_IN_PROMPTS[0].id);
      }
    } else {
      setPrompts(BUILT_IN_PROMPTS);
      setActiveId(BUILT_IN_PROMPTS[0].id);
      localStorage.setItem('open-cards-prompts', JSON.stringify(BUILT_IN_PROMPTS));
    }
  }, []);

  const saveToStorage = (newPrompts: PromptItem[]) => {
    setPrompts(newPrompts);
    localStorage.setItem('open-cards-prompts', JSON.stringify(newPrompts));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    if (editingId) {
      // 編輯
      const updated = prompts.map((p) =>
        p.id === editingId
          ? { ...p, title: formTitle, category: formCategory, content: formContent }
          : p,
      );
      saveToStorage(updated);
      setEditingId(null);
    } else {
      // 新增
      const newPrompt: PromptItem = {
        id: `custom-${Date.now()}`,
        title: formTitle,
        category: formCategory,
        content: formContent,
      };
      const updated = [newPrompt, ...prompts];
      saveToStorage(updated);
      setActiveId(newPrompt.id);
      setIsAdding(false);
    }
    // 重設表單
    setFormTitle('');
    setFormContent('');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = prompts.filter((p) => p.id !== id);
    saveToStorage(updated);
    if (activeId === id && updated.length > 0) {
      setActiveId(updated[0].id);
    }
  };

  const startEdit = (p: PromptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setFormTitle(p.title);
    setFormCategory(p.category);
    setFormContent(p.content);
    setIsAdding(true);
  };

  const currentPrompt = prompts.find((p) => p.id === activeId) ?? prompts[0];

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-hairline px-6 py-4 md:py-6">
        <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl flex items-center gap-2.5">
          <Sparkles className="size-5 text-brand" />
          AI 提示詞助手
        </h1>
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormTitle('');
            setFormContent('');
          }}
        >
          <Plus className="size-4" />
          新增提示詞
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左側選單 */}
        <div className="w-72 shrink-0 border-r border-hairline bg-card/30 overflow-y-auto p-4 space-y-4">
          <div>
            <span className="eyebrow text-xs tracking-wider opacity-60 px-3">常用提示詞清單</span>
            <div className="mt-2 space-y-1">
              {prompts.map((p) => {
                const active = p.id === activeId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActiveId(p.id);
                      setIsAdding(false);
                    }}
                    className={cn(
                      'group flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors text-left',
                      active
                        ? 'bg-brand/10 text-brand'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <div className="truncate pr-2">
                      <span className="text-[10px] opacity-60 block leading-tight font-normal">
                        {p.category}
                      </span>
                      <span className="truncate block font-semibold">{p.title}</span>
                    </div>
                    {!p.isBuiltIn && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => startEdit(p, e)}
                          className="p-1 hover:text-brand"
                          title="編輯"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(p.id, e)}
                          className="p-1 hover:text-red-500"
                          title="刪除"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右側內容區 */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          {isAdding ? (
            <div className="mx-auto max-w-2xl rounded-xl border border-hairline bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                {editingId ? '編輯提示詞' : '新增自訂提示詞'}
              </h2>
              <form onSubmit={handleCreateOrUpdate} className="space-y-4 text-[13px]">
                <div className="space-y-1">
                  <label htmlFor="p-title" className="font-semibold text-muted-foreground">
                    標題名稱
                  </label>
                  <input
                    id="p-title"
                    type="text"
                    required
                    placeholder="例如：直式卡片高質感配色"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-md border bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="p-category" className="font-semibold text-muted-foreground">
                    分類
                  </label>
                  <input
                    id="p-category"
                    type="text"
                    placeholder="例如：我的常用 / 封面排版"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-md border bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="p-content" className="font-semibold text-muted-foreground">
                    提示詞內容
                  </label>
                  <textarea
                    id="p-content"
                    required
                    rows={6}
                    placeholder="請輸入給 AI 助理的提示語句..."
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full rounded-md border bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-brand font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdding(false)}
                  >
                    取消
                  </Button>
                  <Button type="submit" size="sm" className="gap-1.5">
                    <Save className="size-4" />
                    儲存
                  </Button>
                </div>
              </form>
            </div>
          ) : currentPrompt ? (
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                  {currentPrompt.category}
                </span>
                {currentPrompt.isBuiltIn && (
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    內建範例
                  </span>
                )}
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
                  {currentPrompt.title}
                </h2>
              </div>
              <hr className="border-hairline" />

              <div className="relative rounded-xl border bg-muted/40 p-5 font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap select-all">
                {currentPrompt.content}
                <button
                  type="button"
                  onClick={() => handleCopy(currentPrompt.content, currentPrompt.id)}
                  className="absolute right-4 top-4 rounded-md border bg-card p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  title="複製提示詞"
                >
                  {copiedId === currentPrompt.id ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </div>

              <div className="rounded-lg border border-brand/15 bg-brand/5 p-4 text-[12px] text-muted-foreground leading-normal space-y-1.5">
                <span className="font-bold text-brand block">💡 使用技巧：</span>
                <p>
                  點擊右上角的複製按鈕後，您可以在與 AI
                  助理對話時直接貼上此段提示詞，並根據需要修改其中的文字（例如卡片主題、標題文字、或主色調等），即可快速產出精美的圖文卡片原始碼。
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              目前尚未儲存任何提示詞。點擊右上角「新增提示詞」開始吧！
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
