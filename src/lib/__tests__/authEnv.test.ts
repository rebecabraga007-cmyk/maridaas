import { describe, it, expect } from "vitest";
import { isLovableHosted } from "@/lib/authEnv";

describe("isLovableHosted", () => {
  it("reconhece os domínios servidos pela Lovable", () => {
    expect(isLovableHosted("maridaas.lovable.app")).toBe(true);
    expect(isLovableHosted("preview.lovableproject.com")).toBe(true);
  });

  it("não reconhece hospedagens externas — ali /~oauth/initiate não existe", () => {
    // O anúncio de tráfego pago apontava para um domínio servido pelo Render:
    // é exatamente este caso que quebrava o login social.
    expect(isLovableHosted("maridaas.lebec.app")).toBe(false);
    expect(isLovableHosted("maridaas.onrender.com")).toBe(false);
    expect(isLovableHosted("maridaas.vercel.app")).toBe(false);
    expect(isLovableHosted("localhost")).toBe(false);
  });

  it("não se deixa enganar por domínio que apenas contém o nome", () => {
    expect(isLovableHosted("lovable.app.exemplo.com")).toBe(false);
    expect(isLovableHosted("naoelovable.app.br")).toBe(false);
  });
});
