(() => {
'use strict';

const PAGE_SIZE = 24;
const CATS = ['all','shaders','textures','mods','maps','clients'];
const STORAGE = { lang:'fpLang', dark:'fpDark' };
const DEFAULT_STATS = (x) => ({
  rating: Math.min(5, 4.5 + (String(x.name).length % 5) / 10),
  ratings: Math.max(1, Math.floor(40 + String(x.name).length * 3)),
  downloads: Math.max(0, Math.floor(700 + String(x.name).length * 83)),
  views: Math.max(0, Math.floor(1800 + String(x.name).length * 137)),
  rated: false
});
const labels = {
  fa: {
    all:'همه', shaders:'شیدرها', textures:'تکسچر پک', mods:'مودها', maps:'مپ‌ها', clients:'کلاینت‌ها',
    found:'نتیجه', items:'آیتم', empty:'چیزی پیدا نشد', emptySub:'نام دیگری را جستجو کنید یا فیلتر را بردارید',
    version:'نسخه', size:'اندازه', type:'نوع', official:'منبع اصلی ↗', rate:'★ امتیاز بده',
    downloads:'دانلود', views:'بازدید', details:'جزئیات', featured:'منتخب‌های First Pack', page:'صفحه',
    prev:'قبلی', next:'بعدی', allVersions:'همه نسخه‌ها', allSizes:'همه اندازه‌ها',
    selected:'منتخب', topRated:'بیشترین امتیاز', mostDownloaded:'بیشترین دانلود', newest:'جدیدترین',
    search:'جستجو بین منابع...', menuOpen:'باز کردن منو', menuClose:'بستن منو',
    theme:'تغییر پوسته', close:'بستن', rated:'★ امتیاز ثبت شد', loadError:'خطا در بارگذاری منابع. لطفاً صفحه را دوباره باز کنید.',
    heroTitle:'دنیای ماینکرفت خودتو بساز', heroText:'منابع منتخب Minecraft Java را با اطلاعات واضح، امتیاز کاربران و دسترسی سریع به منبع اصلی پیدا کن.',
    discover:'منبع مورد علاقه‌ات را پیدا کن', why:'چرا First Pack؟', home:'خانه', resources:'منابع', contact:'تماس', clear:'پاک‌کردن داده‌های محلی',
    clearDone:'داده‌های محلی پاک شد', noImage:'تصویر در دسترس نیست', loading:'در حال بارگذاری...'
  },
  en: {
    all:'All', shaders:'Shaders', textures:'Texture Packs', mods:'Mods', maps:'Maps', clients:'Clients',
    found:'results', items:'items', empty:'Nothing found', emptySub:'Try another search or remove a filter',
    version:'Version', size:'Size', type:'Type', official:'Official source ↗', rate:'★ Rate',
    downloads:'downloads', views:'views', details:'Details', featured:'First Pack picks', page:'Page',
    prev:'Previous', next:'Next', allVersions:'All versions', allSizes:'All sizes',
    selected:'Featured', topRated:'Top rated', mostDownloaded:'Most downloaded', newest:'Newest',
    search:'Search resources...', menuOpen:'Open menu', menuClose:'Close menu',
    theme:'Toggle theme', close:'Close', rated:'★ Rated', loadError:'Could not load resources. Please reload the page.',
    heroTitle:'Build your own Minecraft world.', heroText:'Discover selected Minecraft Java resources with clear details, ratings and quick access to the original source.',
    discover:'Find your next favorite resource', why:'Why First Pack?', home:'Home', resources:'Resources', contact:'Contact', clear:'Clear local data',
    clearDone:'Local data cleared', noImage:'Image unavailable', loading:'Loading...'
  }
};

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const safeStorage = {
  get(k, fallback=null) { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } },
  set(k,v) { try { localStorage.setItem(k,v); } catch {} },
  remove(k) { try { localStorage.removeItem(k); } catch {} },
  keys() { try { return Object.keys(localStorage); } catch { return []; } }
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = (s) => String(s ?? '').toLocaleLowerCase(state.lang === 'fa' ? 'fa-IR' : 'en-US');
const state = {
  lang: safeStorage.get(STORAGE.lang,'fa') === 'en' ? 'en' : 'fa',
  filter:'all', q:'', version:'all', size:'all', sort:'featured', menu:false,
  pages:{shaders:1,textures:1,mods:1,maps:1,clients:1}
};
let items = [];
let lastFocused = null;
let searchTimer = 0;

function statKey(x) { return `fp:${x.category}:${x.name}`; }
function getStats(x) {
  const base = DEFAULT_STATS(x);
  try {
    const raw = safeStorage.get(statKey(x));
    if (!raw) return base;
    const s = JSON.parse(raw);
    return {
      rating: Number.isFinite(Number(s.rating)) ? Math.min(5, Math.max(0, Number(s.rating))) : base.rating,
      ratings: Number.isFinite(Number(s.ratings)) ? Math.max(0, Math.floor(Number(s.ratings))) : base.ratings,
      downloads: Number.isFinite(Number(s.downloads)) ? Math.max(0, Math.floor(Number(s.downloads))) : base.downloads,
      views: Number.isFinite(Number(s.views)) ? Math.max(0, Math.floor(Number(s.views))) : base.views,
      rated: s.rated === true
    };
  } catch { return base; }
}
function saveStats(x,s) { safeStorage.set(statKey(x), JSON.stringify(s)); }
function sizeOf(x) {
  const matches = String(`${x.name} ${x.tags || ''}`).match(/(8x|16x|32x|64x|128x|256x)/ig);
  if (!matches) return '—';
  const v = Math.max(...matches.map(m => parseInt(m,10)));
  return v >= 64 ? '64x+' : `${v}x`;
}
function modrinthTypeFor(x){
  if(x.category==='mods') return 'mod';
  if(x.category==='textures') return 'resourcepack';
  if(x.category==='shaders') return 'shader';
  return null;
}
function enrich(x,i,total) {
  return {...x,index:i,size:sizeOf(x),loader:x.category==='mods'?'Mod Loader dependent':'Minecraft Java',
    added:total-i, modrinthType:modrinthTypeFor(x)};
}
function directResourceUrl(x){
  if(x?.url && !x.url.includes('?query=')) return x.url;
  if(x?.modrinthType){
    const slug=String(x.name).toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return `https://modrinth.com/${x.modrinthType}/${slug}`;
  }
  return x?.url||'#';
}
function modrinthCacheKey(x){ return `fp:modrinth:${x.category}:${x.name}`; }
async function resolveModrinthProject(x){
  if(!x.modrinthType) return null;
  const cached=safeStorage.get(modrinthCacheKey(x));
  if(cached){ try { return JSON.parse(cached); } catch{} }
  try{
    const facets=encodeURIComponent(JSON.stringify([[`project_type:${x.modrinthType}`]]));
    const url=`https://api.modrinth.com/v2/search?query=${encodeURIComponent(x.name)}&limit=5&facets=${facets}`;
    const r=await fetch(url,{headers:{'Accept':'application/json'}});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const d=await r.json();
    const hits=Array.isArray(d.hits)?d.hits:[];
    const target=hits.sort((a,b)=>{
      const an=String(a.title||a.name||'').toLocaleLowerCase(), bn=String(b.title||b.name||'').toLocaleLowerCase();
      const q=String(x.name).toLocaleLowerCase();
      return (an===q? -2:an.includes(q)?-1:0)-(bn===q?-2:bn.includes(q)?-1:0);
    })[0];
    if(!target?.project_id) return null;
    let image=target.icon_url||x.image;
    let gallery=[];
    try{
      const pr=await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(target.project_id)}`,{headers:{'Accept':'application/json'}});
      if(pr.ok){
        const pd=await pr.json();
        gallery=Array.isArray(pd.gallery)?pd.gallery:[];
        image=gallery.find(g=>g.featured)?.url || gallery[0]?.url || pd.icon_url || image;
      }
    }catch{}
    const result={url:`https://modrinth.com/${x.modrinthType}/${target.slug}`,image};
    safeStorage.set(modrinthCacheKey(x),JSON.stringify(result));
    return result;
  }catch(err){ console.warn('Modrinth resolve failed',x.name,err); return null; }
}
async function hydrateModrinthResources(){
  const targets=items.filter(x=>x.modrinthType);
  let cursor=0;
  const workers=Array.from({length:4},async()=>{
    while(cursor<targets.length){
      const x=targets[cursor++];
      const resolved=await resolveModrinthProject(x);
      if(resolved){ x.url=resolved.url; x.image=resolved.image; }
      // Refresh only the visible cards after a resource resolves.
      const imgEls=$$('img',document).filter(img=>img.dataset.fpName===x.name);
      imgEls.forEach(img=>{img.src=x.image;});
      const links=$$(`.card[data-index="${x.index}"] .download`);
      links.forEach(a=>a.href=x.url);
    }
  });
  await Promise.all(workers);
}
function formatNum(n) { return new Intl.NumberFormat(state.lang==='fa'?'fa-IR':'en-US',{notation:'compact',maximumFractionDigits:1}).format(n); }
function filtered() {
  const q = normalize(state.q.trim());
  const a = items.filter(x =>
    (state.filter==='all'||x.category===state.filter) &&
    (state.version==='all'||x.version===state.version) &&
    (state.size==='all'||x.size===state.size) &&
    normalize(`${x.name} ${x.description} ${x.meta} ${x.tags||''}`).includes(q)
  );
  if (state.sort==='rating') a.sort((a,b)=>getStats(b).rating-getStats(a).rating || a.index-b.index);
  else if (state.sort==='downloads') a.sort((a,b)=>getStats(b).downloads-getStats(a).downloads || a.index-b.index);
  else if (state.sort==='newest') a.sort((a,b)=>b.added-a.added);
  else a.sort((a,b)=>(Number(b.featured===true)-Number(a.featured===true)) || a.index-b.index);
  return a;
}
function resetPages() { Object.keys(state.pages).forEach(k=>state.pages[k]=1); }

function card(x) {
  const L=labels[state.lang], s=getStats(x);
  return `<article class="card" data-index="${x.index}">
    <button class="card-open" type="button" aria-label="${esc(L.details)}: ${esc(x.name)}">
      <div class="pic"><img data-fp-name="${esc(x.name)}" src="${esc(x.image)}" alt="${esc(x.name)}" loading="lazy" decoding="async" width="640" height="360"><span class="image-fallback" aria-hidden="true">${esc(L.noImage)}</span><b class="badge">${esc(x.badge)}</b></div>
      <div class="body">
        <div class="meta"><span>${esc(x.meta)}</span><span>${esc(L.version)}: ${esc(x.version)}</span></div>
        <h3>${esc(x.name)}</h3><p>${esc(x.description)}</p>
        <div class="tags">${(x.tags||'').split('|').filter(Boolean).slice(0,3).map(t=>`<span>${esc(t)}</span>`).join('')}</div>
        <div class="stats"><span>★ ${s.rating.toFixed(1)}</span><span>↓ ${formatNum(s.downloads)}</span></div>
      </div>
    </button>
    <a class="download" href="${esc(directResourceUrl(x))}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${esc(L.official)}</a>
  </article>`;
}
function pageBlock(c,arr) {
  const L=labels[state.lang], total=Math.ceil(arr.length/PAGE_SIZE);
  const page=Math.min(state.pages[c]||1,Math.max(total,1)); state.pages[c]=page;
  const shown=arr.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE), buttons=[];
  if(total>1) {
    buttons.push(`<button class="page-btn" type="button" data-page-cat="${c}" data-page="${page-1}" ${page===1?'disabled':''}>‹ ${esc(L.prev)}</button>`);
    for(let i=1;i<=total;i++){
      if(total>7&&i>2&&i<total-1&&Math.abs(i-page)>1){if(i===3||i===total-2)buttons.push('<span class="page-dots" aria-hidden="true">…</span>');continue;}
      buttons.push(`<button class="page-btn ${i===page?'active':''}" type="button" data-page-cat="${c}" data-page="${i}" aria-current="${i===page?'page':'false'}">${i}</button>`);
    }
    buttons.push(`<button class="page-btn" type="button" data-page-cat="${c}" data-page="${page+1}" ${page===total?'disabled':''}>${esc(L.next)} ›</button>`);
  }
  return {shown,total,page,pager:total>1?`<nav class="pagination" aria-label="${esc(L.page)}"><span>${esc(L.page)} ${page} / ${total}</span>${buttons.join('')}</nav>`:''};
}
function applyStaticText() {
  const L=labels[state.lang];
  document.documentElement.lang=state.lang; document.documentElement.dir=state.lang==='fa'?'rtl':'ltr';
  $('#heroText').textContent=L.heroText; $('#heroTitle').innerHTML=L.heroTitle;
  $('#search').placeholder=L.search;
  $('#themeBtn').setAttribute('aria-label',L.theme); $('#themeBtn').title=L.theme;
  $('#lang').textContent=state.lang==='fa'?'EN':'فا';
  $('#lang').setAttribute('aria-label',state.lang==='fa'?'Switch language':'تغییر زبان');
  $('#menuBtn').setAttribute('aria-label',state.menu?L.menuClose:L.menuOpen); $('#menuBtn').setAttribute('aria-expanded',String(state.menu));
  $('#modalClose').setAttribute('aria-label',L.close);
  const navMap={shaders:L.shaders,textures:L.textures,mods:L.mods,maps:L.maps,clients:L.clients};
  $$('nav a').forEach(a=>{const key=a.getAttribute('href')?.slice(1);if(navMap[key])a.textContent=navMap[key];});
  $('#clearData').textContent=L.clear;
  const discoverTitle=$('.discover h2'); if(discoverTitle) discoverTitle.textContent=L.discover;
  const featuredTitle=$('#featured h2'); if(featuredTitle) featuredTitle.textContent='🔥 '+L.featured;
  const whyTitle=$('.why h2'); if(whyTitle) whyTitle.textContent=L.why;
  const footerHome=$('.footer-links a[href="#home"]'); if(footerHome) footerHome.textContent=L.home;
  const footerResources=$('.footer-links a[href="#catalog"]'); if(footerResources) footerResources.textContent=L.resources;
  const footerContact=$('.footer-links a[href^="mailto:"]'); if(footerContact) footerContact.textContent=L.contact;
}
function populateVersions() {
  const L=labels[state.lang], sel=$('#versionFilter'), current=state.version;
  const vals=[...new Set(items.map(x=>x.version).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
  sel.innerHTML=`<option value="all">${esc(L.allVersions)}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  sel.value=vals.includes(current)?current:'all'; state.version=sel.value;
  $('#sizeFilter').innerHTML=`<option value="all">${esc(L.allSizes)}</option><option value="16x">16x</option><option value="32x">32x</option><option value="64x+">64x+</option>`;
  $('#sizeFilter').value=state.size;
  $('#sortFilter').innerHTML=`<option value="featured">${esc(L.selected)}</option><option value="rating">${esc(L.topRated)}</option><option value="downloads">${esc(L.mostDownloaded)}</option><option value="newest">${esc(L.newest)}</option>`;
  $('#sortFilter').value=state.sort;
}
function render() {
  const L=labels[state.lang]; applyStaticText();
  $('#filters').className='filters';
  $('#filters').innerHTML=CATS.map(c=>`<button class="filter ${state.filter===c?'active':''}" type="button" data-c="${c}" aria-pressed="${state.filter===c}">${esc(L[c])}</button>`).join('');
  const a=filtered(); $('#count').textContent=`${a.length} ${L.found}`;
  const groups=CATS.slice(1).map(c=>[c,a.filter(x=>x.category===c)]).filter(([,arr])=>arr.length);
  $('#catalog').innerHTML=groups.length?groups.map(([c,arr],i)=>{
    const pg=pageBlock(c,arr);
    return `<section class="section" id="${c}" aria-labelledby="${c}-title"><div class="section-head"><div><small>0${i+1} / MINECRAFT</small><h2 id="${c}-title">${esc(L[c])}</h2></div><p>${arr.length} ${esc(L.items)}</p></div><div class="grid">${pg.shown.map(card).join('')}</div>${pg.pager}</section>`;
  }).join(''):`<div class="empty"><strong>${esc(L.empty)}</strong><span>${esc(L.emptySub)}</span></div>`;
  const picks=[...items].sort((a,b)=>(Number(b.featured===true)-Number(a.featured===true))||getStats(b).rating-getStats(a).rating||a.index-b.index).slice(0,4);
  $('#featuredGrid').innerHTML=picks.map(card).join('');
  populateVersions(); $('#mobileNav').classList.toggle('open',state.menu);
  bindCards(); bindImages();
}
function bindCards() { $$('.card-open').forEach(b=>b.onclick=()=>openModal(items[Number(b.closest('.card').dataset.index)])); }
function bindImages() { $$('img', $('#catalog')).concat($$('img', $('#featuredGrid'))).forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.closest('.pic')?.classList.add('image-error');},{once:true})); }
function openModal(x) {
  if(!x)return;
  const L=labels[state.lang], s=getStats(x); s.views++; saveStats(x,s); lastFocused=document.activeElement;
  const image=$('#modalImage'); image.hidden=false; image.src=x.image; image.alt=x.name; image.onerror=()=>{image.hidden=true;};
  $('#modalBadge').textContent=x.badge; $('#modalTitle').textContent=x.name; $('#modalDescription').textContent=x.description;
  $('#modalFacts').innerHTML=`<span>${esc(L.version)}: <b>${esc(x.version)}</b></span><span>${esc(L.type)}: <b>${esc(x.meta)}</b></span><span>${esc(L.size)}: <b>${esc(x.size)}</b></span>`;
  $('#modalTags').innerHTML=(x.tags||'').split('|').filter(Boolean).map(t=>`<span>${esc(t)}</span>`).join('');
  $('#modalRating').textContent=`★ ${s.rating.toFixed(1)} / 5 (${s.ratings})`;
  $('#modalDownloads').textContent=`↓ ${formatNum(s.downloads)} ${L.downloads} · ${formatNum(s.views)} ${L.views}`;
  const rate=$('#rateBtn'); rate.textContent=s.rated?L.rated:L.rate; rate.disabled=s.rated;
  rate.onclick=()=>{if(s.rated)return;s.rating=Math.min(5,(s.rating*s.ratings+5)/(s.ratings+1));s.ratings++;s.rated=true;saveStats(x,s);openModal(x);};
  const source=$('#modalSource'); source.href=directResourceUrl(x); source.textContent=L.official;
  $('#modal').classList.add('open'); $('#modal').setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); $('#modalClose').focus();
}
function closeModal() { $('#modal').classList.remove('open'); $('#modal').setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); if(lastFocused?.focus)lastFocused.focus(); }
function toggleTheme() { const dark=document.body.classList.toggle('dark'); safeStorage.set(STORAGE.dark,dark?'1':'0'); updateThemeColor(dark); }
function updateThemeColor(dark=document.body.classList.contains('dark')) { const meta=$('meta[name="theme-color"]'); if(meta)meta.content=dark?'#1d1511':'#43291d'; }
function trapFocus(e) {
  if(e.key!=='Tab'||!$('#modal').classList.contains('open'))return;
  const els=$$('#modal button,#modal a,[tabindex]:not([tabindex="-1"])').filter(x=>!x.disabled&&x.offsetParent!==null);
  if(!els.length)return; const first=els[0],last=els[els.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();} else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
}
function showToast(text) { const toast=$('#toast'); if(!toast)return; toast.textContent=text; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2200); }

$('#search').addEventListener('input',e=>{clearTimeout(searchTimer); const value=e.target.value; searchTimer=setTimeout(()=>{state.q=value;resetPages();render();},120);});
$('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b){state.filter=b.dataset.c;resetPages();render();}});
document.addEventListener('click',e=>{
  const page=e.target.closest('[data-page-cat]');
  if(page&&!page.disabled){state.pages[page.dataset.pageCat]=Number(page.dataset.page);render();document.getElementById(page.dataset.pageCat)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  const navLink=e.target.closest('#mobileNav a');
  if(navLink){state.menu=false;render();}
});
$('#versionFilter').addEventListener('change',e=>{state.version=e.target.value;resetPages();render();});
$('#sizeFilter').addEventListener('change',e=>{state.size=e.target.value;resetPages();render();});
$('#sortFilter').addEventListener('change',e=>{state.sort=e.target.value;resetPages();render();});
$('#lang').addEventListener('click',()=>{state.lang=state.lang==='fa'?'en':'fa';safeStorage.set(STORAGE.lang,state.lang);render();window.__fpAssistantRefresh?.();});
$('#menuBtn').addEventListener('click',()=>{state.menu=!state.menu;render();});
$('#modalClose').addEventListener('click',closeModal); $('.modal-backdrop').addEventListener('click',closeModal);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#modal').classList.contains('open'))closeModal();else if(state.menu){state.menu=false;render();}}trapFocus(e);});
$('#themeBtn').addEventListener('click',toggleTheme);
$('#clearData').addEventListener('click',e=>{e.preventDefault();safeStorage.keys().filter(k=>k.startsWith('fp:')).forEach(k=>safeStorage.remove(k));showToast(labels[state.lang].clearDone);render();});

// Local First Pack assistant: fast FAQ answers without an API key.
const assistantFAQ = [
  {keys:['ماینکرافت رو از کجا نصب کنم','ماینکرافت از کجا نصب کنم','دانلود ماینکرافت','minecraft download','install minecraft'], fa:'برای نسخه Java، بهترین کار این است که لانچر رسمی Minecraft را از سایت رسمی Minecraft دریافت کنی. بعد با حساب Microsoft وارد شو و نسخه Java را اجرا کن. برای امنیت، از لانچرها و فایل‌های ناشناس استفاده نکن.', en:'For Minecraft Java, the safest option is the official Minecraft Launcher. Download it from the official Minecraft website, sign in with your Microsoft account, and launch Java Edition. Avoid unknown launchers or installers.', link:'https://www.minecraft.net/download'},
  {keys:['فرق کلاینت ها با هم چیه','فرق کلاینت ها','کلاینت چیست','client difference','clients'], fa:'کلاینت‌های Minecraft معمولاً لانچر یا محیطی آماده برای بازی هستند که امکاناتی مثل بهینه‌سازی، HUD، تنظیمات و مودهای داخلی ارائه می‌کنند. تفاوتشان بیشتر در امکانات، مصرف منابع، سازگاری و رابط کاربری است؛ مثلاً Lunar و Badlion هرکدام مجموعه امکانات متفاوتی دارند.', en:'Minecraft clients are usually customized launchers or game environments that bundle features such as optimization, HUDs, settings, and built-in mods. They mainly differ in features, resource usage, compatibility, and interface.', link:null},
  {keys:['کیپ اوپتیفاین چیست','کیپ optifine چیست','optifine cape','cape optifine','اپتیفاین کیپ'], fa:'OptiFine Cape یک آیتم ظاهری مرتبط با OptiFine است که روی بازیکنانی که شرایط دریافت/نمایش آن را دارند دیده می‌شود. خودِ کیپ باعث افزایش FPS نمی‌شود؛ بیشتر یک ویژگی ظاهری است.', en:'An OptiFine Cape is a cosmetic feature associated with OptiFine. It is visual and does not itself increase FPS.'},
  {keys:['شیدر چیست','shader چیست','شیدر چیه','what is a shader'], fa:'شیدرها ظاهر نور، سایه، آب، آسمان و بعضی جلوه‌های تصویری Minecraft را تغییر می‌دهند. معمولاً به GPU بیشتری نیاز دارند؛ اگر FPS پایین آمد، کیفیت سایه و رندر را کاهش بده.', en:'Shaders change lighting, shadows, water, skies, and other visual effects in Minecraft. They usually use more GPU power, so lower shadow or render quality if FPS drops.'},
  {keys:['تکسچر پک چیست','texture pack چیست','resource pack چیست','تکسچر پک چیه'], fa:'Texture Pack یا Resource Pack مجموعه‌ای از فایل‌های ظاهری است که بافت بلوک‌ها، آیتم‌ها، رابط کاربری و گاهی صداها را تغییر می‌دهد. برخلاف مود، معمولاً منطق بازی را تغییر نمی‌دهد.', en:'A Texture/Resource Pack changes visual assets such as blocks, items, UI, and sometimes sounds. Unlike a mod, it usually does not change game logic.'},
  {keys:['مود چیست','mod چیست','مود چیه'], fa:'مود یک افزونه برای Minecraft است که می‌تواند امکانات، مکانیک‌ها، رابط کاربری یا عملکرد بازی را تغییر دهد. سازگاری مود با نسخه Minecraft و Loader مثل Fabric یا NeoForge را قبل از نصب بررسی کن.', en:'A mod is an add-on that can change Minecraft features, mechanics, UI, or performance. Check the Minecraft version and loader compatibility, such as Fabric or NeoForge, before installing.'},
  {keys:['fabric یا forge','fabric vs forge','فرق فابریک و فورج','فرق fabric و forge'], fa:'Fabric و Forge هر دو محیط اجرای مود هستند، اما اکوسیستم و سازگاری مودهایشان یکسان نیست. بهترین انتخاب به مودهایی که می‌خواهی استفاده کنی بستگی دارد؛ صفحه هر مود را برای Loader موردنیاز بررسی کن.', en:'Fabric and Forge are both mod loaders, but their ecosystems and mod compatibility differ. Choose based on the mods you want and check each project for its required loader.'},
  {keys:['چطور fps رو زیاد کنم','افزایش fps','fps بالا','increase fps'], fa:'اول Render Distance و Simulation Distance را کمی پایین بیاور، سپس گرافیک را روی Fast بگذار و برنامه‌های اضافی را ببند. برای بهینه‌سازی بیشتر، از مودهای شناخته‌شده و سازگار با نسخه‌ات استفاده کن.', en:'Lower Render Distance and Simulation Distance, use Fast graphics, and close unnecessary apps. For more optimization, use well-known performance mods compatible with your Minecraft version.'},
  {keys:['کدام شیدر بهتر است','بهترین شیدر','best shader'], fa:'یک شیدر «بهترین» برای همه وجود ندارد؛ انتخاب به قدرت سیستم و سلیقه بستگی دارد. اگر FPS مهم‌تر است، شیدرهای سبک‌تر را انتخاب کن؛ اگر کیفیت تصویر مهم‌تر است، سراغ پریست‌های سنگین‌تر برو.', en:'There is no single best shader for everyone. Choose based on your hardware and priorities: lighter shaders for FPS, heavier presets for visual quality.'},
  {keys:['چطور مود نصب کنم','نصب مود','install mod'], fa:'اول نسخه Minecraft و Loader موردنیاز مود را بررسی کن. سپس Loader سازگار را نصب کن و فایل مود را طبق دستور همان پروژه در پوشه mods قرار بده. از فایل‌های ناشناس استفاده نکن و قبل از نصب از دنیای مهمت نسخه پشتیبان بگیر.', en:'First check the mod’s required Minecraft version and loader. Install the compatible loader, then follow the project instructions for placing the mod in the mods folder. Avoid unknown files and back up important worlds first.'}
];

function assistantNormalize(v){return String(v||'').toLocaleLowerCase('fa-IR').replace(/[؟?!.,،؛:()\[\]{}]/g,' ').replace(/\s+/g,' ').trim();}
function assistantScore(query, item){
  const q=assistantNormalize(query); if(!q) return 0;
  let score=0;
  for(const key of item.keys){
    const k=assistantNormalize(key);
    if(q.includes(k)) score=Math.max(score,100+k.length);
    else {
      const words=k.split(' ').filter(w=>w.length>2);
      const hits=words.filter(w=>q.includes(w)).length;
      score=Math.max(score,hits*10 + (hits===words.length&&words.length>1?25:0));
    }
  }
  return score;
}
function assistantAnswer(query){
  const ranked=assistantFAQ.map(x=>({x,score:assistantScore(query,x)})).sort((a,b)=>b.score-a.score);
  const best=ranked[0];
  if(best && best.score>=20) return best.x;
  return {fa:'سؤال خوبی بود! من فعلاً برای سؤال‌های رایج Minecraft و منابع First Pack پاسخ آماده دارم. یکی از گزینه‌های پیشنهادی را امتحان کن یا سؤال را کوتاه‌تر بنویس.',en:'Good question! I currently have quick answers for common Minecraft and First Pack topics. Try a suggested question or make your question a little shorter.'};
}
function initAssistant(){
  const root=$('#fpAssistant'); if(!root)return;
  const launcher=$('#fpAssistantLauncher'), panel=$('#fpAssistantPanel'), close=$('#fpAssistantClose'), form=$('#fpAssistantForm'), input=$('#fpAssistantInput'), messages=$('#fpAssistantMessages'), suggestions=$('#fpAssistantSuggestions');
  let open=false;
  const suggestionsFA=['ماینکرافت رو از کجا نصب کنم؟','فرق کلاینت‌ها چیه؟','کیپ اوپتیفاین چیست؟','شیدر چیست؟'];
  const suggestionsEN=['Where can I install Minecraft?','What is the difference between clients?','What is an OptiFine Cape?','What is a shader?'];
  const welcome={fa:'سلام! 👋 من دستیار First Pack هستم. درباره Minecraft، مود، شیدر، تکسچر پک و کلاینت‌ها سؤال بپرس.',en:'Hi! 👋 I’m the First Pack assistant. Ask me about Minecraft, mods, shaders, resource packs, or clients.'};
  function currentText(){return state.lang==='fa';}
  function addMessage(text,who='bot',link=null){
    const bubble=document.createElement('div'); bubble.className=`fp-msg ${who}`; bubble.textContent=text;
    if(link){const a=document.createElement('a');a.href=link;a.target='_blank';a.rel='noopener noreferrer';a.textContent=state.lang==='fa'?'باز کردن سایت رسمی ↗':'Open official site ↗';bubble.appendChild(document.createElement('br'));bubble.appendChild(a);}
    messages.appendChild(bubble); messages.scrollTop=messages.scrollHeight;
  }
  function renderSuggestions(){suggestions.innerHTML=''; const arr=state.lang==='fa'?suggestionsFA:suggestionsEN; arr.forEach(text=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',()=>ask(text));suggestions.appendChild(b);});}
  function ask(text){
    const q=String(text||'').trim(); if(!q)return;
    addMessage(q,'user');
    const answer=assistantAnswer(q); setTimeout(()=>addMessage(state.lang==='fa'?answer.fa:answer.en,'bot',answer.link),140);
    input.value='';
  }
  function setOpen(v){open=v;panel.hidden=!v;launcher.setAttribute('aria-expanded',String(v));root.classList.toggle('is-open',v);if(v){if(!messages.children.length)addMessage(currentText()?welcome.fa:welcome.en);renderSuggestions();setTimeout(()=>input.focus(),0);}else launcher.focus();}
  launcher.addEventListener('click',()=>setOpen(!open)); close.addEventListener('click',()=>setOpen(false));
  form.addEventListener('submit',e=>{e.preventDefault();ask(input.value);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)setOpen(false);});
  const oldRender=render;
  // Keep assistant labels synchronized with the site's language without replacing the chat history.
  window.__fpAssistantRefresh=()=>{if(!root)return; $('#fpAssistantTitle').textContent=state.lang==='fa'?'دستیار First Pack':'First Pack Assistant'; $('#fpAssistantStatus').textContent=state.lang==='fa'?'پاسخ‌های سریع درباره Minecraft':'Quick answers about Minecraft'; input.placeholder=state.lang==='fa'?'مثلاً: فرق کلاینت‌ها چیه؟':'e.g. What is the difference between clients?'; if(open)renderSuggestions();};
  window.__fpAssistantSetOpen=setOpen;
  window.__fpAssistantRefresh();
}
initAssistant();


if(safeStorage.get(STORAGE.dark)==='1')document.body.classList.add('dark');
updateThemeColor(); applyStaticText();
fetch('data.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();})
.then(d=>{
  if(!Array.isArray(d))throw new Error('Invalid data');
  const valid=d.filter(x=>x&&x.name&&x.category&&x.url&&x.image);
  items=valid.map((x,i)=>enrich(x,i,valid.length));
  render();
  // Replace placeholder artwork with real Modrinth project/gallery images
  // and convert search links into the exact project page when available.
  hydrateModrinthResources();
})
.catch(err=>{
  console.error(err); const L=labels[state.lang]; $('#count').textContent=L.loadError;
  $('#catalog').innerHTML=`<div class="empty"><strong>${esc(L.loadError)}</strong><span>${esc(L.emptySub)}</span></div>`;
});
})();
