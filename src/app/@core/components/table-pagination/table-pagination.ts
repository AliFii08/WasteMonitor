import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-table-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-pagination.html',
  styleUrl: './table-pagination.scss',
})
export class TablePagination implements OnChanges {
  @Input() totalItems = 0;
  @Input() page = 0;
  @Input() pageSize = 10;
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get currentPage(): number {
    return Math.min(Math.max(0, this.page), this.totalPages - 1);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalItems'] || changes['pageSize'] || changes['page']) {
      if (this.currentPage !== this.page) {
        this.pageChange.emit(this.currentPage);
      }
    }
  }

  goToPage(page: number): void {
    const nextPage = Math.min(Math.max(0, page), this.totalPages - 1);
    if (nextPage !== this.currentPage) {
      this.pageChange.emit(nextPage);
    }
  }
}
