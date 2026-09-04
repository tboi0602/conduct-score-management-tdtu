"use client";

import { DatabaseZap } from "lucide-react";
import { Skeleton } from "boneyard-js/react";
import type { SkeletonResult } from "boneyard-js";

const tableRowBones: SkeletonResult = {
  name: "admin-table-row",
  viewportWidth: 1000,
  width: 1000,
  height: 40,
  bones: [
    [0, 4, 24, 12, 6],
    [32, 4, 17, 12, 6],
    [57, 4, 14, 12, 6],
    [80, 4, 20, 12, 6],
    [0, 25, 17, 8, 4],
  ],
};

export function TableSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, row) => (
        <tr key={row} className="border-t border-[#e7ecf3]">
          <td colSpan={columns} className="px-5 py-4">
            <Skeleton
              name="admin-table-row"
              loading
              initialBones={tableRowBones}
              animate="shimmer"
              stagger={35}
            >
              <div />
            </Skeleton>
          </td>
        </tr>
      ))}
    </tbody>
  );
}

export function EmptyTable({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-56 place-items-center px-6 py-12 text-center">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#edf4fc] text-[#154a9b]">
          <DatabaseZap size={21} />
        </span>
        <p className="mt-4 font-semibold text-[#102a50]">{title}</p>
        <p className="mt-1 text-sm text-[#66758a]">{description}</p>
      </div>
    </div>
  );
}
