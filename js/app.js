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
// MAPEAMENTO DAS PASTAS DE MÍDIA
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

    "Natural": [
      {
        src: "imagens/capas/damasco-natural-capa.png",
        legenda: "Linho Damasco Natural"
      }
    ],

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


// ============================================================
// CACHE
// ============================================================

function semCache(src) {

  if (!src) {
    return "";
  }

  const separador =
    src.includes("?")
      ? "&"
      : "?";

  return (
    src +
    separador +
    "v=" +
    Date.now()
  );

}


// ============================================================
// PASTA DA MÍDIA
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
// VERIFICA FOTO
// ============================================================

function verificarImagem(src) {

  return new Promise((resolve) => {

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

  });

}


// ============================================================
// CARREGA FOTOS
// ============================================================

async function carregarFotosCarrossel() {

  const token =
    ++tokenAtualizacaoGaleria;


  const cores =
    CONFIG.cores?.[
      state.tecido
    ] || [];


  const coresOrdenadas = [
    state.cor,
    ...cores.filter(
      (cor) =>
        cor !== state.cor
    )
  ];


  const candidatos = [];


  coresOrdenadas.forEach(
    (cor) => {

      for (
        let numero = 1;
        numero <= 10;
        numero++
      ) {

        candidatos.push({
          src:
            obterCaminhoFoto(
              state.tecido,
              state.modelo,
              cor,
              state.forro,
              numero
            ),
          cor
        });

      }

    }
  );


  const resultados =
    await Promise.all(
      candidatos.map(
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


  if (
    token !==
    tokenAtualizacaoGaleria
  ) {
    return;
  }


  fotosCarrosselAtuais =
    resultados.filter(Boolean);


  previewIndex = 0;


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


  return fotosCarrosselAtuais[
    previewIndex
  ];

}


// ============================================================
// PLACEHOLDER
// ============================================================

function gerarPlaceholder() {

  const svg =
    `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="900"
         height="700">

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
    encodeURIComponent(svg)
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
    document.getElementById(id);


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
      val("largura"),

    altura:
      val("altura"),

    franzimento:
      val("franzimento")
  };

}


// ============================================================
// CARDS
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
    .forEach((el) => {

      el.addEventListener(
        "click",
        async () => {

          document
            .querySelectorAll(
              "#" +
              groupId +
              " .card"
            )
            .forEach((card) => {

              card.classList.remove(
                "selected"
              );

            });


          el.classList.add(
            "selected"
          );


          state[key] =
            el.dataset.value;


          if (
            key === "tecido"
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

    });

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
      cores[0] || "";

  }


  container.innerHTML =
    "";


  cores.forEach((cor) => {

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
      GALERIAS_CORES?.[
        state.tecido
      ]?.[
        cor
      ]?.[0]?.src;


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
          .forEach((item) => {

            item.classList.remove(
              "selected"
            );

          });


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

  });

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


    return;

  }


  const fotoAtual =
    obterFotoAtual();


  if (!fotoAtual) {
    return;
  }


  img.onerror =
    null;


  img.src =
    semCache(
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
      fotosCarrosselAtuais.length <= 1
    );

  }


  if (dots) {

    dots.innerHTML =
      "";


    fotosCarrosselAtuais.forEach(
      (foto, indice) => {

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
    semCache(
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
// MUDAR FOTO NO ZOOM
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


  const fotos =
    GALERIAS_CORES?.[
      state.tecido
    ]?.[
      state.cor
    ] || [];


  tecido.textContent =
    state.tecido;


  titulo.textContent =
    state.cor;


  galeria.innerHTML =
    "";


  if (!fotos.length) {

    galeria.innerHTML =
      `<p style="color:#746c63;">
        Fotos desta cor serão adicionadas em breve.
      </p>`;

  } else {

    fotos.forEach((foto) => {

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


      if (foto.legenda) {

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

    });

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
    ) || 0;


  const altura =
    Number(
      dados.altura
    ) || 0;


  const franzimento =
    Number(
      dados.franzimento
    ) || 1;


  const consumoTecido =
    largura *
    franzimento;


  if (sumMedidas) {

    sumMedidas.textContent =
      consumoTecido
        .toFixed(2)
        .replace(".", ",") +
      " × " +
      altura
        .toFixed(2)
        .replace(".", ",") +
      " m";

  }


  if (sumFranz) {

    sumFranz.textContent =
      String(
        dados.franzimento
      ).replace(
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
      dados.trilho === "Não"
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

    if (linhaPrecoTrilho) {

      linhaPrecoTrilho.style.display =
        "none";

    }


    return;

  }


  if (linhaPrecoTrilho) {

    linhaPrecoTrilho.style.display =
      "flex";

  }


  if (nomePrecoTrilho) {

    nomePrecoTrilho.textContent =
      dados.trilho;

  }


  if (precoTrilho) {

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
    ) || 0;


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


  if (
    resultado.erro
  ) {

    preco.textContent =
      "Indisponível";


    if (parcelas) {

      parcelas.textContent =
        resultado.mensagem;

    }


    window.currentTotal =
      null;

    window.currentValorCortina =
      null;

    window.currentValorTrilho =
      null;

    window.currentSobConsulta =
      false;


    return;

  }


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
        "Solicitar orçamento";

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
    ) || 0;


  const franzimento =
    Number(
      dados.franzimento
    ) || 1;


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
// ADICIONAR AO CARRINHO
// ============================================================

function adicionarAoCarrinho() {

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
  // TRILHO / VARÃO É OBRIGATÓRIO ESCOLHER
  // INCLUSIVE A OPÇÃO "NÃO"
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
    ) || 0;


  const altura =
    Number(
      dados.altura
    ) || 0;


  const franzimento =
    Number(
      dados.franzimento
    ) || 1;


  const consumoTecido =
    largura *
    franzimento;


  // ==========================================================
  // FOTO DA CORTINA
  // ==========================================================

  const fotoAtual =
    obterFotoAtual();


  const imagemProduto =
    fotoAtual
      ? fotoAtual.src
      : "";


  // ==========================================================
  // GRUPO
  //
  // CORTINA E TRILHO FICAM VINCULADOS AO MESMO AMBIENTE
  // ==========================================================

  const grupoId =
    "config-" +
    Date.now();


  // ==========================================================
  // CARREGA CARRINHO EXISTENTE
  // ==========================================================

  let carrinho = [];


  try {

    const salvo =
      localStorage.getItem(
        "salvatexCarrinho"
      );


    if (salvo) {

      carrinho =
        JSON.parse(
          salvo
        );

    }


    if (
      !Array.isArray(
        carrinho
      )
    ) {

      carrinho = [];

    }

  } catch (erro) {

    carrinho = [];

  }


  // ==========================================================
  // ITEM 1 — CORTINA
  // ==========================================================

  const itemCortina = {

    id:
      grupoId +
      "-cortina",

    grupoId:
      grupoId,

    tipo:
      "cortina",

    produto:
      "Cortina sob medida",

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

    largura:
      largura,

    altura:
      altura,

    franzimento:
      franzimento,

    consumoTecido:
      consumoTecido,

    barra:
      window.currentBarra,

    imagem:
      imagemProduto,

    quantidade:
      1,

    valorUnitario:
      Number(
        window.currentValorCortina
      ),

    valorCortina:
      Number(
        window.currentValorCortina
      ),

    valorTrilho:
      0,

    trilho:
      "Não",

    total:
      Number(
        window.currentValorCortina
      )

  };


  carrinho.push(
    itemCortina
  );


  // ==========================================================
  // ITEM 2 — TRILHO / VARÃO
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


    const itemTrilho = {

      id:
        grupoId +
        "-trilho",

      grupoId:
        grupoId,

      tipo:
        "trilho",

      produto:
        dados.trilho,

      trilho:
        dados.trilho,

      largura:
        largura,

      quantidade:
        1,

      valorUnitario:
        Number(
          window.currentValorTrilho
        ),

      valorCortina:
        0,

      valorTrilho:
        Number(
          window.currentValorTrilho
        ),

      total:
        Number(
          window.currentValorTrilho
        )

    };


    carrinho.push(
      itemTrilho
    );

  }


  // ==========================================================
  // SALVA O CARRINHO
  // ==========================================================

  localStorage.setItem(
    "salvatexCarrinho",
    JSON.stringify(
      carrinho
    )
  );


  // ==========================================================
  // VAI PARA CARRINHO.HTML
  // ==========================================================

  window.location.href =
    "carrinho.html";

}


// ============================================================
// EVENTOS
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
// CORES
// ============================================================

atualizarCores();


// ============================================================
// CAMPOS
// ============================================================

[
  "largura",
  "altura",
  "franzimento"
].forEach((id) => {

  const elemento =
    document.getElementById(
      id
    );


  if (elemento) {

    elemento.addEventListener(
      "input",
      atualizarOrcamento
    );


    elemento.addEventListener(
      "change",
      atualizarOrcamento
    );

  }

});


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
      mudarPreview(-1)
  );

}


if (previewNext) {

  previewNext.addEventListener(
    "click",
    () =>
      mudarPreview(1)
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
      mudarFotoZoom(-1)
  );

}


if (zoomNext) {

  zoomNext.addEventListener(
    "click",
    () =>
      mudarFotoZoom(1)
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
      evento.key ===
      "Escape"
    ) {

      fecharGaleriaCor();

      fecharZoomPreview();

    }

  }
);


// ============================================================
// INICIALIZAÇÃO
// ============================================================

atualizarOrcamento();

carregarFotosCarrossel();
