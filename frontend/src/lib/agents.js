// Agent metadata - colors, labels, icons
import {
  Telescope, PenSquare, ShieldCheck, Play, Repeat, GitBranch
} from "lucide-react";

export const AGENT_META = {
  orchestrator: { label: "Orchestrator", color: "#71717a", bg: "#fafafa", icon: GitBranch },
  schema_inspector: { label: "Schema Inspector", color: "#8B5CF6", bg: "#F5F3FF", icon: Telescope },
  sql_writer: { label: "SQL Writer", color: "#3B82F6", bg: "#EFF6FF", icon: PenSquare },
  validator: { label: "Validator", color: "#F59E0B", bg: "#FFFBEB", icon: ShieldCheck },
  executor: { label: "Executor", color: "#10B981", bg: "#ECFDF5", icon: Play },
  reflector: { label: "Reflector", color: "#EC4899", bg: "#FDF2F8", icon: Repeat },
};

export const STATUS_COLORS = {
  running: "#3B82F6",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
};

export const PIPELINE_AGENTS = [
  "schema_inspector",
  "sql_writer",
  "validator",
  "executor",
  "reflector",
];
