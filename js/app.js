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
// FOTOS DO CARROSSEL
// TODAS AS FOTOS EM PNG
// ============================================================

const FOTOS_CARROSSEL = {

  "Gaze de Linho": {

    "Branco": [
      "imagens/galeria/gaze/branco/foto-1.png",
      "imagens/galeria/gaze/branco/foto-2.png",
      "imagens/galeria/gaze/branco/foto-3.png"
    ],

    "Bege": [
      "imagens/galeria/gaze/bege/foto-1.png",
      "imagens/galeria/gaze/bege/foto-2.png",
      "imagens/galeria/gaze/bege/foto-3.png",
      "imagens/galeria/gaze/bege/foto-4.png"
    ],

    "Cinza": [
      "imagens/galeria/gaze/cinza/foto-1.png",
      "imagens/galeria/gaze/cinza/foto-2.png",
      "imagens/galeria/gaze/cinza/foto-3.png",
      "imagens/galeria/gaze/cinza/foto-4.png",
      "imagens/galeria/gaze/cinza/foto-5.png"
    ],

    "Off White": [
      "imagens/galeria/gaze/offwhite/foto-1.png",
      "imagens/galeria/gaze/offwhite/foto-2.png",
      "imagens/galeria/gaze/offwhite/foto-3.png",
      "imagens/galeria/gaze/offwhite/foto-4.png"
    ],

    "Natural": [
      "imagens/galeria/gaze/natural/foto-1.png",
      "imagens/galeria/gaze/natural/foto-2.png",
      "imagens/galeria/gaze/natural/foto-3.png",
      "imagens/galeria/gaze/natural/foto-4.png"
    ]

  },


  "Linho Damasco": {

    "Natural": [
      "imagens/galeria/damasco/natural/foto-1.png",
      "imagens/galeria/damasco/natural/foto-2.png",
      "imagens/galeria/damasco/natural/foto-3.png"
    ],

    "Branco": [
      "imagens/galeria/damasco/branco/foto-1.png",
      "imagens/galeria/damasco/branco/foto-2.png",
      "imagens/galeria/damasco/branco/foto-3.png",
      "imagens/galeria/damasco/branco/foto-4.png"
    ],

    "Bege": [
      "imagens/galeria/damasco/bege/foto-1.png",
      "imagens/galeria/damasco/bege/foto-2.png",
      "imagens/galeria/damasco/bege/foto-3.png",
      "imagens/galeria/damasco/bege/foto-4.png"
    ],

    "Off White": [
      "imagens/galeria/damasco/offwhite/foto-1.png",
      "imagens/galeria/damasco/offwhite/foto-2.png",
      "imagens/galeria/damasco/offwhite/foto-3.png",
      "imagens/galeria/damasco/offwhite/foto-4.png"
    ],

    "Grafite": [
      "imagens/galeria/damasco/grafite/foto-1.png",
      "imagens/galeria/damasco/grafite/foto-2.png"
    ]

  }

};


let previewIndex = 0;


// ============================================================
// GALERIAS DAS CORES
// ============================================================

const GALERIAS_CORES = {

  "Gaze de Linho": {

    "Branco": [
      {
        src: "imagens/capas/gaze-branco-capa.png",
        legenda: "Visão geral"
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
// MONTA TODAS AS FOTOS DO TECIDO
// ============================================================

function obterFotosCarrossel() {

  const tecido =
    FOTOS_CARROSSEL?.[state.tecido] || {};

  const fotos = [];


  Object.entries(tecido).forEach(
    ([cor, imagens]) => {

      imagens.forEach((src) => {

        fotos.push({
          src,
          cor
        });

      });

    }
  );


  return fotos;

}


// ============================================================
// FOTO ATUAL
// ============================================================

function obterFotoAtual() {

  const fotos =
    obterFotosCarrossel();


  if (!fotos.length) {
    return null;
  }


  if (
    previewIndex < 0 ||
    previewIndex >= fotos.length
  ) {

    previewIndex = 0;

  }


  return fotos[previewIndex];

}


// ============================================================
// FORMATAÇÃO DE VALOR
// ============================================================

function brl(valor) {

  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );

}


// ============================================================
// PEGA VALOR DO CAMPO
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

    modelo: state.modelo,

    tecido: state.tecido,

    cor: state.cor,

    forro: state.forro,

    trilho: state.trilho,

    largura: val("largura"),

    altura: val("altura"),

    franzimento: val("franzimento")

  };

}


// ============================================================
// CARDS
// ============================================================

function bindCards(groupId, key) {

  document
    .querySelectorAll("#" + groupId + " .card")
    .forEach((el) => {

      el.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll("#" + groupId + " .card")
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


          if (key === "tecido") {

            atualizarCores();

            previewIndex = 0;

          }


          atualizarOrcamento();

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
    CONFIG.cores?.[state.tecido] || [];


  if (
    !cores.includes(
      state.cor
    )
  ) {

    state.cor =
      cores.length
        ? cores[0]
        : "";

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


    const fotos =
      GALERIAS_CORES?.[state.tecido]?.[cor] || [];


    if (fotos.length) {

      const imagem =
        document.createElement(
          "img"
        );


      imagem.className =
        "card-cor-img";


      imagem.src =
        fotos[0].src;


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
      () => {

        container
          .querySelectorAll(".card")
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


  const fotos =
    obterFotosCarrossel();


  if (!fotos.length) {

    const capa =
      GALERIAS_CORES?.[state.tecido]?.[state.cor]?.[0]?.src;


    if (capa) {

      img.src =
        capa;

      img.alt =
        `${state.tecido} ${state.cor}`;

    }


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


  img.src =
    fotoAtual.src;


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
      fotos.length <= 1
    );

  }


  if (dots) {

    dots.innerHTML =
      "";


    fotos.forEach(
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
            indice === previewIndex
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

}


// ============================================================
// PASSAR FOTO
// ============================================================

function mudarPreview(direcao) {

  const fotos =
    obterFotosCarrossel();


  if (!fotos.length) {
    return;
  }


  previewIndex +=
    direcao;


  if (previewIndex < 0) {

    previewIndex =
      fotos.length - 1;

  }


  if (
    previewIndex >=
    fotos.length
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

    const capa =
      GALERIAS_CORES?.[state.tecido]?.[state.cor]?.[0]?.src;


    if (capa) {

      imagemGrande.src =
        capa;


      imagemGrande.alt =
        `${state.tecido} ${state.cor}`;

    }


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
    fotoAtual.src;


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

function mudarFotoZoom(direcao) {

  const fotos =
    obterFotosCarrossel();


  if (!fotos.length) {
    return;
  }


  previewIndex +=
    direcao;


  if (previewIndex < 0) {

    previewIndex =
      fotos.length - 1;

  }


  if (
    previewIndex >=
    fotos.length
  ) {

    previewIndex =
      0;

  }


  atualizarImagemZoom();


  atualizarPreview();

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
    GALERIAS_CORES?.[state.tecido]?.[state.cor] || [];


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

function atualizarInfoBarra(altura) {

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


  if (regra.acrescimo) {

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
// RESUMO BÁSICO
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
      dados.cor || "Selecione";

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


  // ==========================================================
  // CONSUMO DE TECIDO
  // ==========================================================

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
      )
        .replace(".", ",") +
      "x";

  }


  if (sumTrilho) {

    if (!dados.trilho) {

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
// RESUMO DOS VALORES
//
// Estes elementos serão adicionados no index.html:
//
// preco-cortina
// linha-preco-trilho
// preco-trilho
// preco = TOTAL
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


  // ==========================================================
  // CORTINA
  // ==========================================================

  if (precoCortina) {

    if (
      typeof resultado.valorCortina ===
      "number"
    ) {

      precoCortina.textContent =
        brl(
          resultado.valorCortina
        );

    } else {

      precoCortina.textContent =
        "Sob consulta";

    }

  }


  // ==========================================================
  // TRILHO / VARÃO
  // ==========================================================

  if (
    !dados.trilho ||
    dados.trilho === "Não"
  ) {

    if (linhaPrecoTrilho) {

      linhaPrecoTrilho.style.display =
        "none";

    }

  } else {

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

}


// ============================================================
// ORÇAMENTO
// ============================================================

function atualizarOrcamento() {

  const dados =
    dadosAtuais();


  atualizarPreview();


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


  // ==========================================================
  // ERRO
  // ==========================================================

  if (resultado.erro) {

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


  // ==========================================================
  // SOB CONSULTA
  // ==========================================================

  if (resultado.sobConsulta) {

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

    window.currentAcrescimoAltura =
      false;


    return;

  }


  // ==========================================================
  // VALORES SEPARADOS
  // ==========================================================

  atualizarResumoValores(
    dados,
    resultado
  );


  // ==========================================================
  // TOTAL GERAL
  // ==========================================================

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
      "Solicitar fechamento";

  }


  // ==========================================================
  // SALVA VALORES ATUAIS
  // ==========================================================

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


  window.currentAcrescimoAltura =
    resultado.acrescimoAltura;

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


  let barraTexto =
    "Sob consulta";


  if (
    window.currentBarra
  ) {

    barraTexto =
      `${window.currentBarra} cm`;

  }


  let valorCortina =
    "Sob consulta";


  if (
    typeof window.currentValorCortina ===
    "number"
  ) {

    valorCortina =
      brl(
        window.currentValorCortina
      );

  }


  let trilhoTexto =
    "Não selecionado";


  let valorTrilhoTexto =
    "";


  if (
    dados.trilho === "Não"
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

      valorTrilhoTexto =
        ` - ${brl(
          window.currentValorTrilho
        )}`;

    }

  }


  let total =
    "Sob consulta";


  if (
    typeof window.currentTotal ===
    "number"
  ) {

    total =
      brl(
        window.currentTotal
      );

  }


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
Barra: ${barraTexto}

Cortina: ${valorCortina}
Trilho / Varão: ${trilhoTexto}${valorTrilhoTexto}

Total: ${total}

Gostaria de confirmar este orçamento.`;

}


// ============================================================
// ABRIR WHATSAPP
// ============================================================

function abrirWhatsApp() {

  const numero =
    String(
      CONFIG.whatsapp || ""
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
// SELETOR DE TRILHO / VARÃO
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
// CORES INICIAIS
// ============================================================

atualizarCores();


// ============================================================
// CAMPOS DE MEDIDA
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
// BOTÃO ATUALIZAR
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
// WHATSAPP
// ============================================================

const botaoWhatsapp =
  document.getElementById(
    "whatsapp"
  );


if (botaoWhatsapp) {

  botaoWhatsapp.addEventListener(
    "click",
    abrirWhatsApp
  );

}


const botaoComprar =
  document.getElementById(
    "comprar"
  );


if (botaoComprar) {

  botaoComprar.addEventListener(
    "click",
    abrirWhatsApp
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
    () => mudarPreview(-1)
  );

}


if (previewNext) {

  previewNext.addEventListener(
    "click",
    () => mudarPreview(1)
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
    () => mudarFotoZoom(-1)
  );

}


if (zoomNext) {

  zoomNext.addEventListener(
    "click",
    () => mudarFotoZoom(1)
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
// ESC FECHA MODAIS
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
// PRIMEIRO CÁLCULO
// ============================================================

atualizarOrcamento();
