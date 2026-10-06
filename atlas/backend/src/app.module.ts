import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Configuration – single source of truth
import { ConfigurationModule, ConfigurationService } from '@config/index';

// Common Infrastructure
import { RequestIdMiddleware } from '@common/middleware/request-id.middleware';

// Core Modules
import { DatabaseModule } from '@database/database.module';
import { HealthModule } from './health/health.module';

// Auth – must be imported before the global guard is used
import { AuthenticationModule } from '@modules/authentication/authentication.module';
import { JwtAuthGuard } from '@modules/authentication/guards';

// Feature Modules
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { UsersModule } from '@modules/users/users.module';
import { ProductsModule } from '@modules/products/products.module';
import { SuppliersModule } from '@modules/suppliers/suppliers.module';
import { PricingModule } from '@modules/pricing/pricing.module';
import { ListingModule } from '@modules/listing/listing.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { InventoryAvailabilityModule } from '@modules/inventory-availability/inventory-availability.module';
import { InventoryAnalyticsModule } from '@modules/inventory-analytics/inventory-analytics.module';
import { ReorderManagementModule } from '@modules/reorder-management/reorder-management.module';
import { WarehouseSyncModule } from '@modules/warehouse-sync/warehouse-sync.module';
import { WarehouseAuditModule } from '@modules/warehouse-audit/warehouse-audit.module';
import { WarehouseModule } from '@modules/warehouse/warehouse.module';
import { BarcodeModule } from '@modules/barcode/barcode.module';
import { ReceivingModule } from '@modules/warehouse-receiving/receiving.module';
import { PutawayModule } from '@modules/putaway/putaway.module';
import { PickingModule } from '@modules/picking/picking.module';
import { PackingModule } from '@modules/packing/packing.module';
import { DispatchModule } from '@modules/dispatch/dispatch.module';
import { FBAShipmentModule } from '@modules/fba-shipment/fba-shipment.module';
import { MarketplaceModule } from '@modules/marketplace/marketplace.module';
import { DashboardModule } from '@modules/dashboard/dashboard.module';
import { ReportsModule } from '@modules/reports/reports.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { OrganizationSettingsModule } from '@modules/organization-settings/organization-settings.module';
import { UserPreferencesModule } from '@modules/user-preferences/user-preferences.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { ApprovalWorkflowModule } from '@modules/approval-workflow/approval-workflow.module';
import { TaskManagementModule } from '@modules/task-management/task-management.module';
import { NotesCommentsModule } from '@modules/notes-comments/notes-comments.module';
import { TagsManagementModule } from '@modules/tags-management/tags-management.module';
import { SearchFrameworkModule } from '@modules/search-framework/search-framework.module';
import { GlobalSearchModule } from '@modules/global-search/global-search.module';
import { LocalizationModule } from '@modules/localization/localization.module';
import { ThemeManagementModule } from '@modules/theme-management/theme-management.module';
import { BusinessRulesEngineModule } from '@modules/business-rules-engine/business-rules-engine.module';
import { EnterpriseWorkflowEngineModule } from '@modules/enterprise-workflow-engine/enterprise-workflow-engine.module';
import { BackupProviderModule } from '@modules/backup-provider/backup-provider.module';
import { DisasterRecoveryModule } from '@modules/disaster-recovery/disaster-recovery.module';
import { BackupManagementModule } from '@modules/backup-management/backup-management.module';
import { MonitoringFrameworkModule } from '@modules/monitoring-framework/monitoring-framework.module';
import { EnterpriseAuditModule } from '@modules/enterprise-audit/enterprise-audit.module';
import { EnterpriseHealthModule } from '@modules/enterprise-health/enterprise-health.module';
import { OperationsHealthModule } from '@modules/operations-health/operations-health.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { SubscriptionManagementModule } from '@modules/subscription-management/subscription-management.module';
import { PlanManagementModule } from '@modules/plan-management/plan-management.module';
import { BillingEngineModule } from '@modules/billing-engine/billing-engine.module';
import { InvoiceManagementModule } from '@modules/invoice-management/invoice-management.module';
import { PaymentProviderModule } from '@modules/payment-provider/payment-provider.module';
import { UsageTrackingModule } from '@modules/usage-tracking/usage-tracking.module';
import { ApiKeyManagementModule } from '@modules/api-key-management/api-key-management.module';
import { WebhookFrameworkModule } from '@modules/webhook-framework/webhook-framework.module';
import { OpportunityModule } from '@modules/opportunities/opportunity.module';
import { DiscoveryModule } from '@modules/discovery/discovery.module';
import { SupplierDiscoveryModule } from '@modules/supplier-discovery/supplier-discovery.module';
import { ProductTaxonomyModule } from '@modules/product-taxonomy/product-taxonomy.module';
import { SupplierVerificationModule } from '@modules/supplier-verification/supplier-verification.module';
import { ProductAnalysisModule } from '@modules/product-analysis/product-analysis.module';
import { CompetitionAnalysisModule } from '@modules/competition-analysis/competition-analysis.module';
import { ProfitCalculatorModule } from '@modules/profit-calculator/profit-calculator.module';
import { ProductScoringModule } from '@modules/product-scoring/product-scoring.module';
import { RfqModule } from '@modules/rfq/rfq.module';
import { QuotationComparisonModule } from '@modules/quotation-comparison/quotation-comparison.module';
import { ProductCostModule } from '@modules/product-cost/product-cost.module';
import { ProcurementModule } from '@modules/procurement/procurement.module';
import { PurchaseOrderModule } from '@modules/purchase-order/purchase-order.module';
import { ShipmentTrackingModule } from '@modules/shipment-tracking/shipment-tracking.module';
import { QualityInspectionModule } from '@modules/quality-inspection/quality-inspection.module';
import { ProductCatalogModule } from '@modules/product-catalog/product-catalog.module';
import { AiDescriptionModule } from '@modules/ai-description/ai-description.module';
import { AiImageModule } from '@modules/ai-image/ai-image.module';
import { AiSeoModule } from '@modules/ai-seo/ai-seo.module';
import { ListingApprovalModule } from '@modules/listing-approval/listing-approval.module';
import { ListingPublisherModule } from '@modules/listing-publisher/listing-publisher.module';
import { SupplierProviderModule } from '@modules/supplier-provider/supplier-provider.module';
import { IndiaMartModule } from '@modules/supplier-provider/adapters/providers/indiamart.module';
import { AlibabaModule } from '@modules/supplier-provider/adapters/providers/alibaba.module';
import { TradeIndiaModule } from '@modules/supplier-provider/adapters/providers/tradeindia.module';
import { MarketplaceListingMappingModule } from '@modules/marketplace-listing-mapping/marketplace-listing-mapping.module';
import { MarketplaceCatalogSyncModule } from '@modules/marketplace-catalog-sync/marketplace-catalog-sync.module';
import { MarketplaceInventorySyncModule } from '@modules/marketplace-inventory-sync/marketplace-inventory-sync.module';
import { MarketplaceListingSyncModule } from '@modules/marketplace-listing-sync/marketplace-listing-sync.module';
import { MarketplaceOrderSyncModule } from '@modules/marketplace-order-sync/marketplace-order-sync.module';
import { MarketplaceShipmentSyncModule } from '@modules/marketplace-shipment-sync/marketplace-shipment-sync.module';
import { MarketplaceReturnSyncModule } from '@modules/marketplace-return-sync/marketplace-return-sync.module';
import { MarketplacePricingSyncModule } from '@modules/marketplace-pricing-sync/marketplace-pricing-sync.module';
import { MarketplaceReportSyncModule } from '@modules/marketplace-report-sync/marketplace-report-sync.module';
import { MarketplaceWebhookModule } from '@modules/marketplace-webhook/marketplace-webhook.module';
import { MarketplaceEventModule } from '@modules/marketplace-event/marketplace-event.module';
import { MarketplaceSyncMonitorModule } from '@modules/marketplace-sync-monitor/marketplace-sync-monitor.module';
import { MarketplaceQueueManagerModule } from '@modules/marketplace-queue-manager/marketplace-queue-manager.module';
import { MarketplaceErrorNormalizerModule } from '@modules/marketplace-error-normalizer/marketplace-error-normalizer.module';
import { MarketplaceAuditModule } from '@modules/marketplace-audit/marketplace-audit.module';
import { MarketplaceAdapterModule } from '@modules/marketplace-adapter/marketplace-adapter.module';
import { AmazonAdapterModule } from '@modules/marketplace-adapter/adapters/amazon/amazon-adapter.module';
import { FlipkartAdapterModule } from '@modules/marketplace-adapter/adapters/flipkart/flipkart-adapter.module';
import { ShopifyAdapterModule } from '@modules/marketplace-adapter/adapters/shopify/shopify-adapter.module';
import { WalmartAdapterModule } from '@modules/marketplace-adapter/adapters/walmart/walmart-adapter.module';
import { EbayAdapterModule } from '@modules/marketplace-adapter/adapters/ebay/ebay-adapter.module';
import { MeeshoAdapterModule } from '@modules/marketplace-adapter/adapters/meesho/meesho-adapter.module';
import { MarketplaceProviderModule } from '@modules/marketplace-provider/marketplace-provider.module';
import { MarketplaceProviderFactoryModule } from '@modules/marketplace-provider-factory/marketplace-provider-factory.module';
import { MarketplaceAccountModule } from '@modules/marketplace-account/marketplace-account.module';
import { MarketplaceCapabilityModule } from '@modules/marketplace-capability/marketplace-capability.module';
import { CountryModule } from '@modules/country/country.module';
import { CurrencyModule } from '@modules/currency/currency.module';
import { TaxModule } from '@modules/tax/tax.module';
import { GstVatModule } from '@modules/gst-vat/gst-vat.module';
import { ComplianceFrameworkModule } from '@modules/compliance-framework/compliance-framework.module';
import { RegionalSettingsModule } from '@modules/regional-settings/regional-settings.module';
import { MultiBrandModule } from '@modules/multi-brand/multi-brand.module';
import { MultiBusinessModule } from '@modules/multi-business/multi-business.module';
import { MultiChannelModule } from '@modules/multi-channel/multi-channel.module';
import { MarketplaceExpansionModule } from '@modules/marketplace-expansion/marketplace-expansion.module';
import { SupplierProviderExpansionModule } from '@modules/supplier-provider-expansion/supplier-provider-expansion.module';
import { ShippingProviderModule } from '@modules/shipping-provider/shipping-provider.module';
import { ShippingProviderExpansionModule } from '@modules/shipping-provider-expansion/shipping-provider-expansion.module';

// Infrastructure Modules
import { QueuesModule } from './queues/queues.module';
import { WorkersModule } from './workers/workers.module';
import { AiModule } from './ai/ai.module';
import { AiProviderConfigurationModule } from '@modules/ai-provider-configuration/ai-provider-configuration.module';
import { AiProviderCredentialModule } from '@modules/ai-provider-credentials/ai-provider-credential.module';
import { AiProviderRegistryModule } from '@modules/ai-provider-registry/ai-provider-registry.module';
import { AiProviderExpansionModule } from '@modules/ai-provider-expansion/ai-provider-expansion.module';
import { AiProviderFactoryModule } from '@modules/ai-provider-factory/ai-provider-factory.module';
import { AiCapabilityModule } from '@modules/ai-capability-management/ai-capability.module';
import { AiModelManagementModule } from '@modules/ai-model-management/ai-model-management.module';
import { AiOrchestratorModule } from '@modules/ai-orchestrator/ai-orchestrator.module';
import { AiAgentModule } from '@modules/ai-agent/ai-agent.module';
import { AiPromptModule } from '@modules/ai-prompt/ai-prompt.module';
import { AiWorkflowModule } from '@modules/ai-workflow/ai-workflow.module';
import { AiJobSchedulerModule } from '@modules/ai-job-scheduler/ai-job-scheduler.module';
import { AiQueueManagementModule } from '@modules/ai-queue-management/ai-queue-management.module';
import { AiContextManagementModule } from '@modules/ai-context-management/ai-context-management.module';
import { AiResponseValidationModule } from '@modules/ai-response-validation/ai-response-validation.module';
import { AiDecisionEngineModule } from '@modules/ai-decision-engine/ai-decision-engine.module';
import { AiRecommendationEngineModule } from '@modules/ai-recommendation-engine/ai-recommendation-engine.module';
import { AiFallbackRetryModule } from '@modules/ai-fallback-retry/ai-fallback-retry.module';
import { AiCacheManagementModule } from '@modules/ai-cache-management/ai-cache-management.module';
import { AiMonitoringHealthModule } from '@modules/ai-monitoring-health/ai-monitoring-health.module';
import { AiAuditActivityModule } from '@modules/ai-audit-activity/ai-audit-activity.module';
import { OpenaiAdapterModule } from '@modules/openai-adapter/openai-adapter.module';
import { AnthropicAdapterModule } from '@modules/anthropic-adapter/anthropic-adapter.module';
import { GeminiAdapterModule } from '@modules/gemini-adapter/gemini-adapter.module';
import { AnalyticsFoundationModule } from '@modules/analytics-foundation/analytics-foundation.module';
import { DashboardFrameworkModule } from '@modules/dashboard-framework/dashboard-framework.module';
import { ExecutiveDashboardModule } from '@modules/executive-dashboard/executive-dashboard.module';
import { SalesAnalyticsModule } from '@modules/sales-analytics/sales-analytics.module';
import { ProfitAnalyticsModule } from '@modules/profit-analytics/profit-analytics.module';
import { ProductAnalyticsModule } from '@modules/product-analytics/product-analytics.module';
import { SupplierAnalyticsModule } from '@modules/supplier-analytics/supplier-analytics.module';
import { MarketplaceAnalyticsModule } from '@modules/marketplace-analytics/marketplace-analytics.module';
import { ProcurementAnalyticsModule } from '@modules/procurement-analytics/procurement-analytics.module';
import { WarehouseAnalyticsModule } from '@modules/warehouse-analytics/warehouse-analytics.module';
import { AiAnalyticsModule } from '@modules/ai-analytics/ai-analytics.module';
import { CustomerAnalyticsModule } from '@modules/customer-analytics/customer-analytics.module';
import { FinancialAnalyticsModule } from '@modules/financial-analytics/financial-analytics.module';
import { KpiManagementModule } from '@modules/kpi-management/kpi-management.module';
import { ReportBuilderModule } from '@modules/report-builder/report-builder.module';
import { ScheduledReportsModule } from '@modules/scheduled-reports/scheduled-reports.module';
import { ExportFrameworkModule } from '@modules/export-framework/export-framework.module';
import { DataAggregationEngineModule } from '@modules/data-aggregation-engine/data-aggregation-engine.module';
import { AnalyticsCacheModule } from '@modules/analytics-cache/analytics-cache.module';
import { ForecastingEngineModule } from '@modules/forecasting-engine/forecasting-engine.module';
import { BusinessInsightsModule } from '@modules/business-insights/business-insights.module';
import { AnalyticsAuditModule } from '@modules/analytics-audit/analytics-audit.module';
import { AnalyticsApiModule } from '@modules/analytics-api/analytics-api.module';
import { AnalyticsHealthModule } from '@modules/analytics-health/analytics-health.module';
import { AiGuardrailsModule } from '@modules/ai-guardrails/ai-guardrails.module';
import { AiCostTrackingModule } from '@modules/ai-cost-tracking/ai-cost-tracking.module';
import { AiUsageTrackingModule } from '@modules/ai-usage-tracking/ai-usage-tracking.module';
import { NotificationProviderModule } from '@modules/notification-provider/notification-provider.module';
import { ActivityCenterModule } from '@modules/activity-center/activity-center.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { FileManagementModule } from '@modules/file-management/file-management.module';
import { DocumentManagementModule } from '@modules/document-management/document-management.module';
import { OAuthManagementModule } from '@modules/oauth-management/oauth-management.module';
import { SsoFrameworkModule } from '@modules/sso-framework/sso-framework.module';
import { FeatureFlagsModule } from '@modules/feature-flags/feature-flags.module';
import { LicenseManagementModule } from '@modules/license-management/license-management.module';
import { QuotaManagementModule } from '@modules/quota-management/quota-management.module';
import { SaasAdministrationModule } from '@modules/saas-administration/saas-administration.module';
import { TenantAnalyticsModule } from '@modules/tenant-analytics/tenant-analytics.module';
import { AppStoreModule } from '@modules/app-store/app-store.module';
import { PluginFrameworkModule } from '@modules/plugin-framework/plugin-framework.module';
import { SaasAuditModule } from '@modules/saas-audit/saas-audit.module';
import { SaasMonitoringModule } from '@modules/saas-monitoring/saas-monitoring.module';
import { SaasHealthModule } from '@modules/saas-health/saas-health.module';

@Module({
  imports: [
    ConfigurationModule,

    EventEmitterModule.forRoot(),

    BullModule.forRootAsync({
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => {
        const redis = config.getRedisConfig();
        return {
          connection: {
            host: redis.host,
            port: redis.port,
            password: redis.password,
            db: redis.db,
          },
        };
      },
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => {
        const logger = config.getLoggerConfig();
        return {
          pinoHttp: {
            level: logger.level,
            transport: logger.prettyPrint
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["x-amz-access-token"]',
              'req.body.password',
              'req.body.accessToken',
              'req.body.refreshToken',
              'req.body.access_token',
              'req.body.refresh_token',
              'req.body.clientSecret',
              'req.body.client_secret',
              'req.body.awsSecretAccessKey',
              'req.body.aws_secret_access_key',
              'req.body.fields',
            ],
            customLogLevel: (_req: unknown, res: { statusCode: number }) => {
              if (res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
          },
        };
      },
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => {
        const { throttle } = config.getAppConfig();
        return [{ ttl: throttle.ttl * 1_000, limit: throttle.limit }];
      },
    }),

    DatabaseModule,
    HealthModule,

    // Auth (loaded before feature modules so JwtAuthGuard is available globally)
    AuthenticationModule,

    WorkspaceModule,
    UsersModule,
    ProductsModule,
    SuppliersModule,
    PricingModule,
    ListingModule,
    InventoryModule,
    InventoryAvailabilityModule,
    InventoryAnalyticsModule,
    ReorderManagementModule,
    WarehouseSyncModule,
    WarehouseAuditModule,
    WarehouseModule,
    BarcodeModule,
    ReceivingModule,
    PutawayModule,
    PickingModule,
    PackingModule,
    DispatchModule,
    FBAShipmentModule,
    MarketplaceModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
    SettingsModule,
    OrganizationSettingsModule,
    UserPreferencesModule,
    RolesPermissionsModule,
    ApprovalWorkflowModule,
    TaskManagementModule,
    NotesCommentsModule,
    TagsManagementModule,
    SearchFrameworkModule,
    GlobalSearchModule,
    LocalizationModule,
    ThemeManagementModule,
    BusinessRulesEngineModule,
    EnterpriseWorkflowEngineModule,
    BackupProviderModule,
    DisasterRecoveryModule,
    BackupManagementModule,
    MonitoringFrameworkModule,
    EnterpriseAuditModule,
    EnterpriseHealthModule,
    OperationsHealthModule,
    TenantIsolationModule,
    SubscriptionManagementModule,
    PlanManagementModule,
    BillingEngineModule,
    InvoiceManagementModule,
    PaymentProviderModule,
    UsageTrackingModule,
    ApiKeyManagementModule,
    WebhookFrameworkModule,
    OpportunityModule,
    DiscoveryModule,
    SupplierDiscoveryModule,
    ProductTaxonomyModule,
    SupplierVerificationModule,
    ProductAnalysisModule,
    CompetitionAnalysisModule,
    ProfitCalculatorModule,
    ProductScoringModule,
    RfqModule,
    QuotationComparisonModule,
    ProductCostModule,
    ProcurementModule,
    PurchaseOrderModule,
    ShipmentTrackingModule,
    QualityInspectionModule,
    ProductCatalogModule,
    AiDescriptionModule,
    AiImageModule,
    AiSeoModule,
    ListingApprovalModule,
    ListingPublisherModule,
    SupplierProviderModule,
    IndiaMartModule,
    AlibabaModule,
    TradeIndiaModule,
    MarketplaceListingMappingModule,
    MarketplaceCatalogSyncModule,
    MarketplaceInventorySyncModule,
    MarketplaceListingSyncModule,
    MarketplaceOrderSyncModule,
    MarketplaceShipmentSyncModule,
    MarketplaceReturnSyncModule,
    MarketplacePricingSyncModule,
    MarketplaceReportSyncModule,
    MarketplaceWebhookModule,
    MarketplaceEventModule,
    MarketplaceSyncMonitorModule,
    MarketplaceQueueManagerModule,
    MarketplaceErrorNormalizerModule,
    MarketplaceAuditModule,
    MarketplaceAdapterModule,
    AmazonAdapterModule,
    FlipkartAdapterModule,
    ShopifyAdapterModule,
    WalmartAdapterModule,
    EbayAdapterModule,
    MeeshoAdapterModule,
    MarketplaceProviderModule,
    MarketplaceProviderFactoryModule,
    MarketplaceAccountModule,
    MarketplaceCapabilityModule,
    CountryModule,
    CurrencyModule,
    TaxModule,
    GstVatModule,
    ComplianceFrameworkModule,
    RegionalSettingsModule,
    MultiBrandModule,
    MultiBusinessModule,
    MultiChannelModule,
    MarketplaceExpansionModule,
    SupplierProviderExpansionModule,
    ShippingProviderModule,
    ShippingProviderExpansionModule,

    QueuesModule,
    WorkersModule,
    AiModule,
    AiProviderConfigurationModule,
    AiProviderCredentialModule,
    AiProviderRegistryModule,
    AiProviderExpansionModule,
    AiProviderFactoryModule,
    AiCapabilityModule,
    AiModelManagementModule,
    AiOrchestratorModule,
    AiAgentModule,
    AiPromptModule,
    AiWorkflowModule,
    AiJobSchedulerModule,
    AiQueueManagementModule,
    AiContextManagementModule,
    AiResponseValidationModule,
    AiDecisionEngineModule,
    AiRecommendationEngineModule,
    AiFallbackRetryModule,
    AiCacheManagementModule,
    AiMonitoringHealthModule,
    AiAuditActivityModule,
    OpenaiAdapterModule,
    AnthropicAdapterModule,
    GeminiAdapterModule,
    AnalyticsFoundationModule,
    DashboardFrameworkModule,
    ExecutiveDashboardModule,
    SalesAnalyticsModule,
    ProfitAnalyticsModule,
    ProductAnalyticsModule,
    SupplierAnalyticsModule,
    MarketplaceAnalyticsModule,
    ProcurementAnalyticsModule,
    WarehouseAnalyticsModule,
    AiAnalyticsModule,
    CustomerAnalyticsModule,
    FinancialAnalyticsModule,
    KpiManagementModule,
    ReportBuilderModule,
    ScheduledReportsModule,
    ExportFrameworkModule,
    DataAggregationEngineModule,
    AnalyticsCacheModule,
    ForecastingEngineModule,
    BusinessInsightsModule,
    AnalyticsAuditModule,
    AnalyticsApiModule,
    AnalyticsHealthModule,
    AiGuardrailsModule,
    AiCostTrackingModule,
    AiUsageTrackingModule,
    NotificationProviderModule,
    ActivityCenterModule,
    AuditLogsModule,
    FileManagementModule,
    DocumentManagementModule,
    OAuthManagementModule,
    SsoFrameworkModule,
    FeatureFlagsModule,
    LicenseManagementModule,
    QuotaManagementModule,
    SaasAdministrationModule,
    TenantAnalyticsModule,
    AppStoreModule,
    PluginFrameworkModule,
    SaasAuditModule,
    SaasMonitoringModule,
    SaasHealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ── Global JWT guard ──────────────────────────────────────
    // All routes require a valid Bearer token unless decorated with @Public().
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // RequestIdMiddleware must run first so requestId is available
    // to all filters and interceptors
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

