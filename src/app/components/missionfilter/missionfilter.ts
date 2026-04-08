import { Component, output, computed, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { SpacexApiService } from '../../network/spacexapi.service';

@Component({
  selector: 'app-missionfilter',
  imports: [MatButtonToggleModule, MatChipsModule],
  templateUrl: './missionfilter.html',
  styleUrl: './missionfilter.css',
})
export class Missionfilter {
  yearSelected = output<string>();
  selectedYear = signal('all');

  availableYears = computed(() => {
    const years = new Set(
      this.spacex.missions().map(m => m.launch_year)
    );
    return Array.from(years).sort().reverse();
  });

  constructor(private spacex: SpacexApiService) {}

  selectYear(year: string) {
    this.selectedYear.set(year);
    this.yearSelected.emit(year);
  }
}
