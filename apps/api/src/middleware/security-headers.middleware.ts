/**
 * Security Headers Middleware
 * 
 * Sets security headers for all HTTP responses.
 * SOC 2: CC6.1 (Logical and physical access controls)
 * 
 * Headers:
 * - X-Content-Type-Options: nosniff (prevent MIME type sniffing)
 * - X-Frame-Options: DENY (prevent clickjacking)
 * - X-XSS-Protection: 1; mode=block (XSS protection)
 * - Referrer-Policy: strict-origin-when-cross-origin (control referrer information)
 * - Content-Security-Policy: default-src 'self' (CSP, basic)
 */

import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");
    
    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");
    
    // XSS protection (legacy, but still useful for older browsers)
    res.setHeader("X-XSS-Protection", "1; mode=block");
    
    // Control referrer information
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    
    // Content Security Policy (basic, can be extended per route)
    // Default: only allow resources from same origin
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';"
    );
    
    // Remove X-Powered-By header (information disclosure)
    res.removeHeader("X-Powered-By");
    
    next();
  }
}

