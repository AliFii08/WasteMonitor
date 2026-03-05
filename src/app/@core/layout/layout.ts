import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from "@angular/router";
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, 
    CommonModule, ButtonModule, TooltipModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {

}
