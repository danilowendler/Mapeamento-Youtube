import { describe, expect, it } from "vitest";
import {
  isShortDuration,
  parseChannelInput,
  parseIso8601Duration,
} from "./youtube";

describe("parseIso8601Duration", () => {
  it("converte formatos comuns", () => {
    expect(parseIso8601Duration("PT58S")).toBe(58);
    expect(parseIso8601Duration("PT3M")).toBe(180);
    expect(parseIso8601Duration("PT12M34S")).toBe(754);
    expect(parseIso8601Duration("PT1H2M10S")).toBe(3730);
    expect(parseIso8601Duration("PT2H")).toBe(7200);
  });

  it("retorna null para formatos irreconhecíveis", () => {
    expect(parseIso8601Duration("")).toBeNull();
    expect(parseIso8601Duration("PT")).toBeNull();
    expect(parseIso8601Duration("P1D")).toBeNull(); // lives/premieres
  });
});

describe("isShortDuration", () => {
  it("classifica pelo limite de 180 s (doc 3 §3.6)", () => {
    expect(isShortDuration(59)).toBe(true);
    expect(isShortDuration(180)).toBe(true);
    expect(isShortDuration(181)).toBe(false);
    expect(isShortDuration(null)).toBe(false);
  });
});

describe("parseChannelInput", () => {
  it("reconhece ID canônico", () => {
    expect(parseChannelInput("UC_x5XG1OV2P6uZZ5FSM9Ttw")).toEqual({
      kind: "id",
      value: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
    });
  });

  it("reconhece @handle", () => {
    expect(parseChannelInput("@manualdomundo")).toEqual({
      kind: "handle",
      value: "manualdomundo",
    });
  });

  it("reconhece URLs de canal e de handle", () => {
    expect(
      parseChannelInput(
        "https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw",
      ),
    ).toEqual({ kind: "id", value: "UC_x5XG1OV2P6uZZ5FSM9Ttw" });
    expect(
      parseChannelInput("https://youtube.com/@manualdomundo/videos"),
    ).toEqual({ kind: "handle", value: "manualdomundo" });
  });

  it("trata texto livre como nome (busca cara, M3+)", () => {
    expect(parseChannelInput("Manual do Mundo")).toEqual({
      kind: "name",
      value: "Manual do Mundo",
    });
  });

  it("rejeita entradas inválidas", () => {
    expect(parseChannelInput("")).toBeNull();
    expect(parseChannelInput("@")).toBeNull();
    expect(parseChannelInput("https://vimeo.com/@algo")).toBeNull();
    expect(parseChannelInput("https://youtube.com/watch?v=abc")).toBeNull();
  });
});
