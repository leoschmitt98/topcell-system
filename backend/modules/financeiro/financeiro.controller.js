import { getFinanceiroOverview } from "./financeiro.service.js";

function normalizeDate(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function getDefaultRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const startDate = `${year}-${month}-01`;
  const endDate = now.toISOString().slice(0, 10);
  return { startDate, endDate };
}

export async function getFinanceiroOverviewHandler(req, res) {
  try {
    const defaultRange = getDefaultRange();
    const startDate = normalizeDate(req.query?.data_inicial) || defaultRange.startDate;
    const endDate = normalizeDate(req.query?.data_final) || defaultRange.endDate;

    if (startDate > endDate) {
      return res.status(400).json({ ok: false, error: "data_inicial deve ser menor ou igual a data_final." });
    }

    const overview = await getFinanceiroOverview({ startDate, endDate });
    return res.json({ ok: true, data: overview });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}

