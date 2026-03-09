const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
    <img src="/logo.png" alt="Maridaas" className="h-16 w-16 animate-float" />
    <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
  </div>
);

export default LoadingFallback;
