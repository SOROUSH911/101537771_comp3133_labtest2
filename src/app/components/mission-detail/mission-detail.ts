import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SpacexApiService } from '../../network/spacexapi.service';
import { TtsService } from '../../services/tts.service';
import { AudioService } from '../../services/audio.service';
import { Launch } from '../../models/launch.model';
import { Rocket } from '../../models/rocket.model';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-mission-detail',
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './mission-detail.html',
  styleUrl: './mission-detail.css',
})
export class MissionDetail implements OnInit, OnDestroy {
  launch = signal<Launch | null>(null);
  rocket = signal<Rocket | null>(null);
  loading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private spacex: SpacexApiService,
    public tts: TtsService,
    private audio: AudioService,
  ) {
    this.audio.preload();
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.spacex.getLaunchById(id).subscribe({
        next: (launch) => {
          this.launch.set(launch);
          this.loading.set(false);
          this.spacex.getRocketById(launch.rocket).subscribe({
            next: (rocket) => {
              this.rocket.set(rocket);
              // Play background engine sound
              this.audio.playBackground('rumble', 0.5);
            },
          });
        },
        error: () => this.loading.set(false),
      });
    }
  }

  ngOnDestroy() {
    this.tts.stop();
    this.audio.stopAll();
  }

  goBack() {
    this.tts.stop();
    this.audio.stopAll();
    this.router.navigate(['/']);
  }

  toggleNarration() {
    this.tts.toggle();
  }

  getRocketModel(): string {
    const l = this.launch();
    return l ? this.spacex.getRocketModelPath(l.rocket) : '';
  }
}
