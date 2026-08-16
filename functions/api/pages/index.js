import { json } from "../_lib.js";
import { requireStoreTenant } from "../../_shared/tenant.js";

function parseJSON(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export async function onRequestGet(context) {

  if (!context.env.DB) {
    return json(
      {
        ok: false,
        message: "Banco indisponível"
      },
      503
    );
  }

  const tenantAuth = await requireStoreTenant(context,{allowPreview:true});
  if(!tenantAuth.ok) return tenantAuth.response;

  try {

    const result =
      await context.env.DB.prepare(`
        SELECT
          id,
          title,
          slug,
          page_type,
          hero_image_url,
          measures_json,
          custom_measure_url,
          nav_group,
          nav_order,
          active,
          updated_at
        FROM pages
        WHERE
          store_id = ?1
          AND active = 1
        ORDER BY nav_order ASC, title ASC
      `).bind(tenantAuth.tenant.storeId).all();


    const pages =
      (result.results || []).map(
        (row) => {

          const measures =
            parseJSON(
              row.measures_json,
              []
            )
              .map(
                (measure) => ({
                  id:
                    String(
                      measure?.id || ""
                    ),

                  label:
                    String(
                      measure?.label || ""
                    ),

                  value:
                    String(
                      measure?.value || ""
                    )
                })
              )
              .filter(
                (measure) =>
                  measure.label
              );


          return {
            id:
              row.id,

            title:
              row.title,

            slug:
              row.slug,

            pageType:
              row.page_type ||
              "conteudo",

            heroImageUrl:
              row.hero_image_url ||
              "",

            navGroup:
              row.nav_group ||
              "oculto",

            navOrder:
              Number(
                row.nav_order ??
                100
              ),

            measures,

            customMeasureUrl:
              row.custom_measure_url ||
              ""
          };

        }
      );


    return json({
      ok: true,
      pages
    });

  } catch (error) {

    console.error(
      "public pages list error",
      error
    );


    return json(
      {
        ok: false,
        message:
          "Não foi possível carregar as páginas"
      },
      500
    );

  }

}
