import type { Request, Response } from "express";
import type { AuthContext } from "@middleware/auth.middleware";
import * as service from "@services/faculty-class.service";
import { objectInput, optionalQuery, searchInput, textInput, uuidInput } from "@utils/crudValidation";
import { parsePagination } from "@utils/pagination";

const userId = (res: Response) => (res.locals.auth as AuthContext).sub;
function input(req: Request) { const body = objectInput(req.body); return { code: textInput(body.code, "code", 50).toUpperCase(), name: textInput(body.name, "name", 100), majorId: uuidInput(body.majorId, "majorId") }; }
export async function list(req: Request, res: Response) { const result = await service.listFacultyClasses(userId(res), parsePagination(req.query, { maxOffset: 10000 }), { search: optionalQuery(req.query.search, searchInput), majorId: optionalQuery(req.query.majorId, (value) => uuidInput(value, "majorId")) }); res.json({ ok: true, data: result.items, pagination: result.pagination }); }
export async function create(req: Request, res: Response) { res.status(201).json({ ok: true, data: await service.createFacultyClass(userId(res), input(req)) }); }
export async function update(req: Request, res: Response) { res.json({ ok: true, data: await service.updateFacultyClass(userId(res), uuidInput(req.params.id), input(req)) }); }
