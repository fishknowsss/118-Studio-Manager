export type QuoteMotivationPair = {
  text: string
  src: string
  motivation: string
}

export type QuoteItem = Pick<QuoteMotivationPair, 'text' | 'src'>
export type QuoteSelection = { quote: QuoteItem; motivation: string }

export const BUILTIN_QUOTE_MOTIVATION_PAIRS: QuoteMotivationPair[] = [
  {
    text: 'Du sollst der werden, der du bist.（成为你自己。）',
    src: '尼采《快乐的科学》',
    motivation: '别急着迎合现成答案，用行动长成你真正认可的自己。',
  },
  {
    text: 'Das Wahre ist das Ganze.（真理是整体。）',
    src: '黑格尔《精神现象学》',
    motivation: '别被局部输赢困住，把它放回完整过程里判断。',
  },
  {
    text: 'Le désir de l’homme est le désir de l’Autre.（人的欲望是他者的欲望。）',
    src: '拉康《研讨班 I》',
    motivation: '分清你真正想要的，和你只是想从别人那里得到认可的。',
  },
  {
    text: 'Die Grenzen meiner Sprache bedeuten die Grenzen meiner Welt.',
    src: '维特根斯坦《逻辑哲学论》5.6',
    motivation: '为问题找到更准确的词，你就扩大了可行动的范围。',
  },
  {
    text: 'Non ridere, non lugere, neque detestari, sed intelligere.',
    src: '斯宾诺莎《政治论》I.4',
    motivation: '先理解机制，再决定介入；清醒比情绪反应更有力量。',
  },
  {
    text: 'Créer, c’est vivre deux fois.（创造，就是活两次。）',
    src: '加缪《西西弗神话》',
    motivation: '把经验变成作品，你就多活出了一层可能。',
  },
  {
    text: 'L’existence précède l’essence.（存在先于本质。）',
    src: '萨特《存在主义是一种人道主义》',
    motivation: '不用等一个固定答案；你今天的选择正在定义你。',
  },
  {
    text: 'On ne naît pas femme : on le devient.（女人不是天生的，而是成为的。）',
    src: '波伏瓦《第二性》',
    motivation: '身份不是终点，持续行动会改写它。',
  },
  {
    text: 'ἦθος ἀνθρώπῳ δαίμων.（性格即命运。）',
    src: '赫拉克利特，残篇 B119',
    motivation: '反复选择会沉淀成性格，性格又会塑造未来。',
  },
  {
    text: 'Non terrae plus ultra',
    src: '格言',
    motivation: '边界不是终点；再向前一步，看看地图外还有什么。',
  },
  {
    text: 'Men are disturbed not by things, but by the views they take of them.',
    src: '爱比克泰德《手册》5',
    motivation: '先区分事实和判断，你就能把力量收回到可改变之处。',
  },
  {
    text: 'Livet skal forstås baglæns, men leves forlæns.（回望理解，向前生活。）',
    src: '克尔凯郭尔《日记》JJ:167',
    motivation: '从过去提炼经验，但把下一步放在今天完成。',
  },
  {
    text: 'Attention is the rarest and purest form of generosity.',
    src: '西蒙娜·薇依，致若埃·布斯凯书信',
    motivation: '把完整注意力交给眼前的人和事，这本身就是一种给予。',
  },
  {
    text: 'Là où il y a pouvoir, il y a résistance.（哪里有权力，哪里就有反抗。）',
    src: '福柯《性史 I》',
    motivation: '看见阻力，说明你已经碰到真实的结构。',
  },
  {
    text: 'Créer, c’est résister.（创造就是抵抗。）',
    src: '德勒兹《什么是创造行为？》',
    motivation: '今天完成一个创造性的动作，就是在给惯性设置阻力。',
  },
  {
    text: 'The body is our general medium for having a world.',
    src: '梅洛-庞蒂《知觉现象学》',
    motivation: '身体不是思想之外的负担；照顾状态，也是照顾判断。',
  },
  {
    text: 'My experience is what I agree to attend to.',
    src: '威廉·詹姆斯《心理学原理》',
    motivation: '把注意力给真正重要的事，经验才会从噪声里成形。',
  },
  {
    text: 'Wo Es war, soll Ich werden.（本我所在之处，自我应当到来。）',
    src: '弗洛伊德《精神分析新论》',
    motivation: '把被回避的部分带进意识，选择才真正开始。',
  },
  {
    text: 'The good life is a process, not a state of being.',
    src: '卡尔·罗杰斯《成为一个人》',
    motivation: '别等一个完美终点，用持续调整把方向活出来。',
  },
  {
    text: 'We can be blind to the obvious, and we are also blind to our blindness.',
    src: '丹尼尔·卡尼曼《思考，快与慢》',
    motivation: '给判断留一个复查口，尤其是在你确信自己没看漏时。',
  },
  {
    text: 'Society is not a mere sum of individuals.（社会不只是个人的简单相加。）',
    src: '涂尔干《社会学方法的准则》',
    motivation: '把关系与制度也纳入视野，很多个人困境才会显出结构。',
  },
  {
    text: 'Politics is a strong and slow boring of hard boards.',
    src: '马克斯·韦伯《以政治为业》',
    motivation: '重要改变往往像钻硬木板：缓慢，但需要持续用力。',
  },
  {
    text: 'Ninguém liberta ninguém, ninguém se liberta sozinho.',
    src: '保罗·弗莱雷《被压迫者教育学》',
    motivation: '把改变放进共同实践里；真正的解放不是替别人完成。',
  },
  {
    text: 'Denken ohne Geländer.（无扶手思考。）',
    src: '汉娜·阿伦特，访谈语',
    motivation: '没有现成扶手时，仍要自己判断并承担判断。',
  },
  {
    text: 'Love is an action, never simply a feeling.',
    src: 'bell hooks《论爱》',
    motivation: '把在意落实为尊重、照料和负责，关系才会真正改变。',
  },
  {
    text: 'Man’s main task in life is to give birth to himself.（成为自己。）',
    src: '埃里希·弗洛姆《为自己的人》',
    motivation: '别只等待潜能出现，用今天的选择把它逐步生出来。',
  },
  {
    text: 'Que sais-je ?（我知道什么？）',
    src: '蒙田《随笔集》',
    motivation: '在下结论前保留一点怀疑，给事实留下修正你的机会。',
  },
  {
    text: 'Ô mon corps, fais de moi toujours un homme qui interroge !',
    src: '弗朗茨·法农《黑皮肤，白面具》',
    motivation: '别让既有定义替你停止思考；继续追问，继续成为主体。',
  },
]

export const PHILOSOPHY_QUOTES = BUILTIN_QUOTE_MOTIVATION_PAIRS.map(({ text, src }) => ({ text, src }))
export const MOTIVATIONS = BUILTIN_QUOTE_MOTIVATION_PAIRS.map(({ motivation }) => motivation)

export const MAX_SELECTABLE_QUOTE_DISPLAY_UNITS = 72

export function getQuoteDisplayUnits(value: string) {
  return Array.from(value).reduce((total, character) => (
    total + ((character.codePointAt(0) ?? 0) > 0xff ? 2 : 1)
  ), 0)
}

function isSelectableQuote(quote: QuoteItem) {
  return getQuoteDisplayUnits(quote.text) <= MAX_SELECTABLE_QUOTE_DISPLAY_UNITS
}

export function pickQuoteSelection(
  customQuotes: QuoteItem[],
  customMotivations: string[],
): QuoteSelection {
  const customPairCount = Math.min(customQuotes.length, customMotivations.length)
  const selectablePairs = [
    ...BUILTIN_QUOTE_MOTIVATION_PAIRS.filter(isSelectableQuote),
    ...customQuotes.slice(0, customPairCount).flatMap((quote, index) => (
      isSelectableQuote(quote)
        ? [{ ...quote, motivation: customMotivations[index] }]
        : []
    )),
  ]
  const selected = selectablePairs[Math.floor(Math.random() * selectablePairs.length)]
  return {
    quote: { text: selected.text, src: selected.src },
    motivation: selected.motivation,
  }
}

export function getRandQuoteMotivationPair() {
  const selectablePairs = BUILTIN_QUOTE_MOTIVATION_PAIRS.filter(isSelectableQuote)
  return selectablePairs[Math.floor(Math.random() * selectablePairs.length)]
}

export function getRandQuote() {
  const { text, src } = getRandQuoteMotivationPair()
  return { text, src }
}

export function getRandMotivation() {
  return getRandQuoteMotivationPair().motivation
}
