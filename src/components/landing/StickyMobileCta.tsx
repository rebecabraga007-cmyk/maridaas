import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface StickyMobileCtaProps {
  onOpenSignup: () => void;
}

/**
 * CTA fixo no rodapé, visível apenas em mobile e apenas depois que a usuária
 * rola para além do Hero — mantém a ação de cadastro sempre a 1 polegar de distância.
 */
const StickyMobileCta = ({ onOpenSignup }: StickyMobileCtaProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const heroEl = document.getElementById("hero-title");
    if (!heroEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-md border-t border-border transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <Button
        size="lg"
        className="btn-maridaas w-full h-12 text-base"
        onClick={onOpenSignup}
        tabIndex={visible ? 0 : -1}
      >
        Cadastrar Grátis
      </Button>
    </div>
  );
};

export default StickyMobileCta;
