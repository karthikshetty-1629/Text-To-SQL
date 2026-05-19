import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { connectDB } from "@/lib/api";
import { toast } from "sonner";

export default function ConnectDBDialog({ open, onOpenChange, onConnected }) {
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [type, setType] = React.useState("postgresql");
  const [loading, setLoading] = React.useState(false);

  const placeholder = {
    postgresql: "postgresql://user:pass@host:5432/dbname",
    mysql: "mysql+pymysql://user:pass@host:3306/dbname",
    sqlite: "sqlite:///path/to/file.db",
  }[type];

  const submit = async () => {
    if (!name || !url) {
      toast.error("Name and connection URL are required");
      return;
    }
    setLoading(true);
    try {
      const info = await connectDB({ name, url, type });
      toast.success(`Connected: ${info.name}`);
      onConnected?.(info);
      onOpenChange(false);
      setName(""); setUrl("");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">Connect Database</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Add a Postgres, MySQL, or SQLite database for the agents to query.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-zinc-600">Display Name</Label>
            <Input data-testid="conn-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production Analytics" className="rounded-sm text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-zinc-600">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="rounded-sm text-sm" data-testid="conn-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
                <SelectItem value="sqlite">SQLite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-zinc-600">Connection URL</Label>
            <Input data-testid="conn-url-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={placeholder} className="rounded-sm text-sm font-mono" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" className="rounded-sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="rounded-sm bg-[#002FA7] hover:bg-[#00227A]" data-testid="conn-submit-btn">
            {loading ? "Testing…" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
