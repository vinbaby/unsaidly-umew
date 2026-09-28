const moods=['lonely','love','angry','happy','confused','secret','lovely'];
const labels={lonely:'Lonely',love:'Love',angry:'Angry',happy:'Happy',confused:'Confused',secret:'Secret',lovely:'Lovely'};
const demo=[
 ['love','I used to think I wasn\'t worthy of love... until someone chose to stay. 💗','love',324,52],
 ['lonely','There are so many people around me, yet somehow I still feel alone...','lonely',217,47],
 ['happy','Nothing special happened today, but I still feel happy.','happy',187,29],
 ['secret','Some things... can only be hidden here.','secret',192,18],
 ['confused','I don\'t know if I miss you, or just the feeling of being with you...','confused',176,34],
 ['lovely','Small things can still make life feel a little brighter...','lovely',159,23],
 ['angry','I\'m not angry at you... I\'m just hurt.','angry',192,41]
];
const cfg=window.UNSAIDLY_CONFIG||{};
const hasValidConfig=typeof cfg.supabaseUrl==='string'&&/^https?:\/\//.test(cfg.supabaseUrl)&&typeof cfg.supabaseKey==='string'&&cfg.supabaseKey.length>20&&!/PASTE_|DÁN_|YOUR_|YOUR-KEY|PLACEHOLDER/i.test(cfg.supabaseKey);
const online=hasValidConfig&&window.supabase&&typeof window.supabase.createClient==='function';
const db=online?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey):null;
if(!online) console.warn('[UNSAIDLY] Supabase is not configured correctly. Falling back to demo mode.');
let anon=localStorage.getItem('unsaidly_anon_id');
if(!anon){anon=crypto.randomUUID();localStorage.setItem('unsaidly_anon_id',anon)}
let cache=[];
let myReactions=new Set();
let state={filter:'for',page:'home',mood:null};
const img=n=>`assets/${n}.jpg`;
const metooIcon=`<img class="metoo-icon" src="assets/metoo.svg" alt="Me Too">`;

async function loadPosts(){
 if(!online){
  let x=JSON.parse(localStorage.getItem('unsaidly_v2_posts')||'null');
  if(!x){x=demo.map((d,i)=>({id:'d'+i,mood:d[0],content:d[1],image:d[2],me_too_count:d[3],reply_count:d[4],created_at:new Date(Date.now()-i*3600000).toISOString(),anon_id:'demo'}));localStorage.setItem('unsaidly_v2_posts',JSON.stringify(x))}
  cache=x;return x;
 }
 const {data,error}=await db.from('posts').select('*').eq('status','active').order('created_at',{ascending:false});
 if(error){console.error('[UNSAIDLY loadPosts]',error);toast(`Could not load online data: ${error.message||error.code||'Supabase error'}`);return cache}
 cache=data||[];
 const {data:rx}=await db.from('me_too_reactions').select('post_id').eq('anon_id',anon);
 myReactions=new Set((rx||[]).map(x=>x.post_id));
 return cache;
}
function saveOffline(x){localStorage.setItem('unsaidly_v2_posts',JSON.stringify(x));cache=x}
function moodCards(){return `<div class="moods">${moods.map(m=>`<button class="mood ${state.mood===m?'selected':''}" style="--img:url('${img(m)}')" onclick="filterMood('${m}')"><span>${labels[m]}</span></button>`).join('')}</div>`}
function postCard(p,i=0){let mine=myReactions.has(p.id);return `<article class="post ${i%5===1?'tall':''}"><div class="post-bg" style="background-image:url('${img(p.image||p.mood)}')"></div><div class="post-shade"></div><div class="post-content"><span class="tag"># ${labels[p.mood]||p.mood}</span><div class="quote">“${escapeHtml(p.content)}”</div><div class="post-actions"><button class="metoo-btn ${mine?'active':''}" onclick="meToo('${p.id}')">${metooIcon}<span>${p.me_too_count||0} Me Too</span></button><button onclick="openReplies('${p.id}')">💬 ${p.reply_count||0}</button><button onclick="openMenu('${p.id}')">•••</button></div></div></article>`}

async function mountAds(){
 const slots=[...document.querySelectorAll('.ad-network-unit[data-ad-key]')];
 for(const slot of slots){
  if(slot.dataset.loaded) continue;
  slot.dataset.loaded='1';
  const key=slot.dataset.adKey, width=Number(slot.dataset.adWidth), height=Number(slot.dataset.adHeight);
  window.atOptions={key,format:'iframe',height,width,params:{}};
  await new Promise(resolve=>{
   const script=document.createElement('script');
   script.src=`https://www.highrevenueformat.com/${key}/invoke.js`;
   script.onload=script.onerror=resolve;
   slot.appendChild(script);
  });
 }
}
async function render(){await loadPosts();let all=[...cache];let list=state.mood?all.filter(p=>p.mood===state.mood):all;if(state.filter==='trend')list.sort((a,b)=>(b.me_too_count||0)-(a.me_too_count||0));else list.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));let feed='';list.forEach((p,i)=>{feed+=postCard(p,i);if(i===3)feed+=`<div class="adrow"><div class="ad ad-banner-728 ad-network-slot"><div class="ad-label">ADVERTISEMENT</div><div class="ad-network-unit" data-ad-key="54a8990b62ae6aa51387a1d6725794f0" data-ad-width="728" data-ad-height="90"></div></div></div>`});document.querySelector('#app').innerHTML=`<div class="layout"><aside class="sidebar"><div class="brand"><img src="assets/lovely.jpg"><div><h1>UNSAIDLY</h1><p>Say it. Let it go. 🖤</p></div></div><nav class="nav"><button class="active" onclick="home()"><span class="ico">🏠</span>Home</button><button onclick="setFilter('trend')"><span class="ico">🔥</span>Trending</button><button onclick="setFilter('new')"><span class="ico">🕒</span>Latest</button><button onclick="randomPost()"><span class="ico">🎲</span>Random</button><button onclick="showMood()"><span class="ico">🌐</span>World Mood</button></nav><div class="nav-title">Explore</div><nav class="nav"><button onclick="filterMood('love')">💗 Love</button><button onclick="filterMood('happy')">🎓 Study</button><button onclick="filterMood('angry')">💼 Work</button><button onclick="filterMood('lovely')">🏠 Family</button><button onclick="filterMood('lonely')">👥 Friends</button></nav><div class="sidebar-ad ad-slot ad-sidebar ad-network-slot"><div class="ad-label">ADVERTISEMENT</div><div class="ad-network-unit" data-ad-key="e27e6a673ade46e575b56131e1d9f133" data-ad-width="300" data-ad-height="250"></div><div class="ad-sponsored">Sponsored</div></div></aside><main><div class="topbar"><input class="search" placeholder="🔎  Search feelings, keywords, hashtags..." oninput="searchPosts(this.value)"><button class="round" onclick="randomPost()">🎲 Surprise me</button><button class="round">🔔</button><button class="say" onclick="openComposer()">✎ + Say something...</button></div>${!online?'<div class="setup-note">⚠️ DEMO MODE — Supabase is not connected, so data is stored only in this browser.</div>':'<div class="live-note">● LIVE — Anonymous posts are shared online</div>'}${moodCards()}<div class="section-head"><h2>${state.mood?'# '+labels[state.mood]:'Explore feelings'}</h2><div class="filters"><button class="filter ${state.filter==='for'?'active':''}" onclick="setFilter('for')">For You</button><button class="filter ${state.filter==='trend'?'active':''}" onclick="setFilter('trend')">🔥 Trending</button><button class="filter ${state.filter==='new'?'active':''}" onclick="setFilter('new')">🕒 Latest</button></div></div><section class="feed">${feed||'<div class="panel">No matching posts.</div>'}</section></main>${rightbar()}<div class="mobile-nav"><button onclick="home()">🏠<span>Home</span></button><button onclick="randomPost()">🎲<span>Random</span></button><button onclick="openComposer()">➕<span>Post</span></button><button onclick="showMood()">🌐<span>Mood</span></button></div></div>`;mountAds();}
function rightbar(){let counts={};cache.forEach(p=>counts[p.mood]=(counts[p.mood]||0)+1);let total=Math.max(cache.length,1);return `<aside class="rightbar"><section class="panel ad-slot ad-right ad-network-slot"><div class="ad-label">ADVERTISEMENT</div><div class="ad-network-unit" data-ad-key="e27e6a673ade46e575b56131e1d9f133" data-ad-width="300" data-ad-height="250"></div><div class="ad-sponsored">Sponsored</div></section><section class="panel"><h3>📊 World Mood</h3><div class="chart"><div class="donut"></div><div class="legend">${moods.slice(0,6).map(m=>`${labels[m]} ${Math.round(((counts[m]||0)/total)*100)}%`).join('<br>')}</div></div></section></aside>`}
function setFilter(x){state.filter=x;state.mood=null;render()}function filterMood(m){state.mood=m;state.filter='for';render()}function home(){state.mood=null;state.filter='for';render()}
async function meToo(id){
 if(!online){let x=[...cache],p=x.find(a=>a.id===id);let rs=JSON.parse(localStorage.getItem('unsaidly_offline_metoo')||'{}');if(rs[id]){delete rs[id];p.me_too_count=Math.max(0,(p.me_too_count||0)-1)}else{rs[id]=true;p.me_too_count=(p.me_too_count||0)+1}localStorage.setItem('unsaidly_offline_metoo',JSON.stringify(rs));saveOffline(x);myReactions=new Set(Object.keys(rs));return render()}
 const {data,error}=await db.rpc('toggle_me_too',{p_post_id:id,p_anon_id:anon});if(error){toast('Me Too could not be sent.');console.error(error);return}if(data?.[0]?.active)myReactions.add(id);else myReactions.delete(id);let p=cache.find(x=>x.id===id);if(p)p.me_too_count=data?.[0]?.me_too_count??p.me_too_count;render();
}
function randomPost(){if(!cache.length)return;let x=cache[Math.floor(Math.random()*cache.length)];state.mood=x.mood;state.filter='for';render().then(()=>setTimeout(()=>document.querySelector('.post')?.scrollIntoView({behavior:'smooth',block:'center'}),80))}
function searchPosts(q){let all=[...cache].filter(p=>(p.content+' '+p.mood).toLowerCase().includes(q.toLowerCase()));document.querySelector('.feed').innerHTML=all.map(postCard).join('')||'<div class="panel">No matching thoughts found.</div>'}
function modal(html){document.body.insertAdjacentHTML('beforeend',`<div class="modal-back" id="modal"><div class="modal">${html}</div></div>`)}function closeModal(){document.querySelector('#modal')?.remove()}
function openComposer(){modal(`<h2>✎ Say it here.</h2><p style="color:#9ca1bd">Nobody needs to know who you are.</p><textarea id="newText" class="textarea" maxlength="500" placeholder="What's something you can't say out loud?"></textarea><div style="margin-top:12px">${moods.map(m=>`<button class="filter" onclick="chooseMood('${m}')">${labels[m]}</button>`).join(' ')}</div><div class="modal-actions"><button class="primary" onclick="submitPost()">POST ANONYMOUSLY 🖤</button><button class="ghost" onclick="closeModal()">Cancel</button></div></div>`);window.chosenMood='lonely'}
function chooseMood(m){window.chosenMood=m;document.querySelectorAll('#modal .filter').forEach(b=>b.classList.toggle('active',b.textContent===labels[m]))}
async function submitPost(){let t=document.querySelector('#newText').value.trim();if(!t)return alert('Write something first 🖤');let row={mood:window.chosenMood||'lonely',content:t,anon_id:anon};if(online){let {error}=await db.from('posts').insert(row);if(error){console.error('[UNSAIDLY submitPost]',error);return toast(`Post failed: ${error.message||error.code||'Supabase error'}`)}}else{let x=[...cache];x.unshift({id:crypto.randomUUID(),...row,image:row.mood,me_too_count:0,reply_count:0,created_at:new Date().toISOString()});saveOffline(x)}closeModal();home()}
async function openReplies(id){let p=cache.find(x=>x.id===id);let rs=[];if(online){let {data,error}=await db.from('replies').select('*').eq('post_id',id).eq('status','active').order('created_at');if(!error)rs=data||[]}else rs=JSON.parse(localStorage.getItem('unsaidly_v2_replies')||'[]').filter(x=>x.post_id===id);modal(`<h2>💬 Replies</h2><p style="color:#d9dbea">“${escapeHtml(p.content)}”</p>${rs.map(r=>`<div class="reply">${escapeHtml(r.content||r.text)}<br><small style="color:#8f94b2">Anonymous</small></div>`).join('')||'<p style="color:#8f94b2">No replies yet.</p>'}<textarea id="replyText" class="textarea" maxlength="300" placeholder="Say something anonymously..."></textarea><div class="modal-actions"><button class="primary" onclick="submitReply('${id}')">Reply anonymously</button><button class="ghost" onclick="closeModal()">Close</button></div></div>`)}
async function submitReply(id){let t=document.querySelector('#replyText').value.trim();if(!t)return;if(online){let {error}=await db.rpc('create_reply',{p_post_id:id,p_content:t,p_anon_id:anon});if(error){console.error('[UNSAIDLY submitReply]',error);return toast(`Reply failed: ${error.message||error.code||'Supabase error'}`)}}else{let r=JSON.parse(localStorage.getItem('unsaidly_v2_replies')||'[]');r.push({post_id:id,text:t});localStorage.setItem('unsaidly_v2_replies',JSON.stringify(r));let x=[...cache],p=x.find(a=>a.id===id);p.reply_count=(p.reply_count||0)+1;saveOffline(x)}closeModal();render()}
function openMenu(id){modal(`<h2>🚩 Report</h2><p style="color:#9ca1bd">Choose a reason for reporting this post.</p>${['Spam','Harassment','Hate','Dangerous content','Other'].map(r=>`<button class="ghost report" onclick="submitReport('${id}','${r}')">${r}</button>`).join('')}<div class="modal-actions"><button class="ghost" onclick="closeModal()">Close</button></div></div>`)}
async function submitReport(id,reason){if(online){let {error}=await db.from('reports').insert({post_id:id,anon_id:anon,reason});if(error){console.error('[UNSAIDLY submitReport]',error);return toast(`Report failed: ${error.message||error.code||'Supabase error'}`)}}else{let r=JSON.parse(localStorage.getItem('unsaidly_reports')||'[]');r.push({post_id:id,anon_id:anon,reason,created_at:new Date().toISOString()});localStorage.setItem('unsaidly_reports',JSON.stringify(r))}closeModal();toast('Report received. Thank you 🫂')}
function showMood(){document.querySelector('.rightbar .panel:last-child')?.scrollIntoView({behavior:'smooth'});}
function toast(msg){let d=document.createElement('div');d.className='toast';d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),2600)}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
render();