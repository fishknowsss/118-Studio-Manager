
type ToolLink = {
  title: string
  desc: string
  url: string
}

const WEB_TOOLS: ToolLink[] = [
  {
    title: 'Coolors',
    desc: '快速生成与搭配调色板，支持导出 CSS 变量与色卡。',
    url: 'https://coolors.co/',
  },
  {
    title: 'Adobe Color',
    desc: '色轮配色工具，支持从图片提取主色调。',
    url: 'https://color.adobe.com/',
  },
  {
    title: 'TinyPNG',
    desc: '压缩 PNG/JPG 资源图，适合页面发布前处理。',
    url: 'https://tinypng.com/',
  },
  {
    title: 'Mixkit',
    desc: '免费高质量视频素材、音效与音乐，可商用。',
    url: 'https://mixkit.co/',
  },
  {
    title: 'LottieFiles',
    desc: '轻量级动画素材库，JSON 格式可嵌入网页与 App。',
    url: 'https://lottiefiles.com/',
  },
  {
    title: 'Fonts In Use',
    desc: '真实项目字体使用案例库，寻找排版灵感。',
    url: 'https://fontsinuse.com/',
  },
  {
    title: 'FFMPEG.WASM Demo',
    desc: '浏览器内转码工具，无需安装，快速处理视频片段。',
    url: 'https://ffmpegwasm.netlify.app/',
  },
  {
    title: 'Kuula',
    desc: '快速创建和分享 360° 全景图，可用于沉浸式影像演示。',
    url: 'https://kuula.co/',
  },
  {
    title: 'Marzipano',
    desc: '开源 360° VR 查看器与演示示例，适合全景展示原型。',
    url: 'https://www.marzipano.net/',
  },
  {
    title: '360Cities',
    desc: '全球全景摄影素材库，适合寻找实景全景参考与视觉灵感。',
    url: 'https://www.360cities.net/',
  },
  {
    title: 'ImageToSTL',
    desc: '将图片转换为 3D 打印可用的 STL 浮雕模型，适合装置与实体作品制作。',
    url: 'https://imagetostl.com/',
  },
  {
    title: "Shea's FrameG",
    desc: '从视频帧序列生成 GIF，轻量快速，适合短片预览与素材展示。',
    url: 'https://sheasframeg.com/',
  },
  {
    title: 'EZGIF',
    desc: '在线 GIF 制作、裁剪、帧编辑与格式转换，简单高效。',
    url: 'https://ezgif.com/',
  },
  {
    title: 'Bigjpg',
    desc: 'AI 超分辨率放大图片，无损保留细节，适合低分辨率素材补救。',
    url: 'https://bigjpg.com/',
  },
  {
    title: 'Image to ASCII',
    desc: '将图片转换为 ASCII 字符画，适合生成字符风格视觉素材。',
    url: 'https://www.asciiart.eu/image-to-ascii',
  },
  {
    title: 'SOJSON 在线工具箱',
    desc: '中文综合在线工具集，颜色转换、时间戳、Base64、二维码等。',
    url: 'https://www.sojson.com/',
  },
]

const INSPIRATION_LINKS: ToolLink[] = [
  {
    title: 'Vimeo Staff Picks',
    desc: 'Vimeo 编辑精选视频，涵盖实验影像、动画与纪录短片，品质上乘。',
    url: 'https://vimeo.com/channels/staffpicks',
  },
  {
    title: 'Pexels Videos',
    desc: '高质量免费影像素材库，适合快速搭建影像概念与视觉参考。',
    url: 'https://www.pexels.com/videos/',
  },
  {
    title: 'Videvo',
    desc: '免费影像与动态背景下载，适合直接拿来做剪辑参考。',
    url: 'https://www.videvo.net/',
  },
  {
    title: 'Coverr',
    desc: '免版权短视频素材，适合快速测试视觉方向与场景氛围。',
    url: 'https://coverr.co/',
  },
  {
    title: 'Videezy',
    desc: '海量免费高清视频素材库，适合快速寻找动态参考与剪辑元素。',
    url: 'https://www.videezy.com/',
  },
  {
    title: 'Pixabay Music',
    desc: '免版权音乐与音效库，适合为影像作品补入背景与节奏。',
    url: 'https://pixabay.com/music/',
  },
  {
    title: 'Freesound',
    desc: '用户上传的开放音效库，适合寻找环境音、机械声与实验合成素材。',
    url: 'https://freesound.org/',
  },
  {
    title: 'Free Music Archive',
    desc: '免费音乐收藏，适合为影像短片挑选氛围乐与版权友好配乐。',
    url: 'https://freemusicarchive.org/',
  },
]

const TOOL_ACCENT_COLORS: Record<string, string> = {
  'Coolors': '#2ecc71',
  'Adobe Color': '#ff0000',
  'TinyPNG': '#0d6efd',
  'Mixkit': '#6f42c1',
  'LottieFiles': '#ff5a5f',
  'Fonts In Use': '#212529',
  'FFMPEG.WASM Demo': '#6f42c1',
  'Kuula': '#00b3e6',
  'Marzipano': '#3d5afe',
  '360Cities': '#0047ab',
  'ImageToSTL': '#ff8c00',
  "Shea's FrameG": '#ff2d55',
  'EZGIF': '#f7c600',
  'Bigjpg': '#2864ff',
  'Image to ASCII': '#7d3cff',
  'SOJSON 在线工具箱': '#ff922b',
  'Vimeo Staff Picks': '#1ab7ea',
  'Pexels Videos': '#111111',
  'Videvo': '#0097a7',
  'Coverr': '#0b84ff',
  'Videezy': '#00c4ff',
  'Pixabay Music': '#00b894',
  'Freesound': '#f56a00',
  'Free Music Archive': '#3456db',
}

export function Tools() {
  return (
    <div className="view-tools fade-in">
      <div className="view-header">
        <h1 className="view-title">工具</h1>
      </div>

      <div className="view-body tools-view-body">
        <section className="tools-section">
          <h2 className="tools-section-title">灵感与参考</h2>
          <div className="tools-grid">
            {INSPIRATION_LINKS.map((link) => (
              <a key={link.title} className="tool-card" href={link.url} target="_blank" rel="noreferrer">
                <div className="tool-card-title">{link.title}</div>
                <div className="tool-card-desc">{link.desc}</div>
                <div className="tool-card-footer">
                  <svg
                    className="tool-card-arrow"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: TOOL_ACCENT_COLORS[link.title] || 'currentColor' }}
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="tools-section">
          <h2 className="tools-section-title">常见在线工具</h2>
          <div className="tools-grid">
            {WEB_TOOLS.map((tool) => (
              <a key={tool.title} className="tool-card" href={tool.url} target="_blank" rel="noreferrer">
                <div className="tool-card-title">{tool.title}</div>
                <div className="tool-card-desc">{tool.desc}</div>
                <div className="tool-card-footer">
                  <svg
                    className="tool-card-arrow"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: TOOL_ACCENT_COLORS[tool.title] || 'currentColor' }}
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
