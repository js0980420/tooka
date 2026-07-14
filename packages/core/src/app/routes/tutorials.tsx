import { BookOpen, Move, Share2, Sliders, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Article = {
  id: string;
  title: string;
  icon: any;
  category: string;
  content: React.ReactNode;
};

export function TutorialsPage() {
  const [activeId, setActiveId] = useState('inspect');

  const articles: Article[] = [
    {
      id: 'inspect',
      title: '使用 Inspect 與 AI 協同修改',
      icon: Sliders,
      category: '核心功能',
      content: (
        <div className="space-y-6">
          <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
            <h3 className="text-brand font-semibold text-base flex items-center gap-2">
              💡 這是什麼功能？
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              <code>open-cards</code> 是首個專為 AI 協同開發而生的卡片框架。右上角的{' '}
              <strong>Inspect</strong> 審查功能讓您直接點擊畫面上的元素來指引 AI
              修改程式碼，無需手動找行數或編輯位置。
            </p>
          </div>

          <section className="space-y-4">
            <h4 className="text-base font-semibold">三步協作閉環 (The Loop)</h4>
            <div className="grid gap-4 sm:grid-cols-3 text-[12.5px]">
              <div className="rounded-lg border bg-card p-4">
                <span className="font-mono text-brand font-bold">STEP 1</span>
                <h5 className="font-medium mt-1">開啟 Inspect</h5>
                <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                  點擊編輯器右上角的 <strong>Inspect</strong>{' '}
                  按鈕，綠框會跟隨並選取滑鼠滑過的卡片元素。
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <span className="font-mono text-brand font-bold">STEP 2</span>
                <h5 className="font-medium mt-1">點擊留言</h5>
                <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                  點擊想要修改的元素，留下一句修改意見（例如：
                  <em>「把字體放大並改成 Mint Green 色」</em>）並儲存。
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <span className="font-mono text-brand font-bold">STEP 3</span>
                <h5 className="font-medium mt-1">讓 AI 自動套用</h5>
                <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                  在對話框中對 AI 助理說 <strong>「幫我套用留言修改」</strong>，AI
                  會自動去讀取原始碼中的標記並修改 React 程式碼！
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-base font-semibold">原始碼中的運作機制</h4>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              當您保存留言時，系統會在卡片檔案中自動插入隱藏的註解標籤。您的 AI
              代理人讀取這些標籤後即可精確對齊目標元素進行代碼重構：
            </p>
            <pre className="rounded-lg bg-muted p-4 font-mono text-[12px] text-foreground overflow-x-auto border">
              {`{/* @slide-comment id="c-xxxx" ts="2026-07-14T00:00:00Z" text="..." */}`}
            </pre>
          </section>
        </div>
      ),
    },
    {
      id: 'margins',
      title: 'IG 直式圖文卡片與安全邊距',
      icon: Smartphone,
      category: '排版規格',
      content: (
        <div className="space-y-6">
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            Instagram 的輪播圖文目前以 <strong>4:5 比例 (1080 × 1350)</strong>{' '}
            的直式畫布為主流。然而，IG 在「個人主頁 (Profile Grid)」中會將圖片裁切為 **1:1 正方形**
            顯示。為此，我們提供了兩種安全邊距變體：
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4 bg-card">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                📐 1. 長方尺寸 (原圖邊距)
              </h4>
              <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
                預設選項。完整利用 4:5 的寬敞直式畫布，左右邊距設定為 <strong>72px</strong>
                ，上下邊距設定為 <strong>60px</strong>
                。畫面留白精緻大氣，適用於使用者滑過貼文時的呈現。
              </p>
            </div>
            <div className="rounded-lg border p-4 bg-card">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                ⬜ 2. 正方尺寸 (安全區邊距)
              </h4>
              <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
                防裁切選項。整體畫面內容會往中央收縮（自動套用 <strong>0.84</strong>{' '}
                倍的縮放），左右邊距設定為 <strong>144px</strong>，上下邊距設定為{' '}
                <strong>220px</strong>。確保核心資訊在 1:1 首頁九宮格預覽時絕不被截斷。
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <h4 className="text-base font-semibold">如何切換與預覽</h4>
            <p className="text-[13px] text-muted-foreground">
              在卡片編輯器介面右側的下載選單中，您可以隨時在 <strong>長方尺寸</strong> 與{' '}
              <strong>正方尺寸</strong>{' '}
              之間點選切換，畫面會即時呈現縮放效果，導出時也會依此尺寸渲染。
            </p>
          </section>
        </div>
      ),
    },
    {
      id: 'dnd',
      title: '圖片拖曳與定位小技巧',
      icon: Move,
      category: '進階操作',
      content: (
        <div className="space-y-6">
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            <code>open-cards</code> 提供了流暢的拖曳上傳與定位功能，讓您在設計卡片時更像在使用
            Canva，但背後生成的依然是純 React 程式碼。
          </p>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold font-mono">
                1
              </div>
              <div>
                <h4 className="font-semibold text-sm">直接拖曳檔案上傳</h4>
                <p className="text-[12px] text-muted-foreground mt-1">
                  您可以直接將本機的圖片檔案（PNG/JPG）拖曳進編輯器左側的資源面板中，系統會自動將其加入專案的資產目錄。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold font-mono">
                2
              </div>
              <div>
                <h4 className="font-semibold text-sm">圖片拖曳至畫布</h4>
                <p className="text-[12px] text-muted-foreground mt-1">
                  從資源面板中，直接拖曳該圖片到畫布的任何位置，程式碼中會立刻建立對應的{' '}
                  <code>Image</code> 元件。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold font-mono">
                3
              </div>
              <div>
                <h4 className="font-semibold text-sm">選取框拖曳與防抖動畫</h4>
                <p className="text-[12px] text-muted-foreground mt-1">
                  在畫布上選取元素後，可以直接按住進行拖曳移動。移動時系統會動態禁用 CSS Transition
                  動畫並自動量測最新座標，保證拖曳過程無撕裂、無延遲。
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'ig-api',
      title: '如何自動發佈到 IG (API 申請)',
      icon: Share2,
      category: '進階整合',
      content: (
        <div className="space-y-6">
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            若想實現一鍵自動發佈卡片至 Instagram，您需要申請 Meta 的{' '}
            <strong>Instagram Graph API</strong>。這需要將您的 IG
            帳號轉為專業（商業/創作者）帳號並綁定至 Facebook 粉絲專頁。
          </p>

          <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
            <h3 className="text-brand font-semibold text-base flex items-center gap-2">
              🎥 實用影片教學推薦
            </h3>
            <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
              為了幫助您快速完成 Meta Developer App 的建立與金鑰申請，我們極力推薦觀看以下詳盡的
              YouTube 影片教學：
            </p>
            <div className="mt-4">
              <a
                href="https://www.youtube.com/watch?v=O1qfeDIZRkQ&t=2s"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block overflow-hidden rounded-xl border border-border bg-card shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{ maxWidth: '440px' }}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  <img
                    src="https://img.youtube.com/vi/O1qfeDIZRkQ/maxresdefault.jpg"
                    alt="YouTube 影片封面預覽"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = 'https://img.youtube.com/vi/O1qfeDIZRkQ/hqdefault.jpg';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35">
                    <div className="flex size-14 items-center justify-center rounded-full bg-brand text-background shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <svg aria-hidden="true" className="size-6 fill-current" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-[13px] leading-snug group-hover:text-brand transition-colors">
                    IG API 申請與自動發佈步驟教學 🎬
                  </h4>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    點擊在新分頁開啟 YouTube 觀看影片
                  </p>
                </div>
              </a>
            </div>
          </div>

          <section className="space-y-3">
            <h4 className="text-base font-semibold">四個核心申請步驟</h4>
            <div className="space-y-3 text-[12.5px]">
              <div className="flex gap-3">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                  1
                </div>
                <p className="text-muted-foreground leading-normal">
                  <strong>轉換專業帳號</strong>：將您的 Instagram
                  帳號轉換為「商業帳號」或「創作者帳號」，並建立一個 Facebook 粉絲專頁與其關聯綁定。
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                  2
                </div>
                <p className="text-muted-foreground leading-normal">
                  <strong>建立 Meta 應用程式</strong>：註冊 Meta for Developers
                  開發者帳號，在後台點選「建立應用程式 (Create App)」，類型選擇「商業 (Business)」。
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                  3
                </div>
                <p className="text-muted-foreground leading-normal">
                  <strong>設定 Graph API 與權限</strong>：在應用程式中加入「Instagram Graph
                  API」產品，並使用 Graph API 測試工具申請 <code>instagram_basic</code>、
                  <code>instagram_content_publish</code> 等權限。
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                  4
                </div>
                <p className="text-muted-foreground leading-normal">
                  <strong>產生長期存取權杖</strong>：將短效權杖 (Short-Lived Access Token) 兌換為 60
                  天的長效權杖 (Long-Lived Access Token)，以便您的程式碼在背景能穩定調用 API
                  自動排程發佈貼文。
                </p>
              </div>
            </div>
          </section>
        </div>
      ),
    },
  ];

  const currentArticle = articles.find((a) => a.id === activeId) ?? articles[0];
  const ActiveIcon = currentArticle.icon;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-hairline px-6 py-4 md:py-6">
        <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl flex items-center gap-2.5">
          <BookOpen className="size-5 text-brand" />
          教學指南與手冊
        </h1>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* 左側文章清單 */}
        <div className="w-64 shrink-0 border-r border-hairline bg-card/30 overflow-y-auto p-4 space-y-4">
          <div>
            <span className="eyebrow text-xs tracking-wider opacity-60 px-3">文章分類</span>
            <div className="mt-2 space-y-1">
              {articles.map((art) => {
                const Icon = art.icon;
                const active = art.id === activeId;
                return (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => setActiveId(art.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors text-left',
                      active
                        ? 'bg-brand/10 text-brand'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{art.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右側文章內容 */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                {currentArticle.category}
              </span>
            </div>
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-3">
                <ActiveIcon className="size-7 text-brand shrink-0" />
                {currentArticle.title}
              </h2>
            </div>
            <hr className="border-hairline" />
            <div className="text-foreground leading-relaxed">{currentArticle.content}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
