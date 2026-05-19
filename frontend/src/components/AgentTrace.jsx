import React from "react";
import { AGENT_META, PIPELINE_AGENTS, STATUS_COLORS } from "@/lib/agents";
import { CheckCircle2, Loader2, AlertTriangle, XCircle, ChevronDown, ChevronRight } from "lucide-react";

function StatusIcon({ status }) {
  if (status === "running") return <Loader2 className="h-3.5 w-3.5 animate-spin" style={{color: STATUS_COLORS.running}} />;
  if (status === "success") return <CheckCircle2 className="h-3.5 w-3.5" style={{color: STATUS_COLORS.success}} />;
  if (status === "warning") return <AlertTriangle className="h-3.5 w-3.5" style={{color: STATUS_COLORS.warning}} />;
  if (status === "error") return <XCircle className="h-3.5 w-3.5" style={{color: STATUS_COLORS.error}} />;
  return null;
}

function TraceEvent({ event, isLast, isRunning }) {
  const [expanded, setExpanded] = React.useState(false);
  const meta = AGENT_META[event.agent] || AGENT_META.orchestrator;
  const Icon = meta.icon;
  const hasData = event.data && Object.keys(event.data).length > 0;

  return (
    <div className={`agent-tracing-line ${isLast?'last':''} fadein`}>
      <div className="flex items-start gap-3 py-1.5">
        <div className="relative shrink-0">
          <div
            className={`h-9 w-9 rounded-sm flex items-center justify-center border ${isRunning?'pulse-dot':''}`}
            style={{ background: meta.bg, borderColor: meta.color }}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color: meta.color }} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold tracking-tight text-zinc-900">{meta.label}</span>
            <StatusIcon status={event.status} />
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">{event.status}</span>
          </div>
          <div className="text-sm text-zinc-700 mt-0.5 leading-snug break-words">{event.message}</div>
          {hasData && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 mt-1 text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-900 font-semibold"
              data-testid={`trace-expand-${event.agent}`}
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {expanded ? "Hide" : "Show"} details
            </button>
          )}
          {expanded && hasData && (
            <pre className="mt-2 p-2 bg-zinc-900 text-zinc-100 text-[11px] font-mono rounded-sm overflow-x-auto whitespace-pre-wrap break-words">
{JSON.stringify(event.data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentTrace({ events = [], isRunning = false }) {
  if (events.length === 0) return null;
  return (
    <div className="border border-zinc-200 rounded-sm bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-semibold">Agent Pipeline Trace</div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
          {events.length} events
        </div>
      </div>
      <div className="space-y-1">
        {events.map((e, i) => (
          <TraceEvent key={e.id} event={e} isLast={i === events.length-1} isRunning={isRunning && i === events.length-1} />
        ))}
      </div>
    </div>
  );
}

export function PipelineDiagram({ activeAgent, hasError }) {
  return (
    <div className="flex items-center justify-between gap-1 px-4 py-3 border-b border-zinc-200 bg-zinc-50">
      {PIPELINE_AGENTS.map((agent, i) => {
        const meta = AGENT_META[agent];
        const Icon = meta.icon;
        const isActive = activeAgent === agent;
        return (
          <React.Fragment key={agent}>
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className={`h-7 w-7 rounded-sm flex items-center justify-center border transition-all ${isActive?'pulse-dot scale-110':''}`}
                style={{
                  background: isActive ? meta.color : meta.bg,
                  borderColor: meta.color,
                }}
              >
                <Icon
                  className="h-3.5 w-3.5"
                  strokeWidth={1.5}
                  style={{ color: isActive ? "#fff" : meta.color }}
                />
              </div>
              <div className="text-[10px] font-medium text-zinc-700 truncate hidden md:block">
                {meta.label.split(" ")[0]}
              </div>
            </div>
            {i < PIPELINE_AGENTS.length-1 && <div className="flex-1 h-px bg-zinc-300" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
