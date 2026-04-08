import { Routes } from '@angular/router';
import { MissionList } from './components/mission-list/mission-list';
import { MissionDetail } from './components/mission-detail/mission-detail';

export const routes: Routes = [
  { path: '', component: MissionList },
  { path: 'launch/:id', component: MissionDetail },
];
