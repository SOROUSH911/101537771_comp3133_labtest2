import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Launch } from '../models/launch.model';
import { Rocket } from '../models/rocket.model';

@Injectable({
  providedIn: 'root',
})
export class SpacexService {
  private readonly API = 'https://api.spacexdata.com/v4';

  readonly launches = signal<Launch[]>([]);
  readonly rockets = signal<Rocket[]>([]);
  readonly loading = signal(true);
  readonly selectedLaunch = signal<Launch | null>(null);
  readonly hoveredRocketId = signal<string>('5e9d0d95eda69973a809d1ec'); // default Falcon 9
  readonly zoomToRocket = signal<boolean>(false);
  readonly cinematicActive = signal<boolean>(false);

  getRocketScale(rocketId: string): number {
    const scaleMap: Record<string, number> = {
      '5e9d0d95eda69955f709d1eb': 3.5,  // Falcon 1 — smaller
      '5e9d0d95eda69973a809d1ec': 6,     // Falcon 9
      '5e9d0d95eda69974db09d1ed': 7,     // Falcon Heavy — bigger
      '5e9d0d96eda699382d09d1ee': 6,     // Starship
    };
    return scaleMap[rocketId] || 6;
  }

  constructor(private http: HttpClient) {}

  loadLaunches() {
    this.loading.set(true);
    this.http.get<Launch[]>(`${this.API}/launches`).subscribe({
      next: (data) => {
        this.launches.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadRockets() {
    this.http.get<Rocket[]>(`${this.API}/rockets`).subscribe({
      next: (data) => this.rockets.set(data),
    });
  }

  getLaunchById(id: string) {
    return this.http.get<Launch>(`${this.API}/launches/${id}`);
  }

  getRocketById(id: string) {
    return this.http.get<Rocket>(`${this.API}/rockets/${id}`);
  }

  getRocketModelPath(rocketId: string): string {
    const modelMap: Record<string, string> = {
      '5e9d0d95eda69955f709d1eb': 'assets/models/falcon_9.glb',      // Falcon 1 (uses Falcon 9 model - visually similar)
      '5e9d0d95eda69973a809d1ec': 'assets/models/falcon_9.glb',      // Falcon 9
      '5e9d0d95eda69974db09d1ed': 'assets/models/falcon_heavy.glb',  // Falcon Heavy
      '5e9d0d96eda699382d09d1ee': 'assets/models/starship.glb',      // Starship
    };
    return modelMap[rocketId] || 'assets/models/falcon_9.glb';
  }
}
