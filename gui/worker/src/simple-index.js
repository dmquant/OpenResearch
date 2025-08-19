// Simple worker for testing deployment
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'OpenResearch Worker is running'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      message: 'OpenResearch Worker API',
      endpoints: {
        health: '/health'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};