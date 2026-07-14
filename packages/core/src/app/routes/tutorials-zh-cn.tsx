import { AtSign, Move, Share2, Sliders, Smartphone } from 'lucide-react';
import type { TutorialArticle } from './tutorials-article';

export const tutorialArticlesZhCN: TutorialArticle[] = [
  {
    id: 'inspect',
    title: '使用 Inspect 与 AI 协同修改',
    icon: Sliders,
    category: '核心功能',
    content: (
      <div className="space-y-6">
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
          <h3 className="text-brand font-semibold text-base flex items-center gap-2">
            💡 这是什么功能？
          </h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            <code>tooka</code> 是首个专为 AI 协同开发而生的卡片框架。右上角的{' '}
            <strong>Inspect</strong> 审查功能让您直接点击画面上的元素来指引 AI
            修改代码，无需手动找行数或编辑位置。
          </p>
        </div>

        <section className="space-y-4">
          <h4 className="text-base font-semibold">三步协作闭环 (The Loop)</h4>
          <div className="grid gap-4 sm:grid-cols-3 text-[12.5px]">
            <div className="rounded-lg border bg-card p-4">
              <span className="font-mono text-brand font-bold">STEP 1</span>
              <h5 className="font-medium mt-1">开启 Inspect</h5>
              <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                点击编辑器右上角的 <strong>Inspect</strong>{' '}
                按钮，绿框会跟随并选取鼠标滑过的卡片元素。
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <span className="font-mono text-brand font-bold">STEP 2</span>
              <h5 className="font-medium mt-1">点击留言</h5>
              <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                点击想要修改的元素，留下一句修改意见（例如：
                <em>「把字体放大并改成 Mint Green 色」</em>）并保存。
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <span className="font-mono text-brand font-bold">STEP 3</span>
              <h5 className="font-medium mt-1">让 AI 自动应用</h5>
              <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                在对话框中对 AI 助理说 <strong>「帮我应用留言修改」</strong>，AI
                会自动去读取源代码中的标记并修改 React 代码！
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">源代码中的运作机制</h4>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            当您保存留言时，系统会在卡片文件中自动插入隐藏的注释标签。您的 AI
            代理读取这些标签后即可精确对齐目标元素进行代码重构：
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
    title: 'IG 竖版图文卡片与安全边距',
    icon: Smartphone,
    category: '排版规格',
    content: (
      <div className="space-y-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          Instagram 的轮播图文目前以 <strong>4:5 比例 (1080 × 1350)</strong>{' '}
          的竖版画布为主流。然而，IG 在「个人主页 (Profile Grid)」中会将图片裁切为 **1:1 正方形**
          显示。为此，我们提供了两种安全边距变体：
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4 bg-card">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              📐 1. 长方尺寸 (原图边距)
            </h4>
            <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
              默认选项。完整利用 4:5 的宽敞竖版画布，左右边距设定为 <strong>72px</strong>
              ，上下边距设定为 <strong>60px</strong>
              。画面留白精致大气，适用于用户滑过贴文时的呈现。
            </p>
          </div>
          <div className="rounded-lg border p-4 bg-card">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              ⬜ 2. 正方尺寸 (安全区边距)
            </h4>
            <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
              防裁切选项。整体画面内容会往中央收缩（自动应用 <strong>0.84</strong>{' '}
              倍的缩放），左右边距设定为 <strong>144px</strong>，上下边距设定为{' '}
              <strong>220px</strong>。确保核心信息在 1:1 主页九宫格预览时绝不被截断。
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">如何切换与预览</h4>
          <p className="text-[13px] text-muted-foreground">
            在卡片编辑器界面右侧的下载菜单中，您可以随时在 <strong>长方尺寸</strong> 与{' '}
            <strong>正方尺寸</strong> 之间点选切换，画面会实时呈现缩放效果，导出时也会依此尺寸渲染。
          </p>
        </section>
      </div>
    ),
  },
  {
    id: 'dnd',
    title: '图片拖拽与定位小技巧',
    icon: Move,
    category: '高级操作',
    content: (
      <div className="space-y-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          <code>tooka</code> 提供了流畅的拖拽上传与定位功能，让您在设计卡片时更像在使用
          Canva，但背后生成的依然是纯 React 代码。
        </p>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold font-mono">
              1
            </div>
            <div>
              <h4 className="font-semibold text-sm">直接拖拽文件上传</h4>
              <p className="text-[12px] text-muted-foreground mt-1">
                您可以直接将本机的图片文件（PNG/JPG）拖拽进编辑器左侧的资源面板中，系统会自动将其加入项目的资产目录。
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold font-mono">
              2
            </div>
            <div>
              <h4 className="font-semibold text-sm">图片拖拽至画布</h4>
              <p className="text-[12px] text-muted-foreground mt-1">
                从资源面板中，直接拖拽该图片到画布的任何位置，代码中会立刻创建对应的{' '}
                <code>Image</code> 组件。
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold font-mono">
              3
            </div>
            <div>
              <h4 className="font-semibold text-sm">选取框拖拽与防抖动画</h4>
              <p className="text-[12px] text-muted-foreground mt-1">
                在画布上选取元素后，可以直接按住进行拖拽移动。移动时系统会动态禁用 CSS Transition
                动画并自动测量最新坐标，保证拖拽过程无撕裂、无延迟。
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ig-api',
    title: '如何自动发布到 IG (API 申请)',
    icon: Share2,
    category: '高级集成',
    content: (
      <div className="space-y-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          若想实现一键自动发布卡片至 Instagram，您需要申请 Meta 的{' '}
          <strong>Instagram Graph API</strong>。这需要将您的 IG
          账号转为专业（商业/创作者）账号并绑定至 Facebook 公共主页。
        </p>

        <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
          <h3 className="text-brand font-semibold text-base flex items-center gap-2">
            🎥 实用视频教学推荐
          </h3>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
            为了帮助您快速完成 Meta Developer App 的创建与密钥申请，我们强烈推荐观看以下详尽的
            YouTube 视频教学：
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
                  alt="YouTube 视频封面预览"
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
                  IG API 申请与自动发布步骤教学 🎬
                </h4>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  点击在新标签页打开 YouTube 观看视频
                </p>
              </div>
            </a>
          </div>
        </div>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">四个核心申请步骤</h4>
          <div className="space-y-3 text-[12.5px]">
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                1
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>转换专业账号</strong>：将您的 Instagram
                账号转换为「商业账号」或「创作者账号」，并创建一个 Facebook 公共主页与其关联绑定。
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                2
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>创建 Meta 应用</strong>：注册 Meta for Developers
                开发者账号，在后台点选「创建应用 (Create App)」，类型选择「商业 (Business)」。
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                3
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>设置 Graph API 与权限</strong>：在应用中加入「Instagram Graph
                API」产品，并使用 Graph API 测试工具申请 <code>instagram_basic</code>、
                <code>instagram_content_publish</code> 等权限。
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                4
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>生成长期访问令牌</strong>：将短效令牌 (Short-Lived Access Token) 兑换为 60
                天的长效令牌 (Long-Lived Access Token)，以便您的代码在后台能稳定调用 API
                自动排程发布贴文。
              </p>
            </div>
          </div>
        </section>
      </div>
    ),
  },
  {
    id: 'threads-api',
    title: '如何自动发布到 Threads (API 申请)',
    icon: AtSign,
    category: '高级集成',
    content: (
      <div className="space-y-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          若想一键自动发布卡片至 Threads，您需要通过 Meta 的 <strong>Threads API</strong>{' '}
          取得访问令牌。Threads API 是独立的使用案例，不需要绑定 Facebook 公共主页，申请流程比
          Instagram 简单许多。
        </p>

        <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
          <h3 className="text-brand font-semibold text-base flex items-center gap-2">
            💡 你需要准备什么？
          </h3>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
            一个 Threads 账号，以及一个 Meta for Developers 开发者账号（用 Facebook
            账号即可免费注册）。全程不需审核即可对自己的账号发文。
          </p>
        </div>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">四个核心申请步骤</h4>
          <div className="space-y-3 text-[12.5px]">
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                1
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>创建 Meta 应用</strong>：前往{' '}
                <a
                  href="https://developers.facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  Meta for Developers
                </a>{' '}
                点选「创建应用」，使用案例选择「<strong>访问 Threads API</strong>」。
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                2
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>勾选权限</strong>：在应用的 Threads 使用案例设置中，启用{' '}
                <code>threads_basic</code> 与 <code>threads_content_publish</code>{' '}
                两项权限（前者读取账号信息、后者发布贴文）。
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                3
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>加入 Threads 测试人员</strong>
                ：在「应用角色」中把自己的 Threads 账号加为测试人员，然后到 Threads App 的「设置 →
                账号 → 网站权限 → 邀请」接受邀请。
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                4
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>生成长效访问令牌</strong>：在 Meta 后台 Threads
                使用案例的访问令牌工具中，直接生成 <strong>60 天的长效令牌</strong>
                （请勿使用约 1 小时就过期的短效令牌）。将令牌粘贴到「Connects → Threads
                API」保存后，系统会自动取得账号 ID，并在到期前自动更新令牌。
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">小提醒</h4>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Threads 的长效令牌有效期为 60 天。只要保持 tooka 定期打开使用，系统会在到期前 10
            天内自动帮您更新令牌；若令牌已完全过期，回 Meta 后台重新生成一颗长效令牌，到 Connects
            页面粘贴即可。短效令牌（约 1 小时）无法自动延期，请务必在后台选择长效令牌。
          </p>
        </section>
      </div>
    ),
  },
];
