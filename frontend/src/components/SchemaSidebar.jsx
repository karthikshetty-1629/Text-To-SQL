import React from "react";
import { ChevronRight, ChevronDown, Database, Table2, Key, Hash, Type, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SchemaSidebar({
  databases, activeDbId, onSelectDb, schema, loadingSchema, onAddDatabase, onRefresh
}) {
  const [openTables, setOpenTables] = React.useState({});

  const toggle = (name) => setOpenTables(s => ({ ...s, [name]: !s[name] }));

  return (
    <aside className="w-72 border-r border-zinc-200 flex flex-col bg-zinc-50 shrink-0 h-full">
      <div className="px-4 py-4 border-b border-zinc-200 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-semibold">Workspace</div>
          <div className="text-sm font-semibold text-zinc-900 mt-0.5">Databases</div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} data-testid="refresh-schema-btn">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddDatabase} data-testid="add-database-btn">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-zinc-200">
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-2 font-semibold">Connections</div>
        <div className="space-y-0.5">
          {databases.map(d => (
            <button
              key={d.id}
              data-testid={`db-select-${d.id}`}
              onClick={() => onSelectDb(d.id)}
              className={`w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm transition-colors ${
                activeDbId === d.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              <Database className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              <span className="truncate flex-1">{d.name}</span>
              <span className={`text-[9px] uppercase font-mono ${activeDbId===d.id?"text-zinc-400":"text-zinc-400"}`}>
                {d.type}
              </span>
            </button>
          ))}
          {databases.length === 0 && (
            <div className="text-xs text-zinc-500 px-2 py-1">No databases</div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Schema</div>
          {loadingSchema && <div className="text-[10px] text-zinc-400">loading…</div>}
        </div>
        <ScrollArea className="flex-1">
          <div className="px-2 pb-4">
            {!schema && !loadingSchema && (
              <div className="text-xs text-zinc-500 px-2 py-1">Select a database</div>
            )}
            {schema && schema.tables.map(t => {
              const open = openTables[t.name];
              return (
                <div key={t.name} className="mb-0.5" data-testid={`schema-table-${t.name}`}>
                  <button
                    onClick={() => toggle(t.name)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 text-sm text-zinc-800 hover:bg-zinc-200 rounded-sm"
                  >
                    {open ? <ChevronDown className="h-3 w-3 text-zinc-500" /> : <ChevronRight className="h-3 w-3 text-zinc-500" />}
                    <Table2 className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
                    <span className="font-mono text-xs truncate flex-1 text-left">{t.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{t.row_count ?? '—'}</span>
                  </button>
                  {open && (
                    <div className="pl-6 pr-2 py-1 space-y-0.5">
                      {t.columns.map(c => {
                        const isFk = t.foreign_keys.some(fk => fk.from.includes(c.name));
                        const isPk = /id$/i.test(c.name) && c.name.toLowerCase() === t.name.replace(/s$/,'').toLowerCase()+'_id' || c.name.toLowerCase() === 'id';
                        const Icon = isPk ? Key : isFk ? Key : Hash;
                        return (
                          <div key={c.name} className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-900 font-mono">
                            <Icon className={`h-2.5 w-2.5 shrink-0 ${isPk?'text-amber-500':isFk?'text-blue-500':'text-zinc-400'}`} strokeWidth={2} />
                            <span className="truncate flex-1">{c.name}</span>
                            <span className="text-[9px] text-zinc-400 uppercase">{(c.type||'').split('(')[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
