-- OpenResearch Database Schema (Worker-Compatible)
-- This file contains the SQL schema for the D1 database, matching worker expectations

-- Projects table - stores research projects
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    topic TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planning', -- planning, executing, completed, archived
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT, -- For future multi-user support
    metadata TEXT -- JSON metadata
);

-- Research plans table - stores AI-generated research plans
CREATE TABLE IF NOT EXISTS research_plans (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    plan_data TEXT NOT NULL, -- JSON structure of the complete plan
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Tasks table - individual research tasks from plans
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    query TEXT, -- Research query/question
    task_type TEXT NOT NULL, -- literature_review, current_data, expert_analysis, etc.
    agent_type TEXT NOT NULL DEFAULT 'web', -- web, rag, mcp
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    priority INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES research_plans(id) ON DELETE CASCADE
);

-- Cards table - stores research results/content cards
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    card_type TEXT NOT NULL, -- text_summary, chart, table, quote, image
    content TEXT NOT NULL, -- Main content (markdown/text)
    raw_content TEXT, -- Original raw content from AI
    summary TEXT, -- Brief summary
    metadata TEXT, -- JSON metadata (confidence, source info, etc.)
    embedding_stored BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Citations table - stores source citations for cards
CREATE TABLE IF NOT EXISTS citations (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    title TEXT,
    url TEXT,
    snippet TEXT,
    source_type TEXT, -- web, academic, book, etc.
    confidence REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Reports table - stores generated reports
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- MDX/Markdown content
    language TEXT NOT NULL DEFAULT 'english', -- english, chinese
    report_type TEXT NOT NULL DEFAULT 'bilingual', -- bilingual, summary, detailed
    selected_cards TEXT, -- JSON array of card IDs used
    r2_path TEXT, -- Path in R2 storage
    metadata TEXT, -- JSON metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Execution logs table - stores execution progress and logs
CREATE TABLE IF NOT EXISTS execution_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    task_id TEXT,
    log_level TEXT NOT NULL DEFAULT 'info', -- info, success, error, warning
    message TEXT NOT NULL,
    details TEXT, -- JSON details
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- Embedding metadata table - links to Vectorize embeddings
CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    vector_id TEXT NOT NULL, -- ID in Vectorize
    content_hash TEXT NOT NULL, -- Hash of embedded content
    dimensions INTEGER DEFAULT 1536, -- Updated for Cloudflare Vectorize limit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_research_plans_project_id ON research_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_cards_project_id ON cards(project_id);
CREATE INDEX IF NOT EXISTS idx_cards_task_id ON cards(task_id);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at);
CREATE INDEX IF NOT EXISTS idx_citations_card_id ON citations(card_id);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_language ON reports(language);
CREATE INDEX IF NOT EXISTS idx_execution_logs_project_id ON execution_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_created_at ON execution_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_embeddings_card_id ON embeddings(card_id);