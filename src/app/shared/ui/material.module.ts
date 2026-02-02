// src/app/shared/ui/material.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';

const MATERIAL_MODULES = [
 MatIconModule,
  MatButtonModule,
  MatSelectModule,
  MatInputModule,
  MatFormFieldModule,
  MatTooltipModule,
];

@NgModule({
  imports: [CommonModule, ...MATERIAL_MODULES],
  exports: [...MATERIAL_MODULES],
})
export class SharedMaterialModule {}
