import { describe, it, expect } from "vitest";
import {
  sanitizeInput,
  sanitizeForLike,
  sanitizeSearchQuery,
  isValidEmail,
  isValidUUID,
  sanitizeUrl,
  sanitizeForDisplay,
  sanitizePhoneNumber,
  isValidCPFFormat,
  isValidCEPFormat,
  pickFields,
  redactSensitiveFields,
} from "@/lib/inputSanitization";

describe("sanitizeInput", () => {
  it("removes HTML tags", () => {
    expect(sanitizeInput("<script>alert('xss')</script>hello")).toBe("alert(xss)hello");
  });

  it("removes javascript: protocol", () => {
    expect(sanitizeInput("javascript:alert(1)")).toBe("alert(1)");
  });

  it("removes event handlers", () => {
    expect(sanitizeInput('div onload= "evil()"')).toBe("div evil()");
  });

  it("truncates to maxLength", () => {
    expect(sanitizeInput("a".repeat(2000), 10)).toBe("a".repeat(10));
  });

  it("normalizes whitespace", () => {
    expect(sanitizeInput("hello   world")).toBe("hello world");
  });

  it("returns empty for non-string", () => {
    expect(sanitizeInput(123 as any)).toBe("");
    expect(sanitizeInput(null as any)).toBe("");
  });

  it("removes control characters", () => {
    expect(sanitizeInput("hello\x00world\x1F")).toBe("helloworld");
  });
});

describe("sanitizeForLike", () => {
  it("escapes percent", () => {
    expect(sanitizeForLike("100%")).toBe("100\\%");
  });

  it("escapes underscore", () => {
    expect(sanitizeForLike("user_name")).toBe("user\\_name");
  });

  it("escapes backslash", () => {
    expect(sanitizeForLike("path\\file")).toBe("path\\\\file");
  });
});

describe("sanitizeSearchQuery", () => {
  it("combines sanitizeInput and sanitizeForLike", () => {
    const result = sanitizeSearchQuery("<b>test%_</b>");
    expect(result).toBe("test\\%\\_");
  });

  it("respects maxLength", () => {
    const result = sanitizeSearchQuery("a".repeat(200), 5);
    expect(result.length).toBeLessThanOrEqual(10); // after escaping
  });
});

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user.name+tag@domain.co")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
  });
});

describe("isValidUUID", () => {
  it("accepts valid UUIDs", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects invalid UUIDs", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
    expect(isValidUUID("")).toBe(false);
    expect(isValidUUID("550e8400-e29b-61d4-a716-446655440000")).toBe(false); // version 6 not allowed
  });
});

describe("sanitizeUrl", () => {
  it("allows valid URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("blocks javascript: URLs", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("blocks data: URLs", () => {
    expect(sanitizeUrl("data:text/html,<h1>evil</h1>")).toBeNull();
  });

  it("allows relative URLs starting with /", () => {
    expect(sanitizeUrl("/feed")).toBe("/feed");
  });

  it("blocks // relative URLs", () => {
    expect(sanitizeUrl("//evil.com")).toBeNull();
  });

  it("returns null for non-string", () => {
    expect(sanitizeUrl(null as any)).toBeNull();
  });
});

describe("sanitizeForDisplay", () => {
  it("escapes HTML entities", () => {
    expect(sanitizeForDisplay('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  it("escapes ampersands", () => {
    expect(sanitizeForDisplay("a & b")).toBe("a &amp; b");
  });
});

describe("sanitizePhoneNumber", () => {
  it("accepts valid Brazilian phones", () => {
    expect(sanitizePhoneNumber("(11) 99999-9999")).toBe("11999999999");
    expect(sanitizePhoneNumber("1199999999")).toBe("1199999999");
  });

  it("rejects too short/long", () => {
    expect(sanitizePhoneNumber("123")).toBeNull();
    expect(sanitizePhoneNumber("123456789012")).toBeNull();
  });

  it("returns null for non-string", () => {
    expect(sanitizePhoneNumber(null as any)).toBeNull();
  });
});

describe("isValidCPFFormat", () => {
  it("accepts 11-digit CPF", () => {
    expect(isValidCPFFormat("123.456.789-09")).toBe(true);
    expect(isValidCPFFormat("12345678909")).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidCPFFormat("123")).toBe(false);
  });
});

describe("isValidCEPFormat", () => {
  it("accepts 8-digit CEP", () => {
    expect(isValidCEPFormat("01310-100")).toBe(true);
    expect(isValidCEPFormat("01310100")).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidCEPFormat("123")).toBe(false);
  });
});

describe("pickFields", () => {
  it("picks only allowed fields", () => {
    const obj = { name: "Ana", cpf: "123", email: "a@b.com" };
    expect(pickFields(obj, ["name", "email"])).toEqual({ name: "Ana", email: "a@b.com" });
  });

  it("ignores missing fields", () => {
    const obj = { name: "Ana" };
    expect(pickFields(obj, ["name", "email" as any])).toEqual({ name: "Ana" });
  });
});

describe("redactSensitiveFields", () => {
  it("redacts sensitive fields", () => {
    const obj = { name: "Ana", cpf: "123", password: "secret" };
    const result = redactSensitiveFields(obj);
    expect(result.name).toBe("Ana");
    expect(result.cpf).toBe("[REDACTED]");
    expect(result.password).toBe("[REDACTED]");
  });
});
