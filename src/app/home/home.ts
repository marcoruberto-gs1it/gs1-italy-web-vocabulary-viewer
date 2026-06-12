import { HttpClient } from '@angular/common/http';
import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { VocNode } from '../models';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [FormsModule, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private http = inject(HttpClient);
  private dataUrl =
    'https://raw.githubusercontent.com/gs1-germany/gs1GermanyWebVoc/refs/heads/main/currentVersion/gs1DEWebVoc.jsonld';

  allNodes = signal<VocNode[]>([]);
  selectedNode = signal<VocNode | null>(null);

  searchQuery = signal<string>('');
  filterType = signal<string>('home'); // 'home' = mostra tutto il vocabolario mescolato
  filterStatus = signal<string>('current');

  // RICERCA E FILTRAGGIO DINAMICO (OTTIMIZZATO PER MOSTRARE TUTTO IN HOME)
  searchResults = computed(() => {
    const query = (this.searchQuery() || '').toLowerCase().trim();
    const typeFilter = this.filterType();
    const statusFilter = this.filterStatus();

    let results = this.allNodes();

    // 1. Filtro per Stato
    if (statusFilter === 'current' && results) {
      results = results.filter((n) => n.status !== 'deprecated');
    }

    // 2. Filtro per Tipologia (Se siamo in 'home', non esclude nulla)
    if (typeFilter === 'classes') {
      results = results.filter((n) => n.type === 'Class');
    } else if (typeFilter === 'properties') {
      results = results.filter(
        (n) => n.type === 'DatatypeProperty' || n.type === 'ObjectProperty'
      );
    } else if (typeFilter === 'codelists') {
      results = results.filter((n) => n.type === 'CodeList');
    }

    // 3. Filtro testuale se l'utente digita una keyword
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
        if (statusFilter === 'current' && prop.status === 'deprecated')
          return false;
        return (
          (prop.type === 'DatatypeProperty' ||
            prop.type === 'ObjectProperty') &&
          prop.domain === current.id
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
        if (statusFilter === 'current' && prop.status === 'deprecated')
          return false;
        return (
          (prop.type === 'DatatypeProperty' ||
            prop.type === 'ObjectProperty') &&
          prop.range === current.id
        );
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  ngOnInit() {
    this.http.get<any>(this.dataUrl).subscribe({
      next: (response) => {
        const nodes =
          response['@graph'] || (Array.isArray(response) ? response : []);
        const tmpAll: VocNode[] = [];

        const extractText = (field: any, fallback: string = ''): string => {
          if (!field) return fallback;
          if (typeof field === 'string') return field;
          if (Array.isArray(field)) {
            const enStr = field.find((f: any) => f['@language'] === 'en');
            if (enStr && enStr['@value']) return enStr['@value'];
            if (typeof field[0] === 'string') return field[0];
            if (field[0] && field[0]['@value']) return field[0]['@value'];
          }
          if (typeof field === 'object' && field['@value'])
            return field['@value'];
          return fallback;
        };

        const extractId = (field: any): string | undefined => {
          if (!field) return undefined;
          if (typeof field === 'string') return field;
          if (Array.isArray(field)) {
            if (typeof field[0] === 'string') return field[0];
            if (field[0] && field[0]['@id']) return field[0]['@id'];
          }
          if (typeof field === 'object' && field['@id']) return field['@id'];
          return undefined;
        };

        nodes.forEach((node: any) => {
          if (!node['@id'] || !node['@type']) return;

          const rawTypeField = node['@type'];
          const rawTypes: string[] = Array.isArray(rawTypeField)
            ? rawTypeField.map((t) => (typeof t === 'string' ? t.trim() : ''))
            : [typeof rawTypeField === 'string' ? rawTypeField.trim() : ''];

          if (
            rawTypes.includes('voaf:Vocabulary') ||
            rawTypes.includes('owl:Ontology')
          )
            return;

          let cleanType = 'Entity';
          if (rawTypes.includes('owl:Class') || rawTypes.includes('rdfs:Class'))
            cleanType = 'Class';
          else if (rawTypes.includes('owl:DatatypeProperty'))
            cleanType = 'DatatypeProperty';
          else if (
            rawTypes.includes('owl:ObjectProperty') ||
            rawTypes.includes('rdf:Property')
          )
            cleanType = 'ObjectProperty';
          else if (
            node['@id'].includes('-') ||
            rawTypes.some((t) => t.includes('Code'))
          )
            cleanType = 'CodeList';

          const item: VocNode = {
            id: node['@id'],
            label: extractText(
              node['rdfs:label'] ||
                node['skos:prefLabel'] ||
                node['@id'].split(':').pop(),
              node['@id']
            ),
            comment: extractText(
              node['rdfs:comment'] || node['dc:description'],
              'No description available.'
            ),
            type: cleanType,
            status: node['sw:term_status'] || 'stable',
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

  resetToHome() {
    this.searchQuery.set('');
    this.filterType.set('home');
    this.selectedNode.set(null);
  }

  clearSearch() {
    this.searchQuery.set('');
  }
}
