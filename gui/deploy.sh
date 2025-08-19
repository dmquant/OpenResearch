#!/bin/bash

# OpenResearch Cloudflare Worker Deployment Script

set -e

echo "🚀 Deploying OpenResearch to Cloudflare..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Navigate to worker directory
cd worker

echo "📦 Installing worker dependencies..."
npm install

echo "🗄️ Creating D1 database..."
wrangler d1 create openresearch-db || echo "Database may already exist"

echo "📊 Creating Vectorize index..."
wrangler vectorize create research-embeddings --dimensions=768 --metric=cosine || echo "Index may already exist"

echo "🗂️ Creating R2 buckets..."
wrangler r2 bucket create openresearch-reports || echo "Reports bucket may already exist"
wrangler r2 bucket create openresearch-assets || echo "Assets bucket may already exist"

echo "🔄 Running database migrations..."
wrangler d1 migrations apply openresearch-db

echo "🔐 Setting up secrets..."
echo "Please set the following secrets using 'wrangler secret put <name>':"
echo "- GEMINI_API_KEY"
echo "- GEMINI_EMBEDDING_MODEL (optional, defaults to gemini-embedding-001)"
echo ""
echo "Example:"
echo "wrangler secret put GEMINI_API_KEY"
echo "wrangler secret put GEMINI_EMBEDDING_MODEL"

read -p "Have you set the required secrets? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please set the required secrets before continuing."
    exit 1
fi

echo "🚀 Deploying worker..."
wrangler deploy

echo "✅ Worker deployed successfully!"
echo ""
echo "🌐 Your worker is now available at:"
wrangler whoami | grep "Account ID" | awk '{print "https://openresearch-worker.YOUR_SUBDOMAIN.workers.dev"}'
echo ""
echo "📝 Next steps:"
echo "1. Update your frontend .env file with:"
echo "   VITE_WORKER_API_URL=https://your-worker-url.workers.dev"
echo "   VITE_MODE=cloud"
echo "2. Rebuild and redeploy your frontend"
echo "3. Test the integration"

cd ..
echo "🎉 Deployment complete!"