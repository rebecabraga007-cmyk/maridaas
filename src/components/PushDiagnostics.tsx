import { useOneSignalPush } from "@/hooks/useOneSignalPush";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

const StatusIcon = ({ ok }: { ok: boolean | null }) => {
  if (ok === null) return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  return ok ? (
    <CheckCircle className="w-4 h-4 text-green-600" />
  ) : (
    <XCircle className="w-4 h-4 text-destructive" />
  );
};

const PushDiagnostics = () => {
  const { isLoading, diagnostics } = useOneSignalPush();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando diagnósticos...</span>
      </div>
    );
  }

  const diag = diagnostics();

  const items = [
    { label: "SDK carregado", value: diag.sdkLoaded },
    { label: "Inicializado", value: diag.initialized },
    { label: "Service Worker", value: diag.serviceWorkerReady },
    { label: "Permissão", value: diag.permission === "granted", extra: diag.permission },
    { label: "Opted In", value: diag.optedIn },
    { label: "iOS", value: null, extra: diag.isIOS ? "Sim" : "Não" },
    { label: "PWA instalado", value: null, extra: diag.isPWA ? "Sim" : "Não" },
    { label: "Push disponível", value: diag.canUsePush },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <h3 className="font-semibold text-foreground text-sm">🔔 Diagnóstico Push</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <StatusIcon ok={item.value} />
              <span className="text-foreground">{item.label}</span>
            </div>
            {item.extra && (
              <Badge variant="outline" className="text-xs">
                {item.extra}
              </Badge>
            )}
          </div>
        ))}
      </div>
      {diag.subscriptionId && (
        <p className="text-xs text-muted-foreground break-all mt-2">
          ID: {diag.subscriptionId}
        </p>
      )}
    </div>
  );
};

export default PushDiagnostics;
