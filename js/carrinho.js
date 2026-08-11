
<!DOCTYPE html>
<html lang="pt-BR">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>
    Carrinho | Salvatex Cortinas
  </title>

  <link
    rel="stylesheet"
    href="css/style.css"
  >

  <style>

    /* ========================================================
       PÁGINA DO CARRINHO
    ======================================================== */

    .pagina-carrinho {
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 20px 80px;
    }

    .carrinho-topo {
      margin-bottom: 32px;
    }

    .carrinho-voltar {
      display: inline-block;
      margin-bottom: 18px;
      color: #746c63;
      text-decoration: none;
      font-size: 14px;
    }

    .carrinho-voltar:hover {
      text-decoration: underline;
    }

    .carrinho-titulo {
      margin: 0;
      color: #211d18;
      font-size: 32px;
      line-height: 1.2;
    }

    .carrinho-subtitulo {
      margin: 8px 0 0;
      color: #746c63;
      font-size: 15px;
    }


    /* ========================================================
       LAYOUT
    ======================================================== */

    .carrinho-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 350px;
      gap: 30px;
      align-items: start;
    }


    /* ========================================================
       ITENS
    ======================================================== */

    .carrinho-itens {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .carrinho-item {
      display: grid;
      grid-template-columns: 150px minmax(0, 1fr);
      gap: 20px;

      padding: 18px;

      border: 1px solid #e7e0d8;
      border-radius: 14px;

      background: #ffffff;
    }

    .carrinho-item-imagem {
      width: 150px;
      height: 150px;

      object-fit: cover;

      border-radius: 10px;

      background: #f3eee8;
    }

    .carrinho-item-sem-imagem {
      width: 150px;
      height: 150px;

      display: flex;
      align-items: center;
      justify-content: center;

      border-radius: 10px;

      background: #f3eee8;

      color: #9a9188;
      font-size: 12px;
      text-align: center;
      padding: 15px;
    }

    .carrinho-item-conteudo {
      min-width: 0;
    }

    .carrinho-item-topo {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      align-items: flex-start;
    }

    .carrinho-item-titulo {
      margin: 0;
      color: #211d18;
      font-size: 18px;
    }

    .carrinho-item-preco {
      color: #211d18;
      font-size: 18px;
      font-weight: 700;
      white-space: nowrap;
    }

    .carrinho-item-detalhes {
      margin-top: 12px;

      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px 20px;

      color: #746c63;
      font-size: 13px;
      line-height: 1.45;
    }

    .carrinho-item-detalhes strong {
      color: #4b443d;
      font-weight: 600;
    }

    .carrinho-item-acoes {
      margin-top: 18px;

      display: flex;
      gap: 10px;
      align-items: center;
    }

    .carrinho-remover {
      border: 0;
      padding: 0;

      background: transparent;

      color: #9a554c;

      font-size: 13px;
      cursor: pointer;
    }

    .carrinho-remover:hover {
      text-decoration: underline;
    }


    /* ========================================================
       RESUMO
    ======================================================== */

    .carrinho-resumo {
      position: sticky;
      top: 20px;

      padding: 24px;

      border: 1px solid #e7e0d8;
      border-radius: 14px;

      background: #ffffff;
    }

    .carrinho-resumo h2 {
      margin: 0 0 22px;

      color: #211d18;
      font-size: 20px;
    }

    .carrinho-resumo-linha {
      display: flex;
      justify-content: space-between;
      gap: 20px;

      margin-bottom: 12px;

      color: #746c63;
      font-size: 14px;
    }

    .carrinho-resumo-total {
      display: flex;
      justify-content: space-between;
      gap: 20px;

      margin-top: 20px;
      padding-top: 20px;

      border-top: 1px solid #e7e0d8;

      color: #211d18;
      font-size: 19px;
      font-weight: 700;
    }

    .carrinho-parcelamento {
      margin-top: 8px;

      color: #746c63;

      font-size: 13px;
      text-align: right;
    }


    /* ========================================================
       BOTÕES
    ======================================================== */

    .carrinho-finalizar {
      width: 100%;

      margin-top: 24px;
      padding: 15px 18px;

      border: 0;
      border-radius: 10px;

      background: #211d18;
      color: #ffffff;

      font-size: 15px;
      font-weight: 700;

      cursor: pointer;
    }

    .carrinho-finalizar:hover {
      opacity: .92;
    }

    .carrinho-continuar {
      width: 100%;

      display: block;

      box-sizing: border-box;

      margin-top: 10px;
      padding: 14px 18px;

      border: 1px solid #d8d0c7;
      border-radius: 10px;

      background: #ffffff;
      color: #211d18;

      text-align: center;
      text-decoration: none;

      font-size: 14px;
      font-weight: 600;
    }


    /* ========================================================
       CARRINHO VAZIO
    ======================================================== */

    .carrinho-vazio {
      padding: 60px 25px;

      border: 1px solid #e7e0d8;
      border-radius: 14px;

      background: #ffffff;

      text-align: center;
    }

    .carrinho-vazio h2 {
      margin: 0 0 10px;

      color: #211d18;

      font-size: 22px;
    }

    .carrinho-vazio p {
      margin: 0 0 25px;

      color: #746c63;

      font-size: 14px;
    }

    .carrinho-vazio a {
      display: inline-block;

      padding: 13px 20px;

      border-radius: 10px;

      background: #211d18;
      color: #ffffff;

      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }


    /* ========================================================
       RESPONSIVO
    ======================================================== */

    @media (max-width: 850px) {

      .carrinho-layout {
        grid-template-columns: 1fr;
      }

      .carrinho-resumo {
        position: static;
      }

    }


    @media (max-width: 600px) {

      .pagina-carrinho {
        padding:
          25px
          14px
          60px;
      }

      .carrinho-titulo {
        font-size: 27px;
      }

      .carrinho-item {
        grid-template-columns: 100px minmax(0, 1fr);
        gap: 14px;
        padding: 14px;
      }

      .carrinho-item-imagem,
      .carrinho-item-sem-imagem {
        width: 100px;
        height: 120px;
      }

      .carrinho-item-topo {
        display: block;
      }

      .carrinho-item-preco {
        margin-top: 6px;
      }

      .carrinho-item-detalhes {
        grid-template-columns: 1fr;
        gap: 5px;
      }

    }

  </style>

</head>


<body>


  <main class="pagina-carrinho">


    <!-- ======================================================
         TOPO
    ======================================================= -->

    <div class="carrinho-topo">

      <a
        href="index.html"
        class="carrinho-voltar"
      >
        ← Continuar configurando
      </a>


      <h1 class="carrinho-titulo">
        Seu carrinho
      </h1>


      <p class="carrinho-subtitulo">
        Confira os itens antes de continuar.
      </p>

    </div>



    <!-- ======================================================
         CONTEÚDO
    ======================================================= -->

    <div
      id="carrinho-layout"
      class="carrinho-layout"
    >


      <!-- ====================================================
           ITENS
      ===================================================== -->

      <section
        id="carrinho-itens"
        class="carrinho-itens"
      >

        <!--
          Os produtos serão inseridos
          automaticamente pelo carrinho.js
        -->

      </section>



      <!-- ====================================================
           RESUMO
      ===================================================== -->

      <aside
        id="carrinho-resumo"
        class="carrinho-resumo"
      >

        <h2>
          Resumo do pedido
        </h2>


        <div class="carrinho-resumo-linha">

          <span>
            Cortinas
          </span>

          <strong id="resumo-cortinas">
            R$ 0,00
          </strong>

        </div>


        <div
          id="resumo-linha-trilhos"
          class="carrinho-resumo-linha"
        >

          <span>
            Trilhos / Varões
          </span>

          <strong id="resumo-trilhos">
            R$ 0,00
          </strong>

        </div>


        <div class="carrinho-resumo-total">

          <span>
            Total
          </span>

          <span id="carrinho-total">
            R$ 0,00
          </span>

        </div>


        <div
          id="carrinho-parcelamento"
          class="carrinho-parcelamento"
        >
          10x sem juros
        </div>


        <button
          id="finalizar-pedido"
          class="carrinho-finalizar"
          type="button"
        >
          Continuar para entrega
        </button>


        <a
          href="index.html"
          class="carrinho-continuar"
        >
          + Adicionar outra cortina
        </a>

      </aside>


    </div>


  </main>


  <!-- ========================================================
       JAVASCRIPT
  ========================================================= -->

  <script src="js/config.js"></script>

  <script src="js/carrinho.js"></script>


</body>

</html>
