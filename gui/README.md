# OpenResearch - Hybrid AI Research Platform

A comprehensive AI-powered research platform that combines intelligent content generation with cloud infrastructure for persistent knowledge management. Built with React and Cloudflare Workers, featuring a complete workflow from research planning to report generation.

## 🚀 Key Features

### 🧠 **Knowledge Base Dashboard**
- **Comprehensive Overview**: Statistics, recent projects, and quick actions
- **Project Management**: Create, track, and manage research projects with status updates
- **Interactive Analytics**: Visual insights into research productivity and project distribution
- **Quick Navigation**: Tab-based interface for efficient content access

### 🔍 **Advanced Search & Discovery**
- **Semantic Search**: AI-powered search across all research content using Cloudflare AI embeddings
- **Rich Content Display**: Clickable search results with expandable content views
- **Global Search**: Find relevant content across all projects and reports
- **Smart Filtering**: Filter by content type, project status, and relevance

### 📊 **Research Workflow**
- **AI-Powered Planning**: Generate structured research plans using Google Gemini 2.5 Flash
- **Task Execution**: Sequential research task processing with real-time progress
- **Card System**: Atomic research content units with semantic organization
- **Bilingual Reports**: Generate comprehensive reports in multiple languages
- **Project Lifecycle**: Automatic status tracking from planning to completion

### ✏️ **WYSIWYG Report Editor**
- **Rich Text Editing**: TipTap-powered editor with comprehensive formatting tools
- **Real-time Auto-save**: Automatic content persistence with status indicators
- **Format Support**: Bold, italic, headings, lists, blockquotes, inline code
- **Export Options**: Export reports to Markdown and HTML formats
- **Seamless Integration**: Direct editing from project details with navigation
- **Backend Sync**: Automatic embedding updates and cloud storage

### ☁️ **Cloud Infrastructure**
- **Cloudflare Workers**: Serverless backend with global edge deployment
- **Persistent Storage**: D1 SQLite database for projects, cards, reports, and metadata
- **Vector Database**: Cloudflare Vectorize for semantic search with BGE embeddings
- **Object Storage**: R2 buckets for content backup and exports
- **Real-time Sync**: Hybrid local/cloud architecture with fallback support

## 🛠️ Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key
- (Optional) Cloudflare account for cloud features

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

   **Note**: This project uses the official `@google/genai` SDK as recommended in the [Gemini API documentation](https://ai.google.dev/gemini-api/docs/quickstart#javascript).

2. **Get your Gemini API key:**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Create a new API key

3. **Configure environment variables:**
   ```bash
   # Create .env file in project root
   cp .env.example .env
   ```

   **Frontend Configuration (.env):**
   ```bash
   # Google Gemini API for AI operations (required)
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GEMINI_MODEL=gemini-2.5-flash

   # Cloud Infrastructure (recommended for full features)
   VITE_WORKER_API_URL=
   VITE_WORKER_API_TOKEN=
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

### ☁️ **Cloud Infrastructure Setup**

The platform includes a complete Cloudflare Workers backend for persistence and advanced features:

1. **Configure Wrangler (Required):**
   ```bash
   # Copy the example configuration
   cp wrangler.toml.example wrangler.toml
   
   # Edit wrangler.toml with your Cloudflare account details:
   # - Update database_id with your D1 database ID
   # - Update account-specific resource IDs as needed
   ```

2. **Worker Deployment:**
   ```bash
   # Deploy the complete worker infrastructure
   ./deploy.sh
   
   # Or manually deploy from worker directory
   cd worker && wrangler deploy
   ```

3. **Database Setup:**
   ```bash
   # Apply database schema
   cd worker && wrangler d1 execute openresearch-db --remote --file=../schema.sql
   ```

4. **Development Commands:**
   ```bash
   # Local worker development
   cd worker && wrangler dev
   
   # View worker logs
   cd worker && wrangler tail openresearch-worker
   
   # Query database
   cd worker && wrangler d1 execute openresearch-db --remote --command="SELECT * FROM projects"
   ```

## 🎯 Usage

### **Creating Research Projects**
1. **Enter Research Topic**: Describe your research question or topic
2. **Generate AI Plan**: Let Gemini AI create a comprehensive research plan
3. **Review & Customize**: Edit tasks, priorities, and research approach
4. **Execute Research**: Run tasks sequentially with AI-powered content generation
5. **Generate Reports**: Create bilingual comprehensive reports from research cards

### **Knowledge Base Dashboard**
- **Overview Tab**: View statistics, recent projects, and quick actions
- **Projects Tab**: Browse all projects with filtering and sorting options
- **Search Tab**: Perform semantic search across all content
- **Analytics Tab**: Review research productivity and project insights

### **Advanced Search**
- Use natural language queries to find relevant content
- Click search results to expand and view full content
- Navigate directly to source projects from search results
- Export search results to markdown files

### **Project Management**
- Track project status: Planning → Executing → Completed
- View detailed project pages with interactive cards and reports
- Explore research cards with expandable content views
- Copy content, export data, and manage project lifecycle

### **WYSIWYG Report Editing**
- **Access Editor**: Click the "Edit" button (✏️) on any report in project details
- **Rich Formatting**: Use the toolbar for bold, italic, headings, lists, quotes, and code
- **Auto-save**: Content automatically saves every 2 seconds (with status indicator)
- **Manual Save**: Use the save button for immediate persistence
- **Export Options**: Download reports as Markdown or HTML files
- **Navigation**: Seamless back-and-forth between editor and project view

## 🏗️ Architecture

### **Hybrid Architecture Pattern**
OpenResearch uses a unique hybrid architecture that separates AI operations from cloud infrastructure:

- **Frontend (AI Operations)**: All Google Gemini AI interactions, embeddings, and content generation
- **Worker (Cloud Infrastructure)**: Cloudflare Workers for storage, search, and data management
- **Fallback Strategy**: Frontend works independently when cloud infrastructure is unavailable

### **Frontend Services** (`src/services/`)
- **HybridLLMService**: Main orchestrator, coordinates local AI with cloud storage
- **LLMAbstractionLayer**: Pure Google Gemini AI interactions and content generation
- **ExecutionEngine**: Sequential task execution with real-time callbacks
- **WorkerApiService**: HTTP client for worker API communication
- **ServiceFactory**: Singleton pattern for service instances

### **Worker Services** (`worker/src/services/`)
- **ProjectService**: D1 database operations (projects, plans, cards, reports)
- **EmbeddingService**: Cloudflare AI embeddings and Vectorize operations
- **StorageService**: R2 object storage for content backup and exports

### **Key Components**
- **KnowledgeDashboard**: Complete dashboard with tabs and statistics
- **ProjectDetails**: Dedicated project view with interactive content
- **SearchResults**: Rich search results with expandable content
- **CardsExplorer**: Modal for browsing project research cards
- **ExecutionPhase**: Real-time research task execution interface
- **WYSIWYGReportEditor**: TipTap-based rich text editor with auto-save and export

## 🧪 Development

### **Project Structure**
```
OpenResearch/
├── src/                    # Frontend React application
│   ├── components/         # React components (Dashboard, Search, Project Details)
│   ├── context/           # State management (WorkflowContext)
│   ├── services/          # Business logic and API clients
│   └── types/             # TypeScript definitions and constants
├── worker/                # Cloudflare Workers backend
│   ├── src/              # Worker source code
│   │   ├── services/     # Backend services (Project, Embedding, Storage)
│   │   └── index.js      # Worker entry point and API routes
│   └── wrangler.toml     # Worker configuration
├── schema.sql            # Database schema for D1
├── deploy.sh            # Complete deployment script
└── CLAUDE.md           # Detailed implementation guidance
```

### **Technology Stack**

**Frontend:**
- **React 19** + **Vite 7** (development and build system)
- **Tailwind CSS v4** (styling with PostCSS)
- **@google/genai v1.12.0** (official Gemini SDK)
- **React Router DOM v7** (navigation)
- **MDX support** for rich content composition

**Backend:**
- **Cloudflare Workers** (serverless edge deployment)
- **D1 Database** (SQLite at the edge)
- **Vectorize** (768-dimension vector database with BGE embeddings)
- **R2 Storage** (object storage for content backup)
- **Cloudflare AI** (@cf/baai/bge-base-en-v1.5 for embeddings)

### **Environment Variables**

**Frontend (.env)**
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key | Required |
| `VITE_GEMINI_MODEL` | Gemini model name | `gemini-2.5-flash` |
| `VITE_WORKER_API_URL` | Worker endpoint URL | Optional |
| `VITE_WORKER_API_TOKEN` | Worker authentication | Optional |

**Worker (Wrangler Secrets)**
| Secret | Description | Command |
|--------|-------------|---------|
| `GEMINI_API_KEY` | Gemini API for legacy endpoints | `wrangler secret put GEMINI_API_KEY` |

### **Development Commands**

**Frontend:**
```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Build production bundle
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

**Worker:**
```bash
cd worker && wrangler dev        # Local worker development
cd worker && wrangler deploy     # Deploy to Cloudflare
cd worker && wrangler tail openresearch-worker  # View logs
```

**Database:**
```bash
# Apply schema changes
cd worker && wrangler d1 execute openresearch-db --remote --file=../schema.sql

# Query database
cd worker && wrangler d1 execute openresearch-db --remote --command="SELECT * FROM projects"
```

## 🚀 **Deployment**

### **Quick Deploy**
```bash
# Complete deployment with infrastructure setup
./deploy.sh
```

### **Production Checklist**
- [ ] Set up Google Gemini API key
- [ ] Configure Cloudflare Workers environment
- [ ] Deploy D1 database schema
- [ ] Set worker secrets for authentication
- [ ] Test semantic search functionality
- [ ] Verify R2 storage permissions

## 🔒 **Security & Best Practices**

### **API Key Management**
- Gemini API keys are used client-side for direct AI interactions
- Worker authentication via VITE_WORKER_API_TOKEN
- Never commit `.env` files to version control
- Consider backend proxy for production API key management

### **Data Privacy**
- All research content stored in user's Cloudflare account
- No data sharing between users
- Local fallback mode available without cloud storage
- Embeddings generated server-side for security

### **Performance Optimization**
- Hybrid architecture for optimal AI response times
- Edge deployment via Cloudflare Workers
- Vector search with cosine similarity
- Chunking for large content handling
- Rate limiting and retry logic for API calls

## 📊 **Current Status**

**✅ Completed Features:**
- Complete hybrid AI research platform
- Knowledge base dashboard with analytics
- Advanced semantic search across all content
- Project lifecycle management with status tracking
- Interactive research cards and expandable content
- Bilingual report generation
- Cloud infrastructure with D1, Vectorize, and R2
- Real-time progress tracking and execution engine

**🚧 Future Enhancements:**
- Multi-user support with authentication
- Advanced analytics and research insights
- Integration with external research databases
- Real-time collaboration features
- Mobile-responsive optimizations
- Advanced export formats and sharing

---

**OpenResearch** - *Transform your research workflow with AI-powered intelligence and cloud persistence* 🧠✨

---

# OpenResearch - 混合AI研究平台

一个集成智能内容生成与云基础设施的综合AI驱动研究平台，为持久化知识管理提供支持。基于React和Cloudflare Workers构建，提供从研究规划到报告生成的完整工作流程。

## 🚀 核心功能

### 🧠 **知识库仪表板**
- **全面概览**：统计数据、最近项目和快速操作
- **项目管理**：创建、跟踪和管理研究项目，包含状态更新
- **交互式分析**：研究生产力和项目分布的可视化洞察
- **快速导航**：选项卡式界面，提供高效的内容访问

### 🔍 **高级搜索与发现**
- **语义搜索**：使用Cloudflare AI嵌入的AI驱动全内容搜索
- **丰富内容展示**：可点击的搜索结果，支持可展开的内容视图
- **全局搜索**：在所有项目和报告中查找相关内容
- **智能过滤**：按内容类型、项目状态和相关性进行过滤

### 📊 **研究工作流程**
- **AI驱动规划**：使用Google Gemini 2.5 Flash生成结构化研究计划
- **任务执行**：顺序研究任务处理，实时进度跟踪
- **卡片系统**：原子化研究内容单元，语义化组织
- **多语言报告**：生成多种语言的综合报告
- **项目生命周期**：从规划到完成的自动状态跟踪

### ✏️ **所见即所得报告编辑器**
- **富文本编辑**：基于TipTap的编辑器，提供全面的格式化工具
- **实时自动保存**：自动内容持久化，带状态指示器
- **格式支持**：粗体、斜体、标题、列表、引用、内联代码
- **导出选项**：导出报告为Markdown和HTML格式
- **无缝集成**：从项目详情直接编辑，支持导航
- **后端同步**：自动嵌入更新和云存储

### ☁️ **云基础设施**
- **Cloudflare Workers**：全球边缘部署的无服务器后端
- **持久化存储**：D1 SQLite数据库，存储项目、卡片、报告和元数据
- **向量数据库**：Cloudflare Vectorize，使用BGE嵌入进行语义搜索
- **对象存储**：R2存储桶，用于内容备份和导出
- **实时同步**：混合本地/云架构，支持回退

## 🛠️ 安装配置

### 前置要求

- Node.js 18+ 
- npm 或 yarn
- Google Gemini API密钥
- （可选）Cloudflare账户，用于云功能

### 安装步骤

1. **克隆并安装依赖：**
   ```bash
   npm install
   ```

   **注意**：此项目使用官方`@google/genai` SDK，如[Gemini API文档](https://ai.google.dev/gemini-api/docs/quickstart#javascript)所推荐。

2. **获取Gemini API密钥：**
   - 访问[Google AI Studio](https://makersuite.google.com/app/apikey)
   - 使用Google账户登录
   - 创建新的API密钥

3. **配置环境变量：**
   ```bash
   # 在项目根目录创建.env文件
   cp .env.example .env
   ```

   **前端配置 (.env)：**
   ```bash
   # Google Gemini API，用于AI操作（必需）
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GEMINI_MODEL=gemini-2.5-flash

   # 云基础设施（推荐，获得完整功能）
   VITE_WORKER_API_URL=
   VITE_WORKER_API_TOKEN=
   ```

4. **启动开发服务器：**
   ```bash
   npm run dev
   ```

### ☁️ **云基础设施配置**

平台包含完整的Cloudflare Workers后端，用于持久化和高级功能：

1. **配置Wrangler（必需）：**
   ```bash
   # 复制示例配置
   cp wrangler.toml.example wrangler.toml
   
   # 编辑wrangler.toml，填入您的Cloudflare账户详情：
   # - 使用您的D1数据库ID更新database_id
   # - 根据需要更新特定账户的资源ID
   ```

2. **Worker部署：**
   ```bash
   # 部署完整的worker基础设施
   ./deploy.sh
   
   # 或从worker目录手动部署
   cd worker && wrangler deploy
   ```

3. **数据库设置：**
   ```bash
   # 应用数据库架构
   cd worker && wrangler d1 execute openresearch-db --remote --file=../schema.sql
   ```

4. **开发命令：**
   ```bash
   # 本地worker开发
   cd worker && wrangler dev
   
   # 查看worker日志
   cd worker && wrangler tail openresearch-worker
   
   # 查询数据库
   cd worker && wrangler d1 execute openresearch-db --remote --command="SELECT * FROM projects"
   ```

## 🎯 使用方法

### **创建研究项目**
1. **输入研究主题**：描述您的研究问题或主题
2. **生成AI计划**：让Gemini AI创建综合研究计划
3. **审查和定制**：编辑任务、优先级和研究方法
4. **执行研究**：使用AI驱动的内容生成顺序运行任务
5. **生成报告**：从研究卡片创建多语言综合报告

### **知识库仪表板**
- **概览选项卡**：查看统计数据、最近项目和快速操作
- **项目选项卡**：浏览所有项目，支持过滤和排序选项
- **搜索选项卡**：对所有内容执行语义搜索
- **分析选项卡**：查看研究生产力和项目洞察

### **高级搜索**
- 使用自然语言查询查找相关内容
- 点击搜索结果展开和查看完整内容
- 从搜索结果直接导航到源项目
- 导出搜索结果为markdown文件

### **项目管理**
- 跟踪项目状态：规划中 → 执行中 → 已完成
- 查看详细的项目页面，包含交互式卡片和报告
- 探索可展开内容视图的研究卡片
- 复制内容、导出数据和管理项目生命周期

### **所见即所得报告编辑**
- **访问编辑器**：在项目详情中点击任何报告的"编辑"按钮（✏️）
- **富格式化**：使用工具栏进行粗体、斜体、标题、列表、引用和代码格式化
- **自动保存**：内容每2秒自动保存（带状态指示器）
- **手动保存**：使用保存按钮立即持久化
- **导出选项**：下载报告为Markdown或HTML文件
- **导航**：编辑器和项目视图间的无缝切换

## 🏗️ 架构

### **混合架构模式**
OpenResearch使用独特的混合架构，将AI操作与云基础设施分离：

- **前端（AI操作）**：所有Google Gemini AI交互、嵌入和内容生成
- **Worker（云基础设施）**：Cloudflare Workers用于存储、搜索和数据管理
- **回退策略**：云基础设施不可用时前端独立工作

### **前端服务** (`src/services/`)
- **HybridLLMService**：主协调器，协调本地AI与云存储
- **LLMAbstractionLayer**：纯Google Gemini AI交互和内容生成
- **ExecutionEngine**：顺序任务执行，实时回调
- **WorkerApiService**：worker API通信的HTTP客户端
- **ServiceFactory**：服务实例的单例模式

### **Worker服务** (`worker/src/services/`)
- **ProjectService**：D1数据库操作（项目、计划、卡片、报告）
- **EmbeddingService**：Cloudflare AI嵌入和Vectorize操作
- **StorageService**：R2对象存储，用于内容备份和导出

### **核心组件**
- **KnowledgeDashboard**：带选项卡和统计的完整仪表板
- **ProjectDetails**：专用项目视图，包含交互式内容
- **SearchResults**：可展开内容的丰富搜索结果
- **CardsExplorer**：浏览项目研究卡片的模态框
- **ExecutionPhase**：实时研究任务执行界面
- **WYSIWYGReportEditor**：基于TipTap的富文本编辑器，支持自动保存和导出

## 🧪 开发

### **项目结构**
```
OpenResearch/
├── src/                    # 前端React应用
│   ├── components/         # React组件（仪表板、搜索、项目详情）
│   ├── context/           # 状态管理（WorkflowContext）
│   ├── services/          # 业务逻辑和API客户端
│   └── types/             # TypeScript定义和常量
├── worker/                # Cloudflare Workers后端
│   ├── src/              # Worker源代码
│   │   ├── services/     # 后端服务（项目、嵌入、存储）
│   │   └── index.js      # Worker入口点和API路由
│   └── wrangler.toml     # Worker配置
├── schema.sql            # D1数据库架构
├── deploy.sh            # 完整部署脚本
└── CLAUDE.md           # 详细实现指南
```

### **技术栈**

**前端：**
- **React 19** + **Vite 7**（开发和构建系统）
- **Tailwind CSS v4**（PostCSS样式）
- **@google/genai v1.12.0**（官方Gemini SDK）
- **React Router DOM v7**（导航）
- **MDX支持**，用于富内容组合

**后端：**
- **Cloudflare Workers**（无服务器边缘部署）
- **D1数据库**（边缘SQLite）
- **Vectorize**（768维向量数据库，使用BGE嵌入）
- **R2存储**（内容备份的对象存储）
- **Cloudflare AI**（@cf/baai/bge-base-en-v1.5用于嵌入）

## 🚀 **部署**

### **快速部署**
```bash
# 完整部署，包含基础设施设置
./deploy.sh
```

### **生产检查清单**
- [ ] 设置Google Gemini API密钥
- [ ] 配置Cloudflare Workers环境
- [ ] 部署D1数据库架构
- [ ] 设置worker认证密钥
- [ ] 测试语义搜索功能
- [ ] 验证R2存储权限

## 🔒 **安全与最佳实践**

### **API密钥管理**
- Gemini API密钥用于客户端直接AI交互
- 通过VITE_WORKER_API_TOKEN进行Worker认证
- 永远不要将`.env`文件提交到版本控制
- 生产环境考虑使用后端代理管理API密钥

### **数据隐私**
- 所有研究内容存储在用户的Cloudflare账户中
- 用户之间无数据共享
- 无云存储时可使用本地回退模式
- 服务器端生成嵌入以确保安全

### **性能优化**
- 混合架构实现最佳AI响应时间
- 通过Cloudflare Workers进行边缘部署
- 使用余弦相似度的向量搜索
- 大内容的分块处理
- API调用的速率限制和重试逻辑

## 📊 **当前状态**

**✅ 已完成功能：**
- 完整的混合AI研究平台
- 带分析的知识库仪表板
- 跨所有内容的高级语义搜索
- 带状态跟踪的项目生命周期管理
- 交互式研究卡片和可展开内容
- 多语言报告生成
- 包含D1、Vectorize和R2的云基础设施
- 实时进度跟踪和执行引擎
- 所见即所得报告编辑器

**🚧 未来增强：**
- 带认证的多用户支持
- 高级分析和研究洞察
- 与外部研究数据库的集成
- 实时协作功能
- 移动响应式优化
- 高级导出格式和共享

---

**OpenResearch** - *使用AI驱动的智能和云持久化转变您的研究工作流程* 🧠✨