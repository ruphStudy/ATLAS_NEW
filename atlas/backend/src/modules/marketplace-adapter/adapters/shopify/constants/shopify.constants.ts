export const SHOPIFY_API_VERSION = '2024-01';

export const SHOPIFY_GRAPHQL_ENDPOINT = (shopDomain: string, apiVersion: string) =>
  `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;

export const SHOPIFY_REST_ENDPOINT = (shopDomain: string, apiVersion: string) =>
  `https://${shopDomain}/admin/api/${apiVersion}`;

export const SHOPIFY_RATE_LIMITS = {
  GRAPHQL_COST_LIMIT: 1000,
  GRAPHQL_RESTORE_RATE: 50,
  REST_RATE_LIMIT: 2,
  REST_BURST: 40,
  ORDERS: { rate: 2, burst: 40 },
  PRODUCTS: { rate: 2, burst: 40 },
  INVENTORY: { rate: 2, burst: 40 },
  FULFILLMENTS: { rate: 2, burst: 40 },
  WEBHOOKS: { rate: 2, burst: 40 },
} as const;

export const SHOPIFY_ERROR_CODES = {
  THROTTLED: 'THROTTLED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INVALID_SHOP: 'INVALID_SHOP',
} as const;

export const SHOPIFY_DEFAULT_PAGE_SIZE = 50;

export const SHOPIFY_MAX_PAGE_SIZE = 250;

export const SHOPIFY_MAX_BATCH_SIZE = {
  PRODUCTS: 100,
  VARIANTS: 100,
  INVENTORY: 100,
  ORDERS: 250,
} as const;

export const SHOPIFY_TIMEOUT = 30000;

export const SHOPIFY_MAX_RETRIES = 3;

export const SHOPIFY_RETRY_DELAY = 1000;

export const SHOPIFY_GRAPHQL_QUERIES = {
  SHOP: `
    query {
      shop {
        id
        name
        email
        myshopifyDomain
        currencyCode
        moneyFormat
        ianaTimezone
      }
    }
  `,
  
  ORDERS: `
    query getOrders($first: Int!, $after: String, $query: String) {
      orders(first: $first, after: $after, query: $query) {
        edges {
          node {
            id
            name
            email
            createdAt
            updatedAt
            cancelledAt
            closedAt
            processedAt
            currencyCode
            currentSubtotalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            currentTotalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            displayFinancialStatus
            displayFulfillmentStatus
            customer {
              id
              email
              firstName
              lastName
            }
            shippingAddress {
              address1
              address2
              city
              province
              country
              zip
              phone
            }
            lineItems(first: 250) {
              edges {
                node {
                  id
                  title
                  variantTitle
                  sku
                  quantity
                  originalUnitPriceSet {
                    shopMoney {
                      amount
                    }
                  }
                  totalDiscountSet {
                    shopMoney {
                      amount
                    }
                  }
                  fulfillableQuantity
                  fulfillmentStatus
                  product {
                    id
                  }
                  variant {
                    id
                  }
                }
              }
            }
          }
          cursor
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  `,
  
  PRODUCTS: `
    query getProducts($first: Int!, $after: String, $query: String) {
      products(first: $first, after: $after, query: $query) {
        edges {
          node {
            id
            title
            descriptionHtml
            vendor
            productType
            createdAt
            updatedAt
            publishedAt
            status
            tags
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  sku
                  price
                  compareAtPrice
                  position
                  inventoryPolicy
                  inventoryQuantity
                  inventoryItem {
                    id
                  }
                  weight
                  weightUnit
                  requiresShipping
                  barcode
                }
              }
            }
            images(first: 10) {
              edges {
                node {
                  id
                  url
                  altText
                  width
                  height
                }
              }
            }
            options {
              id
              name
              position
              values
            }
          }
          cursor
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  `,
  
  LOCATIONS: `
    query {
      locations(first: 100) {
        edges {
          node {
            id
            name
            address {
              address1
              address2
              city
              province
              country
              zip
            }
            isActive
          }
        }
      }
    }
  `,
} as const;

export const SHOPIFY_GRAPHQL_MUTATIONS = {
  CREATE_PRODUCT: `
    mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
          title
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  
  UPDATE_PRODUCT: `
    mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          title
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  
  UPDATE_INVENTORY: `
    mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
      inventorySetOnHandQuantities(input: $input) {
        inventoryAdjustmentGroup {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  
  CREATE_FULFILLMENT: `
    mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
      fulfillmentCreateV2(fulfillment: $fulfillment) {
        fulfillment {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  
  WEBHOOK_SUBSCRIPTION_CREATE: `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription {
          id
          topic
          endpoint {
            __typename
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  
  WEBHOOK_SUBSCRIPTION_DELETE: `
    mutation webhookSubscriptionDelete($id: ID!) {
      webhookSubscriptionDelete(id: $id) {
        deletedWebhookSubscriptionId
        userErrors {
          field
          message
        }
      }
    }
  `,
} as const;
