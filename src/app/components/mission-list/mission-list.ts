import { Component, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SpacexApiService } from '../../network/spacexapi.service';
import { TtsService } from '../../services/tts.service';
import { Launch } from '../../models/launch.model';
import { Rocket } from '../../models/rocket.model';
import { FilterStatus } from '../../models/filter.type';
import { TimeAgoPipe } from '../../pipes/time-ago-pipe';
import { Missionfilter } from '../missionfilter/missionfilter';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';

@Component({
  selector: 'app-mission-list',
  imports: [FormsModule, ReactiveFormsModule, CommonModule, TimeAgoPipe, Missionfilter, MatButtonModule, MatIconModule, MatBadgeModule],
  templateUrl: './mission-list.html',
  styleUrl: './mission-list.css',
})
export class MissionList implements OnInit {
  searchQuery = signal('');
  filterStatus = signal<FilterStatus>('all');
  yearFilter = signal<string>('all');

  filteredLaunches = computed(() => {
    let launches = this.spacex.launches();
    const query = this.searchQuery().toLowerCase();
    const status = this.filterStatus();
    const year = this.yearFilter();

    if (query) {
      launches = launches.filter(l =>
        l.name.toLowerCase().includes(query) ||
        l.details?.toLowerCase().includes(query)
      );
    }

    switch (status) {
      case 'success': launches = launches.filter(l => l.success === true); break;
      case 'failed': launches = launches.filter(l => l.success === false); break;
      case 'upcoming': launches = launches.filter(l => l.upcoming); break;
    }

    if (year !== 'all') {
      launches = launches.filter(l => new Date(l.date_utc).getFullYear().toString() === year);
    }

    return launches;
  });

  availableYears = computed(() => {
    const years = new Set(
      this.spacex.launches().map(l => new Date(l.date_utc).getFullYear().toString())
    );
    return ['all', ...Array.from(years).sort().reverse()];
  });

  stats = computed(() => {
    const all = this.spacex.launches();
    const successes = all.filter(l => l.success === true).length;
    return {
      total: all.length,
      success: successes,
      rate: all.length ? Math.round((successes / all.filter(l => l.success !== null).length) * 100) : 0,
      upcoming: all.filter(l => l.upcoming).length,
    };
  });

  selectedRocket = signal<Rocket | null>(null);

  constructor(public spacex: SpacexApiService, private router: Router, private tts: TtsService) {}

  ngOnInit() {
    this.spacex.loadMissions();
    this.spacex.loadRockets();
    // Load Falcon 9 as default rocket panel
    this.spacex.getRocketById('5e9d0d95eda69973a809d1ec').subscribe({
      next: (r) => this.selectedRocket.set(r),
    });
  }

  onSearch(value: string) {
    this.searchQuery.set(value);
  }

  setFilter(status: FilterStatus) {
    this.filterStatus.set(status);
  }

  setYear(year: string) {
    this.yearFilter.set(year);
  }

  openLaunch(launch: Launch) {
    this.spacex.hoveredRocketId.set(launch.rocket);
    this.spacex.zoomToRocket.set(true);
    this.spacex.cinematicActive.set(true);
    // Start narration immediately
    const rocket = this.selectedRocket();
    this.tts.narrateMission(launch, rocket?.name || 'Falcon 9');
    // 4s drill + 0.6s zoom out → navigate
    setTimeout(() => {
      this.spacex.zoomToRocket.set(false);
      this.spacex.cinematicActive.set(false);
      this.router.navigate(['/launch', launch.id]);
    }, 4700);
  }

  getStatusClass(launch: Launch): string {
    if (launch.upcoming) return 'badge-upcoming';
    return launch.success ? 'badge-success' : 'badge-fail';
  }

  getStatusText(launch: Launch): string {
    if (launch.upcoming) return 'UPCOMING';
    return launch.success ? 'SUCCESS' : 'FAILED';
  }

  private rocketCache: Record<string, Rocket> = {};

  onHoverMission(launch: Launch) {
    this.spacex.hoveredRocketId.set(launch.rocket);

    // Update rocket panel (cached)
    if (this.rocketCache[launch.rocket]) {
      this.selectedRocket.set(this.rocketCache[launch.rocket]);
      return;
    }
    this.spacex.getRocketById(launch.rocket).subscribe({
      next: (r) => {
        this.rocketCache[launch.rocket] = r;
        this.selectedRocket.set(r);
      },
    });
  }
}
