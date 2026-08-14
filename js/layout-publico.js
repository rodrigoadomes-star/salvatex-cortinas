(function(){

  const DEFAULTS={
    header:{
      logoText:"SALVATEX",
      logoSubtext:"CORTINAS",
      curtainsLabel:"Cortinas sob medida",
      blindsLabel:"Persianas sob medida",
      contactLabel:"Contato",
      cartLabel:"Carrinho",
      showContact:true,
      showCart:true
    },

    home:{
      hero:{
        kicker:"Cortinas e persianas",
        title:"Sob medida para transformar seus ambientes.",
        subtitle:"Encontre cortinas, persianas e opções pronta entrega com acabamento pensado para cada espaço.",
        primaryText:"Conhecer opções",
        primaryTarget:"#colecoes-home",
        secondaryText:"Falar com a Salvatex",
        secondaryTarget:"#contato",
        backgroundImage:"/imagens/gazenatural100bck.jpeg"
      },

      sections:[
        {id:"hero",enabled:true,order:10},
        {id:"collections",enabled:true,order:20},
        {id:"benefits",enabled:true,order:30},
        {id:"configurator",enabled:true,order:40}
      ],

      collections:{
        kicker:"SALVATEX CORTINAS",
        title:"Sob medida para transformar seus ambientes",
        subtitle:"Escolha o modelo e veja opções, medidas e produtos cadastrados diretamente pelo nosso catálogo."
      },

      benefits:[
        {title:"Feito sob medida",text:"Perfeito para o seu espaço"},
        {title:"Materiais selecionados",text:"Acabamento e qualidade"},
        {title:"Entrega para todo o Brasil",text:"Com segurança e agilidade"},
        {title:"Atendimento especializado",text:"Suporte antes e depois da compra"}
      ],

      configurator:{
        kicker:"CONFIGURADOR WAVE",
        title:"Configure sua cortina sob medida",
        subtitle:"Escolha medidas, tecido, forro, cor e acabamento para montar sua cortina."
      }
    },

    colors:{
      primary:"#2f2116",
      accent:"#9a7547",
      background:"#fbfaf8",
      text:"#172033"
    },

    footer:{
      brandText:"SALVATEX CORTINAS",
      description:"Cortinas e persianas sob medida.",
      whatsapp:"5544998793160",
      copyright:"SALVATEX CORTINAS · 2026"
    }
  };

  function clone(v){
    return JSON.parse(JSON.stringify(v));
  }

  function merge(target,source){
    if(!source||typeof source!=="object"||Array.isArray(source))return target;

    Object.entries(source).forEach(([k,v])=>{
      if(v&&typeof v==="object"&&!Array.isArray(v)){
        target[k]=merge(
          target[k]&&typeof target[k]==="object"&&!Array.isArray(target[k])
            ? target[k]
            : {},
          v
        );
      }else{
        target[k]=v;
      }
    });

    return target;
  }

  function setText(selector,value){
    document.querySelectorAll(selector).forEach(el=>{
      if(value!=null&&value!=="")el.textContent=value;
    });
  }

  function applyHeader(layout){
    document.querySelectorAll(".logo").forEach(logo=>{
      const small=logo.querySelector("small");
      const sub=small?.textContent||"";

      /*
        A logo possui mais de um nó de texto por causa das
        quebras de linha do HTML. Alterar todos eles fazia:
        SALVATEX / CORTINAS / SALVATEX.

        Agora somente o primeiro nó textual da marca é editado.
      */
      const textNodes=
        [...logo.childNodes]
          .filter(node=>
            node.nodeType===Node.TEXT_NODE
          );

      const mainText=
        textNodes.find(node=>
          String(node.textContent||"").trim()
        ) ||
        textNodes[0];

      if(mainText){
        mainText.textContent=
          (layout.header.logoText||"SALVATEX") +
          "\n      ";
      }

      textNodes.forEach(node=>{
        if(node!==mainText){
          node.textContent="";
        }
      });

      if(small){
        small.textContent=
          layout.header.logoSubtext||
          sub||
          "CORTINAS";
      }
    });

    document.querySelectorAll(".nav-mega-trigger").forEach((btn,index)=>{
      const span=btn.querySelector("span");
      btn.childNodes.forEach(node=>{
        if(node.nodeType===Node.TEXT_NODE){
          node.textContent=index===0
            ? (layout.header.curtainsLabel||"Cortinas sob medida")+" "
            : (layout.header.blindsLabel||"Persianas sob medida")+" ";
        }
      });
      if(span)span.textContent="⌄";
    });

    document.querySelectorAll('.navlinks > a[href*="contato"]').forEach(a=>{
      a.textContent=layout.header.contactLabel||"Contato";
      a.style.display=layout.header.showContact===false?"none":"";
    });

    document.querySelectorAll(".carrinho-link-topo").forEach(a=>{
      a.style.display=layout.header.showCart===false?"none":"";
      const text=a.querySelector(".carrinho-texto");
      if(text)text.textContent=layout.header.cartLabel||"Carrinho";
    });
  }

  function applyColors(layout){
    const root=document.documentElement;

    root.style.setProperty("--layout-primary",layout.colors.primary||"#2f2116");
    root.style.setProperty("--layout-accent",layout.colors.accent||"#9a7547");
    root.style.setProperty("--layout-background",layout.colors.background||"#fbfaf8");
    root.style.setProperty("--layout-text",layout.colors.text||"#172033");
  }

  function applyHome(layout){
    const hero=document.querySelector(".hero-home-new");

    if(hero){
      const kicker=hero.querySelector(".kicker");
      const title=hero.querySelector("h1");
      const subtitle=hero.querySelector("p");
      const buttons=hero.querySelectorAll(".hero-home-actions a");

      if(kicker)kicker.textContent=layout.home.hero.kicker||"";
      if(title)title.textContent=layout.home.hero.title||"";
      if(subtitle)subtitle.textContent=layout.home.hero.subtitle||"";

      if(buttons[0]){
        buttons[0].textContent=layout.home.hero.primaryText||"";
        buttons[0].href=layout.home.hero.primaryTarget||"#colecoes-home";
      }

      if(buttons[1]){
        buttons[1].textContent=layout.home.hero.secondaryText||"";
        buttons[1].href=layout.home.hero.secondaryTarget||"#contato";
      }

      if(layout.home.hero.backgroundImage){
        hero.style.backgroundImage=
          `linear-gradient(90deg,rgba(247,242,235,.98) 0%,rgba(247,242,235,.91) 33%,rgba(247,242,235,.25) 68%,rgba(247,242,235,.12) 100%),url("${layout.home.hero.backgroundImage}")`;
      }
    }

    const collections=document.querySelector(".home-collections");

    if(collections){
      const kicker=collections.querySelector(".home-section-head .kicker");
      const title=collections.querySelector(".home-section-head h2");
      const subtitle=collections.querySelector(".home-section-head p");

      if(kicker)kicker.textContent=layout.home.collections.kicker||"";
      if(title)title.textContent=layout.home.collections.title||"";
      if(subtitle)subtitle.textContent=layout.home.collections.subtitle||"";

      const benefits=collections.querySelectorAll(".home-benefits-strip > div");
      (layout.home.benefits||[]).forEach((item,index)=>{
        const box=benefits[index];
        if(!box)return;

        const strong=box.querySelector("strong");
        const span=box.querySelector("span");

        if(strong)strong.textContent=item.title||"";
        if(span)span.textContent=item.text||"";
      });
    }

    const intro=document.querySelector(".home-configurator-intro");

    if(intro){
      const kicker=intro.querySelector(".kicker");
      const title=intro.querySelector("h2");
      const subtitle=intro.querySelector("p");

      if(kicker)kicker.textContent=layout.home.configurator.kicker||"";
      if(title)title.textContent=layout.home.configurator.title||"";
      if(subtitle)subtitle.textContent=layout.home.configurator.subtitle||"";
    }

    applyHomeSections(layout);
  }

  function applyHomeSections(layout){
    const map={
      hero:document.querySelector(".hero-home-new"),
      collections:document.querySelector(".home-collections"),
      benefits:document.querySelector(".home-benefits-strip"),
      configurator:document.querySelector(".home-configurator-intro")?.parentElement || document.querySelector(".config-wrap")
    };

    const sections=[...(layout.home.sections||[])]
      .sort((a,b)=>Number(a.order||0)-Number(b.order||0));

    sections.forEach(item=>{
      const el=map[item.id];
      if(!el)return;

      if(item.id==="benefits"){
        el.style.display=item.enabled===false?"none":"";
        return;
      }

      el.style.display=item.enabled===false?"none":"";
      el.style.order=String(Number(item.order||0));
    });
  }

  function applyFooter(layout){
    document.querySelectorAll("footer").forEach(footer=>{
      footer.querySelectorAll(".footer-brand,[data-footer-brand]").forEach(el=>{
        el.textContent=layout.footer.brandText||"";
      });

      footer.querySelectorAll(".footer-copy,[data-footer-description]").forEach(el=>{
        el.textContent=layout.footer.description||"";
      });

      footer.querySelectorAll(".footer-copyright,[data-footer-copyright]").forEach(el=>{
        el.textContent=layout.footer.copyright||"";
      });
    });
  }

  async function load(){
    let layout=clone(DEFAULTS);

    try{
      const r=await fetch("/api/layout",{cache:"no-store"});
      const d=await r.json();

      if(r.ok&&d?.ok&&d.layout){
        layout=merge(layout,d.layout);
      }
    }catch(err){
      console.warn("Layout remoto indisponível:",err);
    }

    window.SALVATEX_LAYOUT=layout;

    applyColors(layout);
    applyHeader(layout);
    applyHome(layout);
    applyFooter(layout);

    window.dispatchEvent(
      new CustomEvent(
        "salvatex:layout-ready",
        {
          detail:{layout}
        }
      )
    );
  }

  /*
    nav-publico.js reconstrói o menu depois de consultar as páginas.
    Reaplicamos os textos do cabeçalho após essa reconstrução para
    impedir que os nomes editados no Admin voltem aos valores fixos.
  */
  window.addEventListener(
    "salvatex:navigation-ready",
    ()=>{
      if(window.SALVATEX_LAYOUT){
        applyHeader(
          window.SALVATEX_LAYOUT
        );
      }
    }
  );

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",load);
  }else{
    load();
  }

})();