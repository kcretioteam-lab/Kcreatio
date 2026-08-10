import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PLAN_HIERARCHY, Plan } from '../config/plans.js';

export interface AuthRequest extends Request {
  userId?: string;
  userPlan?: string;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  // Dev bypass: accept X-Dev-User-Id header when not in production
  if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-user-id']) {
    req.userId = req.headers['x-dev-user-id'] as string;
    req.userPlan = (req.headers['x-dev-plan'] as string) || 'pro';
    next();
    return;
  }

  const token = req.cookies?.access_token;
  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated', statusCode: 401 });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { sub: string; plan: string };
    req.userId = payload.sub;
    req.userPlan = payload.plan;
    next();
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token expired or invalid', statusCode: 401 });
  }
}

export function checkPlan(...requiredPlans: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userLevel = PLAN_HIERARCHY[(req.userPlan || 'basic') as Plan] ?? -1;
    const minRequired = Math.min(...requiredPlans.map((p) => PLAN_HIERARCHY[p as Plan] ?? 99));
    if (userLevel < minRequired) {
      res.status(403).json({
        error: 'SUBSCRIPTION_REQUIRED',
        message: `This feature requires a ${requiredPlans[0]} plan or higher`,
        required_plan: requiredPlans[0],
        statusCode: 403,
      });
      return;
    }
    next();
  };
}
