import ExcelJS from "exceljs";
import { serverClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AssemblyExport = {
  id: string;
  name: string;
  system_id: string;
  team_id: string;
  systems: { name: string } | null;
  teams: { name: string } | null;
};

type ComponentExport = {
  id: string;
  assembly_id: string;
  code: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  material: string | null;
  mass_kg: number | null;
  process: string | null;
  sourcing: string | null;
  supplier: string | null;
  co2e_unit: number;
  co2e_source: string | null;
  notes: string | null;
  status: string;
  updated_at: string;
};

const MONEY = '#,##0.00" €"';
const KG = "#,##0.00";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const systemFilter = params.get("system") ?? "";
  const teamFilter = params.get("team") ?? "";
  const statusFilter = params.get("status") ?? "";
  const search = (params.get("q") ?? "").trim().toLowerCase();

  const supabase = serverClient();

  const assembliesQuery = supabase.from("assemblies").select("id, name, system_id, team_id, systems(name), teams(name)");
  const componentsQuery = supabase.from("components").select("*").order("description");

  const [assembliesResult, componentsResult] = await Promise.all([assembliesQuery, componentsQuery]);

  if (assembliesResult.error || componentsResult.error) {
    return new Response(
      `Export non disponibile: ${assembliesResult.error?.message ?? componentsResult.error?.message}`,
      { status: 500 },
    );
  }

  const assemblies = (assembliesResult.data as unknown as AssemblyExport[] | null) ?? [];
  const allComponents = (componentsResult.data as ComponentExport[] | null) ?? [];

  const assemblyById = new Map(assemblies.map((assembly) => [assembly.id, assembly]));

  const rows = allComponents.filter((component) => {
    const assembly = assemblyById.get(component.assembly_id);
    if (!assembly) return false;
    if (systemFilter && assembly.system_id !== systemFilter) return false;
    if (teamFilter && assembly.team_id !== teamFilter) return false;
    if (statusFilter && component.status !== statusFilter) return false;
    if (!search) return true;
    const haystack = [
      component.description,
      component.code,
      component.material,
      component.process,
      component.supplier,
      assembly.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Poliba Corse · Cost & Emissions";
  workbook.created = new Date();

  /* ------------------------------------------------------- foglio 1: BOM */
  const sheet = workbook.addWorksheet("Componenti", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Codice", key: "code", width: 14 },
    { header: "Descrizione", key: "description", width: 40 },
    { header: "Sistema", key: "system", width: 22 },
    { header: "Team", key: "team", width: 22 },
    { header: "Assieme", key: "assembly", width: 26 },
    { header: "Q.tà", key: "quantity", width: 8 },
    { header: "Costo unitario", key: "unitCost", width: 15 },
    { header: "Costo totale", key: "costTotal", width: 15 },
    { header: "CO₂e unitario (kg)", key: "co2Unit", width: 18 },
    { header: "CO₂e totale (kg)", key: "co2Total", width: 18 },
    { header: "Materiale", key: "material", width: 20 },
    { header: "Massa unitaria (kg)", key: "mass", width: 17 },
    { header: "Processo", key: "process", width: 26 },
    { header: "Make/Buy", key: "sourcing", width: 11 },
    { header: "Fornitore", key: "supplier", width: 22 },
    { header: "Fonte CO₂e", key: "co2Source", width: 22 },
    { header: "Stato", key: "status", width: 12 },
    { header: "Note", key: "notes", width: 34 },
    { header: "Ultima modifica", key: "updatedAt", width: 18 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111114" } };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  rows.forEach((component) => {
    const assembly = assemblyById.get(component.assembly_id);
    const quantity = Number(component.quantity ?? 0);
    const unitCost = Number(component.unit_cost ?? 0);
    const co2Unit = Number(component.co2e_unit ?? 0);

    const row = sheet.addRow({
      code: component.code ?? "",
      description: component.description,
      system: assembly?.systems?.name ?? "",
      team: assembly?.teams?.name ?? "",
      assembly: assembly?.name ?? "",
      quantity,
      unitCost,
      costTotal: quantity * unitCost,
      co2Unit,
      co2Total: quantity * co2Unit,
      material: component.material ?? "",
      mass: component.mass_kg === null ? "" : Number(component.mass_kg),
      process: component.process ?? "",
      sourcing: component.sourcing === "make" ? "Make" : component.sourcing === "buy" ? "Buy" : "",
      supplier: component.supplier ?? "",
      co2Source: component.co2e_source ?? "",
      status: component.status,
      notes: component.notes ?? "",
      updatedAt: component.updated_at ? new Date(component.updated_at) : "",
    });

    // Totali come formule vive: se cambi un prezzo in Excel, i totali si aggiornano.
    row.getCell(8).value = { formula: `F${row.number}*G${row.number}`, result: quantity * unitCost };
    row.getCell(10).value = { formula: `F${row.number}*I${row.number}`, result: quantity * co2Unit };

    row.getCell(7).numFmt = MONEY;
    row.getCell(8).numFmt = MONEY;
    row.getCell(9).numFmt = KG;
    row.getCell(10).numFmt = KG;
    row.getCell(12).numFmt = KG;
    row.getCell(19).numFmt = "dd/mm/yyyy";
  });

  const lastDataRow = Math.max(2, rows.length + 1);

  /* --------------------------------------------------- foglio 2: riepilogo */
  const summary = workbook.addWorksheet("Riepilogo");
  summary.columns = [
    { key: "label", width: 30 },
    { key: "cost", width: 18 },
    { key: "co2", width: 18 },
    { key: "count", width: 13 },
  ];

  summary.addRow(["Poliba Corse · Cost & Emissions"]).font = { bold: true, size: 14 };
  summary.addRow([`Esportato il ${new Date().toLocaleDateString("it-IT")}`]);
  summary.addRow([]);

  let cursor = 4;
  const systemHeader = summary.addRow(["Sistema", "Costo totale", "CO₂e totale (kg)", "Componenti"]);
  systemHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  systemHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111114" } };
  cursor += 1;

  const systemsInRows = Array.from(
    new Map(
      rows
        .map((component) => {
          const assembly = assemblyById.get(component.assembly_id);
          return [assembly?.system_id ?? "", assembly?.systems?.name ?? ""] as [string, string];
        })
        .filter(([id, name]) => id && name),
    ).values(),
  ).sort((a, b) => a.localeCompare(b));

  const emptyTotals = { cost: 0, co2: 0, count: 0 };

  const sumRow = (component: ComponentExport) => {
    const quantity = Number(component.quantity ?? 0);
    return {
      cost: quantity * Number(component.unit_cost ?? 0),
      co2: quantity * Number(component.co2e_unit ?? 0),
      count: 1,
    };
  };

  const aggregate = (key: "system" | "team", name: string) =>
    rows.reduce((acc, component) => {
      const assembly = assemblyById.get(component.assembly_id);
      const label = key === "system" ? assembly?.systems?.name : assembly?.teams?.name;
      if (label !== name) return acc;
      const item = sumRow(component);
      return {
        cost: acc.cost + item.cost,
        co2: acc.co2 + item.co2,
        count: acc.count + item.count,
      };
    }, { ...emptyTotals });

  // Il totale resta una formula viva, ma con il valore già calcolato:
  // così i numeri si vedono appena apri il file. Senza righe non c'è nulla
  // da sommare (una SUM su un intervallo al contrario sarebbe un errore).
  const totalRowCell = (column: string, start: number, end: number, result: number) =>
    (end >= start
      ? { formula: `SUM(${column}${start}:${column}${end})`, result }
      : result) as unknown as string;

  const systemStart = cursor;

  systemsInRows.forEach((name) => {
    const row = summary.addRow([name, 0, 0, 0]);
    const item = aggregate("system", name);
    row.getCell(2).value = {
      formula: `SUMIF(Componenti!$C$2:$C$${lastDataRow},$A${row.number},Componenti!$H$2:$H$${lastDataRow})`,
      result: item.cost,
    };
    row.getCell(3).value = {
      formula: `SUMIF(Componenti!$C$2:$C$${lastDataRow},$A${row.number},Componenti!$J$2:$J$${lastDataRow})`,
      result: item.co2,
    };
    row.getCell(4).value = {
      formula: `COUNTIF(Componenti!$C$2:$C$${lastDataRow},$A${row.number})`,
      result: item.count,
    };
    row.getCell(2).numFmt = MONEY;
    row.getCell(3).numFmt = KG;
  });

  const systemEnd = summary.rowCount;
  const grandTotals = rows.reduce(
    (acc, component) => {
      const item = sumRow(component);
      return { cost: acc.cost + item.cost, co2: acc.co2 + item.co2, count: acc.count + item.count };
    },
    { ...emptyTotals },
  );

  summary.addRow([
    "Totale sistemi",
    totalRowCell("B", systemStart, systemEnd, grandTotals.cost),
    totalRowCell("C", systemStart, systemEnd, grandTotals.co2),
    totalRowCell("D", systemStart, systemEnd, grandTotals.count),
  ]).font = { bold: true };

  summary.addRow([]);

  const teamHeader = summary.addRow(["Team", "Costo totale", "CO₂e totale (kg)", "Componenti"]);
  teamHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  teamHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111114" } };

  const teamsInRows = Array.from(
    new Map(
      rows
        .map((component) => {
          const assembly = assemblyById.get(component.assembly_id);
          return [assembly?.team_id ?? "", assembly?.teams?.name ?? ""] as [string, string];
        })
        .filter(([id, name]) => id && name),
    ).values(),
  ).sort((a, b) => a.localeCompare(b));

  const teamStart = summary.rowCount + 1;

  teamsInRows.forEach((name) => {
    const row = summary.addRow([name, 0, 0, 0]);
    const item = aggregate("team", name);
    row.getCell(2).value = {
      formula: `SUMIF(Componenti!$D$2:$D$${lastDataRow},$A${row.number},Componenti!$H$2:$H$${lastDataRow})`,
      result: item.cost,
    };
    row.getCell(3).value = {
      formula: `SUMIF(Componenti!$D$2:$D$${lastDataRow},$A${row.number},Componenti!$J$2:$J$${lastDataRow})`,
      result: item.co2,
    };
    row.getCell(4).value = {
      formula: `COUNTIF(Componenti!$D$2:$D$${lastDataRow},$A${row.number})`,
      result: item.count,
    };
    row.getCell(2).numFmt = MONEY;
    row.getCell(3).numFmt = KG;
  });

  const teamEnd = summary.rowCount;
  summary.addRow([
    "Totale team",
    totalRowCell("B", teamStart, teamEnd, grandTotals.cost),
    totalRowCell("C", teamStart, teamEnd, grandTotals.co2),
    totalRowCell("D", teamStart, teamEnd, grandTotals.count),
  ]).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `poliba-cost-emissions-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
