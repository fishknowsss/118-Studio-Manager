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
    text: 'Die Grenzen meiner Sprache bedeuten die Grenzen meiner Welt.（语言的边界意味着世界的边界。）',
    src: '维特根斯坦《逻辑哲学论》5.6',
    motivation: '为问题找到更准确的词，你就扩大了可行动的范围。',
  },
  {
    text: 'Non ridere, non lugere, neque detestari, sed intelligere.（不嘲笑，不哀叹，不憎恨，而要理解。）',
    src: '斯宾诺莎《政治论》',
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
    text: 'The body is our general medium for having a world.',
    src: '梅洛-庞蒂《知觉现象学》',
    motivation: '身体不是思想之外的负担；照顾状态，也是照顾判断。',
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
    text: 'Il n’y a pas de hors-texte.（不存在脱离语境的外部。）',
    src: '德里达《论文字学》',
    motivation: '别只看一句话；回到关系和语境，意义才会显现。',
  },
  {
    text: 'Sein, das verstanden werden kann, ist Sprache.（能被理解的存在，就是语言。）',
    src: '伽达默尔《真理与方法》',
    motivation: '理解不是占有答案，而是让事物能在对话中被说清。',
  },
  {
    text: 'Do not block the way of inquiry.',
    src: '皮尔士《理性的第一条规则》',
    motivation: '别急着封口；给尚未明白的问题保留继续追问的通道。',
  },
  {
    text: 'My experience is what I agree to attend to.',
    src: '威廉·詹姆斯《心理学原理》',
    motivation: '把注意力给真正重要的事，经验才会从噪声里成形。',
  },
  {
    text: 'It is a joy to be hidden, but a disaster not to be found.',
    src: '温尼科特《游戏与现实》',
    motivation: '既允许自己保留，也让可信的人能够找到你。',
  },
  {
    text: 'A difference which makes a difference.',
    src: '格雷戈里·贝特森《心智生态学》',
    motivation: '寻找真正改变结果的差异，不要被无关信息淹没。',
  },
  {
    text: 'Wo Es war, soll Ich werden.（本我所在之处，自我应当到来。）',
    src: '弗洛伊德《精神分析新论》',
    motivation: '把被回避的部分带进意识，选择才真正开始。',
  },
  {
    text: 'The curious paradox is that when I accept myself just as I am, then I can change.',
    src: '卡尔·罗杰斯《成为一个人》',
    motivation: '接纳现状不是停下，而是停止内耗后开始改变。',
  },
  {
    text: 'Nothing in life is as important as you think it is while you are thinking about it.',
    src: '丹尼尔·卡尼曼《思考，快与慢》',
    motivation: '当一件事占满视野时，先退一步校准它的真实分量。',
  },
  {
    text: 'Society is a human product. Society is an objective reality. Man is a social product.',
    src: '伯格、卢克曼《现实的社会建构》',
    motivation: '规则由人生成，也能由人重写；先看清自己参与了什么。',
  },
  {
    text: 'Politics is a strong and slow boring of hard boards.',
    src: '马克斯·韦伯《以政治为业》',
    motivation: '重要改变往往像钻硬木板：缓慢，但需要持续用力。',
  },
  {
    text: 'The self, then, as a performed character, is not an organic thing.',
    src: '欧文·戈夫曼《日常生活中的自我呈现》',
    motivation: '每个场合都在塑造角色；主动选择你愿意如何出现。',
  },
  {
    text: 'Neither the life of an individual nor the history of a society can be understood without understanding both.',
    src: 'C. 赖特·米尔斯《社会学的想象力》',
    motivation: '把个人困境放进时代与结构中看，你会找到新的行动入口。',
  },
  {
    text: 'The most successful ideological effects are those which have no need for words.',
    src: '皮埃尔·布迪厄《实践理论大纲》',
    motivation: '找出那些从未被明说、却一直在支配选择的默认规则。',
  },
  {
    text: 'Ninguém liberta ninguém, ninguém se liberta sozinho.（没有人解放别人，也没有人独自解放自己。）',
    src: '保罗·弗莱雷《被压迫者教育学》',
    motivation: '把改变放进共同实践里；真正的解放不是替别人完成。',
  },
  {
    text: 'Denken ohne Geländer.（无扶手思考。）',
    src: '汉娜·阿伦特，访谈语',
    motivation: '没有现成扶手时，仍要自己判断并承担判断。',
  },
  {
    text: 'Ô mon corps, fais de moi toujours un homme qui interroge !',
    src: '弗朗茨·法农《黑皮肤，白面具》',
    motivation: '别把既有答案当成终点；持续追问，才不会被定义困住。',
  },
]

export const PHILOSOPHY_QUOTES = BUILTIN_QUOTE_MOTIVATION_PAIRS.map(({ text, src }) => ({ text, src }))
export const MOTIVATIONS = BUILTIN_QUOTE_MOTIVATION_PAIRS.map(({ motivation }) => motivation)

export function pickQuoteSelection(
  customQuotes: QuoteItem[],
  customMotivations: string[],
): QuoteSelection {
  const customPairCount = Math.min(customQuotes.length, customMotivations.length)
  const selectionIndex = Math.floor(Math.random() * (BUILTIN_QUOTE_MOTIVATION_PAIRS.length + customPairCount))

  if (selectionIndex < BUILTIN_QUOTE_MOTIVATION_PAIRS.length) {
    const { text, src, motivation } = BUILTIN_QUOTE_MOTIVATION_PAIRS[selectionIndex]
    return { quote: { text, src }, motivation }
  }

  const customIndex = selectionIndex - BUILTIN_QUOTE_MOTIVATION_PAIRS.length
  return {
    quote: customQuotes[customIndex],
    motivation: customMotivations[customIndex],
  }
}

export function getRandQuoteMotivationPair() {
  return BUILTIN_QUOTE_MOTIVATION_PAIRS[Math.floor(Math.random() * BUILTIN_QUOTE_MOTIVATION_PAIRS.length)]
}

export function getRandQuote() {
  const { text, src } = getRandQuoteMotivationPair()
  return { text, src }
}

export function getRandMotivation() {
  return getRandQuoteMotivationPair().motivation
}
