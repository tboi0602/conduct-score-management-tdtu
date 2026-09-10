"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardSummary } from "@/types/attendance";

const colors = ["#154a9b", "#2f7cc0", "#e6a23c", "#2f855a", "#b33b4b"];
const card = "rounded-[22px] border border-[#dce4ef] bg-white p-5";

type Labels = {
  trend: string;
  lifecycle: string;
  attendance: string;
  rankings: string;
  comparison: string;
  registrations: string;
  attended: string;
  upcoming: string;
  ongoing: string;
  completed: string;
};

export function DashboardCharts({ data, labels }: { data: DashboardSummary; labels: Labels }) {
  const lifecycle = [
    { name: labels.upcoming, value: data.totals.events.upcoming },
    { name: labels.ongoing, value: data.totals.events.ongoing },
    { name: labels.completed, value: data.totals.events.completed },
  ];
  const attendance = [
    { name: labels.attended, value: data.attendance.attended },
    { name: "Late", value: data.attendance.late },
    { name: "Absent", value: data.attendance.absent },
  ];
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <article className={`${card} xl:col-span-2`}>
        <h2 className="font-bold text-[#102a50]">{labels.trend}</h2>
        <div className="mt-5 h-72" aria-label={labels.trend}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trend}>
              <CartesianGrid stroke="#e8edf4" vertical={false} />
              <XAxis dataKey="label" stroke="#718096" fontSize={12} />
              <YAxis stroke="#718096" fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="registrations"
                name={labels.registrations}
                stroke="#154a9b"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="attendance"
                name={labels.attended}
                stroke="#2f855a"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>
      <article className={card}>
        <h2 className="font-bold text-[#102a50]">{labels.lifecycle}</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={lifecycle}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={3}
              >
                {lifecycle.map((item, index) => (
                  <Cell key={item.name} fill={colors[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>
      <article className={card}>
        <h2 className="font-bold text-[#102a50]">{labels.attendance}</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendance}>
              <CartesianGrid stroke="#e8edf4" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {attendance.map((item, index) => (
                  <Cell key={item.name} fill={colors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
      <article className={card}>
        <h2 className="font-bold text-[#102a50]">{labels.rankings}</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.rankings}>
              <CartesianGrid stroke="#e8edf4" vertical={false} />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#154a9b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
      <article className={card}>
        <h2 className="font-bold text-[#102a50]">{labels.comparison}</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.comparison.slice(0, 10)} layout="vertical">
              <CartesianGrid stroke="#e8edf4" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} fontSize={12} />
              <YAxis type="category" dataKey="code" width={64} fontSize={11} />
              <Tooltip />
              <Bar dataKey="averageScore" fill="#2f7cc0" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}
