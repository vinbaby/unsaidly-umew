const ICONS={home:`<svg viewBox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8"/><path d="M5 10v10h14V10"/><path d="M9.5 20v-6h5v6"/></svg>`,search:`<svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>`,plus:`<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,bookmark:`<svg viewBox="0 0 24 24"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21z"/></svg>`,user:`<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5"/></svg>`,bell:`<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`,heart:`<svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5.2-8.8 10.2-8.8 10.2S3.2 14 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"/></svg>`,download:`<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/></svg>`,share:`<svg viewBox="0 0 24 24"><path d="M14 5h5v5"/><path d="M19 5 10 14"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>`,flag:`<svg viewBox="0 0 24 24"><path d="M5 21V4"/><path d="M5 5c5-3 8 3 14 0v9c-6 3-9-3-14 0"/></svg>`,more:`<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>`,mail:`<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>`,back:`<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>`,info:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 10v6"/><path d="M12 7h.01"/></svg>`,moon:`<svg viewBox="0 0 24 24"><path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>`,sun:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`};
function icon(name){return `<span class="ico">${ICONS[name]||''}</span>`}
function hydrateIcons(){document.querySelectorAll('.ico[data-icon]').forEach(el=>{el.innerHTML=ICONS[el.dataset.icon]||''})}
function applyTheme(theme){document.documentElement.classList.toggle('light',theme==='light');const b=$('themeBtn');if(b){b.querySelector('.ico').innerHTML=ICONS[theme==='light'?'moon':'sun'];b.querySelector('b').textContent=theme==='light'?'Tối':'Sáng'}localStorage.setItem('pigpic_theme',theme)}
const SUPABASE_URL='https://vexgmymcvyovwltilisk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_-L7UBemzT7FpVrUR12FogA_ASS2LKXC';
const R2_WORKER_URL='https://pigpic-api.picpig-41f.workers.dev';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id); const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let currentUser=null,currentPost=null,currentProfile=null,currentTab='for-you',authMode='login',searchTerm='';let publicProfileUser=null,currentConversationUser=null;
function status(t=''){ $('status').textContent=t; }
function setNotifBadge(n){ const b=$('notifBadge'); if(!b)return; b.textContent=n>0?(n>99?'99+':String(n)):''; b.classList.toggle('hidden',!(n>0)); }
async function refreshNotifBadge(){ if(!currentUser){setNotifBadge(0);return;} const {count}=await sb.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',currentUser.id).is('read_at',null); setNotifBadge(count||0); } function imgUrl(p){return `${R2_WORKER_URL}/image?key=${encodeURIComponent(p.image_key)}`}
function thumbUrl(p){return p.thumb_key ? `${R2_WORKER_URL}/image?key=${encodeURIComponent(p.thumb_key)}` : imgUrl(p)}
function openOverlay(id){$(id).classList.remove('hidden')} function closeOverlay(id){$(id).classList.add('hidden')}
function openAuth(mode='login'){authMode=mode;$('authTitle').textContent=mode==='login'?'Đăng nhập Pigpic':'Tạo tài khoản Pigpic';$('authSubmit').textContent=mode==='login'?'Đăng nhập':'Đăng ký';$('authSwitch').textContent=mode==='login'?'Chưa có tài khoản? Đăng ký':'Đã có tài khoản? Đăng nhập';$('authName').classList.toggle('hidden',mode==='login');$('authStatus').textContent='';openOverlay('authOverlay')}
async function submitAuth(){
  const email=$('authEmail').value.trim();
  const password=$('authPassword').value;
  const name=$('authName').value.trim();
  const out=$('authStatus');
  if(!email||!password){out.textContent='Nhập email và mật khẩu nha.';return}
  if(password.length<6){out.textContent='Mật khẩu cần ít nhất 6 ký tự.';return}
  $('authSubmit').disabled=true;
  out.textContent=authMode==='login'?'Đang đăng nhập...':'Đang tạo tài khoản...';
  try{
    if(authMode==='login'){
      const {data,error}=await sb.auth.signInWithPassword({email,password});
      if(error)throw error;
      currentUser=data.user||null;
      if(currentUser)await ensureProfile(currentUser);
      closeOverlay('authOverlay');
      out.textContent='';
      await refreshAuth();
      await loadPosts(currentTab);
    }else{
      const {data,error}=await sb.auth.signUp({email,password});
      if(error)throw error;
      if(data.user && data.session){
        currentUser=data.user;
        try{await ensureProfile(currentUser,name)}catch{}
        closeOverlay('authOverlay');
        out.textContent='';
        await refreshAuth();
        await loadPosts(currentTab);
      }else{
        out.textContent='Tạo tài khoản thành công. Hãy kiểm tra email để xác nhận rồi đăng nhập.';
      }
    }
  }catch(e){out.textContent='Không thể đăng nhập: '+(e?.message||'Có lỗi xảy ra.')}
  finally{$('authSubmit').disabled=false}
}
async function refreshAuth(){const {data:{user}}=await sb.auth.getUser();currentUser=user||null;$('loginBtn').textContent=user?'Đăng xuất':'Đăng nhập';$('avatar').textContent=(user?.email||'U')[0].toUpperCase();await refreshNotifBadge();await refreshMessageBadge();}
async function profileMap(ids){const u=[...new Set(ids.filter(Boolean))];if(!u.length)return{};const {data}=await sb.from('profiles').select('id,username,avatar_url,bio,is_private').in('id',u);return Object.fromEntries((data||[]).map(x=>[x.id,x]))}
async function blockedIds(){if(!currentUser)return[];const {data}=await sb.from('blocks').select('blocked_id').eq('blocker_id',currentUser.id);return (data||[]).map(x=>x.blocked_id)}
async function loadPosts(mode=currentTab){status('Đang tải Pigpic...');let q=sb.from('posts').select('id,user_id,image_key,thumb_key,width,height,caption,tags,created_at,status,likes_count,saves_count,views_count,is_nsfw').eq('status','active');if(searchTerm){const term=searchTerm.replace(/[,()]/g,' ').trim();if(term)q=q.ilike('caption',`%${term}%`);}if(mode==='hot')q=q.order('likes_count',{ascending:false}).order('created_at',{ascending:false});else q=q.order('created_at',{ascending:false});let {data,error}=await q.limit(40);if(error){status('Supabase lỗi: '+error.message);return}const blocked=await blockedIds();data=(data||[]).filter(p=>!blocked.includes(p.user_id));if(searchTerm)data=data.filter(p=>((p.caption||'')+' '+(p.tags||[]).join(' ')).toLowerCase().includes(searchTerm.toLowerCase()));const pm=await profileMap(data.map(p=>p.user_id));$('feed').innerHTML='';if(!data.length){$('feed').innerHTML='<div class="empty">Chưa có ảnh phù hợp.</div>';status('0 ảnh');return}data.forEach(p=>addCard(p,pm[p.user_id]));status(`Pigpic OK · ${data.length} ảnh`)}
async function isLiked(postId){if(!currentUser)return false;const {data}=await sb.from('likes').select('id').eq('user_id',currentUser.id).eq('post_id',postId).maybeSingle();return!!data}
async function toggleLike(p){
  if(!currentUser){openAuth();return}
  if(p._likeBusy)return;
  p._likeBusy=true;
  const buttons=[...document.querySelectorAll(`[data-post="${p.id}"] .like-float`)];
  const detailBtn=$('likeBtn');
  const oldLiked=p._liked ?? await isLiked(p);
  const next=!oldLiked;
  p._liked=next;
  p.likes_count=Math.max(0,(p.likes_count||0)+(next?1:-1));
  buttons.forEach(b=>{b.innerHTML=`${icon('heart')} ${p.likes_count}`;b.classList.toggle('liked',next)});
  if(currentPost?.id===p.id){detailBtn.innerHTML=next?`${icon('heart')} Đã thích`:`${icon('heart')} Thích`;detailBtn.classList.toggle('liked',next)}
  const result=next
    ? await sb.from('likes').insert({user_id:currentUser.id,post_id:p.id})
    : await sb.from('likes').delete().eq('user_id',currentUser.id).eq('post_id',p.id);
  if(result.error){
    p._liked=oldLiked;
    p.likes_count=Math.max(0,(p.likes_count||0)+(next?-1:1));
    buttons.forEach(b=>{b.innerHTML=`${icon('heart')} ${p.likes_count}`;b.classList.toggle('liked',oldLiked)});
    if(currentPost?.id===p.id){detailBtn.innerHTML=oldLiked?`${icon('heart')} Đã thích`:`${icon('heart')} Thích`;detailBtn.classList.toggle('liked',oldLiked)}
    status('Like chưa lưu được: '+result.error.message);
  }
  p._likeBusy=false;
}
async function updateLikeUI(p){
  const liked=p._liked ?? await isLiked(p); p._liked=liked;
  $('likeBtn').innerHTML=liked?`${icon('heart')} Đã thích`:`${icon('heart')} Thích`;
  $('likeBtn').classList.toggle('liked',liked);
  document.querySelectorAll(`[data-post="${p.id}"] .like-float`).forEach(b=>{b.innerHTML=`${icon('heart')} ${p.likes_count||0}`;b.classList.toggle('liked',liked)});
}
async function ensureBoard(){let {data}=await sb.from('boards').select('id').eq('user_id',currentUser.id).order('created_at').limit(1);if(data?.[0])return data[0].id;const r=await sb.from('boards').insert({user_id:currentUser.id,name:'Đã lưu'}).select('id').single();return r.data?.id}
async function toggleSave(p){
  if(!currentUser){openAuth();return}
  if(p._saveBusy)return;
  p._saveBusy=true;
  const oldSaved=p._saved ?? await saved(p);
  const next=!oldSaved;
  p._saved=next;
  const buttons=[...document.querySelectorAll(`[data-post="${p.id}"] .save`)];
  buttons.forEach(b=>{b.innerHTML=next?`✓ ${icon('bookmark')} Đã lưu`:`${icon('bookmark')} Lưu`;b.classList.toggle('saved',next)});
  if(currentPost?.id===p.id){$('saveBtn').innerHTML=next?`✓ ${icon('bookmark')} Đã lưu`:`${icon('bookmark')} Lưu`;$('saveBtn').classList.toggle('saved',next)}
  try{
    const bid=await ensureBoard();
    if(!bid)throw new Error('Không tạo được bộ sưu tập Đã lưu');
    const result=next
      ? await sb.from('board_items').insert({board_id:bid,post_id:p.id})
      : await sb.from('board_items').delete().eq('board_id',bid).eq('post_id',p.id);
    if(result.error)throw result.error;
  }catch(e){
    p._saved=oldSaved;
    buttons.forEach(b=>{b.innerHTML=oldSaved?`✓ ${icon('bookmark')} Đã lưu`:`${icon('bookmark')} Lưu`;b.classList.toggle('saved',oldSaved)});
    if(currentPost?.id===p.id){$('saveBtn').innerHTML=oldSaved?`✓ ${icon('bookmark')} Đã lưu`:`${icon('bookmark')} Lưu`;$('saveBtn').classList.toggle('saved',oldSaved)}
    status('Lưu chưa thành công: '+e.message);
  }finally{p._saveBusy=false}
}
async function saved(p){
  if(!currentUser)return false;
  const bid=await ensureBoard();
  if(!bid)return false;
  const {data,error}=await sb.from('board_items').select('id').eq('board_id',bid).eq('post_id',p.id).maybeSingle();
  if(error)throw error;
  return!!data
}
async function updateSaveUI(p){
  try{
    const s=p._saved ?? await saved(p); p._saved=s;
    $('saveBtn').innerHTML=s?`✓ ${icon('bookmark')} Đã lưu`:`${icon('bookmark')} Lưu`;
    $('saveBtn').classList.toggle('saved',s);
    document.querySelectorAll(`[data-post="${p.id}"] .save`).forEach(b=>{b.innerHTML=s?`✓ ${icon('bookmark')} Đã lưu`:`${icon('bookmark')} Lưu`;b.classList.toggle('saved',s)});
  }catch(e){status('Không kiểm tra được trạng thái lưu: '+e.message)}
}
function addCard(p,prof,target=$('feed')){const c=document.createElement('article');c.className='card';c.dataset.post=p.id;const owner=currentUser&&currentUser.id===p.user_id;c.innerHTML=`<img src="${thumbUrl(p)}" alt="${esc(p.caption||'Pigpic')}" loading="lazy"><button class="save">${icon('bookmark')} Lưu</button>${owner?'<button class="delete-post">× Xóa</button>':''}<button class="like-float">${icon('heart')} ${p.likes_count||0}</button><div class="card-meta"><div class="card-user"><span class="mini-avatar">${esc((prof?.username||'C')[0].toUpperCase())}</span><span class="creator-name">${esc(prof?.username||'Creator')}</span></div><div class="card-stats"><span>${icon('heart')} ${p.likes_count||0}</span><span>${icon('bookmark')} ${p.saves_count||0}</span></div></div>`;c.querySelector('.save').onclick=e=>{e.stopPropagation();toggleSave(p)};c.querySelector('.like-float').onclick=e=>{e.stopPropagation();toggleLike(p)};c.querySelector('.card-user').onclick=e=>{e.stopPropagation();openPublicProfile(p.user_id,p.user_id===currentUser?.id)};if(owner)c.querySelector('.delete-post').onclick=e=>{e.stopPropagation();deletePost(p,c)};c.onclick=()=>openDetail(p,prof);target.appendChild(c);updateSaveUI(p)}
async function deletePost(p,c){
  if(!confirm('Xóa ảnh này khỏi Pigpic?'))return;
  if(!currentUser)return;
  const oldStatus=p.status;
  const {error:hideError}=await sb.from('posts').update({status:'deleted'}).eq('id',p.id).eq('user_id',currentUser.id);
  if(hideError){alert(hideError.message);return}
  c.remove();
  status('Đang xóa ảnh khỏi bộ nhớ...');
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.access_token)throw new Error('Phiên đăng nhập đã hết hạn');
    const r=await fetch(R2_WORKER_URL+'/post?post_id='+encodeURIComponent(p.id),{method:'DELETE',headers:{Authorization:'Bearer '+session.access_token}});
    const body=await r.json().catch(()=>({}));
    if(!r.ok||!body.ok)throw new Error(body.error||'Không xóa được file R2');
    status('Đã xóa ảnh ✓');
  }catch(e){
    await sb.from('posts').update({status:oldStatus||'active'}).eq('id',p.id).eq('user_id',currentUser.id);
    alert('Ảnh đã được ẩn nhưng chưa dọn khỏi R2. Có thể thử xóa lại.\n'+e.message);
    loadPosts(currentTab);
  }
}
async function openDetail(p,prof){currentPost=p;
  try{const k='pigpic_view_'+p.id;if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');sb.from('posts').update({views_count:(p.views_count||0)+1}).eq('id',p.id).then(()=>{});}}catch{}currentProfile=prof;window._following=undefined;$('big').src=imgUrl(p);$('creatorName').textContent=prof?.username||'Creator';$('detailCaption').textContent=p.caption||'';$('followBtn').textContent=await following(p.user_id)?'✓ Đang theo dõi':'Theo dõi';$('blockBtn').style.display=(currentUser&&currentUser.id!==p.user_id)?'block':'none';openOverlay('detail');await updateLikeUI(p);await updateSaveUI(p)}
async function following(id){if(!currentUser||currentUser.id===id)return false;const {data}=await sb.from('follows').select('id').eq('follower_id',currentUser.id).eq('following_id',id).maybeSingle();return!!data}
async function toggleFollow(){
  if(!currentPost||!currentUser){openAuth();return}
  if(currentUser.id===currentPost.user_id||window._followBusy)return;
  window._followBusy=true;
  const oldFollowing=window._following ?? await following(currentPost.user_id);
  const next=!oldFollowing;
  window._following=next;
  $('followBtn').textContent=next?'✓ Đang theo dõi':'Theo dõi';
  $('followBtn').classList.toggle('following',next);
  try{
    const result=next
      ? await sb.from('follows').insert({follower_id:currentUser.id,following_id:currentPost.user_id})
      : await sb.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',currentPost.user_id);
    if(result.error)throw result.error;
  }catch(e){
    window._following=oldFollowing;
    $('followBtn').textContent=oldFollowing?'✓ Đang theo dõi':'Theo dõi';
    $('followBtn').classList.toggle('following',oldFollowing);
    status('Follow chưa thành công: '+e.message);
  }finally{window._followBusy=false}
}
async function report(){if(!currentUser){openAuth();return}const reason=prompt('Lý do báo cáo (spam, vi phạm, nội dung bất hợp pháp...)');if(!reason)return;const {error}=await sb.from('reports').insert({reporter_id:currentUser.id,post_id:currentPost.id,reason});alert(error?'Không gửi được: '+error.message:'Đã gửi báo cáo. Cảm ơn bạn.');}
async function blockCreator(){if(!currentUser||!currentPost)return; if(!confirm('Chặn creator này? Bài của họ sẽ không còn hiện trong feed của bạn.'))return;await sb.from('blocks').insert({blocker_id:currentUser.id,blocked_id:currentPost.user_id});closeOverlay('detail');loadPosts()}
async function getProfile(userId){const {data}=await sb.from('profiles').select('id,username,avatar_url,cover_url,bio,is_private,age_confirmed').eq('id',userId).maybeSingle();return data||{id:userId}}
async function followState(userId){if(!currentUser||currentUser.id===userId)return false;const {data}=await sb.from('follows').select('id').eq('follower_id',currentUser.id).eq('following_id',userId).maybeSingle();return!!data}
async function profileCounts(userId){const [{count:pc},{count:fc},{count:fg}]=await Promise.all([sb.from('posts').select('id',{count:'exact',head:true}).eq('user_id',userId).eq('status','active'),sb.from('follows').select('id',{count:'exact',head:true}).eq('following_id',userId),sb.from('follows').select('id',{count:'exact',head:true}).eq('follower_id',userId)]);return {pc:pc||0,fc:fc||0,fg:fg||0}}
async function openProfile(){if(!currentUser){openAuth();return}openPublicProfile(currentUser.id,true)}
async function profilePeople(userId,mode){
  const field=mode==='followers'?'following_id':'follower_id';
  const target=mode==='followers'?'follower_id':'following_id';
  const {data,error}=await sb.from('follows').select(`${target}`).eq(field,userId).limit(200);
  if(error||!data?.length)return [];
  const ids=[...new Set(data.map(x=>x[target]).filter(Boolean))];
  const {data:profiles}=await sb.from('profiles').select('id,username,avatar_url,bio,is_private').in('id',ids);
  return ids.map(id=>(profiles||[]).find(p=>p.id===id)).filter(Boolean);
}
function profilePeopleHtml(items,emptyText){
  if(!items.length)return `<div class="profile-people-empty">${esc(emptyText)}</div>`;
  return `<div class="profile-people-list">${items.map(p=>`<button class="profile-person" data-user="${p.id}"><span class="profile-person-avatar">${esc((p.username||'C')[0].toUpperCase())}</span><span class="profile-person-copy"><b>${esc(p.username||'Creator')}</b><small>@${esc((p.username||'creator').toLowerCase().replace(/\s+/g,'_'))}</small></span></button>`).join('')}</div>`;
}
async function showProfilePeople(userId,mode){
  const box=$('profileTabContent');box.innerHTML='<div class="profile-loading">Đang tải...</div>';
  const items=await profilePeople(userId,mode);
  box.innerHTML=profilePeopleHtml(items,mode==='followers'?'Chưa có người theo dõi.':'Chưa theo dõi ai.');
  box.querySelectorAll('.profile-person').forEach(btn=>btn.onclick=()=>openPublicProfile(btn.dataset.user,false));
}
async function openPublicProfile(userId,isSelf=false){
  if(!userId)return;
  closeOverlay('detail');
  closeOverlay('messagesOverlay');
  const p=await getProfile(userId);publicProfileUser=p;openOverlay('profileOverlay');$('profileBody').innerHTML='<div class="profile-loading">Đang tải hồ sơ...</div>';
  const counts=await profileCounts(userId);const following=await followState(userId);
  let posts=[];let canView=true;
  if(p.is_private && !isSelf && !following){canView=false}else{const r=await sb.from('posts').select('id,user_id,image_key,thumb_key,width,height,caption,tags,created_at,status,likes_count,saves_count,views_count,is_nsfw').eq('user_id',userId).eq('status','active').order('created_at',{ascending:false});posts=r.data||[]}
  const html=`<section class="public-profile-head"><div class="profile-cover" ${p.cover_url?`style=\"background-image:url('${esc(p.cover_url)}')\"`:''}></div><div class="public-profile-main"><div class="profile-avatar xl">${p.avatar_url?`<img src=\"${esc(p.avatar_url)}\" alt=\"Avatar\">`:esc((p.username||'C')[0].toUpperCase())}</div><div class="public-profile-copy"><div class="profile-name-row"><div><h1>${esc(p.username||'Creator')}</h1><p class="handle">@${esc((p.username||'creator').toLowerCase().replace(/\s+/g,'_'))}</p></div><div class="public-profile-actions">${isSelf?'<button class="profile-action" id="editProfile">Chỉnh sửa hồ sơ</button>':`<button class="profile-action ${following?'following':''}" id="publicFollow">${following?'✓ Đang theo dõi':'Theo dõi'}</button><button class="profile-action secondary" id="publicMessage">${icon('mail')} Nhắn tin</button>`}</div></div><p class="public-bio">${esc(p.bio||'Chưa có bio')}</p><div class="profile-stats"><button class="profile-stat active" data-tab="posts"><b>${counts.pc}</b><span>Bài đăng</span></button><button class="profile-stat" data-tab="followers"><b>${counts.fc}</b><span>Người theo dõi</span></button><button class="profile-stat" data-tab="following"><b>${counts.fg}</b><span>Đang theo dõi</span></button></div></div></div></section><section class="profile-posts"><div class="profile-tabs"><button class="profile-tab active" data-tab="posts">Bài đăng</button><button class="profile-tab" data-tab="followers">Người theo dõi</button><button class="profile-tab" data-tab="following">Đang theo dõi</button></div><div id="profileTabContent">${canView?'<div id="publicProfileFeed" class="profile-masonry"></div>':'<div class="private-profile"><div class="private-mark">🔒</div><h3>Hồ sơ riêng tư</h3><p>Hãy theo dõi creator này để xem các bài đăng.</p></div>'}</div></section>`;
  $('profileBody').innerHTML=html;
  if(isSelf)$('editProfile').onclick=editProfile;
  if(!isSelf){$('publicFollow').onclick=()=>togglePublicFollow(userId,$('publicFollow'));$('publicMessage').onclick=()=>{closeOverlay('profileOverlay');openMessages(userId)}}
  const activateTab=(mode)=>{document.querySelectorAll('.profile-tab,.profile-stat').forEach(el=>el.classList.toggle('active',el.dataset.tab===mode));if(mode==='posts'){const box=$('profileTabContent');box.innerHTML=canView?'<div id="publicProfileFeed" class="profile-masonry"></div>':'<div class="private-profile"><div class="private-mark">🔒</div><h3>Hồ sơ riêng tư</h3><p>Hãy theo dõi creator này để xem các bài đăng.</p></div>';if(canView){const pm=profileMap(posts.map(x=>x.user_id));pm.then(map=>{const feed=$('publicProfileFeed');(posts||[]).forEach(post=>addCard(post,map[post.user_id],feed))})}}else showProfilePeople(userId,mode)};
  document.querySelectorAll('.profile-tab,.profile-stat').forEach(el=>el.onclick=()=>activateTab(el.dataset.tab));
  if(canView){const pm=await profileMap(posts.map(x=>x.user_id));const feed=$('publicProfileFeed');(posts||[]).forEach(post=>addCard(post,pm[post.user_id],feed))}
}
async function togglePublicFollow(userId,btn){if(!currentUser){openAuth();return}const old=btn.classList.contains('following');btn.disabled=true;btn.textContent=old?'Theo dõi':'✓ Đang theo dõi';btn.classList.toggle('following',!old);const r=old?await sb.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',userId):await sb.from('follows').insert({follower_id:currentUser.id,following_id:userId});if(r.error){btn.textContent=old?'✓ Đang theo dõi':'Theo dõi';btn.classList.toggle('following',old);status('Follow chưa thành công: '+r.error.message)}else{openPublicProfile(userId,false)}btn.disabled=false}
async function editProfile(){
  const p=window._profileCache?.profile||{};
  const avatarPreview=p?.avatar_url?`<img src="${esc(p.avatar_url)}" alt="Avatar">`:`<span>${esc((p?.username||currentUser.email||'U')[0].toUpperCase())}</span>`;
  const coverPreview=p?.cover_url?`style="background-image:url('${esc(p.cover_url)}')"`:'';
  $('profileBody').innerHTML=`<div class="profile-edit"><h2>Chỉnh sửa hồ sơ</h2><p class="muted">Cá nhân hóa ảnh đại diện và ảnh bìa của bạn.</p><div class="media-edit-grid"><div class="media-edit-card"><div class="cover-preview" id="coverPreview" ${coverPreview}><span class="cover-placeholder">Ảnh bìa</span></div><input id="coverFile" type="file" accept="image/*" hidden><button class="profile-action secondary" id="pickCover">Đổi ảnh bìa</button></div><div class="media-edit-card avatar-edit-card"><div class="avatar-preview" id="avatarPreview">${avatarPreview}</div><input id="avatarFile" type="file" accept="image/*" hidden><button class="profile-action secondary" id="pickAvatar">Đổi ảnh đại diện</button></div></div><input class="auth-input" id="editName" value="${esc(p?.username||'')}" placeholder="Tên hiển thị"><textarea class="auth-input" id="editBio" rows="4" maxlength="180" placeholder="Bio">${esc(p?.bio||'')}</textarea><label class="check"><input id="privateProfile" type="checkbox" ${p?.is_private?'checked':''}> Hồ sơ riêng tư</label><div id="profileMediaStatus" class="status"></div><div class="profile-edit-actions"><button class="profile-action secondary" id="cancelEdit">Hủy</button><button class="publish" id="saveProfile">Lưu thay đổi</button></div></div>`;
  $('cancelEdit').onclick=()=>openPublicProfile(currentUser.id,true);
  let avatarUrl=p?.avatar_url||'',coverUrl=p?.cover_url||'';
  $('pickAvatar').onclick=()=>$('avatarFile').click();$('pickCover').onclick=()=>$('coverFile').click();
  $('avatarFile').onchange=async()=>{const f=$('avatarFile').files[0];if(!f)return;try{$('profileMediaStatus').textContent='Đang xử lý ảnh đại diện...';const clean=await stripExif(f);const r=await uploadWorker(clean);avatarUrl=R2_WORKER_URL+'/image?key='+encodeURIComponent(r.key);$('avatarPreview').innerHTML=`<img src="${esc(avatarUrl)}" alt="Avatar">`;$('profileMediaStatus').textContent='Ảnh đại diện đã sẵn sàng.'}catch(e){$('profileMediaStatus').textContent='Lỗi: '+e.message}};
  $('coverFile').onchange=async()=>{const f=$('coverFile').files[0];if(!f)return;try{$('profileMediaStatus').textContent='Đang xử lý ảnh bìa...';const clean=await stripExif(f);const r=await uploadWorker(clean);coverUrl=R2_WORKER_URL+'/image?key='+encodeURIComponent(r.key);$('coverPreview').style.backgroundImage=`url("${coverUrl}")`;$('coverPreview').querySelector('.cover-placeholder')?.remove();$('profileMediaStatus').textContent='Ảnh bìa đã sẵn sàng.'}catch(e){$('profileMediaStatus').textContent='Lỗi: '+e.message}};
  $('saveProfile').onclick=async()=>{
    const btn=$('saveProfile');
    const name=$('editName').value.trim()||'user';
    const bio=$('editBio').value.trim();
    const is_private=$('privateProfile').checked;
    btn.disabled=true;
    btn.textContent='Đang lưu...';
    $('profileMediaStatus').textContent='Đang lưu hồ sơ...';
    try{
      const {error}=await sb.from('profiles').update({username:name,bio,is_private,avatar_url:avatarUrl,cover_url:coverUrl,age_confirmed:true}).eq('id',currentUser.id);
      if(error) throw error;
      $('profileMediaStatus').textContent='Đã lưu hồ sơ ✓';
      await openPublicProfile(currentUser.id,true);
    }catch(e){
      $('profileMediaStatus').textContent='Lưu hồ sơ thất bại: '+e.message;
      alert('Không lưu được hồ sơ: '+e.message);
    }finally{
      btn.disabled=false;
      btn.textContent='Lưu thay đổi';
    }
  };
}
async function loadMyPosts(){status('Bài đăng của bạn...');const {data,error}=await sb.from('posts').select('*').eq('user_id',currentUser.id).eq('status','active').order('created_at',{ascending:false});$('feed').innerHTML='';if(error){status(error.message);return}const pm=await profileMap([currentUser.id]);(data||[]).forEach(p=>addCard(p,pm[currentUser.id]));status(`Bài của bạn · ${(data||[]).length}`)}
async function messageUsers(){
  if(!currentUser)return[];
  const {data,error}=await sb.from('messages').select('id,sender_id,recipient_id,body,created_at,read_at').or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`).order('created_at',{ascending:false}).limit(200);
  if(error)return[];
  const seen=new Map();for(const m of data||[]){const other=m.sender_id===currentUser.id?m.recipient_id:m.sender_id;if(!seen.has(other))seen.set(other,m)}
  const ids=[...seen.keys()];const pm=await profileMap(ids);return ids.map(id=>({user:pm[id]||{id,username:'Creator'},last:seen.get(id)}));
}
async function loadConversationList(){const list=await messageUsers();const box=$('conversationList');box.innerHTML=list.length?list.map(x=>`<button class="conversation ${currentConversationUser===x.user.id?'on':''}" data-user="${x.user.id}"><span class="mini-avatar">${esc((x.user.username||'C')[0].toUpperCase())}</span><span><b>${esc(x.user.username||'Creator')}</b><small>${esc((x.last.body||'').slice(0,55))}</small></span></button>`).join(''):'<div class="empty">Chưa có tin nhắn.</div>';box.querySelectorAll('.conversation').forEach(b=>b.onclick=()=>openConversation(b.dataset.user));}
async function openMessages(userId=null){if(!currentUser){openAuth();return}openOverlay('messagesOverlay');await loadConversationList();if(userId)await openConversation(userId);else if(!currentConversationUser){$('threadHead').innerHTML='<div class="empty">Chọn một cuộc trò chuyện</div>';$('threadBody').innerHTML='<div class="empty">Tin nhắn riêng giữa bạn và creator.</div>'}}
async function openConversation(userId){if(!currentUser||userId===currentUser.id)return;currentConversationUser=userId;const p=await getProfile(userId);$('threadHead').innerHTML=`<button class="thread-user" id="threadProfile"><span class="mini-avatar">${esc((p.username||'C')[0].toUpperCase())}</span><span><b>${esc(p.username||'Creator')}</b><small>@${esc((p.username||'creator').toLowerCase().replace(/\s+/g,'_'))}</small></span></button>`;$('threadProfile').onclick=()=>{closeOverlay('messagesOverlay');openPublicProfile(userId,false)};const {data,error}=await sb.from('messages').select('id,sender_id,recipient_id,body,created_at,read_at').or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${currentUser.id})`).order('created_at',{ascending:true});const box=$('threadBody');box.innerHTML=error?`<div class="empty">${esc(error.message)}</div>`:((data||[]).map(m=>`<div class="bubble-row ${m.sender_id===currentUser.id?'mine':'theirs'}"><div class="bubble">${esc(m.body)}<small>${new Date(m.created_at).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</small></div></div>`).join('')||'<div class="empty">Bắt đầu cuộc trò chuyện riêng.</div>');(data||[]).filter(m=>m.recipient_id===currentUser.id&&!m.read_at).forEach(m=>sb.from('messages').update({read_at:new Date().toISOString()}).eq('id',m.id));box.scrollTop=box.scrollHeight;loadConversationList();}
$('messageForm').onsubmit=async e=>{e.preventDefault();if(!currentUser||!currentConversationUser)return;const input=$('messageInput'),body=input.value.trim();if(!body)return;const r=await sb.from('messages').insert({sender_id:currentUser.id,recipient_id:currentConversationUser,body});if(r.error){status('Gửi tin nhắn chưa thành công: '+r.error.message);return}input.value='';await openConversation(currentConversationUser);refreshNotifBadge()};
async function refreshMessageBadge(){if(!currentUser){$('messageBadge')?.classList.add('hidden');return}const {count}=await sb.from('messages').select('id',{count:'exact',head:true}).eq('recipient_id',currentUser.id).is('read_at',null);const b=$('messageBadge');if(!b)return;b.textContent=count>99?'99+':String(count||'');b.classList.toggle('hidden',!(count>0))}
async function openSaved(){if(!currentUser){openAuth();return}openOverlay('savedOverlay');const {data:boards}=await sb.from('boards').select('id').eq('user_id',currentUser.id).order('created_at').limit(1);if(!boards?.[0]){$('savedFeed').innerHTML='<div class="empty">Chưa có ảnh đã lưu.</div>';return}const {data:items}=await sb.from('board_items').select('post_id,created_at').eq('board_id',boards[0].id).order('created_at',{ascending:false});const ids=(items||[]).map(x=>x.post_id);if(!ids.length){$('savedFeed').innerHTML='<div class="empty">Chưa có ảnh đã lưu.</div>';return}const {data:posts}=await sb.from('posts').select('*').in('id',ids).eq('status','active');const pm=await profileMap((posts||[]).map(p=>p.user_id));$('savedFeed').innerHTML='';(posts||[]).sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id)).forEach(p=>addCard(p,pm[p.user_id],$('savedFeed')))}
async function openNotifications(){if(!currentUser){openAuth();return}openOverlay('notifOverlay');const {data,error}=await sb.from('notifications').select('id,type,created_at,read_at,actor_id').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(50);const pm=await profileMap((data||[]).map(n=>n.actor_id));$('notifBody').innerHTML=error?`<div class="empty">${esc(error.message)}</div>`:((data||[]).map(n=>`<div class="notification ${n.read_at?'':'unread'}">${n.type==='like'?icon('heart'):n.type==='follow'?icon('user'):icon('bell')} <b>${esc(pm[n.actor_id]?.username||'Ai đó')}</b> ${n.type==='like'?'đã thích ảnh của bạn.':n.type==='follow'?'đã theo dõi bạn.':'đã tương tác với bạn.'}<small>${new Date(n.created_at).toLocaleString('vi-VN')}</small></div>`).join('')||'<div class="empty">Chưa có thông báo.</div>');await sb.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',currentUser.id).is('read_at',null);setNotifBadge(0)}
function stripExif(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const max=2048,scale=Math.min(1,max/im.width,max/im.height),c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);c.toBlob(b=>b?res(new File([b],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'})):rej(new Error('Không xử lý được ảnh')),'image/jpeg',.82)};im.onerror=()=>rej(new Error('Ảnh không hợp lệ'));im.src=r.result};r.readAsDataURL(file)})}
async function uploadWorker(file,onProgress){const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw new Error('Phiên đăng nhập đã hết hạn');return new Promise((resolve,reject)=>{const x=new XMLHttpRequest();x.open('POST',R2_WORKER_URL+'/upload');x.setRequestHeader('Content-Type',file.type);x.setRequestHeader('Authorization','Bearer '+session.access_token);x.upload.onprogress=e=>e.lengthComputable&&onProgress(Math.round(e.loaded/e.total*100));x.onerror=()=>reject(new Error('Không kết nối được R2 Worker'));x.ontimeout=()=>reject(new Error('Upload quá lâu, thử lại nha'));x.timeout=120000;x.onload=()=>{try{const r=JSON.parse(x.responseText);if(!r.ok)throw new Error(r.error||'Upload lỗi');resolve(r)}catch(e){reject(e)}};x.send(file)})}
function makeThumb(file,max=640,quality=.76){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const scale=Math.min(1,max/im.width,max/im.height),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);c.toBlob(b=>b?res(new File([b],'thumb.jpg',{type:'image/jpeg'})):rej(new Error('Không tạo được thumbnail')),'image/jpeg',quality)};im.onerror=()=>rej(new Error('Ảnh không hợp lệ'));im.src=r.result};r.onerror=()=>rej(new Error('Không đọc được ảnh'));r.readAsDataURL(file)})}

function resetUploader(){const input=$('file');input.value='';$('fileLabel').textContent='Chọn hình ảnh';$('preview').removeAttribute('src');$('previewWrap').classList.add('hidden');$('previewMeta').textContent='Chưa có ảnh được chọn';$('caption').value='';$('tags').value='';$('nsfw').checked=false}
$('file').onchange=()=>{const f=$('file').files[0];if(!f)return;$('fileLabel').textContent=f.name;$('preview').src=URL.createObjectURL(f);$('previewWrap').classList.remove('hidden');$('previewMeta').textContent='Đang đọc ảnh...';const im=new Image();im.onload=()=>{$('previewMeta').textContent=`${im.naturalWidth} × ${im.naturalHeight} · ${(f.size/1024/1024).toFixed(2)} MB`;};im.src=$('preview').src};$('previewChange').onclick=()=>$('file').click();$('headerUpload').onclick=()=>$('upload').click();
const dropZone=document.querySelector('.drop');if(dropZone){['dragenter','dragover'].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.add('dragging')}));['dragleave','drop'].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.remove('dragging')}));dropZone.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(f){const dt=new DataTransfer();dt.items.add(f);$('file').files=dt.files;$('file').dispatchEvent(new Event('change'))}})}
$('publish').onclick=async()=>{if(!currentUser){openAuth();return}const raw=$('file').files[0];if(!raw){$('uploadStatus').textContent='Chọn ảnh trước nha.';return}if(!['image/jpeg','image/png','image/webp'].includes(raw.type)){$('uploadStatus').textContent='Chỉ nhận JPG, PNG hoặc WebP.';return}if(raw.size>10*1024*1024){$('uploadStatus').textContent='Ảnh gốc tối đa 10 MB.';return}$('publish').disabled=true;$('uploadProgressBar').style.width='0%';let uploaded=[];try{$('uploadStatus').textContent='Đang chuẩn hóa ảnh & xóa metadata...';const f=await stripExif(raw);if(f.size>10*1024*1024)throw new Error('Ảnh sau xử lý vẫn quá 10 MB');const thumb=await makeThumb(f,640,.76);$('uploadStatus').textContent='Đang tải ảnh lên R2... 0%';let mainPct=0,thumbPct=0;const update=()=>{$('uploadProgressBar').style.width=`${Math.round(mainPct*.8+thumbPct*.2)}%`;$('uploadStatus').textContent=`Đang tải ảnh lên R2... ${Math.round(mainPct*.8+thumbPct*.2)}%`};const results=await Promise.allSettled([uploadWorker(f,p=>{mainPct=p;update()}),uploadWorker(thumb,p=>{thumbPct=p;update()})]);for(const r of results)if(r.status==='fulfilled')uploaded.push(r.value.key);const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;const r=results[0].value,t=results[1].value;const tags=$('tags').value.split(/\s+/).map(x=>x.replace(/^#/,'').trim().toLowerCase()).filter(x=>/^[a-z0-9_\-À-ỹ]+$/i.test(x)).slice(0,20);const caption=$('caption').value.trim().slice(0,1000);const im=$('preview');$('uploadStatus').textContent='Đang xuất bản bài đăng...';$('uploadProgressBar').style.width='100%';const {error}=await sb.from('posts').insert({user_id:currentUser.id,image_key:r.key,thumb_key:t.key,width:im.naturalWidth||null,height:im.naturalHeight||null,caption,tags,is_nsfw:$('nsfw').checked,status:'active'});if(error)throw error;uploaded=[];$('uploadStatus').textContent='Đăng ảnh hoàn tất 🎉';await loadPosts(currentTab);setTimeout(()=>{closeOverlay('uploader');$('uploadStatus').textContent='';$('uploadProgressBar').style.width='0%';resetUploader()},500)}catch(e){if(uploaded.length){const {data:{session}}=await sb.auth.getSession();if(session?.access_token){await Promise.all(uploaded.map(key=>fetch(R2_WORKER_URL+'/upload?key='+encodeURIComponent(key),{method:'DELETE',headers:{Authorization:'Bearer '+session.access_token}}).catch(()=>{})))}}$('uploadProgressBar').style.width='0%';$('uploadStatus').textContent='Lỗi: '+(e?.message||'Không thể đăng ảnh')}finally{$('publish').disabled=false}}

$('loginBtn').onclick=async()=>{if(currentUser){await sb.auth.signOut();currentUser=null;await refreshAuth();await loadPosts(currentTab)}else{openAuth('login')}};
$('avatar').onclick=()=>{if(currentUser)openProfile();else openAuth('login')};
$('authClose').onclick=()=>closeOverlay('authOverlay');
$('authSwitch').onclick=()=>openAuth(authMode==='login'?'signup':'login');
$('authSubmit').onclick=submitAuth;
$('authPassword').addEventListener('keydown',e=>{if(e.key==='Enter')submitAuth()});
$('profileClose').onclick=()=>closeOverlay('profileOverlay');$('messagesClose').onclick=()=>{currentConversationUser=null;closeOverlay('messagesOverlay')};$('sideMessages').onclick=()=>openMessages();$('savedClose').onclick=()=>closeOverlay('savedOverlay');$('close').onclick=()=>closeOverlay('detail');$('more').onclick=()=>$('menu').classList.toggle('hidden');$('likeBtn').onclick=()=>toggleLike(currentPost);$('saveBtn').onclick=()=>toggleSave(currentPost);$('downloadBtn').onclick=()=>window.open(imgUrl(currentPost),'_blank');$('detailDownload').onclick=()=>window.open(imgUrl(currentPost),'_blank');$('followBtn').onclick=toggleFollow;$('creatorName').onclick=()=>currentPost&&openPublicProfile(currentPost.user_id,currentPost.user_id===currentUser?.id);$('blockBtn').onclick=blockCreator;$('reportBtn').onclick=report;$('shareBtn').onclick=async()=>{try{await navigator.clipboard.writeText(location.href+'#post-'+currentPost.id);alert('Đã copy liên kết')}catch{alert('Không copy được')}};
$('upload').onclick=()=>{if(!currentUser)return openAuth();openOverlay('uploader')};$('sideUpload').onclick=()=>$('upload').click();$('ux').onclick=()=>closeOverlay('uploader');$('profileOpen').onclick=openProfile;$('sideProfile').onclick=openProfile;$('savedOpen').onclick=openSaved;$('sideSaved').onclick=openSaved;$('notifBtn').onclick=openNotifications;$('sideNotif').onclick=openNotifications;$('notifClose').onclick=()=>closeOverlay('notifOverlay');$('homeMobile').onclick=()=>loadPosts('for-you');$('sideHome').onclick=()=>loadPosts('for-you');$('sideExplore').onclick=()=>tabs[1]?.click();
hydrateIcons();applyTheme(localStorage.getItem('pigpic_theme')||'dark');$('themeBtn').onclick=()=>applyTheme(document.documentElement.classList.contains('light')?'dark':'light');
const tabs=[...document.querySelectorAll('.tabs button')];tabs.forEach((b,i)=>b.onclick=()=>{tabs.forEach(x=>x.classList.remove('on'));b.classList.add('on');currentTab=i===1?'hot':i===2?'new':'for-you';loadPosts(currentTab)});
let st; $('search').oninput=()=>{clearTimeout(st);st=setTimeout(()=>{searchTerm=$('search').value.trim();loadPosts()},250)};
sb.auth.onAuthStateChange(()=>refreshAuth());
$('ageYes').onclick=()=>{localStorage.setItem('pigpic_age18','yes');closeOverlay('ageGate')};$('ageNo').onclick=()=>{document.body.innerHTML='<div style="display:grid;place-items:center;height:100vh;font-family:system-ui;text-align:center"><div><h2>Pigpic</h2><p>Bạn cần đủ 18 tuổi để truy cập.</p></div></div>'};
document.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key.toLowerCase()==='x'){for(const id of ['authOverlay','detail','profileOverlay','savedOverlay','notifOverlay','messagesOverlay','infoOverlay','uploader']){const el=$(id);if(el&&!el.classList.contains('hidden')){closeOverlay(id);break}}}});
(async()=>{if(localStorage.getItem('pigpic_age18')!=='yes')openOverlay('ageGate');await refreshAuth();if(currentUser)await ensureProfile(currentUser);await loadPosts()})();
const infoCopy={privacy:['Quyền riêng tư',`Pigpic chỉ hiển thị công khai những thông tin cần cho hồ sơ. Email không được đưa lên hồ sơ công khai. Ảnh được lưu trên Cloudflare R2; dữ liệu tài khoản và metadata bài đăng nằm trong Supabase. Bạn có thể yêu cầu xóa tài khoản và nội dung của mình.`],terms:['Điều khoản',`Bạn phải đủ 18 tuổi để sử dụng Pigpic. Không đăng nội dung bất hợp pháp, nội dung liên quan trẻ vị thành niên, nội dung xâm hại, lừa đảo hoặc xâm phạm quyền của người khác. Pigpic có quyền ẩn hoặc gỡ nội dung vi phạm.`],content:['Quy định nội dung',`Nội dung bị cấm gồm: nội dung liên quan người chưa đủ 18 tuổi; nội dung tình dục không đồng thuận; nội dung xâm hại hoặc bóc lột; nội dung bất hợp pháp; spam và lừa đảo. Dùng Báo cáo để thông báo nội dung vi phạm.`]};
document.querySelectorAll('.site-footer [data-info]').forEach(b=>b.onclick=()=>{const k=b.dataset.info;const [t,c]=infoCopy[k];$('infoBody').innerHTML=`<h2>${esc(t)}</h2><p class="detail-caption">${esc(c)}</p>`;openOverlay('infoOverlay')});$('infoClose').onclick=()=>closeOverlay('infoOverlay');
