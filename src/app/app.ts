import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SpaceScene } from './components/space-scene/space-scene';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SpaceScene],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
