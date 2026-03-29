import { getDashboardSummary } from "./dashboard.service.js";

function normalizeDate(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!isDateOnly) return null;
  return value;
}

export async function getDashboardSummaryHandler(req, res) {
  try {
    const startDate = normalizeDate(req.query?.data_inicial);
    const endDate = normalizeDate(req.query?.data_final);

    if ((startDate && !endDate) || (!startDate && endDate)) {
      return res.status(400).json({ ok: false, error: "Informe data_inicial e data_final juntas." });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({ ok: false, error: "data_inicial deve ser menor ou igual a data_final." });
    }

    const summary = await getDashboardSummary({ startDate, endDate });
    return res.json({ ok: true, data: summary });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
