export const PHILOSOPHY_QUOTES = [
  { text: '知足者富。',            src: '老子《道德经》' },
  { text: '业精于勤，荒于嬉；行成于思，毁于随。', src: '韩愈' },
  { text: '路漫漫其修远兮，吾将上下而求索。', src: '屈原《离骚》' },
  { text: '千里之行，始于足下。', src: '老子' },
  { text: '不积跬步，无以至千里；不积小流，无以成江海。', src: '荀子《劝学》' },
  { text: '吾日三省吾身——为人谋而不忠乎？与朋友交而不信乎？传不习乎？', src: '曾子' },
  { text: '学而不思则罔，思而不学则殆。', src: '孔子《论语》' },
  { text: 'The cave you fear to enter holds the treasure you seek.', src: 'Joseph Campbell' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', src: 'Confucius' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', src: 'Aristotle' },
  { text: '人最宝贵的是生命，生命对于每个人只有一次。', src: '奥斯特洛夫斯基' },
  { text: '没有伟大的意志力，便没有雄才大略。', src: '巴尔扎克' },
  { text: 'The only way to do great work is to love what you do.', src: 'Steve Jobs' },
  { text: '胸有成竹，则事成其半。', src: '苏轼' },
  { text: 'In the middle of difficulty lies opportunity.', src: 'Albert Einstein' },
  { text: '锲而舍之，朽木不折；锲而不舍，金石可镂。', src: '荀子' },
  { text: '问渠那得清如许？为有源头活水来。', src: '朱熹' },
  { text: 'Simplicity is the ultimate sophistication.', src: 'Leonardo da Vinci' },
];

export const MOTIVATIONS = [
  '今天的专注，是明天的从容。',
  '清晨的第一个小时定义了整天的节奏。',
  '把今天的事做好，明天就少了一份烦恼。',
  '一个任务，做完再开始下一个。',
  '进度不在于速度，在于持续。',
  '细节决定成败，专注于当下。',
  '每完成一件事，就是向目标近了一步。',
  '好的开始是成功的一半——先动起来。',
  '深呼吸，排优先级，一件一件来。',
  '不要等灵感，行动本身就是灵感。',
  '专注于可控之事，接受不可控之变。',
  '今天的付出，是明天作品集里的一帧。',
];

export function getRandQuote() {
  return PHILOSOPHY_QUOTES[Math.floor(Math.random() * PHILOSOPHY_QUOTES.length)];
}

export function getRandMotivation() {
  return MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
}
