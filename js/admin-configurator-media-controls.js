(function(){
  function escAttr(v){return String(v||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function mediaKeyFromUrl(value){
    try{
      const u=new URL(String(value||""),location.origin);
      if(!u.pathname.startsWith("/media/"))return "";
      return decodeURIComponent(u.pathname.slice("/media/".length));
    }catch{return "";}
  }
  async function deletePhysicalIfLocal(url){
    const key=mediaKeyFromUrl(url);
    if(!key)return;
    await api("media/delete?key="+encodeURIComponent(key),{method:"DELETE"});
  }
  async function saveCard(card,status){
    const form=card.closest("form")||document.getElementById("cfg-form");
    if(!form||typeof cfgSaveCurrent!=="function")return;
    if(typeof cfgSyncMediaStateFromDom==="function")cfgSyncMediaStateFromDom();
    await cfgSaveCurrent(form,CONFIG_CURRENT_DATA,ACTIVE_CONFIGURATOR_ID,false);
    if(status)status.textContent="Alteração salva.";
  }
  function button(label,kind,url){
    return `<button type="button" class="cfg-media-delete-btn" data-media-delete="${kind}" data-media-url="${escAttr(url)}">${label}</button>`;
  }
  function enhanceCard(card){
    const capaHidden=card.querySelector(".cfg-tab-capa");
    const capaPreview=card.querySelector(".cfg-tab-capa-preview");
    const capaBox=capaPreview?.closest(".media-upload-box");
    if(capaHidden&&capaBox){
      capaBox.querySelector(".cfg-media-delete-cover")?.remove();
      if(String(capaHidden.value||"").trim()){
        const holder=document.createElement("div");
        holder.className="cfg-media-delete-cover";
        holder.innerHTML=button("Excluir capa","capa",capaHidden.value);
        capaBox.appendChild(holder);
      }
    }

    const galleryHidden=card.querySelector(".cfg-tab-imagens");
    const galleryPreview=card.querySelector(".cfg-tab-galeria-preview");
    if(galleryHidden&&galleryPreview){
      const urls=String(galleryHidden.value||"").split("\n").map(x=>x.trim()).filter(Boolean);
      galleryPreview.innerHTML=urls.length
        ? urls.map(url=>`<span class="cfg-media-thumb-wrap"><img src="${escAttr(url)}"><button type="button" class="cfg-media-thumb-delete" data-media-delete="galeria" data-media-url="${escAttr(url)}" aria-label="Excluir foto">×</button></span>`).join("")
        : "<span>Sem fotos</span>";
    }

    const videoHidden=card.querySelector(".cfg-tab-video");
    const videoPreview=card.querySelector(".cfg-tab-video-preview");
    const videoBox=videoPreview?.closest(".media-upload-box");
    if(videoHidden&&videoBox){
      videoBox.querySelector(".cfg-media-delete-video")?.remove();
      if(String(videoHidden.value||"").trim()){
        const holder=document.createElement("div");
        holder.className="cfg-media-delete-video";
        holder.innerHTML=button("Excluir vídeo","video",videoHidden.value);
        videoBox.appendChild(holder);
      }
    }
  }
  function enhanceAll(){document.querySelectorAll(".cfg-option-media-card").forEach(enhanceCard);}

  document.addEventListener("click",async event=>{
    const btn=event.target.closest("[data-media-delete]");
    if(!btn)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const card=btn.closest(".cfg-option-media-card");
    if(!card)return;
    const kind=btn.dataset.mediaDelete;
    const url=String(btn.dataset.mediaUrl||"").trim();
    const status=card.querySelector(".upload-status");
    if(!url)return;
    if(!confirm(kind==="galeria"?"Excluir esta foto da galeria?":"Excluir esta mídia?"))return;
    try{
      if(status)status.textContent="Excluindo...";
      if(kind==="capa"){
        const hidden=card.querySelector(".cfg-tab-capa");if(hidden)hidden.value="";
        const preview=card.querySelector(".cfg-tab-capa-preview");if(preview)preview.innerHTML="<span>Sem capa</span>";
      }else if(kind==="video"){
        const hidden=card.querySelector(".cfg-tab-video");if(hidden)hidden.value="";
        const preview=card.querySelector(".cfg-tab-video-preview");if(preview)preview.innerHTML="<span>Sem vídeo</span>";
      }else if(kind==="galeria"){
        const hidden=card.querySelector(".cfg-tab-imagens");
        const urls=String(hidden?.value||"").split("\n").map(x=>x.trim()).filter(Boolean).filter(x=>x!==url);
        if(hidden)hidden.value=urls.join("\n");
      }
      await saveCard(card,status);
      try{await deletePhysicalIfLocal(url);}catch(error){console.warn("Arquivo ficou órfão no R2:",error);}
      enhanceCard(card);
      if(typeof toast==="function")toast("Mídia excluída");
    }catch(error){
      if(status)status.textContent=error.message;
      alert(error.message);
      try{await navigate("configurators",true);}catch{}
    }
  },true);

  const style=document.createElement("style");
  style.textContent=`
    .cfg-media-delete-cover,.cfg-media-delete-video{margin-top:8px}
    .cfg-media-delete-btn{border:1px solid #e6c9c4;background:#fff;color:#a33b2f;border-radius:7px;padding:7px 10px;font-size:10px;font-weight:700;cursor:pointer;width:100%}
    .cfg-media-delete-btn:hover{background:#fff4f2}
    .cfg-media-thumb-wrap{position:relative;display:inline-block;margin:2px}
    .cfg-media-thumb-wrap img{display:block}
    .cfg-media-thumb-delete{position:absolute;right:-5px;top:-5px;width:20px;height:20px;border:0;border-radius:50%;background:#8e2f25;color:#fff;font-weight:800;cursor:pointer;line-height:20px;padding:0;box-shadow:0 1px 4px rgba(0,0,0,.2)}
  `;
  document.head.appendChild(style);

  const observer=new MutationObserver(()=>requestAnimationFrame(enhanceAll));
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener("DOMContentLoaded",enhanceAll,{once:true});
  window.addEventListener("load",enhanceAll,{once:true});
  setTimeout(enhanceAll,100);
  setTimeout(enhanceAll,500);
  setTimeout(enhanceAll,1200);
  setInterval(enhanceAll,2000);
})();
