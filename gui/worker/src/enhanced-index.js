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

      // Initialize services
      const authService = new AuthService(env);
      const dataService = new DataService(env);
      const storageService = new StorageService(env);
      const embeddingService = new EmbeddingService(env);

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
          storage: 'KV+R2+Vectorize',
          features: ['vectorize', 'r2', 'kv', 'auth', 'embeddings'],
          auth: request.auth ? 'authenticated' : 'public'
        }));
      }
      
      // Token generation endpoint (requires admin token)
      else if (path === '/auth/token' && method === 'POST') {
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
      
      // Project endpoints
      else if (path === '/api/projects' && method === 'GET') {
        const projects = await dataService.getAllProjects();
        response = new Response(JSON.stringify(projects));
      }
      
      else if (path === '/api/projects' && method === 'POST') {
        const data = await request.json();
        const project = await dataService.createProject(data);
        
        // Log project creation
        await dataService.logActivity(project.id, 'project_created', {
          title: project.title,
          topic: project.topic,
          user: request.auth?.user
        });
        
        response = new Response(JSON.stringify(project), { status: 201 });
      }
      
      else if (path.match(/^\/api\/projects\/[^\/]+$/) && method === 'GET') {
        const projectId = path.split('/').pop();
        const project = await dataService.getProject(projectId);
        if (!project) {
          response = new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 });
        } else {
          response = new Response(JSON.stringify(project));
        }
      }
      
      // Research plan endpoints
      else if (path.match(/^\/api\/projects\/[^\/]+\/plan$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        
        try {
          const plan = await generateResearchPlan(data.topic, env.GEMINI_API_KEY);
          const planData = await dataService.createResearchPlan(projectId, plan);
          
          // Log plan creation
          await dataService.logActivity(projectId, 'plan_created', {
            planId: planData.id,
            taskCount: plan.tasks.length,
            user: request.auth?.user
          });
          
          response = new Response(JSON.stringify(planData), { status: 201 });
        } catch (error) {
          await dataService.logActivity(projectId, 'plan_failed', {
            error: error.message,
            user: request.auth?.user
          });
          response = new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
      }
      
      // Execution endpoints
      else if (path.match(/^\/api\/projects\/[^\/]+\/execute$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        
        try {
          // Start background execution
          ctx.waitUntil(executeProject(projectId, env, dataService, storageService, embeddingService));
          
          await dataService.logActivity(projectId, 'execution_started', {
            user: request.auth?.user
          });
          
          response = new Response(JSON.stringify({ 
            message: 'Execution started in background',
            projectId 
          }), { status: 202 });
        } catch (error) {
          response = new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
      }
      
      // Cards endpoints
      else if (path.match(/^\/api\/projects\/[^\/]+\/cards$/) && method === 'GET') {
        const projectId = path.split('/')[3];
        const cards = await dataService.getProjectCards(projectId);
        response = new Response(JSON.stringify(cards));
      }
      
      // Semantic search endpoint
      else if (path.match(/^\/api\/projects\/[^\/]+\/search$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        const results = await embeddingService.semanticSearch(projectId, data.query, data.limit || 10);
        response = new Response(JSON.stringify(results));
      }
      
      // Reports endpoints
      else if (path.match(/^\/api\/projects\/[^\/]+\/reports$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        
        try {
          const report = await generateReport(projectId, data, env.GEMINI_API_KEY, dataService);
          
          // Store report in R2
          const r2Path = await storageService.storeReport(projectId, report);
          
          // Save report metadata
          const savedReport = await dataService.saveReport(projectId, report, r2Path);
          
          await dataService.logActivity(projectId, 'report_generated', {
            reportId: savedReport.id,
            language: report.language,
            r2Path: r2Path,
            user: request.auth?.user
          });
          
          response = new Response(JSON.stringify({ 
            ...savedReport, 
            r2_path: r2Path 
          }), { status: 201 });
        } catch (error) {
          response = new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
      }
      
      // Export endpoints
      else if (path.match(/^\/api\/projects\/[^\/]+\/export$/) && method === 'GET') {
        const projectId = path.split('/')[3];
        
        try {
          const exportData = await dataService.exportProject(projectId);
          const exportPath = await storageService.storeExport(projectId, exportData);
          
          await dataService.logActivity(projectId, 'project_exported', {
            exportPath: exportPath,
            user: request.auth?.user
          });
          
          response = new Response(JSON.stringify({ 
            message: 'Export created', 
            download_url: exportPath 
          }));
        } catch (error) {
          response = new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
      }
      
      else {
        response = new Response(JSON.stringify({ 
          error: 'Not found',
          available_endpoints: [
            'GET /health',
            'GET /api/projects',
            'POST /api/projects',
            'GET /api/projects/{id}',
            'POST /api/projects/{id}/plan',
            'POST /api/projects/{id}/execute',
            'GET /api/projects/{id}/cards',
            'POST /api/projects/{id}/search',
            'POST /api/projects/{id}/reports',
            'GET /api/projects/{id}/export'
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

// Enhanced Data Service with comprehensive KV storage
class DataService {
  constructor(env) {
    this.kv = env.OPENRESEARCH_DATA;
  }

  async createProject(data) {
    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const project = {
      id: projectId,
      title: data.title,
      description: data.description,
      topic: data.topic,
      status: 'planning',
      created_at: now,
      updated_at: now,
      user_id: data.userId || null,
      metadata: {}
    };
    
    await this.kv.put(`project:${projectId}`, JSON.stringify(project));
    return project;
  }

  async getProject(projectId) {
    const projectData = await this.kv.get(`project:${projectId}`);
    if (!projectData) return null;
    
    const project = JSON.parse(projectData);
    
    // Get related data
    const [plan, cards, logs] = await Promise.all([
      this.getProjectPlan(projectId),
      this.getProjectCards(projectId),
      this.getProjectLogs(projectId, 10) // Last 10 logs
    ]);
    
    return {
      ...project,
      plan,
      cards,
      recent_logs: logs
    };
  }

  async getAllProjects() {
    const { keys } = await this.kv.list({ prefix: 'project:' });
    const projects = [];
    
    for (const key of keys) {
      const projectData = await this.kv.get(key.name);
      if (projectData) {
        projects.push(JSON.parse(projectData));
      }
    }
    
    return projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async createResearchPlan(projectId, plan) {
    const planId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const planData = {
      id: planId,
      project_id: projectId,
      title: plan.title,
      description: plan.description,
      plan_data: plan,
      created_at: now,
      updated_at: now
    };
    
    await this.kv.put(`plan:${planId}`, JSON.stringify(planData));
    await this.kv.put(`project:${projectId}:plan`, planId);
    
    return planData;
  }

  async getProjectPlan(projectId) {
    const planId = await this.kv.get(`project:${projectId}:plan`);
    if (!planId) return null;
    
    const planData = await this.kv.get(`plan:${planId}`);
    return planData ? JSON.parse(planData) : null;
  }

  async createCard(projectId, taskId, cardData) {
    const cardId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const card = {
      id: cardId,
      project_id: projectId,
      task_id: taskId,
      title: cardData.title,
      card_type: cardData.type || 'text_summary',
      content: cardData.content,
      summary: cardData.content.substring(0, 200) + '...',
      metadata: cardData.metadata || {},
      embedding_stored: false,
      created_at: now,
      updated_at: now
    };
    
    await this.kv.put(`card:${cardId}`, JSON.stringify(card));
    
    // Add to project's card list
    const cardListKey = `project:${projectId}:cards`;
    const existingCards = await this.kv.get(cardListKey);
    const cardList = existingCards ? JSON.parse(existingCards) : [];
    cardList.push(cardId);
    await this.kv.put(cardListKey, JSON.stringify(cardList));
    
    return card;
  }

  async getProjectCards(projectId) {
    const cardListKey = `project:${projectId}:cards`;
    const cardList = await this.kv.get(cardListKey);
    if (!cardList) return [];
    
    const cardIds = JSON.parse(cardList);
    const cards = [];
    
    for (const cardId of cardIds) {
      const cardData = await this.kv.get(`card:${cardId}`);
      if (cardData) {
        cards.push(JSON.parse(cardData));
      }
    }
    
    return cards;
  }

  async saveReport(projectId, report, r2Path) {
    const reportId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const reportData = {
      id: reportId,
      project_id: projectId,
      title: report.title,
      language: report.language,
      report_type: report.report_type,
      r2_path: r2Path,
      created_at: now,
      updated_at: now
    };
    
    await this.kv.put(`report:${reportId}`, JSON.stringify(reportData));
    
    // Add to project's report list
    const reportListKey = `project:${projectId}:reports`;
    const existingReports = await this.kv.get(reportListKey);
    const reportList = existingReports ? JSON.parse(existingReports) : [];
    reportList.push(reportId);
    await this.kv.put(reportListKey, JSON.stringify(reportList));
    
    return reportData;
  }

  async logActivity(projectId, activity, details = {}) {
    const logId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const logEntry = {
      id: logId,
      project_id: projectId,
      activity,
      details,
      timestamp: now
    };
    
    await this.kv.put(`log:${logId}`, JSON.stringify(logEntry));
    
    // Add to project's log list (keep last 100)
    const logListKey = `project:${projectId}:logs`;
    const existingLogs = await this.kv.get(logListKey);
    const logList = existingLogs ? JSON.parse(existingLogs) : [];
    logList.unshift(logId); // Add to beginning
    
    // Keep only last 100 logs
    if (logList.length > 100) {
      const removedLogIds = logList.splice(100);
      // Clean up old log entries
      for (const oldLogId of removedLogIds) {
        await this.kv.delete(`log:${oldLogId}`);
      }
    }
    
    await this.kv.put(logListKey, JSON.stringify(logList));
    
    return logEntry;
  }

  async getProjectLogs(projectId, limit = 50) {
    const logListKey = `project:${projectId}:logs`;
    const logList = await this.kv.get(logListKey);
    if (!logList) return [];
    
    const logIds = JSON.parse(logList).slice(0, limit);
    const logs = [];
    
    for (const logId of logIds) {
      const logData = await this.kv.get(`log:${logId}`);
      if (logData) {
        logs.push(JSON.parse(logData));
      }
    }
    
    return logs;
  }

  async exportProject(projectId) {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const allLogs = await this.getProjectLogs(projectId, 1000);
    
    return {
      project,
      logs: allLogs,
      exported_at: new Date().toISOString()
    };
  }
}

// Enhanced Storage Service with R2 integration
class StorageService {
  constructor(env) {
    this.reportsBucket = env.REPORTS_BUCKET;
    this.assetsBucket = env.ASSETS_BUCKET;
  }

  async storeReport(projectId, report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${projectId}/${report.language}/${timestamp}-${report.report_type}.mdx`;
    
    await this.reportsBucket.put(fileName, report.content, {
      httpMetadata: {
        contentType: 'text/markdown',
      },
      customMetadata: {
        projectId: projectId,
        language: report.language,
        reportType: report.report_type,
        title: report.title,
        createdAt: timestamp
      }
    });

    console.log(`✅ Stored report in R2: ${fileName}`);
    return fileName;
  }

  async storeExport(projectId, exportData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `exports/${projectId}/${timestamp}-export.json`;
    
    await this.assetsBucket.put(fileName, JSON.stringify(exportData, null, 2), {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        projectId: projectId,
        exportType: 'full',
        createdAt: timestamp
      }
    });

    console.log(`✅ Stored export in R2: ${fileName}`);
    return `https://assets.openresearch.dev/${fileName}`; // Return public URL
  }

  async storeCardBackup(projectId, card) {
    const fileName = `cards/${projectId}/${card.id}.json`;
    
    await this.assetsBucket.put(fileName, JSON.stringify(card, null, 2), {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        projectId: projectId,
        cardId: card.id,
        cardType: card.card_type,
        createdAt: card.created_at
      }
    });

    console.log(`✅ Stored card backup in R2: ${fileName}`);
    return fileName;
  }
}

// Enhanced Embedding Service with Vectorize integration
class EmbeddingService {
  constructor(env) {
    this.vectorize = env.VECTORIZE;
    this.geminiApiKey = env.GEMINI_API_KEY;
    this.embeddingModel = env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
  }

  async generateEmbedding(text) {
    const genai = new GoogleGenAI(this.geminiApiKey);
    const model = genai.getGenerativeModel({ model: this.embeddingModel });
    
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async storeCardEmbedding(card, projectId) {
    try {
      const embedding = await this.generateEmbedding(card.content);
      
      const vectorData = {
        id: card.id,
        values: embedding,
        metadata: {
          projectId: projectId,
          cardId: card.id,
          title: card.title,
          cardType: card.card_type,
          contentPreview: card.content.substring(0, 200),
          timestamp: new Date().toISOString()
        }
      };

      await this.vectorize.upsert([vectorData]);
      console.log(`✅ Stored embedding for card: ${card.id}`);
      
      return { success: true, vectorId: card.id };
    } catch (error) {
      console.error('Error storing embedding:', error);
      throw error;
    }
  }

  async semanticSearch(projectId, query, limit = 10) {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      const searchResults = await this.vectorize.query(queryEmbedding, {
        topK: limit,
        filter: { projectId: projectId },
        returnMetadata: true
      });

      return searchResults.matches.map(match => ({
        cardId: match.id,
        score: match.score,
        title: match.metadata?.title,
        content: match.metadata?.contentPreview,
        metadata: match.metadata
      }));
    } catch (error) {
      console.error('Error in semantic search:', error);
      throw error;
    }
  }
}

// Background execution function
async function executeProject(projectId, env, dataService, storageService, embeddingService) {
  try {
    await dataService.logActivity(projectId, 'execution_background_started');
    
    const project = await dataService.getProject(projectId);
    if (!project || !project.plan) {
      throw new Error('Project or plan not found');
    }

    // Simulate task execution and card generation
    const tasks = project.plan.plan_data.tasks;
    
    for (const [index, task] of tasks.entries()) {
      await dataService.logActivity(projectId, 'task_started', { 
        taskIndex: index, 
        taskTitle: task.title 
      });

      try {
        // Generate content for this task
        const cardContent = await generateTaskContent(task, env.GEMINI_API_KEY);
        
        // Create card
        const card = await dataService.createCard(projectId, `task-${index}`, {
          title: task.title,
          content: cardContent,
          type: 'text_summary',
          metadata: {
            taskType: task.type,
            query: task.query,
            confidence: 0.8
          }
        });

        // Store embedding
        await embeddingService.storeCardEmbedding(card, projectId);
        
        // Store card backup in R2
        await storageService.storeCardBackup(projectId, card);

        await dataService.logActivity(projectId, 'task_completed', {
          taskIndex: index,
          cardId: card.id,
          taskTitle: task.title
        });

      } catch (taskError) {
        await dataService.logActivity(projectId, 'task_failed', {
          taskIndex: index,
          error: taskError.message
        });
      }
    }

    await dataService.logActivity(projectId, 'execution_completed', {
      tasksProcessed: tasks.length
    });

  } catch (error) {
    await dataService.logActivity(projectId, 'execution_failed', {
      error: error.message
    });
    console.error('Background execution failed:', error);
  }
}

// Helper functions
async function generateResearchPlan(topic, geminiApiKey) {
  const genai = new GoogleGenAI(geminiApiKey);
  const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });
  const response = await model.generateContent(`Create a comprehensive research plan for: "${topic}"

Please provide a structured research plan with the following JSON format:
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
}`);

  try {
    const jsonText = response.text.replace(/```json\n?/g, '').replace(/```/g, '');
    return JSON.parse(jsonText);
  } catch (parseError) {
    return {
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
}

async function generateTaskContent(task, geminiApiKey) {
  const genai = new GoogleGenAI(geminiApiKey);
  const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });
  const response = await model.generateContent(`Research Task: ${task.title}
Description: ${task.description}
Query: ${task.query}

Please provide comprehensive research content for this task. Include key findings, insights, and relevant information.`);

  return response.text;
}

async function generateReport(projectId, data, geminiApiKey, dataService) {
  const cards = await dataService.getProjectCards(projectId);
  const selectedCards = cards.filter(card => 
    data.selectedCardIds.includes(card.id)
  );

  const genai = new GoogleGenAI(geminiApiKey);
  const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });
  const cardContents = selectedCards.map(card => 
    `## ${card.title}\n\n${card.content}`
  ).join('\n\n---\n\n');

  const response = await model.generateContent(`Create a comprehensive research report based on the following research cards.

Language: ${data.language || 'english'}

Research Cards:
${cardContents}

Please create a well-structured report in MDX format with proper sections and headings.`);

  return {
    id: crypto.randomUUID(),
    title: `Research Report`,
    content: response.text,
    language: data.language || 'english',
    report_type: 'comprehensive',
    created_at: new Date().toISOString()
  };
}

function cors(response) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers),
      ...corsHeaders,
    },
  });
}