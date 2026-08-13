// ============================================================
// FUNCIONAMENTO DA PÁGINA
// ============================================================

const state = {
  modelo: "Wave",
  tecido: "Gaze de Linho",
  cor: "Branco",
  forro: "Forro leve",
  trilho: ""
};


// ============================================================
// MAPEAMENTO DAS PASTAS
// ============================================================

const PASTAS_MIDIA = {

  tecidos: {
    "Gaze de Linho": "gaze",
    "Linho Damasco": "damasco"
  },

  modelos: {
    "Wave": "wave",
    "Ilhós": "ilhos",
    "Prega Macho": "pregamacho"
  },

  cores: {
    "Branco": "branco",
    "Bege": "bege",
    "Cinza": "cinza",
    "Natural": "natural",
    "Off White": "offwhite",
    "Grafite": "grafite"
  },

  forros: {
    "Sem forro": "sem-forro",
    "Forro leve": "forro-leve",
    "Forro Peletizado 50%": "peletizado-50",
    "Blackout 80%": "blackout-80",
    "Blackout 100%": "blackout-100"
  }

};


// ============================================================
// CAPAS DAS CORES
// ============================================================

const GALERIAS_CORES = {

  "Gaze de Linho": {

    "Branco": [
      {
        src: "imagens/capas/gaze-branco-capa.png",
        legenda: "Gaze de Linho Branco"
      }
    ],

    "Bege": [
      {
        src: "imagens/capas/gaze-bege-capa.png",
        legenda: "Gaze de Linho Bege"
      }
    ],

    "Cinza": [
      {
        src: "imagens/capas/gaze-cinza-capa.png",
        legenda: "Gaze de Linho Cinza"
      }
    ],

    "Off White": [
      {
        src: "imagens/capas/gaze-offwhite-capa.png",
        legenda: "Gaze de Linho Off White"
      }
    ],

    "Natural": [
      {
        src: "imagens/capas/gaze-natural-capa.png",
        legenda: "Gaze de Linho Natural"
      }
    ]

  },


  "Linho Damasco": {

    "Branco": [
      {
        src: "imagens/capas/damasco-branco-capa.png",
        legenda: "Linho Damasco Branco"
      }
    ],

    "Bege": [
      {
        src: "imagens/capas/damasco-bege-capa.png",
        legenda: "Linho Damasco Bege"
      }
    ],

    "Natural": [
      {
        src: "imagens/capas/damasco-natural-capa.png",
        legenda: "Linho Damasco Natural"
      }
    ],

    "Off White": [
      {
        src: "imagens/capas/damasco-offwhite-capa.png",
        legenda: "Linho Damasco Off White"
      }
    ],

    "Grafite": [
      {
        src: "imagens/capas/damasco-grafite-capa.png",
        legenda: "Linho Damasco Grafite"
      }
    ]

  }

};


// ============================================================
// CONTROLE DO CARROSSEL
// ============================================================

let previewIndex = 0;

let fotosCarrosselAtuais = [];

let tokenAtualizacaoGaleria = 0;

let tokenVideo = 0;

let videoAtual = null;

let videoCorAtual = "";


// ============================================================
// CACHE
// ============================================================

const CACHE_SESSAO =
  String(
    Date.now()
  );

function midiaGerenciada(src) {
  const valor =
    String(
      src || ""
    );

  return (
    valor.startsWith(
      "/media/"
    ) ||
    valor.includes(
      "/media/"
    )
  );
}

function semCache(src) {

  if (!src) {
    return "";
  }

  /*
    Arquivos do R2 têm nome UUID e cache immutable.
    Nunca adicionamos timestamp neles.
  */
  if (
    midiaGerenciada(src)
  ) {
    return src;
  }

  /*
    Para o legado, o valor muda apenas ao recarregar
    a página — não a cada uso da mesma imagem.
  */
  const separador =
    src.includes("?")
      ? "&"
      : "?";

  return (
    src +
    separador +
    "v=" +
    CACHE_SESSAO
  );

}


// ============================================================
// MÍDIA CONFIGURADA PELO PAINEL ADMIN
// ============================================================

function obterMidiaAdmin(tecido, modelo, cor, forro) {
  const lista = Array.isArray(CONFIG.mediaConfigurador)
    ? CONFIG.mediaConfigurador
    : [];

  return lista.find((item) =>
    String(item.tecido || "") === String(tecido || "") &&
    String(item.modelo || "Wave") === String(modelo || "Wave") &&
    String(item.cor || "") === String(cor || "") &&
    String(item.forro || "") === String(forro || "")
  ) || null;
}

function obterCapaCorAdmin(tecido, cor) {
  const lista = Array.isArray(CONFIG.mediaConfigurador)
    ? CONFIG.mediaConfigurador
    : [];
  const item = lista.find((x) =>
    String(x.tecido || "") === String(tecido || "") &&
    String(x.cor || "") === String(cor || "") &&
    (x.capa || (Array.isArray(x.imagens) && x.imagens[0]))
  );
  return item
    ? (item.capa || item.imagens?.[0] || "")
    : "";
}

// ============================================================
// CAMINHO DA PASTA
// ============================================================

function obterPastaMidia(
  tecido,
  modelo,
  cor,
  forro
) {

  const tecidoPasta =
    PASTAS_MIDIA.tecidos[tecido];


  const modeloPasta =
    PASTAS_MIDIA.modelos[modelo];


  const corPasta =
    PASTAS_MIDIA.cores[cor];


  const forroPasta =
    PASTAS_MIDIA.forros[forro];


  if (
    !tecidoPasta ||
    !modeloPasta ||
    !corPasta ||
    !forroPasta
  ) {

    return "";

  }


  return (
    "imagens/galeria/" +
    tecidoPasta +
    "/" +
    modeloPasta +
    "/" +
    corPasta +
    "/" +
    forroPasta
  );

}


// ============================================================
// CAMINHO DA FOTO
// ============================================================

function obterCaminhoFoto(
  tecido,
  modelo,
  cor,
  forro,
  numero
) {

  const pasta =
    obterPastaMidia(
      tecido,
      modelo,
      cor,
      forro
    );


  if (!pasta) {

    return "";

  }


  return (
    pasta +
    "/foto-" +
    numero +
    ".png"
  );

}


// ============================================================
// CAMINHO DO VÍDEO
// ============================================================

function obterCaminhoVideo(
  tecido,
  modelo,
  cor,
  forro
) {

  const midiaAdmin = obterMidiaAdmin(tecido, modelo, cor, forro);
  if (midiaAdmin?.video) {
    return midiaAdmin.video;
  }

  const pasta =
    obterPastaMidia(
      tecido,
      modelo,
      cor,
      forro
    );


  if (!pasta) {

    return "";

  }


  return (
    pasta +
    "/video.mp4"
  );

}


// ============================================================
// VERIFICA SE IMAGEM EXISTE
// ============================================================

function verificarImagem(src) {

  return new Promise(
    (resolve) => {

      if (!src) {

        resolve(false);

        return;

      }


      const imagem =
        new Image();


      imagem.onload =
        () => resolve(true);


      imagem.onerror =
        () => resolve(false);


      imagem.src =
        semCache(src);

    }
  );

}


// ============================================================
// CARREGA AS FOTOS
//
// REGRA:
//
// tecido + modelo + forro
//
// A cor selecionada aparece primeiro.
// Depois o carrossel mostra as outras cores que possuem fotos.
// ============================================================

async function carregarFotosCarrossel() {

  const token =
    ++tokenAtualizacaoGaleria;


  const tecidoAtual =
    state.tecido;


  const modeloAtual =
    state.modelo;


  const forroAtual =
    state.forro;


  const corSelecionada =
    state.cor;


  const cores =
    CONFIG.cores?.[
      tecidoAtual
    ] || [];


  const coresOrdenadas = [
    corSelecionada,
    ...cores.filter(
      (cor) =>
        cor !==
        corSelecionada
    )
  ];


  const fotosFinais = [];


  // ========================================================
  // REGRA DE MIGRAÇÃO
  //
  // Cada COR é tratada separadamente:
  //
  // 1. Se aquela combinação possui mídia no Admin/R2,
  //    usamos exatamente capa + galeria cadastradas.
  //
  // 2. Se aquela cor ainda NÃO possui mídia cadastrada,
  //    usamos temporariamente as fotos antigas.
  //
  // Assim é possível migrar uma cor por vez sem fazer
  // desaparecer as demais fotos do site.
  // ========================================================

  for (
    const cor
    of coresOrdenadas
  ) {

    if (
      token !==
      tokenAtualizacaoGaleria
    ) {
      return;
    }


    const midiaAdmin =
      obterMidiaAdmin(
        tecidoAtual,
        modeloAtual,
        cor,
        forroAtual
      );


    const urlsAdmin = [];


    if (
      midiaAdmin?.capa
    ) {

      urlsAdmin.push(
        String(
          midiaAdmin.capa
        ).trim()
      );

    }


    if (
      Array.isArray(
        midiaAdmin?.imagens
      )
    ) {

      midiaAdmin.imagens
        .map(
          (src) =>
            String(
              src || ""
            ).trim()
        )
        .filter(Boolean)
        .forEach(
          (src) => {

            if (
              !urlsAdmin.includes(
                src
              )
            ) {

              urlsAdmin.push(
                src
              );

            }

          }
        );

    }


    if (
      urlsAdmin.length
    ) {

      urlsAdmin.forEach(
        (src) => {

          fotosFinais.push({
            src,
            cor,
            configurada:
              true
          });

        }
      );


      /*
        Não testamos foto-1...10 para esta cor,
        pois a combinação já é administrada pelo R2.
      */
      continue;

    }


    // ======================================================
    // FALLBACK LEGADO SOMENTE PARA A COR AINDA NÃO MIGRADA
    // ======================================================

    const candidatosCor = [];


    for (
      let numero = 1;
      numero <= 10;
      numero++
    ) {

      const src =
        obterCaminhoFoto(
          tecidoAtual,
          modeloAtual,
          cor,
          forroAtual,
          numero
        );


      if (src) {

        candidatosCor.push({
          src,
          cor,
          configurada:
            false
        });

      }

    }


    const resultadosCor =
      await Promise.all(

        candidatosCor.map(
          async (foto) => {

            const existe =
              await verificarImagem(
                foto.src
              );


            return existe
              ? foto
              : null;

          }
        )

      );


    resultadosCor
      .filter(Boolean)
      .forEach(
        (foto) => {

          fotosFinais.push(
            foto
          );

        }
      );

  }


  if (
    token !==
    tokenAtualizacaoGaleria
  ) {

    return;

  }


  fotosCarrosselAtuais =
    fotosFinais;


  previewIndex =
    0;


  atualizarPreview();

}


// ============================================================
// FOTO ATUAL
// ============================================================

function obterFotoAtual() {

  if (
    !fotosCarrosselAtuais.length
  ) {

    return null;

  }


  if (
    previewIndex < 0 ||
    previewIndex >=
      fotosCarrosselAtuais.length
  ) {

    previewIndex = 0;

  }


  return (
    fotosCarrosselAtuais[
      previewIndex
    ]
  );

}


// ============================================================
// PLACEHOLDER
// ============================================================

function gerarPlaceholder() {

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="900"
      height="700"
    >

      <rect
        width="100%"
        height="100%"
        fill="#f3eee8"
      />

      <text
        x="50%"
        y="46%"
        text-anchor="middle"
        font-family="Arial"
        font-size="28"
        fill="#746c63"
      >
        ${state.tecido} - ${state.cor}
      </text>

      <text
        x="50%"
        y="54%"
        text-anchor="middle"
        font-family="Arial"
        font-size="20"
        fill="#9a9188"
      >
        Foto deste acabamento em breve
      </text>

    </svg>
  `;


  return (
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      svg
    )
  );

}


// ============================================================
// FORMATAÇÃO BRL
// ============================================================

function brl(valor) {

  return Number(
    valor || 0
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );

}


// ============================================================
// VALOR DO CAMPO
// ============================================================

function val(id) {

  const elemento =
    document.getElementById(
      id
    );


  return elemento
    ? elemento.value
    : "";

}


// ============================================================
// DADOS ATUAIS
// ============================================================

function dadosAtuais() {

  return {

    modelo:
      state.modelo,

    tecido:
      state.tecido,

    cor:
      state.cor,

    forro:
      state.forro,

    trilho:
      state.trilho,

    largura:
      val(
        "largura"
      ),

    altura:
      val(
        "altura"
      ),

    franzimento:
      val(
        "franzimento"
      )

  };

}


// ============================================================
// CARDS DE MODELO / TECIDO / FORRO
// ============================================================

function bindCards(
  groupId,
  key
) {

  document
    .querySelectorAll(
      "#" +
      groupId +
      " .card"
    )
    .forEach(
      (el) => {

        el.addEventListener(
          "click",
          async () => {

            document
              .querySelectorAll(
                "#" +
                groupId +
                " .card"
              )
              .forEach(
                (card) => {

                  card.classList.remove(
                    "selected"
                  );

                }
              );


            el.classList.add(
              "selected"
            );


            state[key] =
              el.dataset.value;


            if (
              key ===
              "tecido"
            ) {

              atualizarCores();

            }


            atualizarOrcamento();


            if (
              key === "modelo" ||
              key === "tecido" ||
              key === "forro"
            ) {

              previewIndex = 0;


              await carregarFotosCarrossel();

            }

          }
        );

      }
    );

}


// ============================================================
// CORES
// ============================================================

function atualizarCores() {

  const container =
    document.getElementById(
      "cores-choice"
    );


  if (!container) {

    return;

  }


  const cores =
    CONFIG.cores?.[
      state.tecido
    ] || [];


  if (
    !cores.includes(
      state.cor
    )
  ) {

    state.cor =
      cores[0] ||
      "";

  }


  container.innerHTML =
    "";


  cores.forEach(
    (cor) => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "card card-cor" +
        (
          state.cor === cor
            ? " selected"
            : ""
        );


      card.dataset.value =
        cor;


      const capa =
        obterCapaCorAdmin(state.tecido, cor) ||
        GALERIAS_CORES?.[state.tecido]?.[cor]?.[0]?.src;


      if (capa) {

        const imagem =
          document.createElement(
            "img"
          );


        imagem.className =
          "card-cor-img";


        imagem.src =
          capa;


        imagem.alt =
          `${state.tecido} ${cor}`;


        imagem.loading =
          "lazy";


        imagem.addEventListener(
          "error",
          () => {

            imagem.style.display =
              "none";

          }
        );


        card.appendChild(
          imagem
        );

      }


      const strong =
        document.createElement(
          "strong"
        );


      strong.textContent =
        cor;


      card.appendChild(
        strong
      );


      card.addEventListener(
        "click",
        async () => {

          container
            .querySelectorAll(
              ".card"
            )
            .forEach(
              (item) => {

                item.classList.remove(
                  "selected"
                );

              }
            );


          card.classList.add(
            "selected"
          );


          state.cor =
            cor;


          atualizarOrcamento();


          previewIndex = 0;


          await carregarFotosCarrossel();

        }
      );


      container.appendChild(
        card
      );

    }
  );

}


// ============================================================
// CARROSSEL
// ============================================================

function atualizarPreview() {

  const img =
    document.getElementById(
      "preview-img"
    );


  const dots =
    document.getElementById(
      "preview-dots"
    );


  const carousel =
    document.getElementById(
      "preview-carousel"
    );


  const previewTecido =
    document.getElementById(
      "preview-tecido"
    );


  const previewCor =
    document.getElementById(
      "preview-cor"
    );


  if (!img) {

    return;

  }


  // ==========================================================
  // SEM FOTO
  // ==========================================================

  if (
    !fotosCarrosselAtuais.length
  ) {

    img.onerror =
      null;


    img.src =
      gerarPlaceholder();


    img.alt =
      `${state.tecido} ${state.cor}`;


    if (previewTecido) {

      previewTecido.textContent =
        state.tecido;

    }


    if (previewCor) {

      previewCor.textContent =
        state.cor;

    }


    if (dots) {

      dots.innerHTML =
        "";

    }


    if (carousel) {

      carousel.classList.add(
        "single-image"
      );

    }


    atualizarBotaoVideo(
      state.cor
    );


    return;

  }


  // ==========================================================
  // COM FOTO
  // ==========================================================

  const fotoAtual =
    obterFotoAtual();


  if (!fotoAtual) {

    return;

  }


  img.onerror =
    null;


  img.src =
    fotoAtual.configurada
      ? fotoAtual.src
      : semCache(
          fotoAtual.src
        );


  img.alt =
    `${state.tecido} ${fotoAtual.cor}`;


  if (previewTecido) {

    previewTecido.textContent =
      state.tecido;

  }


  if (previewCor) {

    previewCor.textContent =
      fotoAtual.cor;

  }


  if (carousel) {

    carousel.classList.toggle(
      "single-image",
      fotosCarrosselAtuais.length <=
        1
    );

  }


  if (dots) {

    dots.innerHTML =
      "";


    fotosCarrosselAtuais.forEach(
      (
        foto,
        indice
      ) => {

        const dot =
          document.createElement(
            "button"
          );


        dot.type =
          "button";


        dot.className =
          "preview-dot" +
          (
            indice ===
            previewIndex
              ? " active"
              : ""
          );


        dot.setAttribute(
          "aria-label",
          `Ver ${state.tecido} ${foto.cor}`
        );


        dot.addEventListener(
          "click",
          () => {

            previewIndex =
              indice;


            atualizarPreview();

          }
        );


        dots.appendChild(
          dot
        );

      }
    );

  }


  atualizarBotaoVideo(
    fotoAtual.cor
  );

}


// ============================================================
// PASSAR FOTO
// ============================================================

function mudarPreview(
  direcao
) {

  if (
    !fotosCarrosselAtuais.length
  ) {

    return;

  }


  previewIndex +=
    direcao;


  if (
    previewIndex < 0
  ) {

    previewIndex =
      fotosCarrosselAtuais.length -
      1;

  }


  if (
    previewIndex >=
    fotosCarrosselAtuais.length
  ) {

    previewIndex =
      0;

  }


  atualizarPreview();

}


// ============================================================
// BOTÃO DE VÍDEO
// ============================================================

function criarBotaoVideo() {

  if (
    document.getElementById(
      "botao-video-produto"
    )
  ) {

    return;

  }


  const carousel =
    document.getElementById(
      "preview-carousel"
    );


  if (!carousel) {

    return;

  }


  const botao =
    document.createElement(
      "button"
    );


  botao.id =
    "botao-video-produto";


  botao.type =
    "button";


  botao.textContent =
    "▶ Ver vídeo deste acabamento";


  Object.assign(
    botao.style,
    {

      display:
        "none",

      width:
        "100%",

      marginTop:
        "12px",

      padding:
        "12px 14px",

      border:
        "1px solid #e7e0d8",

      borderRadius:
        "10px",

      background:
        "#ffffff",

      color:
        "#211d18",

      fontWeight:
        "600",

      cursor:
        "pointer"

    }
  );


  botao.addEventListener(
    "click",
    abrirVideoProduto
  );


  carousel.appendChild(
    botao
  );

}


// ============================================================
// VERIFICA VÍDEO
// ============================================================

function verificarVideo(
  src
) {

  return new Promise(
    (resolve) => {

      if (!src) {

        resolve(false);

        return;

      }


      const video =
        document.createElement(
          "video"
        );


      const limpar =
        () => {

          video.removeEventListener(
            "loadedmetadata",
            sucesso
          );


          video.removeEventListener(
            "error",
            erro
          );


          video.removeAttribute(
            "src"
          );

      };


      const sucesso =
        () => {

          limpar();

          resolve(true);

        };


      const erro =
        () => {

          limpar();

          resolve(false);

        };


      video.preload =
        "metadata";


      video.addEventListener(
        "loadedmetadata",
        sucesso
      );


      video.addEventListener(
        "error",
        erro
      );


      video.src =
        semCache(
          src
        );


      video.load();

    }
  );

}


// ============================================================
// ATUALIZA BOTÃO DO VÍDEO
// ============================================================

async function atualizarBotaoVideo(
  cor
) {

  criarBotaoVideo();


  const botao =
    document.getElementById(
      "botao-video-produto"
    );


  if (!botao) {

    return;

  }


  const token =
    ++tokenVideo;


  botao.style.display =
    "none";


  videoAtual =
    null;


  const src =
    obterCaminhoVideo(
      state.tecido,
      state.modelo,
      cor,
      state.forro
    );


  const existe =
    await verificarVideo(
      src
    );


  if (
    token !==
    tokenVideo
  ) {

    return;

  }


  if (!existe) {

    return;

  }


  videoAtual =
    src;


  videoCorAtual =
    cor;


  botao.textContent =
    `▶ Ver vídeo — ${state.forro}`;


  botao.style.display =
    "block";

}


// ============================================================
// MODAL DO VÍDEO
// ============================================================

function criarModalVideo() {

  if (
    document.getElementById(
      "modal-video-produto"
    )
  ) {

    return;

  }


  const modal =
    document.createElement(
      "div"
    );


  modal.id =
    "modal-video-produto";


  Object.assign(
    modal.style,
    {

      display:
        "none",

      position:
        "fixed",

      inset:
        "0",

      zIndex:
        "20000",

      alignItems:
        "center",

      justifyContent:
        "center",

      padding:
        "20px",

      background:
        "rgba(0,0,0,.85)"

    }
  );


  const conteudo =
    document.createElement(
      "div"
    );


  Object.assign(
    conteudo.style,
    {

      position:
        "relative",

      width:
        "min(900px, 100%)",

      maxHeight:
        "92vh"

    }
  );


  const video =
    document.createElement(
      "video"
    );


  video.id =
    "video-produto";


  video.controls =
    true;


  video.playsInline =
    true;


  Object.assign(
    video.style,
    {

      display:
        "block",

      width:
        "100%",

      maxHeight:
        "88vh",

      background:
        "#000",

      borderRadius:
        "12px"

    }
  );


  const info =
    document.createElement(
      "div"
    );


  info.id =
    "video-produto-info";


  Object.assign(
    info.style,
    {

      position:
        "absolute",

      left:
        "14px",

      bottom:
        "14px",

      padding:
        "9px 12px",

      background:
        "rgba(255,255,255,.95)",

      borderRadius:
        "10px",

      color:
        "#211d18",

      fontSize:
        "12px",

      pointerEvents:
        "none"

    }
  );


  const fechar =
    document.createElement(
      "button"
    );


  fechar.type =
    "button";


  fechar.textContent =
    "×";


  fechar.setAttribute(
    "aria-label",
    "Fechar vídeo"
  );


  Object.assign(
    fechar.style,
    {

      position:
        "absolute",

      top:
        "-15px",

      right:
        "-15px",

      zIndex:
        "3",

      width:
        "44px",

      height:
        "44px",

      border:
        "0",

      borderRadius:
        "50%",

      background:
        "#fff",

      color:
        "#211d18",

      fontSize:
        "28px",

      cursor:
        "pointer"

    }
  );


  fechar.addEventListener(
    "click",
    fecharVideoProduto
  );


  modal.addEventListener(
    "click",
    (evento) => {

      if (
        evento.target ===
        modal
      ) {

        fecharVideoProduto();

      }

    }
  );


  conteudo.appendChild(
    video
  );


  conteudo.appendChild(
    info
  );


  conteudo.appendChild(
    fechar
  );


  modal.appendChild(
    conteudo
  );


  document.body.appendChild(
    modal
  );

}


// ============================================================
// ABRIR VÍDEO
// ============================================================

function abrirVideoProduto() {

  if (!videoAtual) {

    return;

  }


  criarModalVideo();


  const modal =
    document.getElementById(
      "modal-video-produto"
    );


  const video =
    document.getElementById(
      "video-produto"
    );


  const info =
    document.getElementById(
      "video-produto-info"
    );


  if (
    !modal ||
    !video
  ) {

    return;

  }


  video.src =
    semCache(
      videoAtual
    );


  if (info) {

    info.innerHTML =
      `<strong>${state.tecido}</strong><br>` +
      `${videoCorAtual} · ${state.forro}`;

  }


  modal.style.display =
    "flex";


  document.body.style.overflow =
    "hidden";


  video.play().catch(
    () => {}
  );

}


// ============================================================
// FECHAR VÍDEO
// ============================================================

function fecharVideoProduto() {

  const modal =
    document.getElementById(
      "modal-video-produto"
    );


  const video =
    document.getElementById(
      "video-produto"
    );


  if (video) {

    video.pause();


    video.removeAttribute(
      "src"
    );


    video.load();

  }


  if (modal) {

    modal.style.display =
      "none";

  }


  document.body.style.overflow =
    "";

}


// ============================================================
// ZOOM
// ============================================================

function atualizarImagemZoom() {

  const imagemGrande =
    document.getElementById(
      "zoom-foto-img"
    );


  const zoomTecido =
    document.getElementById(
      "zoom-tecido"
    );


  const zoomCor =
    document.getElementById(
      "zoom-cor"
    );


  if (!imagemGrande) {

    return;

  }


  const fotoAtual =
    obterFotoAtual();


  if (!fotoAtual) {

    imagemGrande.src =
      gerarPlaceholder();


    imagemGrande.alt =
      `${state.tecido} ${state.cor}`;


    if (zoomTecido) {

      zoomTecido.textContent =
        state.tecido;

    }


    if (zoomCor) {

      zoomCor.textContent =
        state.cor;

    }


    return;

  }


  imagemGrande.src =
    fotoAtual.configurada
      ? fotoAtual.src
      : semCache(
          fotoAtual.src
        );


  imagemGrande.alt =
    `${state.tecido} ${fotoAtual.cor}`;


  if (zoomTecido) {

    zoomTecido.textContent =
      state.tecido;

  }


  if (zoomCor) {

    zoomCor.textContent =
      fotoAtual.cor;

  }

}


// ============================================================
// ABRIR ZOOM
// ============================================================

function abrirZoomPreview() {

  const modal =
    document.getElementById(
      "zoom-foto"
    );


  if (!modal) {

    return;

  }


  atualizarImagemZoom();


  modal.classList.add(
    "aberto"
  );


  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.style.overflow =
    "hidden";

}


// ============================================================
// FECHAR ZOOM
// ============================================================

function fecharZoomPreview() {

  const modal =
    document.getElementById(
      "zoom-foto"
    );


  if (!modal) {

    return;

  }


  modal.classList.remove(
    "aberto"
  );


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.style.overflow =
    "";

}


// ============================================================
// PASSAR FOTO NO ZOOM
// ============================================================

function mudarFotoZoom(
  direcao
) {

  mudarPreview(
    direcao
  );


  atualizarImagemZoom();

}


// ============================================================
// GALERIA "CONHECER ESTE TECIDO"
// ============================================================

function abrirGaleriaCor() {

  const modal =
    document.getElementById(
      "modal-cor"
    );


  const galeria =
    document.getElementById(
      "modal-cor-galeria"
    );


  const titulo =
    document.getElementById(
      "modal-cor-titulo"
    );


  const tecido =
    document.getElementById(
      "modal-cor-tecido"
    );


  if (
    !modal ||
    !galeria ||
    !titulo ||
    !tecido
  ) {

    return;

  }


  const midiaAtual = obterMidiaAdmin(state.tecido, state.modelo, state.cor, state.forro);
  const fotosAdmin = Array.isArray(midiaAtual?.imagens)
    ? midiaAtual.imagens.map((src) => ({src, legenda: `${state.tecido} ${state.cor}`}))
    : [];
  const fotos = fotosAdmin.length
    ? fotosAdmin
    : (GALERIAS_CORES?.[state.tecido]?.[state.cor] || []);


  tecido.textContent =
    state.tecido;


  titulo.textContent =
    state.cor;


  galeria.innerHTML =
    "";


  if (
    !fotos.length
  ) {

    galeria.innerHTML =
      `
        <p style="color:#746c63;">
          Fotos desta cor serão adicionadas em breve.
        </p>
      `;

  } else {

    fotos.forEach(
      (foto) => {

        const bloco =
          document.createElement(
            "div"
          );


        bloco.className =
          "modal-cor-foto";


        const img =
          document.createElement(
            "img"
          );


        img.src =
          foto.src;


        img.alt =
          `${state.tecido} ${state.cor}`;


        img.loading =
          "lazy";


        bloco.appendChild(
          img
        );


        if (
          foto.legenda
        ) {

          const legenda =
            document.createElement(
              "div"
            );


          legenda.className =
            "modal-cor-legenda";


          legenda.textContent =
            foto.legenda;


          bloco.appendChild(
            legenda
          );

        }


        galeria.appendChild(
          bloco
        );

      }
    );

  }


  modal.classList.add(
    "aberto"
  );


  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "modal-aberto"
  );

}


// ============================================================
// FECHAR GALERIA
// ============================================================

function fecharGaleriaCor() {

  const modal =
    document.getElementById(
      "modal-cor"
    );


  if (!modal) {

    return;

  }


  modal.classList.remove(
    "aberto"
  );


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "modal-aberto"
  );

}


// ============================================================
// BARRA
// ============================================================

function atualizarInfoBarra(
  altura
) {

  const info =
    document.getElementById(
      "barra-info"
    );


  if (!info) {

    return;

  }


  if (
    altura >
    CONFIG.altura.calculoMaximo
  ) {

    info.textContent =
      "Acima de 3,20 m, o acabamento e o valor são definidos em orçamento personalizado.";


    return;

  }


  const regra =
    obterRegraBarra(
      altura
    );


  if (
    regra.acrescimo
  ) {

    info.textContent =
      `Para ${altura
        .toFixed(2)
        .replace(".", ",")} m de altura, a cortina será produzida com barra larga de 20 cm.`;

  } else {

    info.textContent =
      `Para ${altura
        .toFixed(2)
        .replace(".", ",")} m de altura, a cortina será produzida com barra de ${regra.tamanho} cm.`;

  }

}


// ============================================================
// RESUMO
// ============================================================

function atualizarResumoBasico(
  dados,
  resultado
) {

  const sumModelo =
    document.getElementById(
      "sum-modelo"
    );


  const sumTecido =
    document.getElementById(
      "sum-tecido"
    );


  const sumCor =
    document.getElementById(
      "sum-cor"
    );


  const sumForro =
    document.getElementById(
      "sum-forro"
    );


  const sumMedidas =
    document.getElementById(
      "sum-medidas"
    );


  const sumFranz =
    document.getElementById(
      "sum-franz"
    );


  const sumTrilho =
    document.getElementById(
      "sum-trilho"
    );


  const sumBarra =
    document.getElementById(
      "sum-barra"
    );


  if (sumModelo) {

    sumModelo.textContent =
      dados.modelo;

  }


  if (sumTecido) {

    sumTecido.textContent =
      dados.tecido;

  }


  if (sumCor) {

    sumCor.textContent =
      dados.cor;

  }


  if (sumForro) {

    sumForro.textContent =
      dados.forro;

  }


  const largura =
    Number(
      dados.largura
    ) ||
    0;


  const altura =
    Number(
      dados.altura
    ) ||
    0;


  const franzimento =
    Number(
      dados.franzimento
    ) ||
    1;


  const consumoTecido =
    largura *
    franzimento;


  if (sumMedidas) {

    sumMedidas.textContent =
      consumoTecido
        .toFixed(2)
        .replace(
          ".",
          ","
        ) +
      " × " +
      altura
        .toFixed(2)
        .replace(
          ".",
          ","
        ) +
      " m";

  }


  if (sumFranz) {

    sumFranz.textContent =
      String(
        dados.franzimento
      )
        .replace(
          ".",
          ","
        ) +
      "x";

  }


  if (sumTrilho) {

    if (
      !dados.trilho
    ) {

      sumTrilho.textContent =
        "Selecione uma opção";

    } else if (
      dados.trilho ===
      "Não"
    ) {

      sumTrilho.textContent =
        "Não incluso";

    } else {

      sumTrilho.textContent =
        dados.trilho;

    }

  }


  const barraResumo =
    document.getElementById(
      "barra-resumo"
    );


  if (
    resultado &&
    !resultado.sobConsulta &&
    resultado.barra
  ) {

    if (sumBarra) {

      sumBarra.textContent =
        resultado.barra +
        " cm";

    }


    if (barraResumo) {

      barraResumo.textContent =
        resultado.acrescimoAltura
          ? "Barra larga de 20 cm para esta altura."
          : "Barra definida automaticamente conforme a altura.";

    }

  } else {

    if (sumBarra) {

      sumBarra.textContent =
        "Sob consulta";

    }


    if (barraResumo) {

      barraResumo.textContent =
        "O acabamento será confirmado no orçamento personalizado.";

    }

  }

}


// ============================================================
// VALORES SEPARADOS
// ============================================================

function atualizarResumoValores(
  dados,
  resultado
) {

  const precoCortina =
    document.getElementById(
      "preco-cortina"
    );


  const linhaPrecoTrilho =
    document.getElementById(
      "linha-preco-trilho"
    );


  const nomePrecoTrilho =
    document.getElementById(
      "nome-preco-trilho"
    );


  const precoTrilho =
    document.getElementById(
      "preco-trilho"
    );


  if (precoCortina) {

    precoCortina.textContent =
      typeof resultado.valorCortina ===
      "number"
        ? brl(
            resultado.valorCortina
          )
        : "Sob consulta";

  }


  if (
    !dados.trilho ||
    dados.trilho ===
      "Não"
  ) {

    if (
      linhaPrecoTrilho
    ) {

      linhaPrecoTrilho.style.display =
        "none";

    }


    return;

  }


  if (
    linhaPrecoTrilho
  ) {

    linhaPrecoTrilho.style.display =
      "flex";

  }


  if (
    nomePrecoTrilho
  ) {

    nomePrecoTrilho.textContent =
      dados.trilho;

  }


  if (
    precoTrilho
  ) {

    precoTrilho.textContent =
      brl(
        resultado.valorTrilho
      );

  }

}


// ============================================================
// ORÇAMENTO
// ============================================================

function atualizarOrcamento() {

  const dados =
    dadosAtuais();


  const altura =
    Number(
      dados.altura
    ) ||
    0;


  atualizarInfoBarra(
    altura
  );


  const resultado =
    calcularOrcamento(
      dados
    );


  const preco =
    document.getElementById(
      "preco"
    );


  const parcelas =
    document.getElementById(
      "parcelas"
    );


  const comprar =
    document.getElementById(
      "comprar"
    );


  atualizarResumoBasico(
    dados,
    resultado
  );


  if (!preco) {

    return;

  }


  preco.classList.remove(
    "sob-consulta"
  );


  // ==========================================================
  // ERRO
  // ==========================================================

  if (
    resultado.erro
  ) {

    preco.textContent =
      "Indisponível";


    if (parcelas) {

      parcelas.textContent =
        resultado.mensagem;

    }


    if (comprar) {

      comprar.textContent =
        "Adicionar ao carrinho";

    }


    window.currentTotal =
      null;


    window.currentValorCortina =
      null;


    window.currentValorTrilho =
      null;


    window.currentSobConsulta =
      false;


    window.currentBarra =
      null;


    return;

  }


  // ==========================================================
  // SOB CONSULTA
  // ==========================================================

  if (
    resultado.sobConsulta
  ) {

    preco.textContent =
      "Sob consulta";


    preco.classList.add(
      "sob-consulta"
    );


    if (parcelas) {

      parcelas.textContent =
        resultado.mensagem;

    }


    if (comprar) {

      comprar.textContent =
        CONFIG.altura.acimaMaximo?.textoBotao || "Solicitar orçamento";

    }


    window.currentTotal =
      null;


    window.currentValorCortina =
      null;


    window.currentValorTrilho =
      null;


    window.currentSobConsulta =
      true;


    window.currentBarra =
      null;


    return;

  }


  // ==========================================================
  // VALORES
  // ==========================================================

  atualizarResumoValores(
    dados,
    resultado
  );


  preco.textContent =
    brl(
      resultado.total
    );


  if (parcelas) {

    parcelas.textContent =
      "ou " +
      CONFIG.parcelas +
      "x de " +
      brl(
        resultado.total /
        CONFIG.parcelas
      ) +
      " sem juros";

  }


  if (comprar) {

    comprar.textContent =
      "Adicionar ao carrinho";

  }


  window.currentValorCortina =
    resultado.valorCortina;


  window.currentValorTrilho =
    resultado.valorTrilho;


  window.currentTotal =
    resultado.total;


  window.currentSobConsulta =
    false;


  window.currentBarra =
    resultado.barra;

}


// ============================================================
// WHATSAPP
// ============================================================

function mensagemWhatsApp() {

  const dados =
    dadosAtuais();


  const largura =
    Number(
      dados.largura
    ) ||
    0;


  const franzimento =
    Number(
      dados.franzimento
    ) ||
    1;


  const consumoTecido =
    largura *
    franzimento;


  const valorCortina =
    typeof window.currentValorCortina ===
    "number"
      ? brl(
          window.currentValorCortina
        )
      : "Sob consulta";


  let trilhoTexto =
    "Não selecionado";


  if (
    dados.trilho ===
    "Não"
  ) {

    trilhoTexto =
      "Não incluso";

  } else if (
    dados.trilho
  ) {

    trilhoTexto =
      dados.trilho;


    if (
      typeof window.currentValorTrilho ===
      "number"
    ) {

      trilhoTexto +=
        " - " +
        brl(
          window.currentValorTrilho
        );

    }

  }


  const total =
    typeof window.currentTotal ===
    "number"
      ? brl(
          window.currentTotal
        )
      : "Sob consulta";


  return `Olá! Montei uma cortina no site:

Modelo: ${dados.modelo}
Tecido: ${dados.tecido}
Cor: ${dados.cor}
Forro: ${dados.forro}
Ambiente: ${dados.largura} m x ${dados.altura} m
Consumo de tecido: ${consumoTecido
    .toFixed(2)
    .replace(".", ",")} m x ${dados.altura} m
Franzimento: ${dados.franzimento}x
Barra: ${
  window.currentBarra
    ? window.currentBarra + " cm"
    : "Sob consulta"
}

Cortina: ${valorCortina}
Trilho / Varão: ${trilhoTexto}

Total: ${total}

Gostaria de confirmar este orçamento.`;

}


// ============================================================
// ABRIR WHATSAPP
// ============================================================

function abrirWhatsApp() {

  const numero =
    String(
      CONFIG.whatsapp ||
      ""
    ).replace(
      /\D/g,
      ""
    );


  const texto =
    encodeURIComponent(
      mensagemWhatsApp()
    );


  const url =
    numero
      ? `https://wa.me/${numero}?text=${texto}`
      : `https://wa.me/?text=${texto}`;


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}


// ============================================================
// VERIFICAR SE O CORE DO CARRINHO ESTÁ CARREGADO
// ============================================================

function carrinhoCoreDisponivel() {

  return Boolean(
    window.SalvatexCarrinho &&
    typeof window.SalvatexCarrinho.criarItem ===
      "function" &&
    typeof window.SalvatexCarrinho.adicionarItens ===
      "function"
  );

}


// ============================================================
// CONTADOR DO CARRINHO
// ============================================================

function atualizarContadorCarrinho() {

  const contador =
    document.getElementById(
      "contador-carrinho"
    );


  if (!contador) {

    return;

  }


  try {

    let quantidade = 0;


    // ========================================================
    // NOVA ESTRUTURA
    // ========================================================

    if (
      carrinhoCoreDisponivel() &&
      typeof SalvatexCarrinho.obterQuantidade ===
        "function"
    ) {

      quantidade =
        SalvatexCarrinho
          .obterQuantidade();

    } else {

      // ======================================================
      // FALLBACK
      //
      // Mantém contador funcionando mesmo se o core
      // ainda não estiver carregado.
      // ======================================================

      const dados =
        localStorage.getItem(
          "salvatexCarrinho"
        );


      const carrinho =
        dados
          ? JSON.parse(
              dados
            )
          : [];


      quantidade =
        Array.isArray(
          carrinho
        )
          ? carrinho.reduce(
              (
                total,
                item
              ) => {

                return (
                  total +
                  Number(
                    item.quantidade ||
                    1
                  )
                );

              },
              0
            )
          : 0;

    }


    contador.textContent =
      quantidade;


    contador.style.display =
      quantidade > 0
        ? "flex"
        : "none";


    contador.setAttribute(
      "aria-label",
      quantidade === 1
        ? "1 item no carrinho"
        : quantidade +
          " itens no carrinho"
    );


  } catch (erro) {

    console.error(
      "Erro ao atualizar contador do carrinho:",
      erro
    );


    contador.textContent =
      "0";


    contador.style.display =
      "none";

  }

}


// ============================================================
// ADICIONAR AO CARRINHO
//
// NOVA ESTRUTURA GENÉRICA V2
//
// Qualquer produto possui:
//
// categoria
// nome
// quantidade
// valorUnitario
// total
// detalhes
// dados
//
// Isso permite adicionar no futuro:
//
// cortina
// trilho
// persiana
// acessorio
// instalação
// etc.
// ============================================================

function adicionarAoCarrinho() {

  if (
    !carrinhoCoreDisponivel()
  ) {

    console.error(
      "carrinho-core.js não foi carregado."
    );


    alert(
      "Não foi possível carregar o carrinho. Atualize a página e tente novamente."
    );


    return;

  }


  const dados =
    dadosAtuais();


  // ==========================================================
  // COR
  // ==========================================================

  if (!dados.cor) {

    alert(
      "Selecione a cor da cortina."
    );


    return;

  }


  // ==========================================================
  // TRILHO / VARÃO
  // ==========================================================

  if (!dados.trilho) {

    alert(
      "Selecione uma opção de trilho/varão ou escolha Não."
    );


    const select =
      document.getElementById(
        "trilho-select"
      );


    if (select) {

      select.focus();


      select.scrollIntoView({
        behavior:
          "smooth",

        block:
          "center"
      });

    }


    return;

  }


  // ==========================================================
  // SOB CONSULTA
  // ==========================================================

  if (
    window.currentSobConsulta
  ) {

    alert(
      "Esta configuração precisa de orçamento personalizado."
    );


    return;

  }


  // ==========================================================
  // VALOR DA CORTINA
  // ==========================================================

  if (
    typeof window.currentValorCortina !==
    "number"
  ) {

    alert(
      "Não foi possível calcular esta cortina."
    );


    return;

  }


  const largura =
    Number(
      dados.largura
    ) ||
    0;


  const altura =
    Number(
      dados.altura
    ) ||
    0;


  const franzimento =
    Number(
      dados.franzimento
    ) ||
    1;


  const consumoTecido =
    largura *
    franzimento;


  // ==========================================================
  // FOTO DO ITEM
  // ==========================================================

  const fotoAtual =
    obterFotoAtual();


  const imagemProduto =
    fotoAtual
      ? fotoAtual.src
      : "";


  // ==========================================================
  // GRUPO DA CONFIGURAÇÃO
  //
  // Cortina e trilho ficam relacionados pelo mesmo grupoId.
  // ==========================================================

  const grupoId =
    SalvatexCarrinho
      .criarId(
        "config"
      );


  // ==========================================================
  // CORTINA
  // ==========================================================

  const itemCortina =
    SalvatexCarrinho
      .criarItem({

        grupoId:
          grupoId,

        categoria:
          "cortina",

        tipoVenda:
          "sob_medida",

        configurador:
          "cortina",

        sku:
          "CORTINA-" +
          String(dados.modelo || "MODELO")
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "-"),

        nome:
          "Cortina " +
          dados.modelo +
          " sob medida",

        imagem:
          imagemProduto,

        quantidade:
          1,

        valorUnitario:
          Number(
            window.currentValorCortina
          ),

        total:
          Number(
            window.currentValorCortina
          ),

        detalhes: [

          {
            rotulo:
              "Modelo",

            valor:
              dados.modelo
          },

          {
            rotulo:
              "Tecido",

            valor:
              dados.tecido
          },

          {
            rotulo:
              "Cor",

            valor:
              dados.cor
          },

          {
            rotulo:
              "Forro",

            valor:
              dados.forro
          },

          {
            rotulo:
              "Ambiente",

            valor:
              largura
                .toFixed(2)
                .replace(
                  ".",
                  ","
                ) +
              " × " +
              altura
                .toFixed(2)
                .replace(
                  ".",
                  ","
                ) +
              " m"
          },

          {
            rotulo:
              "Consumo de tecido",

            valor:
              consumoTecido
                .toFixed(2)
                .replace(
                  ".",
                  ","
                ) +
              " × " +
              altura
                .toFixed(2)
                .replace(
                  ".",
                  ","
                ) +
              " m"
          },

          {
            rotulo:
              "Franzimento",

            valor:
              String(
                franzimento
              )
                .replace(
                  ".",
                  ","
                ) +
              "x"
          },

          {
            rotulo:
              "Barra",

            valor:
              window.currentBarra
                ? window.currentBarra +
                  " cm"
                : "Sob consulta"
          }

        ],

        dados: {

          modelo:
            dados.modelo,

          tecido:
            dados.tecido,

          cor:
            dados.cor,

          forro:
            dados.forro,

          larguraAmbiente:
            largura,

          altura:
            altura,

          franzimento:
            franzimento,

          consumoTecido:
            consumoTecido,

          barra:
            window.currentBarra

        }

      });


  const itensParaAdicionar = [
    itemCortina
  ];


  // ==========================================================
  // TRILHO / VARÃO
  //
  // Continua sendo um produto separado.
  // ==========================================================

  if (
    dados.trilho !==
    "Não"
  ) {

    if (
      typeof window.currentValorTrilho !==
      "number"
    ) {

      alert(
        "Não foi possível calcular o trilho/varão selecionado."
      );


      return;

    }


    const itemTrilho =
      SalvatexCarrinho
        .criarItem({

          grupoId:
            grupoId,

          categoria:
            "trilho",

          tipoVenda:
            "sob_medida",

          configurador:
            "complemento_cortina",

          sku:
            "TRILHO-" +
            String(dados.trilho || "MODELO")
              .toUpperCase()
              .replace(/[^A-Z0-9]+/g, "-"),

          nome:
            dados.trilho,

          quantidade:
            1,

          valorUnitario:
            Number(
              window.currentValorTrilho
            ),

          total:
            Number(
              window.currentValorTrilho
            ),

          detalhes: [

            {
              rotulo:
                "Medida",

              valor:
                largura
                  .toFixed(2)
                  .replace(
                    ".",
                    ","
                  ) +
                " m"
            }

          ],

          dados: {

            largura:
              largura,

            modelo:
              dados.trilho

          }

        });


    itensParaAdicionar.push(
      itemTrilho
    );

  }


  // ==========================================================
  // ADICIONA TODOS DE UMA VEZ
  //
  // Isso evita salvar a cortina se ocorrer algum erro
  // antes da criação do trilho.
  // ==========================================================

  try {

    SalvatexCarrinho
      .adicionarItens(
        itensParaAdicionar
      );


  } catch (erro) {

    console.error(
      "Erro ao adicionar ao carrinho:",
      erro
    );


    alert(
      "Não foi possível adicionar o produto ao carrinho."
    );


    return;

  }


  // ==========================================================
  // ATUALIZA CONTADOR
  // ==========================================================

  atualizarContadorCarrinho();


  // ==========================================================
  // ABRE CARRINHO
  // ==========================================================

  window.location.href =
    "carrinho.html";

}


// ============================================================
// EVENTOS DOS CARDS
// ============================================================

bindCards(
  "modelos",
  "modelo"
);


bindCards(
  "tecidos-choice",
  "tecido"
);


bindCards(
  "forros",
  "forro"
);


// ============================================================
// TRILHO
// ============================================================

const trilhoSelect =
  document.getElementById(
    "trilho-select"
  );


if (trilhoSelect) {

  trilhoSelect.addEventListener(
    "change",
    () => {

      state.trilho =
        trilhoSelect.value;


      atualizarOrcamento();

    }
  );

}


// ============================================================
// CAMPOS
// ============================================================

[
  "largura",
  "altura",
  "franzimento"
].forEach(
  (id) => {

    const elemento =
      document.getElementById(
        id
      );


    if (!elemento) {

      return;

    }


    elemento.addEventListener(
      "input",
      atualizarOrcamento
    );


    elemento.addEventListener(
      "change",
      atualizarOrcamento
    );

  }
);


// ============================================================
// RECALCULAR
// ============================================================

const botaoRecalcular =
  document.getElementById(
    "recalcular"
  );


if (botaoRecalcular) {

  botaoRecalcular.addEventListener(
    "click",
    () => {

      atualizarOrcamento();


      const toast =
        document.getElementById(
          "toast"
        );


      if (toast) {

        toast.classList.add(
          "show"
        );


        setTimeout(
          () => {

            toast.classList.remove(
              "show"
            );

          },
          1800
        );

      }

    }
  );

}


// ============================================================
// BOTÕES
// ============================================================

const botaoWhatsapp =
  document.getElementById(
    "whatsapp"
  );


const botaoComprar =
  document.getElementById(
    "comprar"
  );


if (botaoWhatsapp) {

  botaoWhatsapp.addEventListener(
    "click",
    abrirWhatsApp
  );

}


if (botaoComprar) {

  botaoComprar.addEventListener(
    "click",
    adicionarAoCarrinho
  );

}


// ============================================================
// CARROSSEL
// ============================================================

const previewPrev =
  document.getElementById(
    "preview-prev"
  );


const previewNext =
  document.getElementById(
    "preview-next"
  );


if (previewPrev) {

  previewPrev.addEventListener(
    "click",
    () =>
      mudarPreview(
        -1
      )
  );

}


if (previewNext) {

  previewNext.addEventListener(
    "click",
    () =>
      mudarPreview(
        1
      )
  );

}


// ============================================================
// ZOOM
// ============================================================

const previewImg =
  document.getElementById(
    "preview-img"
  );


const previewZoom =
  document.getElementById(
    "preview-zoom"
  );


const zoomFechar =
  document.getElementById(
    "zoom-foto-fechar"
  );


const zoomFundo =
  document.getElementById(
    "zoom-foto-fundo"
  );


const zoomPrev =
  document.getElementById(
    "zoom-prev"
  );


const zoomNext =
  document.getElementById(
    "zoom-next"
  );


if (previewImg) {

  previewImg.addEventListener(
    "click",
    abrirZoomPreview
  );

}


if (previewZoom) {

  previewZoom.addEventListener(
    "click",
    abrirZoomPreview
  );

}


if (zoomFechar) {

  zoomFechar.addEventListener(
    "click",
    fecharZoomPreview
  );

}


if (zoomFundo) {

  zoomFundo.addEventListener(
    "click",
    fecharZoomPreview
  );

}


if (zoomPrev) {

  zoomPrev.addEventListener(
    "click",
    () =>
      mudarFotoZoom(
        -1
      )
  );

}


if (zoomNext) {

  zoomNext.addEventListener(
    "click",
    () =>
      mudarFotoZoom(
        1
      )
  );

}


// ============================================================
// MODAL CONHECER TECIDO
// ============================================================

const botaoConhecerCor =
  document.getElementById(
    "conhecer-cor"
  );


const modalCorFechar =
  document.getElementById(
    "modal-cor-fechar"
  );


const modalCorFundo =
  document.getElementById(
    "modal-cor-fundo"
  );


if (botaoConhecerCor) {

  botaoConhecerCor.addEventListener(
    "click",
    abrirGaleriaCor
  );

}


if (modalCorFechar) {

  modalCorFechar.addEventListener(
    "click",
    fecharGaleriaCor
  );

}


if (modalCorFundo) {

  modalCorFundo.addEventListener(
    "click",
    fecharGaleriaCor
  );

}


// ============================================================
// ESC
// ============================================================

document.addEventListener(
  "keydown",
  (evento) => {

    if (
      evento.key !==
      "Escape"
    ) {

      return;

    }


    fecharGaleriaCor();


    fecharZoomPreview();


    fecharVideoProduto();

  }
);


// ============================================================
// CARRINHO ALTERADO EM OUTRA ABA
// ============================================================

window.addEventListener(
  "storage",
  (evento) => {

    if (
      evento.key ===
      "salvatexCarrinho"
    ) {

      atualizarContadorCarrinho();

    }

  }
);


// ============================================================
// QUANDO VOLTA PARA ESTA PÁGINA
// ============================================================

window.addEventListener(
  "pageshow",
  () => {

    atualizarContadorCarrinho();

  }
);


// ============================================================
// OPÇÕES DO CONFIGURADOR VINDAS DO PAINEL ADMIN
// ============================================================

function atualizarForrosDinamicos() {
  const container = document.getElementById("forros");
  if (!container) return;
  const forros = Object.keys(CONFIG.precos?.[state.tecido] || {});
  if (!forros.length) return;
  if (!forros.includes(state.forro)) state.forro = forros[0];
  container.innerHTML = "";
  forros.forEach((nome) => {
    const card = document.createElement("div");
    card.className = "card" + (state.forro === nome ? " selected" : "");
    card.dataset.value = nome;
    card.innerHTML = `<strong>${nome}</strong><span>Opção configurada no painel administrativo.</span>`;
    container.appendChild(card);
  });
  bindCards("forros", "forro");
}

function montarOpcoesConfiguradorWave() {
  const tecidos = Object.keys(CONFIG.precos || {});
  const tecidosContainer = document.getElementById("tecidos-choice");
  if (tecidosContainer && tecidos.length) {
    if (!tecidos.includes(state.tecido)) state.tecido = tecidos[0];
    tecidosContainer.innerHTML = "";
    tecidos.forEach((nome) => {
      const card = document.createElement("div");
      card.className = "card" + (state.tecido === nome ? " selected" : "");
      card.dataset.value = nome;
      card.innerHTML = `<strong>${nome}</strong><span>Tecido disponível para este configurador.</span>`;
      tecidosContainer.appendChild(card);
    });
    bindCards("tecidos-choice", "tecido");
  }

  atualizarForrosDinamicos();

  const franz = document.getElementById("franzimento");
  if (franz && Array.isArray(CONFIG.franzimentos) && CONFIG.franzimentos.length) {
    const atual = String(franz.value || CONFIG.franzimentos[0].valor);
    franz.innerHTML = CONFIG.franzimentos.map((item) =>
      `<option value="${item.valor}" ${String(item.valor) === atual ? "selected" : ""}>${item.rotulo || item.valor + "x"}</option>`
    ).join("");
  }

  const trilho = document.getElementById("trilho-select");
  if (trilho) {
    const atual = trilho.value;
    trilho.innerHTML = `<option value="" disabled>Selecione...</option><option value="Não">Não quero trilho ou varão</option>` +
      Object.keys(CONFIG.instalacao || {}).map((nome) => `<option value="${nome}">${nome}</option>`).join("");
    trilho.value = Object.prototype.hasOwnProperty.call(CONFIG.instalacao || {}, atual) || atual === "Não" ? atual : "";
    state.trilho = trilho.value;
  }

  const altura = document.getElementById("altura");
  if (altura) {
    altura.max = String(CONFIG.altura.alturaEntradaMaxima || Math.max(5, CONFIG.altura.calculoMaximo || 3.2));
  }

  const ajudaAltura = document.querySelector('label[for="altura"]')?.closest('.field')?.querySelector('.field-help');
  if (ajudaAltura) {
    ajudaAltura.textContent = `Acima de ${Number(CONFIG.altura.calculoMaximo || 3.2).toFixed(2).replace('.', ',')} m: orçamento sob consulta.`;
  }
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function iniciarAplicacaoSalvatex() {

  if (window.CONFIG_READY) {

    try {

      await window.CONFIG_READY;

    } catch (erro) {

      console.warn(
        "Não foi possível carregar a configuração remota.",
        erro
      );

    }

  }


  montarOpcoesConfiguradorWave();

  criarBotaoVideo();

  criarModalVideo();

  atualizarCores();

  atualizarOrcamento();

  carregarFotosCarrossel();

  atualizarContadorCarrinho();

}


iniciarAplicacaoSalvatex();
