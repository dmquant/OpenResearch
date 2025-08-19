/**
 * Authentication middleware for Cloudflare Worker
 * Only allows access from authenticated Wrangler CLI or valid API tokens
 */

export class AuthService {
  constructor(env) {
    this.env = env;
    // Expected API token format: Bearer <token>
    this.validTokens = new Set([
      env.WORKER_API_TOKEN, // Primary API token
      env.ADMIN_API_TOKEN   // Admin token (optional)
    ].filter(Boolean)); // Remove undefined tokens
  }

  /**
   * Verify request authentication
   */
  async authenticate(request) {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return {
        authenticated: false,
        error: 'Missing Authorization header',
        status: 401
      };
    }

    // Check for Bearer token
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (this.validTokens.has(token)) {
        return {
          authenticated: true,
          tokenType: 'bearer',
          user: 'api-user'
        };
      }
    }

    // Check for Cloudflare API token format
    if (authHeader.startsWith('CF-Token ')) {
      const token = authHeader.substring(9);
      
      // Validate against Cloudflare API
      const isValid = await this.validateCloudflareToken(token);
      if (isValid) {
        return {
          authenticated: true,
          tokenType: 'cloudflare',
          user: 'cf-user'
        };
      }
    }

    // Check for Wrangler session token
    if (authHeader.startsWith('Wrangler ')) {
      const sessionData = authHeader.substring(9);
      
      try {
        const session = JSON.parse(atob(sessionData));
        if (await this.validateWranglerSession(session)) {
          return {
            authenticated: true,
            tokenType: 'wrangler',
            user: session.email || 'wrangler-user'
          };
        }
      } catch (e) {
        // Invalid session format
      }
    }

    return {
      authenticated: false,
      error: 'Invalid authentication token',
      status: 403
    };
  }

  /**
   * Validate Cloudflare API token
   */
  async validateCloudflareToken(token) {
    try {
      const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * Validate Wrangler session
   */
  async validateWranglerSession(session) {
    // Check session expiry
    if (session.expires && new Date(session.expires) < new Date()) {
      return false;
    }

    // Validate session token with Cloudflare
    if (session.token) {
      return await this.validateCloudflareToken(session.token);
    }

    return false;
  }

  /**
   * Generate authentication error response
   */
  createAuthErrorResponse(authResult) {
    return new Response(JSON.stringify({
      error: 'Authentication required',
      message: authResult.error || 'Invalid or missing authentication',
      code: 'AUTH_REQUIRED'
    }), {
      status: authResult.status || 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer, CF-Token, Wrangler'
      }
    });
  }

  /**
   * Middleware wrapper for authenticated endpoints
   */
  requireAuth = (handler) => {
    return async (request, env, ctx, ...args) => {
      const authResult = await this.authenticate(request);
      
      if (!authResult.authenticated) {
        return this.createAuthErrorResponse(authResult);
      }

      // Add auth info to request context
      request.auth = authResult;
      
      return handler(request, env, ctx, ...args);
    };
  };
}

/**
 * Generate a secure API token for CLI access
 */
export function generateApiToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create Wrangler session token
 */
export function createWranglerAuthHeader(email, token, expires = null) {
  const session = {
    email,
    token,
    expires: expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    created: new Date().toISOString()
  };
  
  return 'Wrangler ' + btoa(JSON.stringify(session));
}