import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET as string;
const COOKIE_NAME = "eggs_session";

export interface AuthTokenPayload {
  userId: string;
  role: Role;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function issueSessionCookie(res: Response, payload: AuthTokenPayload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    // Local network only, plain HTTP - do not require secure cookies.
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not logged in" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired" });
  }
}

export function requireParent(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "PARENT") {
    return res.status(403).json({ error: "Parents only" });
  }
  next();
}
