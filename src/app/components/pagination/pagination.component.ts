// src/app/components/pagination/pagination.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagination.html',
  styleUrls: ['./pagination.css'],
})
export class PaginationComponent implements OnChanges {
  @Input() totalItems: number = 0;
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 10;
  @Input() pageSizeOptions: number[] = [5, 10, 20, 50];
  @Input() isLoading: boolean = false;
  @Input() maxVisiblePages: number = 5;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  totalPages: number = 1;
  pages: number[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalItems'] || changes['pageSize']) {
      this.calculateTotalPages();
    }
    if (changes['currentPage'] || changes['totalPages']) {
      this.generatePageNumbers();
    }
  }

  private calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;
    // Se a página atual ficar maior que o total, ajusta (mas não emite evento automaticamente)
  }

  private generatePageNumbers(): void {
    const pages: number[] = [];
    let start = Math.max(1, this.currentPage - Math.floor(this.maxVisiblePages / 2));
    let end = Math.min(this.totalPages, start + this.maxVisiblePages - 1);

    if (end - start + 1 < this.maxVisiblePages) {
      start = Math.max(1, end - this.maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    this.pages = pages;
  }

  getStartIndex(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  hasPrevPage(): boolean {
    return this.currentPage > 1;
  }

  hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage && !this.isLoading) {
      this.pageChange.emit(page);
    }
  }

  nextPage(): void {
    if (this.hasNextPage() && !this.isLoading) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.hasPrevPage() && !this.isLoading) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  goToFirstPage(): void {
    if (this.hasPrevPage() && !this.isLoading) {
      this.pageChange.emit(1);
    }
  }

  goToLastPage(): void {
    if (this.hasNextPage() && !this.isLoading) {
      this.pageChange.emit(this.totalPages);
    }
  }

  onPageSizeChange(newSize: string | number): void {
    const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
    if (size !== this.pageSize && !this.isLoading) {
      this.pageSizeChange.emit(size);
    }
  }
}
