// Application-wide enumerations (non-Prisma)
// Database-level enums are defined in prisma/schema.prisma

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum HealthStatus {
  OK = 'ok',
  ERROR = 'error',
  SHUTTING_DOWN = 'shutting_down',
}

export enum CurrencyCode {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  CAD = 'CAD',
  AUD = 'AUD',
}

export enum MarketplaceCode {
  AMAZON_US = 'AMAZON_US',
  AMAZON_CA = 'AMAZON_CA',
  AMAZON_UK = 'AMAZON_UK',
  AMAZON_DE = 'AMAZON_DE',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
  STAGING = 'staging',
}

