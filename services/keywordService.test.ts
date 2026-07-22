import { describe, expect, it } from "vitest";
import {
  pickBestMatchPerChannel,
  rankChannelsByRelevance,
  type KeywordMatchRow,
} from "./keywordService";

const row = (
  channel_id: string,
  video_id: string | null,
  position: number,
  video_title: string | null = null,
): KeywordMatchRow => ({ channel_id, video_id, video_title, position });

describe("rankChannelsByRelevance (frequência × posição — T4 parte 1)", () => {
  it("aparições únicas: mantém a ordem de relevância (posição)", () => {
    expect(rankChannelsByRelevance(["a", "b", "c"], 10)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("soma frequência × posição e ordena pelo score", () => {
    // a: (4-0)+(4-2)=6 · b: (4-1)=3 · c: (4-3)=1
    expect(rankChannelsByRelevance(["a", "b", "a", "c"], 10)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("canal frequente sobe acima de aparição única no topo", () => {
    // x: 6 · y: (6-1)+(6-3)+(6-5)=9 · z: 4 · w: 2 → y vence x
    expect(
      rankChannelsByRelevance(["x", "y", "z", "y", "w", "y"], 10),
    ).toEqual(["y", "x", "z", "w"]);
  });

  it("aparição forte no topo ainda vence duas aparições tardias", () => {
    // solo: 5 · dup (2 aparições tardias): (5-3)+(5-4)=3 → solo lidera
    expect(rankChannelsByRelevance(["solo", "x", "y", "dup", "dup"], 10)[0]).toBe(
      "solo",
    );
  });

  it("empate no score: desempata pela posição mais alta", () => {
    // a e b somam 5; a aparece antes (pos 0) → a primeiro
    expect(rankChannelsByRelevance(["a", "b", "b", "a"], 10)).toEqual([
      "a",
      "b",
    ]);
  });

  it("respeita o limite", () => {
    expect(rankChannelsByRelevance(["a", "b", "c", "d"], 2)).toEqual(["a", "b"]);
  });

  it("vazio: lista vazia", () => {
    expect(rankChannelsByRelevance([], 10)).toEqual([]);
  });
});

describe("pickBestMatchPerChannel (vídeo que casou — T5/T6.4)", () => {
  it("um canal: retorna o vídeo da menor posição", () => {
    const map = pickBestMatchPerChannel([
      row("c1", "vB", 5),
      row("c1", "vA", 2),
    ]);
    expect(map.get("c1")?.videoId).toBe("vA");
  });

  it("independe da ordem das linhas", () => {
    const map = pickBestMatchPerChannel([
      row("c1", "vA", 2),
      row("c1", "vB", 5),
    ]);
    expect(map.get("c1")?.videoId).toBe("vA");
  });

  it("carrega o título do vídeo escolhido (item 4)", () => {
    const map = pickBestMatchPerChannel([
      row("c1", "vB", 5, "Título B"),
      row("c1", "vA", 2, "Título A"),
    ]);
    expect(map.get("c1")).toEqual({ videoId: "vA", title: "Título A" });
  });

  it("título nulo em linha antiga: mantém null (page faz fallback)", () => {
    const map = pickBestMatchPerChannel([row("c1", "vA", 0)]);
    expect(map.get("c1")).toEqual({ videoId: "vA", title: null });
  });

  it("vários canais: um vídeo por canal", () => {
    const map = pickBestMatchPerChannel([
      row("c1", "v1", 0),
      row("c2", "v2", 1),
      row("c2", "v9", 9),
    ]);
    expect(map.get("c1")?.videoId).toBe("v1");
    expect(map.get("c2")?.videoId).toBe("v2");
    expect(map.size).toBe(2);
  });

  it("ignora linhas sem video_id", () => {
    const map = pickBestMatchPerChannel([
      row("c1", null, 0),
      row("c1", "v1", 3),
    ]);
    expect(map.get("c1")?.videoId).toBe("v1");
  });

  it("canal só com video_id nulo: fica de fora", () => {
    const map = pickBestMatchPerChannel([row("c1", null, 0)]);
    expect(map.has("c1")).toBe(false);
  });

  it("vazio: mapa vazio", () => {
    expect(pickBestMatchPerChannel([]).size).toBe(0);
  });
});
