# OpenResearch 架构图表

## 1. 系统架构概览

```mermaid
graph TB
    %% 前端层
    subgraph "前端 (React + Vite)"
        UI[Web UI 组件]
        WF[工作流上下文]
        SVC[服务层]
        UI --> WF
        WF --> SVC
    end

    %% 前端服务
    subgraph "前端服务"
        HLS[混合LLM服务]
        LLM[LLM抽象层]
        WAS[Worker API服务]
        EE[执行引擎]
        SF[服务工厂]
        
        SVC --> HLS
        HLS --> LLM
        HLS --> WAS
        HLS --> EE
        SF --> HLS
    end

    %% 外部AI服务
    subgraph "外部AI"
        GEMINI[Google Gemini API]
        LLM --> GEMINI
    end

    %% Cloudflare Worker层
    subgraph "Cloudflare Worker"
        API[API路由]
        PS[项目服务]
        ES[嵌入服务]
        SS[存储服务]
        
        API --> PS
        API --> ES
        API --> SS
    end

    %% Cloudflare基础设施
    subgraph "Cloudflare基础设施"
        D1[(D1数据库)]
        VZ[Vectorize索引]
        R2[R2存储]
        AI[Workers AI]
        
        PS --> D1
        ES --> VZ
        ES --> AI
        SS --> R2
    end

    %% 连接
    WAS -.->|HTTP/REST| API
    
    %% 样式
    classDef frontend fill:#e1f5fe
    classDef worker fill:#f3e5f5
    classDef infrastructure fill:#e8f5e8
    classDef external fill:#fff3e0
    
    class UI,WF,SVC frontend
    class API,PS,ES,SS worker
    class D1,VZ,R2,AI infrastructure
    class GEMINI external
```

## 2. 数据流架构

```mermaid
flowchart TD
    %% 用户操作
    User[用户输入] --> Topic[主题定义]
    Topic --> Plan[计划生成]
    Plan --> Exec[任务执行]
    Exec --> Report[报告生成]
    Report --> Search[搜索和发现]

    %% 计划生成流程
    subgraph "计划生成"
        Plan --> LLM1[Gemini LLM]
        LLM1 --> PlanData[计划结构]
        PlanData --> StoreP[存储计划]
        StoreP --> D1P[(D1: research_plans)]
        StoreP --> R2P[R2: 计划备份]
    end

    %% 任务执行流程
    subgraph "任务执行"
        Exec --> TaskQ[任务队列]
        TaskQ --> GenCard[生成卡片]
        GenCard --> LLM2[Gemini LLM]
        LLM2 --> Card[研究卡片]
        Card --> StoreC[存储卡片]
        StoreC --> D1C[(D1: cards)]
        StoreC --> Embed[生成嵌入]
        Embed --> AI[Cloudflare AI]
        AI --> BGE[BGE模型]
        BGE --> VZ[(Vectorize索引)]
        StoreC --> R2C[R2: 卡片备份]
    end

    %% 报告生成流程
    subgraph "报告生成"
        Report --> Gather[收集卡片]
        Gather --> D1C
        Gather --> LLM3[Gemini LLM]
        LLM3 --> RptData[报告内容]
        RptData --> StoreR[存储报告]
        StoreR --> D1R[(D1: reports)]
        StoreR --> EmbedR[生成嵌入]
        EmbedR --> AI
        StoreR --> R2R[R2: 报告存储]
    end

    %% 搜索流程
    subgraph "搜索和发现"
        Search --> Query[搜索查询]
        Query --> QEmbed[查询嵌入]
        QEmbed --> AI
        QEmbed --> VSearch[向量搜索]
        VSearch --> VZ
        VZ --> Results[搜索结果]
        Results --> Fetch[获取完整内容]
        Fetch --> D1C
        Fetch --> D1R
    end

    %% 样式
    classDef process fill:#e3f2fd
    classDef storage fill:#e8f5e8
    classDef ai fill:#fff3e0
    classDef user fill:#fce4ec
    
    class User,Topic,Plan,Exec,Report,Search user
    class LLM1,LLM2,LLM3,GenCard,Embed,EmbedR,QEmbed process
    class D1P,D1C,D1R,R2P,R2C,R2R,VZ storage
    class AI,BGE,GEMINI ai
```

## 3. 嵌入管道架构

```mermaid
sequenceDiagram
    participant F as 前端
    participant W as Worker API
    participant PS as 项目服务
    participant ES as 嵌入服务
    participant AI as Cloudflare AI
    participant VZ as Vectorize
    participant D1 as D1数据库

    %% 卡片创建与嵌入
    F->>W: POST /api/projects/{id}/cards
    Note over F,W: {title, content, type, metadata}
    
    W->>PS: storeCard(data)
    PS->>D1: INSERT INTO cards
    D1-->>PS: 卡片记录
    PS-->>W: 卡片对象
    
    W->>ES: storeCardEmbedding(cardId, content, metadata)
    
    %% 分块处理
    ES->>ES: chunkText(content)
    Note over ES: 如果>8KB则分块，保留边界
    
    %% 嵌入生成
    loop 为每个块
        ES->>AI: run("@cf/baai/bge-base-en-v1.5", {text: chunk})
        AI-->>ES: 768维嵌入向量
        
        ES->>ES: prepareMetadata(projectId, cardId, chunkIndex)
        Note over ES: 最小元数据 < 10KB
        
        ES->>VZ: upsert({id, values, metadata})
        VZ-->>ES: 成功
    end
    
    ES-->>W: 嵌入结果
    W->>PS: markCardEmbeddingStored(cardId)
    PS->>D1: UPDATE cards SET embedding_stored=true
    
    W-->>F: 返回embedding_stored: true的卡片

    %% 搜索过程
    F->>W: POST /api/search
    Note over F,W: {query: "搜索词", limit: 20}
    
    W->>ES: semanticSearch(null, query, limit)
    ES->>AI: run("@cf/baai/bge-base-en-v1.5", {text: query})
    AI-->>ES: 查询嵌入
    
    ES->>VZ: query(queryEmbedding, {topK: min(limit*2, 50)})
    Note over ES,VZ: 遵守50结果限制与元数据
    VZ-->>ES: 搜索匹配
    
    ES->>ES: deduplicateByCardId(matches)
    Note over ES: 分组块，保留最高分数
    
    ES-->>W: 去重结果
    W-->>F: 带元数据的搜索结果
```

## 4. API端点结构

```mermaid
graph LR
    %% 主要API路由
    subgraph "核心API端点"
        Projects["/api/projects"]
        Search["/api/search"]
        Health["/health"]
    end

    %% 项目端点
    subgraph "项目操作"
        Projects --> GetProjects["GET / - 列出所有项目"]
        Projects --> CreateProject["POST / - 创建项目"]
        Projects --> GetProject["GET /{id} - 获取项目"]
        Projects --> ProjectCards["POST /{id}/cards - 存储卡片"]
        Projects --> ProjectReports["POST /{id}/reports - 存储报告"]
        Projects --> GetReport["GET /{id}/reports/{reportId} - 获取报告"]
        Projects --> UpdateReport["PUT /{id}/reports/{reportId} - 更新报告"]
        Projects --> ProjectSearch["POST /{id}/search - 项目搜索"]
        Projects --> ProjectExport["GET /{id}/export - 导出项目"]
        Projects --> StorePlan["POST /{id}/plans/r2 - 存储计划到R2"]
    end

    %% 搜索操作
    subgraph "搜索操作"
        Search --> GlobalSearch["POST / - 全局语义搜索"]
        ProjectSearch --> TextSearch["文本查询: {query, limit}"]
        ProjectSearch --> VectorSearch["向量查询: {queryEmbedding, limit}"]
    end

    %% 数据存储操作
    subgraph "存储操作"
        ProjectCards --> StoreCard["存储到D1 + 生成嵌入 + R2备份"]
        ProjectReports --> StoreReport["存储到D1 + 生成嵌入 + R2存储"]
        GetReport --> FetchReport["从D1数据库获取"]
        UpdateReport --> UpdateReportData["在D1中更新 + 更新嵌入 + R2同步"]
        StorePlan --> StorePlanR2["在R2中存储计划内容"]
    end

    %% 搜索处理
    subgraph "搜索处理"
        GlobalSearch --> GenEmbed["生成查询嵌入"]
        TextSearch --> GenEmbed
        GenEmbed --> VectorQuery["查询Vectorize索引"]
        VectorQuery --> Dedupe["按内容ID去重"]
        Dedupe --> Results["返回结果"]
    end

    %% 样式
    classDef endpoint fill:#e1f5fe
    classDef operation fill:#f3e5f5
    classDef storage fill:#e8f5e8
    classDef search fill:#fff3e0
    
    class Projects,Search,Health endpoint
    class GetProjects,CreateProject,GetProject,ProjectCards,ProjectReports,GetReport,UpdateReport,ProjectSearch,ProjectExport,StorePlan operation
    class StoreCard,StoreReport,FetchReport,UpdateReportData,StorePlanR2 storage
    class GlobalSearch,TextSearch,VectorSearch,GenEmbed,VectorQuery,Dedupe,Results search
```

## 5. 组件层次结构

```mermaid
graph TD
    %% 主应用
    App[App.jsx] --> Nav[Navigation.jsx]
    App --> Routes[React Router]

    %% 主要路由
    Routes --> Topic[TopicInput.jsx]
    Routes --> Planning[PlanningPhase.jsx]
    Routes --> Execution[ExecutionPhase.jsx]
    Routes --> Reports[ReportComposition.jsx]
    Routes --> Knowledge[KnowledgeDashboard.jsx]
    Routes --> ProjectDetails[ProjectDetails.jsx]
    Routes --> Editor[WYSIWYGReportEditor.jsx]

    %% 规划组件
    Planning --> TreeMap[TreeMapPlanView.jsx]
    Planning --> ComposingCanvas[ComposingPlanCanvas.jsx]

    %% 执行组件
    Execution --> Cards[ResearchCard.jsx]
    Execution --> EditableCard[EditableCard.jsx]
    Cards --> Card[Card.jsx]

    %% 报告组件
    Reports --> MDXEditor[MDXEditor.jsx]
    Reports --> BilingualEditor[BilingualMDXEditor.jsx]

    %% 知识库组件
    Knowledge --> SearchResults[SearchResults.jsx]
    Knowledge --> CardsExplorer[CardsExplorer.jsx]
    ProjectDetails --> CardsExplorer

    %% 所见即所得编辑器组件
    Editor --> TipTapCore[TipTap编辑器核心]
    Editor --> AutoSave[自动保存服务]
    Editor --> Export[导出功能]

    %% 共享组件
    subgraph "共享组件"
        Header[Header.jsx]
        CloudStatus[CloudStatus.jsx]
        ApiKeySetup[ApiKeySetup.jsx]
    end

    %% 上下文
    subgraph "上下文层"
        WorkflowContext[WorkflowContext.jsx]
        Topic --> WorkflowContext
        Planning --> WorkflowContext
        Execution --> WorkflowContext
        Reports --> WorkflowContext
    end

    %% 服务
    subgraph "服务层"
        ServiceFactory[ServiceFactory.js]
        HybridLLM[HybridLLMService.js]
        LLMLayer[LLMAbstractionLayer.js]
        WorkerAPI[WorkerApiService.js]
        ExecutionEngine[ExecutionEngine.js]
    end

    WorkflowContext --> ServiceFactory
    ServiceFactory --> HybridLLM
    HybridLLM --> LLMLayer
    HybridLLM --> WorkerAPI
    HybridLLM --> ExecutionEngine

    %% 样式
    classDef main fill:#e1f5fe
    classDef component fill:#f3e5f5
    classDef context fill:#e8f5e8
    classDef service fill:#fff3e0
    
    class App,Nav,Routes main
    class Topic,Planning,Execution,Reports,Knowledge,ProjectDetails,Editor,TreeMap,ComposingCanvas,Cards,EditableCard,Card,MDXEditor,BilingualEditor,SearchResults,CardsExplorer,TipTapCore,AutoSave,Export,Header,CloudStatus,ApiKeySetup component
    class WorkflowContext context
    class ServiceFactory,HybridLLM,LLMLayer,WorkerAPI,ExecutionEngine service
```

## 6. 数据库架构关系

```mermaid
erDiagram
    PROJECTS {
        string id PK
        string title
        string description
        string topic
        string status
        datetime created_at
        datetime updated_at
        string user_id
        text metadata
    }

    RESEARCH_PLANS {
        string id PK
        string project_id FK
        string title
        string description
        text plan_data
        datetime created_at
        datetime updated_at
    }

    TASKS {
        string id PK
        string project_id FK
        string title
        string description
        string task_type
        string status
        text task_data
        integer priority
        datetime created_at
        datetime updated_at
    }

    CARDS {
        string id PK
        string project_id FK
        string task_id FK
        string title
        string card_type
        text content
        text raw_content
        text metadata
        boolean embedding_stored
        datetime created_at
        datetime updated_at
    }

    REPORTS {
        string id PK
        string project_id FK
        string title
        text content
        string language
        string report_type
        text selected_cards
        text metadata
        datetime created_at
        datetime updated_at
    }

    EMBEDDINGS {
        string id PK
        string vector_id
        string content_type
        string content_id
        text metadata
        datetime created_at
    }

    PROJECTS ||--o{ RESEARCH_PLANS : "包含"
    PROJECTS ||--o{ TASKS : "包含"
    PROJECTS ||--o{ CARDS : "生成"
    PROJECTS ||--o{ REPORTS : "产生"
    TASKS ||--o{ CARDS : "创建"
    CARDS ||--o| EMBEDDINGS : "嵌入为"
    REPORTS ||--o| EMBEDDINGS : "嵌入为"
```

---

*生成于: 2025-08-19*
*架构版本: v2.1 (所见即所得编辑器与知识库更新)*

## 最近更新 (v2.1)

- **所见即所得报告编辑器**: 添加基于TipTap的富文本编辑器，支持自动保存
- **知识库仪表板**: 增强的项目管理和搜索界面
- **报告编辑API**: 用于获取和更新单个报告的新端点
- **组件层次结构**: 更新以包含WYSIWYGReportEditor、KnowledgeDashboard、ProjectDetails和CardsExplorer
- **API扩展**: 为报告编辑工作流程添加GET/PUT端点

## 架构特点

### 混合架构优势
- **前端AI操作**: 所有Gemini AI交互在客户端进行，降低延迟
- **云存储管理**: Cloudflare Workers处理数据持久化和搜索
- **回退策略**: 云服务不可用时前端仍可独立工作
- **边缘计算**: 利用Cloudflare全球网络实现低延迟访问

### 数据流优化
- **语义搜索**: 使用BGE嵌入模型实现高质量向量搜索
- **内容分块**: 大内容自动分块处理，保留语义边界
- **去重逻辑**: 智能合并分块结果，提高搜索相关性
- **实时同步**: 前端与云存储的实时数据同步

### 安全与性能
- **API密钥隔离**: 前端和后端API密钥分离管理
- **嵌入安全**: 服务器端生成嵌入，避免敏感数据泄露
- **缓存策略**: 多层缓存优化响应速度
- **负载均衡**: Cloudflare网络自动负载分配