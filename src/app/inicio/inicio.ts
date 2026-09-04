import { Component } from '@angular/core';
import { BuscaCartas } from '@shared/components';

@Component({
  selector: 'app-inicio',
  imports: [BuscaCartas],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {}
