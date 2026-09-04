"use client";

import { Skeleton, configureBoneyard } from "boneyard-js/react";
import type { SkeletonResult } from "boneyard-js";

configureBoneyard({
  color: "#dfe7f1",
  animate: "shimmer",
  shimmerColor: "#f4f7fb",
  speed: "1.7s",
});

const pageBones: SkeletonResult = {
  name: "admin-page",
  viewportWidth: 1280,
  width: 1280,
  height: 720,
  bones: [
    [2.5, 32, 14, 14, 8],
    [2.5, 62, 58, 34, 10],
    [2.5, 112, 42, 16, 8],
    [2.5, 168, 95, 100, 18],
    [2.5, 292, 95, 52, 14],
    [2.5, 364, 95, 52, 14],
    [2.5, 436, 95, 52, 14],
    [2.5, 508, 95, 52, 14],
  ],
};

export function PageLoadingSkeleton() {
  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-5 sm:p-8">
      <Skeleton
        name="admin-page"
        loading
        initialBones={pageBones}
        animate="shimmer"
        className="mx-auto max-w-[1280px]"
      >
        <div />
      </Skeleton>
    </main>
  );
}
