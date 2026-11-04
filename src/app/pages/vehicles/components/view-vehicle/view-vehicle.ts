import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Vehicle } from '../../../../@core/interfaces/vehicle.model';

@Component({
  selector: 'app-view-vehicle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-vehicle.html',
  styleUrl: './view-vehicle.scss',
})
export class ViewVehicleComponent {
  @Input() visible = false;
  @Input() vehicle: Vehicle | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();

  isClosing = false;

  closeModal(): void {
    if (this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.visible = false;
      this.visibleChange.emit(false);
    }, 180);
  }
}
