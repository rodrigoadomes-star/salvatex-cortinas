export function requestHost(request) {
  try { return new URL(request.url).hostname.toLowerCase(); } catch { return ''; }
}

export async function resolveStore(context) {
  const host = requestHost(context.request);
  const db = context.env.DB;
  let slug = '';

  if (host.endsWith('.radzhub.com.br')) {
    slug = host.slice(0, -'.radzhub.com.br'.length).split('.').filter(Boolean)[0] || '';
  } else if (host === 'salvatex-cortinas.pages.dev' || host.endsWith('.salvatex-cortinas.pages.dev')) {
    slug = 'salvatex';
  }

  if (!slug || ['www','admin','app','api','radz'].includes(slug)) return null;

  if (db) {
    try {
      const row = await db.prepare('SELECT id, slug, name, active FROM stores WHERE slug=?1 LIMIT 1').bind(slug).first();
      if (row && Number(row.active) !== 0) return { id:String(row.id), slug:String(row.slug), name:String(row.name||row.slug), host };
    } catch (_) {}
  }

  // Compatibilidade durante a migração da primeira loja.
  if (slug === 'salvatex') return { id:'salvatex', slug:'salvatex', name:'Salvatex Cortinas', host };
  return null;
}

export async function requireStore(context, json) {
  const store = await resolveStore(context);
  if (!store) return { ok:false, response:json({ok:false,code:'STORE_NOT_FOUND',message:'Empresa não identificada para este domínio.'},404) };
  return { ok:true, store };
}
