// Assets Download Service - handles downloading all project assets as a zip file
import JSZip from 'jszip'

class AssetsDownloadService {
  constructor() {
    console.log('📦 AssetsDownloadService initialized')
  }

  // Main method to download all assets as zip
  async downloadAllAssets(state) {
    console.log('📦 Starting assets download process', {
      topic: state.topic,
      hasEnglishReport: !!state.bilingual?.reports?.english,
      hasChineseReport: !!state.bilingual?.reports?.chinese,
      cardsCount: state.executionData?.cards?.length || 0
    })

    try {
      const zip = new JSZip()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const sanitizedTopic = this.sanitizeFilename(state.topic || 'research-project')
      const projectName = sanitizedTopic.length > 10 ? sanitizedTopic.substring(0, 10) : sanitizedTopic

      // Create folder structure
      const reportsFolder = zip.folder('reports')
      const cardsFolder = zip.folder('research-cards')
      const metadataFolder = zip.folder('metadata')

      // Add bilingual reports
      await this.addBilingualReports(reportsFolder, state.bilingual?.reports, state.topic)

      // Add research cards
      await this.addResearchCards(cardsFolder, state.executionData?.cards, state.researchPlan)

      // Add project metadata
      await this.addProjectMetadata(metadataFolder, state)

      // Add README file
      this.addReadmeFile(zip, state, timestamp)

      // Generate and download zip
      console.log('🔄 Generating zip file...')
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      })

      const filename = `${projectName}_assets_${timestamp}.zip`
      this.downloadBlob(content, filename)

      console.log('✅ Assets download completed successfully', {
        filename,
        size: content.size
      })

      return { success: true, filename }

    } catch (error) {
      console.error('❌ Error downloading assets:', error)
      throw new Error(`Failed to download assets: ${error.message}`)
    }
  }

  // Add bilingual reports to zip
  async addBilingualReports(reportsFolder, reports, topic) {
    console.log('📝 Adding bilingual reports to zip')

    if (reports?.english) {
      const englishContent = this.formatReportContent(reports.english, 'english')
      reportsFolder.file('english_report.mdx', englishContent)
      reportsFolder.file('english_report.md', reports.english.content)
      console.log('✅ Added English report')
    }

    if (reports?.chinese) {
      const chineseContent = this.formatReportContent(reports.chinese, 'chinese')
      reportsFolder.file('chinese_report.mdx', chineseContent)
      reportsFolder.file('chinese_report.md', reports.chinese.content)
      console.log('✅ Added Chinese report')
    }

    // Add a comparison file if both versions exist
    if (reports?.english && reports?.chinese) {
      const comparisonContent = this.createComparisonFile(reports.english, reports.chinese, topic)
      reportsFolder.file('bilingual_summary.md', comparisonContent)
      console.log('✅ Added bilingual comparison')
    }
  }

  // Add research cards to zip
  async addResearchCards(cardsFolder, cards, researchPlan) {
    console.log('🗃️ Adding research cards to zip')

    if (!cards || cards.length === 0) {
      console.log('⚠️ No research cards to add')
      return
    }

    // Create individual card files
    cards.forEach((card, index) => {
      const cardContent = this.formatCardContent(card, index + 1)
      const filename = `card_${String(index + 1).padStart(2, '0')}_${this.sanitizeFilename(card.title)}.md`
      cardsFolder.file(filename, cardContent)
    })

    // Create cards summary file
    const summaryContent = this.createCardsSummary(cards, researchPlan)
    cardsFolder.file('cards_summary.md', summaryContent)

    console.log(`✅ Added ${cards.length} research cards`)
  }

  // Add project metadata
  async addProjectMetadata(metadataFolder, state) {
    console.log('📊 Adding project metadata')

    // Research plan metadata
    if (state.researchPlan) {
      const planMetadata = {
        title: state.researchPlan.title,
        description: state.researchPlan.description,
        estimatedDuration: state.researchPlan.estimatedDuration,
        tasks: state.researchPlan.tasks?.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          type: task.type,
          query: task.query
        })),
        createdAt: new Date().toISOString()
      }
      metadataFolder.file('research_plan.json', JSON.stringify(planMetadata, null, 2))
    }

    // Project statistics
    const stats = this.generateProjectStats(state)
    metadataFolder.file('project_statistics.json', JSON.stringify(stats, null, 2))

    // Execution timeline
    const timeline = this.generateExecutionTimeline(state)
    metadataFolder.file('timeline.md', timeline)

    console.log('✅ Added project metadata')
  }

  // Format report content with metadata
  formatReportContent(report, language) {
    const langName = language === 'english' ? 'English' : 'Simplified Chinese (简体中文)'
    
    return `---
title: "${report.title}"
language: "${language}"
created: "${report.createdAt}"
source_cards: ${report.sourceCards}
${report.translatedFrom ? `translated_from: "${report.translatedFrom}"` : ''}
${report.translatedAt ? `translated_at: "${report.translatedAt}"` : ''}
---

# ${report.title}

**Language:** ${langName}  
**Created:** ${new Date(report.createdAt).toLocaleString()}  
**Source Cards:** ${report.sourceCards}  
${report.translatedFrom ? `**Translated From:** ${report.translatedFrom}  ` : ''}
${report.translatedAt ? `**Translation Date:** ${new Date(report.translatedAt).toLocaleString()}  ` : ''}

---

${report.content}`
  }

  // Format individual card content
  formatCardContent(card, index) {
    return `# Research Card ${index}: ${card.title}

**Type:** ${card.type.replace('_', ' ')}  
**Source:** ${card.metadata?.source?.replace('_', ' ') || 'Unknown'}  
**Created:** ${new Date(card.metadata?.timestamp || Date.now()).toLocaleString()}  
**Confidence:** ${card.metadata?.confidence ? `${Math.round(card.metadata.confidence * 100)}%` : 'N/A'}  

## Task Information
${card.task ? `
**Task Title:** ${card.task.title}  
**Task Type:** ${card.task.type}  
**Query:** ${card.task.query}  

**Description:** ${card.task.description}
` : 'No task information available'}

## Content

${card.content}

## Citations

${card.citations && card.citations.length > 0 ? 
  card.citations.map(citation => `- [${citation.title}](${citation.url})`).join('\n') : 
  'No citations available'
}

## Metadata

\`\`\`json
${JSON.stringify(card.metadata, null, 2)}
\`\`\`

---
*Generated by Research Report System*`
  }

  // Create cards summary
  createCardsSummary(cards, researchPlan) {
    return `# Research Cards Summary

**Total Cards:** ${cards.length}  
**Generated:** ${new Date().toLocaleString()}  

## Research Plan Overview

${researchPlan ? `
**Title:** ${researchPlan.title}  
**Description:** ${researchPlan.description}  
**Estimated Duration:** ${researchPlan.estimatedDuration}  
**Total Tasks:** ${researchPlan.tasks?.length || 0}  
` : 'No research plan information available'}

## Cards Overview

${cards.map((card, index) => `
### ${index + 1}. ${card.title}
- **Type:** ${card.type.replace('_', ' ')}
- **Source:** ${card.metadata?.source?.replace('_', ' ') || 'Unknown'}  
- **Content Length:** ${card.content?.length || 0} characters
- **Citations:** ${card.citations?.length || 0}
- **Task:** ${card.task?.title || 'N/A'}
`).join('\n')}

## Statistics

- **Average Content Length:** ${Math.round(cards.reduce((sum, card) => sum + (card.content?.length || 0), 0) / cards.length)} characters
- **Total Citations:** ${cards.reduce((sum, card) => sum + (card.citations?.length || 0), 0)}
- **Card Types:** ${[...new Set(cards.map(card => card.type))].join(', ')}
- **Sources:** ${[...new Set(cards.map(card => card.metadata?.source).filter(Boolean))].join(', ')}

---
*Generated by Research Report System*`
  }

  // Create comparison file for bilingual reports
  createComparisonFile(englishReport, chineseReport, topic) {
    return `# Bilingual Report Summary

**Project Topic:** ${topic}  
**Generated:** ${new Date().toLocaleString()}  

## Report Versions

### English Version
- **Title:** ${englishReport.title}
- **Created:** ${new Date(englishReport.createdAt).toLocaleString()}
- **Content Length:** ${englishReport.content?.length || 0} characters
- **Source Cards:** ${englishReport.sourceCards}

### Chinese Version (中文版本)
- **Title:** ${chineseReport.title}
- **Created:** ${new Date(chineseReport.createdAt).toLocaleString()}
- **Content Length:** ${chineseReport.content?.length || 0} characters
- **Source Cards:** ${chineseReport.sourceCards}
- **Translated From:** ${chineseReport.translatedFrom || 'Unknown'}
- **Translation Date:** ${chineseReport.translatedAt ? new Date(chineseReport.translatedAt).toLocaleString() : 'Unknown'}

## Comparison Statistics

- **English/Chinese Ratio:** ${englishReport.content?.length && chineseReport.content?.length ? 
    (englishReport.content.length / chineseReport.content.length).toFixed(2) : 'N/A'}
- **Total Combined Length:** ${(englishReport.content?.length || 0) + (chineseReport.content?.length || 0)} characters

## Files Included

### Reports
- \`english_report.mdx\` - English report with metadata
- \`english_report.md\` - Plain English markdown
- \`chinese_report.mdx\` - Chinese report with metadata  
- \`chinese_report.md\` - Plain Chinese markdown

### Research Cards
- Individual card files in \`research-cards/\` folder
- \`cards_summary.md\` - Overview of all research cards

### Metadata
- \`research_plan.json\` - Original research plan
- \`project_statistics.json\` - Project statistics
- \`timeline.md\` - Execution timeline

---
*Generated by Research Report System*`
  }

  // Generate project statistics
  generateProjectStats(state) {
    const stats = {
      project: {
        topic: state.topic,
        phase: state.currentPhase,
        generatedAt: new Date().toISOString()
      },
      reports: {
        hasEnglish: !!state.bilingual?.reports?.english,
        hasChinese: !!state.bilingual?.reports?.chinese,
        currentLanguage: state.bilingual?.currentLanguage || 'english'
      },
      research: {
        totalCards: state.executionData?.cards?.length || 0,
        totalTasks: state.researchPlan?.tasks?.length || 0,
        selectedCardsForReport: state.composingPlan?.selectedCards?.length || 0
      }
    }

    if (state.bilingual?.reports?.english) {
      stats.reports.english = {
        contentLength: state.bilingual.reports.english.content?.length || 0,
        sourceCards: state.bilingual.reports.english.sourceCards,
        createdAt: state.bilingual.reports.english.createdAt
      }
    }

    if (state.bilingual?.reports?.chinese) {
      stats.reports.chinese = {
        contentLength: state.bilingual.reports.chinese.content?.length || 0,
        sourceCards: state.bilingual.reports.chinese.sourceCards,
        createdAt: state.bilingual.reports.chinese.createdAt,
        translatedFrom: state.bilingual.reports.chinese.translatedFrom,
        translatedAt: state.bilingual.reports.chinese.translatedAt
      }
    }

    if (state.executionData?.cards) {
      stats.cards = state.executionData.cards.map(card => ({
        id: card.id,
        title: card.title,
        type: card.type,
        contentLength: card.content?.length || 0,
        citations: card.citations?.length || 0,
        source: card.metadata?.source,
        confidence: card.metadata?.confidence
      }))
    }

    return stats
  }

  // Generate execution timeline
  generateExecutionTimeline(state) {
    const timeline = [`# Project Execution Timeline

**Project:** ${state.topic}  
**Generated:** ${new Date().toLocaleString()}  

## Timeline Events
`]

    // Add research plan creation
    if (state.researchPlan) {
      timeline.push(`### Research Plan Created
- **Tasks:** ${state.researchPlan.tasks?.length || 0}
- **Estimated Duration:** ${state.researchPlan.estimatedDuration}
`)
    }

    // Add card generation events
    if (state.executionData?.cards) {
      timeline.push(`### Research Cards Generated
- **Total Cards:** ${state.executionData.cards.length}
- **Card Types:** ${[...new Set(state.executionData.cards.map(card => card.type))].join(', ')}
`)
    }

    // Add report generation events
    if (state.bilingual?.reports?.english) {
      timeline.push(`### English Report Generated
- **Created:** ${new Date(state.bilingual.reports.english.createdAt).toLocaleString()}
- **Content Length:** ${state.bilingual.reports.english.content?.length || 0} characters
`)
    }

    if (state.bilingual?.reports?.chinese) {
      timeline.push(`### Chinese Report Generated
- **Created:** ${new Date(state.bilingual.reports.chinese.createdAt).toLocaleString()}
- **Content Length:** ${state.bilingual.reports.chinese.content?.length || 0} characters
- **Translation Method:** ${state.bilingual.reports.chinese.translatedFrom ? 'Translated' : 'Generated'}
`)
    }

    timeline.push(`
---
*Generated by Research Report System*`)

    return timeline.join('\n')
  }

  // Add README file to zip root
  addReadmeFile(zip, state, timestamp) {
    const readme = `# Research Project Assets

**Project:** ${state.topic}  
**Generated:** ${new Date().toLocaleString()}  
**Export ID:** ${timestamp}  

## Contents

This archive contains all assets from your research project:

### 📁 reports/
- **english_report.mdx** - English report with full metadata
- **english_report.md** - Plain English markdown report
- **chinese_report.mdx** - Chinese report with full metadata (中文报告)
- **chinese_report.md** - Plain Chinese markdown report (中文报告)
- **bilingual_summary.md** - Comparison and summary of both versions

### 📁 research-cards/
- **card_XX_[title].md** - Individual research cards with full metadata
- **cards_summary.md** - Overview and statistics of all research cards

### 📁 metadata/
- **research_plan.json** - Original research plan in JSON format
- **project_statistics.json** - Comprehensive project statistics
- **timeline.md** - Project execution timeline

## Usage

### Reports
- Use the MDX files for rich document processing
- Use the MD files for standard markdown rendering
- Both languages contain identical information in their respective languages

### Research Cards
- Each card represents a research task result
- Cards include citations, metadata, and confidence scores
- Use cards_summary.md for a quick overview

### Metadata
- JSON files can be imported into other tools
- Timeline provides a chronological view of the research process

## Generated by Research Report System
**Version:** 1.0  
**Bilingual Support:** English & Simplified Chinese  
**Export Date:** ${new Date().toISOString()}  

---
For questions or support, refer to the system documentation.`

    zip.file('README.md', readme)
    console.log('✅ Added README file')
  }

  // Utility methods
  sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9\u4e00-\u9fff\-_\.\s]/g, '').replace(/\s+/g, '_').toLowerCase()
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export default new AssetsDownloadService()