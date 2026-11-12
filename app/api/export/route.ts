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

type Copy = {
  sheetComponents: string;
  sheetSummary: string;
  headers: string[];
  exportedOn: (date: string) => string;
  systemHeader: string[];
  teamsHeader: string[];
  systemsTotal: string;
  teamsTotal: string;
  money: string;
  statusDraft: string;
  statusVerified: string;
  exported: string;
  unavailable: string;
};

const COPY: Record<"en" | "it", Copy> = {
  en: {
    sheetComponents: "Components",
    sheetSummary: "Summary",
    headers: [
      "Code",
      "Description",
      "System",
      "Team",
      "Assembly",
      "Qty",
      "Unit cost",
      "Total cost",
      "CO₂e per unit (kg)",
      "Total CO₂e (kg)",
      "Material",
      "Unit mass (kg)",
      "Process",
      "Make/Buy",
      "Supplier",
      "CO₂e source",
      "Status",
      "Notes",
      "Last update",
    ],
    exportedOn: (date) => `Exported on ${date}`,
    systemHeader: ["System", "Total cost", "Total CO₂e (kg)", "Components"],
    teamsHeader: ["Team", "Total cost", "Total CO₂e (kg)", "Components"],
    systemsTotal: "Systems total",
    teamsTotal: "Teams total",
    money: '"€"#,##0.00',
    statusDraft: "Draft",
    statusVerified: "Verified",
    exported: "Exported at",
    unavailable: "Export unavailable",
  },
  it: {
    sheetComponents: "Componenti",
    sheetSummary: "Riepilogo",
    headers: [
      "Codice",
      "Descrizione",
      "Sistema",
      "Team",
      "Assieme",
      "Q.tà",
      "Costo unitario",
      "Costo totale",
      "CO₂e unitario (kg)",
      "CO₂e totale (kg)",
      "Materiale",
      "Massa unitaria (kg)",
      "Processo",
      "Make/Buy",
      "Fornitore",
      "Fonte CO₂e",
      "Stato",
      "Note",
      "Ultima modifica",
    ],
    exportedOn: (date) => `Esportato il ${date}`,
    systemHeader: ["Sistema", "Costo totale", "CO₂e totale (kg)", "Componenti"],
    teamsHeader: ["Team", "Costo totale", "CO₂e totale (kg)", "Componenti"],
    systemsTotal: "Totale sistemi",
    teamsTotal: "Totale team",
    money: '#,##0.00" €"',
    statusDraft: "Bozza",
    statusVerified: "Verificato",
    exported: "Esportato alle",
    unavailable: "Export non disponibile",
  },
};

const KG = "#,##0.00";
const DATE = "dd mmm yyyy";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lang = params.get("lang") === "it" ? "it" : "en";
  const L = COPY[lang];
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
      `${L.unavailable}: ${assembliesResult.error?.message ?? componentsResult.error?.message}`,
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

  /* ------------------------------------------------------ sheet 1: the BOM */
  const sheet = workbook.addWorksheet(L.sheetComponents, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const widths = [14, 40, 22, 22, 26, 8, 15, 15, 18, 18, 20, 17, 26, 11, 22, 22, 12, 34, 18];
  sheet.columns = L.headers.map((header, index) => ({ header, width: widths[index] }));

  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111114" } };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  rows.forEach((component) => {
    const assembly = assemblyById.get(component.assembly_id);
    const quantity = Number(component.quantity ?? 0);
    const unitCost = Number(component.unit_cost ?? 0);
    const co2Unit = Number(component.co2e_unit ?? 0);

    const row = sheet.addRow([
      component.code ?? "",
      component.description,
      assembly?.systems?.name ?? "",
      assembly?.teams?.name ?? "",
      assembly?.name ?? "",
      quantity,
      unitCost,
      null,
      co2Unit,
      null,
      component.material ?? "",
      component.mass_kg === null ? "" : Number(component.mass_kg),
      component.process ?? "",
      component.sourcing === "make" ? "Make" : component.sourcing === "buy" ? "Buy" : "",
      component.supplier ?? "",
      component.co2e_source ?? "",
      component.status === "verificato" ? L.statusVerified : L.statusDraft,
      component.notes ?? "",
      component.updated_at ? new Date(component.updated_at) : "",
    ]);

    // Live formulas: change a price in Excel and the totals follow.
    row.getCell(8).value = { formula: `F${row.number}*G${row.number}`, result: quantity * unitCost };
    row.getCell(10).value = { formula: `F${row.number}*I${row.number}`, result: quantity * co2Unit };

    row.getCell(7).numFmt = L.money;
    row.getCell(8).numFmt = L.money;
    row.getCell(9).numFmt = KG;
    row.getCell(10).numFmt = KG;
    row.getCell(12).numFmt = KG;
    row.getCell(19).numFmt = DATE;
  });

  const lastDataRow = Math.max(2, rows.length + 1);
  const bom = L.sheetComponents;

  /* ----------------------------------------------------- sheet 2: summary */
  const summary = workbook.addWorksheet(L.sheetSummary);
  summary.columns = [
    { key: "label", width: 30 },
    { key: "cost", width: 18 },
    { key: "co2", width: 18 },
    { key: "count", width: 13 },
  ];

  summary.addRow(["Poliba Corse · Cost & Emissions"]).font = { bold: true, size: 14 };
  summary.addRow([
    L.exportedOn(
      new Date().toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    ),
  ]);
  summary.addRow([]);

  let cursor = 4;
  const systemHeader = summary.addRow(L.systemHeader);
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

  // The total stays a live formula but carries the computed value, so the
  // numbers are there as soon as the file opens. With no rows there is nothing
  // to sum (a SUM over a reversed range would be an error).
  const totalRowCell = (column: string, start: number, end: number, result: number) =>
    (end >= start
      ? { formula: `SUM(${column}${start}:${column}${end})`, result }
      : result) as unknown as string;

  const systemStart = cursor;

  systemsInRows.forEach((name) => {
    const row = summary.addRow([name, 0, 0, 0]);
    const item = aggregate("system", name);
    row.getCell(2).value = {
      formula: `SUMIF(${bom}!$C$2:$C$${lastDataRow},$A${row.number},${bom}!$H$2:$H$${lastDataRow})`,
      result: item.cost,
    };
    row.getCell(3).value = {
      formula: `SUMIF(${bom}!$C$2:$C$${lastDataRow},$A${row.number},${bom}!$J$2:$J$${lastDataRow})`,
      result: item.co2,
    };
    row.getCell(4).value = {
      formula: `COUNTIF(${bom}!$C$2:$C$${lastDataRow},$A${row.number})`,
      result: item.count,
    };
    row.getCell(2).numFmt = L.money;
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
    L.systemsTotal,
    totalRowCell("B", systemStart, systemEnd, grandTotals.cost),
    totalRowCell("C", systemStart, systemEnd, grandTotals.co2),
    totalRowCell("D", systemStart, systemEnd, grandTotals.count),
  ]).font = { bold: true };

  summary.addRow([]);

  const teamHeader = summary.addRow(L.teamsHeader);
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
      formula: `SUMIF(${bom}!$D$2:$D$${lastDataRow},$A${row.number},${bom}!$H$2:$H$${lastDataRow})`,
      result: item.cost,
    };
    row.getCell(3).value = {
      formula: `SUMIF(${bom}!$D$2:$D$${lastDataRow},$A${row.number},${bom}!$J$2:$J$${lastDataRow})`,
      result: item.co2,
    };
    row.getCell(4).value = {
      formula: `COUNTIF(${bom}!$D$2:$D$${lastDataRow},$A${row.number})`,
      result: item.count,
    };
    row.getCell(2).numFmt = L.money;
    row.getCell(3).numFmt = KG;
  });

  const teamEnd = summary.rowCount;
  summary.addRow([
    L.teamsTotal,
    totalRowCell("B", teamStart, teamEnd, grandTotals.cost),
    totalRowCell("C", teamStart, teamEnd, grandTotals.co2),
    totalRowCell("D", teamStart, teamEnd, grandTotals.count),
  ]).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `poliba-cost-emissions-${new Date().toISOString().slice(0, 10)}-${lang}.xlsx`;

  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
