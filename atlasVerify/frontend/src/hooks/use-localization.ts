import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as localizationService from '@/services/localization.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  CreateLocalePayload,
  CreateNamespacePayload,
  CreateTranslationKeyPayload,
  ImportTranslationsPayload,
  LocaleFilterParams,
  SetLocaleAvailabilityPayload,
  SetProviderRequirementPayload,
  SetTranslationPayload,
  UpdateLocalePayload,
} from '@/types';

const LOCALIZATION_KEY = 'localization';

export function useEffectiveLocale() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'effective-locale'],
    queryFn: localizationService.getEffectiveLocale,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useEffectiveRegionalSettings() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'effective-regional-settings'],
    queryFn: localizationService.getEffectiveRegionalSettings,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useLocales(activeOnly?: boolean) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'locales', activeOnly],
    queryFn: () => localizationService.listLocales(activeOnly),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useLocaleSearch(filter: LocaleFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'locale-search', filter],
    queryFn: () => localizationService.findLocales(filter),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useLocaleHistory(code: string | undefined) {
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'locale-history', code],
    queryFn: () => localizationService.getLocaleHistory(code as string),
    enabled: !!code,
  });
}

export function useEnabledLanguages() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'enabled-languages'],
    queryFn: localizationService.getEnabledLanguages,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function usePreferredLanguages() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'preferred-languages'],
    queryFn: localizationService.getPreferredLanguages,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useLocaleAvailability(localeCode?: string, workspaceId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'availability', localeCode, workspaceId],
    queryFn: () => localizationService.listLocaleAvailability(localeCode, workspaceId),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useTranslationCompleteness(namespaceKey: string | undefined, localeCode: string | undefined) {
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'completeness', namespaceKey, localeCode],
    queryFn: () => localizationService.getTranslationCompleteness(namespaceKey as string, localeCode as string),
    enabled: !!namespaceKey && !!localeCode,
  });
}

function invalidateLocalization(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY] });
}

export function useSwitchLocale() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ localeCode, scope }: { localeCode: string; scope?: 'USER' | 'WORKSPACE' | 'ORGANIZATION' }) => localizationService.switchLocale(localeCode, scope),
    onSuccess: () => {
      invalidateLocalization(queryClient);
      toast.success('Locale switched');
    },
    onError: () => toast.error('Could not switch locale', 'Please try again.'),
  });
}

export function useCreateLocale() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateLocalePayload) => localizationService.createLocale(payload),
    onSuccess: () => {
      invalidateLocalization(queryClient);
      toast.success('Locale created');
    },
    onError: () => toast.error('Could not create locale', 'Please try again.'),
  });
}

export function useUpdateLocale(code: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateLocalePayload) => localizationService.updateLocale(code, payload),
    onSuccess: () => {
      invalidateLocalization(queryClient);
      toast.success('Locale updated');
    },
    onError: () => toast.error('Could not update locale', 'Please try again.'),
  });
}

function useLocaleAction(code: string, fn: (reason?: string) => Promise<unknown>, successMessage?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => fn(reason),
    onSuccess: () => {
      invalidateLocalization(queryClient);
      if (successMessage) toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useEnableLocale(code: string) {
  return useLocaleAction(code, (reason) => localizationService.enableLocale(code, reason), 'Locale enabled');
}

export function useDisableLocale(code: string) {
  return useLocaleAction(code, (reason) => localizationService.disableLocale(code, reason), 'Locale disabled');
}

export function useArchiveLocale(code: string) {
  return useLocaleAction(code, (reason) => localizationService.archiveLocale(code, reason), 'Locale archived');
}

export function useRestoreLocale(code: string) {
  return useLocaleAction(code, (reason) => localizationService.restoreLocale(code, reason), 'Locale restored');
}

export function useSetDefaultLocale() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (code: string) => localizationService.setDefaultLocale(code),
    onSuccess: () => {
      invalidateLocalization(queryClient);
      toast.success('Default locale updated');
    },
  });
}

export function useSetEnabledLanguages() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ localeCodes, scope }: { localeCodes: string[]; scope?: 'WORKSPACE' | 'ORGANIZATION' }) => localizationService.setEnabledLanguages(localeCodes, scope),
    onSuccess: () => {
      invalidateLocalization(queryClient);
      toast.success('Enabled languages updated');
    },
  });
}

export function useSetPreferredLanguages() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (localeCodes: string[]) => localizationService.setPreferredLanguages(localeCodes),
    onSuccess: () => {
      invalidateLocalization(queryClient);
      toast.success('Preferred languages updated');
    },
  });
}

export function useSetLocaleAvailability() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SetLocaleAvailabilityPayload) => localizationService.setLocaleAvailability(payload),
    onSuccess: () => {
      invalidateLocalization(queryClient);
      toast.success('Locale availability updated');
    },
  });
}

export function useAvailableLocales(countryCode?: string, marketplaceKey?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'available-locales', countryCode, marketplaceKey],
    queryFn: () => localizationService.listAvailableLocales(countryCode, marketplaceKey),
    enabled: isAuthenticated,
  });
}

// ── Namespaces & keys ────────────────────────────────────────────

export function useTranslationNamespaces() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'namespaces'],
    queryFn: localizationService.listNamespaces,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useTranslationNamespace(namespaceKey: string | undefined) {
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'namespace', namespaceKey],
    queryFn: () => localizationService.getNamespace(namespaceKey as string),
    enabled: !!namespaceKey,
  });
}

export function useCreateNamespace() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateNamespacePayload) => localizationService.createNamespace(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'namespaces'] });
      toast.success('Namespace created');
    },
    onError: () => toast.error('Could not create namespace', 'Please try again.'),
  });
}

export function useTranslationKeys(namespaceKey: string | undefined) {
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'keys', namespaceKey],
    queryFn: () => localizationService.listTranslationKeys(namespaceKey as string),
    enabled: !!namespaceKey,
    staleTime: 30 * 1000,
  });
}

export function useCreateTranslationKey(namespaceKey: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateTranslationKeyPayload) => localizationService.createTranslationKey(namespaceKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'keys', namespaceKey] });
      toast.success('Translation key created');
    },
    onError: () => toast.error('Could not create translation key', 'Please try again.'),
  });
}

export function useDeleteTranslationKey(namespaceKey: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (key: string) => localizationService.deleteTranslationKey(namespaceKey, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'keys', namespaceKey] });
      toast.success('Translation key deleted');
    },
    onError: () => toast.error('Could not delete translation key', 'Please try again.'),
  });
}

// ── Missing keys / import / export ────────────────────────────────

export function useMissingKeys(namespaceKey: string | undefined, localeCode: string | undefined) {
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'missing-keys', namespaceKey, localeCode],
    queryFn: () => localizationService.findMissingKeys(namespaceKey as string, localeCode as string),
    enabled: !!namespaceKey && !!localeCode,
  });
}

export function useNamespaceExport(namespaceKey: string | undefined, localeCode: string | undefined) {
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'export', namespaceKey, localeCode],
    queryFn: () => localizationService.exportNamespace(namespaceKey as string, localeCode as string),
    enabled: !!namespaceKey && !!localeCode,
  });
}

export function useImportNamespace(namespaceKey: string, localeCode: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ImportTranslationsPayload) => localizationService.importNamespace(namespaceKey, localeCode, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'export', namespaceKey, localeCode] });
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'missing-keys', namespaceKey, localeCode] });
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'completeness', namespaceKey, localeCode] });
      toast.success(`${result.imported} translation(s) imported`);
    },
    onError: () => toast.error('Could not import translations', 'Please check the format and try again.'),
  });
}

// ── Translations ─────────────────────────────────────────────────

export function useTranslationHistory(namespaceKey: string | undefined, key: string | undefined, localeCode: string | undefined) {
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'translation-history', namespaceKey, key, localeCode],
    queryFn: () => localizationService.getTranslationHistory(namespaceKey as string, key as string, localeCode as string),
    enabled: !!namespaceKey && !!key && !!localeCode,
  });
}

export function useSetTranslation(namespaceKey: string, key: string, localeCode: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SetTranslationPayload) => localizationService.setTranslation(namespaceKey, key, localeCode, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'bundle', namespaceKey, localeCode] });
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'export', namespaceKey, localeCode] });
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'translation-history', namespaceKey, key, localeCode] });
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'completeness', namespaceKey, localeCode] });
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'missing-keys', namespaceKey, localeCode] });
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'issues', namespaceKey, localeCode] });
      toast.success('Translation saved');
    },
    onError: () => toast.error('Could not save translation', 'Please try again.'),
  });
}

export function useTranslationBundle(namespaceKey: string | undefined, localeCode: string | undefined) {
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'bundle', namespaceKey, localeCode],
    queryFn: () => localizationService.bulkTranslate(namespaceKey as string, localeCode as string),
    enabled: !!namespaceKey && !!localeCode,
  });
}

// ── Issues ───────────────────────────────────────────────────────

export function useTranslationIssues(namespaceKey: string | undefined, localeCode: string | undefined) {
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'issues', namespaceKey, localeCode],
    queryFn: () => localizationService.detectTranslationIssues(namespaceKey as string, localeCode as string),
    enabled: !!namespaceKey && !!localeCode,
  });
}

// ── Marketplace/provider locale requirements ──────────────────────

export function useProviderRequirements(marketplaceKey?: string, workspaceId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [LOCALIZATION_KEY, 'provider-requirements', marketplaceKey, workspaceId],
    queryFn: () => localizationService.listProviderRequirements(marketplaceKey, workspaceId),
    enabled: isAuthenticated,
  });
}

export function useSetProviderRequirement() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SetProviderRequirementPayload) => localizationService.setProviderRequirement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCALIZATION_KEY, 'provider-requirements'] });
      toast.success('Provider locale requirement saved');
    },
    onError: () => toast.error('Could not save requirement', 'Please try again.'),
  });
}

// ── Locale-aware formatting preview ───────────────────────────────

export function useFormatDatePreview() {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ date, localeCode }: { date: string; localeCode?: string }) => localizationService.formatDatePreview(date, localeCode),
    onError: () => toast.error('Could not format date', 'Please check the value and try again.'),
  });
}

export function useFormatNumberPreview() {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ value, localeCode }: { value: number; localeCode?: string }) => localizationService.formatNumberPreview(value, localeCode),
    onError: () => toast.error('Could not format number', 'Please check the value and try again.'),
  });
}

export function useFormatCurrencyPreview() {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ value, localeCode, currencyCode }: { value: number; localeCode?: string; currencyCode?: string }) => localizationService.formatCurrencyPreview(value, localeCode, currencyCode),
    onError: () => toast.error('Could not format currency', 'Please check the value and try again.'),
  });
}
