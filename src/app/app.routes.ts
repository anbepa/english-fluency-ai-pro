import { Routes } from '@angular/router';
import { PhrasesComponent } from './features/phrases/phrases.component';

export const routes: Routes = [
  { path: '', component: PhrasesComponent, title: 'Smart Phrases' },
  { path: 'mastered', loadComponent: () => import('./features/mastered/mastered.component').then(m => m.MasteredComponent), title: 'Mastered' },
  { path: '**', redirectTo: '' }
];
