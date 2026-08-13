import {
  json,
  requireAdmin,
  clean,
  logAdmin
} from "../_auth.js";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

function extensionFromType(type) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov"
  };

  return map[type] || "bin";
}

function slug(value, fallback = "geral") {
  const result = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return result || fallback;
}

export async function onRequestGet(context) {
  const auth = requireAdmin(context);

  if (!auth.ok) {
    return auth.response;
  }

  return json({
    ok: true,
    configured: Boolean(context.env.MEDIA),
    binding: "MEDIA",
    message:
      context.env.MEDIA
        ? "R2 conectado."
        : "Crie um bucket R2 e vincule-o ao projeto com o binding MEDIA."
  });
}

export async function onRequestPost(context) {
  const auth = requireAdmin(context);

  if (!auth.ok) {
    return auth.response;
  }

  if (!context.env.MEDIA) {
    return json(
      {
        ok: false,
        code: "R2_NOT_CONFIGURED",
        message:
          "R2 ainda não configurado. Vincule o bucket usando o binding MEDIA."
      },
      503
    );
  }

  let form;

  try {
    form = await context.request.formData();
  } catch {
    return json(
      {
        ok: false,
        message: "Upload inválido."
      },
      400
    );
  }

  const file = form.get("file");

  if (
    !file ||
    typeof file.arrayBuffer !== "function"
  ) {
    return json(
      {
        ok: false,
        message: "Selecione um arquivo."
      },
      400
    );
  }

  const type =
    String(
      file.type || ""
    ).toLowerCase();

  const isImage =
    IMAGE_TYPES.has(type);

  const isVideo =
    VIDEO_TYPES.has(type);

  if (!isImage && !isVideo) {
    return json(
      {
        ok: false,
        message:
          "Formato não suportado. Use JPG, JPEG, PNG, WebP, GIF, MP4, WebM ou MOV."
      },
      400
    );
  }

  const max =
    isVideo
      ? 150 * 1024 * 1024
      : 20 * 1024 * 1024;

  if (
    Number(file.size || 0) >
    max
  ) {
    return json(
      {
        ok: false,
        message:
          isVideo
            ? "Vídeo acima de 150 MB."
            : "Imagem acima de 20 MB."
      },
      400
    );
  }

  const configurator =
    slug(
      form.get("configurator") ||
      form.get("folder") ||
      "geral"
    );

  const tecido =
    slug(
      form.get("tecido"),
      "geral"
    );

  const cor =
    slug(
      form.get("cor"),
      "geral"
    );

  const forro =
    slug(
      form.get("forro"),
      "geral"
    );

  const kind =
    isVideo
      ? "videos"
      : "imagens";

  const extension =
    extensionFromType(type);

  /*
    O nome do arquivo enviado pelo usuário NÃO faz parte
    do caminho público. O R2 recebe um UUID único.
  */
  const key = [
    "configuradores",
    configurator,
    tecido,
    cor,
    forro,
    kind,
    `${crypto.randomUUID()}.${extension}`
  ].join("/");

  const now =
    new Date().toISOString();

  await context.env.MEDIA.put(
    key,
    await file.arrayBuffer(),
    {
      httpMetadata: {
        contentType: type,
        cacheControl:
          "public, max-age=31536000, immutable"
      },

      customMetadata: {
        originalName:
          clean(
            file.name,
            240
          ),

        uploadedAt:
          now
      }
    }
  );

  await logAdmin(
    context.env.DB,
    "media_uploaded",
    "media",
    key,
    {
      type,
      size:
        Number(
          file.size || 0
        ),

      configurator,
      tecido,
      cor,
      forro
    }
  );

  return json({
    ok: true,
    key,
    url:
      "/media/" +
      key,
    type,
    size:
      Number(
        file.size || 0
      ),
    originalName:
      file.name
  });
}
