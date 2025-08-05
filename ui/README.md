# AI Research Planning Platform

A modern React application that generates comprehensive research plans using Google's Gemini AI. This is the implementation of **Phase 1: Research & Curation** from the two-phase AI-driven interactive report composing platform.

## 🚀 Features

- **AI-Powered Research Planning**: Generate structured research plans using Gemini 1.5 Flash
- **Interactive Plan Review**: Edit and refine AI-generated plans before approval
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Real-time Feedback**: Loading states and error handling for better UX
- **Modular Architecture**: Well-structured codebase ready for Phase 2 expansion

## 🛠️ Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key

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
   
   # Add your API key to .env (note: no VITE_ prefix needed)
   GEMINI_API_KEY=your_actual_api_key_here
   GEMINI_MODEL=gemini-2.5-flash-lite
   ```

4. **Start the development server:**
   ```bash
   # The server needs access to the environment variables
   GEMINI_API_KEY=your_actual_api_key_here npm run dev
   ```

## 🎯 Usage

1. **Enter Research Topic**: Describe what you want to research
2. **Generate Plan**: Click the button to let Gemini AI create a comprehensive research plan
3. **Review & Edit**: Modify the generated plan as needed
4. **Approve**: Confirm the plan (currently shows success message)

## 🏗️ Architecture

### Core Services
- **LLMAbstractionLayer**: Handles Gemini API interactions
- **PlannerService**: Validates and processes research plans
- **WorkflowOrchestrator**: Manages the research workflow (prepared for Phase 2)

### Components
- **TopicInput**: Research topic entry with validation
- **PlanningPhase**: Plan review and editing interface
- **ApiKeySetup**: Guided setup for API configuration

### State Management
- **WorkflowContext**: Centralized state using React Context and useReducer
- **Workflow Phases**: Structured progression through the research process

## 🔮 Future Enhancements (Phase 2)

- **Agent Execution**: Web search, RAG, and MCP data retrieval
- **Card System**: Atomic content units for research results
- **MDX Composition**: Rich content creation and report generation
- **Context Base**: Persistent storage for research cards

## 🧪 Development

### Project Structure
```
src/
├── components/     # React components
├── context/        # State management
├── services/       # Business logic and API calls
├── types/          # Type definitions
└── content/        # MDX content (Phase 2)
```

### Key Technologies
- **React 18** with hooks
- **Tailwind CSS v4** for styling
- **Google GenAI SDK** (`@google/genai`) for Gemini integration
- **Vite** for development and building
- **MDX** support (ready for Phase 2)

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Your Gemini API key | Required |
| `GEMINI_MODEL` | Gemini model to use | `gemini-2.5-flash-lite` |

## 🔒 Security Notes

- API keys are used client-side in this demo
- For production, consider using a backend proxy
- Never commit your `.env` file to version control

## 📄 License

This project is part of the AI Research Planning Platform designed according to the specifications in `design-phase-one.md`.

---

**Status**: Phase 1 Complete ✅ | Phase 2 In Development 🚧