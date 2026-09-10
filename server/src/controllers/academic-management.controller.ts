import type { Request, Response } from "express";
import * as service from "@services/academic-management.service";
import { objectInput, optionalQuery, searchInput, textInput, uuidInput } from "@utils/crudValidation";
import { parsePagination } from "@utils/pagination";

function kind(req: Request): service.AcademicKind { const value = req.params.kind; if (value !== "faculties" && value !== "majors" && value !== "classes") throw new Error("Invalid academic resource"); return value; }
function input(req: Request): service.AcademicInput { const body = objectInput(req.body); return { code: textInput(body.code, "code", 50).toUpperCase(), name: textInput(body.name, "name", 150), facultyId: body.facultyId ? uuidInput(body.facultyId, "facultyId") : undefined, majorId: body.majorId ? uuidInput(body.majorId, "majorId") : undefined }; }
export async function list(req: Request, res: Response) { const result = await service.list(kind(req), parsePagination(req.query, { maxOffset: 10000 }), { search: optionalQuery(req.query.search, searchInput), facultyId: optionalQuery(req.query.facultyId, (v) => uuidInput(v, "facultyId")), majorId: optionalQuery(req.query.majorId, (v) => uuidInput(v, "majorId")) }); res.json({ ok: true, data: result.items, pagination: result.pagination }); }
export async function create(req: Request, res: Response) { res.status(201).json({ ok: true, data: await service.create(kind(req), input(req)) }); }
export async function update(req: Request, res: Response) { res.json({ ok: true, data: await service.update(kind(req), uuidInput(req.params.id), input(req)) }); }
export async function remove(req: Request, res: Response) { await service.remove(kind(req), uuidInput(req.params.id)); res.status(204).end(); }
