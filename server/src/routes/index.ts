import { Router, Request, Response } from "express";
import { sseHub } from "../realtime/sse";
import { extractBearerToken, decodeToken } from "../config/auth";

const router = Router();

/**
 * Server-Sent Events stream for real-time recommendations.
 *
 * Channel selection: authenticated JWT -> per-user channel `sse:<sub>`;
 * anonymous clients fall back to the shared `sse:broadcast` channel.
 * Delivery is fanned out through Redis Pub/Sub so any API instance can
 * serve the stream regardless of which instance produced the event.
 */
router.get("/recommendations/stream", (req: Request, res: Response) => {
  const token = extractBearerToken(req.headers.authorization);
  const payload = token ? decodeToken(token) : null;
  const studentId =
    typeof req.query.studentId === "string" ? req.query.studentId : undefined;

  const scope = payload?.sub ?? studentId ?? "broadcast";
  sseHub.addClient(res, [`sse:${scope}`]);
});

export { router };
