// Status permitidos para a Ordem de Servico do modulo TopCell.
export const OS_ALLOWED_STATUS = [
  "recebido",
  "em_analise",
  "aguardando_aprovacao",
  "em_conserto",
  "pronto",
  "entregue",
  "cancelado",
];

// Fabrica um objeto OS padronizado para manter o formato consistente.
export function buildOS({
  id,
  clienteNome,
  clienteTelefone,
  aparelho,
  problema,
  status,
  valorServico,
  valorPecas,
  valorTotal,
  createdAt,
  updatedAt,
}) {
  return {
    id,
    clienteNome,
    clienteTelefone,
    aparelho,
    problema,
    status,
    valorServico,
    valorPecas,
    valorTotal,
    createdAt,
    updatedAt,
  };
}
