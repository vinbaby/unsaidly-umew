(() => {
  const cfg = window.UNSAIDLY_CHAT_CONFIG || {};
  const hasConfig = /^https?:\/\//.test(cfg.supabaseUrl || "") && cfg.supabaseAnonKey && !/PASTE_|PLACEHOLDER/i.test(cfg.supabaseAnonKey);
  const supabaseReady = hasConfig && window.supabase?.createClient;
  const db = supabaseReady ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const $ = (id) => document.getElementById(id);
  const messagesEl = $("messages"), input = $("messageInput"), sendBtn = $("sendButton");
  const anonId = getAnonId();
  const anonName = "Anonymous #" + anonId.slice(-4).toUpperCase();
  let channel = null, sentAt = 0, loadedIds = new Set();
  $("identityLabel").innerHTML = "YOU ARE <b>" + anonName + "</b>";
  $("year").textContent = new Date().getFullYear();
  $("connectionStatus").textContent = supabaseReady ? "Connecting to global chat…" : "Preview mode · backend not configured";
  if (!supabaseReady) $("connectionStatus").classList.add("error");

  function getAnonId() {
    let id = localStorage.getItem("unsaidly_chat_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("unsaidly_chat_id", id); }
    return id;
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  function timeLabel(date) {
    return new Intl.DateTimeFormat(undefined, {hour:"2-digit",minute:"2-digit"}).format(new Date(date));
  }
  function initials(name) { return name.replace("Anonymous #","").slice(-2); }
  function showWelcome() {
    if (!messagesEl.querySelector(".message")) messagesEl.innerHTML = '<div class="welcome"><div class="welcome-symbol">u.</div><h2>No names. No filters.<br><em>Just words.</em></h2><p>Say something. Someone somewhere will answer.</p></div>';
  }
  function renderMessage(m) {
    if (!m || loadedIds.has(m.id)) return;
    loadedIds.add(m.id);
    const mine = m.anon_id === anonId;
    const row = document.createElement("article");
    row.className = "message" + (mine ? " mine" : "");
    row.dataset.id = m.id;
    const safeName = escapeHTML(m.nickname || "Anonymous");
    const safeBody = escapeHTML(m.body || "");
    row.innerHTML = '<div class="avatar">' + (mine ? "YOU" : initials(safeName)) + '</div><div class="message-main"><div class="message-meta"><span class="message-name">' + (mine ? "You" : safeName) + '</span><span class="message-time">' + timeLabel(m.created_at || Date.now()) + '</span></div><div class="bubble">' + safeBody + '</div><div class="message-actions"><button class="translate-button" data-translate>Translate</button>' + (mine ? "" : '<button class="report-button" data-report>Report</button>') + '</div></div>';
    messagesEl.querySelector(".welcome")?.remove();
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  async function loadRecent() {
    const { data, error } = await db.from("global_chat_messages").select("id,anon_id,nickname,body,created_at").order("created_at", {ascending:false}).limit(100);
    if (error) { console.error(error); status("Could not load messages. Check Supabase setup.", "error"); return; }
    (data || []).reverse().forEach(renderMessage);
    showWelcome();
  }
  async function connect() {
    if (!supabaseReady) return;
    await loadRecent();
    channel = db.channel("unsaidly-global-room", {config:{presence:{key:anonId}}});
    channel.on("postgres_changes", {event:"INSERT",schema:"public",table:"global_chat_messages"}, payload => renderMessage(payload.new));
    channel.on("presence", {event:"sync"}, () => {
      const count = Object.keys(channel.presenceState()).length;
      $("onlineCount").textContent = count + " ONLINE";
    });
    channel.subscribe((state) => {
      if (state === "SUBSCRIBED") {
        status("Connected · global room", "connected");
        channel.track({anon_id:anonId, joined_at:new Date().toISOString()});
      } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") status("Connection issue", "error");
    });
  }
  function status(text, cls) {
    const el = $("connectionStatus"); el.textContent = text; el.className = "connection-status " + (cls || "");
  }
  async function sendMessage() {
    const body = input.value.trim();
    if (!body || body.length > 600 || !db) return;
    if (Date.now() - sentAt < 1800) { status("Slow down a little…", "error"); return; }
    sentAt = Date.now(); sendBtn.disabled = true;
    const {error} = await db.from("global_chat_messages").insert({anon_id:anonId,nickname:anonName,body});
    if (error) { status("Message not sent · " + (error.message || "try again"), "error"); }
    else { input.value = ""; updateInput(); status("Connected · global room", "connected"); }
    sendBtn.disabled = !input.value.trim() || !db;
  }
  async function translateMessage(button) {
    const row = button.closest(".message"), bubble = row.querySelector(".bubble");
    const original = bubble.childNodes[0]?.textContent || bubble.textContent;
    const target = $("languageSelect").value;
    if (!cfg.translateUrl) {
      addTranslation(bubble, "Translation is not configured yet. Set up a LibreTranslate URL in config.js.");
      return;
    }
    button.textContent = "Translating…"; button.disabled = true;
    try {
      const response = await fetch(cfg.translateUrl.replace(/\/$/,"") + "/translate", {
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({q:original,source:"auto",target,format:"text",...(cfg.translateApiKey?{api_key:cfg.translateApiKey}:{})})
      });
      if (!response.ok) throw new Error("Translation service returned " + response.status);
      const data = await response.json(); addTranslation(bubble, data.translatedText || "No translation returned.");
      button.textContent = "Translated";
    } catch(e) { button.textContent = "Translate"; addTranslation(bubble, "Translation failed. Please try again."); console.error(e); }
    finally { button.disabled = false; }
  }
  function addTranslation(bubble, text) {
    bubble.querySelector(".translation")?.remove();
    const div = document.createElement("span"); div.className = "translation"; div.textContent = text; bubble.appendChild(div);
  }
  function updateInput() {
    $("charCount").textContent = input.value.length;
    sendBtn.disabled = !input.value.trim() || !db;
    input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight,140) + "px";
  }
  messagesEl.addEventListener("click", async e => {
    const translate = e.target.closest("[data-translate]");
    if (translate) return translateMessage(translate);
    const report = e.target.closest("[data-report]");
    if (report) {
      const messageId = report.closest(".message").dataset.id;
      if (!db) return;
      const reason = prompt("Report this message? (spam, threats, doxxing, harassment)");
      if (!reason) return;
      const {error} = await db.from("global_chat_reports").insert({message_id:messageId,reporter_anon_id:anonId,reason:reason.slice(0,250)});
      if (error) alert("Could not submit report. Please try again.");
      else {report.textContent="Reported";report.disabled=true;}
    }
  });
  input.addEventListener("input", updateInput);
  input.addEventListener("keydown", e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} });
  $("messageForm").addEventListener("submit", e => {e.preventDefault();sendMessage();});
  $("rulesButton").addEventListener("click", () => $("infoDialog").showModal());
  $("privacyLink").addEventListener("click", e => {e.preventDefault();$("dialogTitle").textContent="Privacy & safety";$("dialogBody").textContent="No account or real name is required. Your anonymous browser ID is used to label messages and presence. Do not share your address, phone number, passwords or other private details. Public chat messages are visible to everyone in the room."; $("infoDialog").showModal();});
  $("closeDialog").addEventListener("click", () => $("infoDialog").close());
  $("dialogOk").addEventListener("click", () => $("infoDialog").close());
  updateInput(); showWelcome(); connect();
})();