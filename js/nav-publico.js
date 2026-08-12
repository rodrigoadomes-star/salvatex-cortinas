(function () {

  function limparLinksDinamicos(nav) {

    nav
      .querySelectorAll(
        "[data-dynamic-page-link]"
      )
      .forEach(
        (item) => item.remove()
      );

  }


  function criarUrlPagina(
    pagina,
    medida
  ) {

    const params =
      new URLSearchParams();


    params.set(
      "slug",
      pagina.slug
    );


    if (
      medida &&
      medida.id
    ) {

      params.set(
        "medida",
        medida.id
      );

    }


    return (
      "pagina.html?" +
      params.toString()
    );

  }


  function criarItemPagina(
    pagina
  ) {

    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.className =
      "nav-pagina-wrapper";


    wrapper.dataset.dynamicPageLink =
      "1";


    const link =
      document.createElement(
        "a"
      );


    link.href =
      criarUrlPagina(
        pagina
      );


    link.className =
      "nav-pagina-principal";


    link.textContent =
      pagina.title;


    wrapper.appendChild(
      link
    );


    const medidas =
      Array.isArray(
        pagina.measures
      )
        ? pagina.measures
        : [];


    const temSubmenu =
      medidas.length > 0 ||
      Boolean(
        pagina.customMeasureUrl
      );


    if (!temSubmenu) {

      return wrapper;

    }


    wrapper.classList.add(
      "tem-submenu"
    );


    const seta =
      document.createElement(
        "span"
      );


    seta.className =
      "nav-pagina-seta";


    seta.textContent =
      "⌄";


    seta.setAttribute(
      "aria-hidden",
      "true"
    );


    link.appendChild(
      seta
    );


    const submenu =
      document.createElement(
        "div"
      );


    submenu.className =
      "nav-pagina-submenu";


    const titulo =
      document.createElement(
        "div"
      );


    titulo.className =
      "nav-pagina-submenu-titulo";


    titulo.textContent =
      "Medidas Pré Definidas:";


    submenu.appendChild(
      titulo
    );


    medidas.forEach(
      (medida) => {

        const opcao =
          document.createElement(
            "a"
          );


        opcao.className =
          "nav-pagina-medida";


        opcao.href =
          criarUrlPagina(
            pagina,
            medida
          );


        opcao.textContent =
          medida.label;


        submenu.appendChild(
          opcao
        );

      }
    );


    if (
      pagina.customMeasureUrl
    ) {

      const personalizada =
        document.createElement(
          "a"
        );


      personalizada.className =
        "nav-pagina-medida-personalizada";


      personalizada.href =
        pagina.customMeasureUrl;


      personalizada.textContent =
        "Tenho uma medida específica";


      submenu.appendChild(
        personalizada
      );

    }


    wrapper.appendChild(
      submenu
    );


    return wrapper;

  }


  async function carregarPaginasMenu() {

    const nav =
      document.querySelector(
        ".navlinks"
      );


    if (!nav) {
      return;
    }


    limparLinksDinamicos(
      nav
    );


    try {

      const resposta =
        await fetch(
          "/api/pages",
          {
            cache:
              "no-store"
          }
        );


      const dados =
        await resposta.json();


      if (
        !resposta.ok ||
        !dados.ok ||
        !Array.isArray(
          dados.pages
        )
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


      const referencia =
        Array.from(
          nav.querySelectorAll(
            ":scope > a"
          )
        ).find(
          (link) =>
            link.getAttribute(
              "href"
            ) ===
            "#vantagens"
        );


      paginas.forEach(
        (pagina) => {

          const item =
            criarItemPagina(
              pagina
            );


          if (referencia) {

            nav.insertBefore(
              item,
              referencia
            );

          } else {

            nav.appendChild(
              item
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
