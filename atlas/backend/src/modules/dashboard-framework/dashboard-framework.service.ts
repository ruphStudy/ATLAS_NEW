import { Injectable, Logger } from '@nestjs/common';
import { DashboardFrameworkRepository } from './dashboard-framework.repository';
import { DashboardFrameworkEventQueue } from './jobs';
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  CloneDashboardDto,
  DashboardResponseDto,
  AddWidgetDto,
  UpdateWidgetDto,
  DashboardWidgetResponseDto,
  CreateDashboardTemplateDto,
  UpdateDashboardTemplateDto,
  DashboardTemplateResponseDto,
  ExportDashboardDto,
  DashboardExportResponseDto,
  DashboardVersionResponseDto,
} from './dto';
import {
  IDashboard,
  IDashboardWidget,
  IDashboardVersion,
  IDashboardTemplate,
  IDashboardExport,
  DashboardStatus,
  DashboardEventType,
  RefreshInterval,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class DashboardFrameworkService {
  private readonly logger = new Logger(DashboardFrameworkService.name);

  constructor(
    private readonly repository: DashboardFrameworkRepository,
    private readonly eventQueue: DashboardFrameworkEventQueue,
  ) {}

  async createDashboard(
    dto: CreateDashboardDto,
  ): Promise<DashboardResponseDto> {
    const existing = await this.repository.findDashboardByKey(
      dto.dashboardKey,
      dto.workspaceId,
    );

    if (existing) {
      throw new BusinessRuleException(
        'Dashboard with this key already exists',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (dto.templateId) {
      await this.validateTemplate(dto.templateId);
    }

    const data = {
      ...dto,
      status: dto.status ?? DashboardStatus.DRAFT,
      isTemplate: dto.isTemplate ?? false,
      refreshInterval: dto.refreshInterval ?? RefreshInterval.MANUAL,
      version: 1,
    };

    const dashboard = await this.repository.createDashboard(data);

    await this.createVersion(dashboard.id, dashboard.createdBy, 'Initial version');

    await this.eventQueue.publish({
      event: DashboardEventType.DASHBOARD_CREATED,
      workspaceId: dashboard.workspaceId,
      dashboardId: dashboard.id,
    });

    return dashboard as DashboardResponseDto;
  }

  async getDashboard(
    id: string,
    workspaceId: string,
  ): Promise<DashboardResponseDto> {
    const dashboard = await this.repository.findDashboardById(id, workspaceId);

    if (!dashboard) {
      throw new ResourceNotFoundException(
        'Dashboard not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return dashboard as DashboardResponseDto;
  }

  async listDashboards(
    workspaceId: string,
    filters?: { status?: string; isTemplate?: boolean },
  ): Promise<DashboardResponseDto[]> {
    const dashboards = await this.repository.findAllDashboards(
      workspaceId,
      filters,
    );
    return dashboards as DashboardResponseDto[];
  }

  async updateDashboard(
    id: string,
    workspaceId: string,
    dto: UpdateDashboardDto,
    updatedBy: string,
  ): Promise<DashboardResponseDto> {
    const dashboard = await this.getDashboard(id, workspaceId);

    const updated = await this.repository.updateDashboard(id, {
      ...dto,
      version: dashboard.version + 1,
    });

    await this.createVersion(updated.id, updatedBy, 'Dashboard updated');

    await this.eventQueue.publish({
      event: DashboardEventType.DASHBOARD_UPDATED,
      workspaceId: updated.workspaceId,
      dashboardId: updated.id,
    });

    return updated as DashboardResponseDto;
  }

  async cloneDashboard(
    sourceDashboardId: string,
    sourceWorkspaceId: string,
    dto: CloneDashboardDto,
  ): Promise<DashboardResponseDto> {
    const sourceDashboard = await this.getDashboard(
      sourceDashboardId,
      sourceWorkspaceId,
    );

    const widgets = await this.repository.findWidgetsByDashboard(
      sourceDashboardId,
    );

    const cloneData = {
      workspaceId: dto.workspaceId,
      dashboardKey: dto.dashboardKey,
      name: dto.name,
      description: sourceDashboard.description,
      status: DashboardStatus.DRAFT,
      layout: sourceDashboard.layout,
      isTemplate: false,
      filters: sourceDashboard.filters,
      refreshInterval: sourceDashboard.refreshInterval,
      permissions: sourceDashboard.permissions,
      metadata: sourceDashboard.metadata,
      version: 1,
      createdBy: dto.createdBy,
    };

    const clonedDashboard = await this.repository.createDashboard(cloneData);

    for (const widget of widgets) {
      await this.repository.addWidget({
        dashboardId: clonedDashboard.id,
        widgetKey: widget.widgetKey,
        position: widget.position,
        config: widget.config,
        cacheTtl: widget.cacheTtl,
        metadata: widget.metadata,
      });
    }

    await this.createVersion(
      clonedDashboard.id,
      dto.createdBy,
      `Cloned from ${sourceDashboard.name}`,
    );

    await this.eventQueue.publish({
      event: DashboardEventType.DASHBOARD_CLONED,
      workspaceId: clonedDashboard.workspaceId,
      dashboardId: clonedDashboard.id,
      metadata: { sourceDashboardId },
    });

    return clonedDashboard as DashboardResponseDto;
  }

  async publishDashboard(
    id: string,
    workspaceId: string,
    publishedBy: string,
  ): Promise<DashboardResponseDto> {
    const dashboard = await this.getDashboard(id, workspaceId);

    if (dashboard.status === DashboardStatus.PUBLISHED) {
      throw new BusinessRuleException(
        'Dashboard is already published',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const published = await this.repository.updateDashboard(id, {
      status: DashboardStatus.PUBLISHED,
      publishedAt: new Date(),
    });

    await this.eventQueue.publish({
      event: DashboardEventType.DASHBOARD_PUBLISHED,
      workspaceId: published.workspaceId,
      dashboardId: published.id,
    });

    return published as DashboardResponseDto;
  }

  async archiveDashboard(
    id: string,
    workspaceId: string,
  ): Promise<DashboardResponseDto> {
    const dashboard = await this.getDashboard(id, workspaceId);

    if (dashboard.status === DashboardStatus.ARCHIVED) {
      throw new BusinessRuleException(
        'Dashboard is already archived',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const archived = await this.repository.updateDashboard(id, {
      status: DashboardStatus.ARCHIVED,
      archivedAt: new Date(),
    });

    await this.eventQueue.publish({
      event: DashboardEventType.DASHBOARD_ARCHIVED,
      workspaceId: archived.workspaceId,
      dashboardId: archived.id,
    });

    return archived as DashboardResponseDto;
  }

  async restoreDashboard(
    id: string,
    workspaceId: string,
  ): Promise<DashboardResponseDto> {
    const dashboard = await this.getDashboard(id, workspaceId);

    if (dashboard.status !== DashboardStatus.ARCHIVED) {
      throw new BusinessRuleException(
        'Only archived dashboards can be restored',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const restored = await this.repository.updateDashboard(id, {
      status: DashboardStatus.DRAFT,
      archivedAt: null,
    });

    await this.eventQueue.publish({
      event: DashboardEventType.DASHBOARD_RESTORED,
      workspaceId: restored.workspaceId,
      dashboardId: restored.id,
    });

    return restored as DashboardResponseDto;
  }

  async deleteDashboard(id: string, workspaceId: string): Promise<void> {
    await this.getDashboard(id, workspaceId);
    await this.repository.deleteDashboard(id);
  }

  async addWidget(dto: AddWidgetDto): Promise<DashboardWidgetResponseDto> {
    const dashboard = await this.repository.findDashboardById(
      dto.dashboardId,
      '',
    );

    if (!dashboard) {
      throw new ResourceNotFoundException(
        'Dashboard not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const data = {
      dashboardId: dto.dashboardId,
      widgetKey: dto.widgetKey,
      position: dto.position,
      config: {
        title: dto.title,
        description: dto.description,
        widgetType: dto.widgetType,
        chartType: dto.chartType,
        dataSource: dto.dataSource,
        displayOptions: dto.displayOptions,
        refreshInterval: dto.refreshInterval,
      },
      cacheTtl: dto.cacheTtl,
      metadata: dto.metadata,
    };

    const widget = await this.repository.addWidget(data);

    await this.eventQueue.publish({
      event: DashboardEventType.WIDGET_ADDED,
      workspaceId: dashboard.workspaceId,
      dashboardId: dto.dashboardId,
      widgetId: widget.id,
    });

    return widget as DashboardWidgetResponseDto;
  }

  async getWidget(id: string): Promise<DashboardWidgetResponseDto> {
    const widget = await this.repository.findWidgetById(id);

    if (!widget) {
      throw new ResourceNotFoundException(
        'Widget not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return widget as DashboardWidgetResponseDto;
  }

  async listWidgets(dashboardId: string): Promise<DashboardWidgetResponseDto[]> {
    const widgets = await this.repository.findWidgetsByDashboard(dashboardId);
    return widgets as DashboardWidgetResponseDto[];
  }

  async updateWidget(
    id: string,
    dto: UpdateWidgetDto,
  ): Promise<DashboardWidgetResponseDto> {
    const widget = await this.getWidget(id);

    const updateData: any = {};

    if (dto.position) updateData.position = dto.position;
    if (dto.title || dto.description || dto.dataSource || dto.displayOptions || dto.refreshInterval) {
      updateData.config = {
        ...widget.config,
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.dataSource && { dataSource: dto.dataSource }),
        ...(dto.displayOptions && { displayOptions: dto.displayOptions }),
        ...(dto.refreshInterval && { refreshInterval: dto.refreshInterval }),
      };
    }
    if (dto.cacheTtl !== undefined) updateData.cacheTtl = dto.cacheTtl;
    if (dto.metadata) updateData.metadata = dto.metadata;

    const updated = await this.repository.updateWidget(id, updateData);

    const dashboard = await this.repository.findDashboardById(
      updated.dashboardId,
      '',
    );

    if (dashboard) {
      await this.eventQueue.publish({
        event: DashboardEventType.WIDGET_UPDATED,
        workspaceId: dashboard.workspaceId,
        dashboardId: updated.dashboardId,
        widgetId: updated.id,
      });
    }

    return updated as DashboardWidgetResponseDto;
  }

  async deleteWidget(id: string): Promise<void> {
    const widget = await this.getWidget(id);

    await this.repository.deleteWidget(id);

    const dashboard = await this.repository.findDashboardById(
      widget.dashboardId,
      '',
    );

    if (dashboard) {
      await this.eventQueue.publish({
        event: DashboardEventType.WIDGET_REMOVED,
        workspaceId: dashboard.workspaceId,
        dashboardId: widget.dashboardId,
        widgetId: id,
      });
    }
  }

  async getDashboardVersions(
    dashboardId: string,
    workspaceId: string,
    limit?: number,
  ): Promise<DashboardVersionResponseDto[]> {
    await this.getDashboard(dashboardId, workspaceId);

    const versions = await this.repository.findVersionsByDashboard(
      dashboardId,
      limit,
    );
    return versions as DashboardVersionResponseDto[];
  }

  async createTemplate(
    dto: CreateDashboardTemplateDto,
  ): Promise<DashboardTemplateResponseDto> {
    const existing = await this.repository.findTemplateByKey(
      dto.templateKey,
      dto.workspaceId,
    );

    if (existing) {
      throw new BusinessRuleException(
        'Template with this key already exists',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const data = {
      ...dto,
      isGlobal: dto.isGlobal ?? false,
    };

    const template = await this.repository.createTemplate(data);

    return template as DashboardTemplateResponseDto;
  }

  async getTemplate(id: string): Promise<DashboardTemplateResponseDto> {
    const template = await this.repository.findTemplateById(id);

    if (!template) {
      throw new ResourceNotFoundException(
        'Dashboard template not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return template as DashboardTemplateResponseDto;
  }

  async listTemplates(
    workspaceId?: string,
    filters?: { category?: string; isGlobal?: boolean },
  ): Promise<DashboardTemplateResponseDto[]> {
    const templates = await this.repository.findAllTemplates(
      workspaceId,
      filters,
    );
    return templates as DashboardTemplateResponseDto[];
  }

  async updateTemplate(
    id: string,
    dto: UpdateDashboardTemplateDto,
  ): Promise<DashboardTemplateResponseDto> {
    await this.getTemplate(id);

    const updated = await this.repository.updateTemplate(id, dto);

    return updated as DashboardTemplateResponseDto;
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.getTemplate(id);
    await this.repository.deleteTemplate(id);
  }

  async exportDashboard(
    dto: ExportDashboardDto,
  ): Promise<DashboardExportResponseDto> {
    await this.getDashboard(dto.dashboardId, dto.workspaceId);

    const data = {
      ...dto,
      status: 'pending',
    };

    const exportRecord = await this.repository.createExport(data);

    await this.eventQueue.publish({
      event: DashboardEventType.DATA_EXPORTED,
      workspaceId: dto.workspaceId,
      dashboardId: dto.dashboardId,
      metadata: { exportId: exportRecord.id, format: dto.exportFormat },
    });

    return exportRecord as DashboardExportResponseDto;
  }

  async getExport(
    id: string,
    workspaceId: string,
  ): Promise<DashboardExportResponseDto> {
    const exportRecord = await this.repository.findExportById(id, workspaceId);

    if (!exportRecord) {
      throw new ResourceNotFoundException(
        'Dashboard export not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return exportRecord as DashboardExportResponseDto;
  }

  async listExports(
    dashboardId: string,
    workspaceId: string,
  ): Promise<DashboardExportResponseDto[]> {
    const exports = await this.repository.findExportsByDashboard(
      dashboardId,
      workspaceId,
    );
    return exports as DashboardExportResponseDto[];
  }

  private async validateTemplate(templateId: string): Promise<void> {
    const template = await this.repository.findTemplateById(templateId);

    if (!template) {
      throw new BusinessRuleException(
        'Dashboard template not found',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }
  }

  private async createVersion(
    dashboardId: string,
    createdBy: string,
    changeDescription?: string,
  ): Promise<void> {
    const dashboard = await this.repository.findDashboardById(dashboardId, '');

    if (!dashboard) return;

    const widgets = await this.repository.findWidgetsByDashboard(dashboardId);

    await this.repository.createVersion({
      dashboardId,
      version: dashboard.version,
      layout: dashboard.layout,
      filters: dashboard.filters,
      widgets: widgets.map((w) => ({
        widgetKey: w.widgetKey,
        position: w.position,
        config: w.config,
      })),
      changeDescription,
      createdBy,
    });
  }
}
