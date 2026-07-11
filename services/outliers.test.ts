import { describe, expect, it } from "vitest";
import {
  ageBucketOf,
  analyzeChannel,
  median,
  type AnalyzableVideo,
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
