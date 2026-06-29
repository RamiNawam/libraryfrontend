import type { MockNode, MockEdge, ValueStream } from '../types';

// ============================================================
// Mock nodes - initial graph seed data
// All nodes start with mode: 'mock' and health: 'unknown'
// Nothing shows as healthy unless actually connected to Azure
// ============================================================

export const mockNodes: MockNode[] = [
  // ---- Groups ----
  {
    id: 'group-azure',
    type: 'groupNode',
    position: { x: 40, y: 40 },
    data: { label: 'Azure Cloud' },
    style: { width: 1100, height: 460 },
    apiConnections: {},
  },
  {
    id: 'group-erp',
    type: 'groupNode',
    position: { x: 40, y: 540 },
    data: { label: 'ERP Layer' },
    style: { width: 400, height: 200 },
    apiConnections: {},
  },

  // ---- System nodes ----
  {
    id: 'crm',
    type: 'systemNode',
    position: { x: 80, y: 160 },
    data: {
      label: 'CRM',
      category: 'crm',
      environment: 'uat',
      mode: 'mock',
      health: 'unknown',
      description: 'Microsoft Dynamics 365 Customer Engagement',
      techStack: ['Dynamics 365 CE', 'Power Platform'],
      layers: ['CRM Layer'],
      metrics: { lastSync: null },
    },
    apiConnections: {},
  },
  {
    id: 'fo',
    type: 'systemNode',
    position: { x: 820, y: 160 },
    data: {
      label: 'F&O',
      category: 'erp',
      environment: 'uat',
      mode: 'mock',
      health: 'unknown',
      description: 'Microsoft Dynamics 365 Finance & Operations',
      techStack: ['Dynamics 365 F&O', 'X++'],
      layers: ['ERP Layer'],
      metrics: { lastSync: null },
    },
    apiConnections: {},
  },
  {
    id: 'ods',
    type: 'systemNode',
    position: { x: 80, y: 600 },
    data: {
      label: 'ODS',
      category: 'integration',
      environment: 'uat',
      mode: 'mock',
      health: 'unknown',
      description: 'Operational Data Store',
      techStack: ['SQL Server', 'SSIS'],
      layers: ['Data Layer', 'Integration Layer'],
      metrics: { lastSync: null },
    },
    apiConnections: {},
  },
  {
    id: 'docmosis',
    type: 'systemNode',
    position: { x: 820, y: 320 },
    data: {
      label: 'Docmosis',
      category: 'external',
      environment: 'uat',
      mode: 'mock',
      health: 'unknown',
      description: 'Document generation service',
      techStack: ['Docmosis Cloud', 'REST API'],
      layers: ['External'],
      metrics: { lastSync: null },
    },
    apiConnections: {},
  },
  {
    id: 'external-api',
    type: 'systemNode',
    position: { x: 820, y: 480 },
    data: {
      label: 'External API',
      category: 'external',
      environment: null,
      mode: 'mock',
      health: 'unknown',
      description: 'Third-party external API integration',
      techStack: ['REST', 'HTTPS'],
      layers: ['External', 'API Layer'],
      metrics: { lastSync: null },
    },
    apiConnections: {},
  },

  // ---- Connection nodes (Dataflow Types - triangles) ----
  {
    id: 'conn-logic-apps-customer',
    type: 'connectionNode',
    position: { x: 380, y: 170 },
    data: {
      name: 'Logic Apps Customer',
      sourceId: 'crm',
      targetId: 'fo',
      health: 'unknown',
      flows: [
        {
          id: 'flow-contact-integration',
          name: 'CrmOnlineAddressContactIntegration',
          protocol: 'REST',
          direction: 'outbound',
          status: 'unknown',
          lastTriggered: 'Never',
          volume: '0',
          lastError: null,
          mode: 'mock',
          description: 'Syncs contact and address data from CRM to F&O',
        },
        {
          id: 'flow-account-integration',
          name: 'CrmOnlineAccountIntegration',
          protocol: 'REST',
          direction: 'outbound',
          status: 'unknown',
          lastTriggered: 'Never',
          volume: '0',
          lastError: null,
          mode: 'mock',
          description: 'Syncs account data from CRM to F&O',
        },
      ],
    },
    apiConnections: {},
  },
  {
    id: 'conn-logic-apps-order',
    type: 'connectionNode',
    position: { x: 380, y: 320 },
    data: {
      name: 'Logic Apps Order',
      sourceId: 'fo',
      targetId: 'ods',
      health: 'unknown',
      flows: [
        {
          id: 'flow-order-integration',
          name: 'OrderIntegration',
          protocol: 'REST',
          direction: 'outbound',
          status: 'unknown',
          lastTriggered: 'Never',
          volume: '0',
          lastError: null,
          mode: 'mock',
          description: 'Pushes order data from F&O to ODS',
        },
      ],
    },
    apiConnections: {},
  },
  {
    id: 'conn-ods',
    type: 'connectionNode',
    position: { x: 600, y: 480 },
    data: {
      name: 'ODS',
      sourceId: 'ods',
      targetId: 'external-api',
      health: 'unknown',
      flows: [
        {
          id: 'flow-ods-out',
          name: 'OdsExternalSync',
          protocol: 'REST',
          direction: 'outbound',
          status: 'unknown',
          lastTriggered: 'Never',
          volume: '0',
          lastError: null,
          mode: 'mock',
          description: 'Syncs ODS data to external API',
        },
      ],
    },
    apiConnections: {},
  },
];

export const mockEdges: MockEdge[] = [
  // Logic Apps Customer: CRM -> conn -> F&O
  {
    id: 'edge-crm-to-conn-customer',
    source: 'crm',
    target: 'conn-logic-apps-customer',
    type: 'connectorEdge',
    data: {
      sourceLabel: 'CRM',
      targetLabel: 'Logic Apps Customer',
      flowCount: 2,
      health: 'unknown',
      flows: [],
    },
    apiConnections: {},
  },
  {
    id: 'edge-conn-customer-to-fo',
    source: 'conn-logic-apps-customer',
    target: 'fo',
    type: 'connectorEdge',
    data: {
      sourceLabel: 'Logic Apps Customer',
      targetLabel: 'F&O',
      flowCount: 2,
      health: 'unknown',
      flows: [],
    },
    apiConnections: {},
  },

  // Logic Apps Order: F&O -> conn -> ODS
  {
    id: 'edge-fo-to-conn-order',
    source: 'fo',
    target: 'conn-logic-apps-order',
    type: 'connectorEdge',
    data: {
      sourceLabel: 'F&O',
      targetLabel: 'Logic Apps Order',
      flowCount: 1,
      health: 'unknown',
      flows: [],
    },
    apiConnections: {},
  },
  {
    id: 'edge-conn-order-to-ods',
    source: 'conn-logic-apps-order',
    target: 'ods',
    type: 'connectorEdge',
    data: {
      sourceLabel: 'Logic Apps Order',
      targetLabel: 'ODS',
      flowCount: 1,
      health: 'unknown',
      flows: [],
    },
    apiConnections: {},
  },

  // ODS: ODS -> conn -> External API
  {
    id: 'edge-ods-to-conn-ods',
    source: 'ods',
    target: 'conn-ods',
    type: 'connectorEdge',
    data: {
      sourceLabel: 'ODS',
      targetLabel: 'ODS',
      flowCount: 1,
      health: 'unknown',
      flows: [],
    },
    apiConnections: {},
  },
  {
    id: 'edge-conn-ods-to-external',
    source: 'conn-ods',
    target: 'external-api',
    type: 'connectorEdge',
    data: {
      sourceLabel: 'ODS',
      targetLabel: 'External API',
      flowCount: 1,
      health: 'unknown',
      flows: [],
    },
    apiConnections: {},
  },
];

export const mockValueStreams: ValueStream[] = [
  { id: 'vs-customer', label: 'Customer', color: '#1D9E75' },
  { id: 'vs-order', label: 'Order', color: '#BA7517' },
  { id: 'vs-finance', label: 'Finance', color: '#A32D2D' },
];
