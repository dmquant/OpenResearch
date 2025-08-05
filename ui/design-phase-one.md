This is a compelling and well-articulated concept for an AI-driven interactive report composing platform. The two-phase approach effectively balances AI-powered automation in the research phase with essential human oversight and creativity in the composition phase. The use of modular "Cards" and an MDX foundation sets the stage for flexible and rich outputs.

Here is a detailed breakdown, a formalized visualization, and an analysis of your proposed workflow.

Platform Workflow Breakdown
The platform architecture is logically divided into two main phases:

Phase 1: Research and Content Curation
This phase focuses on gathering, processing, and organizing the raw materials for the report.

Topic Input: The user initiates the process by defining the report topic.

AI Planning & User Confirmation: The LLM analyzes the topic and drafts a research plan. Crucially, the user reviews, edits, and confirms this plan before execution.

Agent Execution: AI agents execute the plan, utilizing various information sources:

Web Search: For external, up-to-date information. Using gemini search tool, with api_key and model set in .env, and tool documented at https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/web-search.md



# Detailed Interaction Flows

Phase 1: Research and Curation
Planning: The User submits a topic. The API Gateway routes it to the Workflow Orchestrator, which calls the Planner Service. The Planner Service uses the LLM Abstraction Layer to generate a plan.

Confirmation: The plan is returned to the Client UI for user review and approval.

Dispatch: Upon confirmation, the Orchestrator breaks the plan into tasks and pushes them to the Task Queue.

Execution: The Agent Execution Workers (Web, RAG, MCP) pull tasks from the queue and retrieve raw data.

Synthesis: The raw data is passed to the Card Synthesizer. This worker uses the LLM Abstraction Layer to format the data into structured Cards.


# Future enhancement

## Add sources:
    Context (RAG): Retrieval-Augmented Generation for accessing internal knowledge bases or specific documents.

    MCP (Data/APIs): Accessing structured databases or other specific data sources.

    Card Generation: The results from each task are synthesized into atomic units called "Cards" (e.g., a text summary, a chart, a table).

    Context Base: The generated cards are stored in a central repository (the "Context Base") for the current project.
