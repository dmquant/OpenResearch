# OpenResearch Architecture Diagrams

## 1. System Architecture Overview

```mermaid
graph TB
    %% Frontend Layer
    subgraph "Frontend (React + Vite)"
        UI[Web UI Components]
        WF[Workflow Context]
        SVC[Service Layer]
        UI --> WF
        WF --> SVC
    end

    %% Frontend Services
    subgraph "Frontend Services"
        HLS[HybridLLMService]
        LLM[LLMAbstractionLayer]
        WAS[WorkerApiService]
        EE[ExecutionEngine]
        SF[ServiceFactory]
        
        SVC --> HLS
        HLS --> LLM
        HLS --> WAS
        HLS --> EE
        SF --> HLS
    end

    %% External AI Service
    subgraph "External AI"
        GEMINI[Google Gemini API]
        LLM --> GEMINI
    end

    %% Cloudflare Worker Layer
    subgraph "Cloudflare Worker"
        API[API Routes]
        PS[ProjectService]
        ES[EmbeddingService]
        SS[StorageService]
        
        API --> PS
        API --> ES
        API --> SS
    end

    %% Cloudflare Infrastructure
    subgraph "Cloudflare Infrastructure"
        D1[(D1 Database)]
        VZ[Vectorize Index]
        R2[R2 Storage]
        AI[Workers AI]
        
        PS --> D1
        ES --> VZ
        ES --> AI
        SS --> R2
    end

    %% Connections
    WAS -.->|HTTP/REST| API
    
    %% Styling
    classDef frontend fill:#e1f5fe
    classDef worker fill:#f3e5f5
    classDef infrastructure fill:#e8f5e8
    classDef external fill:#fff3e0
    
    class UI,WF,SVC frontend
    class API,PS,ES,SS worker
    class D1,VZ,R2,AI infrastructure
    class GEMINI external
```

## 2. Data Flow Architecture

```mermaid
flowchart TD
    %% User Actions
    User[User Input] --> Topic[Topic Definition]
    Topic --> Plan[Plan Generation]
    Plan --> Exec[Task Execution]
    Exec --> Report[Report Generation]
    Report --> Search[Search & Discovery]

    %% Plan Generation Flow
    subgraph "Plan Generation"
        Plan --> LLM1[Gemini LLM]
        LLM1 --> PlanData[Plan Structure]
        PlanData --> StoreP[Store Plan]
        StoreP --> D1P[(D1: research_plans)]
        StoreP --> R2P[R2: Plan Backup]
    end

    %% Task Execution Flow
    subgraph "Task Execution"
        Exec --> TaskQ[Task Queue]
        TaskQ --> GenCard[Generate Card]
        GenCard --> LLM2[Gemini LLM]
        LLM2 --> Card[Research Card]
        Card --> StoreC[Store Card]
        StoreC --> D1C[(D1: cards)]
        StoreC --> Embed[Generate Embedding]
        Embed --> AI[Cloudflare AI]
        AI --> BGE[BGE Model]
        BGE --> VZ[(Vectorize Index)]
        StoreC --> R2C[R2: Card Backup]
    end

    %% Report Generation Flow
    subgraph "Report Generation"
        Report --> Gather[Gather Cards]
        Gather --> D1C
        Gather --> LLM3[Gemini LLM]
        LLM3 --> RptData[Report Content]
        RptData --> StoreR[Store Report]
        StoreR --> D1R[(D1: reports)]
        StoreR --> EmbedR[Generate Embedding]
        EmbedR --> AI
        StoreR --> R2R[R2: Report Storage]
    end

    %% Search Flow
    subgraph "Search & Discovery"
        Search --> Query[Search Query]
        Query --> QEmbed[Query Embedding]
        QEmbed --> AI
        QEmbed --> VSearch[Vector Search]
        VSearch --> VZ
        VZ --> Results[Search Results]
        Results --> Fetch[Fetch Full Content]
        Fetch --> D1C
        Fetch --> D1R
    end

    %% Styling
    classDef process fill:#e3f2fd
    classDef storage fill:#e8f5e8
    classDef ai fill:#fff3e0
    classDef user fill:#fce4ec
    
    class User,Topic,Plan,Exec,Report,Search user
    class LLM1,LLM2,LLM3,GenCard,Embed,EmbedR,QEmbed process
    class D1P,D1C,D1R,R2P,R2C,R2R,VZ storage
    class AI,BGE,GEMINI ai
```

## 3. Embedding Pipeline Architecture

```mermaid
sequenceDiagram
    participant F as Frontend
    participant W as Worker API
    participant PS as ProjectService
    participant ES as EmbeddingService
    participant AI as Cloudflare AI
    participant VZ as Vectorize
    participant D1 as D1 Database

    %% Card Creation with Embedding
    F->>W: POST /api/projects/{id}/cards
    Note over F,W: {title, content, type, metadata}
    
    W->>PS: storeCard(data)
    PS->>D1: INSERT INTO cards
    D1-->>PS: card record
    PS-->>W: card object
    
    W->>ES: storeCardEmbedding(cardId, content, metadata)
    
    %% Chunking Process
    ES->>ES: chunkText(content)
    Note over ES: Split if > 8KB, preserve boundaries
    
    %% Embedding Generation
    loop For each chunk
        ES->>AI: run("@cf/baai/bge-base-en-v1.5", {text: chunk})
        AI-->>ES: 768-dim embedding vector
        
        ES->>ES: prepareMetadata(projectId, cardId, chunkIndex)
        Note over ES: Minimal metadata < 10KB
        
        ES->>VZ: upsert({id, values, metadata})
        VZ-->>ES: success
    end
    
    ES-->>W: embedding results
    W->>PS: markCardEmbeddingStored(cardId)
    PS->>D1: UPDATE cards SET embedding_stored=true
    
    W-->>F: card with embedding_stored: true

    %% Search Process
    F->>W: POST /api/search
    Note over F,W: {query: "search terms", limit: 20}
    
    W->>ES: semanticSearch(null, query, limit)
    ES->>AI: run("@cf/baai/bge-base-en-v1.5", {text: query})
    AI-->>ES: query embedding
    
    ES->>VZ: query(queryEmbedding, {topK: min(limit*2, 50)})
    Note over ES,VZ: Respect 50-result limit with metadata
    VZ-->>ES: search matches
    
    ES->>ES: deduplicateByCardId(matches)
    Note over ES: Group chunks, keep highest score
    
    ES-->>W: deduplicated results
    W-->>F: search results with metadata
```

## 4. API Endpoint Structure

```mermaid
graph LR
    %% Main API Routes
    subgraph "Core API Endpoints"
        Projects["/api/projects"]
        Search["/api/search"]
        Health["/health"]
    end

    %% Project Endpoints
    subgraph "Project Operations"
        Projects --> GetProjects["GET / - List all projects"]
        Projects --> CreateProject["POST / - Create project"]
        Projects --> GetProject["GET /{id} - Get project"]
        Projects --> ProjectCards["POST /{id}/cards - Store card"]
        Projects --> ProjectReports["POST /{id}/reports - Store report"]
        Projects --> GetReport["GET /{id}/reports/{reportId} - Get report"]
        Projects --> UpdateReport["PUT /{id}/reports/{reportId} - Update report"]
        Projects --> ProjectSearch["POST /{id}/search - Project search"]
        Projects --> ProjectExport["GET /{id}/export - Export project"]
        Projects --> StorePlan["POST /{id}/plans/r2 - Store plan to R2"]
    end

    %% Search Operations
    subgraph "Search Operations"
        Search --> GlobalSearch["POST / - Global semantic search"]
        ProjectSearch --> TextSearch["Text query: {query, limit}"]
        ProjectSearch --> VectorSearch["Vector query: {queryEmbedding, limit}"]
    end

    %% Data Storage Operations
    subgraph "Storage Operations"
        ProjectCards --> StoreCard["Store in D1 + Generate Embedding + R2 Backup"]
        ProjectReports --> StoreReport["Store in D1 + Generate Embedding + R2 Storage"]
        GetReport --> FetchReport["Fetch from D1 Database"]
        UpdateReport --> UpdateReportData["Update in D1 + Update Embedding + R2 Sync"]
        StorePlan --> StorePlanR2["Store plan content in R2"]
    end

    %% Search Processing
    subgraph "Search Processing"
        GlobalSearch --> GenEmbed["Generate Query Embedding"]
        TextSearch --> GenEmbed
        GenEmbed --> VectorQuery["Query Vectorize Index"]
        VectorQuery --> Dedupe["Deduplicate by Content ID"]
        Dedupe --> Results["Return Results"]
    end

    %% Styling
    classDef endpoint fill:#e1f5fe
    classDef operation fill:#f3e5f5
    classDef storage fill:#e8f5e8
    classDef search fill:#fff3e0
    
    class Projects,Search,Health endpoint
    class GetProjects,CreateProject,GetProject,ProjectCards,ProjectReports,GetReport,UpdateReport,ProjectSearch,ProjectExport,StorePlan operation
    class StoreCard,StoreReport,FetchReport,UpdateReportData,StorePlanR2 storage
    class GlobalSearch,TextSearch,VectorSearch,GenEmbed,VectorQuery,Dedupe,Results search
```

## 5. Component Hierarchy

```mermaid
graph TD
    %% Main App
    App[App.jsx] --> Nav[Navigation.jsx]
    App --> Routes[React Router]

    %% Main Routes
    Routes --> Topic[TopicInput.jsx]
    Routes --> Planning[PlanningPhase.jsx]
    Routes --> Execution[ExecutionPhase.jsx]
    Routes --> Reports[ReportComposition.jsx]
    Routes --> Knowledge[KnowledgeDashboard.jsx]
    Routes --> ProjectDetails[ProjectDetails.jsx]
    Routes --> Editor[WYSIWYGReportEditor.jsx]

    %% Planning Components
    Planning --> TreeMap[TreeMapPlanView.jsx]
    Planning --> ComposingCanvas[ComposingPlanCanvas.jsx]

    %% Execution Components
    Execution --> Cards[ResearchCard.jsx]
    Execution --> EditableCard[EditableCard.jsx]
    Cards --> Card[Card.jsx]

    %% Report Components
    Reports --> MDXEditor[MDXEditor.jsx]
    Reports --> BilingualEditor[BilingualMDXEditor.jsx]

    %% Knowledge Base Components
    Knowledge --> SearchResults[SearchResults.jsx]
    Knowledge --> CardsExplorer[CardsExplorer.jsx]
    ProjectDetails --> CardsExplorer

    %% WYSIWYG Editor Components
    Editor --> TipTapCore[TipTap Editor Core]
    Editor --> AutoSave[Auto-save Service]
    Editor --> Export[Export Functions]

    %% Shared Components
    subgraph "Shared Components"
        Header[Header.jsx]
        CloudStatus[CloudStatus.jsx]
        ApiKeySetup[ApiKeySetup.jsx]
    end

    %% Context
    subgraph "Context Layer"
        WorkflowContext[WorkflowContext.jsx]
        Topic --> WorkflowContext
        Planning --> WorkflowContext
        Execution --> WorkflowContext
        Reports --> WorkflowContext
    end

    %% Services
    subgraph "Service Layer"
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

    %% Styling
    classDef main fill:#e1f5fe
    classDef component fill:#f3e5f5
    classDef context fill:#e8f5e8
    classDef service fill:#fff3e0
    
    class App,Nav,Routes main
    class Topic,Planning,Execution,Reports,Knowledge,ProjectDetails,Editor,TreeMap,ComposingCanvas,Cards,EditableCard,Card,MDXEditor,BilingualEditor,SearchResults,CardsExplorer,TipTapCore,AutoSave,Export,Header,CloudStatus,ApiKeySetup component
    class WorkflowContext context
    class ServiceFactory,HybridLLM,LLMLayer,WorkerAPI,ExecutionEngine service
```

## 6. Database Schema Relationships

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

    PROJECTS ||--o{ RESEARCH_PLANS : "has"
    PROJECTS ||--o{ TASKS : "contains"
    PROJECTS ||--o{ CARDS : "generates"
    PROJECTS ||--o{ REPORTS : "produces"
    TASKS ||--o{ CARDS : "creates"
    CARDS ||--o| EMBEDDINGS : "embedded_as"
    REPORTS ||--o| EMBEDDINGS : "embedded_as"
```

---

*Generated on: 2025-08-19*
*Architecture Version: v2.1 (WYSIWYG Editor & Knowledge Base Update)*

## Recent Updates (v2.1)

- **WYSIWYG Report Editor**: Added TipTap-based rich text editor with auto-save
- **Knowledge Base Dashboard**: Enhanced project management and search interface
- **Report Editing API**: New endpoints for getting and updating individual reports
- **Component Hierarchy**: Updated to include WYSIWYGReportEditor, KnowledgeDashboard, ProjectDetails, and CardsExplorer
- **API Extensions**: Added GET/PUT endpoints for report editing workflow