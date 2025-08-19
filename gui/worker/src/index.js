import { cors } from './utils/cors.js';
import { ProjectService } from './services/projectService.js';
import { EmbeddingService } from './services/embeddingService.js';
import { StorageService } from './services/storageService.js';
import { executeResearchPlan } from './handlers/execution.js';

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
      const projectService = new ProjectService(env.DB);
      const embeddingService = new EmbeddingService(env.VECTORIZE, env.AI);
      const storageService = new StorageService(env.REPORTS_BUCKET, env.ASSETS_BUCKET);

      // Route requests
      let response;

      if (path === '/health' && method === 'GET') {
        response = new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      }
      
      // Project endpoints
      else if (path === '/api/projects' && method === 'GET') {
        const projects = await projectService.getAllProjects();
        response = new Response(JSON.stringify(projects));
      }
      
      else if (path === '/api/projects' && method === 'POST') {
        const data = await request.json();
        const project = await projectService.createProject(data);
        response = new Response(JSON.stringify(project), { status: 201 });
      }
      
      else if (path.match(/^\/api\/projects\/[^\/]+$/) && method === 'GET') {
        const projectId = path.split('/').pop();
        const project = await projectService.getProject(projectId);
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
        const plan = await projectService.storeResearchPlan(projectId, data.plan);
        response = new Response(JSON.stringify(plan), { status: 201 });
      }
      
      // Execution endpoints
      else if (path.match(/^\/api\/projects\/[^\/]+\/execute$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        ctx.waitUntil(executeResearchPlan(projectId, env, embeddingService, storageService));
        response = new Response(JSON.stringify({ message: 'Execution started' }), { status: 202 });
      }
      
      // Cards endpoints
      else if (path.match(/^\/api\/projects\/[^\/]+\/cards$/) && method === 'GET') {
        const projectId = path.split('/')[3];
        const cards = await projectService.getProjectCards(projectId);
        response = new Response(JSON.stringify(cards));
      }
      
      else if (path.match(/^\/api\/projects\/[^\/]+\/cards$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        
        // Store card in database
        const card = await projectService.storeCard(projectId, data);
        
        // Store embedding in Vectorize
        try {
          const embeddingResult = await embeddingService.storeCardEmbedding(card.id, data.content, {
            projectId: projectId,
            taskId: data.taskId,
            title: data.title
          });
          console.log('✅ Embedding stored successfully:', embeddingResult);
          
          // Update card to mark embedding as stored
          await projectService.markCardEmbeddingStored(card.id);
        } catch (embeddingError) {
          console.error('❌ Failed to store embedding:', embeddingError);
          // Continue without failing the card creation
        }
        
        // Store card content in R2 as backup
        await storageService.storeCard(projectId, card);
        
        response = new Response(JSON.stringify(card), { status: 201 });
      }
      
      // Semantic search endpoint (text query)
      else if (path.match(/^\/api\/projects\/[^\/]+\/search$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        
        if (data.query) {
          // Text-based search - generate embedding server-side
          const results = await embeddingService.semanticSearch(projectId, data.query, data.limit || 10);
          response = new Response(JSON.stringify(results));
        } else if (data.queryEmbedding) {
          // Vector-based search (for backwards compatibility)
          const results = await embeddingService.vectorSearch(projectId, data.queryEmbedding, data.limit || 10);
          response = new Response(JSON.stringify(results));
        } else {
          response = new Response(JSON.stringify({ error: 'query or queryEmbedding is required' }), { status: 400 });
        }
      }
      
      // Reports endpoints
      else if (path.match(/^\/api\/projects\/[^\/]+\/reports$/) && method === 'GET') {
        const projectId = path.split('/')[3];
        const reports = await projectService.getProjectReports(projectId);
        response = new Response(JSON.stringify(reports));
      }
      
      else if (path.match(/^\/api\/projects\/[^\/]+\/reports$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        
        // Store report in database
        const report = await projectService.storeReport(projectId, data.report);
        
        // Store embedding in Vectorize
        await embeddingService.storeReportEmbedding(report.id, data.report.content, {
          projectId: projectId,
          title: data.report.title,
          language: data.report.language
        });
        
        // Store report content in R2
        const reportPath = await storageService.storeReport(projectId, report);
        
        response = new Response(JSON.stringify({ ...report, r2_path: reportPath }), { status: 201 });
      }

      // Get specific report
      else if (path.match(/^\/api\/projects\/[^\/]+\/reports\/[^\/]+$/) && method === 'GET') {
        const pathParts = path.split('/');
        const projectId = pathParts[3];
        const reportId = pathParts[5];
        
        const report = await projectService.getReport(projectId, reportId);
        if (!report) {
          response = new Response(JSON.stringify({ error: 'Report not found' }), { status: 404 });
        } else {
          response = new Response(JSON.stringify(report));
        }
      }

      // Update specific report
      else if (path.match(/^\/api\/projects\/[^\/]+\/reports\/[^\/]+$/) && method === 'PUT') {
        const pathParts = path.split('/');
        const projectId = pathParts[3];
        const reportId = pathParts[5];
        const data = await request.json();
        
        // Update report in database
        const updatedReport = await projectService.updateReport(projectId, reportId, data);
        
        // Update embedding in Vectorize if content changed
        if (data.content) {
          await embeddingService.updateReportEmbedding(reportId, data.content, {
            projectId: projectId,
            title: data.title,
            language: data.language || 'english'
          });
        }
        
        // Store updated report content in R2
        const reportPath = await storageService.storeReport(projectId, updatedReport);
        
        response = new Response(JSON.stringify({ ...updatedReport, r2_path: reportPath }));
      }
      
      // R2 plan storage endpoint
      else if (path.match(/^\/api\/projects\/[^\/]+\/plans\/r2$/) && method === 'POST') {
        const projectId = path.split('/')[3];
        const data = await request.json();
        const planPath = await storageService.storePlan(projectId, data.planDocument, data.fileName);
        response = new Response(JSON.stringify({ 
          message: 'Plan saved to R2', 
          r2_path: planPath,
          fileName: data.fileName
        }));
      }
      
      // Global search endpoint
      else if (path === '/api/search' && method === 'POST') {
        const data = await request.json();
        
        if (!data.query) {
          response = new Response(JSON.stringify({ error: 'query is required' }), { status: 400 });
        } else {
          // Global search across all projects
          const results = await embeddingService.semanticSearch(null, data.query, data.limit || 20, {});
          response = new Response(JSON.stringify(results));
        }
      }
      
      // Export endpoints
      else if (path.match(/^\/api\/projects\/[^\/]+\/export$/) && method === 'GET') {
        const projectId = path.split('/')[3];
        const exportData = await projectService.exportProject(projectId);
        const exportPath = await storageService.storeExport(projectId, exportData);
        
        response = new Response(JSON.stringify({ 
          message: 'Export created', 
          download_url: exportPath 
        }));
      }
      
      else {
        response = new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
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