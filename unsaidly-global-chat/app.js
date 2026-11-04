(() => {
  "use strict";
  const cfg=window.UNSAIDLY_CHAT_CONFIG||{};
  const hasConfig=/^https?:\/\//.test(cfg.supabaseUrl||"")&&cfg.supabaseAnonKey&&!/PASTE_|PLACEHOLDER/i.test(cfg.supabaseAnonKey);
  const supabaseReady=Boolean(hasConfig&&window.supabase?.createClient);
  const db=supabaseReady?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
  const workerReady=/^https?:\/\//.test(cfg.workerUrl||"");
  const $=id=>document.getElementById(id);
  const messagesEl=$("messages"),input=$("messageInput"),sendBtn=$("sendButton");
  const anonId=getAnonId(),anonName="Anonymous #"+anonId.slice(-4).toUpperCase();
  let channel=null,sentAt=0,loadedIds=new Set(),turnstileWidget=null,turnstileToken="";
  let following=true,pendingMessages=0,initialLoad=true;
  $("identityLabel").innerHTML="YOU ARE <b>"+anonName+"</b>";$("year").textContent=new Date().getFullYear();
  const newMessagesButton=document.createElement("button");
  newMessagesButton.type="button";newMessagesButton.className="new-messages";newMessagesButton.textContent="↓ New messages";
  Object.assign(newMessagesButton.style,{position:"absolute",left:"50%",transform:"translateX(-50%)",bottom:"145px",zIndex:"3",border:"1px solid #6d573f",borderRadius:"20px",padding:"8px 13px",background:"#2c241d",color:"#e0c09a",fontSize:"11px",boxShadow:"0 5px 20px #0008",cursor:"pointer",display:"none"});
  document.querySelector(".chat-card").appendChild(newMessagesButton);
  if(!supabaseReady)status("Setup needed · Supabase config","error");
  else if(!workerReady)status("Setup needed · API config","error");
  else status("Connecting to the global room…","");
  function getAnonId(){let id=localStorage.getItem("unsaidly_chat_id");if(!id){id=crypto.randomUUID();localStorage.setItem("unsaidly_chat_id",id);}return id;}
  function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function timeLabel(date){return new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit"}).format(new Date(date));}
  function showWelcome(){if(!messagesEl.querySelector(".message"))messagesEl.innerHTML='<div class="welcome"><div class="welcome-symbol">u.</div><h2>No names. No filters.<br><em>Just words.</em></h2><p>Say something. Someone somewhere will answer.</p></div>';}
  function renderMessage(m){
    if(!m||loadedIds.has(m.id))return;
    const nearBottom=messagesEl.scrollHeight-messagesEl.scrollTop-messagesEl.clientHeight<100;
    loadedIds.add(m.id);const mine=m.anon_id===anonId,row=document.createElement("article");
    row.className="message"+(mine?" mine":"");row.dataset.id=m.id;
    const safeName=escapeHTML(m.nickname||"Anonymous"),safeBody=escapeHTML(m.body||"");
    row.innerHTML='<div class="message-time">'+timeLabel(m.created_at||Date.now())+'</div><div class="message-main"><div class="message-meta"><span class="message-name">'+(mine?"You":safeName)+'</span>'+(mine?'<span class="message-tag">YOU</span>':'')+'</div><div class="bubble">'+safeBody+'</div><div class="message-actions"><button class="translate-button" data-translate>Translate</button><button class="translate-button" data-reply data-name="'+safeName.replace(/"/g,"&quot;")+'">Reply</button>'+(mine?"":'<button class="report-button" data-report>Report</button>')+'</div></div>';
    messagesEl.querySelector(".welcome")?.remove();messagesEl.appendChild(row);
    if(initialLoad||(following&&nearBottom)){messagesEl.scrollTop=messagesEl.scrollHeight;following=true;pendingMessages=0;newMessagesButton.style.display="none";}
    else if(!mine){pendingMessages++;newMessagesButton.textContent="↓ "+pendingMessages+" new "+(pendingMessages===1?"message":"messages");newMessagesButton.style.display="block";}
  }
  async function loadRecent(){
    const {data,error}=await db.from("global_chat_messages").select("id,anon_id,nickname,body,created_at").order("created_at",{ascending:false}).limit(100);
    if(error){console.error(error);status("Cannot load messages · check Supabase","error");return;}
    (data||[]).reverse().forEach(renderMessage);initialLoad=false;messagesEl.scrollTop=messagesEl.scrollHeight;following=true;showWelcome();
  }
  async function connect(){
    if(!supabaseReady)return;await loadRecent();
    channel=db.channel("unsaidly-global-room",{config:{presence:{key:anonId}}});
    channel.on("postgres_changes",{event:"INSERT",schema:"public",table:"global_chat_messages"},payload=>renderMessage(payload.new));
    channel.on("presence",{event:"sync"},()=>{$("onlineCount").textContent=Object.keys(channel.presenceState()).length+" online";});
    channel.subscribe(state=>{
      if(state==="SUBSCRIBED"){status(workerReady?"Connected · global room":"Connected · API setup needed",workerReady?"connected":"error");channel.track({anon_id:anonId,joined_at:new Date().toISOString()});}
      else if(state==="CHANNEL_ERROR"||state==="TIMED_OUT")status("Realtime connection issue","error");
    });
  }
  function status(text,cls){const el=$("connectionStatus");el.textContent=text;el.className="connection-status "+(cls||"");}
  function resetTurnstile(){turnstileToken="";if(turnstileWidget!==null&&window.turnstile)window.turnstile.reset(turnstileWidget);}
  function getTurnstileToken(){if(cfg.turnstileSiteKey&&!turnstileToken)throw new Error("Complete the security check first.");return turnstileToken;}
  function mountTurnstile(attempt=0){
    const container=$("turnstileContainer");if(!cfg.turnstileSiteKey)return;container.hidden=false;
    if(window.turnstile?.render){turnstileWidget=window.turnstile.render(container,{sitekey:cfg.turnstileSiteKey,theme:"dark",callback:token=>{turnstileToken=token;updateInput();},"expired-callback":()=>{turnstileToken="";updateInput();},"error-callback":()=>{turnstileToken="";status("Security check error · reload and retry","error");updateInput();}});}
    else if(attempt<30)setTimeout(()=>mountTurnstile(attempt+1),300);else status("Turnstile failed to load","error");
  }
  async function postToWorker(path,payload){
    if(!workerReady)throw new Error("Worker API URL is not configured in config.js.");
    const response=await fetch(cfg.workerUrl.replace(/\/$/,"")+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,turnstile_token:getTurnstileToken()})});
    let result={};try{result=await response.json();}catch{}if(!response.ok)throw new Error(result.error||"Request failed ("+response.status+")");return result;
  }
  async function sendMessage(){
    const body=input.value.trim();if(!body||body.length>600||!workerReady||sendBtn.disabled)return;
    if(Date.now()-sentAt<2100){status("One message at a time…","error");return;}sentAt=Date.now();sendBtn.disabled=true;
    try{await postToWorker("/api/message",{anon_id:anonId,nickname:anonName,body});input.value="";updateInput();resetTurnstile();status("Connected · global room","connected");following=true;messagesEl.scrollTop=messagesEl.scrollHeight;}
    catch(e){status(e.message||"Message not sent · retry","error");if(/security check/i.test(e.message))resetTurnstile();}
    finally{updateInput();}
  }
  async function translateMessage(button){
    const row=button.closest(".message"),bubble=row.querySelector(".bubble"),original=bubble.childNodes[0]?.textContent||bubble.textContent,target=$("languageSelect").value;
    button.textContent="Translating…";button.disabled=true;
    try{let translated="";
      if(cfg.translateUrl){const response=await fetch(cfg.translateUrl.replace(/\/$/,"")+"/translate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({q:original,source:"auto",target,format:"text",...(cfg.translateApiKey?{api_key:cfg.translateApiKey}:{})})});if(!response.ok)throw new Error("Translation service returned "+response.status);translated=(await response.json()).translatedText||"";}
      else{const params=new URLSearchParams({q:original,langpair:"autodetect|"+target}),response=await fetch("https://api.mymemory.translated.net/get?"+params.toString());if(!response.ok)throw new Error("Translation service returned "+response.status);const data=await response.json();if(Number(data.responseStatus)!==200)throw new Error(data.responseDetails||"Translation unavailable");translated=data.responseData?.translatedText||"";}
      addTranslation(bubble,translated||"No translation returned.");button.textContent="Translated";
    }catch(e){button.textContent="Translate";addTranslation(bubble,"Translation failed. Try again later.");console.error(e);}finally{button.disabled=false;}
  }
  function addTranslation(bubble,text){bubble.querySelector(".translation")?.remove();const div=document.createElement("span");div.className="translation";div.textContent=text;bubble.appendChild(div);}
  function updateInput(){$("charCount").textContent=input.value.length;sendBtn.disabled=!input.value.trim()||!workerReady||(Boolean(cfg.turnstileSiteKey)&&!turnstileToken);input.style.height="auto";input.style.height=Math.min(input.scrollHeight,130)+"px";}
  messagesEl.addEventListener("click",async e=>{
    const translate=e.target.closest("[data-translate]");if(translate)return translateMessage(translate);
    const reply=e.target.closest("[data-reply]");if(reply){input.value="@"+reply.dataset.name+" ";input.focus();updateInput();return;}
    const report=e.target.closest("[data-report]");if(report){const messageId=report.closest(".message").dataset.id,reason=prompt("Report reason: spam, threats, doxxing, harassment, or other");if(!reason)return;report.disabled=true;
      try{await postToWorker("/api/report",{message_id:messageId,reporter_anon_id:anonId,reason:reason.slice(0,250)});report.textContent="Reported";resetTurnstile();}
      catch(error){report.disabled=false;alert(error.message||"Could not submit report.");resetTurnstile();}
    }
  });
  messagesEl.addEventListener("scroll",()=>{const nearBottom=messagesEl.scrollHeight-messagesEl.scrollTop-messagesEl.clientHeight<100;following=nearBottom;if(nearBottom){pendingMessages=0;newMessagesButton.style.display="none";}});
  newMessagesButton.addEventListener("click",()=>{messagesEl.scrollTop=messagesEl.scrollHeight;following=true;pendingMessages=0;newMessagesButton.style.display="none";});
  input.addEventListener("input",updateInput);input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}});
  $("messageForm").addEventListener("submit",e=>{e.preventDefault();sendMessage();});
  $("rulesButton").addEventListener("click",()=>$("infoDialog").showModal());
  $("privacyLink").addEventListener("click",e=>{e.preventDefault();$("dialogTitle").textContent="Privacy & safety";$("dialogBody").textContent="No account or real name is required. Your anonymous browser ID is stored locally to label messages and presence. Messages are public to everyone in the room. If you tap Translate, that message text is sent to a third-party translation provider (MyMemory by default). Do not share your address, phone number, passwords or other private details. Anonymous chat does not hide network metadata from service providers.";$("infoDialog").showModal();});
  $("closeDialog").addEventListener("click",()=>$("infoDialog").close());$("dialogOk").addEventListener("click",()=>$("infoDialog").close());
  updateInput();showWelcome();mountTurnstile();connect();
})();