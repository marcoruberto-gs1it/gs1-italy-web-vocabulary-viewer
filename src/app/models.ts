export interface VocNode {
  id: string;
  label: string;
  comment: string;
  type: string; // 'Class', 'ObjectProperty', 'DatatypeProperty', 'CodeList'
  domain?: string;
  range?: string;
  status?: string;
  subClassOf?: string;
  children?: VocNode[];
  isExpanded?: boolean;
}
