window.SalvatexMedia = {

  async upload({
    file,
    configurator = "wave",
    tecido = "",
    cor = "",
    forro = ""
  }) {

    if (!(file instanceof File)) {
      throw new Error(
        "Selecione um arquivo."
      );
    }

    const form =
      new FormData();

    form.append(
      "file",
      file
    );

    form.append(
      "configurator",
      configurator
    );

    form.append(
      "tecido",
      tecido
    );

    form.append(
      "cor",
      cor
    );

    form.append(
      "forro",
      forro
    );

    const csrf = sessionStorage.getItem("salvatexAdminCsrf") || "";

    const response =
      await fetch(
        "/admin/api/media/upload",
        {
          method:
            "POST",

          credentials: "same-origin",
          headers: { "x-csrf-token": csrf },

          body:
            form
        }
      );

    const data =
      await response.json()
        .catch(
          () => ({})
        );

    if (
      !response.ok ||
      !data.ok
    ) {

      throw new Error(
        data.message ||
        "Falha no upload."
      );
    }

    return data;
  },


  async remove(key) {

    const csrf = sessionStorage.getItem("salvatexAdminCsrf") || "";

    const response =
      await fetch(
        "/admin/api/media/delete?key=" +
        encodeURIComponent(
          key
        ),
        {
          method:
            "DELETE",

          credentials: "same-origin",
          headers: { "x-csrf-token": csrf }
        }
      );

    const data =
      await response.json()
        .catch(
          () => ({})
        );

    if (
      !response.ok ||
      !data.ok
    ) {

      throw new Error(
        data.message ||
        "Falha ao remover arquivo."
      );
    }

    return data;
  }

};
