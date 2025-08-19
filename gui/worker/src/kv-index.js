import { GoogleGenAI } from '@google/genai';
import { AuthService } from './auth.js';

export default {
  async fetch(request, env, ctx) {
    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return cors(new Response());
      }

      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // Initialize auth service
      const authService = new AuthService(env);

      let response;

      // Public endpoints (no auth required)
      const publicEndpoints = ['/health', '/auth/token'];
      
      if (!publicEndpoints.some(endpoint => path.startsWith(endpoint))) {
        // Require authentication for all API endpoints
        const authResult = await authService.authenticate(request);
        
        if (!authResult.authenticated) {
          return cors(authService.createAuthErrorResponse(authResult));
        }

        // Add auth info to request for logging
        request.auth = authResult;
        console.log('Authenticated request:', {
          user: authResult.user,
          tokenType: authResult.tokenType,
          endpoint: `${method} ${path}`
        });
      }

      if (path === '/health' && method === 'GET') {
        response = new Response(JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          message: 'OpenResearch Worker is running',
          storage: 'KV',
          features: ['vectorize', 'r2', 'kv', 'auth'],
          auth: request.auth ? 'authenticated' : 'public'
        }));
      }
      
      // Token generation endpoint (requires admin token)
      else if (path === '/auth/token' && method === 'POST') {
        // This endpoint requires admin authentication
        const adminAuth = await authService.authenticate(request);
        if (!adminAuth.authenticated || adminAuth.tokenType !== 'bearer') {
          return cors(authService.createAuthErrorResponse({
            error: 'Admin authentication required',
            status: 403
          }));
        }

        const { generateApiToken } = await import('./auth.js');
        const newToken = generateApiToken(48);
        
        response = new Response(JSON.stringify({
          token: newToken,
          type: 'bearer',
          created: new Date().toISOString(),
          usage: 'Add as Authorization: Bearer <token> header'
        }), { status: 201 });
      }
      
      // Simple project creation endpoint
      else if (path === '/api/projects' && method === 'POST') {
        const data = await request.json();
        const projectId = crypto.randomUUID();
        const project = {
          id: projectId,
          title: data.title,
          description: data.description,
          topic: data.topic,
          status: 'planning',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        await env.OPENRESEARCH_DATA.put(`project:${projectId}`, JSON.stringify(project));
        response = new Response(JSON.stringify(project), { status: 201 });
      }
      
      // Get project
      else if (path.match(/^\/api\/projects\/[^\/]+$/) && method === 'GET') {
        const projectId = path.split('/').pop();
        const projectData = await env.OPENRESEARCH_DATA.get(`project:${projectId}`);
        
        if (!projectData) {
          response = new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 });
        } else {
          const project = JSON.parse(projectData);
          response = new Response(JSON.stringify(project));
        }
      }
      
      // Generate research plan
      else if (path.match(/^\/api\/projects\/[^\/]+\/plan$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        
        try {
          console.log('Generating plan with API key:', env.GEMINI_API_KEY ? 'Present' : 'Missing');
          const plan = await generateResearchPlan(data.topic, env.GEMINI_API_KEY);
          const planId = crypto.randomUUID();
          const planData = {
            id: planId,
            project_id: projectId,
            title: plan.title,
            description: plan.description,
            plan_data: plan,
            created_at: new Date().toISOString()
          };
          
          await env.OPENRESEARCH_DATA.put(`plan:${planId}`, JSON.stringify(planData));
          response = new Response(JSON.stringify(planData), { status: 201 });
        } catch (error) {
          response = new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
      }
      
      // List projects
      else if (path === '/api/projects' && method === 'GET') {
        const { keys } = await env.OPENRESEARCH_DATA.list({ prefix: 'project:' });
        const projects = [];
        
        for (const key of keys) {
          const projectData = await env.OPENRESEARCH_DATA.get(key.name);
          if (projectData) {
            projects.push(JSON.parse(projectData));
          }
        }
        
        response = new Response(JSON.stringify(projects));
      }
      
      else {
        response = new Response(JSON.stringify({ 
          error: 'Not found',
          available_endpoints: [
            'GET /health',
            'GET /api/projects',
            'POST /api/projects',
            'GET /api/projects/{id}',
            'POST /api/projects/{id}/plan'
          ]
        }), { status: 404 });
      }

      return cors(response);

    } catch (error) {
      console.error('Worker error:', error);
      return cors(new Response(JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }), { status: 500 }));
    }
  },
};

async function generateResearchPlan(topic, geminiApiKey) {
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = `Create a comprehensive research plan for the topic: "${topic}"

Please provide a structured research plan with the following format:
- Title: A clear title for the research plan
- Description: A brief description of what the research will accomplish
- Tasks: In-depth research tasks, each with:
  - Title: Task name
  - Description: What this task will accomplish
  - Query: Specific search query or research question
  - Type: Either "literature_review", "current_data", "expert_analysis", or "comparative_study"

Focus on creating actionable research tasks that would provide comprehensive coverage of the topic.
Respond in JSON format with this structure:

{
  "title": "Research Plan Title",
  "description": "Brief description",
  "tasks": [
    {
      "title": "Task title",
      "description": "Task description", 
      "query": "Specific search query",
      "type": "literature_review"
    }
  ]
}`;

  try {
    const genai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let planData;
    
    try {
      const jsonText = response.text.replace(/```json\n?/g, '').replace(/```/g, '');
      planData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw response:', response.text);
      // Fallback plan
      planData = {
        title: `Research Plan for ${topic}`,
        description: 'AI-generated research plan',
        tasks: [
          {
            title: 'Literature Review',
            description: 'Comprehensive review of existing literature',
            query: `literature review ${topic}`,
            type: 'literature_review'
          },
          {
            title: 'Current Data Analysis',
            description: 'Analysis of current data and trends',
            query: `current data ${topic} 2025`,
            type: 'current_data'
          }
        ]
      };
    }

    return planData;
  } catch (error) {
    console.error('Gemini API error:', error);
    // Return fallback plan if API fails
    return {
      title: `Research Plan for ${topic}`,
      description: 'Fallback research plan due to API error',
      tasks: [
        {
          title: 'Literature Review',
          description: 'Comprehensive review of existing literature',
          query: `literature review ${topic}`,
          type: 'literature_review'
        },
        {
          title: 'Current Data Analysis',
          description: 'Analysis of current data and trends',
          query: `current data ${topic} 2025`,
          type: 'current_data'
        }
      ]
    };
  }
}

function cors(response) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  // Create new response with CORS headers
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers),
      ...corsHeaders,
    },
  });

  return newResponse;
}