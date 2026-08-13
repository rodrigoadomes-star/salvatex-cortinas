import {
  json,
  requireAdmin,
  clean
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

function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

export async function onRequestPost(context) {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth.response;

  if (!context.env.MEDIA) {
    return json(
      {
        ok: false,
        message: "Binding R2 MEDIA não configurado."
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
        message: "Não foi possível ler o upload."
      },
      400
    );
  }

  const file = form.get("file");

  if (!(file instanceof File)) {
    return json(
      {
        ok: false,
        message: "Selecione um arquivo."
      },
      400
    );
  }

  const contentType = String(file.type || "").toLowerCase();

  const isImage = IMAGE_TYPES.has(contentType);
  const isVideo = VIDEO_TYPES.has(contentType);

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

  const maxBytes = isVideo
    ? 120 * 1024 * 1024
    : 20 * 1024 * 1024;

  if (file.size > maxBytes) {
    return json(
      {
        ok: false,
        message:
          isVideo
            ? "O vídeo deve ter no máximo 120 MB."
            : "A imagem deve ter no máximo 20 MB."
      },
      400
    );
  }

  const configurator = slug(form.get("configurator") || "wave");
  const tecido = slug(form.get("tecido") || "geral");
  const cor = slug(form.get("cor") || "geral");
  const forro = slug(form.get("forro") || "geral");
  const tipo = isVideo ? "videos" : "imagens";

  const ext = extensionFromType(contentType);

  const key = [
    "configuradores",
    configurator,
    tecido,
    cor,
    forro,
    tipo,
    `${crypto.randomUUID()}.${ext}`
  ].join("/");

  await context.env.MEDIA.put(
    key,
    await file.arrayBuffer(),
    {
      httpMetadata: {
        contentType,
        cacheControl:
          "public, max-age=31536000, immutable"
      },
      customMetadata: {
        originalName: clean(file.name, 240),
        uploadedAt: new Date().toISOString()
      }
    }
  );

  return json({
    ok: true,
    key,
    url: `/media/${encodeURIComponent(key).replace(/%2F/g, "/")}`,
    contentType,
    size: file.size,
    originalName: file.name
  });
}
