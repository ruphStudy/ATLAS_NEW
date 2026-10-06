'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, History, Loader2, RefreshCw, Sparkles, Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TextDiffView } from '@/components/ai-content/text-diff-view';
import {
  useAiDescriptionHistory,
  useAiImageSetHistory,
  useAiModels,
  useApproveAiDescription,
  useApproveAiImages,
  useApproveSeoOptimization,
  useCreateAiDescription,
  useCreateAiImageSet,
  useCreateListingApproval,
  useCreateSeoOptimization,
  useCreateUniversalListing,
  useLatestAiDescription,
  useLatestAiImageSet,
  useLatestApprovalForListing,
  useLatestSeoOptimization,
  useManualEditAiDescription,
  useManualEditSeoOptimization,
  useManualUploadAiImage,
  useMarketplaceListings,
  useMarkListingReadyToPublish,
  useProduct,
  useRegenerateAiDescriptionSections,
  useRegenerateAiImages,
  useRegenerateSeoSections,
  useRegenerateUniversalListing,
  useApproveListingApproval,
  useRejectListingApproval,
  useSeoOptimizationHistory,
  useTransformToMarketplace,
  useUniversalListings,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type {
  AiDescriptionProviderKey,
  AiGenerationTone,
  AiImageAspectRatio,
  AiImageProviderKey,
  AiImageResolutionKey,
  AiImageStyleKey,
  AiImageTypeKey,
  BatchAiImageRequest,
  DescriptionSectionKey,
  GeneratedDescriptionContent,
  ListingSection,
  SeoOptimizationProviderKey,
  SeoOptimizedContent,
  SeoSectionKey,
} from '@/types';

const DESCRIPTION_PROVIDERS: AiDescriptionProviderKey[] = ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'CUSTOM'];
const TONES: AiGenerationTone[] = ['PROFESSIONAL', 'PREMIUM', 'TECHNICAL', 'MARKETING', 'LUXURY'];
const DESCRIPTION_SECTIONS: DescriptionSectionKey[] = [
  'PRODUCT_TITLE', 'SHORT_DESCRIPTION', 'LONG_DESCRIPTION', 'BULLET_POINTS', 'KEY_FEATURES', 'KEY_BENEFITS',
  'TECHNICAL_SPECIFICATIONS', 'PACKAGE_CONTENTS', 'USAGE_INSTRUCTIONS', 'CARE_INSTRUCTIONS',
  'WARRANTY_INFORMATION', 'FAQS', 'SEARCH_KEYWORDS', 'BACKEND_SEARCH_TERMS',
];
const SEO_PROVIDERS: SeoOptimizationProviderKey[] = ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'CUSTOM'];
const SEO_SECTIONS: SeoSectionKey[] = ['PRODUCT_TITLE', 'BULLET_POINTS', 'DESCRIPTION', 'BACKEND_SEARCH_TERMS', 'SEARCH_KEYWORDS', 'BRAND_KEYWORDS', 'CATEGORY_KEYWORDS', 'LONG_TAIL_KEYWORDS', 'IMAGE_ALT_TEXT'];
const IMAGE_PROVIDERS: AiImageProviderKey[] = ['OPENAI_DALLE', 'STABILITY_AI', 'MIDJOURNEY', 'GOOGLE_IMAGEN', 'CUSTOM'];
const IMAGE_TYPES: AiImageTypeKey[] = ['MAIN_PRODUCT', 'WHITE_BACKGROUND', 'LIFESTYLE', 'INFOGRAPHIC', 'FEATURE_HIGHLIGHT', 'DIMENSION', 'PACKAGING', 'VARIANT', 'BRAND', 'PROMOTIONAL'];
const IMAGE_STYLES: AiImageStyleKey[] = ['PHOTOREALISTIC', 'STUDIO', 'LIFESTYLE', 'FLAT_LAY', 'MINIMALIST', 'LUXURY', 'VIBRANT', 'TECHNICAL'];
const IMAGE_ASPECT_RATIOS: AiImageAspectRatio[] = ['SQUARE_1_1', 'LANDSCAPE_16_9', 'PORTRAIT_4_5', 'PORTRAIT_9_16', 'LANDSCAPE_4_3', 'BANNER_3_1'];
const IMAGE_RESOLUTIONS: AiImageResolutionKey[] = ['SD_512', 'HD_1024', 'FHD_2048', 'UHD_4096'];
const LISTING_SECTIONS: ListingSection[] = ['TITLE', 'BRAND', 'CATEGORY', 'DESCRIPTION', 'BULLET_POINTS', 'IMAGES', 'VARIANTS', 'ATTRIBUTES', 'SPECIFICATIONS', 'SEARCH_TERMS', 'PRICING', 'SEO'];

const QUALITY_TONE: StatusTone = 'purple';

function multiline(values?: string[] | null) {
  return (values ?? []).join('\n');
}
function parseMultiline(text: string): string[] {
  return text.split('\n').map((s) => s.trim()).filter(Boolean);
}

export default function AiContentWorkspacePage() {
  const params = useParams();
  const catalogProductId = params.id as string;
  const { data: product, isLoading, isError, error, refetch } = useProduct(catalogProductId);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this product." />;
  if (isLoading || !product) {
    return (
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={product.productName}
        description="AI content generation workspace"
        breadcrumbs={[{ label: 'AI Content Studio', href: '/dashboard/ai-content-studio' }, { label: product.productName }]}
        actions={<StatusBadge status={product.status} />}
      />

      <Tabs defaultValue="description">
        <TabsList>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="listing">Listing & Readiness</TabsTrigger>
        </TabsList>
        <TabsContent value="description">
          <DescriptionTab catalogProductId={catalogProductId} currentTitle={product.productName} currentShort={product.shortDescription} currentLong={product.description} />
        </TabsContent>
        <TabsContent value="seo">
          <SeoTab catalogProductId={catalogProductId} currentTitle={product.productName} currentDescription={product.description} />
        </TabsContent>
        <TabsContent value="images">
          <ImagesTab catalogProductId={catalogProductId} currentImages={product.images} />
        </TabsContent>
        <TabsContent value="listing">
          <ListingTab catalogProductId={catalogProductId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}

function useModelOptions(provider: string) {
  const { data } = useAiModels({ status: 'ACTIVE', provider: provider || undefined, limit: 100 });
  return (data?.data ?? []).filter((m) => !provider || m.provider.toUpperCase() === provider.toUpperCase());
}

/* ───────────────────────── Description Tab ───────────────────────── */

function DescriptionTab({ catalogProductId, currentTitle, currentShort, currentLong }: { catalogProductId: string; currentTitle: string; currentShort?: string | null; currentLong?: string | null }) {
  const { data: description, isLoading } = useLatestAiDescription(catalogProductId);
  const create = useCreateAiDescription();
  const [provider, setProvider] = useState<AiDescriptionProviderKey>('OPENAI');
  const [model, setModel] = useState('');
  const [tone, setTone] = useState<AiGenerationTone>('PROFESSIONAL');
  const [language, setLanguage] = useState('en');
  const modelOptions = useModelOptions(provider);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!description) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Generate AI description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField label="Provider" htmlFor="desc-provider" required>
              <Select id="desc-provider" value={provider} onChange={(e) => { setProvider(e.target.value as AiDescriptionProviderKey); setModel(''); }} options={DESCRIPTION_PROVIDERS.map((p) => ({ value: p, label: p }))} />
            </FormField>
            <FormField label="Model (optional)" htmlFor="desc-model" hint="Only models registered for this provider.">
              <Select id="desc-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Provider default" options={modelOptions.map((m) => ({ value: m.modelKey, label: m.displayName }))} />
            </FormField>
            <FormField label="Tone" htmlFor="desc-tone" required>
              <Select id="desc-tone" value={tone} onChange={(e) => setTone(e.target.value as AiGenerationTone)} options={TONES.map((t) => ({ value: t, label: t }))} />
            </FormField>
            <FormField label="Language" htmlFor="desc-lang">
              <Input id="desc-lang" value={language} onChange={(e) => setLanguage(e.target.value)} />
            </FormField>
          </div>
          <Button
            onClick={() => create.mutate({ catalogProductId, provider, model: model || undefined, tone, language })}
            disabled={create.isPending}
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate description
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <DescriptionDetail
      description={description}
      currentTitle={currentTitle}
      currentShort={currentShort}
      currentLong={currentLong}
    />
  );
}

function DescriptionDetail({
  description,
  currentTitle,
  currentShort,
  currentLong,
}: {
  description: NonNullable<ReturnType<typeof useLatestAiDescription>['data']>;
  currentTitle: string;
  currentShort?: string | null;
  currentLong?: string | null;
}) {
  const approve = useApproveAiDescription(description.id);
  const [regenOpen, setRegenOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const canApprove = description.status === 'GENERATED' || description.status === 'MANUALLY_EDITED';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Description v{description.version}</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={description.status} />
              {description.aiQualityScore != null && <StatusBadge status={`Quality ${Math.round(description.aiQualityScore)}`} tone={QUALITY_TONE} />}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {description.status === 'FAILED' && description.errorMessage && (
            <p className="rounded-[var(--radius)] border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{description.errorMessage}</p>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Field label="Provider" value={description.provider} />
            <Field label="Model" value={description.model ?? 'default'} />
            <Field label="Tone" value={description.tone} />
            <Field label="Language" value={description.language} />
            <Field label="Tokens used" value={description.tokensUsed != null ? String(description.tokensUsed) : '—'} />
            <Field label="Cost" value={description.generationCostUsd != null ? `$${description.generationCostUsd.toFixed(4)}` : '—'} />
            <Field label="Generated" value={description.generationCompletedAt ? formatDate(description.generationCompletedAt) : '—'} />
            <Field label="Prompt template" value={description.promptTemplateId ?? '—'} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current title</p>
              <p className="text-sm text-muted-foreground">{currentTitle}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Generated title (diff)</p>
              <TextDiffView before={currentTitle} after={description.content.productTitle} />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current short description</p>
              <p className="text-sm text-muted-foreground">{currentShort ?? '—'}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Generated short description (diff)</p>
              <TextDiffView before={currentShort} after={description.content.shortDescription} />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current long description</p>
              <p className="text-sm text-muted-foreground">{currentLong ?? '—'}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Generated long description (diff)</p>
              <TextDiffView before={currentLong} after={description.content.longDescription} />
            </div>
          </div>

          <ContentSections content={description.content} />

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="h-3.5 w-3.5" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit content
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRegenOpen(true)}>
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate sections
            </Button>
            {canApprove && (
              <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
                {approve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Approve
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <RegenerateDescriptionDialog id={description.id} open={regenOpen} onOpenChange={setRegenOpen} currentTone={description.tone} currentLanguage={description.language} />
      <EditDescriptionDialog id={description.id} content={description.content} open={editOpen} onOpenChange={setEditOpen} />
      <DescriptionHistoryDialog id={description.id} open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}

function ContentSections({ content }: { content: GeneratedDescriptionContent }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {content.bulletPoints && content.bulletPoints.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bullet points</p>
          <ul className="list-disc space-y-0.5 pl-4 text-sm text-foreground">{content.bulletPoints.map((b, i) => <li key={i}>{b}</li>)}</ul>
        </div>
      )}
      {content.keyFeatures && content.keyFeatures.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key features</p>
          <ul className="list-disc space-y-0.5 pl-4 text-sm text-foreground">{content.keyFeatures.map((b, i) => <li key={i}>{b}</li>)}</ul>
        </div>
      )}
      {content.keyBenefits && content.keyBenefits.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key benefits</p>
          <ul className="list-disc space-y-0.5 pl-4 text-sm text-foreground">{content.keyBenefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
        </div>
      )}
      {content.searchKeywords && content.searchKeywords.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search keywords</p>
          <div className="flex flex-wrap gap-1.5">{content.searchKeywords.map((k, i) => <Badge key={i} variant="secondary" className="text-[10px]">{k}</Badge>)}</div>
        </div>
      )}
      {content.faqs && content.faqs.length > 0 && (
        <div className="sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">FAQs</p>
          <ul className="space-y-1 text-sm text-foreground">{content.faqs.map((f, i) => <li key={i}><span className="font-medium">{f.question}</span> — {f.answer}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function RegenerateDescriptionDialog({ id, open, onOpenChange, currentTone, currentLanguage }: { id: string; open: boolean; onOpenChange: (o: boolean) => void; currentTone: AiGenerationTone; currentLanguage: string }) {
  const regenerate = useRegenerateAiDescriptionSections(id);
  const [sections, setSections] = useState<DescriptionSectionKey[]>([]);
  const [reason, setReason] = useState('');

  const toggle = (s: DescriptionSectionKey) => setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Regenerate sections</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-[var(--radius)] border border-border p-3">
          {DESCRIPTION_SECTIONS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-xs text-foreground">
              <Checkbox checked={sections.includes(s)} onChange={() => toggle(s)} />
              {s.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
        <FormField label="Reason (optional)" htmlFor="regen-reason">
          <Textarea id="regen-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => regenerate.mutate({ sections, tone: currentTone, language: currentLanguage, reason: reason || undefined }, { onSuccess: () => { onOpenChange(false); setSections([]); setReason(''); } })}
            disabled={sections.length === 0 || regenerate.isPending}
          >
            {regenerate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDescriptionDialog({ id, content, open, onOpenChange }: { id: string; content: GeneratedDescriptionContent; open: boolean; onOpenChange: (o: boolean) => void }) {
  const edit = useManualEditAiDescription(id);
  const [form, setForm] = useState({
    productTitle: content.productTitle ?? '',
    shortDescription: content.shortDescription ?? '',
    longDescription: content.longDescription ?? '',
    bulletPoints: multiline(content.bulletPoints),
    keyFeatures: multiline(content.keyFeatures),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Edit description content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Product title" htmlFor="edit-title">
            <Input id="edit-title" value={form.productTitle} onChange={(e) => setForm((f) => ({ ...f, productTitle: e.target.value }))} />
          </FormField>
          <FormField label="Short description" htmlFor="edit-short">
            <Textarea id="edit-short" value={form.shortDescription} onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} rows={2} />
          </FormField>
          <FormField label="Long description" htmlFor="edit-long">
            <Textarea id="edit-long" value={form.longDescription} onChange={(e) => setForm((f) => ({ ...f, longDescription: e.target.value }))} rows={5} />
          </FormField>
          <FormField label="Bullet points (one per line)" htmlFor="edit-bullets">
            <Textarea id="edit-bullets" value={form.bulletPoints} onChange={(e) => setForm((f) => ({ ...f, bulletPoints: e.target.value }))} rows={4} />
          </FormField>
          <FormField label="Key features (one per line)" htmlFor="edit-features">
            <Textarea id="edit-features" value={form.keyFeatures} onChange={(e) => setForm((f) => ({ ...f, keyFeatures: e.target.value }))} rows={4} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() =>
              edit.mutate(
                {
                  content: {
                    ...content,
                    productTitle: form.productTitle || undefined,
                    shortDescription: form.shortDescription || undefined,
                    longDescription: form.longDescription || undefined,
                    bulletPoints: parseMultiline(form.bulletPoints),
                    keyFeatures: parseMultiline(form.keyFeatures),
                  },
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
            disabled={edit.isPending}
          >
            {edit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save edits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DescriptionHistoryDialog({ id, open, onOpenChange }: { id: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: history } = useAiDescriptionHistory(open ? id : undefined);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
        </DialogHeader>
        {!history || history.length === 0 ? (
          <EmptyState title="No history yet" className="border-none py-8" />
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-[var(--radius)] border border-border p-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">v{h.version}</span>
                  <span className="text-xs text-muted-foreground">{h.fromStatus} → {h.toStatus}</span>
                </div>
                {h.sectionsRegenerated && h.sectionsRegenerated.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">Sections: {h.sectionsRegenerated.join(', ')}</p>
                )}
                {h.reason && <p className="mt-1 text-xs text-muted-foreground">{h.reason}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── SEO Tab ───────────────────────── */

function SeoTab({ catalogProductId, currentTitle, currentDescription }: { catalogProductId: string; currentTitle: string; currentDescription?: string | null }) {
  const { data: seo, isLoading } = useLatestSeoOptimization(catalogProductId);
  const create = useCreateSeoOptimization();
  const [provider, setProvider] = useState<SeoOptimizationProviderKey>('OPENAI');
  const [model, setModel] = useState('');
  const [marketplace, setMarketplace] = useState('');
  const [targetKeywords, setTargetKeywords] = useState('');
  const modelOptions = useModelOptions(provider);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!seo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Run AI SEO optimization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField label="Provider" htmlFor="seo-provider" required>
              <Select id="seo-provider" value={provider} onChange={(e) => { setProvider(e.target.value as SeoOptimizationProviderKey); setModel(''); }} options={SEO_PROVIDERS.map((p) => ({ value: p, label: p }))} />
            </FormField>
            <FormField label="Model (optional)" htmlFor="seo-model">
              <Select id="seo-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Provider default" options={modelOptions.map((m) => ({ value: m.modelKey, label: m.displayName }))} />
            </FormField>
            <FormField label="Marketplace (optional)" htmlFor="seo-marketplace" hint="Marketplace-specific SEO rules">
              <Input id="seo-marketplace" value={marketplace} onChange={(e) => setMarketplace(e.target.value)} placeholder="e.g. amazon" />
            </FormField>
            <FormField label="Target keywords" htmlFor="seo-keywords" hint="Comma-separated">
              <Input id="seo-keywords" value={targetKeywords} onChange={(e) => setTargetKeywords(e.target.value)} />
            </FormField>
          </div>
          <Button
            onClick={() =>
              create.mutate({
                catalogProductId,
                provider,
                model: model || undefined,
                marketplace: marketplace || undefined,
                targetKeywords: targetKeywords ? targetKeywords.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
              })
            }
            disabled={create.isPending}
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Run SEO optimization
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <SeoDetail seo={seo} currentTitle={currentTitle} currentDescription={currentDescription} />;
}

function SeoDetail({ seo, currentTitle, currentDescription }: { seo: NonNullable<ReturnType<typeof useLatestSeoOptimization>['data']>; currentTitle: string; currentDescription?: string | null }) {
  const approve = useApproveSeoOptimization(seo.id);
  const [regenOpen, setRegenOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const canApprove = seo.status === 'OPTIMIZED' || seo.status === 'MANUALLY_EDITED';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>SEO v{seo.version}</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={seo.status} />
              {seo.seoScore != null && <StatusBadge status={`SEO score ${Math.round(seo.seoScore)}`} tone={QUALITY_TONE} />}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {seo.status === 'FAILED' && seo.errorMessage && (
            <p className="rounded-[var(--radius)] border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{seo.errorMessage}</p>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Field label="Provider" value={seo.provider} />
            <Field label="Model" value={seo.model ?? 'default'} />
            <Field label="Marketplace" value={seo.marketplace ?? 'all'} />
            <Field label="Tokens used" value={seo.tokensUsed != null ? String(seo.tokensUsed) : '—'} />
            <Field label="Cost" value={seo.optimizationCostUsd != null ? `$${seo.optimizationCostUsd.toFixed(4)}` : '—'} />
            <Field label="Target keywords" value={seo.targetKeywords?.join(', ') || '—'} />
          </div>

          {seo.analysis && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Readability</p>
                <p className="text-sm text-foreground">Score {Math.round(seo.analysis.readability.score)} · {seo.analysis.readability.gradeLevel}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search intent</p>
                <p className="text-sm text-foreground">{seo.analysis.searchIntent}</p>
              </div>
              {seo.analysis.duplicateContent.isDuplicate && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-warning">Possible duplicate content ({Math.round(seo.analysis.duplicateContent.duplicateRatio * 100)}% similarity)</p>
                </div>
              )}
              {seo.analysis.keywordDensity.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Keyword coverage</p>
                  <div className="flex flex-wrap gap-1.5">
                    {seo.analysis.keywordDensity.map((k, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{k.keyword} · {k.occurrences}× ({Math.round(k.density * 100) / 100}%)</Badge>
                    ))}
                  </div>
                </div>
              )}
              {seo.analysis.recommendations.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendations</p>
                  <ul className="space-y-1">
                    {seo.analysis.recommendations.map((r, i) => (
                      <li key={i} className="text-sm">
                        <Badge variant={r.priority === 'HIGH' ? 'danger' : r.priority === 'MEDIUM' ? 'warning' : 'secondary'} className="mr-1.5 text-[10px]">{r.priority}</Badge>
                        <span className="text-foreground">{r.issue}</span> — <span className="text-muted-foreground">{r.suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current title</p>
              <p className="text-sm text-muted-foreground">{currentTitle}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Optimized title (diff)</p>
              <TextDiffView before={currentTitle} after={seo.optimizedContent.productTitle} />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current description</p>
              <p className="text-sm text-muted-foreground">{currentDescription ?? '—'}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Optimized description (diff)</p>
              <TextDiffView before={currentDescription} after={seo.optimizedContent.description} />
            </div>
          </div>

          {seo.optimizedContent.searchKeywords && seo.optimizedContent.searchKeywords.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search keywords</p>
              <div className="flex flex-wrap gap-1.5">{seo.optimizedContent.searchKeywords.map((k, i) => <Badge key={i} variant="secondary" className="text-[10px]">{k}</Badge>)}</div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="h-3.5 w-3.5" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit content
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRegenOpen(true)}>
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate sections
            </Button>
            {canApprove && (
              <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
                {approve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Approve
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <RegenerateSeoDialog id={seo.id} open={regenOpen} onOpenChange={setRegenOpen} />
      <EditSeoDialog id={seo.id} content={seo.optimizedContent} open={editOpen} onOpenChange={setEditOpen} />
      <SeoHistoryDialog id={seo.id} open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}

function RegenerateSeoDialog({ id, open, onOpenChange }: { id: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const regenerate = useRegenerateSeoSections(id);
  const [sections, setSections] = useState<SeoSectionKey[]>([]);
  const [targetKeywords, setTargetKeywords] = useState('');
  const [reason, setReason] = useState('');

  const toggle = (s: SeoSectionKey) => setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Regenerate SEO sections</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-[var(--radius)] border border-border p-3">
          {SEO_SECTIONS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-xs text-foreground">
              <Checkbox checked={sections.includes(s)} onChange={() => toggle(s)} />
              {s.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
        <FormField label="Target keywords (optional, comma-separated)" htmlFor="regen-seo-keywords">
          <Input id="regen-seo-keywords" value={targetKeywords} onChange={(e) => setTargetKeywords(e.target.value)} />
        </FormField>
        <FormField label="Reason (optional)" htmlFor="regen-seo-reason">
          <Textarea id="regen-seo-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() =>
              regenerate.mutate(
                { sections, targetKeywords: targetKeywords ? targetKeywords.split(',').map((k) => k.trim()).filter(Boolean) : undefined, reason: reason || undefined },
                { onSuccess: () => { onOpenChange(false); setSections([]); setTargetKeywords(''); setReason(''); } },
              )
            }
            disabled={sections.length === 0 || regenerate.isPending}
          >
            {regenerate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditSeoDialog({ id, content, open, onOpenChange }: { id: string; content: SeoOptimizedContent; open: boolean; onOpenChange: (o: boolean) => void }) {
  const edit = useManualEditSeoOptimization(id);
  const [form, setForm] = useState({
    productTitle: content.productTitle ?? '',
    description: content.description ?? '',
    bulletPoints: multiline(content.bulletPoints),
    searchKeywords: multiline(content.searchKeywords),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Edit SEO content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Product title" htmlFor="seo-edit-title">
            <Input id="seo-edit-title" value={form.productTitle} onChange={(e) => setForm((f) => ({ ...f, productTitle: e.target.value }))} />
          </FormField>
          <FormField label="Description" htmlFor="seo-edit-desc">
            <Textarea id="seo-edit-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={5} />
          </FormField>
          <FormField label="Bullet points (one per line)" htmlFor="seo-edit-bullets">
            <Textarea id="seo-edit-bullets" value={form.bulletPoints} onChange={(e) => setForm((f) => ({ ...f, bulletPoints: e.target.value }))} rows={4} />
          </FormField>
          <FormField label="Search keywords (one per line)" htmlFor="seo-edit-keywords">
            <Textarea id="seo-edit-keywords" value={form.searchKeywords} onChange={(e) => setForm((f) => ({ ...f, searchKeywords: e.target.value }))} rows={4} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() =>
              edit.mutate(
                {
                  content: {
                    ...content,
                    productTitle: form.productTitle || undefined,
                    description: form.description || undefined,
                    bulletPoints: parseMultiline(form.bulletPoints),
                    searchKeywords: parseMultiline(form.searchKeywords),
                  },
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
            disabled={edit.isPending}
          >
            {edit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save edits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SeoHistoryDialog({ id, open, onOpenChange }: { id: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: history } = useSeoOptimizationHistory(open ? id : undefined);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
        </DialogHeader>
        {!history || history.length === 0 ? (
          <EmptyState title="No history yet" className="border-none py-8" />
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-[var(--radius)] border border-border p-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">v{h.version}</span>
                  <span className="text-xs text-muted-foreground">{h.fromStatus} → {h.toStatus}</span>
                </div>
                {h.reason && <p className="mt-1 text-xs text-muted-foreground">{h.reason}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Images Tab ───────────────────────── */

function ImagesTab({ catalogProductId, currentImages }: { catalogProductId: string; currentImages: string[] }) {
  const { data: imageSet, isLoading } = useLatestAiImageSet(catalogProductId);
  const create = useCreateAiImageSet();
  const [provider, setProvider] = useState<AiImageProviderKey>('OPENAI_DALLE');
  const [model, setModel] = useState('');
  const [basePrompt, setBasePrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [requests, setRequests] = useState<BatchAiImageRequest[]>([]);
  const modelOptions = useModelOptions(provider);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!imageSet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Generate AI images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField label="Provider" htmlFor="img-provider" required>
              <Select id="img-provider" value={provider} onChange={(e) => { setProvider(e.target.value as AiImageProviderKey); setModel(''); }} options={IMAGE_PROVIDERS.map((p) => ({ value: p, label: p }))} />
            </FormField>
            <FormField label="Model (optional)" htmlFor="img-model">
              <Select id="img-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Provider default" options={modelOptions.map((m) => ({ value: m.modelKey, label: m.displayName }))} />
            </FormField>
            <FormField label="Base prompt (optional)" htmlFor="img-base-prompt">
              <Input id="img-base-prompt" value={basePrompt} onChange={(e) => setBasePrompt(e.target.value)} />
            </FormField>
            <FormField label="Negative prompt (optional)" htmlFor="img-neg-prompt">
              <Input id="img-neg-prompt" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} />
            </FormField>
          </div>

          <ImageRequestBuilder requests={requests} onChange={setRequests} />

          {currentImages.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current product images</p>
              <div className="flex flex-wrap gap-2">
                {currentImages.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="h-16 w-16 rounded-[var(--radius)] border border-border object-cover" />
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() =>
              create.mutate({
                catalogProductId,
                provider,
                model: model || undefined,
                basePrompt: basePrompt || undefined,
                negativePrompt: negativePrompt || undefined,
                requests: requests.length > 0 ? requests : undefined,
              })
            }
            disabled={create.isPending}
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate images
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <ImageSetDetail imageSet={imageSet} currentImages={currentImages} />;
}

function ImageRequestBuilder({ requests, onChange }: { requests: BatchAiImageRequest[]; onChange: (r: BatchAiImageRequest[]) => void }) {
  const addRequest = () => onChange([...requests, { imageType: 'MAIN_PRODUCT', style: 'PHOTOREALISTIC', aspectRatio: 'SQUARE_1_1', resolution: 'HD_1024' }]);
  const updateRequest = (i: number, patch: Partial<BatchAiImageRequest>) => onChange(requests.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRequest = (i: number) => onChange(requests.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image requests (optional — leave empty for provider defaults)</p>
        <Button variant="outline" size="sm" onClick={addRequest}>Add request</Button>
      </div>
      {requests.length > 0 && (
        <div className="space-y-2">
          {requests.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-[var(--radius)] border border-border p-2 sm:grid-cols-5">
              <Select value={r.imageType} onChange={(e) => updateRequest(i, { imageType: e.target.value as AiImageTypeKey })} options={IMAGE_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} className="h-9" />
              <Select value={r.style} onChange={(e) => updateRequest(i, { style: e.target.value as AiImageStyleKey })} options={IMAGE_STYLES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} className="h-9" />
              <Select value={r.aspectRatio} onChange={(e) => updateRequest(i, { aspectRatio: e.target.value as AiImageAspectRatio })} options={IMAGE_ASPECT_RATIOS.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} className="h-9" />
              <Select value={r.resolution} onChange={(e) => updateRequest(i, { resolution: e.target.value as AiImageResolutionKey })} options={IMAGE_RESOLUTIONS.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} className="h-9" />
              <Button variant="ghost" size="sm" onClick={() => removeRequest(i)}>Remove</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageSetDetail({ imageSet, currentImages }: { imageSet: NonNullable<ReturnType<typeof useLatestAiImageSet>['data']>; currentImages: string[] }) {
  const approve = useApproveAiImages(imageSet.id);
  const [regenOpen, setRegenOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const canApprove = imageSet.status === 'GENERATED' || imageSet.status === 'MANUALLY_UPLOADED';

  const toggleSelect = (imageId: string) => setSelected((prev) => (prev.includes(imageId) ? prev.filter((i) => i !== imageId) : [...prev, imageId]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Image set v{imageSet.version}</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={imageSet.status} />
              {imageSet.imageQualityScore != null && <StatusBadge status={`Quality ${Math.round(imageSet.imageQualityScore)}`} tone={QUALITY_TONE} />}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {imageSet.status === 'FAILED' && imageSet.errorMessage && (
            <p className="rounded-[var(--radius)] border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{imageSet.errorMessage}</p>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Field label="Provider" value={imageSet.provider} />
            <Field label="Model" value={imageSet.model ?? 'default'} />
            <Field label="Images generated" value={imageSet.imagesGenerated != null ? String(imageSet.imagesGenerated) : '—'} />
            <Field label="Cost" value={imageSet.generationCostUsd != null ? `$${imageSet.generationCostUsd.toFixed(4)}` : '—'} />
          </div>

          {currentImages.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current product images</p>
              <div className="flex flex-wrap gap-2">
                {currentImages.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="h-16 w-16 rounded-[var(--radius)] border border-border object-cover" />
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Generated images ({imageSet.images.length})</p>
            {imageSet.images.length === 0 ? (
              <p className="text-sm text-muted-foreground">No images yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {imageSet.images.map((img) => (
                  <div key={img.imageId} className="overflow-hidden rounded-[var(--radius)] border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.thumbnailUrl ?? img.url} alt={img.imageType} className="h-32 w-full object-cover" />
                    <div className="space-y-1 p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{img.imageType.replace(/_/g, ' ')}</span>
                        {img.isApproved && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                      </div>
                      <p className="text-muted-foreground">{img.style.toLowerCase()} · {img.aspectRatio.replace(/_/g, ' ')}</p>
                      {img.qualityScore != null && <p className="text-muted-foreground">Quality {Math.round(img.qualityScore)}</p>}
                      {!img.isApproved && (
                        <label className="flex items-center gap-1.5 pt-1">
                          <Checkbox checked={selected.includes(img.imageId)} onChange={() => toggleSelect(img.imageId)} />
                          <span>Select to approve</span>
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="h-3.5 w-3.5" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-3.5 w-3.5" />
              Manual upload
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRegenOpen(true)}>
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
            {canApprove && (
              <Button
                size="sm"
                onClick={() => approve.mutate(selected.length > 0 ? { approvedImageIds: selected } : {}, { onSuccess: () => setSelected([]) })}
                disabled={approve.isPending}
              >
                {approve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {selected.length > 0 ? `Approve ${selected.length} selected` : 'Approve all'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <RegenerateImagesDialog id={imageSet.id} open={regenOpen} onOpenChange={setRegenOpen} />
      <ManualUploadImageDialog id={imageSet.id} open={uploadOpen} onOpenChange={setUploadOpen} />
      <ImageHistoryDialog id={imageSet.id} open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}

function RegenerateImagesDialog({ id, open, onOpenChange }: { id: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const regenerate = useRegenerateAiImages(id);
  const [imageTypes, setImageTypes] = useState<AiImageTypeKey[]>([]);
  const [reason, setReason] = useState('');

  const toggle = (t: AiImageTypeKey) => setImageTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Regenerate images</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-[var(--radius)] border border-border p-3">
          {IMAGE_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2 text-xs text-foreground">
              <Checkbox checked={imageTypes.includes(t)} onChange={() => toggle(t)} />
              {t.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
        <FormField label="Reason (optional)" htmlFor="regen-img-reason">
          <Textarea id="regen-img-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => regenerate.mutate({ imageTypes, reason: reason || undefined }, { onSuccess: () => { onOpenChange(false); setImageTypes([]); setReason(''); } })}
            disabled={imageTypes.length === 0 || regenerate.isPending}
          >
            {regenerate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualUploadImageDialog({ id, open, onOpenChange }: { id: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const upload = useManualUploadAiImage(id);
  const [form, setForm] = useState({ url: '', thumbnailUrl: '', imageType: 'MAIN_PRODUCT' as AiImageTypeKey, style: 'PHOTOREALISTIC' as AiImageStyleKey, aspectRatio: 'SQUARE_1_1' as AiImageAspectRatio, resolution: 'HD_1024' as AiImageResolutionKey, notes: '' });

  const reset = () => setForm({ url: '', thumbnailUrl: '', imageType: 'MAIN_PRODUCT', style: 'PHOTOREALISTIC', aspectRatio: 'SQUARE_1_1', resolution: 'HD_1024', notes: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Manually upload an image</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Image URL" htmlFor="upload-url" required>
            <Input id="upload-url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </FormField>
          <FormField label="Thumbnail URL (optional)" htmlFor="upload-thumb">
            <Input id="upload-thumb" value={form.thumbnailUrl} onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))} />
          </FormField>
          <FormField label="Image type" htmlFor="upload-type" required>
            <Select id="upload-type" value={form.imageType} onChange={(e) => setForm((f) => ({ ...f, imageType: e.target.value as AiImageTypeKey }))} options={IMAGE_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
          </FormField>
          <FormField label="Style" htmlFor="upload-style" required>
            <Select id="upload-style" value={form.style} onChange={(e) => setForm((f) => ({ ...f, style: e.target.value as AiImageStyleKey }))} options={IMAGE_STYLES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
          </FormField>
          <FormField label="Aspect ratio" htmlFor="upload-aspect" required>
            <Select id="upload-aspect" value={form.aspectRatio} onChange={(e) => setForm((f) => ({ ...f, aspectRatio: e.target.value as AiImageAspectRatio }))} options={IMAGE_ASPECT_RATIOS.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
          </FormField>
          <FormField label="Resolution" htmlFor="upload-resolution" required>
            <Select id="upload-resolution" value={form.resolution} onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value as AiImageResolutionKey }))} options={IMAGE_RESOLUTIONS.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
          </FormField>
        </div>
        <FormField label="Notes (optional)" htmlFor="upload-notes">
          <Textarea id="upload-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() =>
              upload.mutate(
                { imageId: crypto.randomUUID(), url: form.url, thumbnailUrl: form.thumbnailUrl || undefined, imageType: form.imageType, style: form.style, aspectRatio: form.aspectRatio, resolution: form.resolution, notes: form.notes || undefined },
                { onSuccess: () => { onOpenChange(false); reset(); } },
              )
            }
            disabled={!form.url || upload.isPending}
          >
            {upload.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImageHistoryDialog({ id, open, onOpenChange }: { id: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: history } = useAiImageSetHistory(open ? id : undefined);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
        </DialogHeader>
        {!history || history.length === 0 ? (
          <EmptyState title="No history yet" className="border-none py-8" />
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-[var(--radius)] border border-border p-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">v{h.version}</span>
                  <span className="text-xs text-muted-foreground">{h.fromStatus} → {h.toStatus}</span>
                </div>
                {h.reason && <p className="mt-1 text-xs text-muted-foreground">{h.reason}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Listing Tab ───────────────────────── */

function ListingTab({ catalogProductId }: { catalogProductId: string }) {
  const { data: listings, isLoading } = useUniversalListings(catalogProductId);
  const { data: description } = useLatestAiDescription(catalogProductId);
  const { data: seo } = useLatestSeoOptimization(catalogProductId);
  const { data: imageSet } = useLatestAiImageSet(catalogProductId);
  const create = useCreateUniversalListing();
  const [sections, setSections] = useState<ListingSection[]>([]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const listing = listings?.[0];

  if (!listing) {
    const toggle = (s: ListingSection) => setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Create universal listing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Field label="AI description" value={description ? `v${description.version} (${description.status})` : 'none yet'} />
            <Field label="AI SEO" value={seo ? `v${seo.version} (${seo.status})` : 'none yet'} />
            <Field label="AI images" value={imageSet ? `v${imageSet.version} (${imageSet.status})` : 'none yet'} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sections to include</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LISTING_SECTIONS.map((s) => (
                <label key={s} className="flex items-center gap-2 text-xs text-foreground">
                  <Checkbox checked={sections.includes(s)} onChange={() => toggle(s)} />
                  {s.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>
          <Button
            onClick={() =>
              create.mutate({
                catalogProductId,
                aiDescriptionId: description?.id,
                aiImageSetId: imageSet?.id,
                aiSeoId: seo?.id,
                sections: sections.length > 0 ? sections : undefined,
              })
            }
            disabled={create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create listing
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <ListingDetail listing={listing} description={description} seo={seo} imageSet={imageSet} />;
}

function ListingDetail({
  listing,
  description,
  seo,
  imageSet,
}: {
  listing: NonNullable<ReturnType<typeof useUniversalListings>['data']>[number];
  description: ReturnType<typeof useLatestAiDescription>['data'];
  seo: ReturnType<typeof useLatestSeoOptimization>['data'];
  imageSet: ReturnType<typeof useLatestAiImageSet>['data'];
}) {
  const regenerate = useRegenerateUniversalListing(listing.id);
  const { data: marketplaceListings } = useMarketplaceListings(listing.id);
  const { data: latestApproval } = useLatestApprovalForListing(listing.id);
  const createApproval = useCreateListingApproval();
  const approveListing = useApproveListingApproval(latestApproval?.id ?? '');
  const rejectListing = useRejectListingApproval(latestApproval?.id ?? '');
  const markReady = useMarkListingReadyToPublish(latestApproval?.id ?? '');
  const transform = useTransformToMarketplace(listing.id);
  const [marketplaceKey, setMarketplaceKey] = useState('');
  const [country, setCountry] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Universal listing v{listing.version}</span>
            <StatusBadge status={listing.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Field label="Quality score" value={listing.qualityScore != null ? String(Math.round(listing.qualityScore)) : '—'} />
            <Field label="AI description" value={listing.aiDescriptionId ? 'linked' : '—'} />
            <Field label="AI images" value={listing.aiImageSetId ? 'linked' : '—'} />
            <Field label="AI SEO" value={listing.aiSeoId ? 'linked' : '—'} />
          </div>
          {listing.errorMessage && <p className="rounded-[var(--radius)] border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{listing.errorMessage}</p>}

          <Button
            variant="outline"
            size="sm"
            onClick={() => regenerate.mutate({ sections: LISTING_SECTIONS, aiDescriptionId: description?.id, aiImageSetId: imageSet?.id, aiSeoId: seo?.id })}
            disabled={regenerate.isPending}
          >
            {regenerate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate from latest AI content
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestApproval ? (
            <>
              <div className="flex items-center gap-2">
                <StatusBadge status={latestApproval.status} />
                {latestApproval.reviewedAt && <span className="text-xs text-muted-foreground">Reviewed {formatDate(latestApproval.reviewedAt)}</span>}
              </div>
              {latestApproval.approvalComment && <p className="text-sm text-muted-foreground">{latestApproval.approvalComment}</p>}
              {latestApproval.rejectionReason && <p className="text-sm text-danger">{latestApproval.rejectionReason}</p>}
              <div className="flex flex-wrap gap-2">
                {latestApproval.status === 'PENDING' && (
                  <>
                    <Button size="sm" onClick={() => approveListing.mutate({})} disabled={approveListing.isPending}>Approve</Button>
                    <Button variant="outline" size="sm" onClick={() => setRejectOpen(true)}>Reject</Button>
                  </>
                )}
                {latestApproval.status === 'APPROVED' && (
                  <Button size="sm" onClick={() => markReady.mutate(undefined)} disabled={markReady.isPending}>Mark ready to publish</Button>
                )}
              </div>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => createApproval.mutate({ listingId: listing.id, catalogProductId: listing.catalogProductId })}
              disabled={createApproval.isPending}
            >
              {createApproval.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit for approval
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Marketplace readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-2">
            <FormField label="Marketplace key" htmlFor="mkt-key">
              <Input id="mkt-key" value={marketplaceKey} onChange={(e) => setMarketplaceKey(e.target.value)} placeholder="e.g. amazon" className="w-40" />
            </FormField>
            <FormField label="Country (optional)" htmlFor="mkt-country">
              <Input id="mkt-country" value={country} onChange={(e) => setCountry(e.target.value)} className="w-28" />
            </FormField>
            <Button size="sm" onClick={() => transform.mutate({ marketplaceKey, country: country || undefined })} disabled={!marketplaceKey || transform.isPending}>
              {transform.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Transform
            </Button>
          </div>

          {!marketplaceListings || marketplaceListings.length === 0 ? (
            <EmptyState title="No marketplace transformations yet" className="border-none py-6" />
          ) : (
            <div className="space-y-2">
              {marketplaceListings.map((ml) => (
                <div key={ml.id} className="rounded-[var(--radius)] border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{ml.marketplaceKey} · {ml.country}</span>
                    <StatusBadge status={ml.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {ml.readinessScore != null && <span>Readiness {Math.round(ml.readinessScore)}%</span>}
                    {ml.readinessStatus && <span>{ml.readinessStatus}</span>}
                  </div>
                  {ml.warnings && ml.warnings.length > 0 && <p className="mt-1 text-xs text-warning">{ml.warnings.length} warning(s)</p>}
                  {ml.errors && ml.errors.length > 0 && <p className="mt-1 text-xs text-danger">{ml.errors.length} error(s)</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Reject listing</DialogTitle>
          </DialogHeader>
          <FormField label="Reason" htmlFor="reject-reason" required>
            <Textarea id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => rejectListing.mutate({ reason: rejectReason }, { onSuccess: () => { setRejectOpen(false); setRejectReason(''); } })}
              disabled={!rejectReason || rejectListing.isPending}
            >
              {rejectListing.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
