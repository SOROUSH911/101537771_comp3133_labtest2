import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Mission } from '../models/mission';
import { Launch } from '../models/launch.model';
import { Rocket } from '../models/rocket.model';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SpacexApiService {
  private readonly API = 'https://api.spacexdata.com/v4';

  readonly missions = signal<Mission[]>([]);
  readonly launches = signal<Launch[]>([]);
  readonly rockets = signal<Rocket[]>([]);
  readonly loading = signal(true);
  readonly hoveredRocketId = signal<string>('5e9d0d95eda69973a809d1ec');
  readonly zoomToRocket = signal<boolean>(false);
  readonly cinematicActive = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  /** Load all launches and map to Mission interface for display */
  loadMissions() {
    this.loading.set(true);
    this.http.get<Launch[]>(`${this.API}/launches`).subscribe({
      next: (data) => {
        this.launches.set(data);
        // Map v4 response to Mission interface (v3-style field names)
        const missions: Mission[] = data.map(l => ({
          flight_number: l.flight_number,
          mission_name: l.name,
          launch_year: new Date(l.date_utc).getFullYear().toString(),
          details: l.details,
          launch_success: l.success,
          upcoming: l.upcoming,
          rocket: { rocket_name: '', rocket_type: '' }, // filled after rockets load
          links: {
            mission_patch_small: l.links.patch.small,
            mission_patch: l.links.patch.large,
            article_link: l.links.article,
            wikipedia: l.links.wikipedia,
            video_link: l.links.webcast,
          },
        }));
        this.missions.set(missions);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadRockets() {
    this.http.get<Rocket[]>(`${this.API}/rockets`).subscribe({
      next: (data) => {
        this.rockets.set(data);
        // Update missions with rocket names
        const rocketMap: Record<string, Rocket> = {};
        data.forEach(r => rocketMap[r.id] = r);
        const launches = this.launches();
        const updated = this.missions().map((m, i) => {
          const rId = launches[i]?.rocket;
          const r = rocketMap[rId];
          if (r) {
            m.rocket = { rocket_name: r.name, rocket_type: r.type };
          }
          return m;
        });
        this.missions.set(updated);
      },
    });
  }

  getLaunchById(id: string) {
    return this.http.get<Launch>(`${this.API}/launches/${id}`);
  }

  getRocketById(id: string) {
    return this.http.get<Rocket>(`${this.API}/rockets/${id}`);
  }

  /** Filter missions by launch year */
  getMissionsByYear(year: string) {
    return this.missions().filter(m => m.launch_year === year);
  }

  getRocketModelPath(rocketId: string): string {
    const modelMap: Record<string, string> = {
      '5e9d0d95eda69955f709d1eb': 'assets/models/falcon_9.glb',
      '5e9d0d95eda69973a809d1ec': 'assets/models/falcon_9.glb',
      '5e9d0d95eda69974db09d1ed': 'assets/models/falcon_heavy.glb',
      '5e9d0d96eda699382d09d1ee': 'assets/models/starship.glb',
    };
    return modelMap[rocketId] || 'assets/models/falcon_9.glb';
  }

  getRocketScale(rocketId: string): number {
    const scaleMap: Record<string, number> = {
      '5e9d0d95eda69955f709d1eb': 3.5,
      '5e9d0d95eda69973a809d1ec': 6,
      '5e9d0d95eda69974db09d1ed': 7,
      '5e9d0d96eda699382d09d1ee': 6,
    };
    return scaleMap[rocketId] || 6;
  }
}
