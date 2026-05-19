import React from "react";
import { Send, Network, History, Trash2, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import SchemaSidebar from "@/components/SchemaSidebar";
import AgentTrace, { PipelineDiagram } from "@/components/AgentTrace";
import ResultPanel from "@/components/ResultPanel";
import ConnectDBDialog from "@/components/ConnectDBDialog";
import { fetchDatabases, fetchSchema, runQuery, fetchSessions } from "@/lib/api";

const SAMPLE_QUERIES = {
  chinook: [
    "Top 5 artists by total invoice revenue",
    "Which country has the most customers?",
    "Average track length per genre in seconds",
    "Show all invoices over $15 with customer name",
  ],
  hr: [
    "Average salary by department",
    "List all employees on the Phoenix Platform project",
    "Which department has the highest total salary?",
    "Show all active projects and their start dates",
  ],
};

export default function Workbench() {
  const [databases, setDatabases] = React.useState([]);
  const [activeDbId, setActiveDbId] = React.useState(null);
  const [schema, setSchema] = React.useState(null);
  const [loadingSchema, setLoadingSchema] = React.useState(false);
  const [question, setQuestion] = React.useState("");
  const [trace, setTrace] = React.useState([]);
  const [sql, setSql] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [activeAgent, setActiveAgent] = React.useState(null);
  const [connectOpen, setConnectOpen] = React.useState(false);
  const [history, setHistory] = React.useState([]);

  const loadDatabases = async () => {
    const dbs = await fetchDatabases();
    setDatabases(dbs);
    if (!activeDbId && dbs.length > 0) setActiveDbId(dbs[0].id);
  };

  const loadSchema = async (id) => {
    if (!id) return;
    setLoadingSchema(true);
    try {
      const s = await fetchSchema(id);
      setSchema(s);
    } catch (e) {
      toast.error("Failed to load schema");
    } finally {
      setLoadingSchema(false);
    }
  };

  const loadHistory = async () => {
    try {
      const s = await fetchSessions();
      setHistory(s);
    } catch (e) { /* noop */ }
  };

  React.useEffect(() => { loadDatabases(); loadHistory(); }, []);
  React.useEffect(() => { if (activeDbId) { loadSchema(activeDbId); } }, [activeDbId]);

  const handleRun = async () => {
    if (!question.trim() || !activeDbId) return;
    setLoading(true);
    setTrace([]); setSql(null); setResult(null); setError(null); setActiveAgent("schema_inspector");
    try {
      const res = await runQuery(question, activeDbId, null);
      setTrace(res.trace || []);
      setSql(res.sql);
      setResult(res.result);
      setError(res.error);
      setActiveAgent(null);
      loadHistory();
      if (res.error) toast.error("Pipeline completed with errors");
      else toast.success(`Returned ${res.result?.row_count ?? 0} rows in ${res.iterations} iteration(s)`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Pipeline failed");
      setError(e.message);
    } finally {
      setLoading(false);
      setActiveAgent(null);
    }
  };

  const runSample = (q) => { setQuestion(q); };

  const selectFromHistory = (h) => {
    setQuestion(h.question);
    setActiveDbId(h.db_id);
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white text-zinc-900">
      {/* LEFT: Schema Sidebar */}
      <SchemaSidebar
        databases={databases}
        activeDbId={activeDbId}
        onSelectDb={setActiveDbId}
        schema={schema}
        loadingSchema={loadingSchema}
        onAddDatabase={() => setConnectOpen(true)}
        onRefresh={() => loadSchema(activeDbId)}
      />

      {/* CENTER: Chat + Agent Trace */}
      <main className="flex-1 flex flex-col min-w-0 border-r border-zinc-200">
        {/* Header */}
        <header className="h-14 border-b border-zinc-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-zinc-900 rounded-sm flex items-center justify-center">
              <Network className="h-4 w-4 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Multi-Agent Text-to-SQL</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">
                LangGraph · Claude Sonnet 4.5 · ReAct
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            5 Agents Ready
          </div>
        </header>

        {/* Pipeline diagram */}
        <PipelineDiagram activeAgent={activeAgent} hasError={!!error} />

        {/* Conversation area */}
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 flex flex-col">
            <ScrollArea className="flex-1 grid-bg">
              <div className="max-w-3xl mx-auto p-6 space-y-4">
                {trace.length === 0 && !loading && (
                  <div className="text-center py-16 fadein">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-sm bg-zinc-900 mb-5">
                      <Sparkles className="h-6 w-6 text-white" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-2">Ask in plain English.</h2>
                    <p className="text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
                      Five specialized agents will inspect the schema, write the SQL, validate it,
                      execute it, and reflect on the result — all without your intervention.
                    </p>
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto text-left">
                      {(SAMPLE_QUERIES[activeDbId] || SAMPLE_QUERIES.chinook).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => runSample(q)}
                          data-testid={`sample-query-${i}`}
                          className="px-4 py-3 border border-zinc-200 rounded-sm bg-white hover:border-zinc-900 hover:bg-zinc-50 transition-all text-sm text-zinc-800 group"
                        >
                          <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1 group-hover:text-zinc-700">
                            Sample · {i+1}
                          </div>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(loading || trace.length > 0) && (
                  <div className="space-y-4">
                    {question && trace.length > 0 && (
                      <div className="border-l-2 border-zinc-900 pl-4 py-1 fadein">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-semibold mb-1">User Query</div>
                        <div className="text-sm text-zinc-900">{trace[0]?.data?.question || question}</div>
                      </div>
                    )}
                    <AgentTrace events={trace} isRunning={loading} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-zinc-200 p-4 bg-white shrink-0">
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault(); handleRun();
                      }
                    }}
                    placeholder="Ask anything about your data… (⌘+Enter to send)"
                    className="min-h-[60px] resize-none rounded-sm border-zinc-300 focus-visible:ring-1 focus-visible:ring-[#002FA7] focus-visible:border-[#002FA7] pr-32 text-sm font-sans bg-zinc-50"
                    disabled={loading || !activeDbId}
                    data-testid="query-input"
                  />
                  <Button
                    onClick={handleRun}
                    disabled={loading || !question.trim() || !activeDbId}
                    className="absolute bottom-2 right-2 rounded-sm bg-[#002FA7] hover:bg-[#00227A] h-9 px-4"
                    data-testid="run-query-btn"
                  >
                    {loading ? "Running…" : "Run"}
                    <Send className="h-3.5 w-3.5 ml-2" strokeWidth={2} />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
                  <span>{activeDbId ? `Connected · ${databases.find(d => d.id === activeDbId)?.name}` : "Select a database"}</span>
                  <span>⌘+↵ to send</span>
                </div>
              </div>
            </div>
          </div>

          {/* History rail */}
          <aside className="w-64 border-l border-zinc-200 bg-zinc-50 shrink-0 flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-200 flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-semibold">Session History</div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {history.length === 0 && (
                  <div className="text-xs text-zinc-500 px-2 py-3">No queries yet</div>
                )}
                {history.map(h => (
                  <button
                    key={h.id}
                    onClick={() => selectFromHistory(h)}
                    data-testid={`history-${h.id}`}
                    className="w-full text-left px-2 py-2 rounded-sm hover:bg-zinc-200 border border-transparent hover:border-zinc-300 transition-colors group"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`h-1.5 w-1.5 rounded-full ${h.success ? 'bg-emerald-500':'bg-red-500'}`} />
                      <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-mono truncate">
                        {h.db_id} · {h.iterations}↻
                      </div>
                    </div>
                    <div className="text-xs text-zinc-800 leading-snug line-clamp-2">{h.question}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </main>

      {/* RIGHT: Results Panel */}
      <section className="w-[480px] flex flex-col bg-white shrink-0">
        <ResultPanel sql={sql} result={result} error={error} loading={loading} />
      </section>

      <ConnectDBDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnected={() => loadDatabases()}
      />
    </div>
  );
}
