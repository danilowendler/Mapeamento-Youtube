import { describe, expect, it } from "vitest";
import {
  ageBucketOf,
  analyzeChannel,
  median,
  partialScore,
  rankAmongRecent,
  type AnalyzableVideo,
  type RecentRankVideo,
} from "./outliers";

const NOW = new Date("2026-07-11T00:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

function video(
  id: string,
  views: number,
  ageDays: number,
  isShort = false,
): AnalyzableVideo {
  return {
    youtubeId: id,
    isShort,
    publishedAt: daysAgo(ageDays),
    viewCount: views,
  };
}

describe("partialScore (piso de vídeo jovem — Trending)", () => {
  it("views acima da mediana: retorna o multiplicador", () => {
    expect(partialScore(2300, 1000)).toBe(2.3);
  });
  it("exatamente na mediana: 1× ainda é piso válido", () => {
    expect(partialScore(1000, 1000)).toBe(1);
  });
  it("abaixo da mediana: null (cedo demais para julgar)", () => {
    expect(partialScore(800, 1000)).toBeNull();
  });
  it("mediana zero: baseline mínimo 1, nunca divide por zero", () => {
    expect(partialScore(50, 0)).toBe(50);
  });
  it("entradas nulas: null", () => {
    expect(partialScore(null, 1000)).toBeNull();
    expect(partialScore(500, null)).toBeNull();
  });
});

describe("rankAmongRecent (posição vs. vídeos recentes do canal — F1)", () => {
  const rv = (id: string, views: number, ageDays: number): RecentRankVideo => ({
    youtubeId: id,
    publishedAt: daysAgo(ageDays),
    viewCount: views,
  });

  it("conta só os priores (publicados ANTES do alvo) e quantos ele bate", () => {
    const target = rv("alvo", 5_000, 2);
    const priors = [
      rv("a", 1_000, 10),
      rv("b", 2_000, 20),
      rv("c", 9_000, 30),
      rv("d", 3_000, 40),
    ];
    // bate a, b, d (3) mas não c (9k) → 3 de 4
    expect(rankAmongRecent(target, [target, ...priors])).toEqual({
      beaten: 3,
      of: 4,
    });
  });

  it("respeita a janela: só os N priores mais recentes", () => {
    const target = rv("alvo", 100, 1);
    const priors = Array.from({ length: 8 }, (_, i) =>
      rv(`p${i}`, 999_999, 5 + i),
    );
    // janela 5: alvo (100) perde para todos os 5 mais recentes
    expect(rankAmongRecent(target, [target, ...priors])).toEqual({
      beaten: 0,
      of: 5,
    });
  });

  it("ignora vídeos publicados DEPOIS do alvo", () => {
    const target = rv("alvo", 5_000, 20);
    const posteriores = [rv("novo1", 1, 2), rv("novo2", 1, 5), rv("novo3", 1, 8)];
    const priores = [rv("v1", 1_000, 30), rv("v2", 2_000, 40), rv("v3", 3_000, 50)];
    expect(
      rankAmongRecent(target, [target, ...posteriores, ...priores]),
    ).toEqual({ beaten: 3, of: 3 });
  });

  it("base insuficiente (< 3 priores): null", () => {
    const target = rv("alvo", 5_000, 2);
    expect(rankAmongRecent(target, [target, rv("a", 1, 10), rv("b", 1, 20)])).toBeNull();
  });

  it("alvo sem data ou sem views: null", () => {
    const priors = [rv("a", 1, 10), rv("b", 1, 20), rv("c", 1, 30)];
    expect(
      rankAmongRecent({ youtubeId: "x", publishedAt: null, viewCount: 5 }, priors),
    ).toBeNull();
    expect(
      rankAmongRecent(
        { youtubeId: "x", publishedAt: daysAgo(2), viewCount: null },
        priors,
      ),
    ).toBeNull();
  });

  it("priores sem data/views não contam para a amostra", () => {
    const target = rv("alvo", 5_000, 2);
    const priors = [
      rv("a", 1_000, 10),
      { youtubeId: "b", publishedAt: null, viewCount: 2_000 },
      { youtubeId: "c", publishedAt: daysAgo(30), viewCount: null },
    ];
    // só "a" é prior válido → 1 < 3 → null
    expect(rankAmongRecent(target, [target, ...priors])).toBeNull();
  });
});

describe("median", () => {
  it("ímpar: valor central", () => {
    expect(median([5, 1, 3])).toBe(3);
  });
  it("par: média dos dois centrais", () => {
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });
  it("vazio: 0", () => {
    expect(median([])).toBe(0);
  });
  it("não muta a entrada", () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe("ageBucketOf (doc 3 §3.6)", () => {
  it("< 14 dias: fora do jogo", () => {
    expect(ageBucketOf(daysAgo(5), NOW)).toBeNull();
    expect(ageBucketOf(daysAgo(13.9), NOW)).toBeNull();
  });
  it("faixas corretas", () => {
    expect(ageBucketOf(daysAgo(14), NOW)).toBe("14d-3m");
    expect(ageBucketOf(daysAgo(90), NOW)).toBe("14d-3m");
    expect(ageBucketOf(daysAgo(91), NOW)).toBe("3m-12m");
    expect(ageBucketOf(daysAgo(365), NOW)).toBe("3m-12m");
    expect(ageBucketOf(daysAgo(366), NOW)).toBe("12m+");
  });
});

describe("analyzeChannel", () => {
  it("score = views / mediana do bucket (amostra suficiente)", () => {
    // 11 vídeos longos de ~30 dias: 10 com 10k views, 1 com 180k
    const videos = [
      ...Array.from({ length: 10 }, (_, i) =>
        video(`v${i}`, 10_000, 30 + i),
      ),
      video("viral", 180_000, 40),
    ];
    const { videos: scored } = analyzeChannel(videos, NOW);
    const viral = scored.find((v) => v.youtubeId === "viral")!;
    expect(viral.score).toBe(18);
    expect(viral.baselineViews).toBe(10_000);
    expect(viral.lowConfidence).toBe(false);
  });

  it("mediana resiste ao próprio viral (regra nº 1)", () => {
    const videos = [
      ...Array.from({ length: 10 }, (_, i) => video(`v${i}`, 1_000, 30 + i)),
      video("mega", 1_000_000, 30),
    ];
    const { baselines } = analyzeChannel(videos, NOW);
    const bucket = baselines.find(
      (b) => b.format === "long" && b.ageBucket === "14d-3m",
    )!;
    expect(bucket.medianViews).toBe(1_000); // média seria ~92k
  });

  it("Shorts e longos nunca se misturam (regra nº 2)", () => {
    const videos = [
      ...Array.from({ length: 10 }, (_, i) =>
        video(`s${i}`, 500_000, 30 + i, true),
      ),
      ...Array.from({ length: 10 }, (_, i) => video(`l${i}`, 5_000, 30 + i)),
      video("candidato", 50_000, 30), // longo com 10× a mediana dos longos
    ];
    const { videos: scored } = analyzeChannel(videos, NOW);
    const candidato = scored.find((v) => v.youtubeId === "candidato")!;
    // Se misturasse com Shorts (mediana 500k), score seria 0,1
    expect(candidato.score).toBe(10);
  });

  it("vídeos < 14 dias não têm score nem contaminam o baseline (regra nº 3)", () => {
    const videos = [
      ...Array.from({ length: 10 }, (_, i) => video(`v${i}`, 10_000, 30 + i)),
      video("fresquinho", 900_000, 3),
    ];
    const { videos: scored, baselines } = analyzeChannel(videos, NOW);
    const fresh = scored.find((v) => v.youtubeId === "fresquinho")!;
    expect(fresh.score).toBeNull();
    expect(fresh.ageBucket).toBeNull();
    const bucket = baselines.find(
      (b) => b.format === "long" && b.ageBucket === "14d-3m",
    )!;
    expect(bucket.medianViews).toBe(10_000); // 900k ficou de fora
  });

  it("bucket com amostra < 10 usa mediana geral do formato e sinaliza", () => {
    const videos = [
      // 12 vídeos velhos (12m+), mediana 20k
      ...Array.from({ length: 12 }, (_, i) =>
        video(`old${i}`, 20_000, 400 + i * 10),
      ),
      // 2 vídeos recentes (14d-3m) — amostra insuficiente no bucket
      video("novo1", 20_000, 30),
      video("novo2", 200_000, 45),
    ];
    const { videos: scored } = analyzeChannel(videos, NOW);
    const novo2 = scored.find((v) => v.youtubeId === "novo2")!;
    // Baseline = mediana geral dos longos (20k), não a do bucket raso
    expect(novo2.baselineViews).toBe(20_000);
    expect(novo2.score).toBe(10);
    expect(novo2.lowConfidence).toBe(false); // amostra geral (14) é suficiente

    // Canal minúsculo: até a mediana geral tem amostra < 10
    const tiny = [video("a", 1_000, 30), video("b", 5_000, 60)];
    const tinyScored = analyzeChannel(tiny, NOW).videos;
    expect(tinyScored[0].lowConfidence).toBe(true);
  });

  it("vídeos sem views ou sem data ficam sem score", () => {
    const videos: AnalyzableVideo[] = [
      { youtubeId: "semviews", isShort: false, publishedAt: daysAgo(30), viewCount: null },
      { youtubeId: "semdata", isShort: false, publishedAt: null, viewCount: 100 },
    ];
    const { videos: scored } = analyzeChannel(videos, NOW);
    expect(scored.every((v) => v.score === null)).toBe(true);
  });

  it("baseline zero não explode (divisão protegida)", () => {
    const videos = [
      ...Array.from({ length: 10 }, (_, i) => video(`z${i}`, 0, 30 + i)),
      video("algo", 500, 30),
    ];
    const { videos: scored } = analyzeChannel(videos, NOW);
    const algo = scored.find((v) => v.youtubeId === "algo")!;
    expect(algo.score).toBe(500); // baseline clampado em 1
  });
});
