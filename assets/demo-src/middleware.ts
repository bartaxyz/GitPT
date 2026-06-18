import { RateLimiter, type RateLimitRequest } from "./rateLimiter.js";
import { setRateLimitHeaders } from "./headers.js";

export interface HttpRequest {
  ip: string;
  path: string;
  headers: Record<string, string | undefined>;
}

export interface HttpResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

export type Next = () => void | Promise<void>;

export interface MiddlewareOptions {
  allowlist?: string[];
  rejectionBody?: string;
}

export const rateLimitMiddleware = (
  limiter: RateLimiter,
  options: MiddlewareOptions = {}
) => {
  const allow = new Set(options.allowlist ?? []);
  const rejectionBody = options.rejectionBody ?? "Too Many Requests";

  return async (req: HttpRequest, res: HttpResponse, next: Next): Promise<void> => {
    if (allow.has(req.path)) {
      await next();
      return;
    }

    const request: RateLimitRequest = {
      ip: req.ip,
      apiKey: req.headers["x-api-key"],
      path: req.path,
    };

    const result = await limiter.check(request);
    setRateLimitHeaders(res, result);

    if (!result.allowed) {
      res.statusCode = 429;
      res.end(rejectionBody);
      return;
    }

    await next();
  };
};
