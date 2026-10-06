import { Injectable, Logger } from '@nestjs/common';
import {
  AiProvider,
  DescriptionSection,
  GeneratedContent,
  GenerationTone,
} from '../interfaces';

export interface PromptGenerationContext {
  productName: string;
  brand?: string;
  category?: string;
  description?: string;
  specifications?: unknown[];
  attributes?: unknown[];
  variants?: unknown[];
  countryOfOrigin?: string;
  hsCode?: string;
}

export interface GenerationRequest {
  context: PromptGenerationContext;
  tone: GenerationTone;
  language: string;
  sections: DescriptionSection[];
  promptTemplateOverride?: string;
}

export interface GenerationResponse {
  content: GeneratedContent;
  tokensUsed: number;
  model: string;
  rawResponse?: string;
}

/**
 * Prompt builder + mock AI caller.
 * In production, replace the `callProvider` stubs with real SDK calls.
 */
@Injectable()
export class AiGenerationEngine {
  private readonly logger = new Logger(AiGenerationEngine.name);

  async generate(
    provider: AiProvider,
    model: string,
    request: GenerationRequest,
  ): Promise<GenerationResponse> {
    const prompt = this.buildPrompt(request);
    this.logger.log(
      `Calling ${provider}/${model} for sections: ${request.sections.join(', ')}`,
    );

    // In a real implementation each provider SDK would be called here.
    // Returning a structured stub so the module compiles end-to-end.
    const mockContent = this.buildMockContent(request.sections, request.context);

    return {
      content: mockContent,
      tokensUsed: prompt.length / 4,      // rough token estimate
      model,
    };
  }

  buildPrompt(request: GenerationRequest): string {
    const toneInstruction = this.toneInstruction(request.tone);
    const sectionInstructions = request.sections
      .map((s) => this.sectionInstruction(s))
      .join('\n');

    return [
      `You are an expert e-commerce copywriter. ${toneInstruction}`,
      `Language: ${request.language}`,
      ``,
      `Product: ${request.context.productName}`,
      request.context.brand ? `Brand: ${request.context.brand}` : '',
      request.context.category ? `Category: ${request.context.category}` : '',
      request.context.description ? `Base Description: ${request.context.description}` : '',
      ``,
      `Generate the following sections as a JSON object:`,
      sectionInstructions,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private toneInstruction(tone: GenerationTone): string {
    const map: Record<GenerationTone, string> = {
      [GenerationTone.PROFESSIONAL]: 'Write in a clear, professional tone.',
      [GenerationTone.PREMIUM]: 'Write in a premium, aspirational tone that conveys high value.',
      [GenerationTone.TECHNICAL]: 'Write in a precise, technical tone focusing on specifications.',
      [GenerationTone.MARKETING]: 'Write in an engaging, persuasive marketing tone.',
      [GenerationTone.LUXURY]: 'Write in an elegant, luxury brand tone with refined language.',
    };
    return map[tone] ?? 'Write in a professional tone.';
  }

  private sectionInstruction(section: DescriptionSection): string {
    const map: Record<DescriptionSection, string> = {
      [DescriptionSection.PRODUCT_TITLE]: '- productTitle: Compelling product title (max 200 chars)',
      [DescriptionSection.SHORT_DESCRIPTION]: '- shortDescription: 1–2 sentence summary (max 500 chars)',
      [DescriptionSection.LONG_DESCRIPTION]: '- longDescription: Full HTML-ready description (500–2000 chars)',
      [DescriptionSection.BULLET_POINTS]: '- bulletPoints: Array of 5–7 concise bullet points',
      [DescriptionSection.KEY_FEATURES]: '- keyFeatures: Array of 4–6 key product features',
      [DescriptionSection.KEY_BENEFITS]: '- keyBenefits: Array of 4–6 customer benefits',
      [DescriptionSection.TECHNICAL_SPECIFICATIONS]: '- technicalSpecifications: Formatted technical specs string',
      [DescriptionSection.PACKAGE_CONTENTS]: '- packageContents: What is included in the package',
      [DescriptionSection.USAGE_INSTRUCTIONS]: '- usageInstructions: How to use the product',
      [DescriptionSection.CARE_INSTRUCTIONS]: '- careInstructions: Maintenance and care tips',
      [DescriptionSection.WARRANTY_INFORMATION]: '- warrantyInformation: Warranty terms and coverage',
      [DescriptionSection.FAQS]: '- faqs: Array of { question, answer } objects (3–5 FAQs)',
      [DescriptionSection.SEARCH_KEYWORDS]: '- searchKeywords: Array of 8–15 SEO keywords',
      [DescriptionSection.BACKEND_SEARCH_TERMS]: '- backendSearchTerms: Array of 10–20 backend search terms',
    };
    return map[section] ?? `- ${section}: Generate content for this section`;
  }

  private buildMockContent(
    sections: DescriptionSection[],
    ctx: PromptGenerationContext,
  ): GeneratedContent {
    const content: GeneratedContent = {};
    for (const section of sections) {
      switch (section) {
        case DescriptionSection.PRODUCT_TITLE:
          content.productTitle = ctx.productName;
          break;
        case DescriptionSection.SHORT_DESCRIPTION:
          content.shortDescription = ctx.description ?? `Premium ${ctx.productName} from ${ctx.brand ?? 'trusted brand'}.`;
          break;
        case DescriptionSection.LONG_DESCRIPTION:
          content.longDescription = `<p>${ctx.description ?? `Discover the exceptional ${ctx.productName}.`}</p>`;
          break;
        case DescriptionSection.BULLET_POINTS:
          content.bulletPoints = [`High quality ${ctx.productName}`, 'Durable construction', 'Easy to use'];
          break;
        case DescriptionSection.KEY_FEATURES:
          content.keyFeatures = ['Premium materials', 'Ergonomic design'];
          break;
        case DescriptionSection.KEY_BENEFITS:
          content.keyBenefits = ['Long-lasting performance', 'Great value for money'];
          break;
        case DescriptionSection.TECHNICAL_SPECIFICATIONS:
          content.technicalSpecifications = 'See product specifications for full details.';
          break;
        case DescriptionSection.PACKAGE_CONTENTS:
          content.packageContents = `1x ${ctx.productName}, User Manual`;
          break;
        case DescriptionSection.USAGE_INSTRUCTIONS:
          content.usageInstructions = 'Follow the included instructions for best results.';
          break;
        case DescriptionSection.CARE_INSTRUCTIONS:
          content.careInstructions = 'Clean with a dry cloth. Store in a cool, dry place.';
          break;
        case DescriptionSection.WARRANTY_INFORMATION:
          content.warrantyInformation = '1-year manufacturer warranty.';
          break;
        case DescriptionSection.FAQS:
          content.faqs = [
            { question: `What is ${ctx.productName}?`, answer: ctx.description ?? 'A high-quality product.' },
          ];
          break;
        case DescriptionSection.SEARCH_KEYWORDS:
          content.searchKeywords = [ctx.productName, ctx.brand ?? ''].filter(Boolean);
          break;
        case DescriptionSection.BACKEND_SEARCH_TERMS:
          content.backendSearchTerms = [ctx.productName, ctx.category ?? ''].filter(Boolean);
          break;
      }
    }
    return content;
  }
}
