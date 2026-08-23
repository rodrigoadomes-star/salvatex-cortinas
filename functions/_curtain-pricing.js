const CURTAIN_IDS = new Set(["wave", "prega-macho", "cortina-varao"]);

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function validId(value) {
  return /^[a-z0-9][a-z0-9-]{1,47}$/.test(String(value || ""));
}

async function readConfigurator(db, storeId, id) {
  const row = await db.prepare("SELECT value_json FROM store_configs WHERE store_id=?1 AND config_key=?2 LIMIT 1")
    .bind(storeId, "configurator_" + id.replaceAll("-", "_")).first();
  if (!row?.value_json) throw new Error("O configurador desta cortina não está mais disponível.");
  let config;
  try { config = JSON.parse(row.value_json); } catch { throw new Error("A configuração comercial da cortina está inválida."); }
  if (!config || config._deleted === true || config.ativo === false || config.tipo === "persiana") throw new Error("O configurador desta cortina não está disponível para venda.");
  return config;
}

function assertSelection(config, data) {
  const width = number(data.larguraAmbiente ?? data.largura);
  const height = number(data.altura);
  const gather = number(data.franzimento);
  const measures = config.medidas || {};
  const minWidth = number(measures.larguraMinima ?? .5), maxWidth = number(measures.larguraMaxima ?? 12);
  const minHeight = number(measures.alturaMinima ?? .5), maxHeight = number(measures.alturaEntradaMaxima ?? 5);
  const autoHeight = number(measures.calculoMaximo ?? 3.2);
  if (![width, height, gather, minWidth, maxWidth, minHeight, maxHeight, autoHeight].every(Number.isFinite)) throw new Error("As medidas da cortina são inválidas.");
  if (width < minWidth || width > maxWidth || height < minHeight || height > maxHeight) throw new Error("As medidas da cortina estão fora dos limites configurados pela loja.");
  if (height > autoHeight) throw new Error("Esta medida exige orçamento personalizado e não pode ser finalizada automaticamente.");

  const allowedGather = Array.isArray(config.franzimentos) ? config.franzimentos.map(item => number(item?.valor)).filter(Number.isFinite) : [];
  if (!allowedGather.some(value => Math.abs(value - gather) < .0001)) throw new Error("O franzimento selecionado não está disponível.");

  const fabricName = String(data.tecido || ""), optionName = String(data.forro || ""), color = String(data.cor || "");
  const fabric = config.tecidos?.[fabricName];
  if (!fabric || fabric.ativo === false) throw new Error("O tecido selecionado não está disponível.");
  if (!Array.isArray(fabric.cores) || !fabric.cores.includes(color)) throw new Error("A cor selecionada não está disponível para este tecido.");
  if (fabric.coresAtivas && fabric.coresAtivas[color] === false) throw new Error("A cor selecionada está temporariamente indisponível.");
  const basePrice = number(fabric.forros?.[optionName]);
  if (!Number.isFinite(basePrice) || basePrice < 0) throw new Error("A opção selecionada não possui preço válido.");

  let curtain = width * gather * basePrice;
  if (height > number(measures.inicioAcrescimo ?? 999)) curtain *= 1 + number(measures.acrescimoPercentual ?? 0) / 100;
  return { width, height, gather, curtain: money(curtain) };
}

function assertPrice(actual, expected, label) {
  if (!Number.isFinite(number(actual)) || Math.abs(number(actual) - expected) > .01) throw new Error(`O preço de “${label}” foi atualizado. Refaça a configuração antes de concluir.`);
}

export async function validateCurtainItems(db, storeId, items) {
  const groups = new Map();
  const configs = new Map();
  const validatedFinishes = new Set();
  for (const item of items) if (item?.grupoId) {
    const list = groups.get(String(item.grupoId)) || [];
    list.push(item); groups.set(String(item.grupoId), list);
  }

  for (const item of items) {
    if (!item?.configurador) continue;
    let id = String(item.configurador).toLowerCase();
    if (id === "cortina") {
      const model = String(item.dados?.modelo || "").toLowerCase();
      id = model.includes("prega") ? "prega-macho" : model.includes("ilh") ? "cortina-varao" : "wave";
    }
    if (id === "complemento_cortina") continue;
    if (!validId(id)) throw new Error("O identificador do configurador é inválido.");
    if (!CURTAIN_IDS.has(id) && String(item.categoria || "") !== "cortina") throw new Error("Este tipo de configurador ainda não está habilitado para finalização automática.");
    let config = configs.get(id);
    if (!config) { config = await readConfigurator(db, storeId, id); configs.set(id, config); }

    if (String(item.categoria || "") === "trilho") continue;
    const result = assertSelection(config, item.dados || {});
    assertPrice(item.valorUnitario, result.curtain, item.nome || "cortina");
    assertPrice(item.total, money(result.curtain * number(item.quantidade || 1)), item.nome || "cortina");

    const companions = groups.get(String(item.grupoId || "")) || [];
    for (const companion of companions.filter(candidate => String(candidate.categoria || "") === "trilho")) {
      const finishName = String(companion.dados?.modelo || companion.nome || "");
      const finish = config.trilhos?.[finishName];
      if (!finish) throw new Error("O acabamento selecionado não está mais disponível.");
      const finishPrice = money(Math.max(number(finish.minimo || 0), result.width * number(finish.valorMetro || 0)));
      assertPrice(companion.valorUnitario, finishPrice, finishName);
      assertPrice(companion.total, money(finishPrice * number(companion.quantidade || 1)), finishName);
      validatedFinishes.add(companion);
    }
  }

  for (const item of items) {
    if (String(item?.categoria || "") === "trilho" && item?.configurador && !validatedFinishes.has(item)) {
      throw new Error("O acabamento precisa estar vinculado à cortina correspondente.");
    }
  }
}
