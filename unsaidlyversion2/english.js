/* UNSAIDLY English UI layer — keeps the existing Supabase/post logic intact. */
(function(){
  const textMap=new Map([
    ['Trang chủ','Home'],['Thịnh hành','Trending'],['Mới nhất','Latest'],['Ngẫu nhiên','Random'],['Mood thế giới','World Mood'],
    ['Khám phá','Explore'],['Tình yêu','Love'],['Học tập','School'],['Công việc','Work'],['Gia đình','Family'],['Bạn bè','Friends'],
    ['Viết gì đó...','Create post...'],['Dành cho bạn','For You'],['Explore feelings','Explore feelings'],['Cảm xúc thế giới','World emotions'],
    ['UMEW nói...','UMEW says...'],['bài','posts'],['Chưa có bài phù hợp.','No matching posts yet.'],
    ['Không tìm thấy tâm sự phù hợp.','No matching thoughts found.'],['Hủy','Cancel'],['Đóng','Close'],['Báo cáo','Report'],
    ['Chọn lý do báo cáo bài viết.','Choose a reason for reporting this post.'],['Say it here.','Say it here.'],
    ['Hãy cứ nói ra, ở đây không ai phán xét.','Say it here. Nobody is judging.'],['Tìm cảm xúc, từ khóa, hashtag...','Search feelings, keywords, hashtags...'],
    ['Nói gì đó một cách ẩn danh...','Say something anonymously...'],['Viết điều bạn muốn nói trước đã 🖤','Write something before posting 🖤'],
    ['Đăng bài thất bại','Failed to publish'],['Reply thất bại','Reply failed'],['Me Too chưa gửi được.','Me Too could not be sent.'],
    ['Không tải được dữ liệu online:','Could not load online data:'],['ADVERTISEMENT','ADVERTISEMENT'],['BANNER 1','BANNER 1'],['BANNER 2','BANNER 2'],
    ['Anonymous','Anonymous'],['Tớ từng nghĩ mình không xứng đáng được yêu... cho đến khi có một người ở lại. 💗','I thought I was not worthy of love... until someone chose to stay. 💗'],
    ['Xung quanh nhiều người, nhưng sao vẫn thấy một mình...','So many people around me, yet I still feel alone...'],
    ['Hôm nay không có gì đặc biệt, nhưng tớ vẫn thấy vui.','Nothing special happened today, but I still feel happy.'],
    ['Có những điều... chỉ có thể giấu ở đây.','Some things... can only be hidden here.'],
    ['Tớ không biết mình nhớ cậu, hay chỉ nhớ cảm giác khi ở bên cậu...','I do not know if I miss you, or just the feeling of being with you...'],
    ['Những điều nhỏ bé cũng có thể làm tớ yêu đời hơn...','Small things can make life feel better...'],
    ['Tớ không giận cậu... Tớ chỉ thấy tổn thương.','I am not angry at you... I am just hurt.']
  ]);
  function translate(root=document.body){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let n;while(n=walker.nextNode())nodes.push(n);
    nodes.forEach(node=>{
      const value=node.nodeValue.trim();
      if(!value||!textMap.has(value))return;
      node.nodeValue=node.nodeValue.replace(value,textMap.get(value));
    });
    root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
      const p=el.getAttribute('placeholder');
      if(textMap.has(p))el.setAttribute('placeholder',textMap.get(p));
      if(p==='🔎  Tìm cảm xúc, từ khóa, hashtag...')el.setAttribute('placeholder','🔎  Search feelings, keywords, hashtags...');
      if(p==='Nói gì đó một cách ẩn danh...')el.setAttribute('placeholder','Say something anonymously...');
    });
  }
  const observer=new MutationObserver(()=>translate());
  function start(){
    translate();observer.observe(document.body,{childList:true,subtree:true});
    document.documentElement.lang='en';document.title='UNSAIDLY — Anonymous Meme & Social Network';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
