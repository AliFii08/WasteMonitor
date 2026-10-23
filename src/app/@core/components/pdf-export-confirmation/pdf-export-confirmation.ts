import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';

@Component({
  selector: 'app-pdf-export-confirmation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-export-confirmation.html',
  styleUrl: './pdf-export-confirmation.scss',
})
export class PdfExportConfirmation implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() pdfName = '';
  @Input() filterSummary = '';
  @Input() recordCount = 0;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  isClosing = false;
  private closeTimer?: ReturnType<typeof setTimeout>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue) {
      this.isClosing = false;
      if (this.closeTimer) clearTimeout(this.closeTimer);
    }
  }

  ngOnDestroy(): void {
    if (this.closeTimer) clearTimeout(this.closeTimer);
  }

  close(confirm: boolean): void {
    if (this.isClosing) return;
    this.isClosing = true;
    this.closeTimer = setTimeout(() => {
      this.visibleChange.emit(false);
      if (confirm) this.confirmed.emit();
      else this.cancelled.emit();
    }, 180);
  }
}
