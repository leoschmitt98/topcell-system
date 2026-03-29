import { decidePublicOSByIdentity, findPublicOSByIdentity } from "../os/os.service.js";
import { createOS } from "../os/os.service.js";
import { createOrcamentoFromOrder } from "../orcamentos/orcamentos.service.js";

export async function consultPublicOSHandler(req, res) {
  try {
    const ordem = await findPublicOSByIdentity({
      osId: req.query?.numero_os,
      clienteNome: req.query?.cliente_nome,
      clienteTelefone: req.query?.cliente_telefone,
    });

    if (!ordem) {
      return res.status(404).json({ ok: false, error: "OS nao encontrada para os dados informados." });
    }

    return res.json({ ok: true, data: ordem });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function createPublicBudgetHandler(req, res) {
  try {
    const ordem = await createOS({
      clienteNome: req.body?.nome,
      clienteTelefone: req.body?.telefone,
      aparelho: req.body?.aparelho,
      problema: req.body?.problema,
      status: "recebido",
    });

    await createOrcamentoFromOrder({
      ordemServicoId: ordem.id,
      descricao: req.body?.problema,
    });

    return res.status(201).json({
      ok: true,
      data: {
        osId: ordem.id,
        status: ordem.status,
        mensagem: "Solicitacao recebida com sucesso.",
      },
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function decidePublicOSHandler(req, res) {
  try {
    const ordem = await decidePublicOSByIdentity({
      osId: req.body?.numero_os,
      clienteNome: req.body?.cliente_nome,
      clienteTelefone: req.body?.cliente_telefone,
      acao: req.body?.acao,
      observacao: req.body?.observacao,
    });

    if (!ordem) {
      return res.status(404).json({ ok: false, error: "OS nao encontrada para os dados informados." });
    }

    return res.json({ ok: true, data: ordem });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}
