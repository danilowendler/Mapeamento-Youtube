import { describe, expect, it } from "vitest";
import { pickBestMatchPerChannel, type KeywordMatchRow } from "./keywordService";

const row = (
  channel_id: string,
  video_id: string | null,
  position: number,
): KeywordMatchRow => ({ channel_id, video_id, position });

describe("pickBestMatchPerChannel (vídeo que casou — T5)", () => {
  it("um canal: retorna o vídeo da menor posição", () => {
    const map = pickBestMatchPerChannel([
      row("c1", "vB", 5),
      row("c1", "vA", 2),
    ]);
    expect(map.get("c1")).toBe("vA");
  });

  it("independe da ordem das linhas", () => {
    const map = pickBestMatchPerChannel([
      row("c1", "vA", 2),
      row("c1", "vB", 5),
    ]);
    expect(map.get("c1")).toBe("vA");
  });

  it("vários canais: um vídeo por canal", () => {
    const map = pickBestMatchPerChannel([
      row("c1", "v1", 0),
      row("c2", "v2", 1),
      row("c2", "v9", 9),
    ]);
    expect(map.get("c1")).toBe("v1");
    expect(map.get("c2")).toBe("v2");
    expect(map.size).toBe(2);
  });

  it("ignora linhas sem video_id", () => {
    const map = pickBestMatchPerChannel([
      row("c1", null, 0),
      row("c1", "v1", 3),
    ]);
    expect(map.get("c1")).toBe("v1");
  });

  it("canal só com video_id nulo: fica de fora", () => {
    const map = pickBestMatchPerChannel([row("c1", null, 0)]);
    expect(map.has("c1")).toBe(false);
  });

  it("vazio: mapa vazio", () => {
    expect(pickBestMatchPerChannel([]).size).toBe(0);
  });
});
