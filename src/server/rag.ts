import { RAGSource } from '../types';

export const RAG_KNOWLEDGE_BASE: RAGSource[] = [
  {
    id: 'CIS-STORAGE-01',
    title: 'S3 / RustFS Bucket Public Access Block',
    category: 'Storage Security',
    rule: 'Private and confidential patient data buckets must have public read/write access explicitly denied at all times.',
    recommendation: 'Remove anonymous Read/List permissions from bucket policies. Require authenticated service principals with explicit IAM roles.'
  },
  {
    id: 'CIS-GATEWAY-02',
    title: 'Perimeter API Gateway Authentication Enforcement',
    category: 'Perimeter Security',
    rule: 'Sensitive healthcare endpoints (/api/records) must never be publicly exposed. All incoming traffic must present cryptographically validated tokens.',
    recommendation: 'Configure gateway authorizers to require valid JWT/Bearer credentials. Return HTTP 401 Unauthorized for missing tokens.'
  },
  {
    id: 'CLOUDMEND-PRIN-03',
    title: 'Least Privilege vs Blanket Denial',
    category: 'Application Resilience',
    rule: 'Remediation must not deploy blanket deny rules on active endpoints, as this breaks legitimate business applications and causes service outages.',
    recommendation: 'Allow authorized roles (e.g., Security Analyst, Clinical Staff) while selectively denying anonymous and unauthorized callers.'
  },
  {
    id: 'CLOUDMEND-PRIN-04',
    title: 'Dual Verification Protocol',
    category: 'Agent Verification',
    rule: 'Security remediation is successful ONLY when both security probes (attack vectors blocked) and application health probes (authorized workflows active) pass.',
    recommendation: 'Run comprehensive dual verification probe suite. If any authorized persona receives 403/500, trigger automated rollback immediately.'
  },
  {
    id: 'CLOUDMEND-PRIN-05',
    title: 'Pre-Mutation Immutable Snapshot Requirement',
    category: 'Self-Healing Architecture',
    rule: 'Prior to modifying any production cloud configuration, an immutable state snapshot with cryptographic hash must be captured and registered.',
    recommendation: 'Persist snapshot with revision tag (e.g. rev-001) to enable instantaneous rollback in case of runtime regression.'
  }
];

export function queryRAG(queryText: string): RAGSource[] {
  const queryLower = queryText.toLowerCase();
  const tokens = queryLower.split(/\s+/).filter(t => t.length > 3);

  const matched = RAG_KNOWLEDGE_BASE.filter(item => {
    const haystack = (
      item.title + ' ' + item.category + ' ' + item.rule + ' ' + item.recommendation
    ).toLowerCase();

    if (haystack.includes(queryLower)) return true;
    return tokens.some(tok => haystack.includes(tok));
  });

  return matched.length > 0 ? matched : [RAG_KNOWLEDGE_BASE[1], RAG_KNOWLEDGE_BASE[2]];
}
