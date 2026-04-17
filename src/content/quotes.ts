export const BUILTIN_QUOTE_MOTIVATION_PAIRS = [
  {
    text: '知足者富。',
    src: '老子《道德经》',
    motivation: '今天的满足，是明天稳扎稳打的底色。',
  },
  {
    text: '千里之行，始于足下。',
    src: '老子',
    motivation: '把每一步当成起点，前方终会更远。',
  },
  {
    text: '不积跬步，无以至千里；不积小流，无以成江海。',
    src: '荀子《劝学》',
    motivation: '每日小胜，就是未来大成的基础。',
  },
  {
    text: '业精于勤，荒于嬉；行成于思，毁于随。',
    src: '韩愈',
    motivation: '用心比追求速成更值得信赖。',
  },
  {
    text: '问渠那得清如许？为有源头活水来。',
    src: '朱熹',
    motivation: '让自己的能量源源不断，状态就不会断档。',
  },
  {
    text: '锲而舍之，朽木不折；锲而不舍，金石可镂。',
    src: '荀子',
    motivation: '一次放弃，失去的往往比坚持更多。',
  },
  {
    text: '胸有成竹，则事成其半。',
    src: '苏轼',
    motivation: '先想清楚，再去做，效果会更好。',
  },
  {
    text: '吾日三省吾身——为人谋而不忠乎？与朋友交而不信乎？传不习乎？',
    src: '曾子',
    motivation: '坚持复盘，才能让错误变成成长。',
  },
  {
    text: '学而不思则罔，思而不学则殆。',
    src: '孔子《论语》',
    motivation: '把学习和反思结合起来，做出的事情才会更有力量。',
  },
  {
    text: '直挂云帆济沧海。',
    src: '李白',
    motivation: '有目标，就敢把梦想变成行动。',
  },
  {
    text: '事常与人违，事总在人为。',
    src: '朱熹',
    motivation: '你做出改变，事情就会跟着变得可能。',
  },
  {
    text: '发奋忘食，乐以忘忧。',
    src: '孟子',
    motivation: '把热情用在进步上，烦恼会自然减少。',
  },
  {
    text: '守得云开见月明。',
    src: '王安石',
    motivation: '只要不让自己停下，机会终将出现。',
  },
  {
    text: '择善而从，不善而改。',
    src: '孔子',
    motivation: '如果你愿意改，路就会越来越通。',
  },
  {
    text: '知不足者常有。',
    src: '老子',
    motivation: '承认不足，是继续升级自己的起点。',
  },
  {
    text: '为山九仞，功亏一篑。',
    src: '史记',
    motivation: '成功就在眼前，最后一刻比之前更关键。',
  },
  {
    text: '有志者，事竟成。',
    src: '司马迁',
    motivation: '只要不停地努力，结果就会慢慢靠近。',
  },
  {
    text: '君子以文会友，以友辅仁。',
    src: '孔子',
    motivation: '和对的人一起，会把平凡变成更好的自己。',
  },
  {
    text: '逆水行舟，不进则退。',
    src: '朱熹',
    motivation: '动起来，就是最好的防守。',
  },
  {
    text: '日拱一卒，功不唐捐。',
    src: '司马光',
    motivation: '日积月累，值得的事情不会被浪费。',
  },
  {
    text: '守株待兔，不如趁势而为。',
    src: '左丘明',
    motivation: '不依赖机遇，把自己变成机会的创造者。',
  },
  {
    text: '事在易而求于难。',
    src: '墨子',
    motivation: '困难并不可怕，可怕的是不愿意去面对它。',
  },
  {
    text: '有备无患。',
    src: '司马迁',
    motivation: '提前准备，让你在关键时刻更有底气。',
  },
  {
    text: '前事不忘，后事之师。',
    src: '司马迁',
    motivation: '用过去的经验，帮现在和未来少走弯路。',
  },
  {
    text: '含章可贞。',
    src: '老子',
    motivation: '内心踏实，才能把事情做得更稳。',
  },
  {
    text: '行百里者半九十。',
    src: '《战国策》',
    motivation: '最后一刻的坚持，往往决定整体结果。',
  },
  {
    text: '水滴石穿，绳锯木断。',
    src: '史记',
    motivation: '只要坚持，一切看似不可能的事都有希望。',
  },
  {
    text: '扶摇直上九万里。',
    src: '李白',
    motivation: '设定高远目标，会驱动你把每一步都当成攀升。',
  },
  {
    text: '志当存高远。',
    src: '诸葛亮',
    motivation: '有远见，就不会被一时的挫折打倒。',
  },
  {
    text: '读万卷书，行万里路。',
    src: '韩愈',
    motivation: '学习和行动一起走，才能把理想变成现实。',
  },
]

export const PHILOSOPHY_QUOTES = BUILTIN_QUOTE_MOTIVATION_PAIRS.map(({ text, src }) => ({ text, src }))
export const MOTIVATIONS = BUILTIN_QUOTE_MOTIVATION_PAIRS.map(({ motivation }) => motivation)

export function getRandQuote() {
  return PHILOSOPHY_QUOTES[Math.floor(Math.random() * PHILOSOPHY_QUOTES.length)]
}

export function getRandMotivation() {
  return MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]
}
