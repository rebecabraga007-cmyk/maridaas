import { Star } from "lucide-react";

// NOTE: valores de exemplo — substitua pelos números e depoimentos reais da comunidade antes de publicar.
const STATS = [
  { value: "2.500+", label: "vizinhas conectadas" },
  { value: "180+", label: "bairros ativos" },
  { value: "4,8/5", label: "avaliação média" },
];

const TESTIMONIALS = [
  { quote: "Encontrei uma diarista de confiança recomendada pela vizinha em menos de um dia.", author: "Usuária Maridaas" },
  { quote: "Finalmente um app pra saber o que acontece de verdade no meu bairro.", author: "Usuária Maridaas" },
];

const SocialProof = () => (
  <div className="mt-8 max-w-2xl mx-auto">
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-6">
      {STATS.map((s) => (
        <div key={s.label} className="text-center">
          <div className="text-xl md:text-2xl font-display font-bold text-primary">{s.value}</div>
          <div className="text-xs text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>

    <div className="grid sm:grid-cols-2 gap-3">
      {TESTIMONIALS.map((t) => (
        <figure key={t.author} className="card-maridaas p-4 text-left">
          <div className="flex gap-0.5 mb-2 text-secondary" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-current" />
            ))}
          </div>
          <blockquote className="text-sm text-foreground mb-1">&ldquo;{t.quote}&rdquo;</blockquote>
          <figcaption className="text-xs text-muted-foreground">{t.author}</figcaption>
        </figure>
      ))}
    </div>
  </div>
);

export default SocialProof;
