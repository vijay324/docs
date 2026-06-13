import arcjet, { 
  fixedWindow, 
  shield,
  detectBot,
} from "@arcjet/next";
import { type NextRequest, } from "next/server";

// Environment-based mode configuration
const isProduction = process.env.NODE_ENV === 'production';
const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : (isProduction ? 'LIVE' : 'DRY_RUN');

// Log configuration on startup (server-side only)
if (typeof window === 'undefined') {
  console.log('[ARCJET] Frontend configuration:', {
    mode: arcjetMode,
    environment: process.env.NODE_ENV,
    hasKey: !!process.env.ARCJET_KEY,
  });
}

// Main Arcjet instance for general protection
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    // Shield protection against common attacks (SQL injection, XSS, etc.)
    shield({
      mode: arcjetMode as "LIVE" | "DRY_RUN",
    }),
    
    // Bot detection - blocks automated traffic
    detectBot({
      mode: arcjetMode as "LIVE" | "DRY_RUN",
      // Allow search engines and monitoring bots
      allow: [
        "CATEGORY:SEARCH_ENGINE",
        "CATEGORY:MONITOR",
        "CATEGORY:PREVIEW",
      ],
    }),
    
    // General API rate limiting - 100 requests per 15 minutes per IP
    fixedWindow({
      mode: arcjetMode as "LIVE" | "DRY_RUN",
      window: "15m",
      max: 100,
    }),
  ],
});

// Authentication endpoints protection - stricter limits
export const authArcjet = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: arcjetMode as "LIVE" | "DRY_RUN" }),
    
    // Bot detection for auth endpoints
    detectBot({
      mode: arcjetMode as "LIVE" | "DRY_RUN",
      // Only allow legitimate browser traffic for auth
      allow: [],
    }),
    
    // Very strict rate limiting for auth endpoints
    fixedWindow({
      mode: arcjetMode as "LIVE" | "DRY_RUN",
      window: "15m", 
      max: 20, // Only 20 auth attempts per 15 minutes per IP
    }),
  ],
});

// Standard API protection
export const apiArcjet = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: arcjetMode as "LIVE" | "DRY_RUN" }),
    
    detectBot({
      mode: arcjetMode as "LIVE" | "DRY_RUN",
      allow: [
        "CATEGORY:SEARCH_ENGINE",
        "CATEGORY:MONITOR",
      ],
    }),
    
    // Standard API rate limiting
    fixedWindow({
      mode: arcjetMode as "LIVE" | "DRY_RUN",
      window: "15m",
      max: 300, // 300 requests per 15 minutes for general API
    }),
  ],
});

// AI endpoints protection (stricter due to computational cost)
export const aiArcjet = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: arcjetMode as "LIVE" | "DRY_RUN" }),
    
    detectBot({
      mode: arcjetMode as "LIVE" | "DRY_RUN",
      allow: [], // No bots allowed for AI endpoints
    }),
    
    // AI endpoints need stricter limits
    fixedWindow({
      mode: arcjetMode as "LIVE" | "DRY_RUN",
      window: "1h", // 1 hour window
      max: 50, // 50 AI requests per hour per user
    }),
  ],
});

// File upload endpoints protection
export const uploadArcjet = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: arcjetMode as "LIVE" | "DRY_RUN" }),
    
    detectBot({
      mode: arcjetMode as "LIVE" | "DRY_RUN",
      allow: [], // No bots for file uploads
    }),
    
    // File upload rate limiting
    fixedWindow({
      mode: arcjetMode as "LIVE" | "DRY_RUN",
      window: "1h",
      max: 100, // 100 uploads per hour per user
    }),
  ],
});

// Helper function to get user ID from request
export function getUserId(request: Request): string | undefined {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return undefined;
    }
    
    // Decode JWT to extract user ID (basic extraction)
    const token = authHeader.substring(7);
    const parts = token.split('.');
    if (parts.length !== 3) {
      return undefined;
    }
    
    try {
      const payload = JSON.parse(atob(parts[1]));
      return payload.id || payload.userId || payload.sub;
    } catch {
      return undefined;
    }
  } catch {
    return undefined;
  }
}

// Get client IP from request
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return (request as any).ip ?? '127.0.0.1';
}

// Arcjet protection wrapper for API routes
export async function withArcjetProtection(
  request: NextRequest,
  type: 'auth' | 'api' | 'ai' | 'upload' = 'api'
): Promise<{ allowed: boolean; response?: Response }> {
  // Skip if Arcjet key is not configured
  if (!process.env.ARCJET_KEY) {
    console.warn('[ARCJET] No API key configured, skipping protection');
    return { allowed: true };
  }

  const arcjetInstance = {
    auth: authArcjet,
    api: apiArcjet, 
    ai: aiArcjet,
    upload: uploadArcjet,
  }[type];

  try {
    const userId = getUserId(request);
    const ip = getClientIP(request);
    
    const decision = await arcjetInstance.protect(request);

    // Log decision for monitoring
    console.log(`[ARCJET] ${type.toUpperCase()} protection:`, {
      allowed: decision.isAllowed(),
      denied: decision.isDenied(),
      userId: userId || `anon_${ip}`,
      ip,
      path: request.nextUrl.pathname,
      method: request.method,
    });

    if (decision.isDenied()) {
      // Rate limit
      if (decision.reason.isRateLimit()) {
        const reset = decision.reason.resetTime;
        return {
          allowed: false,
          response: new Response(
            JSON.stringify({
              success: false,
              error: "Rate limit exceeded",
              message: "Too many requests. Please try again later.",
              retryAfter: typeof reset === 'number' ? new Date(reset).toISOString() : undefined,
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": typeof reset === 'number' ? Math.ceil((reset - Date.now()) / 1000).toString() : "60",
              },
            }
          ),
        };
      }

      // Shield
      if (decision.reason.isShield()) {
        return {
          allowed: false,
          response: new Response(
            JSON.stringify({
              success: false,
              error: "Request blocked",
              message: "Request blocked by security shield.",
            }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          ),
        };
      }

      // Bot
      if (decision.reason.isBot()) {
        return {
          allowed: false,
          response: new Response(
            JSON.stringify({
              success: false,
              error: "Bot detected",
              message: "Automated traffic is not allowed.",
            }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          ),
        };
      }
      
      // Generic denial
      return {
        allowed: false,
        response: new Response(
          JSON.stringify({
            success: false,
            error: "Request denied",
            message: "Request was denied by security policy.",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        ),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[ARCJET] Error during protection check:', error);
    // Allow request if Arcjet fails (fail-open for availability)
    return { allowed: true };
  }
}

// Export Arcjet mode for external use
export const ARCJET_MODE = arcjetMode;

// Helper function to create rate limit response from Arcjet decision
// Used by API routes for compatibility
export function createRateLimitResponse(decision: any): Response | null {
  if (!decision.isDenied()) return null;

  if (decision.reason.isRateLimit()) {
    const reset = decision.reason.resetTime;
    return new Response(
      JSON.stringify({
        success: false,
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later.",
        retryAfter: typeof reset === 'number' ? new Date(reset).toISOString() : undefined,
        details: {
          type: "RATE_LIMIT",
          remaining: decision.reason.remaining,
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": typeof reset === 'number' ? Math.ceil((reset - Date.now()) / 1000).toString() : "60",
        },
      }
    );
  }

  if (decision.reason.isShield()) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Request blocked",
        message: "Request blocked by security shield.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (decision.reason.isBot()) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Bot detected",
        message: "Automated traffic is not allowed.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Generic denial
  return new Response(
    JSON.stringify({
      success: false,
      error: "Request denied",
      message: "Request was denied by security policy.",
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export default aj;
