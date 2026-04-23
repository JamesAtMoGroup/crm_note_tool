const BRAND_DISPLAY_NAMES = {
  xuemi:      '學米',
  sixdigital: '無限',
  kkschool:   'nschool職能',
  nschool:    'nschool財經',
  xlab:       'xlab',
  aischool:   'AI未來學院',
};

// 特殊申請可用的品牌（排除 aischool）
const APPLY_BRANDS = Object.entries(BRAND_DISPLAY_NAMES)
  .filter(([key]) => key !== 'aischool')
  .map(([key, name]) => ({ key, name }));

module.exports = { BRAND_DISPLAY_NAMES, APPLY_BRANDS };
