(function () {

  function limparLinksDinamicos(nav) {
    nav
      .querySelectorAll("[data-dynamic-page-link]")
      .forEach((item) => item.remove());
  }

  function criarLinkPagina(pagina) {
    const link = document.createElement("a");

    link.href =
      "pagina.html?slug=" +
      encodeURIComponent(pagina.slug);

    link.textContent =
      pagina.title;

    link.dataset.dynamicPageLink =
      "1";

    link.className =
      "nav-pagina-dinamica";

    return link;
  }

  async function carregarPaginasMenu() {

    const nav =
      document.querySelector(
        ".navlinks"
      );

    if (!nav) {
      return;
    }

    limparLinksDinamicos(nav);

    try {

      const resposta =
        await fetch(
          "/api/pages",
          {
            cache: "no-store"
          }
        );

      const dados =
        await resposta.json();

      if (
        !resposta.ok ||
        !dados.ok ||
        !Array.isArray(dados.pages)
      ) {
        return;
      }

      const paginas =
        dados.pages.filter(
          (pagina) =>
            pagina &&
            pagina.slug &&
            pagina.title
        );

      if (!paginas.length) {
        return;
      }

      /*
       * As páginas publicadas entram diretamente no menu principal.
       *
       * Exemplo:
       * Cortinas sob medida | Produtos | Cortina de Varão |
       * Cortina de Trilho Suíço | Como funciona | Contato
       *
       * Elas são inseridas antes de "Como funciona".
       */

      const referencia =
        Array.from(
          nav.querySelectorAll(
            ":scope > a"
          )
        ).find((link) => {

          return (
            link.getAttribute("href") ===
            "#vantagens"
          );

        });

      paginas.forEach(
        (pagina) => {

          const link =
            criarLinkPagina(
              pagina
            );

          if (referencia) {

            nav.insertBefore(
              link,
              referencia
            );

          } else {

            nav.appendChild(
              link
            );

          }

        }
      );

    } catch (erro) {

      console.warn(
        "Não foi possível carregar as páginas no menu principal:",
        erro
      );

    }

  }

  document.addEventListener(
    "DOMContentLoaded",
    carregarPaginasMenu
  );

})();
