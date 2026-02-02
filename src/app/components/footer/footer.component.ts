// src/app/components/header/header.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule, MatIconModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css'],
})
export class FooterComponent  {

}
