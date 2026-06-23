import { HttpClient } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { VocNode } from '../models';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { D2Viewer } from '../d2-viewer/d2-viewer';

@Component({
  selector: 'app-home',
  standalone: true, 
  imports: [FormsModule, CommonModule, D2Viewer],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private http = inject(HttpClient);
  
  private urls = {
    de: 'https://raw.githubusercontent.com/gs1-germany/gs1GermanyWebVoc/refs/heads/main/currentVersion/gs1DEWebVoc.jsonld',
    it: 'assets/voc/gs1ITWebVoc.jsonld'
  };

  allNodes = signal<VocNode[]>([]);
  selectedNode = signal<VocNode | null>(null);

  searchQuery = signal<string>('');
  filterType = signal<string>('home');
  filterStatus = signal<string>('current');

  searchResults = computed(() => {
    const query = (this.searchQuery() || '').toLowerCase().trim();
    const typeFilter = this.filterType();
    const statusFilter = this.filterStatus();

    let results = this.allNodes();

    if (statusFilter === 'current' && results) {
      results = results.filter((n) => n.status !== 'deprecated');
    }

    if (typeFilter === 'classes') {
      results = results.filter((n) => n.type === 'Class');
    } else if (typeFilter === 'properties') {
      results = results.filter(
        (n) => n.type === 'DatatypeProperty' || n.type === 'ObjectProperty'
      );
    } else if (typeFilter === 'codelists') {
      results = results.filter((n) => n.type === 'CodeList');
    }

    if (query) {
      results = results.filter(
        (node) =>
          node.label.toLowerCase().includes(query) ||
          node.id.toLowerCase().includes(query) ||
          node.comment.toLowerCase().includes(query)
      );
    }

    return results.sort((a, b) => a.label.localeCompare(b.label));
  });

  classProperties = computed(() => {
    const current = this.selectedNode();
    const statusFilter = this.filterStatus();
    if (!current || (current.type !== 'Class' && current.type !== 'CodeList'))
      return [];

    return this.allNodes()
      .filter((prop) => {
        if (statusFilter === 'current' && prop.status === 'deprecated') return false;
        if (!prop.domain) return false;

        // CRITICAL ANTI-RECURSION: Avoid self-referencing loops if domain equals range
        if (prop.domain === prop.range) return false;
        if (prop.id === current.id) return false;

        const domains = prop.domain.split(',').map(d => d.trim());
        return (
          (prop.type === 'DatatypeProperty' || prop.type === 'ObjectProperty') &&
          domains.includes(current.id)
        );
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  expectedProperties = computed(() => {
    const current = this.selectedNode();
    const statusFilter = this.filterStatus();
    if (!current) return [];

    return this.allNodes()
      .filter((prop) => {
        if (statusFilter === 'current' && prop.status === 'deprecated') return false;

        // CRITICAL ANTI-RECURSION: Avoid self-referencing loops if domain equals range
        if (prop.domain === prop.range) return false;
        if (prop.id === current.id) return false;

        return (
          (prop.type === 'DatatypeProperty' || prop.type === 'ObjectProperty') &&
          prop.range === current.id
        );
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  d2GraphCode = computed(() => {
    const current = this.selectedNode();
    if (!current || (current.type !== 'Class' && current.type !== 'CodeList')) return '';

    let code = `direction: right\n`;
    code += `"${current.label}": {\n  shape: class\n  style.fill: "#edf4ff"\n  style.stroke: "#002c6c"\n}\n`;

    this.expectedProperties().forEach(prop => {
      // Direct guard to prevent links mirroring the active container item
      if (prop.label === current.label) return;
      
      code += `"${prop.label}": { shape: parallelogram; style.fill: "#fff3ed"; style.stroke: "#f26322" }\n`;
      code += `"${prop.label}" -> "${current.label}" : domain\n`;
    });

    this.classProperties().forEach(prop => {
      // Direct guard to prevent links mirroring the active container item
      if (prop.label === current.label) return;

      const isDatatype = prop.range?.includes('xsd:') || prop.range?.includes('rdf:');
      const targetShape = isDatatype ? 'cylinder' : 'rectangle';
      code += `"${prop.label}": { shape: ${targetShape}; style.fill: "#f8f9fa"; style.stroke: "#6c757d" }\n`;
      code += `"${current.label}" -> "${prop.label}" : range\n`;
    });

    return (this.expectedProperties().length > 0 || this.classProperties().length > 0) ? code : '';
  });

  ngOnInit() {
    forkJoin({
      deData: this.http.get<any>(this.urls.de).pipe(
        catchError(err => {
          console.error('Error loading German vocabulary:', err);
          return of({ '@graph': [] });
        })
      ),
      itData: this.http.get<any>(this.urls.it).pipe(
        catchError(err => {
          console.error('Error loading Italian vocabulary:', err);
          return of({ '@graph': [] });
        })
      )
    }).subscribe({
      next: (responses) => {
        const nodesDE = responses.deData['@graph'] || (Array.isArray(responses.deData) ? responses.deData : []);
        const nodesIT = responses.itData['@graph'] || (Array.isArray(responses.itData) ? responses.itData : []);
        
        const allRawNodes = [...nodesDE, ...nodesIT];
        const tmpAll: VocNode[] = [];

        const extractText = (field: any, fallback: string = ''): string => {
          if (!field) return fallback;
          if (typeof field === 'string') return field;
          if (Array.isArray(field)) {
            const itStr = field.find((f: any) => f['@language'] === 'it');
            if (itStr && itStr['@value']) return itStr['@value'];
            const enStr = field.find((f: any) => f['@language'] === 'en');
            if (enStr && enStr['@value']) return enStr['@value'];
            if (typeof field[0] === 'string') return field[0];
            if (field[0] && field[0]['@value']) return field[0]['@value'];
          }
          if (typeof field === 'object' && field['@value']) return field['@value'];
          return fallback;
        };

        const extractId = (field: any): string | undefined => {
          if (!field) return undefined;
          if (typeof field === 'string') return field;
          if (Array.isArray(field)) {
            return field.map((f: any) => typeof f === 'string' ? f : (f['@id'] || '')).join(', ');
          }
          if (typeof field === 'object' && field['@id']) return field['@id'];
          return undefined;
        };

        allRawNodes.forEach((node: any) => {
          if (!node['@id'] || !node['@type']) return;

          const rawTypeField = node['@type'];
          const rawTypes: string[] = Array.isArray(rawTypeField)
            ? rawTypeField.map((t) => (typeof t === 'string' ? t.trim() : ''))
            : [typeof rawTypeField === 'string' ? rawTypeField.trim() : ''];

          if (rawTypes.includes('voaf:Vocabulary') || rawTypes.includes('owl:Ontology')) return;

          let cleanType = 'Entity';
          if (rawTypes.includes('owl:Class') || rawTypes.includes('rdfs:Class')) cleanType = 'Class';
          else if (rawTypes.includes('owl:DatatypeProperty')) cleanType = 'DatatypeProperty';
          else if (rawTypes.includes('owl:ObjectProperty') || rawTypes.includes('rdf:Property')) cleanType = 'ObjectProperty';
          else if (node['@id'].includes('-') || node['@id'].includes('#') || rawTypes.some((t) => t.includes('Code'))) cleanType = 'CodeList';

          const item: VocNode = {
            id: node['@id'],
            label: extractText(
              node['rdfs:label'] || node['skos:prefLabel'] || node['@id'].split(/[:#]/).pop(),
              node['@id']
            ),
            comment: extractText(node['rdfs:comment'] || node['dc:description'], 'No description available.'),
            type: cleanType,
            status: node['sw:term_status'] || node['vs:term_status'] || 'stable',
            domain: extractId(node['rdfs:domain']),
            range: extractId(node['rdfs:range']),
            subClassOf: extractId(node['rdfs:subClassOf']),
          };

          tmpAll.push(item);
        });

        this.allNodes.set(tmpAll);
        this.selectedNode.set(null);
      },
    });
  }

  selectNode(node: VocNode) {
    this.selectedNode.set(node);
  }

  selectNodeById(id: string | undefined) {
    if (!id) return;
    
    const cleanId = id.trim();
    const targetNode = this.allNodes().find(n => n.id === cleanId);
    if (targetNode) {
      this.selectedNode.set(targetNode);
    } else {
      // Fallback matching logic on sub-tokens to protect user flows
      const alternativeNode = this.allNodes().find(n => n.id.endsWith(cleanId) || cleanId.endsWith(n.id));
      if (alternativeNode) {
        this.selectedNode.set(alternativeNode);
      } else {
        console.warn(`Node with ID ${cleanId} not found in the graph.`);
      }
    }
  }

  selectNodeByLabelOrId(searchTerm: string) {
    if (!searchTerm) return;
    
    const targetNode = this.allNodes().find(n => 
      n.label.toLowerCase().trim() === searchTerm.toLowerCase().trim() ||
      n.id.toLowerCase().trim() === searchTerm.toLowerCase().trim()
    );

    if (targetNode) {
      this.selectedNode.set(targetNode);
    } else {
      console.warn(`Node with Label/ID "${searchTerm}" not found in current dictionary.`);
    }
  }

  resetToHome() {
    this.searchQuery.set('');
    this.filterType.set('home');
    this.selectedNode.set(null);
  }

  clearSearch() {
    this.searchQuery.set('');
  }
}