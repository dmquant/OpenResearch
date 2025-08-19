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
          message: 'OpenResearch Infrastructure Worker',
          storage: 'KV+R2+Vectorize',
          features: ['storage', 'vectorize', 'r2', 'kv', 'auth'],
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
      
      // Project CRUD endpoints
      else if (path === '/api/projects' && method === 'GET') {
        try {
          console.log('🔍 Handling GET /api/projects request');
          const projects = await dataService.getAllProjectsBasic();
          console.log('📊 Projects data retrieved:', { count: projects.length });
          
          const jsonResponse = JSON.stringify(projects);
          console.log('✅ JSON response created successfully, length:', jsonResponse.length);
          
          response = new Response(jsonResponse, {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('❌ Error in GET /api/projects:', error);
          throw error;
        }
      }
      
      else if (path === '/api/projects' && method === 'POST') {
        const data = await request.json();
        const project = await dataService.createProject(data);
        
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
      
      // Plan storage endpoints (frontend generates plan, worker stores it)
      else if (path.match(/^\/api\/projects\/[^\/]+\/plan$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        
        // Frontend sends pre-generated plan data
        const planData = await dataService.createResearchPlan(projectId, data.plan);
        
        await dataService.logActivity(projectId, 'plan_stored', {
          planId: planData.id,
          taskCount: data.plan.tasks.length,
          user: request.auth?.user
        });
        
        response = new Response(JSON.stringify(planData), { status: 201 });
      }
      
      else if (path.match(/^\/api\/projects\/[^\/]+\/plan$/) && method === 'GET') {
        const projectId = path.split('/')[3];
        const plan = await dataService.getProjectPlan(projectId);
        if (!plan) {
          response = new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404 });
        } else {
          response = new Response(JSON.stringify(plan));
        }
      }
      
      // Plan R2 storage endpoint
      else if (path.match(/^\/api\/projects\/[^\/]+\/plans\/r2$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        
        try {
          console.log('💾 Storing plan to R2:', { projectId, fileName: data.fileName });
          
          // Store plan document in R2
          const r2Path = await storageService.storePlanToR2(projectId, data.planDocument, data.fileName);
          
          await dataService.logActivity(projectId, 'plan_saved_to_r2', {
            r2Path: r2Path,
            planId: data.planDocument.id,
            user: request.auth?.user
          });
          
          response = new Response(JSON.stringify({ 
            message: 'Plan saved to R2', 
            r2_path: r2Path,
            success: true
          }), { status: 201 });
          
        } catch (error) {
          console.error('❌ Failed to store plan to R2:', error);
          response = new Response(JSON.stringify({ 
            error: 'Failed to store plan to R2', 
            message: error.message 
          }), { status: 500 });
        }
      }
      
      // Card storage endpoints (frontend generates content, worker stores it)
      else if (path.match(/^\/api\/projects\/[^\/]+\/cards$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        
        // Frontend sends pre-generated card content
        const card = await dataService.createCard(projectId, data.taskId, {
          title: data.title,
          content: data.content,
          type: data.type,
          metadata: data.metadata || {}
        });

        // Store in R2 for backup
        await storageService.storeCardBackup(projectId, card);

        // Store embedding if provided
        if (data.embedding) {
          await embeddingService.storeCardEmbedding(card, projectId, data.embedding);
          
          // Update card to reflect successful embedding storage
          card.embedding_stored = true;
          await dataService.kv.put(`card:${card.id}`, JSON.stringify(card));
        }

        await dataService.logActivity(projectId, 'card_stored', {
          cardId: card.id,
          taskId: data.taskId,
          user: request.auth?.user
        });
        
        response = new Response(JSON.stringify(card), { status: 201 });
      }
      
      else if (path.match(/^\/api\/projects\/[^\/]+\/cards$/) && method === 'GET') {
        const projectId = path.split('/')[3];
        const cards = await dataService.getProjectCards(projectId);
        response = new Response(JSON.stringify(cards));
      }
      
      // Embedding search endpoints
      else if (path.match(/^\/api\/projects\/[^\/]+\/search$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        
        // Frontend sends query embedding
        const results = await embeddingService.semanticSearchWithEmbedding(
          projectId, 
          data.queryEmbedding, 
          data.limit || 10
        );
        response = new Response(JSON.stringify(results));
      }
      
      // Report storage endpoints (frontend generates report, worker stores it)
      else if (path.match(/^\/api\/projects\/[^\/]+\/reports$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        
        try {
          console.log('💾 Storing report:', { 
            projectId, 
            language: data.report.language,
            hasEmbedding: !!data.report.embedding 
          });
          
          // Frontend sends pre-generated report
          const r2Path = await storageService.storeReport(projectId, data.report);
          const savedReport = await dataService.saveReport(projectId, data.report, r2Path);
          
          // Store embedding if provided
          if (data.report.embedding) {
            console.log('🧮 Storing report embedding to Vectorize');
            await embeddingService.storeReportEmbedding(savedReport, projectId, data.report.embedding);
          }
          
          await dataService.logActivity(projectId, 'report_stored', {
            reportId: savedReport.id,
            language: data.report.language,
            r2Path: r2Path,
            hasEmbedding: !!data.report.embedding,
            user: request.auth?.user
          });
          
          response = new Response(JSON.stringify({ 
            ...savedReport, 
            r2_path: r2Path,
            embedding_stored: !!data.report.embedding
          }), { status: 201 });
          
        } catch (error) {
          console.error('❌ Failed to store report:', error);
          response = new Response(JSON.stringify({ 
            error: 'Failed to store report', 
            message: error.message 
          }), { status: 500 });
        }
      }
      
      // Export endpoints
      else if (path.match(/^\/api\/projects\/[^\/]+\/export$/) && method === 'GET') {
        const projectId = path.split('/')[3];
        
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
      }
      
      else {
        response = new Response(JSON.stringify({ 
          error: 'Not found',
          available_endpoints: [
            'GET /health',
            'GET /api/projects',
            'POST /api/projects',
            'GET /api/projects/{id}',
            'POST /api/projects/{id}/plan (store plan)',
            'GET /api/projects/{id}/plan',
            'POST /api/projects/{id}/cards (store card)',
            'GET /api/projects/{id}/cards',
            'POST /api/projects/{id}/search (with embedding)',
            'POST /api/projects/{id}/reports (store report)',
            'GET /api/projects/{id}/export'
          ]
        }), { status: 404 });
      }

      return cors(response);

    } catch (error) {
      console.error('Infrastructure worker error:', error);
      return cors(new Response(JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }), { status: 500 }));
    }
  },
};

// Data Service - Pure storage operations
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
      metadata: data.metadata || {}
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
      this.getProjectLogs(projectId, 10)
    ]);
    
    return {
      ...project,
      plan,
      cards,
      recent_logs: logs
    };
  }

  async getAllProjectsBasic() {
    try {
      const { keys } = await this.kv.list({ prefix: 'project:' });
      const projects = [];
      
      console.log('📊 Getting basic projects:', { 
        keyCount: keys.length,
        keyNames: keys.slice(0, 5).map(k => k.name)
      });
      
      for (const key of keys) {
        // Skip non-project keys (like project:id:plan, project:id:logs, etc.)
        if (key.name.split(':').length > 2) {
          console.log('⏭️ Skipping non-project key:', key.name);
          continue;
        }
        
        try {
          const projectData = await this.kv.get(key.name);
          if (projectData) {
            const parsedProject = JSON.parse(projectData);
            projects.push(parsedProject);
            console.log('✅ Parsed project:', { id: parsedProject.id, title: parsedProject.title });
          }
        } catch (parseError) {
          console.error(`❌ Error parsing project data for key ${key.name}:`, parseError);
          console.error('Raw data (first 100 chars):', projectData?.substring(0, 100));
          // Skip malformed projects rather than failing entirely
        }
      }
      
      const sortedProjects = projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      console.log('✅ Basic projects retrieved successfully:', { count: sortedProjects.length });
      return sortedProjects;
      
    } catch (error) {
      console.error('❌ Error in getAllProjectsBasic:', error);
      throw error;
    }
  }

  async getAllProjects() {
    try {
      const { keys } = await this.kv.list({ prefix: 'project:' });
      const projects = [];
      
      console.log('📊 Getting all projects:', { keyCount: keys.length });
      
      for (const key of keys) {
        try {
          const projectData = await this.kv.get(key.name);
          if (projectData) {
            const parsedProject = JSON.parse(projectData);
            projects.push(parsedProject);
          }
        } catch (parseError) {
          console.error(`❌ Error parsing project data for key ${key.name}:`, parseError);
          console.error('Raw data:', projectData);
          // Skip malformed projects rather than failing entirely
        }
      }
      
      const sortedProjects = projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      console.log('✅ Projects retrieved successfully:', { count: sortedProjects.length });
      return sortedProjects;
      
    } catch (error) {
      console.error('❌ Error in getAllProjects:', error);
      throw error;
    }
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
      r2_path: `cards/${projectId}/${cardId}.json`, // KV references R2 content
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

// Storage Service - R2 operations
class StorageService {
  constructor(env) {
    this.reportsBucket = env.REPORTS_BUCKET;
    this.assetsBucket = env.ASSETS_BUCKET;
  }

  async storeReport(projectId, report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${projectId}/${report.language}/${timestamp}-${report.report_type}.mdx`;
    
    console.log('🔍 Attempting to store report:', {
      fileName,
      projectId,
      contentLength: report.content?.length,
      bucketAvailable: !!this.reportsBucket
    });

    try {
      const result = await this.reportsBucket.put(fileName, report.content, {
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

      console.log(`✅ Stored report in R2: ${fileName}`, result);
      return fileName;
    } catch (error) {
      console.error('❌ Failed to store report in R2:', error);
      throw error;
    }
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
    return `https://assets.openresearch.dev/${fileName}`;
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

  async storePlanToR2(projectId, planDocument, fileName) {
    const planFileName = `plans/${projectId}/${fileName}`;
    
    console.log('💾 Storing plan to R2:', {
      planFileName,
      projectId,
      planId: planDocument.id,
      contentLength: JSON.stringify(planDocument).length
    });

    try {
      const result = await this.assetsBucket.put(planFileName, JSON.stringify(planDocument, null, 2), {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: {
          projectId: projectId,
          planId: planDocument.id,
          planTitle: planDocument.title,
          taskCount: planDocument.tasks?.length || 0,
          contentType: 'research_plan',
          createdAt: planDocument.metadata?.createdAt || new Date().toISOString()
        }
      });

      console.log(`✅ Stored plan in R2: ${planFileName}`, result);
      return planFileName;

    } catch (error) {
      console.error('❌ Failed to store plan in R2:', error);
      throw error;
    }
  }
}

// Embedding Service - Vectorize operations (no AI generation)
class EmbeddingService {
  constructor(env) {
    this.vectorize = env.VECTORIZE;
  }

  async storeCardEmbedding(card, projectId, embedding) {
    try {
      const vectorData = {
        id: card.id,
        values: embedding,
        metadata: {
          projectId: projectId,
          cardId: card.id,
          title: card.title,
          cardType: card.card_type,
          contentPreview: card.content.substring(0, 200),
          contentType: 'research_card',
          r2Path: `cards/${projectId}/${card.id}.json`,
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

  async storeReportEmbedding(report, projectId, embedding) {
    try {
      const vectorData = {
        id: `report-${report.id}`,
        values: embedding,
        metadata: {
          projectId: projectId,
          reportId: report.id,
          title: report.title,
          language: report.language,
          reportType: report.report_type,
          contentPreview: report.content ? report.content.substring(0, 200) : 'No content preview',
          contentType: 'bilingual_report',
          r2Path: report.r2_path,
          timestamp: new Date().toISOString()
        }
      };

      await this.vectorize.upsert([vectorData]);
      console.log(`✅ Stored embedding for report: ${report.id}`);
      
      return { success: true, vectorId: `report-${report.id}` };
    } catch (error) {
      console.error('Error storing report embedding:', error);
      throw error;
    }
  }

  async semanticSearchWithEmbedding(projectId, queryEmbedding, limit = 10) {
    try {
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
        contentType: match.metadata?.contentType,
        r2Path: match.metadata?.r2Path, // Link back to R2 full content
        metadata: match.metadata
      }));
    } catch (error) {
      console.error('Error in semantic search:', error);
      throw error;
    }
  }
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