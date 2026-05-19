import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Copy, Download, BarChart3, LineChart as LineIcon, PieChart as PieIcon } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { highlightSQL } from "@/lib/sqlHighlight";
import { toast } from "sonner";

const CHART_COLORS = ["#002FA7","#8B5CF6","#10B981","#F59E0B","#EC4899","#3B82F6","#EF4444","#06B6D4"];

function ChartPanel({ result }) {
  const [chartType, setChartType] = React.useState("bar");
  const [xKey, setXKey] = React.useState("");
  const [yKey, setYKey] = React.useState("");

  const cols = result?.columns || [];
  const rows = result?.rows || [];

  React.useEffect(() => {
    if (cols.length === 0) return;
    // Auto-pick: first text column for X, first numeric for Y
    const numericCol = cols.find(c => rows.length>0 && typeof rows[0][c] === "number");
    const textCol = cols.find(c => c !== numericCol);
    setXKey(textCol || cols[0]);
    setYKey(numericCol || cols[1] || cols[0]);
  }, [result]);

  if (!result || rows.length === 0) {
    return <div className="text-xs text-zinc-500 p-8 text-center">No data to chart</div>;
  }

  const data = rows.slice(0, 30).map(r => ({ ...r, [xKey]: String(r[xKey]) }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-zinc-200 flex-wrap">
        <div className="flex border border-zinc-200 rounded-sm">
          {[
            { id: "bar", icon: BarChart3 },
            { id: "line", icon: LineIcon },
            { id: "pie", icon: PieIcon },
          ].map(({id, icon: Icon}) => (
            <button
              key={id}
              data-testid={`chart-type-${id}`}
              onClick={() => setChartType(id)}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                chartType === id ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wider font-medium">{id}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">X</span>
          <Select value={xKey} onValueChange={setXKey}>
            <SelectTrigger className="h-7 w-32 text-xs rounded-sm" data-testid="chart-x-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{cols.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Y</span>
          <Select value={yKey} onValueChange={setYKey}>
            <SelectTrigger className="h-7 w-32 text-xs rounded-sm" data-testid="chart-y-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{cols.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-1 p-4 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey={xKey} stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} />
              <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 2, fontSize: 12 }} />
              <Bar dataKey={yKey} fill="#002FA7" />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey={xKey} stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} />
              <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 2, fontSize: 12 }} />
              <Line type="monotone" dataKey={yKey} stroke="#002FA7" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={120} label>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 2, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function exportCSV(result) {
  if (!result) return;
  const { columns, rows } = result;
  const csv = [columns.join(","), ...rows.map(r => columns.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "query_result.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function ResultPanel({ sql, result, error, loading }) {
  const copySQL = () => {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
    toast.success("SQL copied to clipboard");
  };

  return (
    <Tabs defaultValue="sql" className="flex flex-col h-full">
      <div className="border-b border-zinc-200 px-4 flex items-center justify-between">
        <TabsList className="bg-transparent p-0 h-auto rounded-none gap-0">
          <TabsTrigger value="sql" data-testid="tab-sql" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#002FA7] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs uppercase tracking-wider font-semibold">
            Generated SQL
          </TabsTrigger>
          <TabsTrigger value="table" data-testid="tab-table" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#002FA7] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs uppercase tracking-wider font-semibold">
            Data Table
          </TabsTrigger>
          <TabsTrigger value="chart" data-testid="tab-chart" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#002FA7] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs uppercase tracking-wider font-semibold">
            Chart
          </TabsTrigger>
        </TabsList>
        {result && (
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
            {result.row_count} rows · {result.columns.length} cols
          </div>
        )}
      </div>

      <TabsContent value="sql" className="flex-1 m-0 p-0 min-h-0 flex flex-col">
        <div className="flex items-center justify-end gap-2 p-2 border-b border-zinc-200">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={copySQL} disabled={!sql} data-testid="copy-sql-btn">
            <Copy className="h-3 w-3 mr-1.5" /> Copy
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            {loading && !sql && <div className="text-xs text-zinc-500 font-mono">Generating SQL…</div>}
            {sql ? (
              <pre className="sql-syntax">{highlightSQL(sql)}</pre>
            ) : (
              !loading && <div className="text-xs text-zinc-500 font-mono">No SQL generated yet</div>
            )}
            {error && (
              <div className="mt-3 p-3 border border-red-200 bg-red-50 rounded-sm text-xs text-red-800">
                <div className="font-semibold uppercase tracking-wider mb-1">Error</div>
                {error}
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="table" className="flex-1 m-0 p-0 min-h-0 flex flex-col">
        <div className="flex items-center justify-end gap-2 p-2 border-b border-zinc-200">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => exportCSV(result)} disabled={!result} data-testid="export-csv-btn">
            <Download className="h-3 w-3 mr-1.5" /> CSV
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {!result && <div className="text-xs text-zinc-500 p-4 font-mono">No results yet</div>}
          {result && (
            <Table>
              <TableHeader className="bg-zinc-50 sticky top-0">
                <TableRow>
                  {result.columns.map(c => (
                    <TableHead key={c} className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 border-r border-zinc-200 last:border-r-0">
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row, i) => (
                  <TableRow key={i} className="border-b border-zinc-100">
                    {result.columns.map(c => (
                      <TableCell key={c} className="font-mono text-xs text-zinc-800 border-r border-zinc-100 last:border-r-0 max-w-xs truncate">
                        {row[c] === null ? <span className="text-zinc-400 italic">null</span> : String(row[c])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="chart" className="flex-1 m-0 p-0 min-h-0 flex flex-col">
        <ChartPanel result={result} />
      </TabsContent>
    </Tabs>
  );
}
