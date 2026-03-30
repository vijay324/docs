/**
 * Server-Side Configuration Utility
 * 
 * Centralizes environment variable discovery and provides robust fallbacks.
 */

export const getBackendUrl = () => {
  const envVar = process.env.BACKEND_URL || 
                 process.env.NEXT_PUBLIC_BACKEND_URL || 
                 process.env.NEXT_PUBLIC_API_URL ||
                 process.env.NEXT_PUBLIC_API_BASE_URL; // common alternative
  
  if (!envVar) {
    throw new Error('Missing required environment variable: BACKEND_URL or NEXT_PUBLIC_API_URL.');
  }

  const backendUrl = envVar.endsWith('/') ? envVar.slice(0, -1) : envVar;

  if (process.env.NODE_ENV === 'development') {
    // Determine which variable was used
    let source = 'UNKNOWN';
    if (process.env.BACKEND_URL === envVar) source = 'BACKEND_URL';
    else if (process.env.NEXT_PUBLIC_BACKEND_URL === envVar) source = 'NEXT_PUBLIC_BACKEND_URL';
    else if (process.env.NEXT_PUBLIC_API_URL === envVar) source = 'NEXT_PUBLIC_API_URL';
    else if (process.env.NEXT_PUBLIC_API_BASE_URL === envVar) source = 'NEXT_PUBLIC_API_BASE_URL';

    console.log(`[Config] 🚀 Backend target resolved from ${source}: ${backendUrl}`);

    // Check for common misconfiguration where backend points to the frontend port
    if (backendUrl.includes(':3000')) {
      console.warn('⚠️ WARNING: BACKEND_URL points to port 3000 (standard frontend port). This may cause routing loops or proxy errors.');
    }
  }

  return backendUrl;
};

export const BACKEND_URL = getBackendUrl();
