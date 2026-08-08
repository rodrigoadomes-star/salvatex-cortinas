// ============================================================
// FUNCIONAMENTO DA PÁGINA
// ============================================================

const state = {
  modelo: "Wave",
  tecido: "Gaze de Linho",
  cor: "Branco",
  forro: "Forro leve",
  trilho: "Trilho simples"
};


// ============================================================
// GALERIAS DAS CORES
// ============================================================
//
// IMPORTANTE:
// Só coloque aqui arquivos que realmente existem
// dentro da pasta imagens.
//
// Se uma imagem não existir, ela apenas não carregará no modal.
// Isso não deve quebrar o restante do site.
// ============================================================

const GALERIAS_CORES = {

  "Gaze de Linho": {

    "Branco": [
      {
        src: "imagens/gaze-branco-1.jpeg",
        legenda: "Visão geral"
      }
    ],

    "Bege": [
      {
        src: "imagens/gaze-bege-1.jpeg",
        legenda: "Gaze de Linho Bege"
      }
    ],

    "Cinza": [
      {
        src: "imagens/gaze-cinza-1.jpeg",
        legenda: "Gaze de Linho Cinza"
      }
    ],

    "Off White": [
      {
        src: "imagens/gaze-offwhite-1.jpeg",
        legenda: "Gaze de Linho Off White"
      }
    ],

    "Natural": [
      {
        src: "imagens/gazenatural100bck.jpeg",
        legenda: "Gaze de Linho Natural"
      }
    ]

  },


  "Linho Damasco": {

    "Natural": [
      {
        src: "imagens/damasco-natural-1.jpeg",
        legenda: "Linho Damasco Natural"
      }
    ],

    "Branco": [
      {
        src: "imagens/damasco-branco-1.jpeg",
        legenda: "Linho Damasco Branco"
      }
    ],

    "Bege": [
      {
        src: "imagens/damascobege.jpeg",
        legenda: "Linho Damasco Bege"
      }
    ],

    "Off White": [
      {
        src: "imagens/damasco-offwhite-1.jpeg",
        legenda: "Linho Damasco Off White"
      }
    ],

    "Grafite": [
      {
        src: "imagens/damasco-grafite-1.jpeg",
        legenda: "Linho Damasco Grafite"
      }
    ]

  }

};


// ============================================================
// FORMATAÇÃO DE VALOR
// ============================================================

function brl(valor) {

  return Number(valor).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );

}


// ============================================================
// PEGA VALOR DE UM CAMPO
// ============================================================

function val(id) {

  const elemento =
    document.getElementById(id);

  return elemento
    ? elemento.value
    : "";

}


// ============================================================
// DADOS ATUAIS DO CONFIGURADOR
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
// CARDS CLICÁVEIS
// ============================================================

function bindCards(groupId, key) {

  document
    .querySelectorAll(
      "#" + groupId + " .card"
    )
    .forEach((el) => {

      el.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              "#" + groupId + " .card"
            )
            .forEach((c) => {

              c.classList.remove(
                "selected"
              );

            });


          el.classList.add(
            "selected"
          );


          state[key] =
            el.dataset.value;


          // Ao trocar tecido,
          // atualiza as cores disponíveis.

          if (key === "tecido") {

            atualizarCores();

          }


          atualizarOrcamento();

        }
      );

    });

}


// ============================================================
// CORES DISPONÍVEIS
// ============================================================

function atualizarCores() {

  const container =
    document.getElementById("cores-choice");

  if (!container) {
    return;
  }

  const cores =
    CONFIG.cores?.[state.tecido] || [];

  if (!cores.includes(state.cor)) {
    state.cor =
      cores.length
        ? cores[0]
        : "";
  }

  container.innerHTML = "";


  // Fotos usadas como miniatura de cada cor
  const MINIATURAS_CORES = {

    "Gaze de Linho": {

      "Branco":
        "imagens/gaze-branco-1.jpeg",

      "Bege":
        "imagens/gaze-bege-1.jpeg",

      "Cinza":
        "imagens/gaze-cinza-1.jpeg",

      "Off White":
        "imagens/gaze-offwhite-1.jpeg",

      "Natural":
        "imagens/gazenatural100bck.jpeg"

    },


    "Linho Damasco": {

      "Natural":
        "imagens/damasco-natural-1.jpeg",

      "Branco":
        "imagens/damasco-branco-1.jpeg",

      "Bege":
        "imagens/damascobege.jpeg",

      "Off White":
        "imagens/damasco-offwhite-1.jpeg",

      "Grafite":
        "imagens/damasco-grafite-1.jpeg"

    }

  };


  cores.forEach((cor) => {

    const card =
      document.createElement("div");

    card.className =
      "card card-cor" +
      (state.cor === cor
        ? " selected"
        : "");

    card.dataset.value =
      cor;


    // IMAGEM

    const imagem =
      document.createElement("img");

    imagem.className =
      "card-cor-img";

    imagem.src =
      MINIATURAS_CORES?.[state.tecido]?.[cor] || "";

    imagem.alt =
      `${state.tecido} ${cor}`;

    imagem.loading =
      "lazy";


    // Caso a foto ainda não exista,
    // esconde somente a imagem

    imagem.addEventListener(
      "error",
      () => {
        imagem.style.display =
          "none";
      }
    );


    // NOME DA COR

    const strong =
      document.createElement("strong");

    strong.textContent =
      cor;


    card.appendChild(
      imagem
    );

    card.appendChild(
      strong
    );


    card.addEventListener(
      "click",
      () => {

        container
          .querySelectorAll(".card")
          .forEach((c) =>
            c.classList.remove("selected")
          );

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
// ABRIR GALERIA DA COR
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
// INFORMAÇÃO AUTOMÁTICA DA BARRA
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
// ATUALIZA O RESUMO
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


  if (sumMedidas) {

    sumMedidas.textContent =
      largura
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

    sumTrilho.textContent =
      dados.trilho === "Não"
        ? "Não incluso"
        : dados.trilho;

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
// FOTO PRINCIPAL DA CORTINA
// ============================================================
//
// Por enquanto continua usando uma foto principal por tecido.
// Depois podemos fazer tecido + cor.
// ============================================================

function atualizarPreview() {

  const img =
    document.getElementById(
      "preview-img"
    );


  if (!img) {

    return;

  }


  if (
    state.tecido ===
    "Linho Damasco"
  ) {

    img.src =
      "imagens/damascobege.jpeg";


    img.alt =
      `Cortina Linho Damasco ${state.cor}`;

  } else {

    img.src =
      "imagens/gazenatural100bck.jpeg";


    img.alt =
      `Cortina Gaze de Linho ${state.cor}`;

  }

}


// ============================================================
// ATUALIZA ORÇAMENTO
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


  // =========================================================
  // ERRO
  // =========================================================

  if (resultado.erro) {

    preco.textContent =
      "Indisponível";


    if (parcelas) {

      parcelas.textContent =
        resultado.mensagem;

    }


    window.currentTotal =
      null;


    window.currentSobConsulta =
      false;


    return;

  }


  // =========================================================
  // ACIMA DE 3,20 M
  // =========================================================

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


    window.currentSobConsulta =
      true;


    window.currentBarra =
      null;


    window.currentAcrescimoAltura =
      false;


    return;

  }


  // =========================================================
  // PREÇO NORMAL
  // =========================================================

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
// MENSAGEM DO WHATSAPP
// ============================================================

function mensagemWhatsApp() {

  const dados =
    dadosAtuais();


  let estimativa =
    "Sob consulta";


  if (
    !window.currentSobConsulta &&
    typeof window.currentTotal ===
      "number"
  ) {

    estimativa =
      brl(
        window.currentTotal
      );

  }


  let barraTexto =
    "Sob consulta";


  if (
    window.currentBarra
  ) {

    barraTexto =
      `${window.currentBarra} cm`;

  }


  return `Olá! Montei uma cortina no site:

Modelo: ${dados.modelo}
Tecido: ${dados.tecido}
Cor: ${dados.cor}
Forro: ${dados.forro}
Medidas: ${dados.largura} m x ${dados.altura} m
Franzimento: ${dados.franzimento}x
Barra: ${barraTexto}
Trilho: ${dados.trilho}
Estimativa: ${estimativa}

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
// ATIVA OS CARDS
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


bindCards(
  "trilho-choice",
  "trilho"
);


// ============================================================
// CRIA CORES INICIAIS
// ============================================================

atualizarCores();


// ============================================================
// ALTERAÇÃO DE MEDIDAS
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
// BOTÕES WHATSAPP
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


// Fecha apertando ESC

document.addEventListener(
  "keydown",
  (evento) => {

    if (
      evento.key ===
      "Escape"
    ) {

      fecharGaleriaCor();

    }

  }
);


// ============================================================
// PRIMEIRO CÁLCULO
// ============================================================

atualizarOrcamento();
