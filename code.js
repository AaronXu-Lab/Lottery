// Lottery — Figma plugin by Aaron Xu.
const NAMES = '宋江 卢俊义 吴用 公孙胜 关胜 林冲 秦明 呼延灼 花荣 柴进 李应 朱仝 鲁智深 武松 董平 张清 杨志 徐宁 索超 戴宗 刘唐 李逵 史进 穆弘 雷横 李俊 阮小二 张横 阮小五 张顺 阮小七 杨雄 石秀 谢珍 谢宝 燕青'.split(' ');
const KEY = 'lottery';
let busy = false, language = 'zh', epoch = 0, marker = null, pendingInitialization = null;
const COPY = {
  zh: { invalid:'需要初始化抽奖页面。', count:'抽奖人数至少为 1 人。', empty:'没有可参与抽奖的人员，请添加人员卡片实例。', insufficient:n=>'只剩 '+n+' 位候选人，请减少抽奖人数。', changed:'页面或候选名单已变化，本轮已取消。', participants:n=>'共有 '+n+' 位人员参与抽奖', result:(r,n)=>'第 '+r+' 轮抽奖完成，剩余 '+n+' 人', initialized:'抽奖页面已初始化，请编辑人员卡片后开始抽奖。', font:'没有可用的字体，请检查 Figma 字体服务。', error:'操作失败，请重试。' },
  en: { invalid:'Initialize a lottery page to continue.', count:'Pick at least one person.', empty:'No participants left. Add person card instances to the page.', insufficient:n=>'Only '+n+' participants remain. Reduce the pick count.', changed:'The page or participant list changed. This draw was canceled.', participants:n=>n+' participants in this draw', result:(r,n)=>'Round '+r+' complete. '+n+' participants remain.', initialized:'Lottery page created. Edit the participant cards before drawing.', font:'No suitable font is available. Check the Figma font service.', error:'Something went wrong. Please try again.' }
};
function say(key, ...args) { const v=COPY[language][key]; return typeof v==='function'?v(...args):v; }
function send(message) { figma.ui.postMessage(message); }
function paint(hex) { return [{type:'SOLID', color:{r:parseInt(hex.slice(0,2),16)/255,g:parseInt(hex.slice(2,4),16)/255,b:parseInt(hex.slice(4,6),16)/255}}]; }
function choose(items, count, random = Math.random) {
  if (!Number.isInteger(count) || count < 0 || count > items.length) throw new RangeError('Invalid sample size');
  const pool=items.slice();
  for(let i=0;i<count;i++){const j=i+Math.floor(random()*(pool.length-i));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,count);
}
async function fontForChinese(){
  const fonts=await figma.listAvailableFontsAsync();
  for(const family of ['PingFang SC','Noto Sans SC','Source Han Sans SC','Microsoft YaHei','Inter']){
    const f=fonts.find(x=>x.fontName.family===family&&x.fontName.style==='Regular');
    if(f){await figma.loadFontAsync(f.fontName);return f.fontName;}
  }
  throw new Error(say('font'));
}
function text(parent,name,value,font,size,color='222222'){
  const t=figma.createText();parent.appendChild(t);t.name=name;t.fontName=font;t.fontSize=size;
  t.characters=value;t.fills=paint(color);t.lineHeight={unit:'PERCENT',value:125};return t;
}
async function initialize(){
  const font=await fontForChinese();
  const page=figma.createPage();page.name='抽奖 / Lottery';await figma.setCurrentPageAsync(page);
  try {
    page.backgrounds=paint('F5F5F5');page.setPluginData(KEY,'1');page.setPluginData('round','0');
    const title=text(page,'使用教程 / Instructions','使用教程\nHow to use',font,24);title.x=100;title.y=100;
    const pairs=[
      ['1. 复制人员卡片实例，直接放在页面上，不放入组或画板。','Duplicate person card instances directly onto the page, outside groups and frames.'],
      ['2. 编辑姓名、描述，并替换 Avatar 图层的图片填充。','Edit each name and description, and replace the Avatar image fill.'],
      ['3. 调整抽奖人数，点击礼物按钮，红框会跳动选择人员。','Choose how many people to pick, then click the gift and watch the red outline hop.'],
      ['4. 中奖卡片会移入分轮结果框，不再参与后续抽奖。','Winners move into a round result frame and leave the participant pool.']
    ];
    const instructions=text(page,'instructions',pairs.flat().join('\n'),font,14);instructions.x=100;instructions.y=180;
    const card=figma.createComponent();page.appendChild(card);card.name='personCardComponent';card.resize(120,200);card.x=100;card.y=370;
    card.fills=paint('FFFFFF');card.cornerRadius=10;card.strokes=paint('E5E5E5');card.strokeWeight=1;
    card.description='复制实例并直接放在页面上，编辑姓名、描述和头像。\nDuplicate instances onto the page; edit the name, description, and avatar.';
    const avatar=figma.createRectangle();card.appendChild(avatar);avatar.name='Avatar';avatar.resize(108,144);avatar.x=6;avatar.y=6;avatar.cornerRadius=4;
    const placeholder=figma.createNodeFromSvg('<svg xmlns="http://www.w3.org/2000/svg" width="108" height="144"><rect width="108" height="144" fill="#D9D9D9"/><g transform="translate(34 52)" fill="#BDBDBD"><circle cx="20" cy="12" r="8"/><path d="M4 37c0-17 32-17 32 0"/></g></svg>');
    card.appendChild(placeholder);
    try {const bytes=await placeholder.exportAsync({format:'PNG',constraint:{type:'SCALE',value:3}});avatar.fills=[{type:'IMAGE',imageHash:figma.createImage(bytes).hash,scaleMode:'FILL'}];}
    finally {placeholder.remove();}
    const labels=figma.createFrame();card.appendChild(labels);labels.name='TextAutoLayout';labels.layoutMode='VERTICAL';labels.resize(110,35);labels.x=5;labels.y=158;labels.itemSpacing=3;labels.counterAxisAlignItems='CENTER';labels.fills=[];labels.clipsContent=false;
    const name=text(labels,'personName','姓名 | Name',font,13);name.lineHeight={unit:'AUTO'};
    const desc=text(labels,'desc','人员描述 | Description',font,10,'777777');desc.lineHeight={unit:'AUTO'};
    const nameProp=card.addComponentProperty('姓名 / Name','TEXT','姓名 | Name');
    const descProp=card.addComponentProperty('描述 / Description','TEXT','人员描述 | Description');
    name.componentPropertyReferences={characters:nameProp};desc.componentPropertyReferences={characters:descProp};labels.primaryAxisSizingMode='AUTO';
    page.setPluginData('cardId',card.id);
    NAMES.forEach((name,i)=>{const instance=card.createInstance();page.appendChild(instance);instance.name=name;instance.setProperties({[nameProp]:name,[descProp]:'示例人员 '+(i+1)+' | Participant '+(i+1)});instance.x=100+(i%9)*132;instance.y=650+Math.floor(i/9)*212;});
    page.selection=[card];figma.viewport.scrollAndZoomIntoView(page.children);figma.notify(say('initialized'));send({type:'initialized'});
  } catch(error) {
    // Keep a partially created page available for inspection instead of hiding a failure.
    page.setPluginData(KEY,'');throw error;
  }
}
async function inspectPage(page){
  const pool=[];let hasCard=page.children.some(n=>n.type==='COMPONENT'&&n.name==='personCardComponent');
  for(const instance of page.children.filter(n=>n.type==='INSTANCE')){
    const main=await instance.getMainComponentAsync();
    if(main&&main.name==='personCardComponent'){hasCard=true;pool.push(instance);}
  }
  return {pool,valid:hasCard};
}
function roundNumber(page){
  const numbers=page.children.filter(n=>n.type==='FRAME').map(n=>{const m=n.name.match(/^(?:第\s*(\d+)\s*次抽奖结果|Round\s+(\d+))/);return m?Number(m[1]||m[2]):0;});
  return Math.max(Number(page.getPluginData('round'))||0,...numbers,0)+1;
}
function cleanupMarker(){if(marker&&!marker.removed)marker.remove();marker=null;}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function assertStable(page,pool,version){
  if(version!==epoch||figma.currentPage.id!==page.id||pool.some(n=>n.removed||n.parent!==page))throw new Error(say('changed'));
}
async function animate(page,pool,winners,version,reducedMotion){
  if(reducedMotion)return;
  marker=figma.createRectangle();page.appendChild(marker);marker.name='Ω就决定是你了';marker.fills=[];marker.strokes=paint('FF0000');marker.strokeWeight=4;marker.strokeAlign='OUTSIDE';marker.cornerRadius=12;marker.locked=true;
  figma.viewport.scrollAndZoomIntoView(pool);
  function highlight(node){const b=node.absoluteBoundingBox;if(!b)return;marker.resize(b.width+4,b.height+4);marker.x=b.x-2;marker.y=b.y-2;}
  let last=-1;
  for(let i=0;i<22;i++){
    assertStable(page,pool,version);
    let next=Math.floor(Math.random()*pool.length);if(pool.length>1&&next===last)next=(next+1)%pool.length;last=next;
    highlight(pool[next]);await wait(i<15?65:90+(i-15)*24);
  }
  for(const winner of winners){assertStable(page,pool,version);highlight(winner);await wait(230);}
  assertStable(page,pool,version);cleanupMarker();
}
async function draw(count,reducedMotion){
  if(busy)return;busy=true;
  const page=figma.currentPage,version=epoch;
  try {
    const {pool,valid}=await inspectPage(page);assertStable(page,pool,version);
    if(!valid){pendingInitialization={pageId:page.id,token:String(Math.random())};send({type:'needs-initialization',...pendingInitialization});return;}
    if(!Number.isInteger(count)||count<1)throw new Error(say('count'));
    if(!pool.length)throw new Error(say('empty'));
    if(count>pool.length)throw new Error(say('insufficient',pool.length));
    const fonts=new Map();for(const instance of pool)for(const t of instance.findAllWithCriteria({types:['TEXT']}))for(const segment of t.getStyledTextSegments(['fontName']))fonts.set(JSON.stringify(segment.fontName),segment.fontName);
    await Promise.all(Array.from(fonts.values()).map(f=>figma.loadFontAsync(f)));assertStable(page,pool,version);
    const winners=choose(pool,count);figma.notify(say('participants',pool.length));
    await animate(page,pool,winners,version,reducedMotion);assertStable(page,pool,version);
    const round=roundNumber(page);
    const previous=page.children.filter(n=>n.type==='FRAME'&&(n.getPluginData('lotteryResult')==='1'||/^第\s*\d+\s*次抽奖结果|^Round\s+\d+/.test(n.name)));
    const right=Math.max(...pool.map(n=>n.x+n.width))+100;
    const result=figma.createFrame();page.appendChild(result);result.name='第 '+round+' 次抽奖结果 / Round '+round;
    result.layoutMode='HORIZONTAL';result.primaryAxisSizingMode='AUTO';result.counterAxisSizingMode='AUTO';result.paddingLeft=result.paddingRight=result.paddingTop=result.paddingBottom=20;result.itemSpacing=10;result.cornerRadius=4;result.fills=paint('FFDD78');result.setPluginData('lotteryResult','1');
    result.x=previous.length?previous[0].x:right;result.y=previous.length?Math.max(...previous.map(n=>n.y+n.height))+20:Math.min(...pool.map(n=>n.y));
    for(const winner of winners)result.appendChild(winner);
    page.setPluginData('round',String(round));page.selection=[result];figma.viewport.scrollAndZoomIntoView([result]);
    figma.notify(say('result',round,pool.length-count));send({type:'result',round,remaining:pool.length-count});
  }catch(error){report(error);}
  finally{cleanupMarker();busy=false;send({type:'ready'});}
}
function report(error){const message=error.message||say('error');figma.notify(message,{error:true});send({type:'error',message});}
async function confirmInitialization(message){
  if(busy||!pendingInitialization||message.token!==pendingInitialization.token)return;
  if(figma.currentPage.id!==pendingInitialization.pageId){pendingInitialization=null;report(new Error(say('changed')));return;}
  busy=true;pendingInitialization=null;send({type:'busy'});
  try{await initialize();}catch(error){report(error);}finally{busy=false;send({type:'ready'});}
}
async function panel(){
  try{const saved=await figma.clientStorage.getAsync('language');if(saved==='zh'||saved==='en')language=saved;}catch(_error){}
  figma.showUI(__html__,{width:300,height:225,title:'抽奖 Lottery',themeColors:false});
  figma.ui.onmessage=message=>{
    if(message.type==='boot')send({type:'language',language});
    if(message.type==='set-language'&&(message.language==='zh'||message.language==='en')){language=message.language;void figma.clientStorage.setAsync('language',language).catch(()=>{});send({type:'language',language});}
    if(message.type==='draw')void draw(Number(message.count),!!message.reducedMotion);
    if(message.type==='initialize')void confirmInitialization(message);
    if(message.type==='cancel-initialization')pendingInitialization=null;
  };
  figma.on('currentpagechange',()=>{epoch++;cleanupMarker();pendingInitialization=null;send({type:'page-changed'});});
  figma.on('close',()=>{epoch++;cleanupMarker();});
}
if(typeof module!=='undefined')module.exports={choose,roundNumber};
if(typeof figma!=='undefined')panel().catch(error=>figma.closePlugin(error.message));
