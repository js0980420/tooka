import { AtSign, Bot, Camera, Move, Share2, Smartphone, Users } from 'lucide-react';
import type { TutorialArticle } from './tutorials-article';

export const tutorialArticlesZhTW: TutorialArticle[] = [
  {
    id: 'ai-card-workflow',
    title: '用 AI Agent 生圖卡並一鍵發布',
    icon: Bot,
    category: '快速入門',
    content: (
      <div className="space-y-6">
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
          <h3 className="text-brand font-semibold text-base flex items-center gap-2">
            從一句提示詞，到三個社群平台
          </h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            <code>tooka</code> 讓您直接對 AI Agent 下提示詞產生整組圖卡。您可以先參考教學提供的
            提示詞範例，再依品牌、主題與受眾手動微調；完成後連接 Instagram、Facebook 與 Threads 三大
            Meta API，就能一次發布到所有已選平台。
          </p>
        </div>

        <section className="space-y-4">
          <div>
            <h4 className="text-base font-semibold">第一次製作，照這四步走</h4>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              不需要先學設計工具，也不必從空白提示詞開始。
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 text-[12.5px]">
            <div className="rounded-lg border bg-card p-4">
              <span className="font-mono text-brand font-bold">STEP 1</span>
              <h5 className="font-medium mt-1">挑一段教學提示詞</h5>
              <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                到「提示詞」頁選擇最接近需求的範例並複製。範例已包含圖卡頁數、內容結構、版面與視覺風格，
                可以直接作為起點。
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <span className="font-mono text-brand font-bold">STEP 2</span>
              <h5 className="font-medium mt-1">交給 AI Agent 生圖卡</h5>
              <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                將提示詞貼給支援專案操作的 AI Agent。Agent 會依指示建立多頁圖卡，完成後可立即在
                tooka 預覽完整輪播效果。
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <span className="font-mono text-brand font-bold">STEP 3</span>
              <h5 className="font-medium mt-1">手動微調提示詞</h5>
              <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                把範例中的主題、文案、色彩或圖片描述換成自己的內容。若只想改某個元素，可用 Inspect
                點選後留下修改提示，再請 Agent 套用留言。
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <span className="font-mono text-brand font-bold">STEP 4</span>
              <h5 className="font-medium mt-1">連接 Meta API 一鍵發布</h5>
              <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                在 Connects 完成三個平台的 API
                設定，進入「發布」勾選目標平台、確認貼文文案，按一次即可同步發布圖卡。
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">可以直接貼給 Agent 的提示詞</h4>
          <pre className="rounded-lg bg-muted p-4 font-mono text-[12px] text-foreground overflow-x-auto border">
            {`請為「自由工作者如何建立個人品牌」製作 6 張 IG 輪播圖卡。
第一張用一句有張力的問題作為封面；中間四張各講一個可執行步驟；
最後一張整理重點並加入收藏、分享的行動呼籲。
使用溫暖米白底、深墨綠文字與橘紅色重點，版面簡潔、適合手機閱讀。`}
          </pre>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            先替換引號內的主題，再調整頁數、受眾、語氣、配色與行動呼籲。描述越具體，Agent
            越容易產出接近預期的初稿；不確定怎麼寫時，直接沿用範例也可以。
          </p>
          <a
            href="/prompts"
            className="inline-flex rounded-lg border border-brand/25 bg-brand/5 px-3.5 py-2 text-[12.5px] font-semibold text-brand transition-colors hover:bg-brand/10"
          >
            查看更多提示詞範例
          </a>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">一次串接三大 Meta API</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <Camera className="size-4 text-brand" />
              <h5 className="mt-2 text-sm font-semibold">Instagram</h5>
              <p className="mt-1 text-[11.5px] leading-normal text-muted-foreground">
                透過 Instagram Graph API 發布多頁輪播圖卡。
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <Users className="size-4 text-brand" />
              <h5 className="mt-2 text-sm font-semibold">Facebook</h5>
              <p className="mt-1 text-[11.5px] leading-normal text-muted-foreground">
                透過 Facebook Graph API 發布粉絲專頁多圖貼文。
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <AtSign className="size-4 text-brand" />
              <h5 className="mt-2 text-sm font-semibold">Threads</h5>
              <p className="mt-1 text-[11.5px] leading-normal text-muted-foreground">
                透過 Threads API 發布圖卡與貼文文字。
              </p>
            </div>
          </div>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            API 只需在 Connects 設定一次。之後每組圖卡都能在發布頁自由勾選平台，不必重複上傳圖片或
            複製貼文內容；若尚未申請權杖，可繼續閱讀後面的 Instagram 與 Threads API 教學。
          </p>
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
              ⬜ 2. 正方尺寸 (1080 × 1080)
            </h4>
            <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
              匯出時會把 4:5 畫布置中裁切成真正的 <strong>1080 × 1080</strong> 正方形檔案，上傳 IG
              就是完整的 1:1 貼文。內容自動往中央收縮（
              <strong>0.84</strong> 倍縮放），左右邊距至少 <strong>144px</strong>
              ——大於主頁九宮格以 3:4 顯示時左右各裁掉的 135px，重要資訊不會被切。
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">如何切換與預覽</h4>
          <p className="text-[13px] text-muted-foreground">
            在卡片編輯器介面右側的下載選單中，您可以隨時在 <strong>長方尺寸</strong> 與{' '}
            <strong>正方尺寸</strong>{' '}
            之間點選切換。切到正方時，會被裁掉的上下區域會壓暗顯示，並以虛線標出主頁格狀檢視的左右安全區；下載的檔案就是
            1080 × 1080 正方形。
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
          <code>tooka</code> 提供了流暢的拖曳上傳與定位功能，讓您在設計卡片時更像在使用
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
  {
    id: 'threads-api',
    title: '如何自動發佈到 Threads (API 申請)',
    icon: AtSign,
    category: '進階整合',
    content: (
      <div className="space-y-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          若想一鍵自動發佈卡片至 Threads（脆），您需要透過 Meta 的 <strong>Threads API</strong>{' '}
          取得存取權杖。Threads API 是獨立的使用案例，不需要綁定 Facebook 粉絲專頁，申請流程比
          Instagram 簡單許多。
        </p>

        <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
          <h3 className="text-brand font-semibold text-base flex items-center gap-2">
            💡 你需要準備什麼？
          </h3>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
            一個 Threads 帳號，以及一個 Meta for Developers 開發者帳號（用 Facebook
            帳號即可免費註冊）。全程不需審核即可對自己的帳號發文。
          </p>
        </div>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">四個核心申請步驟</h4>
          <div className="space-y-3 text-[12.5px]">
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                1
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>建立 Meta 應用程式</strong>：前往{' '}
                <a
                  href="https://developers.facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  Meta for Developers
                </a>{' '}
                點選「建立應用程式」，使用案例選擇「<strong>存取 Threads API</strong>」。
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                2
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>勾選權限</strong>：在應用程式的 Threads 使用案例設定中，啟用{' '}
                <code>threads_basic</code> 與 <code>threads_content_publish</code>{' '}
                兩項權限（前者讀取帳號資訊、後者發布貼文）。
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                3
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>加入 Threads 測試人員</strong>
                ：在「應用程式角色」中把自己的 Threads 帳號加為測試人員，然後到 Threads App 的「設定
                → 帳號 → 網站權限 → 邀請」接受邀請。
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                4
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>產生長效存取權杖</strong>：在 Meta 後台 Threads
                使用案例的存取權杖工具中，直接產生 <strong>60 天的長效權杖</strong>
                （請勿使用約 1 小時就過期的短效權杖）。將權杖貼到「Connects → Threads
                API」儲存後，系統會自動取得帳號 ID，並在到期前自動更新權杖。
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">小提醒</h4>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Threads 的長效權杖有效期為 60 天。只要保持 tooka 定期開啟使用，系統會在到期前 10
            天內自動幫您更新權杖；若權杖已完全過期，回 Meta 後台重新產生一顆長效權杖，到 Connects
            頁面貼上即可。短效權杖（約 1 小時）無法自動延期，請務必在後台選擇長效權杖。
          </p>
        </section>
      </div>
    ),
  },
];
