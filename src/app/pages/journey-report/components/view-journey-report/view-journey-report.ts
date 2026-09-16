import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Database, ref, get, query, orderByChild, equalTo } from '@angular/fire/database';

export interface ViajeItem {
  id: string;
  key: string;
  numero: number;
  descripcion: string;
  direccionDelLlenado: string;
  tonRecogidas: number;
}

@Component({
  selector: 'app-view-journey-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-journey-report.html',
  styleUrl: './view-journey-report.scss',
})
export class ViewJourneyReport implements OnChanges {
  @Input() visible: boolean = false;
  @Input() reporte: any = null;
  @Output() visibleChange = new EventEmitter<boolean>();

  private db = inject(Database);

  activeTab: string = 'general';
  viajesList: ViajeItem[] = [];
  isLoading: boolean = false;

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['reporte'] && this.reporte?.id) {
      await this.cargarViajes();
    }
  }

  async cargarViajes(): Promise<void> {
    if (!this.reporte?.id) return;
    this.isLoading = true;

    try {
      const viajesQuery = query(
        ref(this.db, 'viajes'),
        orderByChild('informeId'),
        equalTo(this.reporte.id),
      );

      const snapshot = await get(viajesQuery);
      this.viajesList = [];

      if (snapshot.exists()) {
        const data = snapshot.val();
        let index = 1;

        Object.keys(data).forEach((viajeKey) => {
          const v = data[viajeKey];
          this.viajesList.push({
            id: viajeKey,
            key: `viaje${index}`,
            numero: index,
            descripcion: String(v.descripcion || ''),
            direccionDelLlenado: String(v.direccionDelLlenado || v.direccionDeLlenado || ''),
            tonRecogidas: Number(v.tonRecogidas) || 0,
          });
          index++;
        });
      }

      this.activeTab = 'general';
    } catch (error) {
      console.error('Error al cargar viajes para visualizar:', error);
    } finally {
      this.isLoading = false;
    }
  }

  get totalToneladas(): number {
    if (this.viajesList.length > 0) {
      return this.viajesList.reduce((acc, v) => acc + (Number(v.tonRecogidas) || 0), 0);
    }
    return Number(this.reporte?.tonRecogidas) || 0;
  }

  selectTab(tabKey: string): void {
    this.activeTab = tabKey;
  }

  closeModal(): void {
    this.activeTab = 'general';
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }
}
