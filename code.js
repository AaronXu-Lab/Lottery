// Lottery — Figma plugin by Aaron Xu.
const NAMES = '宋江 卢俊义 吴用 公孙胜 关胜 林冲 秦明 呼延灼 花荣 柴进 李应 朱仝 鲁智深 武松 董平 张清 杨志 徐宁 索超 戴宗 刘唐 李逵 史进 穆弘 雷横 李俊 阮小二 张横 阮小五 张顺 阮小七 杨雄 石秀 谢珍 谢宝 燕青'.split(' ');
const KEY = 'lottery';
let busy = false;
function paint(hex) {
  return [{ type: 'SOLID', color: { r: parseInt(hex.slice(0,2),16)/255, g: parseInt(hex.slice(2,4),16)/255, b: parseInt(hex.slice(4,6),16)/255 } }];
}
function choose(items, count, random = Math.random) {
  const pool = items.slice();
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
async function fontForChinese() {
  const fonts = await figma.listAvailableFontsAsync();
  for (const family of ['PingFang SC', 'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', 'Inter']) {
    const item = fonts.find(f => f.fontName.family === family && f.fontName.style === 'Regular');
    if (item) { await figma.loadFontAsync(item.fontName); return item.fontName; }
  }
  throw new Error('没有可用的字体，请检查 Figma 字体服务。');
}
function text(parent, name, value, font, size, color) {
  const t = figma.createText(); parent.appendChild(t);
  t.name = name; t.fontName = font; t.fontSize = size;
  t.characters = value; t.fills = paint(color || '222222');
  return t;
}
async function initialize() {
  const font = await fontForChinese();
  const page = figma.createPage(); page.name = '抽奖用页面';
  await figma.setCurrentPageAsync(page);
  page.setPluginData(KEY, '1');
  page.setPluginData('round', '0');
  page.backgrounds = paint('F5F5F5');
  const title = text(page, '使用教程', '使用教程', font, 24); title.x = 100; title.y = 100;
  const instructions = text(page, 'instructions', '1. 复制下方人员卡片的实例，直接放在页面上，不放入组或画板。\n2. 编辑实例的姓名、描述和 Avatar 图片填充。\n3. 打开抽奖面板，调整人数后点击礼物按钮。\n4. 中奖卡片移入分轮结果区，不再参加后续抽奖。', font, 14);
  instructions.x = 100; instructions.y = 145;
  const card = figma.createComponent(); page.appendChild(card);
  card.name = 'personCardComponent'; card.resize(120,200); card.x = 100; card.y = 270;
  card.fills = paint('FFFFFF'); card.cornerRadius = 10;
  card.strokes = paint('E5E5E5'); card.strokeWeight = 1;
  card.description = '抽奖人员卡片。复制实例并直接放在页面上，编辑姓名、描述及 Avatar 的图片填充。中奖实例会移入结果框。';
  const avatar = figma.createRectangle(); card.appendChild(avatar);
  avatar.name = 'Avatar'; avatar.resize(108,144); avatar.x = 6; avatar.y = 6;
  avatar.cornerRadius = 4; avatar.fills = paint('D9D9D9');
  const icon = figma.createNodeFromSvg('<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="12" r="8" fill="#BDBDBD"/><path d="M4 37c0-17 32-17 32 0" fill="#BDBDBD"/></svg>');
  card.appendChild(icon); icon.name = 'Avatar placeholder'; icon.x = 40; icon.y = 58;
  const labels = figma.createFrame(); card.appendChild(labels); labels.name = 'TextAutoLayout';
  labels.layoutMode = 'VERTICAL'; labels.primaryAxisSizingMode = 'AUTO'; labels.counterAxisSizingMode = 'FIXED';
  labels.resize(110,36); labels.clipsContent = false; labels.x = 5; labels.y = 158; labels.itemSpacing = 3;
  labels.counterAxisAlignItems = 'CENTER'; labels.fills = [];
  const name = text(labels, 'personName', '姓名', font, 13);
  const desc = text(labels, 'desc', '人员描述', font, 10, '777777');
  const nameProp = card.addComponentProperty('姓名', 'TEXT', '姓名');
  const descProp = card.addComponentProperty('描述', 'TEXT', '人员描述');
  name.componentPropertyReferences = { characters: nameProp };
  desc.componentPropertyReferences = { characters: descProp };
  labels.primaryAxisSizingMode = 'AUTO';
  await normalizeCard(card);
  page.setPluginData('cardId', card.id);
  NAMES.forEach((name, i) => {
    const instance = card.createInstance(); page.appendChild(instance);
    instance.name = name;
    instance.setProperties({ [nameProp]: name, [descProp]: '示例人员 ' + (i + 1) });
    instance.x = 100 + (i % 9) * 132; instance.y = 550 + Math.floor(i / 9) * 212;
  });
  figma.currentPage.selection = [card];
  figma.viewport.scrollAndZoomIntoView(page.children);
  figma.closePlugin('抽奖页面初始化完成：36 位示例人员');
}
async function normalizeCard(card) {
  const labels = card.children.find(n => n.name === 'TextAutoLayout');
  if (labels && labels.type === 'FRAME') { labels.clipsContent = false; labels.primaryAxisSizingMode = 'AUTO'; }
  const icon = card.children.find(n => n.name === 'Avatar placeholder');
  const avatar = card.children.find(n => n.name === 'Avatar');
  if (avatar && avatar.type === 'RECTANGLE' && card.getPluginData('placeholderVersion') !== '2') {
    const placeholder = figma.createNodeFromSvg('<svg xmlns="http://www.w3.org/2000/svg" width="108" height="144" viewBox="0 0 108 144"><rect width="108" height="144" fill="#D9D9D9"/><g transform="translate(34 52)" fill="#BDBDBD"><circle cx="20" cy="12" r="8"/><path d="M4 37c0-17 32-17 32 0"/></g></svg>');
    const bytes = await placeholder.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 3 } });
    placeholder.remove();
    const image = figma.createImage(bytes);
    avatar.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
    if (icon) icon.remove();
    card.setPluginData('placeholderVersion', '2');
  }
}
function candidates(page) { return page.children.filter(n => n.type === 'INSTANCE'); }
function status(message, error) {
  figma.ui.postMessage({ type: 'status', message, error: !!error, remaining: candidates(figma.currentPage).length });
}
async function draw(count) {
  if (busy) return;
  busy = true;
  try {
    const page = figma.currentPage;
    if (page.getPluginData(KEY) !== '1') throw new Error('请先初始化抽奖页面，并切换到该页面。');
    const pool = candidates(page);
    if (!Number.isInteger(count) || count < 1) throw new Error('抽奖人数至少为 1 人。');
    if (!pool.length) throw new Error('没有可参与抽奖的人员。请在页面上添加卡片实例。');
    if (count > pool.length) throw new Error('只剩 ' + pool.length + ' 位候选人，请减少抽奖人数。');
    // Load every used font before moving the existing card instances.
    const fonts = new Map();
    for (const instance of pool) {
      for (const t of instance.findAllWithCriteria({ types: ['TEXT'] })) {
        for (const segment of t.getStyledTextSegments(['fontName'])) {
          fonts.set(JSON.stringify(segment.fontName), segment.fontName);
        }
      }
    }
    await Promise.all(Array.from(fonts.values()).map(f => figma.loadFontAsync(f)));
    // Guard against changing pages / instances during font loading.
    if (figma.currentPage.id !== page.id) throw new Error('页面已切换，请重新抽奖。');
    if (pool.some(n => n.removed || n.parent !== page)) throw new Error('候选名单已变化，请重新抽奖。');
    const winners = choose(pool, count);
    const round = (Number(page.getPluginData('round')) || 0) + 1;
    const previous = page.children.filter(n => n.type === 'FRAME' && n.getPluginData('lotteryResult') === '1');
    const result = figma.createFrame(); page.appendChild(result);
    result.name = '第 ' + round + ' 次抽奖结果'; result.layoutMode = 'HORIZONTAL';
    result.primaryAxisSizingMode = 'AUTO'; result.counterAxisSizingMode = 'AUTO';
    result.paddingLeft = result.paddingRight = result.paddingTop = result.paddingBottom = 20;
    result.itemSpacing = 10; result.cornerRadius = 4; result.fills = paint('EE9B40');
    result.setPluginData('lotteryResult', '1');
    result.x = 1400;
    result.y = previous.length ? Math.max(...previous.map(n => n.y + n.height)) + 20 : 550;
    for (const winner of winners) result.appendChild(winner);
    page.setPluginData('round', String(round));
    page.selection = [result]; figma.viewport.scrollAndZoomIntoView([result]);
    status('第 ' + round + ' 轮：' + winners.map(n => (n.findOne(t => t.type === 'TEXT' && t.name === 'personName') || {characters:n.name}).characters).join('、') + '；剩余 ' + candidates(page).length + ' 人');
    figma.notify('共有' + pool.length + '位同事参与抽奖');
  } catch (error) { status(error.message || String(error), true); }
  finally { busy = false; figma.ui.postMessage({ type: 'ready' }); }
}
async function panel() {
  const page = figma.currentPage;
  if (page.getPluginData(KEY) === '1') {
    const card = await figma.getNodeByIdAsync(page.getPluginData('cardId'));
    if (card && card.type === 'COMPONENT') await normalizeCard(card);
  }
  figma.showUI(__html__, { width: 300, height: 264, title: '抽奖 Lottery', themeColors: false });
  figma.ui.onmessage = message => {
    if (message.type === 'draw') void draw(Number(message.count));
    if (message.type === 'refresh') status('剩余 ' + candidates(figma.currentPage).length + ' 位候选人');
  };
}
if (typeof module !== 'undefined') module.exports = { choose };
if (typeof figma !== 'undefined') {
  if (figma.command === 'initialize') initialize().catch(error => figma.closePlugin('初始化失败：' + error.message));
  else panel().catch(error => figma.closePlugin(error.message));
}
